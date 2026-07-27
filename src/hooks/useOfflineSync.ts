'use client';
import { useState, useEffect, useCallback } from 'react';
import { syncPendingForms, getPendingForms } from '@/lib/offline/sync';
import { getDB } from '@/lib/offline/db';

async function getPendingCount() {
  const db = await getDB();
  const pending = await db.getAll('pendingServiceForms');
  return pending.length;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    await syncPendingForms();
    await refreshPending();
    setIsSyncing(false);
  }, [refreshPending]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => { setIsOnline(true); syncNow(); });
    window.addEventListener('offline', () => setIsOnline(false));
    const interval = setInterval(refreshPending, 30000);
    refreshPending();
    return () => { window.removeEventListener('online', () => {}); window.removeEventListener('offline', () => {}); clearInterval(interval); };
  }, [refreshPending, syncNow]);

  return { isOnline, pendingCount, isSyncing, syncNow, refreshPending };
}
