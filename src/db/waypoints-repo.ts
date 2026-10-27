// src/db/waypoints-repo.ts
// WKF — Repositorio de waypoints en IndexedDB.
// WKF1.054: añadidos `visible` y `favorito`.
// WKF1.063: añadido `color` para eliminar los `as any` de la UI.

import {
  STORE_WAYPOINTS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';

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
  noClicable?: boolean;
}

function nuevoId(): string {
  return `wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  datos: Omit<Waypoint, 'id' | 'creadoEn'>
): Promise<Waypoint> {
  const w: Waypoint = {
    visible: true,
    favorito: false,
    ...datos,
    id: nuevoId(),
    creadoEn: Date.now(),
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

export async function borrarTodosWaypoints(): Promise<void> {
  await ejecutar(STORE_WAYPOINTS, 'readwrite', (store) => store.clear());
}
// src/db/waypoints-repo.ts