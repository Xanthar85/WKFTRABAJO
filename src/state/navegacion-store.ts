// src/state/navegacion-store.ts
// WKF — Estado en memoria de la capa de navegación.
// WKF1.073: cierre de bugs 3 y 3b de rutas.
// WKF1.083: color de rutas y tracks.
//   · Nuevas acciones cambiarColorRuta y cambiarColorTrack.
//   · crearTrackDesdeGrabacion guarda el track con color de WKF Rutas (#00B8FF).
//   · duplicarRuta y duplicarTrack arrastran el color de origen.
//   · crearRuta acepta `color` opcional (por si en el futuro se
//     crea desde UI con color).

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
  reordenarCarpetas as repoReordenarCarpetas,
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
  borrarElementoCapa as repoBorrarElementoCapa,
  borrarCapaSuelta as repoBorrarCapaSuelta,
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
  moverElementoEntreCapas as repoMoverElementoEntreCapas,
  reordenarCapas as repoReordenarCapas,
  reordenarElementosCapa as repoReordenarElementosCapa,
  type BloqueCapas,
  type Capa,
  type ElementoCapa,
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
import { guardarYCompartirArchivo } from '../lib/navegacion/exportar-archivo.ts';
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
    orden: 0,
  },
  { id: WKF_RUTAS_ID, nombre: 'WKF Rutas', creadoEn: 0, color: '#00B8FF', orden: 1 },
  { id: WKF_FAV_ID, nombre: 'WKF Fav', creadoEn: 0, color: '#FFD400', orden: 2 },
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

export interface ContenidoCaja {
  waypoints: number;
  rutas: number;
  tracks: number;
}

export type ElementoKind = 'waypoint' | 'ruta' | 'track';

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

  crearWaypoint: (datos: Omit<Waypoint, 'id' | 'creadoEn' | 'orden'>) => Promise<Waypoint>;
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
  contarContenidoCaja: (id: string) => ContenidoCaja;
  borrarCajaConContenido: (id: string) => Promise<void>;
  moverWaypointACarpeta: (wpId: string, carpetaId?: string) => Promise<void>;
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
    carpetaId?: string;
    color?: string;
  }) => Promise<Ruta>;
  actualizarRuta: (
    id: string,
    patch: Partial<Omit<Ruta, 'id' | 'creadoEn'>>
  ) => Promise<void>;
  borrarRuta: (id: string) => Promise<void>;
  cambiarColorRuta: (id: string, color: string | null) => Promise<void>;
  cambiarColorTrack: (id: string, color: string | null) => Promise<void>;

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
  exportarCapa: (bloqueId: string, capaId: string) => Promise<void>;

  moverArriba: (
    tipo: 'carpeta' | 'bloque' | 'capa' | 'elemento-capa' | 'elemento',
    id: string,
    opciones?: { bloqueId?: string; capaId?: string; cajaId?: string; elementoKind?: ElementoKind }
  ) => Promise<void>;
  moverAbajo: (
    tipo: 'carpeta' | 'bloque' | 'capa' | 'elemento-capa' | 'elemento',
    id: string,
    opciones?: { bloqueId?: string; capaId?: string; cajaId?: string; elementoKind?: ElementoKind }
  ) => Promise<void>;

  moverElementoACaja: (
    tipo: 'waypoint' | 'ruta' | 'track',
    id: string,
    carpetaDestinoId: string
  ) => Promise<void>;
  moverElementoCapa: (
    bloqueOrigenId: string,
    capaOrigenId: string,
    elementoId: string,
    bloqueDestinoId: string,
    capaDestinoId: string
  ) => Promise<void>;
  exportarCaja: (tipo: 'carpeta' | 'bloque', id: string) => Promise<void>;
  borrarElementoCapa: (bloqueId: string, capaId: string, elementoId: string) => Promise<void>;
  borrarCapaSuelta: (bloqueId: string, capaId: string) => Promise<void>;

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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function descargarBlob(
  contenido: string,
  tipoMime: string,
  nombreArchivo: string
): Promise<void> {
  const sinExt = nombreArchivo.replace(/\.(gpx|json)$/i, '');
  await guardarYCompartirArchivo(sinExt, contenido, tipoMime, sinExt);
}

function ordenEfectivoCaja(c: Carpeta, base: number, contador: number): number {
  return c.orden !== undefined ? c.orden : (c.creadoEn || base) + contador;
}

function ordenEfectivoBloque(b: BloqueCapas, base: number, contador: number): number {
  return b.orden !== undefined ? b.orden : (b.importadoEn || base) + contador;
}

