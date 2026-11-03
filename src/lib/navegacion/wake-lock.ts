// src/lib/navegacion/wake-lock.ts
// WKF — Wrapper de Screen Wake Lock. Usa plugin nativo en APK, web API en navegador.

import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capawesome/capacitor-keep-awake';

let activoEnNativo = false;

export async function activarWakeLock(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await KeepAwake.keepAwake();
      activoEnNativo = true;
    } catch (err) {
      console.debug('KeepAwake nativo no disponible:', err);
    }
    return;
  }

  // Web
  if ('wakeLock' in navigator) {
    try {
      await (navigator as any).wakeLock.request('screen');
    } catch (err) {
      console.debug('Wake Lock web falló:', err);
    }
  }
}

export async function desactivarWakeLock(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    if (activoEnNativo) {
      try {
        await KeepAwake.allowSleep();
      } catch (err) {
        console.debug('KeepAwake nativo no se pudo soltar:', err);
      }
      activoEnNativo = false;
    }
    return;
  }

  // Web (si guardas la referencia, se libera sola al cerrar la pestaña,
  // pero aquí no tenemos la referencia; se gestiona desde el componente).
}