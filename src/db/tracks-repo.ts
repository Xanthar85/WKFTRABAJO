// src/db/tracks-repo.ts
// WKF — Repositorio de tracks grabados en IndexedDB.
// WKF1.067: añadido campo `orden` (posición dentro de su caja).
//   · crearTrack calcula orden = max(orden de la carpeta) + 1.
//   · Nuevo helper reordenarTracks para ▲▼ dentro de una caja.

import {
  STORE_TRACKS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';

export interface PuntoTrack {
  lat: number;
  lon: number;
  ts: number;
}

export type OrigenTrack = 'grabado' | 'importado';

export interface Track {
  id: string;
  nombre: string;
  puntos: PuntoTrack[];
  creadoEn: number;
  duracionMs: number;
  distanciaKm: number;
  origen: OrigenTrack;
  rutaId?: string;
  visible?: boolean;
  favorito?: boolean;
  carpetaId?: string;
  orden?: number;
}

function nuevoId(): string {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const RAD = Math.PI / 180;
const RADIO_TIERRA_M = 6371000;

function distanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const fi1 = lat1 * RAD;
  const fi2 = lat2 * RAD;
  const dFi = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a =
    Math.sin(dFi / 2) ** 2 +
    Math.cos(fi1) * Math.cos(fi2) * Math.sin(dLon / 2) ** 2;
  return RADIO_TIERRA_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcularMetricasTrack(puntos: PuntoTrack[]): {
  duracionMs: number;
  distanciaKm: number;
} {
  if (puntos.length < 2) return { duracionMs: 0, distanciaKm: 0 };

  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const duracionMs = Math.max(0, ultimo.ts - primero.ts);

  let distancia = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    distancia += distanciaMetros(a.lat, a.lon, b.lat, b.lon);
  }

  return {
    duracionMs,
    distanciaKm: Math.round((distancia / 1000) * 100) / 100,
  };
}

export async function listarTracks(): Promise<Track[]> {
  return obtenerTodos<Track>(STORE_TRACKS);
}

export async function obtenerTrack(id: string): Promise<Track | null> {
  const t = await ejecutar<Track | undefined>(
    STORE_TRACKS,
    'readonly',
    (store) => store.get(id)
  );
  return t ?? null;
}

export async function crearTrack(datos: {
  nombre: string;
  puntos: PuntoTrack[];
  origen?: OrigenTrack;
  carpetaId?: string;
}): Promise<Track> {
  const puntos = datos.puntos.map((p) => ({ ...p }));
  const metricas = calcularMetricasTrack(puntos);

  const existentes = await listarTracks();
  const carpetaObjetivo = datos.carpetaId;
  let maxOrden = 0;
  for (const t of existentes) {
    if ((t.carpetaId ?? undefined) === (carpetaObjetivo ?? undefined)) {
      if (typeof t.orden === 'number' && t.orden > maxOrden) {
        maxOrden = t.orden;
      }
    }
  }

  const t: Track = {
    id: nuevoId(),
    nombre: datos.nombre.trim() || 'Track sin nombre',
    puntos,
    creadoEn: Date.now(),
    duracionMs: metricas.duracionMs,
    distanciaKm: metricas.distanciaKm,
    origen: datos.origen ?? 'grabado',
    visible: true,
    favorito: false,
    carpetaId: datos.carpetaId,
    orden: maxOrden + 1,
  };
  await ejecutar(STORE_TRACKS, 'readwrite', (store) => store.put(t));
  return t;
}

export async function actualizarTrack(
  id: string,
  patch: Partial<Omit<Track, 'id' | 'creadoEn'>>
): Promise<Track | null> {
  const actual = await obtenerTrack(id);
  if (!actual) return null;

  const proximo: Track = { ...actual, ...patch };

  if (patch.puntos) {
    const metricas = calcularMetricasTrack(proximo.puntos);
    proximo.duracionMs = metricas.duracionMs;
    proximo.distanciaKm = metricas.distanciaKm;
  }

  await ejecutar(STORE_TRACKS, 'readwrite', (store) => store.put(proximo));
  return proximo;
}

export async function borrarTrack(id: string): Promise<void> {
  await ejecutar(STORE_TRACKS, 'readwrite', (store) => store.delete(id));
}

// Reasigna `orden` secuencialmente (0..N-1) a los tracks en el orden dado.
export async function reordenarTracks(ids: string[]): Promise<Track[]> {
  const actualizados: Track[] = [];
  for (let i = 0; i < ids.length; i++) {
    const t = await actualizarTrack(ids[i], { orden: i });
    if (t) actualizados.push(t);
  }
  return actualizados;
}
// src/db/tracks-repo.ts