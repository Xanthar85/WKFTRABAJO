// src/state/navegacion-store.ts
// WKF — Estado en memoria de la capa de navegación.
// F3: borrarWaypoint ahora limpia el waypoint de todas las rutas
// que lo contengan (la ruta sigue existiendo con los demás). Se
// añade el helper rutasQueContienenWaypoint para que la UI pueda
// avisar antes de borrar.

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
  borrarBloque as repoBorrarBloque,
  alternarVisibilidadCapa as repoAlternarVisibilidadCapa,
  type BloqueCapas,
} from '../db/capas-repo.ts';

interface NavegacionState {
  // Datos
  waypoints: Waypoint[];
  rutas: Ruta[];
  bloquesCapas: BloqueCapas[];

  // Estado de carga
  cargado: boolean;
  cargando: boolean;
  error: string | null;

  // Carga inicial desde IndexedDB
  cargar: () => Promise<void>;

  // Waypoints
  crearWaypoint: (datos: Omit<Waypoint, 'id' | 'creadoEn'>) => Promise<Waypoint>;
  actualizarWaypoint: (
    id: string,
    patch: Partial<Omit<Waypoint, 'id' | 'creadoEn'>>
  ) => Promise<void>;
  /** Borra el waypoint y lo elimina de todas las rutas que lo
   *  contenían. Las rutas siguen existiendo con los demás waypoints
   *  que tuvieran. Devuelve la lista de ids de las rutas afectadas. */
  borrarWaypoint: (id: string) => Promise<string[]>;
  /** Devuelve las rutas que contienen ese waypoint. */
  rutasQueContienenWaypoint: (waypointId: string) => Ruta[];

  // Rutas
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

  // Capas importadas
  borrarBloque: (id: string) => Promise<void>;
  alternarVisibilidadCapa: (
    bloqueId: string,
    capaId: string,
    visible: boolean
  ) => Promise<void>;
  recargarBloques: () => Promise<void>;
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
    // Localizar las rutas que lo contienen antes de borrar.
    const rutasAfectadas = get().rutas.filter((r) =>
      r.waypointIds.includes(id)
    );

    // Borrar el waypoint del almacén.
    await repoBorrarWaypoint(id);

    // Actualizar cada ruta afectada en IndexedDB.
    const rutasActualizadas: Ruta[] = [];
    for (const r of rutasAfectadas) {
      const nuevosIds = r.waypointIds.filter((wid) => wid !== id);
      const actualizada = await repoActualizarRuta(r.id, {
        waypointIds: nuevosIds,
      });
      if (actualizada) rutasActualizadas.push(actualizada);
    }

    // Actualizar el estado en memoria.
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

  recargarBloques: async () => {
    const bloquesCapas = await listarBloques();
    set({ bloquesCapas });
  },
}));