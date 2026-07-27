import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Body = {
  arrivalTime: string;
  departureTime: string;
  coordinates: { lat: number; lng: number };
  photos: string[]; // public URLs
  technicianSignature: string;
  customerSignature?: string | null;
  fieldNotes?: string;
  refusalReason?: string;
  technicianId?: string;
  localId?: string;
  updatedAt?: string;
  force?: boolean;
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions as any);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (!['technician', 'dispatcher', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const workOrderId = params.id;
  const body = (await request.json()) as Body;

  if (!body || !body.arrivalTime || !body.departureTime) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
  if (!wo) return NextResponse.json({ error: 'WorkOrder not found' }, { status: 404 });

  if (body.updatedAt) {
    const clientUpdated = new Date(body.updatedAt).getTime();
    const serverUpdated = new Date(wo.updatedAt).getTime();
    if (serverUpdated > clientUpdated && !body.force) {
      return NextResponse.json({ code: 'CONFLICT', message: 'Server has newer version', server: wo }, { status: 409 });
    }
  }

  const createdForm = await prisma.serviceForm.create({
    data: {
      workOrderId,
      arrivalTime: new Date(body.arrivalTime),
      departureTime: new Date(body.departureTime),
      lat: body.coordinates?.lat ?? 0,
      lng: body.coordinates?.lng ?? 0,
      fieldNotes: body.fieldNotes ?? null,
      technicianSignature: body.technicianSignature,
      customerSignature: body.customerSignature ?? null,
      refusalReason: body.refusalReason ?? null,
      syncedAt: new Date(),
    },
  });

  if (Array.isArray(body.photos) && body.photos.length > 0) {
    const photosData = body.photos.map((url) => ({ serviceFormId: createdForm.id, url, mimeType: null }));
    await prisma.serviceFormPhoto.createMany({ data: photosData });
  }

  await prisma.workOrder.update({ where: { id: workOrderId }, data: { status: 'Completed', completedAt: new Date(), updatedAt: new Date() } });

  try {
    const monthKey = new Date().toISOString().slice(0, 7);
    const record = await prisma.monthlyServiceRecord.upsert({
      where: { equipmentId_month: { equipmentId: wo.equipmentId ?? '', month: monthKey } },
      update: {},
      create: { equipmentId: wo.equipmentId ?? '', month: monthKey },
    });

    await prisma.serviceEntry.create({
      data: {
        recordId: record.id,
        type: wo.type,
        date: new Date(body.arrivalTime),
        technicianId: body.technicianId ?? userId,
        notes: body.fieldNotes ?? undefined,
      },
    });
  } catch (err) {
    console.warn('monthly record error', err);
  }

  return NextResponse.json({ ok: true, serviceFormId: createdForm.id, localId: body.localId ?? null });
}
