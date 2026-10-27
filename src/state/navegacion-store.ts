// src/state/navegacion-store.ts
// WKF — Estado en memoria de la capa de navegación.
// WKF1.054: cajas del sistema (WKF Waypoints, WKF Rutas, WKF Fav)
// + favoritos como espejo, + visible/oculto por elemento.
// WKF1.061: Bug 1 - crear rutas manuales + Bug 3 - WKF Fav vacío.
// WKF1.063: Añadidas acciones para mover, duplicar y exportar elementos.
// WKF1.065: Espejo de puntos de predicción (spots) en WKF Fav.
//   sincronizarWaypointSpot / eliminarWaypointSpot.
// WKF1.067: orden manual para cajas, capas y elementos.
//   moverArriba / moverAbajo ahora aceptan:
//     · carpeta / bloque (orden de cajas)
//     · capa (orden de capas dentro de bloque)
//     · elemento (orden dentro de su contenedor: WKF Waypoints,
//       WKF Rutas, caja manual; o dentro de su capa si es de capa).

import { create } from 'zustand';
import {
  listarWaypoints,
  crearWaypoint as repoCrearWaypoint,
  actualizarWaypoint as repoActualizarWaypoint,
  borrarWaypoint as repoBorrarWaypoint,
  type Waypoint,
} from '../db/waypoints-repo.ts';
import {
  listarCarpetas,
  crearCarpeta as repoCrearCarpeta,
  actualizarCarpeta as repoActualizarCarpeta,
  borrarCarpeta as repoBorrarCarpeta,
  type Carpeta,
} from '../db/carpetas-repo.ts';
import {
  listarRutas,
  crearRuta as repoCrearRuta,
  actualizarRuta as repoActualizarRuta,
  borrarRuta as repoBorrarRuta,
  type Ruta,
} from '../db/rutas-repo.ts';
import {
  listarBloques,
  obtenerBloque,
  crearBloque as repoCrearBloque,
  borrarBloque as repoBorrarBloque,
  borrarElementoCapa as repoBorrarElementoCapa,
  alternarVisibilidadCapa as repoAlternarVisibilidadCapa,
  alternarVisibilidadElemento as repoAlternarVisibilidadElemento,
  alternarFavoritoElemento as repoAlternarFavoritoElemento,
  actualizarBloque as repoActualizarBloque,
  actualizarVertice as repoActualizarVertice,
  cambiarColorCapa as repoCambiarColorCapa,
  cambiarColorBloque as repoCambiarColorBloque,
  cambiarColorElemento as repoCambiarColorElemento,
  renombrarCapa as repoRenombrarCapa,
  renombrarElementoCapa as repoRenombrarElementoCapa,
  duplicarElementoCapa as repoDuplicarElementoCapa,
  restaurarColoresWKFTodos as repoRestaurarColoresWKFTodos,
  type BloqueCapas,
} from '../db/capas-repo.ts';
import {
  listarTracks,
  crearTrack as repoCrearTrack,
  actualizarTrack as repoActualizarTrack,
  borrarTrack as repoBorrarTrack,
  type Track,
  type PuntoTrack,
} from '../db/tracks-repo.ts';
import { distanciaHaversine } from '../lib/navegacion/bearing.ts';
import { useAppStore, type AjustesApp } from './store.ts';

export type DensidadTrack = AjustesApp['densidadWaypointsTrack'];

export const DENSIDAD_TRACK_METROS: Record<DensidadTrack, number> = {
  preciso: 25,
  fino: 50,
  normal: 100,
  ancho: 200,
  largo: 500,
  muy_largo: 1000,
};

export const WKF_WAYPOINTS_ID = 'carp-wkf-waypoints';
export const WKF_RUTAS_ID = 'carp-wkf-rutas';
export const WKF_FAV_ID = 'carp-wkf-fav';

export const CAJAS_SISTEMA: Carpeta[] = [
  {
    id: WKF_WAYPOINTS_ID,
    nombre: 'WKF Waypoints',
    creadoEn: 0,
    color: '#00E56A',
  },
  { id: WKF_RUTAS_ID, nombre: 'WKF Rutas', creadoEn: 0, color: '#00B8FF' },
  { id: WKF_FAV_ID, nombre: 'WKF Fav', creadoEn: 0, color: '#FFD400' },
];

export function esCajaSistema(id?: string): boolean {
  return (
    id === WKF_WAYPOINTS_ID || id === WKF_RUTAS_ID || id === WKF_FAV_ID
  );
}

export function calcularWaypointsDesdeTrack(
  puntos: PuntoTrack[],
  densidadM: number
): PuntoTrack[] {
  if (!Array.isArray(puntos) || puntos.length === 0) return [];
  if (puntos.length === 1) return [puntos[0]];

  const min = Math.max(1, densidadM);
  const salida: PuntoTrack[] = [puntos[0]];
  let ultimo = puntos[0];

  for (let i = 1; i < puntos.length; i++) {
    const p = puntos[i];
    const d = distanciaHaversine(ultimo.lat, ultimo.lon, p.lat, p.lon);
    if (d >= min) {
      salida.push(p);
      ultimo = p;
    }
  }

  const ultimoOriginal = puntos[puntos.length - 1];
  const ultimoSalida = salida[salida.length - 1];
  if (
    ultimoSalida.lat !== ultimoOriginal.lat ||
    ultimoSalida.lon !== ultimoOriginal.lon
  ) {
    salida.push(ultimoOriginal);
  }

  return salida;
}

export interface ResumenImportacion {
  waypointsImportados: number;
  rutasImportadas: number;
  bloquesImportados: number;
  descartados: number;
  duplicado: boolean;
}

export interface DatosSpotEspejo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  waypointFavId?: string;
}

export type TipoSeleccionOrden =
  | 'carpeta'
  | 'bloque'
  | 'capa'
  | 'waypoint'
  | 'ruta'
  | 'track'
  | 'elemento-capa';

interface NavegacionState {
  waypoints: Waypoint[];
  carpetas: Carpeta[];
  rutas: Ruta[];
  bloquesCapas: BloqueCapas[];
  tracks: Track[];

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

