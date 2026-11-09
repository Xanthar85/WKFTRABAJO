// src/lib/navegacion/parser-gpx.ts
// WKF — Parser de GPX (F4 — Importar).
// Lee un XML de GPX 1.0 o 1.1 y devuelve waypoints sueltos y rutas
// (trk y rte) en formato interno del proyecto. No toca IndexedDB:
// eso lo hace el store.
//
// Estructura de salida:
//   - waypoints: puntos sueltos (wpt).
//   - rutas: cada uno de los <rte> y <trk> como una ruta con
//     waypoints anónimos creados al vuelo.
//
// El parser no decide si los puntos se guardan como waypoints o
// como parte de una ruta. Devuelve la información cruda y el
// store decide. Aquí hacemos el mínimo: leer y mapear.

export interface WaypointGPX {
  nombre: string;
  lat: number;
  lon: number;
  nota?: string;
  color?: string;
}

export interface RutaGPX {
  nombre: string;
  puntos: WaypointGPX[];
  color?: string;
}

export interface ResultadoGPX {
  waypoints: WaypointGPX[];
  rutas: RutaGPX[];
}

// Lee un atributo del elemento. Devuelve null si no existe.
function leerAtributo(el: Element, nombre: string): string | null {
  if (!el.hasAttribute(nombre)) return null;
  const v = el.getAttribute(nombre);
  return v != null && v !== '' ? v : null;
}

// Lee el texto de la primera etiqueta hija con ese nombre. Ignora
// namespaces (GPX usa el namespace estándar y los nombres son
// consistentes en la práctica).
function leerTexto(el: Element, nombre: string): string | null {
  const hijos = el.getElementsByTagName('*');
  for (let i = 0; i < hijos.length; i++) {
    const h = hijos[i];
    const local = h.localName ?? h.nodeName;
    if (local === nombre) {
      const t = h.textContent;
      if (t != null && t.trim() !== '') return t.trim();
    }
  }
  return null;
}

function parsearCoordenada(el: Element): { lat: number; lon: number } | null {
  const lat = leerAtributo(el, 'lat');
  const lon = leerAtributo(el, 'lon');
  if (lat == null || lon == null) return null;
  const latN = parseFloat(lat);
  const lonN = parseFloat(lon);
  if (!Number.isFinite(latN) || !Number.isFinite(lonN)) return null;
  if (latN < -90 || latN > 90) return null;
  if (lonN < -180 || lonN > 180) return null;
  return { lat: latN, lon: lonN };
}

const COLORES_GARMIN: Record<string, string> = {
  black: '#000000',
  darkred: '#8B0000',
  red: '#FF2D55',
  darkgreen: '#006400',
  green: '#00E56A',
  darkyellow: '#B5A642',
  yellow: '#E5E500',
  darkblue: '#00008B',
  blue: '#0000FF',
  darkmagenta: '#8B008B',
  magenta: '#FF00FF',
  darkcyan: '#008B8B',
  cyan: '#00B8FF',
  lightgray: '#D3D3D3',
  gray: '#888888',
  darkgray: '#A9A9A9',
  white: '#FFFFFF',
  orange: '#FF8A00',
  pink: '#FF69B4',
  purple: '#8A2BE2',
};

// Extrae color en extensiones GPX estándar, Garmin (DisplayColor) o hex
function extraerColorGPX(el: Element): string | undefined {
  const todos = el.getElementsByTagName('*');
  for (let i = 0; i < todos.length; i++) {
    const h = todos[i];
    const local = (h.localName ?? h.nodeName).toLowerCase();
    if (local === 'color' || local === 'displaycolor') {
      const val = h.textContent?.trim();
      if (!val) continue;
      const lower = val.toLowerCase();
      if (COLORES_GARMIN[lower]) {
        return COLORES_GARMIN[lower];
      }
      const hex = val.replace(/^#/, '');
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        return `#${hex.toUpperCase()}`;
      }
      if (/^[0-9a-fA-F]{8}$/.test(hex)) {
        // En algunos casos viene como AABBGGRR o AARRGGBB
        return `#${hex.slice(2, 8).toUpperCase()}`;
      }
    }
  }
  return undefined;
}

