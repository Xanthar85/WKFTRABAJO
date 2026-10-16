// src/db/rutas-repo.ts
// WKF — Repositorio de rutas en IndexedDB.
// F1: modelo y CRUD básico. La UI empieza a usarlo en F3.
// Una ruta es una lista ORDENADA de waypoints. Para no duplicar
// datos si un waypoint se edita, la ruta guarda los ids de los
// waypoints, no sus copias.
//
// En F6 se añadirá el campo `origen: 'manual' | 'track'` para
// distinguir rutas creadas a mano de rutas grabadas en vivo.

import {
  STORE_RUTAS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';

export type OrigenRuta = 'manual' | 'track';

export interface Ruta {
  id: string;
  nombre: string;
  waypointIds: string[];
  nota?: string;
  origen: OrigenRuta;
  creadoEn: number;
}

function nuevoId(): string {
  return `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listarRutas(): Promise<Ruta[]> {
  return obtenerTodos<Ruta>(STORE_RUTAS);
}

export async function obtenerRuta(id: string): Promise<Ruta | null> {
  const r = await ejecutar<Ruta | undefined>(
    STORE_RUTAS,
    'readonly',
    (store) => store.get(id)
  );
  return r ?? null;
}

export async function crearRuta(datos: {
  nombre: string;
  waypointIds: string[];
  nota?: string;
  origen?: OrigenRuta;
}): Promise<Ruta> {
  const r: Ruta = {
    id: nuevoId(),
    nombre: datos.nombre,
    waypointIds: [...datos.waypointIds],
    nota: datos.nota,
    origen: datos.origen ?? 'manual',
    creadoEn: Date.now(),
  };
  await ejecutar(STORE_RUTAS, 'readwrite', (store) => store.put(r));
  return r;
}

export async function actualizarRuta(
  id: string,
  patch: Partial<Omit<Ruta, 'id' | 'creadoEn'>>
): Promise<Ruta | null> {
  const actual = await obtenerRuta(id);
  if (!actual) return null;
  const actualizada: Ruta = { ...actual, ...patch };
  await ejecutar(STORE_RUTAS, 'readwrite', (store) => store.put(actualizada));
  return actualizada;
}

export async function borrarRuta(id: string): Promise<void> {
  await ejecutar(STORE_RUTAS, 'readwrite', (store) => store.delete(id));
}

export async function borrarTodasRutas(): Promise<void> {
  await ejecutar(STORE_RUTAS, 'readwrite', (store) => store.clear());
}