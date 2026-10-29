// src/db/capas-repo.ts
// WKF — Repositorio de capas importadas (GPX, KML, KMZ, JSON).
// WKF1.067: añadido campo `orden` a Capa y ElementoCapa.
//   · crearBloque asigna orden a capas (0..N-1) y a elementos dentro
//     de cada capa (0..M-1).
//   · Nuevos helpers reordenarCapas y reordenarElementosCapa.
//   · También se ha restaurado el fichero completo, que estaba
//     truncado a partir de alternarVis.
// WKF1.068: `nuevoId` centralizado en ./helpers.ts. La copia local
// se ha eliminado. Prefijos 'bl-', 'cp-', 'el-' conservados.

import {
  STORE_CAPAS,
  ejecutar,
  obtenerTodos,
} from './indexeddb.ts';
import { nuevoId } from './helpers.ts';

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
  visible?: boolean;
  favorito?: boolean;
  orden?: number;
}

export interface Capa {
  id: string;
  nombre: string;
  visible: boolean;
  elementos: ElementoCapa[];
  colorCapa?: string;
  orden?: number;
}

export interface BloqueCapas {
  id: string;
  nombre: string;
  formato: 'gpx' | 'kml' | 'kmz' | 'json';
  importadoEn: number;
  capas: Capa[];
  favorito?: boolean;
  colorBloque?: string;
  orden?: number;
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
  capas: Array<Omit<Capa, 'id' | 'orden'> & {
    elementos: Array<Omit<ElementoCapa, 'id' | 'orden'>>;
  }>;
}): Promise<BloqueCapas> {
  const bloque: BloqueCapas = {
    id: nuevoId('bl'),
    nombre: datos.nombre,
    formato: datos.formato,
    importadoEn: Date.now(),
    capas: datos.capas.map((c, idxCapa) => {
      const ordenCapa =
        typeof (c as { orden?: number }).orden === 'number'
          ? ((c as unknown) as { orden: number }).orden
          : idxCapa;
      return {
        ...c,
        id: nuevoId('cp'),
        orden: ordenCapa,
        elementos: c.elementos.map((el, idxEl) => {
          const ordenEl =
            typeof (el as { orden?: number }).orden === 'number'
              ? ((el as unknown) as { orden: number }).orden
              : idxEl;
          return {
            visible: true,
            favorito: false,
            ...el,
            id: nuevoId('el'),
            orden: ordenEl,
          };
        }),
      };
    }),
    favorito: false,
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

export async function alternarVisibilidadElemento(
  bloqueId: string,
  capaId: string,
  elementoId: string,
  visible: boolean
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId
      ? {
          ...c,
          elementos: c.elementos.map((el) =>
            el.id === elementoId ? { ...el, visible } : el
          ),
        }
      : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function alternarFavoritoElemento(
  bloqueId: string,
  capaId: string,
  elementoId: string,
  favorito: boolean
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId
      ? {
          ...c,
          elementos: c.elementos.map((el) =>
            el.id === elementoId ? { ...el, favorito } : el
          ),
        }
      : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function borrarBloque(id: string): Promise<void> {
  await ejecutar(STORE_CAPAS, 'readwrite', (store) => store.delete(id));
}

export async function borrarElementoCapa(
  bloqueId: string,
  capaId: string,
  elementoId: string
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId
      ? {
          ...c,
          elementos: c.elementos.filter((el) => el.id !== elementoId),
        }
      : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function borrarCapaSuelta(
  bloqueId: string,
  capaId: string
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const restantes = bloque.capas
    .filter((c) => c.id !== capaId)
    .map((c, idx) => ({ ...c, orden: idx }));
  return actualizarBloque(bloqueId, { capas: restantes });
}

export async function cambiarColorCapa(
  bloqueId: string,
  capaId: string,
  color: string | null
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId ? { ...c, colorCapa: color ?? undefined } : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function cambiarColorBloque(
  bloqueId: string,
  color: string | null
): Promise<BloqueCapas | null> {
  return actualizarBloque(bloqueId, { colorBloque: color ?? undefined });
}

export async function cambiarColorElemento(
  bloqueId: string,
  capaId: string,
  elementoId: string,
  color: string | null
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId
      ? {
          ...c,
          elementos: c.elementos.map((el) =>
            el.id === elementoId
              ? {
                  ...el,
                  estilo: {
                    ...(el.estilo ?? {}),
                    color: color ?? undefined,
                  },
                }
              : el
          ),
        }
      : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function renombrarCapa(
  bloqueId: string,
  capaId: string,
  nombre: string
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId ? { ...c, nombre } : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function renombrarElementoCapa(
  bloqueId: string,
  capaId: string,
  elementoId: string,
  nombre: string
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) =>
    c.id === capaId
      ? {
          ...c,
          elementos: c.elementos.map((el) =>
            el.id === elementoId ? { ...el, nombre } : el
          ),
        }
      : c
  );
  return actualizarBloque(bloqueId, { capas });
}

export async function duplicarElementoCapa(
  bloqueId: string,
  capaId: string,
  elementoId: string
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) => {
    if (c.id !== capaId) return c;
    const origen = c.elementos.find((el) => el.id === elementoId);
    if (!origen) return c;
    let maxOrden = 0;
    for (const el of c.elementos) {
      if (typeof el.orden === 'number' && el.orden > maxOrden) {
        maxOrden = el.orden;
      }
    }
    const copia: ElementoCapa = {
      ...origen,
      id: nuevoId('el'),
      nombre: `${origen.nombre ?? 'Elemento'} (copia)`,
      orden: maxOrden + 1,
    };
    return { ...c, elementos: [...c.elementos, copia] };
  });
  return actualizarBloque(bloqueId, { capas });
}

export async function actualizarVertice(
  bloqueId: string,
  capaId: string,
  elementoId: string,
  indiceVertice: number,
  lat: number,
  lon: number
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const capas = bloque.capas.map((c) => {
    if (c.id !== capaId) return c;
    return {
      ...c,
      elementos: c.elementos.map((el) => {
        if (el.id !== elementoId) return el;
        const coords = el.coords as [number, number][];
        if (!Array.isArray(coords) || indiceVertice < 0 || indiceVertice >= coords.length) {
          return el;
        }
        const nuevasCoords = coords.slice();
        nuevasCoords[indiceVertice] = [lat, lon];
        return { ...el, coords: nuevasCoords };
      }),
    };
  });
  return actualizarBloque(bloqueId, { capas });
}

export async function moverElementoEntreCapas(
  bloqueOrigenId: string,
  capaOrigenId: string,
  elementoId: string,
  bloqueDestinoId: string,
  capaDestinoId: string
): Promise<{ origen: BloqueCapas | null; destino: BloqueCapas | null }> {
  const bloqueOrigen = await obtenerBloque(bloqueOrigenId);
  if (!bloqueOrigen) return { origen: null, destino: null };
  const capaOrigen = bloqueOrigen.capas.find((c) => c.id === capaOrigenId);
  if (!capaOrigen) return { origen: null, destino: null };
  const elemento = capaOrigen.elementos.find((el) => el.id === elementoId);
  if (!elemento) return { origen: null, destino: null };

  const mismoBloque = bloqueOrigenId === bloqueDestinoId;

  // Calcular orden destino ANTES de modificar nada.
  let maxOrdenDestino = 0;
  let bloqueDestino: BloqueCapas | null = bloqueOrigen;
  if (!mismoBloque) {
    bloqueDestino = await obtenerBloque(bloqueDestinoId);
    if (!bloqueDestino) return { origen: null, destino: null };
  }
  const capaDestino = bloqueDestino.capas.find((c) => c.id === capaDestinoId);
  if (!capaDestino) return { origen: null, destino: null };
  for (const el of capaDestino.elementos) {
    if (typeof el.orden === 'number' && el.orden > maxOrdenDestino) {
      maxOrdenDestino = el.orden;
    }
  }

  if (mismoBloque) {
    // Mover dentro del mismo bloque: quitar de origen, añadir a destino.
    const capas = bloqueOrigen.capas.map((c) => {
      if (c.id === capaOrigenId) {
        return {
          ...c,
          elementos: c.elementos.filter((el) => el.id !== elementoId),
        };
      }
      if (c.id === capaDestinoId) {
        return {
          ...c,
          elementos: [
            ...c.elementos,
            { ...elemento, orden: maxOrdenDestino + 1 },
          ],
        };
      }
      return c;
    });
    const destino = await actualizarBloque(bloqueOrigenId, { capas });
    return { origen: destino, destino };
  }

  // Distinto bloque: el elemento se va del origen al destino, con id nuevo.
  const nuevoElemento: ElementoCapa = {
    ...elemento,
    id: nuevoId('el'),
    orden: maxOrdenDestino + 1,
  };

  const capasOrigen = bloqueOrigen.capas.map((c) =>
    c.id === capaOrigenId
      ? {
          ...c,
          elementos: c.elementos.filter((el) => el.id !== elementoId),
        }
      : c
  );
  const capasDestino = bloqueDestino.capas.map((c) =>
    c.id === capaDestinoId
      ? { ...c, elementos: [...c.elementos, nuevoElemento] }
      : c
  );

  const origenAct = await actualizarBloque(bloqueOrigenId, { capas: capasOrigen });
  const destinoAct = await actualizarBloque(bloqueDestinoId, {
    capas: capasDestino,
  });
  return { origen: origenAct, destino: destinoAct };
}

export async function restaurarColoresWKFTodos(): Promise<BloqueCapas[]> {
  const bloques = await listarBloques();
  const actualizados: BloqueCapas[] = [];
  for (const b of bloques) {
    const capas = b.capas.map((c) => ({
      ...c,
      colorCapa: undefined,
      elementos: c.elementos.map((el) => ({
        ...el,
        estilo: { ...(el.estilo ?? {}), color: undefined },
      })),
    }));
    const act = await actualizarBloque(b.id, { capas, colorBloque: undefined });
    if (act) actualizados.push(act);
  }
  return actualizados;
}

// Reasigna `orden` secuencialmente (0..N-1) a las capas del bloque.
export async function reordenarCapas(
  bloqueId: string,
  ids: string[]
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const posicion = new Map<string, number>();
  ids.forEach((id, idx) => posicion.set(id, idx));
  const capas = bloque.capas.map((c) => {
    const nuevo = posicion.get(c.id);
    return typeof nuevo === 'number' ? { ...c, orden: nuevo } : c;
  });
  return actualizarBloque(bloqueId, { capas });
}

// Reasigna `orden` secuencialmente (0..N-1) a los elementos de una capa.
export async function reordenarElementosCapa(
  bloqueId: string,
  capaId: string,
  ids: string[]
): Promise<BloqueCapas | null> {
  const bloque = await obtenerBloque(bloqueId);
  if (!bloque) return null;
  const posicion = new Map<string, number>();
  ids.forEach((id, idx) => posicion.set(id, idx));
  const capas = bloque.capas.map((c) => {
    if (c.id !== capaId) return c;
    return {
      ...c,
      elementos: c.elementos.map((el) => {
        const nuevo = posicion.get(el.id);
        return typeof nuevo === 'number' ? { ...el, orden: nuevo } : el;
      }),
    };
  });
  return actualizarBloque(bloqueId, { capas });
}
// src/db/capas-repo.ts