function ordenEfectivoElemento(p: { orden?: number; creadoEn?: number }, base: number, contador: number): number {
  return p.orden !== undefined ? p.orden : (p.creadoEn || base) + contador;
}

// WKF1.073: helper. Devuelve los ids de los waypoints que SOLO pertenecen
// a la ruta indicada (es decir, que no están referenciados por ninguna
// otra ruta). Solo aplica a rutas origen 'track' (generadas desde un
// track o una línea de capa importada). Rutas manuales no se tocan.
function waypointsHuerfanosDeRuta(
  ruta: Ruta,
  todasLasRutas: Ruta[]
): string[] {
  if (ruta.origen !== 'track') return [];
  const otrasRutas = todasLasRutas.filter((r) => r.id !== ruta.id);
  const enOtras = new Set<string>();
  for (const r of otrasRutas) {
    for (const id of r.waypointIds) enOtras.add(id);
  }
  return ruta.waypointIds.filter((id) => !enOtras.has(id));
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

  contarContenidoCaja: (id) => {
    const waypoints = get().waypoints.filter((w) => w.carpetaId === id).length;
    const rutas = get().rutas.filter((r) => r.carpetaId === id).length;
    const tracks = get().tracks.filter((t) => t.carpetaId === id).length;
    return { waypoints, rutas, tracks };
  },

  borrarCajaConContenido: async (id) => {
    if (esCajaSistema(id)) return;
    const { waypoints, rutas, tracks, carpetas } = get();
    const waypointsAEliminar = waypoints.filter((w) => w.carpetaId === id);
    const rutasAEliminar = rutas.filter((r) => r.carpetaId === id);
    const tracksAEliminar = tracks.filter((t) => t.carpetaId === id);

    for (const w of waypointsAEliminar) {
      await repoBorrarWaypoint(w.id);
    }
    for (const r of rutasAEliminar) {
      await repoBorrarRuta(r.id);
    }
    for (const t of tracksAEliminar) {
      await repoBorrarTrack(t.id);
    }
    await repoBorrarCarpeta(id);

    set(() => ({
      carpetas: carpetas.filter((c) => c.id !== id),
      waypoints: get().waypoints.filter((w) => w.carpetaId !== id),
      rutas: get().rutas.filter((r) => r.carpetaId !== id),
      tracks: get().tracks.filter((t) => t.carpetaId !== id),
    }));
  },

  moverWaypointACarpeta: async (wpId, carpetaId) => {
    const actualizado = await repoActualizarWaypoint(wpId, { carpetaId });
    if (!actualizado) return;
    set((state) => ({
      waypoints: state.waypoints.map((w) => (w.id === wpId ? actualizado : w)),
    }));
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
    const ruta = get().rutas.find((r) => r.id === id);
    if (!ruta) return;
    const huerfanos = waypointsHuerfanosDeRuta(ruta, get().rutas);

    await repoBorrarRuta(id);
    for (const wpId of huerfanos) {
      await repoBorrarWaypoint(wpId);
    }

    set((state) => ({
      rutas: state.rutas.filter((r) => r.id !== id),
      waypoints: state.waypoints.filter((w) => !huerfanos.includes(w.id)),
    }));
  },

  cambiarColorRuta: async (id, color) => {
    const actualizada = await repoActualizarRuta(id, {
      color: color ?? undefined,
    });
    if (!actualizada) return;
    set((state) => ({
      rutas: state.rutas.map((r) => (r.id === id ? actualizada : r)),
    }));
  },

  cambiarColorTrack: async (id, color) => {
    const actualizado = await repoActualizarTrack(id, {
      color: color ?? undefined,
    });
    if (!actualizado) return;
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? actualizado : t)),
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
      color: '#00B8FF',
    });
    set((state) => ({ tracks: [...state.tracks, track] }));
    return track;
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
    <name>${escapeXml(wp.nombre)}</name>
    ${wp.nota ? `<desc>${escapeXml(wp.nota)}</desc>` : ''}
  </wpt>
