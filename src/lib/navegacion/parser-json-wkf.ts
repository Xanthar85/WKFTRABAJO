// src/lib/navegacion/parser-json-wkf.ts
// WKF — Parser del JSON interno WKF (F4 — Importar).
//
// Lee dos formatos de JSON WKF:
//   1. Export de UN waypoint suelto (F2.2 → Compartir → JSON).
//   2. Backup completo de la capa de navegación.
//
// No toca IndexedDB. Devuelve los datos crudos y el store decide
// qué hacer con ellos.

import type { BloqueCapas } from '../../db/capas-repo.ts';

export interface WaypointImportado {
  nombre: string;
  lat: number;
  lon: number;
  nota?: string;
}

export interface RutaImportada {
  nombre: string;
  nombresWaypoints: string[];
  nota?: string;
  origen: 'manual' | 'track';
}

export interface BloqueCapasImportado {
  nombre: string;
  formato: BloqueCapas['formato'];
  importadoEn: number;
  capas: Array<{
    nombre: string;
    visible: boolean;
    elementos: BloqueCapas['capas'][number]['elementos'];
  }>;
}

export interface ResultadoJSONWKF {
  waypoints: WaypointImportado[];
  rutas: RutaImportada[];
  bloquesCapas: BloqueCapasImportado[];
  formato: 'wkf-waypoint' | 'wkf-navegacion' | 'desconocido';
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function esNumeroFinito(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function validarCoords(lat: unknown, lon: unknown): boolean {
  if (!esNumeroFinito(lat) || !esNumeroFinito(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

function parsearWaypointSuelto(
  data: Record<string, unknown>
): ResultadoJSONWKF | null {
  if (data.formato !== 'wkf-waypoint') return null;
  const wp = data.waypoint;
  if (!esObjeto(wp)) return null;

  const nombre =
    typeof wp.nombre === 'string' && wp.nombre.trim() !== ''
      ? wp.nombre.trim()
      : 'Waypoint importado';

  if (!validarCoords(wp.lat, wp.lon)) return null;

  const nota =
    typeof wp.nota === 'string' && wp.nota.trim() !== ''
      ? wp.nota.trim()
      : undefined;

  return {
    waypoints: [
      {
        nombre,
        lat: wp.lat as number,
        lon: wp.lon as number,
        nota,
      },
    ],
    rutas: [],
    bloquesCapas: [],
    formato: 'wkf-waypoint',
  };
}

function parsearWaypointsDeBackup(raw: unknown): WaypointImportado[] {
  if (!Array.isArray(raw)) return [];
  const out: WaypointImportado[] = [];
  for (const item of raw) {
    if (!esObjeto(item)) continue;
    if (!validarCoords(item.lat, item.lon)) continue;
    const nombre =
      typeof item.nombre === 'string' && item.nombre.trim() !== ''
        ? item.nombre.trim()
        : 'Waypoint importado';
    const nota =
      typeof item.nota === 'string' && item.nota.trim() !== ''
        ? item.nota.trim()
        : undefined;
    out.push({
      nombre,
      lat: item.lat as number,
      lon: item.lon as number,
      nota,
    });
  }
  return out;
}

function parsearRutasDeBackup(
  raw: unknown,
  waypointsDisponibles: WaypointImportado[]
): RutaImportada[] {
  if (!Array.isArray(raw)) return [];
  const out: RutaImportada[] = [];
  const nombresSet = new Set(waypointsDisponibles.map((w) => w.nombre));

  for (const item of raw) {
    if (!esObjeto(item)) continue;
    const nombre =
      typeof item.nombre === 'string' && item.nombre.trim() !== ''
        ? item.nombre.trim()
        : 'Ruta importada';

    let nombres: string[] = [];
    if (Array.isArray(item.nombresWaypoints)) {
      nombres = item.nombresWaypoints.filter(
        (n): n is string => typeof n === 'string' && n.trim() !== ''
      );
    }

    const nombresFiltrados = nombres.filter((n) => nombresSet.has(n));
    if (nombresFiltrados.length < 2) continue;

    const nota =
      typeof item.nota === 'string' && item.nota.trim() !== ''
        ? item.nota.trim()
        : undefined;

    const origen: 'manual' | 'track' =
      item.origen === 'track' ? 'track' : 'manual';

    out.push({
      nombre,
      nombresWaypoints: nombresFiltrados,
      nota,
      origen,
    });
  }
  return out;
}

function parsearBloquesDeBackup(raw: unknown): BloqueCapasImportado[] {
  if (!Array.isArray(raw)) return [];
  const out: BloqueCapasImportado[] = [];
  for (const item of raw) {
    if (!esObjeto(item)) continue;
    if (typeof item.nombre !== 'string') continue;
    if (!Array.isArray(item.capas)) continue;

    const formatoRaw = item.formato;
    const formato: BloqueCapas['formato'] =
      formatoRaw === 'gpx' ||
      formatoRaw === 'kml' ||
      formatoRaw === 'kmz' ||
      formatoRaw === 'json'
        ? formatoRaw
        : 'json';

    const capas: BloqueCapasImportado['capas'] = [];
    for (const c of item.capas) {
      if (!esObjeto(c)) continue;
      if (typeof c.nombre !== 'string') continue;
      if (!Array.isArray(c.elementos)) continue;
      capas.push({
        nombre: c.nombre,
        visible: c.visible !== false,
        elementos: c.elementos as BloqueCapas['capas'][number]['elementos'],
      });
    }

    if (capas.length === 0) continue;

    out.push({
      nombre: item.nombre,
      formato,
      importadoEn:
        esNumeroFinito(item.importadoEn) && item.importadoEn > 0
          ? (item.importadoEn as number)
          : Date.now(),
      capas,
    });
  }
  return out;
}

function parsearBackupNavegacion(
  data: Record<string, unknown>
): ResultadoJSONWKF | null {
  if (data.formato !== 'wkf-navegacion') return null;

  const waypoints = parsearWaypointsDeBackup(data.waypoints);
  const rutas = parsearRutasDeBackup(data.rutas, waypoints);
  const bloquesCapas = parsearBloquesDeBackup(data.bloquesCapas);

  return {
    waypoints,
    rutas,
    bloquesCapas,
    formato: 'wkf-navegacion',
  };
}

export function parsearJSONWKF(texto: string): ResultadoJSONWKF {
  let data: unknown;
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error('JSON mal formado');
  }

  if (!esObjeto(data)) {
    throw new Error('El JSON no es un objeto');
  }

  const suelto = parsearWaypointSuelto(data);
  if (suelto) return suelto;

  const backup = parsearBackupNavegacion(data);
  if (backup) return backup;

  return {
    waypoints: [],
    rutas: [],
    bloquesCapas: [],
    formato: 'desconocido',
  };
}

export function detectarFormatoJSONWKF(
  texto: string
): 'wkf-waypoint' | 'wkf-navegacion' | 'desconocido' {
  try {
    const data = JSON.parse(texto);
    if (!esObjeto(data)) return 'desconocido';
    if (data.formato === 'wkf-waypoint') return 'wkf-waypoint';
    if (data.formato === 'wkf-navegacion') return 'wkf-navegacion';
    return 'desconocido';
  } catch {
    return 'desconocido';
  }
}