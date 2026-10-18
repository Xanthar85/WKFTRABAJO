// src/lib/navegacion/gps.ts
// WKF — Wrapper de navigator.geolocation para la navegación (F6).
// Encapsula watchPosition y getCurrentPosition detrás de una API
// con callbacks claros. Sin React, sin UI. Solo GPS.
//
// Reglas (DNF6-008, DNF6-010):
//   - Precisión > 50 m → se ignora el punto, no se emite.
//   - Permiso denegado → se avisa una sola vez con motivo.
//   - El wrapper gestiona errores de forma que la UI no tenga que
//     interpretar códigos numéricos.

export interface PosicionGPS {
  lat: number;
  lon: number;
  /** Precisión horizontal en metros, tal cual la da el navegador. */
  precision: number;
  /** Rumbo de movimiento en grados. null si el navegador no lo da. */
  rumbo: number | null;
  /** Velocidad en m/s. null si el navegador no la da. */
  velocidad: number | null;
  /** Timestamp del navegador (ms epoch). */
  timestamp: number;
}

export type EstadoGPS = 'inactivo' | 'buscando' | 'activo' | 'error';

export type MotivoErrorGPS =
  | 'permiso_denegado'
  | 'no_disponible'
  | 'timeout'
  | 'desconocido';

export interface OpcionesGPS {
  /** Si true, ignora puntos con precisión mayor que este valor. */
  precisionMaximaM?: number;
  /** Timeout de primera posición en ms. Default 30000. */
  timeoutMs?: number;
}

const PRECISION_MAXIMA_DEFECTO = 50;
const TIMEOUT_DEFECTO = 30000;

export interface GPSHandle {
  /** Detiene el watchPosition. Idempotente. */
  parar: () => void;
}

/**
 * Arranca un watchPosition con la lógica de F6.
 *
 * Callbacks:
 *   onPosicion: se llama con cada punto válido (precisión aceptable).
 *   onEstado: se llama cuando cambia el estado del GPS.
 *   onError: se llama si el permiso se deniega o hay un fallo grave.
 *   onSinSenal: se llama si a los timeoutMs no ha llegado ningún punto.
 *
 * Devuelve un handle con .parar() para cerrar el watch.
 */
export function iniciarGPS(
  onPosicion: (p: PosicionGPS) => void,
  onEstado: (e: EstadoGPS) => void,
  onError: (motivo: MotivoErrorGPS) => void,
  onSinSenal?: () => void,
  opciones: OpcionesGPS = {}
): GPSHandle {
  const precisionMaxima =
    opciones.precisionMaximaM ?? PRECISION_MAXIMA_DEFECTO;
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_DEFECTO;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onEstado('error');
    onError('no_disponible');
    return { parar: () => {} };
  }

  let watchId: number | null = null;
  let primeraPosicion = false;
  let parado = false;
  let timer: number | null = null;

  onEstado('buscando');

  const limpiarTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const parar = () => {
    if (parado) return;
    parado = true;
    limpiarTimer();
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    onEstado('inactivo');
  };

  const handleExito = (pos: GeolocationPosition) => {
    if (parado) return;
    const precision = pos.coords.accuracy;

    // Filtro de precisión: no emitimos puntos malos.
    if (!Number.isFinite(precision) || precision > precisionMaxima) {
      return;
    }

    if (!primeraPosicion) {
      primeraPosicion = true;
      limpiarTimer();
      onEstado('activo');
    }

    onPosicion({
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      precision,
      rumbo:
        pos.coords.heading != null && !Number.isNaN(pos.coords.heading)
          ? pos.coords.heading
          : null,
      velocidad:
        pos.coords.speed != null && !Number.isNaN(pos.coords.speed)
          ? pos.coords.speed
          : null,
      timestamp: pos.timestamp,
    });
  };

  const handleError = (err: GeolocationPositionError) => {
    if (parado) return;

    let motivo: MotivoErrorGPS = 'desconocido';
    if (err.code === err.PERMISSION_DENIED) motivo = 'permiso_denegado';
    else if (err.code === err.POSITION_UNAVAILABLE) motivo = 'no_disponible';
    else if (err.code === err.TIMEOUT) motivo = 'timeout';

    // Permiso denegado o GPS no disponible: paramos el watch y
    // avisamos. El timeout lo tratamos como "sin señal" (puede
    // recuperarse solo).
    if (motivo === 'permiso_denegado' || motivo === 'no_disponible') {
      limpiarTimer();
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      parado = true;
      onEstado('error');
      onError(motivo);
      return;
    }

    // Timeout de watchPosition: no paramos, pero avisamos de que
    // seguimos buscando. Es normal al arrancar.
    onEstado('buscando');
  };

  try {
    watchId = navigator.geolocation.watchPosition(handleExito, handleError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 20000,
    });
  } catch (err) {
    console.error('No se pudo arrancar watchPosition', err);
    onEstado('error');
    onError('desconocido');
    return { parar: () => {} };
  }

  // Timer de "sin señal": si a los timeoutMs no ha llegado ni un
  // punto, avisamos. No paramos el watch: la señal puede llegar.
  if (typeof onSinSenal === 'function') {
    timer = window.setTimeout(() => {
      if (!primeraPosicion && !parado) {
        onSinSenal();
      }
    }, timeoutMs);
  }

  return { parar };
}

/**
 * Lectura puntual de posición. Útil para el botón "Guardar posición
 * actual" cuando el watchPosition no está activo (por ejemplo, si
 * el usuario está en modo manual pero quiere capturar una picada).
 *
 * Si falla, devuelve null. No lanza.
 */
export function leerPosicionPuntual(): Promise<PosicionGPS | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const precision = pos.coords.accuracy;
        if (!Number.isFinite(precision) || precision > PRECISION_MAXIMA_DEFECTO) {
          resolve(null);
          return;
        }
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision,
          rumbo:
            pos.coords.heading != null && !Number.isNaN(pos.coords.heading)
              ? pos.coords.heading
              : null,
          velocidad:
            pos.coords.speed != null && !Number.isNaN(pos.coords.speed)
              ? pos.coords.speed
              : null,
          timestamp: pos.timestamp,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  });
}