  crearCarpeta: (nombre: string, color?: string) => Promise<Carpeta>;
  renombrarCarpeta: (id: string, nombre: string) => Promise<void>;
  cambiarColorCarpeta: (id: string, color?: string) => Promise<void>;
  borrarCarpeta: (id: string) => Promise<void>;
  moverWaypointACarpeta: (wpId: string, carpetaId?: string) => Promise<void>;
  moverRutaACarpeta: (rutaId: string, carpetaId?: string) => Promise<void>;
  alternarFavoritoWaypoint: (id: string) => Promise<void>;
  alternarVisibleWaypoint: (id: string) => Promise<void>;
  alternarFavoritoRuta: (id: string) => Promise<void>;
  alternarVisibleRuta: (id: string) => Promise<void>;
  alternarFavoritoTrack: (id: string) => Promise<void>;
  alternarVisibleTrack: (id: string) => Promise<void>;
  alternarFavoritoBloque: (bloqueId: string) => Promise<void>;
  alternarVisibleElemento: (
    bloqueId: string,
    capaId: string,
    elementoId: string,
    visible: boolean
  ) => Promise<void>;
  alternarFavoritoElemento: (
    bloqueId: string,
    capaId: string,
    elementoId: string
  ) => Promise<void>;

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
  alternarVisibilidadBloque: (
    bloqueId: string,
    visible: boolean
  ) => Promise<void>;
  recargarBloques: () => Promise<void>;

  importarBloque: (bloque: Omit<BloqueCapas, 'id'>) => Promise<BloqueCapas>;

  cambiarColorCapa: (
    bloqueId: string,
    capaId: string,
    color: string | null
  ) => Promise<void>;
  renombrarBloque: (id: string, nombre: string) => Promise<void>;
  renombrarCapa: (bloqueId: string, capaId: string, nombre: string) => Promise<void>;
  cambiarColorBloque: (bloqueId: string, color: string | null) => Promise<void>;
  cambiarColorElemento: (bloqueId: string, capaId: string, elementoId: string, color: string | null) => Promise<void>;

  restaurarColoresWKF: () => Promise<void>;

  actualizarVerticeElemento: (
    bloqueId: string,
    capaId: string,
    elementoId: string,
    indiceVertice: number,
    lat: number,
    lon: number
  ) => Promise<void>;

  recargarTracks: () => Promise<void>;
  borrarTrack: (id: string) => Promise<void>;
  actualizarTrack: (id: string, patch: { nombre?: string }) => Promise<void>;
  crearTrackDesdeGrabacion: (
    nombre: string,
    puntos: PuntoTrack[]
  ) => Promise<Track>;
  convertirTrackEnRuta: (trackId: string, nombreRuta?: string) => Promise<Ruta | null>;

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

  duplicarWaypoint: (id: string) => Promise<Waypoint | null>;
  duplicarRuta: (id: string) => Promise<Ruta | null>;
  duplicarTrack: (id: string) => Promise<Track | null>;
  duplicarElementoCapa: (bloqueId: string, capaId: string, elementoId: string) => Promise<void>;
  renombrarElementoCapa: (bloqueId: string, capaId: string, elementoId: string, nombre: string) => Promise<void>;
  exportarWaypoint: (id: string) => Promise<void>;
  exportarRuta: (id: string) => Promise<void>;
  exportarTrack: (id: string) => Promise<void>;
  exportarElementoCapa: (bloqueId: string, capaId: string, elementoId: string) => Promise<void>;

  moverArriba: (
    tipo: TipoSeleccionOrden,
    payload: {
      id: string;
      bloqueId?: string;
      capaId?: string;
    }
  ) => Promise<void>;
  moverAbajo: (
    tipo: TipoSeleccionOrden,
    payload: {
      id: string;
      bloqueId?: string;
      capaId?: string;
    }
  ) => Promise<void>;

  setNoClicable: (
    tipo: 'carpeta' | 'bloque' | 'capa' | 'elemento' | 'waypoint' | 'ruta' | 'track',
    payload: {
      id: string;
      bloqueId?: string;
      capaId?: string;
      elementoId?: string;
      valor: boolean;
    }
  ) => Promise<void>;
  moverElementoACaja: (
    tipo: 'waypoint' | 'ruta' | 'track',
    id: string,
    carpetaDestinoId: string
  ) => Promise<void>;
  extraerDesdeBloque: (
    bloqueId: string,
    capaId: string,
    elementoId: string
  ) => Promise<void>;
  exportarCaja: (tipo: 'carpeta' | 'bloque', id: string) => Promise<void>;
  borrarElementoCapa: (bloqueId: string, capaId: string, elementoId: string) => Promise<void>;

  // WKF1.065: espejo de puntos de predicción (spots) en WKF Fav.
  sincronizarWaypointSpot: (spot: DatosSpotEspejo) => Promise<string | null>;
  eliminarWaypointSpot: (waypointId: string | undefined) => Promise<void>;
}

function sinExtension(nombre: string, formato: string): string {
  const ext = formato.toLowerCase();
  const n = nombre.toLowerCase().trim();
  if (n.endsWith(`.${ext}`)) {
    return n.slice(0, -(ext.length + 1));
  }
  return n;
}

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

function ordenEfectivo(orden: number | undefined, fallback: number): number {
  return orden !== undefined ? orden : fallback;
}

