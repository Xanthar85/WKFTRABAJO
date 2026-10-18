// src/state/navegacion-store.ts
// WKF — Estado en memoria de la capa de navegación.
// F4-bis: añadida alternarVisibilidadBloque (activa/desactiva
//         todas las capas de un bloque de golpe) y detección de
//         duplicado exacto al importar.

import { create } from 'zustand';
import {
  listarWaypoints,
  crearWaypoint as repoCrearWaypoint,
  actualizarWaypoint as repoActualizarWaypoint,
  borrarWaypoint as repoBorrarWaypoint,
  type Waypoint,
} from '../db/waypoints-repo.ts';
import {
  listarRutas,
  crearRuta as repoCrearRuta,
  actualizarRuta as repoActualizarRuta,
  borrarRuta as repoBorrarRuta,
  type Ruta,
} from '../db/rutas-repo.ts';
import {
  listarBloques,
  crearBloque as repoCrearBloque,
  borrarBloque as repoBorrarBloque,
  alternarVisibilidadCapa as repoAlternarVisibilidadCapa,
  actualizarBloque as repoActualizarBloque,
  type BloqueCapas,
} from '../db/capas-repo.ts';

export interface ResumenImportacion {
  waypointsImportados: number;
  rutasImportadas: number;
  bloquesImportados: number;
  descartados: number;
  /** true si algún bloque de capas se descartó por ser un
   *  duplicado exacto de uno ya existente. */
  duplicado: boolean;
}

interface NavegacionState {
  waypoints: Waypoint[];
  rutas: Ruta[];
  bloquesCapas: BloqueCapas[];

  cargado: boolean;
  cargando: boolean;
  error: string | null;

  cargar: () => Promise<void>;

  crearWaypoint: (datos: Omit<Waypoint, 'id' | 'creadoEn'>) => Promise<Waypoint>;
  actualizarWaypoint: (
    id: string,
    patch: Partial<Omit<Waypoint, 'id' | 'creadoEn'>>
  ) => Promise<void>;
  borrarWaypoint: (id: string) => Promise<string[]>;
  rutasQueContienenWaypoint: (waypointId: string) => Ruta[];

  crearRuta: (datos: {
    nombre: string;
    waypointIds: string[];
    nota?: string;
    origen?: Ruta['origen'];
  }) => Promise<Ruta>;
  actualizarRuta: (
    id: string,
    patch: Partial<Omit<Ruta, 'id' | 'creadoEn'>>
  ) => Promise<void>;
  borrarRuta: (id: string) => Promise<void>;

  borrarBloque: (id: string) => Promise<void>;
  alternarVisibilidadCapa: (
    bloqueId: string,
    capaId: string,
    visible: boolean
  ) => Promise<void>;
  /** Activa o desactiva TODAS las capas de un bloque de golpe. */
  alternarVisibilidadBloque: (
    bloqueId: string,
    visible: boolean
  ) => Promise<void>;
  recargarBloques: () => Promise<void>;

  importarContenido: (datos: {
    waypoints: Array<{ nombre: string; lat: number; lon: number; nota?: string }>;
    rutas: Array<{
      nombre: string;
      nombresWaypoints: string[];
      nota?: string;
      origen: Ruta['origen'];
    }>;
    bloquesCapas: Array<Omit<BloqueCapas, 'id'>>;
  }) => Promise<ResumenImportacion>;
}

// Normaliza un nombre de archivo quitándole la extensión si la lleva.
function sinExtension(nombre: string, formato: string): string {
  const ext = formato.toLowerCase();
  const n = nombre.toLowerCase().trim();
  if (n.endsWith(`.${ext}`)) {
    return n.slice(0, -(ext.length + 1));
  }
  return n;
}

