// src/lib/colores-wkf.ts
// WKF — Paleta de colores WKF y utilidades de contraste.

export interface ColorWkf {
  id: string;
  nombre: string;
  hex: string;
}

export const PALETA_WKF: ColorWkf[] = [
  { id: 'verde', nombre: 'Verde WKF', hex: '#00E56A' },
  { id: 'cian', nombre: 'Cian WKF', hex: '#00B8FF' },
  { id: 'magenta', nombre: 'Magenta', hex: '#FF00FF' },
  { id: 'amarillo', nombre: 'Amarillo', hex: '#E5E500' },
  { id: 'naranja', nombre: 'Naranja', hex: '#FF8A00' },
  { id: 'rojo', nombre: 'Rojo', hex: '#FF2D55' },
  { id: 'rosa', nombre: 'Rosa', hex: '#FF69B4' },
  { id: 'purpura', nombre: 'Púrpura', hex: '#8A2BE2' },
  { id: 'blanco', nombre: 'Blanco', hex: '#FFFFFF' },
  { id: 'gris', nombre: 'Gris', hex: '#888888' },
  { id: 'lima', nombre: 'Lima', hex: '#32CD32' },
  { id: 'turquesa', nombre: 'Turquesa', hex: '#40E0D0' },
  { id: 'azul', nombre: 'Azul', hex: '#0000FF' },
  { id: 'oro', nombre: 'Oro', hex: '#FFD700' },
  { id: 'coral', nombre: 'Coral', hex: '#FF7F50' },
  { id: 'fucsia', nombre: 'Fucsia', hex: '#FF00AA' },
  { id: 'verde_oliva', nombre: 'Verde oliva', hex: '#808000' },
  { id: 'verde_mar', nombre: 'Verde mar', hex: '#2E8B57' },
  { id: 'azul_marino', nombre: 'Azul marino', hex: '#000080' },
  { id: 'purpura_oscuro', nombre: 'Púrpura oscuro', hex: '#4B0082' },
  { id: 'marron', nombre: 'Marrón', hex: '#A52A2A' },
  { id: 'gris_oscuro', nombre: 'Gris oscuro', hex: '#333333' },
  { id: 'blanco_hueso', nombre: 'Blanco hueso', hex: '#FFFFF0' },
  { id: 'amarillo_limon', nombre: 'Amarillo limón', hex: '#FFFF00' },
];

// Convierte #RRGGBB a { r, g, b }
function hexARgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
}

// Calcula la luminancia relativa para saber si un color es casi invisible sobre negro.
export function esColorInvisible(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return true;
  try {
    const { r, g, b } = hexARgb(hex);
    // Fórmula rápida de brillo
    const brillo = (r * 299 + g * 587 + b * 114) / 1000;
    return brillo < 40; // Si es muy oscuro, es invisible.
  } catch {
    return true;
  }
}

// Busca el color WKF más parecido (distancia euclidiana simple).
export function colorWkfMasCercano(hex: string): string {
  if (!hex || typeof hex !== 'string') return PALETA_WKF[0].hex;
  try {
    const obj = hexARgb(hex);
    let mejor = PALETA_WKF[0].hex;
    let minDist = Infinity;

    for (const c of PALETA_WKF) {
      const cObj = hexARgb(c.hex);
      const dist = Math.pow(obj.r - cObj.r, 2) + Math.pow(obj.g - cObj.g, 2) + Math.pow(obj.b - cObj.b, 2);
      if (dist < minDist) {
        minDist = dist;
        mejor = c.hex;
      }
    }
    return mejor;
  } catch {
    return PALETA_WKF[0].hex;
  }
}
// src/lib/colores-wkf.ts