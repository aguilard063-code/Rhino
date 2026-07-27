// Service worker registration helper
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('Service worker registered', reg);
    }).catch((err) => console.warn('Service worker register failed', err));
  });

  navigator.serviceWorker?.addEventListener('message', (ev) => {
    if (ev.data?.type === 'TRIGGER_SYNC') {
      import('@/lib/offline/sync').then((m) => m.syncPendingForms());
    }
  });
}
