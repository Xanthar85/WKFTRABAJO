// src/lib/navegacion/gps.ts
// WKF — Wrapper de GPS para navegación (F6) + Soporte nativo Capacitor.

import { Capacitor, registerPlugin } from '@capacitor/core';
import type {
  BackgroundGeolocationPlugin,
  CallbackError,
  Location,
} from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface PosicionGPS {
  lat: number;
  lon: number;
  precision: number;
  rumbo: number | null;
  velocidad: number | null;
  timestamp: number;
}

export type EstadoGPS = 'inactivo' | 'buscando' | 'activo' | 'error';

export type MotivoErrorGPS =
  | 'permiso_denegado'
  | 'no_disponible'
  | 'timeout'
  | 'desconocido';

export interface OpcionesGPS {
  precisionMaximaM?: number;
  timeoutMs?: number;
}

const PRECISION_MAXIMA_DEFECTO = 50;
const TIMEOUT_DEFECTO = 30000;

export interface GPSHandle {
  parar: () => void;
}

export function iniciarGPS(
  onPosicion: (p: PosicionGPS) => void,
  onEstado: (e: EstadoGPS) => void,
  onError: (motivo: MotivoErrorGPS) => void,
  onSinSenal?: () => void,
  opciones: OpcionesGPS = {}
): GPSHandle {
  const precisionMaxima = opciones.precisionMaximaM ?? PRECISION_MAXIMA_DEFECTO;
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_DEFECTO;

  let parado = false;
  let primeraPosicion = false;
  let timer: number | null = null;

  onEstado('buscando');

  const limpiarTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  if (Capacitor.isNativePlatform()) {
    let watcherId: string | null = null;

    if (typeof onSinSenal === 'function') {
      timer = window.setTimeout(() => {
        if (!primeraPosicion && !parado) onSinSenal();
      }, timeoutMs);
    }

    void BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: 'WKF está grabando tu ruta.',
        backgroundTitle: 'Grabando track',
        requestPermissions: true,
        stale: false,
        distanceFilter: 3,
      },
      (location?: Location, error?: CallbackError) => {
        if (parado) return;
        if (error) {
          if (error.code === 'NOT_AUTHORIZED') {
            parado = true;
            limpiarTimer();
            onEstado('error');
            onError('permiso_denegado');
          } else {
            onEstado('buscando');
          }
          return;
        }
        if (location) {
          const precision = location.accuracy;
          if (!Number.isFinite(precision) || precision > precisionMaxima) {
            return;
          }
          if (!primeraPosicion) {
            primeraPosicion = true;
            limpiarTimer();
            onEstado('activo');
          }
          onPosicion({
            lat: location.latitude,
            lon: location.longitude,
            precision,
            rumbo: location.bearing != null && !Number.isNaN(location.bearing) ? location.bearing : null,
            velocidad: location.speed != null && !Number.isNaN(location.speed) ? location.speed : null,
            timestamp: location.time || Date.now(),
          });
        }
      }
    ).then((id) => {
      if (parado) void BackgroundGeolocation.removeWatcher({ id });
      else watcherId = id;
    }).catch(() => {
      if (!parado) {
        parado = true;
        limpiarTimer();
        onEstado('error');
        onError('desconocido');
      }
    });

    return {
      parar: () => {
        if (parado) return;
        parado = true;
        limpiarTimer();
        if (watcherId) {
          void BackgroundGeolocation.removeWatcher({ id: watcherId });
          watcherId = null;
        }
        onEstado('inactivo');
      },
    };
  }

  // Web (PWA)
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onEstado('error');
    onError('no_disponible');
    return { parar: () => {} };
  }

  let watchId: number | null = null;

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
      rumbo: pos.coords.heading != null && !Number.isNaN(pos.coords.heading) ? pos.coords.heading : null,
      velocidad: pos.coords.speed != null && !Number.isNaN(pos.coords.speed) ? pos.coords.speed : null,
      timestamp: pos.timestamp,
    });
  };

  const handleError = (err: GeolocationPositionError) => {
    if (parado) return;

    let motivo: MotivoErrorGPS = 'desconocido';
    if (err.code === err.PERMISSION_DENIED) motivo = 'permiso_denegado';
    else if (err.code === err.POSITION_UNAVAILABLE) motivo = 'no_disponible';
    else if (err.code === err.TIMEOUT) motivo = 'timeout';

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

    onEstado('buscando');
  };

  try {
    watchId = navigator.geolocation.watchPosition(handleExito, handleError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 20000,
    });
  } catch {
    onEstado('error');
    onError('desconocido');
    return { parar: () => {} };
  }

  if (typeof onSinSenal === 'function') {
    timer = window.setTimeout(() => {
      if (!primeraPosicion && !parado) {
        onSinSenal();
      }
    }, timeoutMs);
  }

  return { parar };
}

export function leerPosicionPuntual(): Promise<PosicionGPS | null> {
  if (Capacitor.isNativePlatform()) {
    return new Promise((resolve) => {
      let watcherId: string | null = null;
      let resuelto = false;

      const terminar = (val: PosicionGPS | null) => {
        if (resuelto) return;
        resuelto = true;
        if (watcherId) {
          void BackgroundGeolocation.removeWatcher({ id: watcherId });
        }
        resolve(val);
      };

      void BackgroundGeolocation.addWatcher(
        {
          requestPermissions: true,
          stale: false,
          distanceFilter: 0,
        },
        (location?: Location, error?: CallbackError) => {
          if (error) {
            terminar(null);
            return;
          }
          if (location && !resuelto) {
            const precision = location.accuracy;
            if (!Number.isFinite(precision) || precision > PRECISION_MAXIMA_DEFECTO) {
              terminar(null);
              return;
            }
            terminar({
              lat: location.latitude,
              lon: location.longitude,
              precision,
              rumbo: location.bearing != null && !Number.isNaN(location.bearing) ? location.bearing : null,
              velocidad: location.speed != null && !Number.isNaN(location.speed) ? location.speed : null,
              timestamp: location.time || Date.now(),
            });
          }
        }
      ).then((id) => {
        watcherId = id;
        setTimeout(() => terminar(null), 15000);
      }).catch(() => {
        terminar(null);
      });
    });
  }

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
          rumbo: pos.coords.heading != null && !Number.isNaN(pos.coords.heading) ? pos.coords.heading : null,
          velocidad: pos.coords.speed != null && !Number.isNaN(pos.coords.speed) ? pos.coords.speed : null,
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
// src/lib/navegacion/gps.ts