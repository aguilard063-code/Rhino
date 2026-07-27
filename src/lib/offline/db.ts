import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RhinoDB extends DBSchema {
  pendingServiceForms: {
    key: string;
    value: {
      id: string;
      workOrderId: string;
      arrivalTime: string;
      departureTime: string;
      coordinates: { lat: number; lng: number };
      photos: string[]; // local photo ids
      technicianSignature: string;
      customerSignature: string | null;
      fieldNotes?: string;
      refusalReason?: string;
      technicianId: string;
      createdAt: string;
      syncAttempts: number;
    };
  };
  pendingPhotos: {
    key: string;
    value: {
      id: string;
      serviceFormId: string;
      blob?: Blob | null;
      filename: string;
      url?: string;
    };
  };
  cachedWorkOrders: {
    key: string;
    value: any;
  };
  cachedRoutes: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<RhinoDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RhinoDB>('rhino-offline', 1, {
      upgrade(db) {
        db.createObjectStore('pendingServiceForms', { keyPath: 'id' });
        db.createObjectStore('pendingPhotos', { keyPath: 'id' });
        db.createObjectStore('cachedWorkOrders', { keyPath: 'id' });
        db.createObjectStore('cachedRoutes', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}
