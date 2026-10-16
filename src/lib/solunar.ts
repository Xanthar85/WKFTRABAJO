// src/lib/solunar.ts
// WKF — Coeficiente solunar. Sin cambios funcionales en v1.010.

import { calcularLuna } from './moon.ts';

export interface FranjaSolunar {
  inicio: Date;
  fin: Date;
  puntuacion: number;
}

export interface DatosSolunar {
  coeficienteDia: number;
  franjasMayores: FranjaSolunar[];
  franjasMenores: FranjaSolunar[];
}

function transitoLunar(fecha: Date, lon: number): Date {
  const luna = calcularLuna(fecha);
  const fraccion = luna.edad / 29.530588853;

  const mediodiaSolarUTC = 720 - 4 * lon;

  const desplazamiento = fraccion * 1440;
  const transitoUTC = (mediodiaSolarUTC + desplazamiento) % 1440;

  const base = new Date(
    Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate(),
      0,
      0,
      0
    )
  );

  return new Date(base.getTime() + transitoUTC * 60000);
}

function clasificarFranja(puntuacion: number): boolean {
  return puntuacion > 5;
}

function construirFranjas(
  transito: Date,
  edadLunar: number
): { mayores: FranjaSolunar[]; menores: FranjaSolunar[] } {
  const fraccion = edadLunar / 29.530588853;
  const pico = Math.abs(Math.cos(2 * Math.PI * fraccion));
  const base = 5 + pico * 5;

  const mayorInicio = new Date(transito.getTime() - 2 * 3600000);
  const mayorFin = new Date(transito.getTime() + 2 * 3600000);

  const ortoLunar = new Date(transito.getTime() - 6 * 3600000);
  const ocasoLunar = new Date(transito.getTime() + 6 * 3600000);

  const menorInicio1 = new Date(ortoLunar.getTime() - 1 * 3600000);
  const menorFin1 = new Date(ortoLunar.getTime() + 1 * 3600000);
  const menorInicio2 = new Date(ocasoLunar.getTime() - 1 * 3600000);
  const menorFin2 = new Date(ocasoLunar.getTime() + 1 * 3600000);

  return {
    mayores: [{ inicio: mayorInicio, fin: mayorFin, puntuacion: base }],
    menores: [
      { inicio: menorInicio1, fin: menorFin1, puntuacion: base * 0.7 },
      { inicio: menorInicio2, fin: menorFin2, puntuacion: base * 0.7 },
    ],
  };
}

export function calcularSolunar(
  fecha: Date,
  lat: number,
  lon: number
): DatosSolunar {
  const luna = calcularLuna(fecha);
  const transito = transitoLunar(fecha, lon);
  const { mayores, menores } = construirFranjas(transito, luna.edad);

  const todas = [...mayores, ...menores];
  const coeficienteDia = todas.reduce((max, f) => Math.max(max, f.puntuacion), 0);

  return {
    coeficienteDia,
    franjasMayores: mayores.filter((f) => clasificarFranja(f.puntuacion)),
    franjasMenores: menores.filter((f) => clasificarFranja(f.puntuacion)),
  };
}

export function factorLatitud(lat: number): number {
  const absLat = Math.min(Math.abs(lat), 60);
  return 1 - (absLat / 60) * 0.4;
}