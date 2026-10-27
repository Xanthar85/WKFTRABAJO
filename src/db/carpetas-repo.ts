// src/db/carpetas-repo.ts
// WKF — Repositorio de carpetas para agrupar waypoints/rutas/tracks.
// WKF1.067: helper reordenarCarpetas para ▲▼ de cajas manuales.

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
  const existentes = await listarCarpetas();
  let maxOrden = 0;
  for (const c of existentes) {
    if (typeof c.orden === 'number' && c.orden > maxOrden) {
      maxOrden = c.orden;
    }
  }
  const c: Carpeta = {
    id: nuevoId(),
    nombre: datos.nombre,
    color: datos.color,
    creadoEn: Date.now(),
    orden: maxOrden + 1,
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

// Reasigna `orden` secuencialmente (0..N-1) a las carpetas en el orden dado.
export async function reordenarCarpetas(ids: string[]): Promise<Carpeta[]> {
  const actualizadas: Carpeta[] = [];
  for (let i = 0; i < ids.length; i++) {
    const c = await actualizarCarpeta(ids[i], { orden: i });
    if (c) actualizadas.push(c);
  }
  return actualizadas;
}
// src/db/carpetas-repo.ts