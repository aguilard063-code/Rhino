import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION;

if (!BUCKET || !REGION) {
  console.warn('S3 presign: S3_BUCKET or S3_REGION not set');
}

const s3 = new S3Client({ region: REGION });

export async function POST(request: Request) {
  if (!BUCKET || !REGION) {
    return NextResponse.json({ error: 'S3 not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const filename = body.filename ?? `upload-${Date.now()}.bin`;
  const contentType = body.contentType ?? 'application/octet-stream';
  const key = `uploads/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 10 });
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
