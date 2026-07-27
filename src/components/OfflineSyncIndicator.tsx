'use client';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineSyncIndicator() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${isOnline ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
      {!isOnline && (<div className="flex items-center gap-2"><span className="w-2 h-2 bg-white rounded-full animate-pulse" />Modo Offline</div>)}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 mt-1">
          <span>{pendingCount} formulario(s) pendiente(s)</span>
          {isOnline && (<button onClick={() => void syncNow()} disabled={isSyncing} className="underline text-xs">{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</button>)}
        </div>
      )}
    </div>
  );
}
