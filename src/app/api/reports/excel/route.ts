import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { from, to, filterCustomerId } = body || {};
  const where: any = {};
  if (from || to) where.scheduledDate = {};
  if (from) where.scheduledDate.gte = new Date(from);
  if (to) where.scheduledDate.lte = new Date(to);
  if (filterCustomerId) where.customerId = filterCustomerId;

  const workOrders = await prisma.workOrder.findMany({ where, include: { customer: true, assignedTechnician: true }, orderBy: { scheduledDate: 'asc' } });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Work Orders');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Scheduled', key: 'scheduledDate', width: 22 },
    { header: 'Customer', key: 'customer', width: 30 },
    { header: 'Equipment', key: 'equipment', width: 18 },
    { header: 'Technician', key: 'tech', width: 24 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];

  for (const wo of workOrders) {
    sheet.addRow({ id: wo.id, type: wo.type, scheduledDate: wo.scheduledDate?.toISOString(), customer: (wo as any).customer?.name ?? '', equipment: wo.equipmentId ?? '', tech: (wo as any).assignedTechnician?.name ?? '', status: wo.status, notes: wo.notes ?? '' });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="work-orders-${new Date().toISOString().slice(0,10)}.xlsx"` } });
}
