import { getDB } from './db';
import { dataURLToBlob } from './compat';

export async function saveServiceFormOffline(formData: any) {
  const db = await getDB();
  const id = crypto.randomUUID();

  const photoIds: string[] = [];
  const photos = formData.photos ?? [];

  for (const p of photos) {
    const pid = crypto.randomUUID();
    let blob: Blob | null = null;
    let filename = pid + '.jpg';

    if (typeof p === 'string' && p.startsWith('data:')) blob = dataURLToBlob(p);
    else if (p instanceof File) { blob = p; filename = p.name; }
    else if (typeof p === 'string' && /^https?:\/\//.test(p)) {
      await db.put('pendingPhotos', { id: pid, serviceFormId: id, blob: null, filename, url: p } as any);
      photoIds.push(pid);
      continue;
    }

    await db.put('pendingPhotos', { id: pid, serviceFormId: id, blob, filename } as any);
    photoIds.push(pid);
  }

  await db.put('pendingServiceForms', {
    ...formData,
    id,
    photos: photoIds,
    createdAt: new Date().toISOString(),
    syncAttempts: 0,
  });

  try {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register('sync-service-forms');
    }
  } catch (err) {
    console.warn('Background sync registration failed:', err?.message ?? err);
  }

  return id;
}

async function presignUpload(filename: string, contentType?: string) {
  const res = await fetch('/api/uploads/presign', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, contentType }),
  });
  if (!res.ok) throw new Error('Presign request failed');
  return res.json();
}

async function putToUrl(uploadUrl: string, blob: Blob, contentType?: string) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType ?? 'application/octet-stream' }, body: blob });
  if (!res.ok) throw new Error('Upload PUT failed');
  return true;
}

export async function syncPendingForms() {
  if (typeof window === 'undefined') return { synced: 0, failed: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const db = await getDB();
  const pending = await db.getAll('pendingServiceForms');
  let synced = 0; let failed = 0;

  for (const form of pending) {
    if (form.syncAttempts >= 5) { await db.delete('pendingServiceForms', form.id); failed++; continue; }
    try {
      const publicUrls: string[] = [];
      for (const photoId of form.photos ?? []) {
        const photo = await db.get('pendingPhotos', photoId);
        if (!photo) continue;
        if ((photo as any).url && !((photo as any).blob)) { publicUrls.push((photo as any).url); await db.delete('pendingPhotos', photoId); continue; }
        if (!photo.blob) continue;
        const { uploadUrl, publicUrl } = await presignUpload(photo.filename, (photo.blob as Blob).type);
        await putToUrl(uploadUrl, photo.blob as Blob, (photo.blob as Blob).type);
        publicUrls.push(publicUrl);
        await db.delete('pendingPhotos', photoId);
      }

      const payload = { arrivalTime: form.arrivalTime, departureTime: form.departureTime, coordinates: form.coordinates, photos: publicUrls, technicianSignature: form.technicianSignature, customerSignature: form.customerSignature ?? null, fieldNotes: form.fieldNotes, refusalReason: form.refusalReason, technicianId: form.technicianId, localId: form.id };

      const res = await fetch(`/api/work-orders/${form.workOrderId}/complete`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });

      if (!res.ok) { const text = await res.text(); throw new Error(`Server responded ${res.status}: ${text}`); }
      await db.delete('pendingServiceForms', form.id);
      synced++;
    } catch (err: any) {
      form.syncAttempts = (form.syncAttempts || 0) + 1; await db.put('pendingServiceForms', form); failed++; const msg = String(err?.message || err); console.warn('Sync error for form', form.id, msg); if (/network|failed to fetch/i.test(msg) || err.name === 'TypeError') break;
    }
  }

  return { synced, failed };
}
