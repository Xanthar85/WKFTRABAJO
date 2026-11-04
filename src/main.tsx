// src/main.tsx
// WKF — Punto de entrada.

import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Confirm this bundle started successfully so Capgo can keep it instead of rolling back to the previous bundle.
if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady().catch(console.error);
}
import './i18n/index.ts';
import './styles/global.css';
import './styles/theme.css';

const rootEl = document.getElementById('root');

if (!rootEl) {
  document.body.innerHTML =
    '<div style="background:#0A0A0A;color:#E8E8E8;min-height:100vh;' +
    'display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,sans-serif;padding:24px;text-align:center;">' +
    '<p>WKF no pudo arrancar. Recarga la app.</p></div>';
} else {
  createRoot(rootEl).render(<App />);
}

// Service Worker solo en navegador (PWA). En APK nativo no aplica.
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting) {
          window.dispatchEvent(new CustomEvent('wkf:sw-update'));
        }
        reg.addEventListener('updatefound', () => {
          const nuevo = reg.installing;
          if (!nuevo) return;
          nuevo.addEventListener('statechange', () => {
            if (
              nuevo.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(new CustomEvent('wkf:sw-update'));
            }
          });
        });
      })
      .catch((err) => console.debug('SW not registered:', err));
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.dispatchEvent(new CustomEvent('wkf:sw-controller-change'));
  });
}
// src/main.tsx