export const useNavegacionStore = create<NavegacionState>((set, get) => ({
  waypoints: [],
  carpetas: [],
  rutas: [],
  bloquesCapas: [],
  tracks: [],
  cargado: false,
  cargando: false,
  error: null,

  cargar: async () => {
    if (get().cargando) return;
    set({ cargando: true, error: null });
    try {
      const [waypoints, carpetas, rutas, bloquesCapas, tracks] = await Promise.all([
        listarWaypoints(),
        listarCarpetas(),
        listarRutas(),
        listarBloques(),
        listarTracks(),
      ]);
      set({
        waypoints,
        carpetas,
        rutas,
        bloquesCapas,
        tracks,
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
    const datosFinal = {
      carpetaId:
        datos.carpetaId && !esCajaSistema(datos.carpetaId)
          ? datos.carpetaId
          : WKF_WAYPOINTS_ID,
      ...datos,
    };
    const w = await repoCrearWaypoint(datosFinal);
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

  crearCarpeta: async (nombre, color) => {
    const c = await repoCrearCarpeta({ nombre, color });
    set((state) => ({ carpetas: [...state.carpetas, c] }));
    return c;
  },

  renombrarCarpeta: async (id, nombre) => {
    if (esCajaSistema(id)) return;
    const actualizada = await repoActualizarCarpeta(id, { nombre });
    if (!actualizada) return;
    set((state) => ({
      carpetas: state.carpetas.map((c) => (c.id === id ? actualizada : c)),
    }));
  },

  cambiarColorCarpeta: async (id, color) => {
    if (esCajaSistema(id)) return;
    const actualizada = await repoActualizarCarpeta(id, { color });
    if (!actualizada) return;
    set((state) => ({
      carpetas: state.carpetas.map((c) => (c.id === id ? actualizada : c)),
    }));
  },

  borrarCarpeta: async (id) => {
    if (esCajaSistema(id)) return;
    await repoBorrarCarpeta(id);
    const waypointsAfectados = get().waypoints.filter((w) => w.carpetaId === id);
    for (const wp of waypointsAfectados) {
      await repoActualizarWaypoint(wp.id, { carpetaId: WKF_WAYPOINTS_ID });
    }

    set((state) => ({
      carpetas: state.carpetas.filter((c) => c.id !== id),
      waypoints: state.waypoints.map((w) =>
        w.carpetaId === id ? { ...w, carpetaId: WKF_WAYPOINTS_ID } : w
      ),
    }));
  },

  moverWaypointACarpeta: async (wpId, carpetaId) => {
    const actualizado = await repoActualizarWaypoint(wpId, { carpetaId });
    if (!actualizado) return;
    set((state) => ({
      waypoints: state.waypoints.map((w) => (w.id === wpId ? actualizado : w)),
    }));
  },

  moverRutaACarpeta: async (_rutaId, _carpetaId) => {
    // Reservado para Fase 2. Las rutas no llevan carpetaId en el modelo
    // todavía; caen todas a WKF Rutas.
  },

  alternarFavoritoWaypoint: async (id) => {
    const wp = get().waypoints.find((w) => w.id === id);
    if (!wp) return;
    const nuevo = !wp.favorito;
    const actualizado = await repoActualizarWaypoint(id, { favorito: nuevo });
    if (!actualizado) return;
    set((state) => ({
      waypoints: state.waypoints.map((w) => (w.id === id ? actualizado : w)),
    }));
  },

  alternarVisibleWaypoint: async (id) => {
    const wp = get().waypoints.find((w) => w.id === id);
    if (!wp) return;
    const nuevo = !(wp.visible ?? true);
    const actualizado = await repoActualizarWaypoint(id, { visible: nuevo });
    if (!actualizado) return;
    set((state) => ({
      waypoints: state.waypoints.map((w) => (w.id === id ? actualizado : w)),
    }));
  },

  alternarFavoritoRuta: async (id) => {
    const r = get().rutas.find((x) => x.id === id);
    if (!r) return;
    const nuevo = !r.favorito;
    const actualizada = await repoActualizarRuta(id, { favorito: nuevo });
    if (!actualizada) return;
    set((state) => ({
      rutas: state.rutas.map((x) => (x.id === id ? actualizada : x)),
    }));
  },

  alternarVisibleRuta: async (id) => {
    const r = get().rutas.find((x) => x.id === id);
    if (!r) return;
    const nuevo = !(r.visible ?? true);
    const actualizada = await repoActualizarRuta(id, { visible: nuevo });
    if (!actualizada) return;
    set((state) => ({
      rutas: state.rutas.map((x) => (x.id === id ? actualizada : x)),
    }));
  },

  alternarFavoritoTrack: async (id) => {
    const t = get().tracks.find((x) => x.id === id);
    if (!t) return;
    const nuevo = !t.favorito;
    const actualizado = await repoActualizarTrack(id, { favorito: nuevo });
    if (!actualizado) return;
    set((state) => ({
      tracks: state.tracks.map((x) => (x.id === id ? actualizado : x)),
    }));
  },

  alternarVisibleTrack: async (id) => {
    const t = get().tracks.find((x) => x.id === id);
    if (!t) return;
    const nuevo = !(t.visible ?? true);
    const actualizado = await repoActualizarTrack(id, { visible: nuevo });
    if (!actualizado) return;
    set((state) => ({
      tracks: state.tracks.map((x) => (x.id === id ? actualizado : x)),
    }));
  },

  alternarFavoritoBloque: async (bloqueId) => {
    const b = get().bloquesCapas.find((x) => x.id === bloqueId);
    if (!b) return;
    const nuevo = !b.favorito;
    const actualizado = await repoActualizarBloque(bloqueId, { favorito: nuevo });
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((x) =>
        x.id === bloqueId ? actualizado : x
      ),
    }));
  },

  alternarVisibleElemento: async (bloqueId, capaId, elementoId, visible) => {
    const actualizado = await repoAlternarVisibilidadElemento(
      bloqueId,
      capaId,
      elementoId,
      visible
    );
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  alternarFavoritoElemento: async (bloqueId, capaId, elementoId) => {
    const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
    if (!bloque) return;
    const capa = bloque.capas.find((c) => c.id === capaId);
    if (!capa) return;
    const el = capa.elementos.find((e) => e.id === elementoId);
    if (!el) return;
    const nuevo = !el.favorito;
    const actualizado = await repoAlternarFavoritoElemento(
      bloqueId,
      capaId,
      elementoId,
      nuevo
    );
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
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

  importarBloque: async (bloque) => {
    const creado = await repoCrearBloque({
      nombre: bloque.nombre,
      formato: bloque.formato,
      capas: bloque.capas,
    });
    set((state) => ({ bloquesCapas: [...state.bloquesCapas, creado] }));
    return creado;
  },

  cambiarColorCapa: async (bloqueId, capaId, color) => {
    const actualizado = await repoCambiarColorCapa(bloqueId, capaId, color);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  renombrarBloque: async (id, nombre) => {
    const limpio = nombre.trim();
    if (!limpio) return;
    const actualizado = await repoActualizarBloque(id, { nombre: limpio });
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === id ? actualizado : b
      ),
    }));
  },

  renombrarCapa: async (bloqueId, capaId, nombre) => {
    const actualizado = await repoRenombrarCapa(bloqueId, capaId, nombre);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  cambiarColorBloque: async (bloqueId, color) => {
    const actualizado = await repoCambiarColorBloque(bloqueId, color);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  cambiarColorElemento: async (bloqueId, capaId, elementoId, color) => {
    const actualizado = await repoCambiarColorElemento(
      bloqueId,
      capaId,
      elementoId,
      color
    );
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  restaurarColoresWKF: async () => {
    const actualizados = await repoRestaurarColoresWKFTodos();
    const mapa = new Map(actualizados.map((b) => [b.id, b]));
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) => mapa.get(b.id) ?? b),
    }));
  },

  actualizarVerticeElemento: async (
    bloqueId,
    capaId,
    elementoId,
    indiceVertice,
    lat,
    lon
  ) => {
    const actualizado = await repoActualizarVertice(
      bloqueId,
      capaId,
      elementoId,
      indiceVertice,
      lat,
      lon
    );
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

  recargarTracks: async () => {
    const tracks = await listarTracks();
    set({ tracks });
  },

  borrarTrack: async (id) => {
    await repoBorrarTrack(id);
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
    }));
  },

  actualizarTrack: async (id, patch) => {
    const actualizado = await repoActualizarTrack(id, patch);
    if (!actualizado) return;
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? actualizado : t)),
    }));
  },

  crearTrackDesdeGrabacion: async (nombre, puntos) => {
    if (!Array.isArray(puntos) || puntos.length < 2) {
      throw new Error('Track con menos de 2 puntos');
    }
    const track = await repoCrearTrack({
      nombre,
      puntos,
      origen: 'grabado',
    });
    set((state) => ({ tracks: [...state.tracks, track] }));
    return track;
  },

  convertirTrackEnRuta: async (trackId, nombreRuta) => {
    const track = get().tracks.find((t) => t.id === trackId);
    if (!track) return null;
    if (!Array.isArray(track.puntos) || track.puntos.length < 2) return null;

    const densidadClave = useAppStore.getState().ajustes.densidadWaypointsTrack;
    const densidadM = DENSIDAD_TRACK_METROS[densidadClave] ?? 100;

    const puntosFiltrados = calcularWaypointsDesdeTrack(track.puntos, densidadM);
    if (puntosFiltrados.length < 2) return null;

    const idsWaypoints: string[] = [];
    const prefijo = track.nombre.slice(0, 20);
    let contador = 1;
    for (const p of puntosFiltrados) {
      try {
        const wp = await repoCrearWaypoint({
          nombre: `${prefijo} #${contador}`,
          lat: p.lat,
          lon: p.lon,
          carpetaId: WKF_RUTAS_ID,
        });
        idsWaypoints.push(wp.id);
      } catch (err) {
        console.error('Error creando waypoint desde track', err);
      }
      contador++;
    }

    if (idsWaypoints.length < 2) return null;

    const nombreFinal = (nombreRuta && nombreRuta.trim()) || `Track: ${track.nombre}`;
    const ruta = await repoCrearRuta({
      nombre: nombreFinal,
      waypointIds: idsWaypoints,
      origen: 'track',
    });

    const trackActualizado = await repoActualizarTrack(trackId, {
      rutaId: ruta.id,
    });

    set((state) => ({
      rutas: [...state.rutas, ruta],
      tracks: state.tracks.map((t) =>
        t.id === trackId && trackActualizado ? trackActualizado : t
      ),
    }));

    try {
      const [waypoints, rutas] = await Promise.all([
        listarWaypoints(),
        listarRutas(),
      ]);
      set({ waypoints, rutas });
    } catch (err) {
      console.error('Error refrescando tras convertir track en ruta', err);
    }

    return ruta;
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
          carpetaId: WKF_WAYPOINTS_ID,
          visible: true,
          favorito: false,
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

  // ─── Nuevas acciones para mover / duplicar / exportar ───────────────────

  duplicarWaypoint: async (id) => {
    const wp = get().waypoints.find((w) => w.id === id);
    if (!wp) return null;
    const nuevo = await repoCrearWaypoint({
      nombre: `${wp.nombre} (copia)`,
      lat: wp.lat,
      lon: wp.lon,
      nota: wp.nota,
      carpetaId: wp.carpetaId,
      color: wp.color,
    });
    set((state) => ({ waypoints: [...state.waypoints, nuevo] }));
    return nuevo;
  },

  exportarWaypoint: async (id) => {
    const wp = get().waypoints.find((w) => w.id === id);
    if (!wp) return;
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="${wp.lat}" lon="${wp.lon}">
    <name>${wp.nombre}</name>
    ${wp.nota ? `<desc>${wp.nota}</desc>` : ''}
  </wpt>
</gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wp.nombre}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportarRuta: async (id) => {
    const ruta = get().rutas.find((r) => r.id === id);
    if (!ruta) return;
    const wps = ruta.waypointIds
      .map((wid) => get().waypoints.find((w) => w.id === wid))
      .filter((w): w is Waypoint => w != null);
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>${ruta.nombre}</name>
    ${wps.map((w) => `<rtept lat="${w.lat}" lon="${w.lon}"><name>${w.nombre}</name></rtept>`).join('\n    ')}
  </rte>
</gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ruta.nombre}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportarTrack: async (id) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track) return;
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${track.nombre}</name>
    <trkseg>
      ${track.puntos.map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`).join('\n      ')}
    </trkseg>
  </trk>
</gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.nombre}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportarElementoCapa: async (bloqueId, capaId, elementoId) => {
    const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
    if (!bloque) return;
    const capa = bloque.capas.find((c) => c.id === capaId);
    if (!capa) return;
    const el = capa.elementos.find((e) => e.id === elementoId);
    if (!el) return;
    const json = JSON.stringify(el, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${el.nombre || 'elemento'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  duplicarRuta: async (id) => {
    const ruta = get().rutas.find((r) => r.id === id);
    if (!ruta) return null;
    const nueva = await repoCrearRuta({
      nombre: `${ruta.nombre} (copia)`,
      waypointIds: [...ruta.waypointIds],
      nota: ruta.nota,
      origen: ruta.origen,
    });
    set((state) => ({ rutas: [...state.rutas, nueva] }));
    return nueva;
  },

  duplicarTrack: async (id) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track) return null;
    const nuevo = await repoCrearTrack({
      nombre: `${track.nombre} (copia)`,
      puntos: track.puntos,
      origen: track.origen,
    });
    set((state) => ({ tracks: [...state.tracks, nuevo] }));
    return nuevo;
  },

  duplicarElementoCapa: async (bloqueId, capaId, elementoId) => {
    const actualizado = await repoDuplicarElementoCapa(bloqueId, capaId, elementoId);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) => (b.id === bloqueId ? actualizado : b)),
    }));
  },

  renombrarElementoCapa: async (bloqueId, capaId, elementoId, nombre) => {
    const limpio = nombre.trim();
    if (!limpio) return;
    const actualizado = await repoRenombrarElementoCapa(bloqueId, capaId, elementoId, limpio);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) => (b.id === bloqueId ? actualizado : b)),
    }));
  },

  // ─── Orden manual: cajas, capas y elementos ────────────────────────────

  moverArriba: async (tipo, payload) => {
    if (tipo === 'carpeta' || tipo === 'bloque') {
      await moverCaja(tipo, payload.id, -1, set, get);
      return;
    }
    if (tipo === 'capa') {
      if (!payload.bloqueId) return;
      await moverCapa(payload.bloqueId, payload.id, -1, set, get);
      return;
    }
    if (tipo === 'waypoint' || tipo === 'ruta' || tipo === 'track') {
      await moverElementoLista(tipo, payload.id, -1, set, get);
      return;
    }
    if (tipo === 'elemento-capa') {
      if (!payload.bloqueId || !payload.capaId) return;
      await moverElementoCapa(payload.bloqueId, payload.capaId, payload.id, -1, set, get);
      return;
    }
  },

  moverAbajo: async (tipo, payload) => {
    if (tipo === 'carpeta' || tipo === 'bloque') {
      await moverCaja(tipo, payload.id, 1, set, get);
      return;
    }
    if (tipo === 'capa') {
      if (!payload.bloqueId) return;
      await moverCapa(payload.bloqueId, payload.id, 1, set, get);
      return;
    }
    if (tipo === 'waypoint' || tipo === 'ruta' || tipo === 'track') {
      await moverElementoLista(tipo, payload.id, 1, set, get);
      return;
    }
    if (tipo === 'elemento-capa') {
      if (!payload.bloqueId || !payload.capaId) return;
      await moverElementoCapa(payload.bloqueId, payload.capaId, payload.id, 1, set, get);
      return;
    }
  },

  setNoClicable: async (tipo, payload) => {
    if (tipo === 'carpeta') {
      await repoActualizarCarpeta(payload.id, { noClicable: payload.valor });
      set((state) => ({
        carpetas: state.carpetas.map((c) =>
          c.id === payload.id ? { ...c, noClicable: payload.valor } : c
        ),
      }));
    } else if (tipo === 'bloque') {
      await repoActualizarBloque(payload.id, { noClicable: payload.valor });
      set((state) => ({
        bloquesCapas: state.bloquesCapas.map((b) =>
          b.id === payload.id ? { ...b, noClicable: payload.valor } : b
        ),
      }));
    } else if (tipo === 'capa') {
      if (!payload.bloqueId) return;
      const bloque = await obtenerBloque(payload.bloqueId);
      if (!bloque) return;
      const capasActualizadas = bloque.capas.map((c) =>
        c.id === payload.capaId ? { ...c, noClicable: payload.valor } : c
      );
      await repoActualizarBloque(payload.bloqueId, { capas: capasActualizadas });
      set((state) => ({
        bloquesCapas: state.bloquesCapas.map((bl) =>
          bl.id === payload.bloqueId ? { ...bl, capas: capasActualizadas } : bl
        ),
      }));
    } else if (tipo === 'elemento') {
      if (!payload.bloqueId) return;
      const bloque = await obtenerBloque(payload.bloqueId);
      if (!bloque) return;
      const capasActualizadas = bloque.capas.map((c) =>
        c.id === payload.capaId
          ? {
              ...c,
              elementos: c.elementos.map((el) =>
                el.id === payload.elementoId
                  ? { ...el, noClicable: payload.valor }
                  : el
              ),
            }
          : c
      );
      await repoActualizarBloque(payload.bloqueId, { capas: capasActualizadas });
      set((state) => ({
        bloquesCapas: state.bloquesCapas.map((bl) =>
          bl.id === payload.bloqueId ? { ...bl, capas: capasActualizadas } : bl
        ),
      }));
    } else if (tipo === 'waypoint') {
      await repoActualizarWaypoint(payload.id, { noClicable: payload.valor });
      set((state) => ({
        waypoints: state.waypoints.map((w) =>
          w.id === payload.id ? { ...w, noClicable: payload.valor } : w
        ),
      }));
    } else if (tipo === 'ruta') {
      await repoActualizarRuta(payload.id, { noClicable: payload.valor });
      set((state) => ({
        rutas: state.rutas.map((r) =>
          r.id === payload.id ? { ...r, noClicable: payload.valor } : r
        ),
      }));
    } else if (tipo === 'track') {
      await repoActualizarTrack(payload.id, { noClicable: payload.valor });
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === payload.id ? { ...t, noClicable: payload.valor } : t
        ),
      }));
    }
  },

  moverElementoACaja: async (tipo, id, carpetaDestinoId) => {
    if (esCajaSistema(carpetaDestinoId)) return;
    if (tipo === 'waypoint') {
      await repoActualizarWaypoint(id, { carpetaId: carpetaDestinoId });
      set((state) => ({
        waypoints: state.waypoints.map((w) =>
          w.id === id ? { ...w, carpetaId: carpetaDestinoId } : w
        ),
      }));
    } else if (tipo === 'ruta') {
      await repoActualizarRuta(id, { carpetaId: carpetaDestinoId });
      set((state) => ({
        rutas: state.rutas.map((r) =>
          r.id === id ? { ...r, carpetaId: carpetaDestinoId } : r
        ),
      }));
    } else if (tipo === 'track') {
      await repoActualizarTrack(id, { carpetaId: carpetaDestinoId });
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, carpetaId: carpetaDestinoId } : t
        ),
      }));
    }
  },

  extraerDesdeBloque: async (bloqueId, capaId, elementoId) => {
    const bloque = await obtenerBloque(bloqueId);
    if (!bloque) return;
    const capa = bloque.capas.find((c) => c.id === capaId);
    if (!capa) return;
    const elementoOriginal = capa.elementos.find((e) => e.id === elementoId);
    if (!elementoOriginal) return;

    const nuevoIdEl = `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let nuevoBloque = await repoCrearBloque({
      nombre: `Extraído de ${bloque.nombre}`,
      formato: bloque.formato,
      capas: [
        {
          nombre: capa.nombre,
          visible: true,
          elementos: [{ ...elementoOriginal, id: nuevoIdEl }],
        },
      ],
    });

    if (elementoOriginal.favorito === true) {
      const actualizado = await repoActualizarBloque(nuevoBloque.id, { favorito: true });
      if (actualizado) {
        nuevoBloque = actualizado;
      } else {
        nuevoBloque = { ...nuevoBloque, favorito: true };
      }
    }

    set((state) => ({
      bloquesCapas: [...state.bloquesCapas, nuevoBloque],
    }));
  },

  exportarCaja: async (tipo, id) => {
    const descargarBlob = (contenido: string, tipoMime: string, nombreArchivo: string) => {
      const blob = new Blob([contenido], { type: tipoMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      a.click();
      URL.revokeObjectURL(url);
    };

    if (tipo === 'carpeta') {
      if (id === WKF_WAYPOINTS_ID) {
        const wps = get().waypoints.filter((w) => w.carpetaId === WKF_WAYPOINTS_ID);
        const wptsXml = wps
          .map(
            (w) => `  <wpt lat="${w.lat}" lon="${w.lon}">
    <name>${w.nombre}</name>${w.nota ? `\n    <desc>${w.nota}</desc>` : ''}
  </wpt>`
          )
          .join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${wptsXml}
</gpx>`;
        descargarBlob(gpx, 'application/gpx+xml', 'WKF Waypoints.gpx');
      } else if (id === WKF_RUTAS_ID) {
        const rutas = get().rutas;
        const tracks = get().tracks;
        const allWaypoints = get().waypoints;
        const rtesXml = rutas
          .map((r) => {
            const wps = r.waypointIds
              .map((wid) => allWaypoints.find((w) => w.id === wid))
              .filter((w): w is Waypoint => w != null);
            return `  <rte>
    <name>${r.nombre}</name>
    ${wps.map((w) => `<rtept lat="${w.lat}" lon="${w.lon}"><name>${w.nombre}</name></rtept>`).join('\n    ')}
  </rte>`;
          })
          .join('\n');
        const trksXml = tracks
          .map(
            (t) => `  <trk>
    <name>${t.nombre}</name>
    <trkseg>
      ${t.puntos.map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`).join('\n      ')}
    </trkseg>
  </trk>`
          )
          .join('\n');
        const partesXml = [rtesXml, trksXml].filter(Boolean).join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${partesXml}
</gpx>`;
        descargarBlob(gpx, 'application/gpx+xml', 'WKF Rutas.gpx');
      } else if (id === WKF_FAV_ID) {
        const waypointsFav = get().waypoints.filter((w) => w.favorito === true);
        const rutasFav = get().rutas.filter((r) => r.favorito === true);
        const tracksFav = get().tracks.filter((t) => t.favorito === true);
        const allWaypoints = get().waypoints;

        const wptsXml = waypointsFav
          .map(
            (w) => `  <wpt lat="${w.lat}" lon="${w.lon}">
    <name>${w.nombre}</name>${w.nota ? `\n    <desc>${w.nota}</desc>` : ''}
  </wpt>`
          )
          .join('\n');
        const rtesXml = rutasFav
          .map((r) => {
            const wps = r.waypointIds
              .map((wid) => allWaypoints.find((w) => w.id === wid))
              .filter((w): w is Waypoint => w != null);
            return `  <rte>
    <name>${r.nombre}</name>
    ${wps.map((w) => `<rtept lat="${w.lat}" lon="${w.lon}"><name>${w.nombre}</name></rtept>`).join('\n    ')}
  </rte>`;
          })
          .join('\n');
        const trksXml = tracksFav
          .map(
            (t) => `  <trk>
    <name>${t.nombre}</name>
    <trkseg>
      ${t.puntos.map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`).join('\n      ')}
    </trkseg>
  </trk>`
          )
          .join('\n');

        const partesXml = [wptsXml, rtesXml, trksXml].filter(Boolean).join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${partesXml}
</gpx>`;
        descargarBlob(gpx, 'application/gpx+xml', 'WKF Fav.gpx');
      } else {
        const carpeta = get().carpetas.find((c) => c.id === id);
        if (!carpeta) return;
        const waypoints = get().waypoints.filter((w) => w.carpetaId === id);
        const wptsXml = waypoints
          .map(
            (w) => `  <wpt lat="${w.lat}" lon="${w.lon}">
    <name>${w.nombre}</name>${w.nota ? `\n    <desc>${w.nota}</desc>` : ''}
  </wpt>`
          )
          .join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${wptsXml}
</gpx>`;
        descargarBlob(gpx, 'application/gpx+xml', `${carpeta.nombre}.gpx`);
      }
    } else if (tipo === 'bloque') {
      const bloque = get().bloquesCapas.find((b) => b.id === id);
      if (!bloque) return;
      const json = JSON.stringify(bloque, null, 2);
      descargarBlob(json, 'application/json', `${bloque.nombre}.json`);
    }
  },

  borrarElementoCapa: async (bloqueId, capaId, elementoId) => {
    const actualizado = await repoBorrarElementoCapa(bloqueId, capaId, elementoId);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) => (b.id === bloqueId ? actualizado : b)),
    }));
  },

  // ─── WKF1.065: espejo de puntos de predicción en WKF Fav ──────────────

  sincronizarWaypointSpot: async (spot) => {
    const { waypoints } = get();

    if (spot.waypointFavId) {
      const existente = waypoints.find((w) => w.id === spot.waypointFavId);
      if (existente) {
        const patch: Partial<Omit<Waypoint, 'id' | 'creadoEn'>> = {};
        if (existente.nombre !== spot.name) patch.nombre = spot.name;
        if (existente.lat !== spot.lat) patch.lat = spot.lat;
        if (existente.lon !== spot.lon) patch.lon = spot.lon;
        if (!existente.favorito) patch.favorito = true;
        if (!existente.carpetaId) patch.carpetaId = WKF_WAYPOINTS_ID;
        if (Object.keys(patch).length > 0) {
          const actualizado = await repoActualizarWaypoint(existente.id, patch);
          if (actualizado) {
            set((state) => ({
              waypoints: state.waypoints.map((w) =>
                w.id === actualizado.id ? actualizado : w
              ),
            }));
          }
        }
        return existente.id;
      }
    }

    const nuevo = await repoCrearWaypoint({
      nombre: spot.name,
      lat: spot.lat,
      lon: spot.lon,
      carpetaId: WKF_WAYPOINTS_ID,
      visible: true,
      favorito: true,
    });
    set((state) => ({ waypoints: [...state.waypoints, nuevo] }));
    return nuevo.id;
  },

  eliminarWaypointSpot: async (waypointId) => {
    if (!waypointId) return;
    const existe = get().waypoints.some((w) => w.id === waypointId);
    if (!existe) return;
    await repoBorrarWaypoint(waypointId);
    set((state) => ({
      waypoints: state.waypoints.filter((w) => w.id !== waypointId),
    }));
  },
}));

