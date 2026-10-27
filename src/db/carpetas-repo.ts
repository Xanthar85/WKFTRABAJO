// src/db/carpetas-repo.ts
// WKF — Repositorio de carpetas para agrupar waypoints.

import {
  STORE_CARPETAS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';

export interface Carpeta {
  id: string;
  nombre: string;
  color?: string;
  creadoEn: number;
  orden?: number;
  noClicable?: boolean;
}

function nuevoId(): string {
  return `carp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listarCarpetas(): Promise<Carpeta[]> {
  return obtenerTodos<Carpeta>(STORE_CARPETAS);
}

export async function crearCarpeta(datos: {
  nombre: string;
  color?: string;
}): Promise<Carpeta> {
  const c: Carpeta = {
    id: nuevoId(),
    nombre: datos.nombre,
    color: datos.color,
    creadoEn: Date.now(),
  };
  await ejecutar(STORE_CARPETAS, 'readwrite', (store) => store.put(c));
  return c;
}

export async function actualizarCarpeta(
  id: string,
  patch: Partial<Omit<Carpeta, 'id' | 'creadoEn'>>
): Promise<Carpeta | null> {
  const existentes = await listarCarpetas();
  const actual = existentes.find((x) => x.id === id);
  if (!actual) return null;
  const actualizada: Carpeta = { ...actual, ...patch };
  await ejecutar(STORE_CARPETAS, 'readwrite', (store) => store.put(actualizada));
  return actualizada;
}

export async function borrarCarpeta(id: string): Promise<void> {
  await ejecutar(STORE_CARPETAS, 'readwrite', (store) => store.delete(id));
}
// src/db/carpetas-repo.ts