</gpx>`;
    await descargarBlob(gpx, 'application/gpx+xml', `${wp.nombre}.gpx`);
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
    <name>${escapeXml(ruta.nombre)}</name>
    ${wps
      .map(
        (w) =>
          `<rtept lat="${w.lat}" lon="${w.lon}"><name>${escapeXml(w.nombre)}</name></rtept>`
      )
      .join('\n    ')}
  </rte>
</gpx>`;
    await descargarBlob(gpx, 'application/gpx+xml', `${ruta.nombre}.gpx`);
  },

  exportarTrack: async (id) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track) return;
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(track.nombre)}</name>
    <trkseg>
      ${track.puntos
        .map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`)
        .join('\n      ')}
    </trkseg>
  </trk>
</gpx>`;
    await descargarBlob(gpx, 'application/gpx+xml', `${track.nombre}.gpx`);
  },

  exportarElementoCapa: async (bloqueId, capaId, elementoId) => {
    const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
    if (!bloque) return;
    const capa = bloque.capas.find((c) => c.id === capaId);
    if (!capa) return;
    const el = capa.elementos.find((e) => e.id === elementoId);
    if (!el) return;

    const nombre = el.nombre?.trim() || el.tipo;
    const wpts: string[] = [];
    const trks: string[] = [];

    if (el.tipo === 'punto') {
      const c = el.coords;
      let lat: number | null = null;
      let lon: number | null = null;
      if (Array.isArray(c)) {
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
          lat = c[0];
          lon = c[1];
        } else if (
          Array.isArray(c[0]) &&
          typeof c[0][0] === 'number' &&
          typeof c[0][1] === 'number'
        ) {
          lat = c[0][0];
          lon = c[0][1];
        }
      }
      if (lat != null && lon != null) {
        wpts.push(
          `  <wpt lat="${lat}" lon="${lon}"><name>${escapeXml(nombre)}</name></wpt>`
        );
      }
    } else {
      const pts = el.coords as [number, number][];
      if (Array.isArray(pts) && pts.length >= 2) {
        const ptsFinales =
          el.tipo === 'poligono' &&
          (pts[0][0] !== pts[pts.length - 1][0] ||
            pts[0][1] !== pts[pts.length - 1][1])
            ? [...pts, pts[0]]
            : pts;
        trks.push(`  <trk>
    <name>${escapeXml(nombre)}</name>
    <trkseg>
      ${ptsFinales
        .map((p) => `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`)
        .join('\n      ')}
    </trkseg>
  </trk>`);
      }
    }

    if (wpts.length === 0 && trks.length === 0) {
      console.warn('Elemento de capa sin contenido exportable');
      return;
    }

    const contenido = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${[...wpts, ...trks].join('\n')}
