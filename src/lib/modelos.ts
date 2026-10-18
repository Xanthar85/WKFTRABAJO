// src/lib/modelos.ts
// WKF — Selector de modelo de previsión.
// Fase M1: lista de modelos, cobertura por zona y modelo por defecto.
// No integra todavía con store, openmeteo ni UI.

export type ModeloId = 'ecmwf' | 'gfs' | 'icon' | 'harmonie';
export type ModeloPrevision = ModeloId | 'auto';

export interface Modelo {
  id: ModeloId;
  /** Nombre técnico que se pasa a Open-Meteo en el parámetro models=. */
  apiName: string;
  /** Clave i18n para el nombre visible. */
  i18nKey: string;
  /** true si es global, false si es regional. */
  global: boolean;
  /** Bounding box [sur, oeste, norte, este] si es regional. null si es global. */
  bbox: [number, number, number, number] | null;
}

/**
 * Bounding box aproximado de Harmonie (HAROME).
 * Cubre Europa occidental, incluida España peninsular, Baleares,
 * Francia, Alemania, Benelux, Reino Unido, Irlanda, Italia,
 * Suiza, Austria, Portugal y parte de Escandinavia.
 * Se ajusta en implementación si Open-Meteo confirma otro.
 */
const HARMONIE_BBOX: [number, number, number, number] = [
  35,   // sur
  -12,  // oeste
  60,   // norte
  20,   // este
];

export const MODELOS: Modelo[] = [
  {
    id: 'ecmwf',
    apiName: 'ecmwf_ifs025',
    i18nKey: 'modelos.ecmwf',
    global: true,
    bbox: null,
  },
  {
    id: 'gfs',
    apiName: 'gfs_seamless',
    i18nKey: 'modelos.gfs',
    global: true,
    bbox: null,
  },
  {
    id: 'icon',
    apiName: 'icon_seamless',
    i18nKey: 'modelos.icon',
    global: true,
    bbox: null,
  },
  {
    id: 'harmonie',
    apiName: 'meteofrance_arome_france_hd',
    i18nKey: 'modelos.harmonie',
    global: false,
    bbox: HARMONIE_BBOX,
  },
];

export const MODELO_POR_DEFECTO: ModeloId = 'ecmwf';
export const MODELO_AUTO: ModeloPrevision = 'auto';

/** Devuelve el modelo por id, o undefined si no existe. */
export function getModelo(id: ModeloId): Modelo | undefined {
  return MODELOS.find((m) => m.id === id);
}

/** Comprueba si un modelo cubre una coordenada. */
export function modeloCubreZona(
  modeloId: ModeloId,
  lat: number,
  lon: number
): boolean {
  const modelo = getModelo(modeloId);
  if (!modelo) return false;
  if (modelo.global || modelo.bbox === null) return true;
  const [sur, oeste, norte, este] = modelo.bbox;
  return lat >= sur && lat <= norte && lon >= oeste && lon <= este;
}

/**
 * Devuelve el id del mejor modelo para una zona.
 * Si Harmonie cubre la zona, Harmonie; si no, ECMWF.
 */
export function modeloPorDefectoParaZona(
  lat: number,
  lon: number
): ModeloId {
  if (modeloCubreZona('harmonie', lat, lon)) return 'harmonie';
  return MODELO_POR_DEFECTO;
}

/**
 * Resuelve el modelo "auto" a un id concreto según la zona.
 * Si el modelo no es auto, lo devuelve tal cual.
 */
export function resolverModelo(
  modelo: ModeloPrevision,
  lat: number,
  lon: number
): ModeloId {
  if (modelo === 'auto') return modeloPorDefectoParaZona(lat, lon);
  return modelo;
}

// src/lib/modelos.ts