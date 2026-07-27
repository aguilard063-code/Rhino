'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { saveServiceFormOffline } from '@/lib/offline/sync';

export function ServiceForm({ workOrderId, equipmentId, customerName, onSuccess }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [technicianSignature, setTechnicianSignature] = useState('');
  const [fieldNotes, setFieldNotes] = useState('');
  const [refusalReason, setRefusalReason] = useState('');
  const [arrivalTime] = useState(new Date());

  const handlePhotoCapture = async (e: any) => {
    const files = e.target.files; if (!files) return; const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); });
      newPhotos.push(result);
    }
    setPhotos((p) => [...p, ...newPhotos]);
  };

  const getCurrentPosition = (): Promise<{ lat: number; lng: number }> => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocalización no disponible')); return; }
    navigator.geolocation.getCurrentPosition((pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }), (err) => reject(err), { enableHighAccuracy: true, timeout: 10000 });
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault(); if (!technicianSignature) { alert('La firma del técnico es obligatoria'); return; }
    setLoading(true);
    try {
      const coordinates = await getCurrentPosition().catch(() => ({ lat: 0, lng: 0 }));
      const departureTime = new Date();
      const payload = { workOrderId, arrivalTime: arrivalTime.toISOString(), departureTime: departureTime.toISOString(), coordinates, photos, technicianSignature, customerSignature, fieldNotes, refusalReason: customerSignature ? undefined : refusalReason, technicianId: user?.id };
      if (navigator.onLine) {
        const res = await fetch(`/api/work-orders/${workOrderId}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error al guardar');
      } else {
        await saveServiceFormOffline(payload);
        alert('Guardado offline. Se sincronizará automáticamente cuando haya conexión.');
      }
      onSuccess?.();
    } catch (error: any) {
      try {
        const coordinates = await getCurrentPosition().catch(() => ({ lat: 0, lng: 0 }));
        await saveServiceFormOffline({ workOrderId, arrivalTime: arrivalTime.toISOString(), departureTime: new Date().toISOString(), coordinates, photos, technicianSignature, customerSignature, fieldNotes, refusalReason, technicianId: user?.id });
        alert('Sin conexión. Formulario guardado localmente.');
        onSuccess?.();
      } catch (offlineError) { alert('Error: ' + error.message); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Rhino Service Form</h2>
        <p className="text-sm text-gray-500 mt-1">Equipo: <span className="font-mono font-semibold">{equipmentId}</span> · Cliente: {customerName}</p>
        <p className="text-xs text-gray-400 mt-1">Llegada: {arrivalTime.toLocaleString()}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fotografías (antes / después / daños)</label>
        <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoCapture} className="block w-full text-sm text-gray-500" />
        {photos.length>0 && (<div className="mt-3 grid grid-cols-3 gap-2">{photos.map((p,i)=>(<img key={i} src={p} alt={`Foto ${i+1}`} className="rounded-lg object-cover h-24 w-full"/>))}</div>)}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas de campo</label>
        <textarea value={fieldNotes} onChange={(e)=>setFieldNotes(e.target.value)} rows={3} className="w-full border rounded px-3 py-2" placeholder="Observaciones del servicio..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Firma del Técnico *</label>
        <input type="text" value={technicianSignature} onChange={(e)=>setTechnicianSignature(e.target.value)} required placeholder="Escribe tu nombre completo como firma" className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Firma del Cliente</label>
        <input type="text" value={customerSignature||''} onChange={(e)=>setCustomerSignature(e.target.value||null)} placeholder="Nombre del cliente (dejar vacío si se rehúsa)" className="w-full border rounded px-3 py-2" />
      </div>
      {!customerSignature && (<div><label className="block text-sm font-medium text-gray-700 mb-1">Motivo de rechazo de firma</label><input type="text" value={refusalReason} onChange={(e)=>setRefusalReason(e.target.value)} placeholder="Ej: Cliente no se encuentra en el sitio" className="w-full border rounded px-3 py-2"/></div>)}
      <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg">{loading ? 'Guardando...' : (navigator.onLine ? 'Completar Servicio' : 'Guardar Offline')}</button>
    </form>
  );
}
