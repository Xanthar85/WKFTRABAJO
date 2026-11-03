// src/lib/navegacion/brujula.ts
// WKF — Brújula con compensación de inclinación (Fase 24) + Soporte nativo Capacitor.

import { Capacitor } from '@capacitor/core';
import { Compass } from '@capgo/capacitor-compass';

export type EstadoBrujula = 'inactivo' | 'activo' | 'no_soportado' | 'permiso_denegado';

export interface BrujulaHandle {
  parar: () => void;
}

export function tieneBrujula(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined') return false;
  return 'DeviceOrientationEvent' in window;
}

export async function pedirPermisoBrujula(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Compass.checkPermissions();
      if (status.accuracy === 'granted') return 'granted';
      const res = await Compass.requestPermissions();
      return res.accuracy === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  if (typeof window === 'undefined') return 'unsupported';
  const DevOri = (window as any).DeviceOrientationEvent;
  if (!DevOri) return 'unsupported';

  if (typeof DevOri.requestPermission === 'function') {
    try {
      const permiso = await DevOri.requestPermission();
      return permiso === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }
  return 'granted';
}

export function iniciarBrujula(
  onRumbo: (grados: number) => void,
  onEstado: (estado: EstadoBrujula) => void
): BrujulaHandle {
  if (!tieneBrujula()) {
    onEstado('no_soportado');
    return { parar: () => {} };
  }

  let activo = true;
  let ultimaLectura = 0;

  if (Capacitor.isNativePlatform()) {
    let listenerHandle: any = null;
    void Compass.addListener('headingchange', (event) => {
      if (!activo) return;
      const ahora = Date.now();
      if (ahora - ultimaLectura > 100) {
        ultimaLectura = ahora;
        // Capgo devuelve el valor en grados. A veces usa 0-360 y a veces -180 a 180.
        let rumbo = event.value;
        if (rumbo < 0) rumbo = (rumbo + 360) % 360;
        onRumbo(rumbo);
      }
    }).then((handle) => {
      listenerHandle = handle;
      if (activo) onEstado('activo');
    }).catch(() => {
      if (activo) onEstado('no_soportado');
    });

    return {
      parar: () => {
        activo = false;
        if (listenerHandle && listenerHandle.remove) {
          void listenerHandle.remove();
        }
        onEstado('inactivo');
      },
    };
  }

  // Modo Web (PWA)
  const handler = (event: DeviceOrientationEvent) => {
    if (!activo) return;

    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;

    if (alpha == null || beta == null || gamma == null) return;

    const deg2rad = Math.PI / 180;
    const rad2deg = 180 / Math.PI;

    const _x = beta * deg2rad;
    const _y = gamma * deg2rad;
    const _z = alpha * deg2rad;

    const cX = Math.cos(_x);
    const cY = Math.cos(_y);
    const cZ = Math.cos(_z);
    const sX = Math.sin(_x);
    const sY = Math.sin(_y);
    const sZ = Math.sin(_z);

    const br = Math.atan2(
      -cY * sZ * cX - sY * sX,
      cY * cZ * cX - sY * sX
    );

    let rumbo = (br * rad2deg + 360) % 360;

    const ahora = Date.now();
    if (ahora - ultimaLectura > 100) {
      ultimaLectura = ahora;
      onRumbo(rumbo);
    }
  };

  window.addEventListener('deviceorientation', handler, true);
  onEstado('activo');

  return {
    parar: () => {
      activo = false;
      window.removeEventListener('deviceorientation', handler, true);
      onEstado('inactivo');
    },
  };
}
// src/lib/navegacion/brujula.ts