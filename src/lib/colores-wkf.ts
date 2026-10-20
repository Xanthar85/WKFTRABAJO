// src/lib/colores-wkf.ts
// WKF — Paleta cerrada de colores neón WKF + utilidades de color
// para el mapa táctico (F4-bis, fase MTmaster).
//
// Funciones:
//   · PALETA_WKF: array cerrado de 8 colores neón con nombre visible.
//   · ajustarColorParaFondoOscuro(color): recibe un color CSS
//     (#rgb, #rrggbb, rgb(...), rgba(...), hsl(...)) y devuelve el
//     mismo color si tiene contraste suficiente con el negro, o el
//     color WKF más cercano en tono si es invisible.
//   · colorEsValido(color): validación rápida de cadena.
//
// Sin dependencias externas. Sin backend. Todo en cliente.

export interface ColorWKf {
  id: string;
  nombre: string;
  hex: string;
}

export const PALETA_WKF: ColorWKf[] = [
  { id: 'verde',          nombre: 'Verde neón',        hex: '#00E56A' },
  { id: 'magenta',        nombre: 'Magenta neón',      hex: '#FF00FF' },
  { id: 'cian',           nombre: 'Cian neón',         hex: '#00B8FF' },
  { id: 'amarillo',       nombre: 'Amarillo neón',     hex: '#E5E500' },
  { id: 'naranja',        nombre: 'Naranja neón',      hex: '#FF8A00' },
  { id: 'rojo',           nombre: 'Rojo neón',         hex: '#FF2D55' },
  { id: 'violeta',        nombre: 'Violeta neón',      hex: '#A855F7' },
  { id: 'azul',           nombre: 'Azul eléctrico',    hex: '#3355FF' },
  { id: 'fluor',          nombre: 'Verde flúor',       hex: '#39FF14' },
  { id: 'rojo-claro',     nombre: 'Rojo neón claro',   hex: '#FF073A' },
  { id: 'rosa',           nombre: 'Rosa chicle',       hex: '#FF6EC7' },
  { id: 'indigo',         nombre: 'Azul índigo',       hex: '#4D4DFF' },
  { id: 'cian-puro',      nombre: 'Cian puro',         hex: '#00FFFF' },
  { id: 'oro',            nombre: 'Oro',               hex: '#FFD700' },
  { id: 'naranja-quemado',nombre: 'Naranja quemado',   hex: '#FF5F1F' },
  { id: 'purpura',        nombre: 'Púrpura neón',      hex: '#B026FF' },
  { id: 'esmeralda',      nombre: 'Esmeralda',         hex: '#50C878' },
  { id: 'magenta-intenso',nombre: 'Magenta intenso',   hex: '#FF00AA' },
  { id: 'aguamarina',     nombre: 'Aguamarina',        hex: '#00FFAA' },
  { id: 'rosa-profundo',  nombre: 'Rosa profundo',     hex: '#FF1493' },
  { id: 'dodger',         nombre: 'Azul dodger',       hex: '#1E90FF' },
  { id: 'verde-amarillo', nombre: 'Verde amarillento', hex: '#ADFF2F' },
  { id: 'naranja-rojizo', nombre: 'Naranja rojizo',    hex: '#FF4500' },
  { id: 'violeta-oscuro', nombre: 'Violeta oscuro',    hex: '#9400D3' },
];

export const COLOR_PUNTO_DEFECTO = '#00E56A';
export const COLOR_LINEA_DEFECTO = '#FF00FF';
export const COLOR_RELLENO_DEFECTO = '#00E56A';

