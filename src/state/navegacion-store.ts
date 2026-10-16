// src/state/navegacion-store.ts
// WKF — Estado en memoria de la capa de navegación.
// F1: monta el store, carga lo que haya en IndexedDB y expone las
// acciones para que la UI las use a partir de F2.
//
// No persiste en localStorage. La persistencia real es IndexedDB,
// y este store es solo la copia en memoria que ve React.

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
  borrarWaypoint: (id: string) => Promise<void>;

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
  /** Se usa en F4 tras importar un archivo. En F1 solo existe la
   *  acción por si la UI la necesita cuando lleguemos allí. */
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
    await repoBorrarWaypoint(id);
    set((state) => ({
      waypoints: state.waypoints.filter((w) => w.id !== id),
      // Las rutas que contenían ese waypoint quedan con un hueco.
      // En F3 se decidirá la política exacta (avisar o limpiar).
      // De momento, no se tocan las rutas aquí.
    }));
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