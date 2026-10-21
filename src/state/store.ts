// src/state/store.ts
// WKF — Estado global Zustand con persistencia en localStorage.
// Persist version 5. Clave "wkf-state-v1".
// Fase 21 (Paso 6): nuevo ajuste densidadWaypointsTrack.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n, { detectInitialLanguage, STORAGE_KEY } from '../i18n/index.ts';
import type { SpotWeather } from '../lib/openmeteo.ts';
import type { NivelColorTabla } from '../lib/verdict-color.ts';
import type { ModeloPrevision, ModeloId } from '../lib/modelos.ts';
import {
  CATALOGO_KAYAKS,
  buscarKayakPorId,
  deducirCategoriaWKF,
  type Kayak,
  type KayakEditado,
  type EntradaKayakEditado,
} from '../lib/kayaks.ts';
import {
  CATALOGO_PATOS,
  buscarPatoPorId,
  buscarCanoaPorId,
  type Pato,
  type Canoa,
} from '../lib/patos.ts';
import type {
  CategoriaKayak,
  CategoriaPato,
  FranjaDia,
  NivelExperiencia,
  TipoAcceso,
  Zona,
  PerfilKayakista,
} from '../lib/verdict.ts';
import type { FormatoCoords } from '../lib/coords.ts';
import { UNIDADES_POR_DEFECTO, type SistemaUnidades } from '../lib/unidades.ts';

export type Embarcacion = Kayak | Pato | Canoa | KayakEditado;

export function buscarEmbarcacionPorId(
  id: string,
  kayaksEditados?: KayakEditado[]
): Embarcacion | undefined {
  if (kayaksEditados) {
    const editado = kayaksEditados.find((k) => k.id === id);
    if (editado) return editado;
  } else if (/^user-/.test(id)) {
    try {
      const editados =
        typeof useAppStore !== 'undefined'
          ? useAppStore.getState?.()?.kayaksEditados
          : undefined;
      const editado = editados?.find((k) => k.id === id);
      if (editado) return editado;
    } catch {
      // ignore
    }
  }
  return buscarKayakPorId(id) ?? buscarPatoPorId(id) ?? buscarCanoaPorId(id);
}

export interface Spot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: number;
  zona?: Zona;
  tipoAcceso?: TipoAcceso | null;
  accesoLat?: number | null;
  accesoLon?: number | null;
  embarcacionId?: string;
}

export function getEmbarcacionParaSpot(
  spot?: Spot | null,
  ajustes?: Pick<AjustesApp, 'kayakIds'> | null
): Embarcacion {
  if (spot?.embarcacionId) {
    const emb = buscarEmbarcacionPorId(spot.embarcacionId);
    if (emb) return emb;
  }
  return getKayakActivo(ajustes?.kayakIds);
}

export type FranjaUsuario = {
  id: string;
  nombre: string;
  inicio: number;
  fin: number;
};

export type DensidadWaypointsTrack =
  | 'preciso'
  | 'fino'
  | 'normal'
  | 'ancho'
  | 'largo'
  | 'muy_largo';

export interface AjustesApp {
  formatoCoords: FormatoCoords;
  kayakIds: string[];
  categoriaKayak: CategoriaKayak;
  perfil: PerfilKayakista;
  franjas: FranjaUsuario[];
  franjaActivaId: string | null;
  subpestanasOcultas: string[];
  ordenSubpestanas: string[];
  colorTabla: NivelColorTabla;
  filtroFranja: boolean;
  unidades: SistemaUnidades;
  umbralLlegadaM: number;
  mapaNorteArriba: boolean;
  sonidoLlegada: boolean;
  vibracionLlegada: boolean;
  modeloPrevision: ModeloPrevision;
  mapaTactico: boolean;
  estiloWaypoints: 'chincheta' | 'punto';
  unidadVelocidad: 'kt' | 'kmh' | 'mph' | 'ms';
  densidadWaypointsTrack: DensidadWaypointsTrack;
}

export type ImportResult =
  | { ok: true; spotsImportados: number }
  | { ok: false; motivo: ImportFailReason };

export type ImportFailReason =
  | 'no_es_objeto'
  | 'version_incorrecta'
  | 'spots_no_array'
  | 'spot_mal_formado'
  | 'ajustes_mal_formados'
  | 'franjas_mal_formadas'
  | 'perfil_mal_formado';

export interface WeatherEntry {
  data: SpotWeather;
  stale: boolean;
  ageMin: number;
}

export type WeatherCache = Record<string, Record<string, SpotWeather>>;

const WEATHER_TTL_MS = 30 * 60 * 1000;
export const PERSIST_VERSION = 5;

const FRANJAS_DEFECTO: FranjaUsuario[] = [
  { id: 'manana', nombre: 'Mañana', inicio: 6, fin: 12 },
  { id: 'tarde', nombre: 'Tarde', inicio: 12, fin: 20 },
  { id: 'noche', nombre: 'Noche', inicio: 20, fin: 6 },
];

