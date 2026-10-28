// src/db/rutas-repo.ts
// WKF — Repositorio de rutas en IndexedDB.
// WKF1.067: añadido campo `orden` (posición dentro de su caja).
//   · crearRuta calcula orden = max(orden de la carpeta) + 1.
//   · Nuevo helper reordenarRutas para ▲▼ dentro de una caja.

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
  visible?: boolean;
  favorito?: boolean;
  carpetaId?: string;
  orden?: number;
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
  carpetaId?: string;
}): Promise<Ruta> {
  const existentes = await listarRutas();
  const carpetaObjetivo = datos.carpetaId;
  let maxOrden = 0;
  for (const r of existentes) {
    if ((r.carpetaId ?? undefined) === (carpetaObjetivo ?? undefined)) {
      if (typeof r.orden === 'number' && r.orden > maxOrden) {
        maxOrden = r.orden;
      }
    }
  }
  const r: Ruta = {
    id: nuevoId(),
    nombre: datos.nombre,
    waypointIds: [...datos.waypointIds],
    nota: datos.nota,
    origen: datos.origen ?? 'manual',
    creadoEn: Date.now(),
    visible: true,
    favorito: false,
    carpetaId: datos.carpetaId,
    orden: maxOrden + 1,
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

// Reasigna `orden` secuencialmente (0..N-1) a las rutas en el orden dado.
export async function reordenarRutas(ids: string[]): Promise<Ruta[]> {
  const actualizadas: Ruta[] = [];
  for (let i = 0; i < ids.length; i++) {
    const r = await actualizarRuta(ids[i], { orden: i });
    if (r) actualizadas.push(r);
  }
  return actualizadas;
}
// src/db/rutas-repo.ts