// src/state/navegacion-store.ts
// WKF — Estado en memoria de la capa de navegación.
// WKF1.054: cajas del sistema (WKF Waypoints, WKF Rutas, WKF Fav)
// + favoritos como espejo, + visible/oculto por elemento.
// WKF1.061: Bug 1 - crear rutas manuales + Bug 3 - WKF Fav vacío.

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
  crearBloque as repoCrearBloque,
  borrarBloque as repoBorrarBloque,
  alternarVisibilidadCapa as repoAlternarVisibilidadCapa,
  alternarVisibilidadElemento as repoAlternarVisibilidadElemento,
  alternarFavoritoElemento as repoAlternarFavoritoElemento,
  actualizarBloque as repoActualizarBloque,
  actualizarVertice as repoActualizarVertice,
  cambiarColorCapa as repoCambiarColorCapa,
  cambiarColorBloque as repoCambiarColorBloque,
  cambiarColorElemento as repoCambiarColorElemento,
  renombrarCapa as repoRenombrarCapa,
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
}));
// src/state/navegacion-store.ts