// Firma de un bloque: nombre normalizado + formato + número de
// capas + número total de elementos. Sirve para detectar duplicado
// exacto sin comparar el contenido entero (que puede ser enorme).
function firmaBloque(b: {
  nombre: string;
  formato: string;
  capas: Array<{ elementos: unknown[] }>;
}): string {
  const nombreNorm = sinExtension(b.nombre, b.formato);
  const numCapas = Array.isArray(b.capas) ? b.capas.length : 0;
  let numElementos = 0;
  if (Array.isArray(b.capas)) {
    for (const c of b.capas) {
      if (Array.isArray(c.elementos)) numElementos += c.elementos.length;
    }
  }
  return `${nombreNorm}|${b.formato.toLowerCase()}|${numCapas}|${numElementos}`;
}

export const useNavegacionStore = create<NavegacionState>((set, get) => ({
  waypoints: [],
  rutas: [],
  bloquesCapas: [],
  cargado: false,
  cargando: false,
  error: null,

  cargar: async () => {
    if (get().cargando) return;
    set({ cargando: true, error: null });
    try {
      const [waypoints, rutas, bloquesCapas] = await Promise.all([
        listarWaypoints(),
        listarRutas(),
        listarBloques(),
      ]);
      set({
        waypoints,
        rutas,
        bloquesCapas,
        cargado: true,
        cargando: false,
      });
    } catch (err) {
      console.error('Error cargando navegación desde IndexedDB', err);
      set({
        cargando: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  },

  crearWaypoint: async (datos) => {
    const w = await repoCrearWaypoint(datos);
    set((state) => ({ waypoints: [...state.waypoints, w] }));
    return w;
  },

  actualizarWaypoint: async (id, patch) => {
    const actualizado = await repoActualizarWaypoint(id, patch);
    if (!actualizado) return;
    set((state) => ({
      waypoints: state.waypoints.map((w) => (w.id === id ? actualizado : w)),
    }));
  },

  borrarWaypoint: async (id) => {
    const rutasAfectadas = get().rutas.filter((r) =>
      r.waypointIds.includes(id)
    );

    await repoBorrarWaypoint(id);

    const rutasActualizadas: Ruta[] = [];
    for (const r of rutasAfectadas) {
      const nuevosIds = r.waypointIds.filter((wid) => wid !== id);
      const actualizada = await repoActualizarRuta(r.id, {
        waypointIds: nuevosIds,
      });
      if (actualizada) rutasActualizadas.push(actualizada);
    }

    set((state) => ({
      waypoints: state.waypoints.filter((w) => w.id !== id),
      rutas: state.rutas.map((r) => {
        const upd = rutasActualizadas.find((x) => x.id === r.id);
        return upd ?? r;
      }),
    }));

    return rutasAfectadas.map((r) => r.id);
  },

  rutasQueContienenWaypoint: (waypointId) => {
    return get().rutas.filter((r) => r.waypointIds.includes(waypointId));
  },

  crearRuta: async (datos) => {
    const r = await repoCrearRuta(datos);
    set((state) => ({ rutas: [...state.rutas, r] }));
    return r;
  },

  actualizarRuta: async (id, patch) => {
    const actualizada = await repoActualizarRuta(id, patch);
    if (!actualizada) return;
    set((state) => ({
      rutas: state.rutas.map((r) => (r.id === id ? actualizada : r)),
    }));
  },

  borrarRuta: async (id) => {
    await repoBorrarRuta(id);
    set((state) => ({
      rutas: state.rutas.filter((r) => r.id !== id),
    }));
  },

  borrarBloque: async (id) => {
    await repoBorrarBloque(id);
    set((state) => ({
      bloquesCapas: state.bloquesCapas.filter((b) => b.id !== id),
    }));
  },

  alternarVisibilidadCapa: async (bloqueId, capaId, visible) => {
    const actualizado = await repoAlternarVisibilidadCapa(
      bloqueId,
      capaId,
      visible
    );
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  alternarVisibilidadBloque: async (bloqueId, visible) => {
    const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
    if (!bloque) return;
    const capas = bloque.capas.map((c) => ({ ...c, visible }));
    const actualizado = await repoActualizarBloque(bloqueId, { capas });
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  recargarBloques: async () => {
    const bloquesCapas = await listarBloques();
    set({ bloquesCapas });
  },

  importarContenido: async (datos) => {
    let descartados = 0;
    let duplicado = false;

    const waypointsCreados: Waypoint[] = [];
    for (const w of datos.waypoints) {
      if (
        typeof w.nombre !== 'string' ||
        w.nombre.trim() === '' ||
        !Number.isFinite(w.lat) ||
        !Number.isFinite(w.lon) ||
        w.lat < -90 ||
        w.lat > 90 ||
        w.lon < -180 ||
        w.lon > 180
      ) {
        descartados++;
        continue;
      }

      const yaExiste = get().waypoints.find(
        (existente) =>
          existente.nombre.toLowerCase().trim() === w.nombre.toLowerCase().trim() &&
          Math.abs(existente.lat - w.lat) < 0.00001 &&
          Math.abs(existente.lon - w.lon) < 0.00001
      );

      if (yaExiste) {
        waypointsCreados.push(yaExiste);
        continue;
      }

      try {
        const creado = await repoCrearWaypoint({
          nombre: w.nombre.trim(),
          lat: w.lat,
          lon: w.lon,
          nota: w.nota,
        });
        waypointsCreados.push(creado);
      } catch {
        descartados++;
      }
    }

    const waypointsPorNombre = new Map<string, string>();
    for (const w of get().waypoints) {
      waypointsPorNombre.set(w.nombre, w.id);
    }
    for (const w of waypointsCreados) {
      waypointsPorNombre.set(w.nombre, w.id);
    }

    const rutasCreadas: Ruta[] = [];
    for (const r of datos.rutas) {
      if (typeof r.nombre !== 'string' || r.nombre.trim() === '') {
        descartados++;
        continue;
      }
      const ids: string[] = [];
      for (const nombre of r.nombresWaypoints) {
        const id = waypointsPorNombre.get(nombre);
        if (id) ids.push(id);
      }
      if (ids.length < 2) {
        descartados++;
        continue;
      }
      try {
        const creada = await repoCrearRuta({
          nombre: r.nombre.trim(),
          waypointIds: ids,
          nota: r.nota,
          origen: r.origen,
        });
        rutasCreadas.push(creada);
      } catch {
        descartados++;
      }
    }

    const bloquesCreados: BloqueCapas[] = [];
    const firmasExistentes = new Set<string>();
    for (const eb of get().bloquesCapas) {
      firmasExistentes.add(firmaBloque(eb));
    }
    const firmasNuevas = new Set<string>();

    for (const b of datos.bloquesCapas) {
      if (typeof b.nombre !== 'string' || b.nombre.trim() === '') {
        descartados++;
        continue;
      }
      if (!Array.isArray(b.capas) || b.capas.length === 0) {
        descartados++;
        continue;
      }

      const firma = firmaBloque(b);
      if (firmasExistentes.has(firma) || firmasNuevas.has(firma)) {
        duplicado = true;
        continue;
      }

      try {
        const creado = await repoCrearBloque({
          nombre: b.nombre.trim(),
          formato: b.formato,
          capas: b.capas,
        });
        bloquesCreados.push(creado);
        firmasNuevas.add(firma);
      } catch {
        descartados++;
      }
    }

    set((state) => ({
      waypoints: [...state.waypoints, ...waypointsCreados],
      rutas: [...state.rutas, ...rutasCreadas],
      bloquesCapas: [...state.bloquesCapas, ...bloquesCreados],
    }));

    return {
      waypointsImportados: waypointsCreados.length,
      rutasImportadas: rutasCreadas.length,
      bloquesImportados: bloquesCreados.length,
      descartados,
      duplicado,
    };
  },
}));

No abras ningún otro archivo. No hagas grep. No explores.
No refactorices. No limpies. Solo reemplaza este archivo entero.
Al terminar, indica en el chat qué archivo has sobreescrito.