// src/lib/periodo-seco.ts
// WKF — Modelo de Trenes de Olas y Periodo Seco.
// Puro. Sin React. Sin JSX. Testeable.

import type { HourlyPoint } from './openmeteo.ts';

export type Regimen = 'swell_dominante' | 'mixto' | 'mar_de_viento';

export interface ResultadoPeriodoSeco {
  regimen: Regimen;
  periodoSecoS: number | null;
  cicloMin: number | null;
  sets: number | null;
  olasPorSet: number | null;
  trenesExtremos: boolean;
}

export function calcularPeriodoSeco(h: HourlyPoint): ResultadoPeriodoSeco {
  // Datos básicos
  const Tp = h.wavePeriod;
  const Ts = h.swellWavePeriod;

  if (Tp == null || Ts == null || Tp <= 0 || Ts <= 0) {
    return {
      regimen: 'mar_de_viento',
      periodoSecoS: null,
      cicloMin: null,
      sets: null,
      olasPorSet: null,
      trenesExtremos: false,
    };
  }

  // Separación mínima de 1 segundo para evitar división por cero.
  // Si Ts y Tp son iguales, asumimos que el periodo seco es Tp.
  let separacion = Math.abs(Ts - Tp);
  let psBase = Tp;
  if (separacion >= 1) {
    psBase = (Tp * Ts) / separacion;
  }

  // Límite superior de 180s
  let periodoSecoS = Math.max(psBase, Tp);
  let trenesExtremos = false;
  if (periodoSecoS > 180) {
    periodoSecoS = 180;
    trenesExtremos = true;
  }

  // Cálculo del ciclo, sets y olas/set.
  // Asumimos 4 olas por set.
  const duracionSetS = 4 * Tp;
  const cicloS = periodoSecoS + duracionSetS;
  const olasTotales = cicloS / Tp;
  const sets = Math.max(1, Math.round(olasTotales / 4));
  const olasPorSet = 4; // Fijo

  return {
    regimen: 'mixto', // ya no importa el régimen, pero ponemos algo
    periodoSecoS: Math.round(periodoSecoS),
    cicloMin: Math.round((cicloS / 60) * 10) / 10,
    sets: sets,
    olasPorSet: olasPorSet,
    trenesExtremos,
  };
}

export function calcularPeriodoSecoPorHoras(
  horas: HourlyPoint[]
): Array<{ time: string; resultado: ResultadoPeriodoSeco }> {
  return horas.map((h) => ({ time: h.time, resultado: calcularPeriodoSeco(h) }));
}
