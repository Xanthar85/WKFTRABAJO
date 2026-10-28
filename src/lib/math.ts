// src/lib/math.ts
// WKF — Constantes y funciones matemáticas compartidas.
// Centraliza duplicados que estaban repartidos en varios archivos.
// Los archivos antiguos deben importar de aquí en lugar de
// redeclarar sus propias copias.

export const RAD = Math.PI / 180;

/** Radio medio de la Tierra en metros (esfera WGS84 aproximada). */
export const RADIO_TIERRA_M = 6371000;

/** Ciclo lunar en días. */
export const CICLO_LUNAR = 29.530588853;

/** Instante de referencia de la luna nueva: 2000-01-06 18:14 UTC. */
export const LUNA_NUEVA_REF = Date.UTC(2000, 0, 6, 18, 14, 0);

/**
 * Ángulo horario para un astro dado.
 * - lat: latitud del observador en grados.
 * - decl: declinación del astro en radianes.
 * - elevation: elevación en grados (0 = horizonte, -6 = civil,
 *   -12 = náutico, -18 = astronómico).
 * Devuelve el ángulo horario en grados o null si no hay orto/ocaso.
 */
export function anguloHorario(
  lat: number,
  decl: number,
  elevation: number
): number | null {
  const cosH =
    (Math.sin(elevation * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) /
    (Math.cos(lat * RAD) * Math.cos(decl));

  if (cosH > 1) return null;
  if (cosH < -1) return null;
  return Math.acos(cosH) / RAD;
}

// src/lib/math.ts