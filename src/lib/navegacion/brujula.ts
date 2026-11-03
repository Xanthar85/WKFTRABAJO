// src/lib/navegacion/brujula.ts
// WKF — Wrapper de brújula. Usa plugin nativo en APK, deviceorientation en web.

import { Capacitor } from '@capacitor/core';
import { Compass } from '@capgo/capacitor-compass';

export type CallbackRumbo = (rumbo: number | null) => void;

export async function pedirPermisoBrujula(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Compass.checkPermissions();
      if (status.accuracy === 'granted') return true;
      const res = await Compass.requestPermissions();
      return res.accuracy === 'granted';
    } catch {
      return false;
    }
  }

  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      const perm = await (DeviceOrientationEvent as any).requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

export function suscribirBrujula(cb: CallbackRumbo): () => void {
  if (Capacitor.isNativePlatform()) {
    let cancelado = false;
    let listenerHandle: any = null;

    void Compass.addListener('headingchange', (event) => {
      if (cancelado) return;
      // Capgo devuelve el rumbo en grados, de 0 a 360.
      cb(event.value);
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      cancelado = true;
      if (listenerHandle && listenerHandle.remove) {
        void listenerHandle.remove();
      }
    };
  }

  // Modo web (PWA)
  let ultimoRumbo: number | null = null;
  const handler = (e: DeviceOrientationEvent) => {
    if (e.webkitCompassHeading) {
      ultimoRumbo = e.webkitCompassHeading;
      cb(ultimoRumbo);
    } else if (e.alpha !== null) {
      // alpha es sentido antihorario desde el norte, convertimos a rumbo.
      ultimoRumbo = (360 - e.alpha) % 360;
      cb(ultimoRumbo);
    }
  };

  window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
  window.addEventListener('deviceorientation', handler as EventListener, true);

  return () => {
    window.removeEventListener('deviceorientationabsolute', handler as EventListener, true);
    window.removeEventListener('deviceorientation', handler as EventListener, true);
  };
}