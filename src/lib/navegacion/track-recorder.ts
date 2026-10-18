// src/lib/navegacion/track-recorder.ts
// WKF — Grabador de tracks en vivo durante la navegación.

import { iniciarGPS, type GPSHandle, type PosicionGPS } from './gps.ts';
import type { PuntoTrack } from '../../db/tracks-repo.ts';
import { distanciaHaversine } from './bearing.ts';

export type EstadoRecorder = 'idle' | 'recording' | 'paused' | 'stopped';

export interface OpcionesTrackRecorder {
  onPunto?: (punto: PuntoTrack) => void;
  onAutoguardado?: () => void;
  /** Distancia mínima en metros entre puntos consecutivos (por defecto 3m) */
  minDistanciaM?: number;
}

export interface TrackRecorder {
  arrancar: () => void;
  pausar: () => void;
  reanudar: () => void;
  parar: () => void;
  estado: () => EstadoRecorder;
  obtenerPuntos: () => PuntoTrack[];
}

export function crearTrackRecorder(
  opciones: OpcionesTrackRecorder = {}
): TrackRecorder {
  const { onPunto, onAutoguardado, minDistanciaM = 3 } = opciones;

  let estadoActual: EstadoRecorder = 'idle';
  const puntos: PuntoTrack[] = [];
  let gpsHandle: GPSHandle | null = null;
  let ultimoPunto: PuntoTrack | null = null;
  let contadorPuntos = 0;

  const registrarPunto = (pos: PosicionGPS) => {
    if (estadoActual !== 'recording') return;

    if (ultimoPunto) {
      const d = distanciaHaversine(
        ultimoPunto.lat,
        ultimoPunto.lon,
        pos.lat,
        pos.lon
      );
      if (d < minDistanciaM) {
        return;
      }
    }

    const nuevoPunto: PuntoTrack = {
      lat: pos.lat,
      lon: pos.lon,
      ts: pos.timestamp || Date.now(),
    };

    ultimoPunto = nuevoPunto;
    puntos.push(nuevoPunto);
    contadorPuntos++;

    onPunto?.(nuevoPunto);

    // Disparar autoguardado periódico cada 10 puntos grabados
    if (contadorPuntos % 10 === 0) {
      onAutoguardado?.();
    }
  };

  const iniciarWatch = () => {
    if (gpsHandle) return;
    gpsHandle = iniciarGPS(
      (pos) => {
        registrarPunto(pos);
      },
      () => {},
      () => {}
    );
  };

  const detenerWatch = () => {
    if (gpsHandle) {
      gpsHandle.parar();
      gpsHandle = null;
    }
  };

  return {
    arrancar() {
      if (estadoActual === 'recording') return;
      estadoActual = 'recording';
      iniciarWatch();
    },

    pausar() {
      if (estadoActual !== 'recording') return;
      estadoActual = 'paused';
    },

    reanudar() {
      if (estadoActual !== 'paused') return;
      estadoActual = 'recording';
      iniciarWatch();
    },

    parar() {
      estadoActual = 'stopped';
      detenerWatch();
    },

    estado() {
      return estadoActual;
    },

    obtenerPuntos() {
      return [...puntos];
    },
  };
}