// ─── Helpers de orden (fuera del store, reciben set/get) ──────────────────

type SetFn = (
  partial:
    | Partial<NavegacionState>
    | ((state: NavegacionState) => Partial<NavegacionState>)
) => void;

type GetFn = () => NavegacionState;

async function moverCaja(
  tipo: 'carpeta' | 'bloque',
  id: string,
  direccion: -1 | 1,
  set: SetFn,
  get: GetFn
): Promise<void> {
  const carpetasManuales = get().carpetas.filter((c) => !esCajaSistema(c.id));
  const bloques = get().bloquesCapas;
  const base = Date.now();
  let contador = 0;

  const listaMezclada: Array<{
    tipo: 'carpeta' | 'bloque';
    id: string;
    ordenEfectivo: number;
  }> = [
    ...carpetasManuales.map((c) => ({
      tipo: 'carpeta' as const,
      id: c.id,
      ordenEfectivo: ordenEfectivo(c.orden, (c.creadoEn || base) + contador++),
    })),
    ...bloques.map((b) => ({
      tipo: 'bloque' as const,
      id: b.id,
      ordenEfectivo: ordenEfectivo(b.orden, (b.importadoEn || base) + contador++),
    })),
  ];

  listaMezclada.sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

  const idx = listaMezclada.findIndex((item) => item.tipo === tipo && item.id === id);
  if (idx < 0) return;
  const idxVecino = idx + direccion;
  if (idxVecino < 0 || idxVecino >= listaMezclada.length) return;

  const actual = listaMezclada[idx];
  const vecino = listaMezclada[idxVecino];

  let nuevoOrdenActual = vecino.ordenEfectivo;
  let nuevoOrdenVecino = actual.ordenEfectivo;
  if (nuevoOrdenActual === nuevoOrdenVecino) {
    nuevoOrdenActual = nuevoOrdenVecino + direccion;
  }

  if (actual.tipo === 'carpeta') {
    await repoActualizarCarpeta(actual.id, { orden: nuevoOrdenActual });
  } else {
    await repoActualizarBloque(actual.id, { orden: nuevoOrdenActual });
  }
  if (vecino.tipo === 'carpeta') {
    await repoActualizarCarpeta(vecino.id, { orden: nuevoOrdenVecino });
  } else {
    await repoActualizarBloque(vecino.id, { orden: nuevoOrdenVecino });
  }

  set((state) => ({
    carpetas: state.carpetas.map((c) =>
      c.id === actual.id && actual.tipo === 'carpeta'
        ? { ...c, orden: nuevoOrdenActual }
        : c.id === vecino.id && vecino.tipo === 'carpeta'
        ? { ...c, orden: nuevoOrdenVecino }
        : c
    ),
    bloquesCapas: state.bloquesCapas.map((b) =>
      b.id === actual.id && actual.tipo === 'bloque'
        ? { ...b, orden: nuevoOrdenActual }
        : b.id === vecino.id && vecino.tipo === 'bloque'
        ? { ...b, orden: nuevoOrdenVecino }
        : b
    ),
  }));
}

