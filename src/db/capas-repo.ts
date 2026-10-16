// src/db/capas-repo.ts
// WKF — Repositorio de capas importadas (GPX, KML, KMZ, JSON).
// F1: modelo y CRUD básico. La UI empieza a usarlo en F4.
//
// Un "bloque de capas" es lo que resulta de importar un archivo.
// Dentro de un bloque hay una o varias capas. Cada capa tiene
// elementos: puntos, líneas y polígonos.
//
// El modelo de `ElementoCapa` es flexible a propósito: en F1
// definimos la forma general, en F4 lo rellenamos con lo que
// saquemos del parser GPX/KML.

import {
  STORE_CAPAS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';

export type TipoElemento = 'punto' | 'linea' | 'poligono';

export interface EstiloElemento {
  /** Color en formato CSS (#rrggbb) o rgba(). Opcional. */
  color?: string;
  /** Color de relleno para polígonos. Opcional. */
  relleno?: string;
  /** Grosor de línea en píxeles (Leaflet). Opcional. */
  grosor?: number;
  /** Opacidad 0-1. Opcional. */
  opacidad?: number;
}

export interface ElementoCapa {
  id: string;
  tipo: TipoElemento;
  /** Coordenadas. Para punto: [lat, lon]. Para línea o polígono:
   *  array ordenado de [lat, lon]. */
  coords: [number, number][] | [number, number];
  /** Nombre del elemento, si el archivo lo trae. */
  nombre?: string;
  /** Descripción o nota del elemento, si el archivo la trae. */
  descripcion?: string;
  /** Estilo original del archivo (color, grosor, etc.). */
  estilo?: EstiloElemento;
}

export interface Capa {
  id: string;
  nombre: string;
  visible: boolean;
  elementos: ElementoCapa[];
}

export interface BloqueCapas {
  id: string;
  /** Nombre del bloque (por defecto, el del archivo importado). */
  nombre: string;
  /** Formato de origen, para saber de dónde viene. */
  formato: 'gpx' | 'kml' | 'kmz' | 'json';
  /** Fecha de importación. */
  importadoEn: number;
  /** Capas que contiene el bloque. */
  capas: Capa[];
}

function nuevoId(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listarBloques(): Promise<BloqueCapas[]> {
  return obtenerTodos<BloqueCapas>(STORE_CAPAS);
}

export async function obtenerBloque(id: string): Promise<BloqueCapas | null> {
  const b = await ejecutar<BloqueCapas | undefined>(
    STORE_CAPAS,
    'readonly',
    (store) => store.get(id)
  );
  return b ?? null;
}

export async function crearBloque(datos: {
  nombre: string;
  formato: BloqueCapas['formato'];
  capas: Omit<Capa, 'id'>[];
}): Promise<BloqueCapas> {
  const bloque: BloqueCapas = {
    id: nuevoId('bl'),
    nombre: datos.nombre,
    formato: datos.formato,
    importadoEn: Date.now(),
    capas: datos.capas.map((c) => ({
      ...c,
      id: nuevoId('cp'),
    })),
  };
  await ejecutar(STORE_CAPAS, 'readwrite', (store) => store.put(bloque));
  return bloque;
}

export async function actualizarBloque(
  id: string,
  patch: Partial<Omit<BloqueCapas, 'id' | 'importadoEn'>>
): Promise<BloqueCapas | null> {
  const actual = await obtenerBloque(id);
  if (!actual) return null;
  const actualizado: BloqueCapas = { ...actual, ...patch };
  await ejecutar(STORE_CAPAS, 'readwrite', (store) => store.put(actualizado));
  return actualizado;
}

export async function alternarVisibilidadCapa(
  bloqueId: string,
  capaId: string,
  visible: boolean
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId ? { ...c, visible } : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function borrarBloque(id: string): Promise<void> {
  await ejecutar(STORE_CAPAS, 'readwrite', (store) => store.delete(id));
}

export async function borrarTodosBloques(): Promise<void> {
  await ejecutar(STORE_CAPAS, 'readwrite', (store) => store.clear());
}