// Umbral de contraste con el negro. Ratio 3:1 es el mínimo aceptable
// para elementos gráficos no textuales según WCAG.
const CONTRASTE_MINIMO = 3.0;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parsearColor(cadena: string | undefined | null): RGB | null {
  if (!cadena || typeof cadena !== 'string') return null;
  const s = cadena.trim().toLowerCase();

  // #rgb
  if (/^#[0-9a-f]{3}$/.test(s)) {
    return {
      r: parseInt(s[1] + s[1], 16),
      g: parseInt(s[2] + s[2], 16),
      b: parseInt(s[3] + s[3], 16),
    };
  }

  // #rrggbb
  if (/^#[0-9a-f]{6}$/.test(s)) {
    return {
      r: parseInt(s.slice(1, 3), 16),
      g: parseInt(s.slice(3, 5), 16),
      b: parseInt(s.slice(5, 7), 16),
    };
  }

  // rgb(r, g, b) o rgba(r, g, b, a)
  const rgbMatch = s.match(
    /^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/
  );
  if (rgbMatch) {
    const r = Math.round(parseFloat(rgbMatch[1]));
    const g = Math.round(parseFloat(rgbMatch[2]));
    const b = Math.round(parseFloat(rgbMatch[3]));
    if ([r, g, b].every((v) => Number.isFinite(v) && v >= 0 && v <= 255)) {
      return { r, g, b };
    }
    return null;
  }

  // hsl(h, s%, l%) — conversión básica
  const hslMatch = s.match(
    /^hsla?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%/
  );
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) % 360;
    const sat = parseFloat(hslMatch[2]) / 100;
    const lig = parseFloat(hslMatch[3]) / 100;
    if (
      Number.isFinite(h) &&
      Number.isFinite(sat) &&
      Number.isFinite(lig)
    ) {
      const rgb = hslARgb(h, sat, lig);
      return rgb;
    }
    return null;
  }

  return null;
}

function hslARgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hh >= 0 && hh < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hh < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hh < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hh < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (hh < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function luminanciaRelativa({ r, g, b }: RGB): number {
  const comp = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * comp(r) + 0.7152 * comp(g) + 0.0722 * comp(b);
}

function contrasteConNegro(rgb: RGB): number {
  // Negro puro: luminancia 0.
  // Contraste = (L1 + 0.05) / (L2 + 0.05), con L2 = 0.
  const L = luminanciaRelativa(rgb);
  return (L + 0.05) / 0.05;
}

function tono(rgb: RGB): number {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

function distanciaTono(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function wKfMasCercanoEnTono(rgb: RGB): string {
  const h = tono(rgb);
  let mejor = PALETA_WKF[0];
  let mejorDist = Number.POSITIVE_INFINITY;
  for (const c of PALETA_WKF) {
    const cRgb = parsearColor(c.hex);
    if (!cRgb) continue;
    const dist = distanciaTono(h, tono(cRgb));
    if (dist < mejorDist) {
      mejorDist = dist;
      mejor = c;
    }
  }
  return mejor.hex;
}

export function colorEsValido(color: unknown): color is string {
  if (typeof color !== 'string') return false;
  return parsearColor(color) != null;
}

/**
 * Si el color tiene contraste suficiente con el negro, se devuelve
 * tal cual (normalizado a hex si era rgb/hsl). Si no, se sustituye
 * por el color WKF más cercano en tono.
 */
export function ajustarColorParaFondoOscuro(
  color: string | undefined | null
): string | null {
  if (!color) return null;
  const rgb = parsearColor(color);
  if (!rgb) return null;
  const contraste = contrasteConNegro(rgb);
  if (contraste >= CONTRASTE_MINIMO) {
    // Devolver hex normalizado para que Leaflet no tenga sorpresas.
    return rgbAHex(rgb);
  }
  return wKfMasCercanoEnTono(rgb);
}

/**
 * Igual que ajustarColorParaFondoOscuro, pero si el color es null o
 * inválido, devuelve `fallback`. Útil para relleno de polígonos.
 */
export function ajustarColorConFallback(
  color: string | undefined | null,
  fallback: string
): string {
  const ajustado = ajustarColorParaFondoOscuro(color);
  return ajustado ?? fallback;
}

function rgbAHex({ r, g, b }: RGB): string {
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function nombreDeColorWKf(hex: string | undefined | null): string | null {
  if (!hex) return null;
  const norm = hex.trim().toLowerCase();
  const encontrado = PALETA_WKF.find((c) => c.hex.toLowerCase() === norm);
  return encontrado ? encontrado.nombre : null;
}
// src/lib/colores-wkf.ts