async function moverCapa(
  bloqueId: string,
  capaId: string,
  direccion: -1 | 1,
  set: SetFn,
  get: GetFn
): Promise<void> {
  const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
  if (!bloque) return;

  const capasOrdenadas = bloque.capas.map((c, idx) => ({
    capa: c,
    ordenEfectivo: ordenEfectivo(c.orden, idx),
  }));
  capasOrdenadas.sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

  const idx = capasOrdenadas.findIndex((x) => x.capa.id === capaId);
  if (idx < 0) return;
  const idxVecino = idx + direccion;
  if (idxVecino < 0 || idxVecino >= capasOrdenadas.length) return;

  const actual = capasOrdenadas[idx];
  const vecino = capasOrdenadas[idxVecino];

  let nuevoOrdenActual = vecino.ordenEfectivo;
  let nuevoOrdenVecino = actual.ordenEfectivo;
  if (nuevoOrdenActual === nuevoOrdenVecino) {
    nuevoOrdenActual = nuevoOrdenVecino + direccion;
  }

  const capasActualizadas = bloque.capas.map((c) => {
    if (c.id === actual.capa.id) return { ...c, orden: nuevoOrdenActual };
    if (c.id === vecino.capa.id) return { ...c, orden: nuevoOrdenVecino };
    return c;
  });

  const actualizado = await repoActualizarBloque(bloqueId, { capas: capasActualizadas });
  if (!actualizado) return;
  set((state) => ({
    bloquesCapas: state.bloquesCapas.map((b) =>
      b.id === bloqueId ? actualizado : b
    ),
  }));
}

