// src/lib/navegacion/bearing.ts
// WKF — Cálculos de rumbo para la navegación GPS (F6).
// Funciones puras, sin dependencias, sin estado.
//
// - bearingOrtodromico: rumbo inicial entre dos coordenadas (0-360°).
//   Fórmula estándar de navegación ortodrómica (great-circle initial bearing).
// - distanciaHaversine: distancia en metros entre dos coordenadas.
// - normalizarGrados: pasa cualquier ángulo a 0-360.
// - anguloRelativo: diferencia entre dos rumbos, normalizada a -180/+180.
//   Sirve para calcular cuánto tiene que girar el kayak hacia el waypoint.

import { RAD, RADIO_TIERRA_M } from '../math.ts';

/** Pasa cualquier ángulo a 0-360. */
export function normalizarGrados(grados: number): number {
  const v = grados % 360;
  return v < 0 ? v + 360 : v;
}

/**
 * Rumbo inicial ortodrómico entre dos puntos.
 * Devuelve grados en 0-360 (0 = norte, 90 = este).
 */
export function bearingOrtodromico(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const fi1 = lat1 * RAD;
  const fi2 = lat2 * RAD;
  const dLon = (lon2 - lon1) * RAD;

  const y = Math.sin(dLon) * Math.cos(fi2);
  const x =
    Math.cos(fi1) * Math.sin(fi2) -
    Math.sin(fi1) * Math.cos(fi2) * Math.cos(dLon);

  const brng = Math.atan2(y, x) / RAD;
  return normalizarGrados(brng);
}

/**
 * Distancia haversine en metros entre dos coordenadas.
 */
export function distanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const fi1 = lat1 * RAD;
  const fi2 = lat2 * RAD;
  const dFi = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;

  const a =
    Math.sin(dFi / 2) ** 2 +
    Math.cos(fi1) * Math.cos(fi2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RADIO_TIERRA_M * c;
}

/**
 * Diferencia angular entre dos rumbos, normalizada a -180/+180.
 * Positivo = el segundo rumbo está a la derecha del primero (giro horario).
 * Negativo = a la izquierda.
 */
export function anguloRelativo(rumboA: number, rumboB: number): number {
  const diff = normalizarGrados(rumboB - rumboA);
  return diff > 180 ? diff - 360 : diff;
}

/**
 * Convierte metros a la unidad de distancia del usuario.
 * Devuelve { valor, sufijo } listo para pintar.
 * - < 1000 m: metros.
 * - >= 1000 m: km (o millas si el usuario lo pide).
 */
export type UnidadDistanciaNavegacion = 'm' | 'km' | 'mi' | 'nmi';

export function formatearDistanciaNavegacion(
  metros: number,
  unidad: UnidadDistanciaNavegacion = 'km'
): { valor: string; sufijo: string } {
  if (!Number.isFinite(metros) || metros < 0) {
    return { valor: '---', sufijo: '' };
  }

  const km = metros / 1000;

  switch (unidad) {
    case 'm': {
      if (metros < 1000) {
        return { valor: metros.toFixed(0), sufijo: 'm' };
      }
      return { valor: km.toFixed(2), sufijo: 'km' };
    }
    case 'mi': {
      if (metros < 1609.344) {
        return { valor: metros.toFixed(0), sufijo: 'm' };
      }
      const mi = metros / 1609.344;
      return { valor: mi.toFixed(2), sufijo: 'mi' };
    }
    case 'nmi': {
      if (metros < 1852) {
        return { valor: metros.toFixed(0), sufijo: 'm' };
      }
      const nmi = metros / 1852;
      return { valor: nmi.toFixed(2), sufijo: 'nmi' };
    }
    case 'km':
    default: {
      if (metros < 1000) {
        return { valor: metros.toFixed(0), sufijo: 'm' };
      }
      return { valor: km.toFixed(2), sufijo: 'km' };
    }
  }
}

/**
 * Convierte metros por segundo a la unidad de velocidad elegida.
 * Acepta la velocidad que da navigator.geolocation (m/s).
 */
export type UnidadVelocidad = 'kt' | 'kmh';

export function formatearVelocidad(
  metrosPorSegundo: number | null,
  unidad: UnidadVelocidad = 'kt'
): { valor: string; sufijo: string } {
  if (metrosPorSegundo == null || !Number.isFinite(metrosPorSegundo)) {
    return { valor: '---', sufijo: '' };
  }
  if (unidad === 'kmh') {
    const kmh = metrosPorSegundo * 3.6;
    return { valor: kmh.toFixed(1), sufijo: 'km/h' };
  }
  const kt = metrosPorSegundo * 1.9438444924406;
  return { valor: kt.toFixed(1), sufijo: 'kt' };
}