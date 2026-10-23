// src/main.tsx
// WKF — Punto de entrada. Sin cambios funcionales en v1.010.

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n/index.ts';
import './styles/global.css';
import './styles/theme.css';

createRoot(document.getElementById('root')!).render(<App />);

// Registro del Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.debug('SW not registered:', err));
  });
}

// Cuando el Service Worker se actualiza y toma el control, recargamos
// la página una sola vez para que el usuario no vea la versión vieja.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}