import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const dispatcherPassword = await bcrypt.hash('Dispatch123!', 10);
  const supervisorPassword = await bcrypt.hash('Super123!', 10);
  const techPassword = await bcrypt.hash('Tech123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rhino.local' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@rhino.local',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { email: 'dispatcher@rhino.local' },
    update: {},
    create: {
      name: 'Dispatcher User',
      email: 'dispatcher@rhino.local',
      passwordHash: dispatcherPassword,
      role: 'dispatcher',
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@rhino.local' },
    update: {},
    create: {
      name: 'Supervisor User',
      email: 'supervisor@rhino.local',
      passwordHash: supervisorPassword,
      role: 'supervisor',
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'tech@rhino.local' },
    update: {},
    create: {
      name: 'Technician Joe',
      email: 'tech@rhino.local',
      passwordHash: techPassword,
      role: 'technician',
    },
  });

  // Customer + Location
  const customer = await prisma.customer.create({
    data: {
      name: 'Acme Construction',
      contactName: 'Pat Foreman',
      phone: '555-1000',
      email: 'pat@acme.example',
      locations: {
        create: [
          {
            name: 'Acme Site A',
            address: '123 Construction Rd, Townsville',
            lat: 40.7128,
            lng: -74.0060,
            notes: 'Main entrance at north gate',
          },
        ],
      },
    },
    include: { locations: true },
  });

  const location = customer.locations[0];

  // Equipment (domain id)
  const equipmentId = 'TO-0187';
  const equipment = await prisma.equipment.upsert({
    where: { id: equipmentId },
    update: {
      model: 'Standard Portable',
      serialNumber: 'SN-000187',
      currentCustomerId: customer.id,
      lat: location.lat,
      lng: location.lng,
      status: 'InService',
    },
    create: {
      id: equipmentId,
      model: 'Standard Portable',
      serialNumber: 'SN-000187',
      currentCustomerId: customer.id,
      lat: location.lat,
      lng: location.lng,
      status: 'InService',
    },
  });

  // Work Order (Delivery) assigned to technician
  const workOrder = await prisma.workOrder.create({
    data: {
      type: 'Delivery',
      equipmentId: equipment.id,
      customerId: customer.id,
      locationId: location.id,
      assignedTechnicianId: technician.id,
      status: 'Assigned',
      scheduledDate: new Date(),
      notes: 'Initial delivery to front of site',
    },
  });

  // ServiceForm for that work order
  const arrival = new Date();
  const departure = new Date(arrival.getTime() + 10 * 60 * 1000);

  const serviceForm = await prisma.serviceForm.create({
    data: {
      workOrderId: workOrder.id,
      arrivalTime: arrival,
      departureTime: departure,
      lat: location.lat,
      lng: location.lng,
      fieldNotes: 'Installed near north gate. Checked level and anchored.',
      technicianSignature: 's3://rhino-bucket/signatures/tech-joe.png',
      customerSignature: 's3://rhino-bucket/signatures/pat-foreman.png',
    },
  });

  await prisma.serviceFormPhoto.create({
    data: {
      serviceFormId: serviceForm.id,
      url: 's3://rhino-bucket/photos/to-0187/installed-1.jpg',
      mimeType: 'image/jpeg',
    },
  });

  // Mark WorkOrder completed
  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      status: 'Completed',
      completedAt: new Date(),
    },
  });

  // Monthly record + entry
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthlyRecord = await prisma.monthlyServiceRecord.upsert({
    where: {
      equipmentId_month: {
        equipmentId: equipment.id,
        month: monthKey,
      },
    },
    update: {},
    create: {
      equipmentId: equipment.id,
      month: monthKey,
    },
  });

  const entry = await prisma.serviceEntry.create({
    data: {
      recordId: monthlyRecord.id,
      type: 'Delivery',
      date: arrival,
      technicianId: technician.id,
      notes: 'Initial delivery entry recorded via service form.',
    },
  });

  await prisma.serviceEntryPhoto.create({
    data: {
      serviceEntryId: entry.id,
      url: 's3://rhino-bucket/photos/to-0187/installed-1.jpg',
      mimeType: 'image/jpeg',
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
