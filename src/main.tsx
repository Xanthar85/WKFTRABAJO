// src/main.tsx
// WKF — Punto de entrada.
// v1.052: sin reload automático en controllerchange. Se avisa a la app
// vía evento 'wkf:sw-update' para que muestre un toast al usuario.

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n/index.ts';
import './styles/global.css';
import './styles/theme.css';

const rootEl = document.getElementById('root');

if (!rootEl) {
  // Si no hay #root, algo muy raro pasó al servir el HTML.
  // Pintamos un mensaje y no dejamos la pantalla en blanco.
  document.body.innerHTML =
    '<div style="background:#0A0A0A;color:#E8E8E8;min-height:100vh;' +
    'display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,sans-serif;padding:24px;text-align:center;">' +
    '<p>WKF no pudo arrancar. Recarga la app.</p></div>';
} else {
  createRoot(rootEl).render(<App />);
}

// Registro del Service Worker. NO recargamos al cambiar de controlador.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Si ya hay una versión esperando, avisamos al usuario.
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

  // Nunca recargamos solos. Solo informamos del cambio de controlador
  // para que la app decida si mostrar el toast de "recarga".
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.dispatchEvent(new CustomEvent('wkf:sw-controller-change'));
  });
}