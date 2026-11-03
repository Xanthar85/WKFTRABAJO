// src/lib/navegacion/gps.ts
// WKF — Wrapper de GPS. Usa plugin nativo en APK, navigator.geolocation en web.

import { Capacitor } from '@capacitor/core';
import {
  BackgroundGeolocation,
  type CallbackError,
  type Location,
} from '@capacitor-community/background-geolocation';

export type CallbackPosicion = (lat: number, lon: number, precision: number) => void;

let watcherId: string | null = null;

export function iniciarGps(
  onPosicion: CallbackPosicion,
  onError?: (error: string) => void
): void {
  detenerGps();

  if (Capacitor.isNativePlatform()) {
    void BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: 'WKF está grabando tu ruta.',
        backgroundTitle: 'Grabando track',
        requestPermissions: true,
        stale: false,
        distanceFilter: 3,
      },
      (location?: Location, error?: CallbackError) => {
        if (error) {
          if (error.code === 'NOT_AUTHORIZED') {
            onError?.('Permiso de ubicación denegado.');
          } else {
            onError?.(error.message);
          }
          return;
        }
        if (location) {
          onPosicion(location.latitude, location.longitude, location.accuracy);
        }
      }
    ).then((id) => {
      watcherId = id;
    }).catch((err) => {
      onError?.(String(err));
    });
    return;
  }

  // Web
  if (!('geolocation' in navigator)) {
    onError?.('GPS no disponible en este navegador.');
    return;
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      if (pos.coords.accuracy > 50) return; // Filtro de precisión WKF
      onPosicion(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    },
    (err) => {
      onError?.(err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000,
    }
  );
  (window as any).__wkfGpsWatcherId = id;
}

export function detenerGps(): void {
  if (Capacitor.isNativePlatform()) {
    if (watcherId) {
      void BackgroundGeolocation.removeWatcher({ id: watcherId });
      watcherId = null;
    }
    return;
  }

  const id = (window as any).__wkfGpsWatcherId;
  if (typeof id === 'number') {
    navigator.geolocation.clearWatch(id);
    (window as any).__wkfGpsWatcherId = null;
  }
}