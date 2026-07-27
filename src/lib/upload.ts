export async function uploadBlobWithPresign(blob: Blob, filename = 'photo.jpg') {
  const res = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType: blob.type }),
  });
  if (!res.ok) throw new Error('Presign request failed');
  const { uploadUrl, publicUrl } = await res.json();
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
  if (!put.ok) throw new Error('Upload failed');
  return publicUrl;
}
