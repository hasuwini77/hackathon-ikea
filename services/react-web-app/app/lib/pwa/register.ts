export function registerPWA() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[PWA] ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch((err) => {
                    console.error('[PWA] ServiceWorker registration failed: ', err);
                });
        });
    }
}
