// src/db/waypoints-repo.ts
// WKF — Repositorio de waypoints en IndexedDB.
// WKF1.067: añadido campo `orden` (posición dentro de su caja).
//   · crearWaypoint calcula orden = max(orden de la carpeta) + 1.
//   · Nuevo helper reordenarWaypoints para ▲▼ dentro de una caja.
// WKF1.068: `nuevoId` centralizado en ./helpers.ts. La copia local
// se ha eliminado. Prefijo 'wp-' conservado.

import {
  STORE_WAYPOINTS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';
import { nuevoId } from './helpers.ts';

export interface Waypoint {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  nota?: string;
  creadoEn: number;
  carpetaId?: string;
  visible?: boolean;
  favorito?: boolean;
  color?: string;
  orden?: number;
}

export async function listarWaypoints(): Promise<Waypoint[]> {
  return obtenerTodos<Waypoint>(STORE_WAYPOINTS);
}

export async function obtenerWaypoint(id: string): Promise<Waypoint | null> {
  const w = await ejecutar<Waypoint | undefined>(
    STORE_WAYPOINTS,
    'readonly',
    (store) => store.get(id)
  );
  return w ?? null;
}

export async function crearWaypoint(
  datos: Omit<Waypoint, 'id' | 'creadoEn' | 'orden'>
): Promise<Waypoint> {
  const existentes = await listarWaypoints();
  const carpetaObjetivo = datos.carpetaId;
  let maxOrden = 0;
  for (const w of existentes) {
    if ((w.carpetaId ?? undefined) === (carpetaObjetivo ?? undefined)) {
      if (typeof w.orden === 'number' && w.orden > maxOrden) {
        maxOrden = w.orden;
      }
    }
  }
  const w: Waypoint = {
    visible: true,
    favorito: false,
    ...datos,
    id: nuevoId('wp'),
    creadoEn: Date.now(),
    orden: maxOrden + 1,
  };
  await ejecutar(STORE_WAYPOINTS, 'readwrite', (store) => store.put(w));
  return w;
}

export async function actualizarWaypoint(
  id: string,
  patch: Partial<Omit<Waypoint, 'id' | 'creadoEn'>>
): Promise<Waypoint | null> {
  const actual = await obtenerWaypoint(id);
  if (!actual) return null;
  const actualizado: Waypoint = { ...actual, ...patch };
  await ejecutar(STORE_WAYPOINTS, 'readwrite', (store) => store.put(actualizado));
  return actualizado;
}

export async function borrarWaypoint(id: string): Promise<void> {
  await ejecutar(STORE_WAYPOINTS, 'readwrite', (store) => store.delete(id));
}

// Reasigna `orden` secuencialmente (0..N-1) a los waypoints de una caja,
// en el orden dado. Escribe los cambios y los devuelve actualizados.
export async function reordenarWaypoints(
  ids: string[]
): Promise<Waypoint[]> {
  const actualizados: Waypoint[] = [];
  for (let i = 0; i < ids.length; i++) {
    const wp = await actualizarWaypoint(ids[i], { orden: i });
    if (wp) actualizados.push(wp);
  }
  return actualizados;
}
// src/db/waypoints-repo.ts