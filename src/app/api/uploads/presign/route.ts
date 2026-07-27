import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Placeholder presign endpoint — replace with S3/GCS integration
  const body = await request.json().catch(() => ({}));
  const { filename } = body;
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 });

  // In production: call AWS SDK to get presigned PUT URL and public URL
  // For now return a fake uploadUrl that the client should not use in prod
  return NextResponse.json({ uploadUrl: '/api/uploads/direct-placeholder', publicUrl: `/uploads/${encodeURIComponent(filename)}` });
}