const PERFIL_DEFECTO: PerfilKayakista = {
  experiencia: 'avanzado',
  vhf: false,
  remoRepuesto: true,
  ropaSeca: true,
  compartimentosEstancos: true,
  pesoKayakistaKg: 90,
  pesoEquipoKg: 0,
  motorElectricoId: null,
  motorElectricoCustom: null,
  bateriaElectricaId: null,
  bateriaElectricaCustom: null,
};

const CATEGORIAS_VALIDAS: CategoriaKayak[] = ['K1', 'K2', 'K3', 'K4', 'K5'];
const EXPERIENCIAS_VALIDAS: NivelExperiencia[] = [
  'novel',
  'principiante',
  'intermedio',
  'avanzado',
  'experto',
];
const FORMATOS_VALIDOS: FormatoCoords[] = ['dd', 'dms', 'ddm'];
const TIPOS_ACCESO_VALIDOS: TipoAcceso[] = [
  'playa',
  'roca',
  'puerto_escollera',
  'otro',
];
const COLORES_TABLA_VALIDOS: NivelColorTabla[] = [
  'ninguno',
  'rojos',
  'rn',
  'rna',
  'todo',
];
const MODELOS_VALIDOS: ModeloPrevision[] = [
  'ecmwf',
  'gfs',
  'icon',
  'harmonie',
  'auto',
];
const DENSIDADES_VALIDAS: DensidadWaypointsTrack[] = [
  'preciso',
  'fino',
  'normal',
  'ancho',
  'largo',
  'muy_largo',
];

const UMBRAL_LLEGADA_DEFECTO = 30;
const UMBRAL_LLEGADA_MIN = 20;
const UMBRAL_LLEGADA_MAX = 50;

export function sanearUmbralLlegada(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return UMBRAL_LLEGADA_DEFECTO;
  }
  if (valor < UMBRAL_LLEGADA_MIN) return UMBRAL_LLEGADA_MIN;
  if (valor > UMBRAL_LLEGADA_MAX) return UMBRAL_LLEGADA_MAX;
  return Math.round(valor);
}

export function sanearModeloPrevision(valor: unknown): ModeloPrevision {
  if (
    typeof valor === 'string' &&
    MODELOS_VALIDOS.includes(valor as ModeloPrevision)
  ) {
    return valor as ModeloPrevision;
  }
  return 'auto';
}

export function sanearDensidadWaypointsTrack(
  valor: unknown
): DensidadWaypointsTrack {
  if (
    typeof valor === 'string' &&
    DENSIDADES_VALIDAS.includes(valor as DensidadWaypointsTrack)
  ) {
    return valor as DensidadWaypointsTrack;
  }
  return 'normal';
}

export function sanearKayakIds(ids: string[] | undefined): {
  kayakIds: string[];
  categoriaKayak?: CategoriaKayak;
} {
  const defaultKayak = CATALOGO_KAYAKS[0];
  if (!defaultKayak) {
    return { kayakIds: ids ?? [] };
  }

  if (!ids || ids.length === 0) {
    return {
      kayakIds: [defaultKayak.id],
      categoriaKayak: defaultKayak.categoriaWKF,
    };
  }

  const existeEnCatalogo = (id: string) =>
    buscarKayakPorId(id) != null ||
    buscarPatoPorId(id) != null ||
    buscarCanoaPorId(id) != null ||
    /^user-/.test(id);

  const mapeados = ids.map((id) =>
    existeEnCatalogo(id) ? id : defaultKayak.id
  );
  const unicos = Array.from(new Set(mapeados)).slice(0, 2);
  const resultado = unicos.length > 0 ? unicos : [defaultKayak.id];
  const primeraEmbarcacion = buscarEmbarcacionPorId(resultado[0]);

  return {
    kayakIds: resultado,
    categoriaKayak: primeraEmbarcacion?.categoriaWKF as CategoriaKayak,
  };
}

export function getKayakActivo(
  kayakIds?: string[],
  kayaksEditados?: KayakEditado[]
): Embarcacion {
  const defaultKayak = CATALOGO_KAYAKS[0];
  if (!kayakIds || kayakIds.length === 0) {
    return defaultKayak;
  }
  const e1 = kayakIds[0]
    ? buscarEmbarcacionPorId(kayakIds[0], kayaksEditados)
    : null;
  if (e1) return e1;
  const e2 = kayakIds[1]
    ? buscarEmbarcacionPorId(kayakIds[1], kayaksEditados)
    : null;
  if (e2) return e2;
  return defaultKayak;
}

