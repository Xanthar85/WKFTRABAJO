// src/lib/navegacion/wake-lock.ts
// WKF — Wrapper de Screen Wake Lock API (Fase 29).
//
// Objetivo: mantener la pantalla encendida mientras se graba un
// track, para que el navegador no suspenda el GPS ni el
// track-recorder al apagarse la pantalla.
//
// Reglas:
//   · Si la API no existe, no hace nada y no falla.
//   · Se reengancha automáticamente al volver a primer plano
//     (visibilitychange → visible). El wake lock se libera solo
//     cuando la pestaña pasa a background; hay que pedirlo otra vez.
//   · parar() es idempotente.

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
  const wl = obtenerWakeLock();
  if (!wl) {
    // Sin soporte. Handle no-op.
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
      sentinel.addEventListener('release', () => {
        // El sistema lo ha liberado (típico al pasar a background).
        // No hacemos nada: el listener de visibilitychange lo pedirá
        // de nuevo al volver.
      });
    } catch {
      // Silencio: la grabación sigue, solo se apagará la pantalla.
    }
  };

  const onVisibility = () => {
    if (parado) return;
    if (document.visibilityState === 'visible') {
      if (reintentando) return;
      reintentando = true;
      void pedir().finally(() => {
        reintentando = false;
      });
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
        void sentinel.release().catch(() => {
          /* ignore */
        });
      }
      sentinel = null;
    },
    estaActivo: () => !!(sentinel && !sentinel.released),
  };
}