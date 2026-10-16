// src/lib/actividad.ts
// WKF — Coeficiente de actividad de los peces (0-10) por hora.
// v1.010 (DP-088, DP-089): pestaña Actividad.
// Combina tres factores según el código del usuario (válido):
//   - Luna (edad lunar): pico en luna nueva y llena.
//   - Orto/ocaso: pico en las 1,5 h alrededor de orto y ocaso.
//   - Presión atmosférica: pico entre 1012 y 1022 hPa.
// Los umbrales de presión y los pesos son los del usuario.
// El resultado se limita a 10.

import type { HourlyPoint } from './openmeteo.ts';

export interface ActividadHora {
  hora: string;          // ISO de la hora
  coeficiente: number;   // 0-10
  emoji: string;         // indicador visual
}

const CICLO_LUNAR = 29.530588853;
const LUNA_NUEVA_REF = Date.UTC(2000, 0, 6, 18, 14, 0);

function edadLunar(fecha: Date): number {
  const dias = (fecha.getTime() - LUNA_NUEVA_REF) / 86400000;
  let edad = dias % CICLO_LUNAR;
  if (edad < 0) edad += CICLO_LUNAR;
  return edad;
}

// Emoji de actividad: medidor visual compacto.
function emojiActividad(coef: number): string {
  if (coef >= 10) return '🦑🐠🦑🐠🦑🐠';
  if (coef >= 9) return '🐠🦑🐠🦑🐠';
  if (coef >= 8) return '🐠🦑🐠🦑';
  if (coef >= 7) return '🐠🦑🐠';
  if (coef >= 6) return '🐠 🦑';
  if (coef >= 5) return '🐠';
  return '';
}

// Calcula el coeficiente de actividad de una hora concreta.
// - h: HourlyPoint con pressure y time.
// - ortoYocaso: array de horas (Date) de orto y ocaso del día
//   de la hora (para no recalcular en cada llamada).
export function calcularActividadHora(
  h: HourlyPoint,
  orto: Date | null,
  ocaso: Date | null
): number {
  const fecha = new Date(h.time);
  let coef = 2;

  // Factor A: luna.
  const edad = edadLunar(fecha);
  if (edad < 2 || edad > 27.5 || (edad > 13.5 && edad < 16)) {
    coef += 3;
  } else if ((edad >= 6 && edad <= 8.5) || (edad >= 21 && edad <= 23.5)) {
    coef += 1;
  }

  // Factor B: orto y ocaso (±1,5 h).
  if (orto) {
    const dOrto = Math.abs(fecha.getTime() - orto.getTime()) / 3600000;
    if (dOrto <= 1.5) coef += 3;
  }
  if (ocaso) {
    const dOcaso = Math.abs(fecha.getTime() - ocaso.getTime()) / 3600000;
    if (dOcaso <= 1.5) coef += 3;
  }

  // Factor C: presión atmosférica.
  if (h.pressure != null) {
    if (h.pressure >= 1012 && h.pressure <= 1022) {
      coef += 2;
    } else if (h.pressure > 1005 && h.pressure < 1012) {
      coef += 1;
    }
  }

  if (coef > 10) coef = 10;
  if (coef < 0) coef = 0;
  return coef;
}

// Calcula el coeficiente para todas las horas del weather.
// Se le pasa un mapa fecha→{orto,ocaso} para no recalcular.
export function calcularActividadPorHora(
  hourly: HourlyPoint[],
  ortosYocasos: Map<string, { orto: Date | null; ocaso: Date | null }>
): ActividadHora[] {
  return hourly.map((h) => {
    const fecha = new Date(h.time);
    const key = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
    const oo = ortosYocasos.get(key) ?? { orto: null, ocaso: null };
    const coef = calcularActividadHora(h, oo.orto, oo.ocaso);
    return {
      hora: h.time,
      coeficiente: coef,
      emoji: emojiActividad(coef),
    };
  });
}

// Nota: la columna "Corriente" de la pestaña Actividad usa los
// datos de `currentVelocity` y `currentDirection` del HourlyPoint.
// El indicador de deriva se calcula en la UI:
//   < 0,4 kn → 🐌 Agua parada / baja actividad
//   > 1,4 kn → ⚡ Deriva rápida
//   en medio → ▶ correcto