</gpx>`;
    await descargarBlob(
      contenido,
      'application/gpx+xml',
      `${bloque.nombre} - ${capa.nombre} - ${nombre}.gpx`
    );
  },

  exportarCapa: async (bloqueId, capaId) => {
    const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
    if (!bloque) return;
    const capa = bloque.capas.find((c) => c.id === capaId);
    if (!capa) return;

    const wpts: string[] = [];
    const trks: string[] = [];

    for (const el of capa.elementos) {
      const nombre = el.nombre?.trim() || el.tipo;
      if (el.tipo === 'punto') {
        const c = el.coords;
        let lat: number | null = null;
        let lon: number | null = null;
        if (Array.isArray(c)) {
          if (typeof c[0] === 'number' && typeof c[1] === 'number') {
            lat = c[0];
            lon = c[1];
          } else if (
            Array.isArray(c[0]) &&
            typeof c[0][0] === 'number' &&
            typeof c[0][1] === 'number'
          ) {
            lat = c[0][0];
            lon = c[0][1];
          }
        }
        if (lat != null && lon != null) {
          wpts.push(
            `  <wpt lat="${lat}" lon="${lon}"><name>${escapeXml(nombre)}</name></wpt>`
          );
        }
        continue;
      }

      const pts = el.coords as [number, number][];
      if (!Array.isArray(pts) || pts.length < 2) continue;
      const ptsFinales =
        el.tipo === 'poligono' &&
        (pts[0][0] !== pts[pts.length - 1][0] ||
          pts[0][1] !== pts[pts.length - 1][1])
          ? [...pts, pts[0]]
          : pts;
      trks.push(`  <trk>
    <name>${escapeXml(nombre)}</name>
    <trkseg>
      ${ptsFinales
        .map((p) => `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`)
        .join('\n      ')}
    </trkseg>
  </trk>`);
    }

    if (wpts.length === 0 && trks.length === 0) {
      console.warn('Capa sin elementos exportables');
      return;
    }

    const contenido = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${[...wpts, ...trks].join('\n')}
</gpx>`;
    await descargarBlob(
      contenido,
      'application/gpx+xml',
      `${bloque.nombre} - ${capa.nombre}.gpx`
    );
  },

  duplicarRuta: async (id) => {
    const ruta = get().rutas.find((r) => r.id === id);
    if (!ruta) return null;
    const nueva = await repoCrearRuta({
      nombre: `${ruta.nombre} (copia)`,
      waypointIds: [...ruta.waypointIds],
      nota: ruta.nota,
      origen: ruta.origen,
      carpetaId: ruta.carpetaId,
      color: ruta.color,
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
      carpetaId: track.carpetaId,
      color: track.color,
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

  moverArriba: async (tipo, id, opciones) => {
    if (tipo === 'carpeta') {
      if (esCajaSistema(id)) return;
      const carpetasManuales = get().carpetas.filter((c) => !esCajaSistema(c.id));
      const bloques = get().bloquesCapas;
      const base = Date.now();
      let contador = 0;
      const listaMezclada = [
        ...carpetasManuales.map((c) => ({
          tipo: 'carpeta' as const,
          id: c.id,
          ordenEfectivo: ordenEfectivoCaja(c, base, contador++),
        })),
        ...bloques.map((b) => ({
          tipo: 'bloque' as const,
          id: b.id,
          ordenEfectivo: ordenEfectivoBloque(b, base, contador++),
        })),
      ].sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

      const idx = listaMezclada.findIndex((it) => it.tipo === 'carpeta' && it.id === id);
      if (idx <= 0) return;
      const actual = listaMezclada[idx];
      const superior = listaMezclada[idx - 1];
      let nuevoOrdenActual = superior.ordenEfectivo;
      let nuevoOrdenSuperior = actual.ordenEfectivo;
      if (nuevoOrdenActual === nuevoOrdenSuperior) {
        nuevoOrdenActual = nuevoOrdenSuperior - 1;
      }
      const posActual = idx;
      const posSuperior = idx - 1;
      const reorden: Array<{ tipo: 'carpeta' | 'bloque'; id: string; orden: number }> = [];
      listaMezclada.forEach((it, i) => {
        if (i === posActual) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posSuperior });
        } else if (i === posSuperior) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posActual });
        } else {
          reorden.push({ tipo: it.tipo, id: it.id, orden: i });
        }
      });
      for (const r of reorden) {
        if (r.tipo === 'carpeta') {
          await repoActualizarCarpeta(r.id, { orden: r.orden });
        } else {
          await repoActualizarBloque(r.id, { orden: r.orden });
        }
      }
      const mapaCarpetas = new Map<string, number>();
      const mapaBloques = new Map<string, number>();
      for (const r of reorden) {
        if (r.tipo === 'carpeta') mapaCarpetas.set(r.id, r.orden);
        else mapaBloques.set(r.id, r.orden);
      }
      set((state) => ({
        carpetas: state.carpetas.map((c) =>
          mapaCarpetas.has(c.id) ? { ...c, orden: mapaCarpetas.get(c.id)! } : c
        ),
        bloquesCapas: state.bloquesCapas.map((b) =>
          mapaBloques.has(b.id) ? { ...b, orden: mapaBloques.get(b.id)! } : b
        ),
      }));
      return;
    }

    if (tipo === 'bloque') {
      const carpetasManuales = get().carpetas.filter((c) => !esCajaSistema(c.id));
      const bloques = get().bloquesCapas;
      const base = Date.now();
      let contador = 0;
      const listaMezclada = [
        ...carpetasManuales.map((c) => ({
          tipo: 'carpeta' as const,
          id: c.id,
          ordenEfectivo: ordenEfectivoCaja(c, base, contador++),
        })),
        ...bloques.map((b) => ({
          tipo: 'bloque' as const,
          id: b.id,
          ordenEfectivo: ordenEfectivoBloque(b, base, contador++),
        })),
      ].sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

      const idx = listaMezclada.findIndex((it) => it.tipo === 'bloque' && it.id === id);
      if (idx <= 0) return;
      const posActual = idx;
      const posSuperior = idx - 1;
      const reorden: Array<{ tipo: 'carpeta' | 'bloque'; id: string; orden: number }> = [];
      listaMezclada.forEach((it, i) => {
        if (i === posActual) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posSuperior });
        } else if (i === posSuperior) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posActual });
        } else {
          reorden.push({ tipo: it.tipo, id: it.id, orden: i });
        }
      });
      for (const r of reorden) {
        if (r.tipo === 'carpeta') {
          await repoActualizarCarpeta(r.id, { orden: r.orden });
        } else {
          await repoActualizarBloque(r.id, { orden: r.orden });
        }
      }
      const mapaCarpetas = new Map<string, number>();
      const mapaBloques = new Map<string, number>();
      for (const r of reorden) {
        if (r.tipo === 'carpeta') mapaCarpetas.set(r.id, r.orden);
        else mapaBloques.set(r.id, r.orden);
      }
      set((state) => ({
        carpetas: state.carpetas.map((c) =>
          mapaCarpetas.has(c.id) ? { ...c, orden: mapaCarpetas.get(c.id)! } : c
        ),
        bloquesCapas: state.bloquesCapas.map((b) =>
          mapaBloques.has(b.id) ? { ...b, orden: mapaBloques.get(b.id)! } : b
        ),
      }));
      return;
    }

    if (tipo === 'capa') {
      const bloqueId = opciones?.bloqueId;
      if (!bloqueId) return;
      const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
      if (!bloque) return;
      const capas = bloque.capas.slice().sort((a, b) => {
        const oa = a.orden ?? 0;
        const ob = b.orden ?? 0;
        return oa - ob;
      });
      const idx = capas.findIndex((c) => c.id === id);
      if (idx <= 0) return;
      const tmp = capas[idx - 1];
      capas[idx - 1] = capas[idx];
      capas[idx] = tmp;
      const ids = capas.map((c) => c.id);
      const actualizado = await repoReordenarCapas(bloqueId, ids);
      if (!actualizado) return;
      set((state) => ({
        bloquesCapas: state.bloquesCapas.map((b) =>
          b.id === bloqueId ? actualizado : b
        ),
      }));
      return;
    }

    if (tipo === 'elemento-capa') {
      const bloqueId = opciones?.bloqueId;
      const capaId = opciones?.capaId;
      if (!bloqueId || !capaId) return;
      const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
      if (!bloque) return;
      const capa = bloque.capas.find((c) => c.id === capaId);
      if (!capa) return;
      const elementos = capa.elementos.slice().sort((a, b) => {
        const oa = a.orden ?? 0;
        const ob = b.orden ?? 0;
        return oa - ob;
      });
      const idx = elementos.findIndex((el) => el.id === id);
      if (idx <= 0) return;
      const tmp = elementos[idx - 1];
      elementos[idx - 1] = elementos[idx];
      elementos[idx] = tmp;
      const ids = elementos.map((el) => el.id);
      const actualizado = await repoReordenarElementosCapa(bloqueId, capaId, ids);
      if (!actualizado) return;
      set((state) => ({
        bloquesCapas: state.bloquesCapas.map((b) =>
          b.id === bloqueId ? actualizado : b
        ),
      }));
      return;
    }

    if (tipo === 'elemento') {
      const cajaId = opciones?.cajaId;
      if (!cajaId) return;
      await reordenarElementoEnCaja(cajaId, id, -1);
      return;
    }
  },

  moverAbajo: async (tipo, id, opciones) => {
    if (tipo === 'carpeta') {
      if (esCajaSistema(id)) return;
      const carpetasManuales = get().carpetas.filter((c) => !esCajaSistema(c.id));
      const bloques = get().bloquesCapas;
      const base = Date.now();
      let contador = 0;
      const listaMezclada = [
        ...carpetasManuales.map((c) => ({
          tipo: 'carpeta' as const,
          id: c.id,
          ordenEfectivo: ordenEfectivoCaja(c, base, contador++),
        })),
        ...bloques.map((b) => ({
          tipo: 'bloque' as const,
          id: b.id,
          ordenEfectivo: ordenEfectivoBloque(b, base, contador++),
        })),
      ].sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

      const idx = listaMezclada.findIndex((it) => it.tipo === 'carpeta' && it.id === id);
      if (idx < 0 || idx >= listaMezclada.length - 1) return;
      const posActual = idx;
      const posInferior = idx + 1;
      const reorden: Array<{ tipo: 'carpeta' | 'bloque'; id: string; orden: number }> = [];
      listaMezclada.forEach((it, i) => {
        if (i === posActual) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posInferior });
        } else if (i === posInferior) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posActual });
        } else {
          reorden.push({ tipo: it.tipo, id: it.id, orden: i });
        }
      });
      for (const r of reorden) {
        if (r.tipo === 'carpeta') {
          await repoActualizarCarpeta(r.id, { orden: r.orden });
        } else {
          await repoActualizarBloque(r.id, { orden: r.orden });
        }
      }
      const mapaCarpetas = new Map<string, number>();
      const mapaBloques = new Map<string, number>();
      for (const r of reorden) {
        if (r.tipo === 'carpeta') mapaCarpetas.set(r.id, r.orden);
        else mapaBloques.set(r.id, r.orden);
      }
      set((state) => ({
        carpetas: state.carpetas.map((c) =>
          mapaCarpetas.has(c.id) ? { ...c, orden: mapaCarpetas.get(c.id)! } : c
        ),
        bloquesCapas: state.bloquesCapas.map((b) =>
          mapaBloques.has(b.id) ? { ...b, orden: mapaBloques.get(b.id)! } : b
        ),
      }));
      return;
    }

    if (tipo === 'bloque') {
      const carpetasManuales = get().carpetas.filter((c) => !esCajaSistema(c.id));
      const bloques = get().bloquesCapas;
      const base = Date.now();
      let contador = 0;
      const listaMezclada = [
        ...carpetasManuales.map((c) => ({
          tipo: 'carpeta' as const,
          id: c.id,
          ordenEfectivo: ordenEfectivoCaja(c, base, contador++),
        })),
        ...bloques.map((b) => ({
          tipo: 'bloque' as const,
          id: b.id,
          ordenEfectivo: ordenEfectivoBloque(b, base, contador++),
        })),
      ].sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

      const idx = listaMezclada.findIndex((it) => it.tipo === 'bloque' && it.id === id);
      if (idx < 0 || idx >= listaMezclada.length - 1) return;
      const posActual = idx;
      const posInferior = idx + 1;
      const reorden: Array<{ tipo: 'carpeta' | 'bloque'; id: string; orden: number }> = [];
      listaMezclada.forEach((it, i) => {
        if (i === posActual) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posInferior });
        } else if (i === posInferior) {
          reorden.push({ tipo: it.tipo, id: it.id, orden: posActual });
        } else {
          reorden.push({ tipo: it.tipo, id: it.id, orden: i });
        }
      });
      for (const r of reorden) {
        if (r.tipo === 'carpeta') {
          await repoActualizarCarpeta(r.id, { orden: r.orden });
        } else {
          await repoActualizarBloque(r.id, { orden: r.orden });
        }
      }
      const mapaCarpetas = new Map<string, number>();
      const mapaBloques = new Map<string, number>();
      for (const r of reorden) {
        if (r.tipo === 'carpeta') mapaCarpetas.set(r.id, r.orden);
        else mapaBloques.set(r.id, r.orden);
      }
      set((state) => ({
        carpetas: state.carpetas.map((c) =>
          mapaCarpetas.has(c.id) ? { ...c, orden: mapaCarpetas.get(c.id)! } : c
        ),
        bloquesCapas: state.bloquesCapas.map((b) =>
          mapaBloques.has(b.id) ? { ...b, orden: mapaBloques.get(b.id)! } : b
        ),
      }));
      return;
    }

    if (tipo === 'capa') {
      const bloqueId = opciones?.bloqueId;
      if (!bloqueId) return;
      const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
      if (!bloque) return;
      const capas = bloque.capas.slice().sort((a, b) => {
        const oa = a.orden ?? 0;
        const ob = b.orden ?? 0;
        return oa - ob;
      });
      const idx = capas.findIndex((c) => c.id === id);
      if (idx < 0 || idx >= capas.length - 1) return;
      const tmp = capas[idx + 1];
      capas[idx + 1] = capas[idx];
      capas[idx] = tmp;
      const ids = capas.map((c) => c.id);
      const actualizado = await repoReordenarCapas(bloqueId, ids);
      if (!actualizado) return;
      set((state) => ({
        bloquesCapas: state.bloquesCapas.map((b) =>
          b.id === bloqueId ? actualizado : b
        ),
      }));
      return;
    }

    if (tipo === 'elemento-capa') {
      const bloqueId = opciones?.bloqueId;
      const capaId = opciones?.capaId;
      if (!bloqueId || !capaId) return;
      const bloque = get().bloquesCapas.find((b) => b.id === bloqueId);
      if (!bloque) return;
      const capa = bloque.capas.find((c) => c.id === capaId);
      if (!capa) return;
      const elementos = capa.elementos.slice().sort((a, b) => {
        const oa = a.orden ?? 0;
        const ob = b.orden ?? 0;
        return oa - ob;
      });
      const idx = elementos.findIndex((el) => el.id === id);
      if (idx < 0 || idx >= elementos.length - 1) return;
      const tmp = elementos[idx + 1];
      elementos[idx + 1] = elementos[idx];
      elementos[idx] = tmp;
      const ids = elementos.map((el) => el.id);
      const actualizado = await repoReordenarElementosCapa(bloqueId, capaId, ids);
      if (!actualizado) return;
      set((state) => ({
        bloquesCapas: state.bloquesCapas.map((b) =>
          b.id === bloqueId ? actualizado : b
        ),
      }));
      return;
    }

    if (tipo === 'elemento') {
      const cajaId = opciones?.cajaId;
      if (!cajaId) return;
      await reordenarElementoEnCaja(cajaId, id, 1);
      return;
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

  moverElementoCapa: async (
    bloqueOrigenId,
    capaOrigenId,
    elementoId,
    bloqueDestinoId,
    capaDestinoId
  ) => {
    const res = await repoMoverElementoEntreCapas(
      bloqueOrigenId,
      capaOrigenId,
      elementoId,
      bloqueDestinoId,
      capaDestinoId
    );
    if (!res.origen && !res.destino) return;

    set((state) => {
      let bloques = state.bloquesCapas;
      if (res.origen) {
        bloques = bloques.map((b) => (b.id === res.origen!.id ? res.origen! : b));
      }
      if (res.destino) {
        bloques = bloques.map((b) => (b.id === res.destino!.id ? res.destino! : b));
      }
      return { bloquesCapas: bloques };
    });
  },

  exportarCaja: async (tipo, id) => {
    if (tipo === 'carpeta') {
      if (id === WKF_WAYPOINTS_ID) {
        const wps = get().waypoints.filter((w) => w.carpetaId === WKF_WAYPOINTS_ID);
        const wptsXml = wps
          .map(
            (w) => `  <wpt lat="${w.lat}" lon="${w.lon}">
    <name>${escapeXml(w.nombre)}</name>${w.nota ? `\n    <desc>${escapeXml(w.nota)}</desc>` : ''}
  </wpt>`
          )
          .join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${wptsXml}
</gpx>`;
        await descargarBlob(gpx, 'application/gpx+xml', 'WKF Waypoints.gpx');
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
    <name>${escapeXml(r.nombre)}</name>
    ${wps
      .map(
        (w) =>
          `<rtept lat="${w.lat}" lon="${w.lon}"><name>${escapeXml(w.nombre)}</name></rtept>`
      )
      .join('\n    ')}
  </rte>`;
          })
          .join('\n');
        const trksXml = tracks
          .map(
            (t) => `  <trk>
    <name>${escapeXml(t.nombre)}</name>
    <trkseg>
      ${t.puntos
        .map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`)
        .join('\n      ')}
    </trkseg>
  </trk>`
          )
          .join('\n');
        const partesXml = [rtesXml, trksXml].filter(Boolean).join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${partesXml}
</gpx>`;
        await descargarBlob(gpx, 'application/gpx+xml', 'WKF Rutas.gpx');
      } else if (id === WKF_FAV_ID) {
        const waypointsFav = get().waypoints.filter((w) => w.favorito === true);
        const rutasFav = get().rutas.filter((r) => r.favorito === true);
        const tracksFav = get().tracks.filter((t) => t.favorito === true);
        const allWaypoints = get().waypoints;

        const wptsXml = waypointsFav
          .map(
            (w) => `  <wpt lat="${w.lat}" lon="${w.lon}">
    <name>${escapeXml(w.nombre)}</name>${w.nota ? `\n    <desc>${escapeXml(w.nota)}</desc>` : ''}
  </wpt>`
          )
          .join('\n');
        const rtesXml = rutasFav
          .map((r) => {
            const wps = r.waypointIds
              .map((wid) => allWaypoints.find((w) => w.id === wid))
              .filter((w): w is Waypoint => w != null);
            return `  <rte>
    <name>${escapeXml(r.nombre)}</name>
    ${wps
      .map(
        (w) =>
          `<rtept lat="${w.lat}" lon="${w.lon}"><name>${escapeXml(w.nombre)}</name></rtept>`
      )
      .join('\n    ')}
  </rte>`;
          })
          .join('\n');
        const trksXml = tracksFav
          .map(
            (t) => `  <trk>
    <name>${escapeXml(t.nombre)}</name>
    <trkseg>
      ${t.puntos
        .map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`)
        .join('\n      ')}
    </trkseg>
  </trk>`
          )
          .join('\n');

        const partesXml = [wptsXml, rtesXml, trksXml].filter(Boolean).join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${partesXml}
</gpx>`;
        await descargarBlob(gpx, 'application/gpx+xml', 'WKF Fav.gpx');
      } else {
        const carpeta = get().carpetas.find((c) => c.id === id);
        if (!carpeta) return;
        const waypoints = get().waypoints.filter((w) => w.carpetaId === id);
        const wptsXml = waypoints
          .map(
            (w) => `  <wpt lat="${w.lat}" lon="${w.lon}">
    <name>${escapeXml(w.nombre)}</name>${w.nota ? `\n    <desc>${escapeXml(w.nota)}</desc>` : ''}
  </wpt>`
          )
          .join('\n');
        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
${wptsXml}
</gpx>`;
        await descargarBlob(gpx, 'application/gpx+xml', `${carpeta.nombre}.gpx`);
      }
    } else if (tipo === 'bloque') {
      const bloque = get().bloquesCapas.find((b) => b.id === id);
      if (!bloque) return;
      const json = JSON.stringify(bloque, null, 2);
      await descargarBlob(json, 'application/json', `${bloque.nombre}.json`);
    }
  },

  borrarElementoCapa: async (bloqueId, capaId, elementoId) => {
    const actualizado = await repoBorrarElementoCapa(bloqueId, capaId, elementoId);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) => (b.id === bloqueId ? actualizado : b)),
    }));
  },

  borrarCapaSuelta: async (bloqueId, capaId) => {
    const actualizado = await repoBorrarCapaSuelta(bloqueId, capaId);
    if (!actualizado) return;
    set((state) => ({
      bloquesCapas: state.bloquesCapas.map((b) =>
        b.id === bloqueId ? actualizado : b
      ),
    }));
  },

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

// ─── Helper interno: reordenar un elemento (waypoint/ruta/track)
//     dentro de su caja, en el orden visual mezclado.
//     `delta` = -1 arriba, +1 abajo.
async function reordenarElementoEnCaja(
  cajaId: string,
  elementoId: string,
  delta: -1 | 1
): Promise<void> {
  const state = useNavegacionStore.getState();
  const base = Date.now();
  let contador = 0;

  type Item = {
    kind: 'waypoint' | 'ruta' | 'track';
    id: string;
    ordenEfectivo: number;
    orden: number | undefined;
  };

  const items: Item[] = [];
  for (const w of state.waypoints) {
    if ((w.carpetaId ?? WKF_WAYPOINTS_ID) !== cajaId) continue;
    items.push({
      kind: 'waypoint',
      id: w.id,
      orden: w.orden,
      ordenEfectivo: ordenEfectivoElemento(w, base, contador++),
    });
  }
  for (const r of state.rutas) {
    if ((r.carpetaId ?? WKF_RUTAS_ID) !== cajaId) continue;
    items.push({
      kind: 'ruta',
      id: r.id,
      orden: r.orden,
      ordenEfectivo: ordenEfectivoElemento(r, base, contador++),
    });
  }
  for (const t of state.tracks) {
    if ((t.carpetaId ?? WKF_RUTAS_ID) !== cajaId) continue;
    items.push({
      kind: 'track',
      id: t.id,
      orden: t.orden,
      ordenEfectivo: ordenEfectivoElemento(t, base, contador++),
    });
  }
  items.sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

  const idx = items.findIndex((it) => it.id === elementoId);
  if (idx < 0) return;
  const destino = idx + delta;
  if (destino < 0 || destino >= items.length) return;

  const tmp = items[destino];
  items[destino] = items[idx];
  items[idx] = tmp;

  const nuevasWaypoints: Waypoint[] = [];
  const nuevasRutas: Ruta[] = [];
  const nuevosTracks: Track[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'waypoint') {
      const act = await repoActualizarWaypoint(it.id, { orden: i });
      if (act) nuevasWaypoints.push(act);
    } else if (it.kind === 'ruta') {
      const act = await repoActualizarRuta(it.id, { orden: i });
      if (act) nuevasRutas.push(act);
    } else {
      const act = await repoActualizarTrack(it.id, { orden: i });
      if (act) nuevosTracks.push(act);
    }
  }

  useNavegacionStore.setState((s) => {
    const mapWp = new Map(nuevasWaypoints.map((w) => [w.id, w]));
    const mapRt = new Map(nuevasRutas.map((r) => [r.id, r]));
    const mapTr = new Map(nuevosTracks.map((t) => [t.id, t]));
    return {
      waypoints: s.waypoints.map((w) => mapWp.get(w.id) ?? w),
      rutas: s.rutas.map((r) => mapRt.get(r.id) ?? r),
      tracks: s.tracks.map((t) => mapTr.get(t.id) ?? t),
    };
  });
}
// src/state/navegacion-store.ts