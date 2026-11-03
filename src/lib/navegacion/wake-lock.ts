// src/lib/navegacion/wake-lock.ts
// WKF — Wrapper de Screen Wake Lock API (Fase 29) + Soporte nativo Capacitor.

import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capawesome/capacitor-keep-awake';

export interface WakeLockHandle {
  parar: () => void;
  estaActivo: () => boolean;
}

interface SentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (tipo: 'release', cb: () => void) => void;
}

interface WakeLockLike {
  request: (tipo: 'screen') => Promise<SentinelLike>;
}

function obtenerWakeLock(): WakeLockLike | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as { wakeLock?: WakeLockLike };
  if (!nav.wakeLock || typeof nav.wakeLock.request !== 'function') {
    return null;
  }
  return nav.wakeLock;
}

export async function mantenerPantallaEncendida(): Promise<WakeLockHandle | null> {
  if (Capacitor.isNativePlatform()) {
    let activo = true;
    try {
      await KeepAwake.keepAwake();
    } catch {
      return null;
    }
    return {
      parar: () => {
        if (!activo) return;
        activo = false;
        void KeepAwake.allowSleep().catch(() => {});
      },
      estaActivo: () => activo,
    };
  }

  const wl = obtenerWakeLock();
  if (!wl) {
    return {
      parar: () => {},
      estaActivo: () => false,
    };
  }

  let sentinel: SentinelLike | null = null;
  let parado = false;
  let reintentando = false;

  const pedir = async () => {
    if (parado) return;
    if (sentinel && !sentinel.released) return;
    try {
      sentinel = await wl.request('screen');
      sentinel.addEventListener('release', () => {});
    } catch {}
  };

  const onVisibility = () => {
    if (parado) return;
    if (document.visibilityState === 'visible') {
      if (reintentando) return;
      reintentando = true;
      void pedir().finally(() => { reintentando = false; });
    }
  };

  await pedir();
  document.addEventListener('visibilitychange', onVisibility);

  return {
    parar: () => {
      if (parado) return;
      parado = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => {});
      }
      sentinel = null;
    },
    estaActivo: () => !!(sentinel && !sentinel.released),
  };
}
// src/lib/navegacion/wake-lock.ts