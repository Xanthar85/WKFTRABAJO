// src/lib/navegacion/parser-json-wkf.ts
// WKF — Parser del JSON interno WKF (F4 — Importar).
//
// Lee dos formatos de JSON WKF:
//   1. Export de UN waypoint suelto (el que hace la F2.2 con
//      Compartir → JSON). Estructura:
//        { formato: 'wkf-waypoint', version: 1, waypoint: {...} }
//   2. Backup completo de la capa de navegación:
//        {
//          formato: 'wkf-navegacion',
//          version: 1,
//          waypoints: [...],
//          rutas: [...],
//          bloquesCapas: [...]
//        }
//
// No toca IndexedDB. Devuelve los datos crudos y el store decide
// qué hacer con ellos.
//
// La validación es defensiva: si un campo está mal, se descarta
// ese elemento y se sigue con el resto. Nunca reventamos el
// import entero por un solo elemento mal formado.

import type { Waypoint } from '../../db/waypoints-repo.ts';
import type { Ruta } from '../../db/rutas-repo.ts';
import type { BloqueCapas } from '../../db/capas-repo.ts';

export interface WaypointImportado {
  nombre: string;
  lat: number;
  lon: number;
  nota?: string;
}

export interface RutaImportada {
  nombre: string;
  /** Nombres de waypoints que componen la ruta. El store los
   *  resolverá a ids reales al insertarlos. */
  nombresWaypoints: string[];
  nota?: string;
  origen: Ruta['origen'];
}

export interface ResultadoJSONWKF {
  waypoints: WaypointImportado[];
  rutas: RutaImportada[];
  bloquesCapas: Omit<BloqueCapas, 'id'>[];
  /** Descripción corta del formato detectado. */
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

// ─── Parser del waypoint suelto (formato 'wkf-waypoint') ─────────

function parsearWaypointSuelto(
  data: Record<string, unknown>
): ResultadoJSONWKF | null {
  if (data.formato !== 'wkf-waypoint') return null;
  const wp = data.waypoint;
  if (!esObjeto(wp)) return null;

  const nombre = typeof wp.nombre === 'string' && wp.nombre.trim() !== ''
    ? wp.nombre.trim()
    : 'Waypoint importado';

  if (!validarCoords(wp.lat, wp.lon)) return null;

  const nota = typeof wp.nota === 'string' && wp.nota.trim() !== ''
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

// ─── Parser del backup completo (formato 'wkf-navegacion') ───────

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

  // Índice de nombres → para permitir que el backup guarde rutas
  // por nombre en vez de por id (más portable entre dispositivos).
  const nombresSet = new Set(waypointsDisponibles.map((w) => w.nombre));

  for (const item of raw) {
    if (!esObjeto(item)) continue;
    const nombre =
      typeof item.nombre === 'string' && item.nombre.trim() !== ''
        ? item.nombre.trim()
        : 'Ruta importada';

    // Aceptamos dos formas:
    //   - nombresWaypoints: string[] (portable)
    //   - waypointIds: string[] (por id, lo ignoramos: los ids no
    //     son estables entre dispositivos)
    let nombres: string[] = [];
    if (Array.isArray(item.nombresWaypoints)) {
      nombres = item.nombresWaypoints.filter(
        (n): n is string => typeof n === 'string' && n.trim() !== ''
      );
    } else if (Array.isArray(item.waypointIds)) {
      // Ignoramos esta forma, no podemos resolver ids.
      nombres = [];
    }

    // Solo aceptamos las rutas cuyos waypoints estén disponibles.
    const nombresFiltrados = nombres.filter((n) => nombresSet.has(n));
    if (nombresFiltrados.length < 2) continue;

    const nota =
      typeof item.nota === 'string' && item.nota.trim() !== ''
        ? item.nota.trim()
        : undefined;

    const origen: Ruta['origen'] =
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

function parsearBloquesDeBackup(raw: unknown): Omit<BloqueCapas, 'id'>[] {
  if (!Array.isArray(raw)) return [];
  const out: Omit<BloqueCapas, 'id'>[] = [];
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

    const capas: Omit<BloqueCapas['capas'][number], 'id'>[] = [];
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

// ─── Punto de entrada ────────────────────────────────────────────

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

  // Intento 1: waypoint suelto.
  const suelto = parsearWaypointSuelto(data);
  if (suelto) return suelto;

  // Intento 2: backup completo de navegación.
  const backup = parsearBackupNavegacion(data);
  if (backup) return backup;

  // Formato no reconocido.
  return {
    waypoints: [],
    rutas: [],
    bloquesCapas: [],
    formato: 'desconocido',
  };
}

// Utilidad para detectar el formato sin parsear del todo. Útil si
// en algún momento queremos mostrar previsualización.
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