async function moverElementoLista(
  tipo: 'waypoint' | 'ruta' | 'track',
  id: string,
  direccion: -1 | 1,
  set: SetFn,
  get: GetFn
): Promise<void> {
  // Determinar el contenedor del elemento.
  // Para waypoints: su carpetaId (o WKF_WAYPOINTS_ID).
  // Para rutas: su carpetaId (o WKF_RUTAS_ID).
  // Para tracks: su carpetaId (o WKF_RUTAS_ID).
  const state = get();
  let contenedorId: string;
  if (tipo === 'waypoint') {
    const w = state.waypoints.find((x) => x.id === id);
    if (!w) return;
    contenedorId = w.carpetaId || WKF_WAYPOINTS_ID;
  } else if (tipo === 'ruta') {
    const r = state.rutas.find((x) => x.id === id);
    if (!r) return;
    contenedorId = r.carpetaId || WKF_RUTAS_ID;
  } else {
    const t = state.tracks.find((x) => x.id === id);
    if (!t) return;
    contenedorId = t.carpetaId || WKF_RUTAS_ID;
  }

  type ItemLista = {
    tipo: 'waypoint' | 'ruta' | 'track';
    id: string;
    ordenEfectivo: number;
  };

  const items: ItemLista[] = [];

  const coincideCaja = (carpetaId: string | undefined, caja: string) => {
    if (caja === WKF_WAYPOINTS_ID) {
      return carpetaId === WKF_WAYPOINTS_ID || !carpetaId;
    }
    if (caja === WKF_RUTAS_ID) {
      return carpetaId === WKF_RUTAS_ID || !carpetaId;
    }
    return carpetaId === caja;
  };

  if (contenedorId === WKF_WAYPOINTS_ID) {
    state.waypoints.forEach((w, idx) => {
      if (coincideCaja(w.carpetaId, WKF_WAYPOINTS_ID)) {
        items.push({
          tipo: 'waypoint',
          id: w.id,
          ordenEfectivo: ordenEfectivo(w.orden, w.creadoEn ?? idx),
        });
      }
    });
  } else if (contenedorId === WKF_RUTAS_ID) {
    state.rutas.forEach((r, idx) => {
      if (coincideCaja(r.carpetaId, WKF_RUTAS_ID)) {
        items.push({
          tipo: 'ruta',
          id: r.id,
          ordenEfectivo: ordenEfectivo(r.orden, r.creadoEn ?? idx),
        });
      }
    });
    state.tracks.forEach((t, idx) => {
      if (coincideCaja(t.carpetaId, WKF_RUTAS_ID)) {
        items.push({
          tipo: 'track',
          id: t.id,
          ordenEfectivo: ordenEfectivo(t.orden, t.creadoEn ?? (state.rutas.length + idx)),
        });
      }
    });
  } else {
    // Caja manual: waypoints, rutas y tracks con carpetaId === contenedorId
    state.waypoints.forEach((w, idx) => {
      if (w.carpetaId === contenedorId) {
        items.push({
          tipo: 'waypoint',
          id: w.id,
          ordenEfectivo: ordenEfectivo(w.orden, w.creadoEn ?? idx),
        });
      }
    });
    state.rutas.forEach((r, idx) => {
      if (r.carpetaId === contenedorId) {
        items.push({
          tipo: 'ruta',
          id: r.id,
          ordenEfectivo: ordenEfectivo(r.orden, r.creadoEn ?? idx),
        });
      }
    });
    state.tracks.forEach((t, idx) => {
      if (t.carpetaId === contenedorId) {
        items.push({
          tipo: 'track',
          id: t.id,
          ordenEfectivo: ordenEfectivo(t.orden, t.creadoEn ?? idx),
        });
      }
    });
  }

  items.sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

  const idx = items.findIndex((x) => x.tipo === tipo && x.id === id);
  if (idx < 0) return;
  const idxVecino = idx + direccion;
  if (idxVecino < 0 || idxVecino >= items.length) return;

  const actual = items[idx];
  const vecino = items[idxVecino];

  let nuevoOrdenActual = vecino.ordenEfectivo;
  let nuevoOrdenVecino = actual.ordenEfectivo;
  if (nuevoOrdenActual === nuevoOrdenVecino) {
    nuevoOrdenActual = nuevoOrdenVecino + direccion;
  }

  const actualizarUno = async (
    item: ItemLista,
    orden: number
  ): Promise<void> => {
    if (item.tipo === 'waypoint') {
      await repoActualizarWaypoint(item.id, { orden });
    } else if (item.tipo === 'ruta') {
      await repoActualizarRuta(item.id, { orden });
    } else {
      await repoActualizarTrack(item.id, { orden });
    }
  };

  await actualizarUno(actual, nuevoOrdenActual);
  await actualizarUno(vecino, nuevoOrdenVecino);

  set((s) => ({
    waypoints: s.waypoints.map((w) => {
      if (actual.tipo === 'waypoint' && w.id === actual.id) {
        return { ...w, orden: nuevoOrdenActual };
      }
      if (vecino.tipo === 'waypoint' && w.id === vecino.id) {
        return { ...w, orden: nuevoOrdenVecino };
      }
      return w;
    }),
    rutas: s.rutas.map((r) => {
      if (actual.tipo === 'ruta' && r.id === actual.id) {
        return { ...r, orden: nuevoOrdenActual };
      }
      if (vecino.tipo === 'ruta' && r.id === vecino.id) {
        return { ...r, orden: nuevoOrdenVecino };
      }
      return r;
    }),
    tracks: s.tracks.map((t) => {
      if (actual.tipo === 'track' && t.id === actual.id) {
        return { ...t, orden: nuevoOrdenActual };
      }
      if (vecino.tipo === 'track' && t.id === vecino.id) {
        return { ...t, orden: nuevoOrdenVecino };
      }
      return t;
    }),
  }));
}

