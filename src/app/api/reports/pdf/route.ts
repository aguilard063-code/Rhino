import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';
import getStream from 'get-stream';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { from, to, filterCustomerId } = body || {};
  const where: any = {};
  if (from || to) where.scheduledDate = {};
  if (from) where.scheduledDate.gte = new Date(from);
  if (to) where.scheduledDate.lte = new Date(to);
  if (filterCustomerId) where.customerId = filterCustomerId;

  const workOrders = await prisma.workOrder.findMany({ where, include: { customer: true, assignedTechnician: true }, orderBy: { scheduledDate: 'asc' } });

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = doc.pipe(new (require('stream').PassThrough)());

  doc.fontSize(18).text('Work Orders Report', { align: 'center' });
  doc.moveDown();

  for (const wo of workOrders) {
    doc.fontSize(10).fillColor('black');
    doc.text(`ID: ${wo.id}  Type: ${wo.type}  Status: ${wo.status}`);
    doc.text(`Scheduled: ${wo.scheduledDate?.toISOString() ?? ''}`);
    doc.text(`Customer: ${(wo as any).customer?.name ?? ''}  Technician: ${(wo as any).assignedTechnician?.name ?? ''}`);
    if (wo.notes) doc.text(`Notes: ${wo.notes}`);
    doc.moveDown();
  }

  doc.end();
  const buffer = await getStream.buffer(stream);
  return new NextResponse(buffer, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-${new Date().toISOString().slice(0,10)}.pdf"` } });
}