function parsearWpt(el: Element, indice: number): WaypointGPX | null {
  const coords = parsearCoordenada(el);
  if (!coords) return null;
  const nombre = leerTexto(el, 'name') ?? `Waypoint ${indice}`;
  const desc = leerTexto(el, 'desc') ?? leerTexto(el, 'cmt') ?? undefined;
  const color = extraerColorGPX(el);
  return {
    nombre,
    lat: coords.lat,
    lon: coords.lon,
    nota: desc ?? undefined,
    color,
  };
}

// Un <trk> contiene uno o varios <trkseg>. Cada <trkseg> tiene
// <trkpt>. Aplanamos todos los trkseg en una sola lista de puntos
// (el modelo interno de WKF no distingue segmentos).
function parsearTrk(el: Element, indice: number): RutaGPX | null {
  const nombre = leerTexto(el, 'name') ?? `Ruta ${indice}`;
  const color = extraerColorGPX(el);
  const puntos: WaypointGPX[] = [];
  const trkpts = el.getElementsByTagName('*');
  let contador = 1;
  for (let i = 0; i < trkpts.length; i++) {
    const h = trkpts[i];
    const local = h.localName ?? h.nodeName;
    if (local !== 'trkpt') continue;
    const coords = parsearCoordenada(h);
    if (!coords) continue;
    puntos.push({
      nombre: `${nombre} ${contador}`,
      lat: coords.lat,
      lon: coords.lon,
    });
    contador++;
  }
  if (puntos.length < 2) return null;
  return { nombre, puntos, color };
}

// Un <rte> contiene <rtept>. Misma idea que trk.
function parsearRte(el: Element, indice: number): RutaGPX | null {
  const nombre = leerTexto(el, 'name') ?? `Ruta ${indice}`;
  const color = extraerColorGPX(el);
  const puntos: WaypointGPX[] = [];
  const rtepts = el.getElementsByTagName('*');
  let contador = 1;
  for (let i = 0; i < rtepts.length; i++) {
    const h = rtepts[i];
    const local = h.localName ?? h.nodeName;
    if (local !== 'rtept') continue;
    const coords = parsearCoordenada(h);
    if (!coords) continue;
    puntos.push({
      nombre: `${nombre} ${contador}`,
      lat: coords.lat,
      lon: coords.lon,
    });
    contador++;
  }
  if (puntos.length < 2) return null;
  return { nombre, puntos, color };
}

export function parsearGPX(contenido: string): ResultadoGPX {
  const parser = new DOMParser();
  const doc = parser.parseFromString(contenido, 'application/xml');

  // DOMParser no lanza: si el XML está mal formado, mete un
  // <parsererror>. Lo detectamos.
  const errores = doc.getElementsByTagName('parsererror');
  if (errores.length > 0) {
    throw new Error('GPX mal formado');
  }

  const resultado: ResultadoGPX = { waypoints: [], rutas: [] };

  const todos = doc.getElementsByTagName('*');

  let contWpt = 1;
  let contRuta = 1;

  for (let i = 0; i < todos.length; i++) {
    const el = todos[i];
    const local = el.localName ?? el.nodeName;

    if (local === 'wpt') {
      const w = parsearWpt(el, contWpt);
      if (w) {
        resultado.waypoints.push(w);
        contWpt++;
      }
    } else if (local === 'trk') {
      const r = parsearTrk(el, contRuta);
      if (r) {
        resultado.rutas.push(r);
        contRuta++;
      }
    } else if (local === 'rte') {
      const r = parsearRte(el, contRuta);
      if (r) {
        resultado.rutas.push(r);
        contRuta++;
      }
    }
  }

  return resultado;
}