async function moverElementoCapa(
  bloqueId: string,
  capaId: string,
  elementoId: string,
  direccion: -1 | 1,
  set: SetFn,
  get: GetFn
): Promise<void> {
  const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
  if (!bloque) return;
  const capa = bloque.capas.find((c) => c.id === capaId);
  if (!capa) return;

  const lista = capa.elementos.map((el, idx) => ({
    el,
    ordenEfectivo: ordenEfectivo(el.orden, idx),
  }));
  lista.sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

  const idx = lista.findIndex((x) => x.el.id === elementoId);
  if (idx < 0) return;
  const idxVecino = idx + direccion;
  if (idxVecino < 0 || idxVecino >= lista.length) return;

  const actual = lista[idx];
  const vecino = lista[idxVecino];

  let nuevoOrdenActual = vecino.ordenEfectivo;
  let nuevoOrdenVecino = actual.ordenEfectivo;
  if (nuevoOrdenActual === nuevoOrdenVecino) {
    nuevoOrdenActual = nuevoOrdenVecino + direccion;
  }

  const elementosActualizados = capa.elementos.map((el) => {
    if (el.id === actual.el.id) return { ...el, orden: nuevoOrdenActual };
    if (el.id === vecino.el.id) return { ...el, orden: nuevoOrdenVecino };
    return el;
  });

  const capasActualizadas = bloque.capas.map((c) =>
    c.id === capaId ? { ...c, elementos: elementosActualizados } : c
  );

  const actualizado = await repoActualizarBloque(bloqueId, { capas: capasActualizadas });
  if (!actualizado) return;
  set((state) => ({
    bloquesCapas: state.bloquesCapas.map((b) =>
      b.id === bloqueId ? actualizado : b
    ),
  }));
}
// src/state/navegacion-store.ts