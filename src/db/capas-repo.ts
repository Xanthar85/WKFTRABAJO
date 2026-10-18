// src/db/capas-repo.ts
// WKF — Repositorio de capas importadas (GPX, KML, KMZ, JSON).
// F4-bis (Paso 5): se añade el campo `colorCapa?: string` a la
// interfaz `Capa`. El campo es opcional, no rompe datos existentes.
// El resto del modelo se mantiene igual que en F1/F4.

import {
  STORE_CAPAS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';

export type TipoElemento = 'punto' | 'linea' | 'poligono';

export interface EstiloElemento {
  color?: string;
  relleno?: string;
  grosor?: number;
  opacidad?: number;
}

export interface ElementoCapa {
  id: string;
  tipo: TipoElemento;
  coords: [number, number][] | [number, number];
  nombre?: string;
  descripcion?: string;
  estilo?: EstiloElemento;
}

export interface Capa {
  id: string;
  nombre: string;
  visible: boolean;
  elementos: ElementoCapa[];
  /** Color WKF aplicado a la capa entera (Paso 5). Sustituye al
   *  color original de cada elemento cuando está definido.
   *  Formato hex #rrggbb. */
  colorCapa?: string;
}

export interface BloqueCapas {
  id: string;
  nombre: string;
  formato: 'gpx' | 'kml' | 'kmz' | 'json';
  importadoEn: number;
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

/** Cambia el color WKF de una capa entera. `color` null borra el
 *  override y vuelve al color original del elemento. */
export async function cambiarColorCapa(
  bloqueId: string,
  capaId: string,
  color: string | null
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) => {
    if (c.id !== capaId) return c;
    if (color === null) {
      const { colorCapa: _omit, ...resto } = c;
      return resto;
    }
    return { ...c, colorCapa: color };
  });
  return actualizarBloque(bloqueId, { capas });
}

/** Restaura los colores WKF por defecto: borra todos los overrides
 *  de colorCapa de todas las capas de todos los bloques. */
export async function restaurarColoresWKFTodos(): Promise<BloqueCapas[]> {
  const bloques = await listarBloques();
  const actualizados: BloqueCapas[] = [];
  for (const b of bloques) {
    const capas = b.capas.map((c) => {
      const { colorCapa: _omit, ...resto } = c;
      return resto;
    });
    const actualizado: BloqueCapas = { ...b, capas };
    await ejecutar(STORE_CAPAS, 'readwrite', (store) =>
      store.put(actualizado)
    );
    actualizados.push(actualizado);
  }
  return actualizados;
}

/** Actualiza un vértice de una línea o polígono dentro de una capa.
 *  `indiceVertice` es el índice en el array de coords del elemento,
 *  tal cual lo recibe el `dragend` de CapaMapa.
 *  No toca puntos: para un punto, `indiceVertice` debe ser 0 y
 *  `coords` pasa a ser [lat, lon]. */
export async function actualizarVertice(
  bloqueId: string,
  capaId: string,
  elementoId: string,
  indiceVertice: number,
  lat: number,
  lon: number
): Promise<BloqueCapas | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;

  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;

  const capas = bloque.capas.map((c) => {
    if (c.id !== capaId) return c;
    const elementos = c.elementos.map((el) => {
      if (el.id !== elementoId) return el;

      if (el.tipo === 'punto') {
        return { ...el, coords: [lat, lon] as [number, number] };
      }

      if (!Array.isArray(el.coords)) return el;
      const arr = el.coords as [number, number][];
      if (
        !Number.isInteger(indiceVertice) ||
        indiceVertice < 0 ||
        indiceVertice >= arr.length
      ) {
        return el;
      }
      const copia: [number, number][] = arr.map((p, i) =>
        i === indiceVertice ? [lat, lon] : p
      );
      return { ...el, coords: copia };
    });
    return { ...c, elementos };
  });

  return actualizarBloque(bloqueId, { capas });
}

export async function borrarBloque(id: string): Promise<void> {
  await ejecutar(STORE_CAPAS, 'readwrite', (store) => store.delete(id));
}

export async function borrarTodosBloques(): Promise<void> {
  await ejecutar(STORE_CAPAS, 'readwrite', (store) => store.clear());
}
// src/db/capas-repo.ts