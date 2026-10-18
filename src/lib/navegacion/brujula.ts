// src/lib/navegacion/brujula.ts
// WKF — Wrapper de la brújula del móvil (DeviceOrientation) (F6).
// Encapsula el listener de deviceorientation y expone un rumbo
// magnético limpio. Sin React, sin UI. Solo sensor.
//
// Reglas (DNF6-002, DNF6-003):
//   - Si el navegador no soporta el sensor, no arranca y avisa.
//   - En iOS 13+ hay que pedir permiso explícito con un gesto
//     del usuario. La UI hace la llamada; aquí solo comprobamos
//     y solicitamos si se puede.
//   - Devuelve el rumbo magnético normalizado a 0-360.

export type EstadoBrujula = 'inactivo' | 'activo' | 'no_soportado' | 'permiso_denegado';

export interface BrujulaHandle {
  parar: () => void;
}

interface DeviceOrientationEventConPermiso {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

/**
 * Comprueba si el navegador tiene brújula disponible.
 * No garantiza que el sensor dé datos: solo que el evento existe.
 */
export function tieneBrujula(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'DeviceOrientationEvent' in window ||
    'ondeviceorientationabsolute' in window
  );
}

/**
 * En iOS 13+ hay que pedir permiso con un gesto del usuario antes
 * de poder recibir deviceorientation. En el resto de navegadores
 * esta llamada no existe y devuelve 'granted' directamente.
 *
 * La UI debe llamar a esto desde el onClick del botón "Navegar",
 * no desde un useEffect.
 */
export async function pedirPermisoBrujula(): Promise<'granted' | 'denied' | 'no_soportado'> {
  if (typeof window === 'undefined') return 'no_soportado';
  if (!tieneBrujula()) return 'no_soportado';

  const ctor = (window as unknown as { DeviceOrientationEvent?: unknown })
    .DeviceOrientationEvent as DeviceOrientationEventConPermiso | undefined;

  if (ctor && typeof ctor.requestPermission === 'function') {
    try {
      const res = await ctor.requestPermission();
      return res === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  // Navegadores sin requestPermission (Android Chrome, Firefox,
  // Safari antiguo): se asume permiso concedido. Si el usuario
  // bloquea los sensores en ajustes, simplemente no llegan eventos.
  return 'granted';
}

/**
 * Arranca la brújula. Devuelve un handle con parar().
 *
 * onRumbo: se llama con el rumbo magnético en grados (0-360)
 *          cada vez que el móvil informa un cambio.
 * onEstado: informa de si la brújula está activa o no.
 *
 * Nota: en muchos Android, `deviceorientation` ya viene con
 * coordenadas absolutas (webkitCompassHeading o alpha). Usamos
 * lo que haya disponible con preferencia por webkitCompassHeading,
 * que es el que da iOS.
 */
export function iniciarBrujula(
  onRumbo: (grados: number) => void,
  onEstado: (e: EstadoBrujula) => void
): BrujulaHandle {
  if (typeof window === 'undefined' || !tieneBrujula()) {
    onEstado('no_soportado');
    return { parar: () => {} };
  }

  let parado = false;
  let ultimoRumbo: number | null = null;

  const normalizar = (g: number): number => {
    const v = g % 360;
    return v < 0 ? v + 360 : v;
  };

  const handle = (event: DeviceOrientationEvent) => {
    if (parado) return;

    // iOS: webkitCompassHeading viene como propiedad no estándar.
    const webkitHeading = (event as unknown as { webkitCompassHeading?: number })
      .webkitCompassHeading;

    let rumbo: number | null = null;

    if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) {
      // iOS. Rumbo directo, en sentido horario desde el norte.
      rumbo = normalizar(webkitHeading);
    } else if (event.alpha != null && !Number.isNaN(event.alpha)) {
      // Android y otros: alpha es el ángulo respecto al norte
      // (en la práctica, en la mayoría de móviles Android con
      // magnetómetro, es el rumbo directo). La orientación del
      // móvil puede requerir invertir según el navegador, pero
      // en Chrome Android moderno alpha ≈ rumbo del dispositivo
      // (no de la pantalla) y se usa directo.
      rumbo = normalizar(360 - event.alpha);
    }

    if (rumbo === null) return;

    // Filtro de cambios bruscos: ignoramos saltos de más de 60°
    // en un solo evento (ruido típico del magnetómetro).
    if (ultimoRumbo !== null) {
      const diff = Math.abs(((rumbo - ultimoRumbo + 540) % 360) - 180);
      if (diff > 60) {
        return;
      }
    }

    ultimoRumbo = rumbo;
    onRumbo(rumbo);
  };

  window.addEventListener('deviceorientationabsolute', handle as EventListener, true);
  window.addEventListener('deviceorientation', handle, true);

  onEstado('activo');

  return {
    parar: () => {
      if (parado) return;
      parado = true;
      window.removeEventListener('deviceorientationabsolute', handle as EventListener, true);
      window.removeEventListener('deviceorientation', handle, true);
      onEstado('inactivo');
    },
  };
}