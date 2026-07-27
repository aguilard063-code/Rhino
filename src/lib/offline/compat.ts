export function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const meta = parts[0];
  const base64 = parts[1];
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const len = binary.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
