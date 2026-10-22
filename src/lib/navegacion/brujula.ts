// src/lib/navegacion/brujula.ts
// WKF — Brújula con compensación de inclinación (Fase 24).
// SIN CAMBIOS. Es la versión original que ya tenías.

export type EstadoBrujula = 'inactivo' | 'activo' | 'no_soportado' | 'permiso_denegado';

export interface BrujulaHandle {
  parar: () => void;
}

export function tieneBrujula(): boolean {
  if (typeof window === 'undefined') return false;
  return 'DeviceOrientationEvent' in window;
}

export async function pedirPermisoBrujula(): Promise<'granted' | 'denied' | 'unsupported'> {
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

  const handler = (event: DeviceOrientationEvent) => {
    if (!activo) return;

    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;

    if (alpha == null || beta == null || gamma == null) {
      return;
    }

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