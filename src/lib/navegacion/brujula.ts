// src/lib/navegacion/brujula.ts
// WKF — Brújula con compensación de inclinación (Fase 24).
// Usa DeviceOrientationEvent y compensa pitch/roll con matemáticas
// para que la aguja sea fiable aunque el móvil no esté plano.

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
  return 'granted'; // iOS antiguo o Android que no requiere permiso
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

    // El evento de brújula en Android suele venir en `webkitCompassHeading`
    // o en `alpha`. Pero para compensar la inclinación usamos los cuaterniones.
    const alpha = event.alpha; // rotación alrededor del eje Z (0-360)
    const beta = event.beta;   // inclinación frontal (pitch)
    const gamma = event.gamma; // inclinación lateral (roll)

    if (alpha == null || beta == null || gamma == null) {
      return;
    }

    // Compensación de inclinación con fórmula estándar.
    // Convertimos a radianes.
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

    // Cálculo del rumbo compensado
    const br = Math.atan2(
      -cY * sZ * cX - sY * sX,
      cY * cZ * cX - sY * sX
    );

    let rumbo = (br * rad2deg + 360) % 360;

    // Si el móvil está boca abajo o demasiado inclinado, el rumbo puede saltar.
    // Filtramos lecturas muy dispares en poco tiempo (suavizado).
    const ahora = Date.now();
    if (ahora - ultimaLectura > 100) {
      ultimaLectura = ahora;
      // Enviamos el rumbo.
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