export const getEmbarcacionActiva = getKayakActivo;

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function esNumeroFinito(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function validarSpot(raw: unknown): raw is Spot {
  if (!esObjeto(raw)) return false;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return false;
  if (typeof raw.name !== 'string') return false;
  if (!esNumeroFinito(raw.lat) || !esNumeroFinito(raw.lon)) return false;
  if (raw.lat < -90 || raw.lat > 90) return false;
  if (raw.lon < -180 || raw.lon > 180) return false;
  if (!esNumeroFinito(raw.createdAt)) return false;
  if (raw.zona !== undefined && typeof raw.zona !== 'string') return false;
  if (
    raw.tipoAcceso !== undefined &&
    raw.tipoAcceso !== null &&
    (typeof raw.tipoAcceso !== 'string' ||
      !TIPOS_ACCESO_VALIDOS.includes(raw.tipoAcceso as TipoAcceso))
  )
    return false;
  if (
    raw.accesoLat !== undefined &&
    raw.accesoLat !== null &&
    !esNumeroFinito(raw.accesoLat)
  )
    return false;
  if (
    raw.accesoLon !== undefined &&
    raw.accesoLon !== null &&
    !esNumeroFinito(raw.accesoLon)
  )
    return false;
  if (
    raw.embarcacionId !== undefined &&
    raw.embarcacionId !== null &&
    typeof raw.embarcacionId !== 'string'
  )
    return false;
  return true;
}

function validarFranja(raw: unknown): raw is FranjaUsuario {
  if (!esObjeto(raw)) return false;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return false;
  if (typeof raw.nombre !== 'string') return false;
  if (!esNumeroFinito(raw.inicio) || !esNumeroFinito(raw.fin)) return false;
  if (raw.inicio < 0 || raw.inicio > 23) return false;
  if (raw.fin < 0 || raw.fin > 23) return false;
  return true;
}

function validarPerfil(raw: unknown): raw is PerfilKayakista {
  if (!esObjeto(raw)) return false;
  if (
    typeof raw.experiencia !== 'string' ||
    !EXPERIENCIAS_VALIDAS.includes(raw.experiencia as NivelExperiencia)
  )
    return false;
  if (typeof raw.vhf !== 'boolean') return false;
  if (typeof raw.remoRepuesto !== 'boolean') return false;
  if (typeof raw.ropaSeca !== 'boolean') return false;
  if (typeof raw.compartimentosEstancos !== 'boolean') return false;

  if (raw.pesoKayakistaKg !== undefined) {
    if (
      typeof raw.pesoKayakistaKg !== 'number' ||
      !Number.isFinite(raw.pesoKayakistaKg) ||
      raw.pesoKayakistaKg < 30 ||
      raw.pesoKayakistaKg > 250
    )
      return false;
  }

  if (raw.pesoEquipoKg !== undefined) {
    if (
      typeof raw.pesoEquipoKg !== 'number' ||
      !Number.isFinite(raw.pesoEquipoKg) ||
      raw.pesoEquipoKg < 0 ||
      raw.pesoEquipoKg > 500
    )
      return false;
  }

  if (
    raw.motorElectricoId !== undefined &&
    raw.motorElectricoId !== null &&
    typeof raw.motorElectricoId !== 'string'
  )
    return false;

  if (
    raw.motorElectricoCustom !== undefined &&
    raw.motorElectricoCustom !== null &&
    !esObjeto(raw.motorElectricoCustom)
  )
    return false;

  if (
    raw.bateriaElectricaId !== undefined &&
    raw.bateriaElectricaId !== null &&
    typeof raw.bateriaElectricaId !== 'string'
  )
    return false;

  if (
    raw.bateriaElectricaCustom !== undefined &&
    raw.bateriaElectricaCustom !== null &&
    !esObjeto(raw.bateriaElectricaCustom)
  )
    return false;

  return true;
}

function validarAjustes(raw: unknown): raw is AjustesApp {
  if (!esObjeto(raw)) return false;
  if (
    typeof raw.formatoCoords !== 'string' ||
    !FORMATOS_VALIDOS.includes(raw.formatoCoords as FormatoCoords)
  )
    return false;
  if (!Array.isArray(raw.kayakIds)) return false;
  if (raw.kayakIds.length > 2) return false;
  if (!raw.kayakIds.every((id) => typeof id === 'string')) return false;
  if (
    typeof raw.categoriaKayak !== 'string' ||
    !CATEGORIAS_VALIDAS.includes(raw.categoriaKayak as CategoriaKayak)
  )
    return false;
  if (!validarPerfil(raw.perfil)) return false;
  if (!Array.isArray(raw.franjas)) return false;
  if (raw.franjas.length < 1 || raw.franjas.length > 4) return false;
  if (!raw.franjas.every(validarFranja)) return false;
  if (raw.franjaActivaId !== null && typeof raw.franjaActivaId !== 'string')
    return false;
  if (!Array.isArray(raw.subpestanasOcultas)) return false;
  if (!raw.subpestanasOcultas.every((id) => typeof id === 'string'))
    return false;
  if (
    raw.ordenSubpestanas !== undefined &&
    (!Array.isArray(raw.ordenSubpestanas) ||
      !raw.ordenSubpestanas.every((id) => typeof id === 'string'))
  )
    return false;
  if (
    raw.colorTabla !== undefined &&
    (typeof raw.colorTabla !== 'string' ||
      !COLORES_TABLA_VALIDOS.includes(raw.colorTabla as NivelColorTabla))
  )
    return false;
  if (raw.filtroFranja !== undefined && typeof raw.filtroFranja !== 'boolean')
    return false;
  if (raw.unidades !== undefined && !esObjeto(raw.unidades)) return false;
  if (
    raw.umbralLlegadaM !== undefined &&
    (typeof raw.umbralLlegadaM !== 'number' ||
      !Number.isFinite(raw.umbralLlegadaM))
  )
    return false;
  if (
    raw.mapaNorteArriba !== undefined &&
    typeof raw.mapaNorteArriba !== 'boolean'
  )
    return false;
  if (
    raw.sonidoLlegada !== undefined &&
    typeof raw.sonidoLlegada !== 'boolean'
  )
    return false;
  if (
    raw.vibracionLlegada !== undefined &&
    typeof raw.vibracionLlegada !== 'boolean'
  )
    return false;
  if (
    raw.modeloPrevision !== undefined &&
    (typeof raw.modeloPrevision !== 'string' ||
      !MODELOS_VALIDOS.includes(raw.modeloPrevision as ModeloPrevision))
  )
    return false;
  if (raw.mapaTactico !== undefined && typeof raw.mapaTactico !== 'boolean') {
    return false;
  }
  if (
    raw.estiloWaypoints !== undefined &&
    raw.estiloWaypoints !== 'chincheta' &&
    raw.estiloWaypoints !== 'punto'
  ) {
    return false;
  }
  if (
    raw.unidadVelocidad !== undefined &&
    raw.unidadVelocidad !== 'kt' &&
    raw.unidadVelocidad !== 'kmh' &&
    raw.unidadVelocidad !== 'mph' &&
    raw.unidadVelocidad !== 'ms'
  ) {
    return false;
  }
  if (
    raw.densidadWaypointsTrack !== undefined &&
    (typeof raw.densidadWaypointsTrack !== 'string' ||
      !DENSIDADES_VALIDAS.includes(
        raw.densidadWaypointsTrack as DensidadWaypointsTrack
      ))
  ) {
    return false;
  }
  return true;
}

export interface AppState {
  language: 'es' | 'en';
  theme: 'dark' | 'light';
  firstRunDone: boolean;
  spots: Spot[];
  weather: WeatherCache;
  kayaksEditados: KayakEditado[];
  ajustes: AjustesApp;

  addKayakEditado: (datos: {
    marca: string;
    modelo: string;
    entrada: EntradaKayakEditado;
  }) => KayakEditado | null;
  updateKayakEditado: (id: string, patch: Partial<KayakEditado>) => void;
  removeKayakEditado: (id: string) => void;

  setLanguage: (lang: 'es' | 'en') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  markFirstRunDone: () => void;

  addSpot: (spot: Omit<Spot, 'id' | 'createdAt'>) => void;
  updateSpot: (
    id: string,
    patch: Partial<Omit<Spot, 'id' | 'createdAt'>>
  ) => void;
  removeSpot: (id: string) => void;
  reorderSpots: (ids: string[]) => void;

  setWeather: (spotId: string, modeloId: ModeloId, data: SpotWeather) => void;
  clearWeather: (spotId: string, modeloId?: ModeloId) => void;
  getWeatherEntry: (spotId: string, modeloId: ModeloId) => WeatherEntry | null;
  getFreshWeather: (spotId: string, modeloId: ModeloId) => SpotWeather | null;
  isWeatherStale: (spotId: string, modeloId: ModeloId) => boolean;

  setFormatoCoords: (f: FormatoCoords) => void;
  setKayakIds: (ids: string[]) => void;
  setCategoriaKayak: (c: CategoriaKayak) => void;
  getKayakActivo: () => Embarcacion;
  getEmbarcacionActiva: () => Embarcacion;
  setPerfil: (patch: Partial<PerfilKayakista>) => void;
  setFranjas: (franjas: FranjaUsuario[]) => void;
  setFranjaActiva: (id: string | null) => void;
  toggleSubpestana: (id: string) => void;
  setOrdenSubpestanas: (orden: string[]) => void;
  setColorTabla: (nivel: NivelColorTabla) => void;
  setFiltroFranja: (activo: boolean) => void;
  setUnidades: (patch: Partial<SistemaUnidades>) => void;
  setUmbralLlegadaM: (metros: number) => void;
  setMapaNorteArriba: (v: boolean) => void;
  setSonidoLlegada: (v: boolean) => void;
  setVibracionLlegada: (v: boolean) => void;
  setModeloPrevision: (m: ModeloPrevision) => void;
  setMapaTactico: (v: boolean) => void;
  setEstiloWaypoints: (estilo: 'chincheta' | 'punto') => void;
  setUnidadVelocidad: (u: 'kt' | 'kmh' | 'mph' | 'ms') => void;
  setDensidadWaypointsTrack: (d: DensidadWaypointsTrack) => void;

  resetAll: () => void;
  exportState: () => Record<string, unknown>;
  importState: (data: unknown) => ImportResult;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: detectInitialLanguage(),
      theme: 'dark',
      firstRunDone: false,
      spots: [],
      weather: {},
      kayaksEditados: [],
      ajustes: {
        formatoCoords: 'dd',
        kayakIds: CATALOGO_KAYAKS[0] ? [CATALOGO_KAYAKS[0].id] : [],
        categoriaKayak: CATALOGO_KAYAKS[0]?.categoriaWKF ?? 'K3',
        perfil: PERFIL_DEFECTO,
        franjas: FRANJAS_DEFECTO,
        franjaActivaId: 'manana',
        subpestanasOcultas: [],
        ordenSubpestanas: [],
        colorTabla: 'todo',
        filtroFranja: true,
        unidades: { ...UNIDADES_POR_DEFECTO },
        umbralLlegadaM: UMBRAL_LLEGADA_DEFECTO,
        mapaNorteArriba: true,
        sonidoLlegada: true,
        vibracionLlegada: true,
        modeloPrevision: 'auto',
        mapaTactico: true,
        estiloWaypoints: 'punto',
        unidadVelocidad: 'kt',
        densidadWaypointsTrack: 'normal',
      },

      setLanguage: (lang) => {
        void i18n.changeLanguage(lang);
        set({ language: lang });
      },
      setTheme: (theme) => set({ theme }),
      markFirstRunDone: () => set({ firstRunDone: true }),

      addSpot: (spot) =>
        set((state) => ({
          spots: [
            ...state.spots,
            {
              zona: 'mediterraneo_espanol',
              tipoAcceso: null,
              accesoLat: null,
              accesoLon: null,
              ...spot,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: Date.now(),
            },
          ],
        })),

      updateSpot: (id, patch) =>
        set((state) => ({
          spots: state.spots.map((s) =>
            s.id === id ? { ...s, ...patch } : s
          ),
        })),

      removeSpot: (id) =>
        set((state) => {
          const nuevasSpots = state.spots.filter((s) => s.id !== id);
          const { [id]: _, ...restoWeather } = state.weather;
          return { spots: nuevasSpots, weather: restoWeather };
        }),

      reorderSpots: (ids) =>
        set((state) => {
          const spotMap = new Map(state.spots.map((s) => [s.id, s]));
          const reordenados: Spot[] = [];
          for (const id of ids) {
            const spot = spotMap.get(id);
            if (spot) {
              reordenados.push(spot);
              spotMap.delete(id);
            }
          }
          for (const spot of spotMap.values()) {
            reordenados.push(spot);
          }
          return { spots: reordenados };
        }),

      setWeather: (spotId, modeloId, data) =>
        set((state) => ({
          weather: {
            ...state.weather,
            [spotId]: {
              ...(state.weather[spotId] ?? {}),
              [modeloId]: data,
            },
          },
        })),

      clearWeather: (spotId, modeloId) =>
        set((state) => {
          if (!modeloId) {
            const { [spotId]: _, ...resto } = state.weather;
            return { weather: resto };
          }
          const porModelo = state.weather[spotId];
          if (!porModelo) return {};
          const { [modeloId]: _, ...restoModelos } = porModelo;
          return {
            weather: {
              ...state.weather,
              [spotId]: restoModelos,
            },
          };
        }),

      getWeatherEntry: (spotId, modeloId) => {
        const data = get().weather[spotId]?.[modeloId];
        if (!data) return null;
        const ageMs = Date.now() - data.fetchedAt;
        return {
          data,
          stale: ageMs > WEATHER_TTL_MS,
          ageMin: Math.floor(ageMs / 60000),
        };
      },

      getFreshWeather: (spotId, modeloId) => {
        const data = get().weather[spotId]?.[modeloId];
        if (!data) return null;
        const ageMs = Date.now() - data.fetchedAt;
        return ageMs <= WEATHER_TTL_MS ? data : null;
      },

      isWeatherStale: (spotId, modeloId) => {
        const data = get().weather[spotId]?.[modeloId];
        if (!data) return true;
        return Date.now() - data.fetchedAt > WEATHER_TTL_MS;
      },

      setFormatoCoords: (formatoCoords) =>
        set((state) => ({ ajustes: { ...state.ajustes, formatoCoords } })),
      setKayakIds: (kayakIds) =>
        set((state) => {
          const saneado = sanearKayakIds(kayakIds);
          return {
            ajustes: {
              ...state.ajustes,
              kayakIds: saneado.kayakIds,
              categoriaKayak:
                saneado.categoriaKayak ?? state.ajustes.categoriaKayak,
            },
          };
        }),
      setCategoriaKayak: (c) =>
        set((state) => ({
          ajustes: { ...state.ajustes, categoriaKayak: c },
        })),
      getKayakActivo: () =>
        getKayakActivo(get().ajustes.kayakIds, get().kayaksEditados),
      getEmbarcacionActiva: () =>
        getKayakActivo(get().ajustes.kayakIds, get().kayaksEditados),

      addKayakEditado: ({ marca, modelo, entrada }) => {
        let creado: KayakEditado | null = null;
        set((state) => {
          if (state.kayaksEditados.length >= 2) return state;
          const categoria = deducirCategoriaWKF(entrada);
          const id = `user-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`;
          const nuevo: KayakEditado = {
            id,
            marca,
            modelo,
            eslora: entrada.eslora,
            manga: entrada.manga,
            volumen: 0,
            tipoCasco: entrada.tipoCasco,
            autovaciable: entrada.autovaciable,
            timon: entrada.timon,
            compartimentosEstancos: entrada.compartimentosEstancos,
            capacidadCarga: entrada.capacidadCarga,
            propulsion: entrada.propulsion,
            categoriaWKF: categoria,
            categoriaDirectiva: 'exento',
            pesoKg: entrada.pesoKg,
            pesoFuente: entrada.pesoKg != null ? 'estimado' : undefined,
            certificado: false,
            certificadoOficial: false,
            verificado: false,
            certificaciones: {
              ce: null,
              ukca: null,
              uscg: false,
              abyc: false,
              nmma: false,
              as_nzs: false,
              jci: false,
              iso_12217: false,
              iso_14946: false,
              iso_10087: false,
            },
            origen: 'usuario',
          };
          creado = nuevo;
          return { kayaksEditados: [...state.kayaksEditados, nuevo] };
        });
        return creado;
      },

      updateKayakEditado: (id, patch) =>
        set((state) => ({
          kayaksEditados: state.kayaksEditados.map((k) =>
            k.id === id ? { ...k, ...patch } : k
          ),
        })),

      removeKayakEditado: (id) =>
        set((state) => ({
          kayaksEditados: state.kayaksEditados.filter((k) => k.id !== id),
        })),

      setPerfil: (patch) =>
        set((state) => ({
          ajustes: {
            ...state.ajustes,
            perfil: { ...state.ajustes.perfil, ...patch },
          },
        })),
      setFranjas: (franjas) =>
        set((state) => ({ ajustes: { ...state.ajustes, franjas } })),
      setFranjaActiva: (id) =>
        set((state) => ({
          ajustes: { ...state.ajustes, franjaActivaId: id },
        })),
      toggleSubpestana: (id) =>
        set((state) => {
          const ocultas = state.ajustes.subpestanasOcultas;
          const nuevas = ocultas.includes(id)
            ? ocultas.filter((x) => x !== id)
            : [...ocultas, id];
          return {
            ajustes: { ...state.ajustes, subpestanasOcultas: nuevas },
          };
        }),
      setOrdenSubpestanas: (orden) =>
        set((state) => ({
          ajustes: { ...state.ajustes, ordenSubpestanas: orden },
        })),
      setColorTabla: (nivel) =>
        set((state) => ({ ajustes: { ...state.ajustes, colorTabla: nivel } })),
      setFiltroFranja: (activo) =>
        set((state) => ({
          ajustes: { ...state.ajustes, filtroFranja: activo },
        })),
      setUnidades: (patch) =>
        set((state) => ({
          ajustes: {
            ...state.ajustes,
            unidades: { ...state.ajustes.unidades, ...patch },
          },
        })),
      setUmbralLlegadaM: (metros) =>
        set((state) => ({
          ajustes: {
            ...state.ajustes,
            umbralLlegadaM: sanearUmbralLlegada(metros),
          },
        })),
      setMapaNorteArriba: (v) =>
        set((state) => ({
          ajustes: { ...state.ajustes, mapaNorteArriba: v },
        })),
      setSonidoLlegada: (v) =>
        set((state) => ({
          ajustes: { ...state.ajustes, sonidoLlegada: v },
        })),
      setVibracionLlegada: (v) =>
        set((state) => ({
          ajustes: { ...state.ajustes, vibracionLlegada: v },
        })),
      setModeloPrevision: (m) =>
        set((state) => ({
          ajustes: {
            ...state.ajustes,
            modeloPrevision: sanearModeloPrevision(m),
          },
        })),
      setMapaTactico: (v) =>
        set((state) => ({
          ajustes: { ...state.ajustes, mapaTactico: v },
        })),
      setEstiloWaypoints: (estilo) =>
        set((state) => ({
          ajustes: { ...state.ajustes, estiloWaypoints: estilo },
        })),
      setUnidadVelocidad: (u) =>
        set((state) => ({
          ajustes: {
            ...state.ajustes,
            unidadVelocidad:
              u === 'kmh' || u === 'mph' || u === 'ms' ? u : 'kt',
          },
        })),
      setDensidadWaypointsTrack: (d) =>
        set((state) => ({
          ajustes: {
            ...state.ajustes,
            densidadWaypointsTrack: sanearDensidadWaypointsTrack(d),
          },
        })),

      resetAll: () =>
        set(() => ({
          spots: [],
          weather: {},
          kayaksEditados: [],
          ajustes: {
            formatoCoords: 'dd',
            kayakIds: CATALOGO_KAYAKS[0] ? [CATALOGO_KAYAKS[0].id] : [],
            categoriaKayak: CATALOGO_KAYAKS[0]?.categoriaWKF ?? 'K3',
            perfil: PERFIL_DEFECTO,
            franjas: FRANJAS_DEFECTO,
            franjaActivaId: 'manana',
            subpestanasOcultas: [],
            ordenSubpestanas: [],
            colorTabla: 'todo',
            filtroFranja: true,
            unidades: { ...UNIDADES_POR_DEFECTO },
            umbralLlegadaM: UMBRAL_LLEGADA_DEFECTO,
            mapaNorteArriba: true,
            sonidoLlegada: true,
            vibracionLlegada: true,
            modeloPrevision: 'auto',
            mapaTactico: true,
            estiloWaypoints: 'punto',
            unidadVelocidad: 'kt',
            densidadWaypointsTrack: 'normal',
          },
        })),

      exportState: () => {
        const s = get();
        return {
          version: PERSIST_VERSION,
          spots: s.spots,
          ajustes: s.ajustes,
          kayaksEditados: s.kayaksEditados,
          language: s.language,
          theme: s.theme,
        };
      },

      importState: (data) => {
        if (!esObjeto(data)) return { ok: false, motivo: 'no_es_objeto' };
        if (data.version !== PERSIST_VERSION)
          return { ok: false, motivo: 'version_incorrecta' };
        if (!Array.isArray(data.spots))
          return { ok: false, motivo: 'spots_no_array' };
        if (data.spots.length > 6)
          return { ok: false, motivo: 'spots_no_array' };
        for (const s of data.spots) {
          if (!validarSpot(s)) return { ok: false, motivo: 'spot_mal_formado' };
        }
        if (!esObjeto(data.ajustes))
          return { ok: false, motivo: 'ajustes_mal_formados' };
        if (!validarAjustes(data.ajustes)) {
          const aj = data.ajustes as Record<string, unknown>;
          if (Array.isArray(aj.franjas) && !aj.franjas.every(validarFranja)) {
            return { ok: false, motivo: 'franjas_mal_formadas' };
          }
          if (!validarPerfil(aj.perfil))
            return { ok: false, motivo: 'perfil_mal_formado' };
          return { ok: false, motivo: 'ajustes_mal_formados' };
        }

        const lang =
          data.language === 'es' || data.language === 'en'
            ? data.language
            : undefined;
        const theme =
          data.theme === 'dark' || data.theme === 'light'
            ? data.theme
            : undefined;

        const ajustesImportados = data.ajustes as AjustesApp;
        const saneadoKayaks = sanearKayakIds(ajustesImportados.kayakIds);
        const ajustesConDefaults: AjustesApp = {
          ...ajustesImportados,
          kayakIds: saneadoKayaks.kayakIds,
          categoriaKayak:
            ajustesImportados.categoriaKayak ??
            saneadoKayaks.categoriaKayak ??
            'K3',
          colorTabla: ajustesImportados.colorTabla ?? 'todo',
          filtroFranja: ajustesImportados.filtroFranja ?? true,
          ordenSubpestanas: ajustesImportados.ordenSubpestanas ?? [],
          unidades:
            (ajustesImportados.unidades as SistemaUnidades | undefined) ?? {
              ...UNIDADES_POR_DEFECTO,
            },
          umbralLlegadaM: sanearUmbralLlegada(
            ajustesImportados.umbralLlegadaM
          ),
          mapaNorteArriba: ajustesImportados.mapaNorteArriba ?? true,
          sonidoLlegada: ajustesImportados.sonidoLlegada ?? true,
          vibracionLlegada: ajustesImportados.vibracionLlegada ?? true,
          modeloPrevision: sanearModeloPrevision(
            ajustesImportados.modeloPrevision
          ),
          estiloWaypoints:
            ajustesImportados.estiloWaypoints === 'chincheta' ||
            ajustesImportados.estiloWaypoints === 'punto'
              ? ajustesImportados.estiloWaypoints
              : 'punto',
          unidadVelocidad:
            ajustesImportados.unidadVelocidad === 'kt' ||
            ajustesImportados.unidadVelocidad === 'kmh' ||
            ajustesImportados.unidadVelocidad === 'mph' ||
            ajustesImportados.unidadVelocidad === 'ms'
              ? ajustesImportados.unidadVelocidad
              : 'kt',
          densidadWaypointsTrack: sanearDensidadWaypointsTrack(
            ajustesImportados.densidadWaypointsTrack
          ),
          perfil: {
            ...PERFIL_DEFECTO,
            ...ajustesImportados.perfil,
          },
        };

        set(() => ({
          spots: data.spots as Spot[],
          weather: {},
          kayaksEditados: Array.isArray(data.kayaksEditados)
            ? (data.kayaksEditados as KayakEditado[])
            : [],
          ajustes: ajustesConDefaults,
          ...(lang ? { language: lang } : {}),
          ...(theme ? { theme } : {}),
        }));

        if (lang) void i18n.changeLanguage(lang);

        return { ok: true, spotsImportados: (data.spots as Spot[]).length };
      },
    }),
    {
      name: STORAGE_KEY,
      version: PERSIST_VERSION,
      migrate: (persistedState: unknown, version: number): unknown => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }
        const persisted = persistedState as Record<string, unknown>;
        if (version < 5) {
          const ajustes = persisted.ajustes;
          if (ajustes && typeof ajustes === 'object') {
            const aj = ajustes as Record<string, unknown>;
            if (aj.modeloPrevision === undefined) {
              aj.modeloPrevision = 'auto';
            }
          }
          if (persisted.weather && typeof persisted.weather === 'object') {
            const w = persisted.weather as Record<string, unknown>;
            const nuevo: Record<string, Record<string, unknown>> = {};
            for (const [spotId, valor] of Object.entries(w)) {
              if (
                valor &&
                typeof valor === 'object' &&
                'hourly' in (valor as Record<string, unknown>)
              ) {
                nuevo[spotId] = { ecmwf: valor };
              } else if (valor && typeof valor === 'object') {
                nuevo[spotId] = valor as Record<string, unknown>;
              }
            }
            persisted.weather = nuevo;
          }
        }
        return persisted;
      },
      merge: (persistedState: unknown, currentState: AppState): AppState => {
        const persisted = (persistedState as Partial<AppState>) ?? {};
        const state: AppState = {
          ...currentState,
          ...persisted,
          ajustes: {
            ...currentState.ajustes,
            ...(persisted.ajustes ?? {}),
          },
        };

        const saneado = sanearKayakIds(state.ajustes.kayakIds);
        state.ajustes.kayakIds = saneado.kayakIds;
        state.ajustes.categoriaKayak = getKayakActivo(
          saneado.kayakIds,
          state.kayaksEditados
        ).categoriaWKF;
        if (!Array.isArray(state.ajustes.ordenSubpestanas)) {
          state.ajustes.ordenSubpestanas = [];
        }

        if (!state.ajustes.unidades) {
          state.ajustes.unidades = { ...UNIDADES_POR_DEFECTO };
        } else {
          state.ajustes.unidades = {
            ...UNIDADES_POR_DEFECTO,
            ...state.ajustes.unidades,
          };
        }

        if (!state.ajustes.perfil) {
          state.ajustes.perfil = { ...PERFIL_DEFECTO };
        } else {
          state.ajustes.perfil = {
            ...PERFIL_DEFECTO,
            ...state.ajustes.perfil,
          };
        }

        if (
          typeof state.ajustes.perfil.pesoKayakistaKg !== 'number' ||
          !Number.isFinite(state.ajustes.perfil.pesoKayakistaKg) ||
          state.ajustes.perfil.pesoKayakistaKg < 30 ||
          state.ajustes.perfil.pesoKayakistaKg > 250
        ) {
          state.ajustes.perfil.pesoKayakistaKg = 90;
        }

        if (
          typeof state.ajustes.perfil.pesoEquipoKg !== 'number' ||
          !Number.isFinite(state.ajustes.perfil.pesoEquipoKg) ||
          state.ajustes.perfil.pesoEquipoKg < 0 ||
          state.ajustes.perfil.pesoEquipoKg > 500
        ) {
          state.ajustes.perfil.pesoEquipoKg = 0;
        }

        state.ajustes.umbralLlegadaM = sanearUmbralLlegada(
          state.ajustes.umbralLlegadaM
        );

        if (typeof state.ajustes.mapaNorteArriba !== 'boolean') {
          state.ajustes.mapaNorteArriba = true;
        }
        if (typeof state.ajustes.sonidoLlegada !== 'boolean') {
          state.ajustes.sonidoLlegada = true;
        }
        if (typeof state.ajustes.vibracionLlegada !== 'boolean') {
          state.ajustes.vibracionLlegada = true;
        }
        state.ajustes.modeloPrevision = sanearModeloPrevision(
          state.ajustes.modeloPrevision
        );
        if (typeof state.ajustes.mapaTactico !== 'boolean') {
          state.ajustes.mapaTactico = true;
        }
        if (
          state.ajustes.estiloWaypoints !== 'chincheta' &&
          state.ajustes.estiloWaypoints !== 'punto'
        ) {
          state.ajustes.estiloWaypoints = 'punto';
        }
        if (
          state.ajustes.unidadVelocidad !== 'kt' &&
          state.ajustes.unidadVelocidad !== 'kmh' &&
          state.ajustes.unidadVelocidad !== 'mph' &&
          state.ajustes.unidadVelocidad !== 'ms'
        ) {
          state.ajustes.unidadVelocidad = 'kt';
        }
        state.ajustes.densidadWaypointsTrack = sanearDensidadWaypointsTrack(
          state.ajustes.densidadWaypointsTrack
        );

        if (!state.weather || typeof state.weather !== 'object') {
          state.weather = {};
        }

        return state;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const currentIds = state.ajustes?.kayakIds;
        const saneado = sanearKayakIds(currentIds);
        const kayakActivo = getKayakActivo(
          saneado.kayakIds,
          state.kayaksEditados
        );
        state.setKayakIds(saneado.kayakIds);
        state.setCategoriaKayak(kayakActivo.categoriaWKF);
      },
    }
  )
);

(() => {
  try {
    const estadoInicial = useAppStore.getState();
    const currentIds = estadoInicial.ajustes?.kayakIds;
    const saneado = sanearKayakIds(currentIds);
    const kayakActivo = getKayakActivo(
      saneado.kayakIds,
      estadoInicial.kayaksEditados
    );
    useAppStore.setState((prev) => ({
      ajustes: {
        ...prev.ajustes,
        kayakIds: saneado.kayakIds,
        categoriaKayak: kayakActivo.categoriaWKF,
      },
    }));
  } catch {
    // ignore
  }
})();
// src/state/store.ts