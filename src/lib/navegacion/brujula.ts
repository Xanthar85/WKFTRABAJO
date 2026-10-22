// src/lib/navegacion/brujula.ts
// WKF — Brújula con compensación de inclinación (Fase 24 + fix WKF1.050).
// Prioriza webkitCompassHeading (Android/iOS) que YA viene referido al
// norte. Si no existe, usa alpha absoluto. Si no, compensa con
// cuaterniones a partir de alpha/beta/gamma. La aguja final se devuelve
// 0-360 referida al NORTE.

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
  let ultimoRumbo: number | null = null;

  const normalizar = (v: number): number => ((v % 360) + 360) % 360;

  // Suavizado circular: mezcla la lectura nueva con la anterior para
  // que la aguja no dé saltos.
  const suavizar = (nuevo: number): number => {
    if (ultimoRumbo == null) {
      ultimoRumbo = nuevo;
      return nuevo;
    }
    const delta = ((nuevo - ultimoRumbo + 540) % 360) - 180;
    const mezclado = normalizar(ultimoRumbo + delta * 0.35);
    ultimoRumbo = mezclado;
    return mezclado;
  };

  const handler = (event: DeviceOrientationEvent) => {
    if (!activo) return;

    const anyEvent = event as unknown as {
      webkitCompassHeading?: number;
      absolute?: boolean;
      alpha?: number | null;
      beta?: number | null;
      gamma?: number | null;
    };

    let rumbo: number | null = null;

    if (
      typeof anyEvent.webkitCompassHeading === 'number' &&
      Number.isFinite(anyEvent.webkitCompassHeading)
    ) {
      rumbo = anyEvent.webkitCompassHeading;
    } else if (
      anyEvent.absolute === true &&
      typeof anyEvent.alpha === 'number' &&
      Number.isFinite(anyEvent.alpha)
    ) {
      rumbo = normalizar(360 - anyEvent.alpha);
    } else {
      const alpha = anyEvent.alpha;
      const beta = anyEvent.beta;
      const gamma = anyEvent.gamma;
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

      rumbo = normalizar(br * rad2deg + 360);
    }

    if (rumbo == null || !Number.isFinite(rumbo)) return;

    const ahora = Date.now();
    if (ahora - ultimaLectura < 100) return;
    ultimaLectura = ahora;

    onRumbo(suavizar(rumbo));
  };

  window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
  window.addEventListener('deviceorientation', handler as EventListener, true);
  onEstado('activo');

  return {
    parar: () => {
      activo = false;
      window.removeEventListener('deviceorientationabsolute', handler as EventListener, true);
      window.removeEventListener('deviceorientation', handler as EventListener, true);
      onEstado('inactivo');
    },
  };
}
// src/lib/navegacion/brujula.ts
