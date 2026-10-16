// src/lib/verdict-ui.ts
// WKF — Utilidades de UI y visualización de veredictos.
// Funciones puras, sin JSX, sin React.
// v1.010: bug 14. miniGraficoOlaViento devuelve también los
// puntos individuales para que MiniGrafico.tsx pueda pintar
// ejes, iconos y franjas. Se mantienen las claves `ola` y
// `viento` con el path SVG por compatibilidad, y se añaden:
//   - horas: lista de strings ISO, 24 h.
//   - olaPuntos / vientoPuntos: {x,y,valor} para ejes e iconos.
//   - olaMax / vientoMax: máximo usado para escalar.

import type { SpotWeather } from './openmeteo.ts';
import type { Kayak, TechoAbsoluto } from './kayaks.ts';
import type { Pato, CategoriaPato } from './patos.ts';
import {
  calcularVeredicto,
  type Veredicto,
  type VeredictoAcceso,
  type CategoriaKayak,
  type PerfilKayakista,
  type FranjaDia,
  type Condiciones,
} from './verdict.ts';
import type { Spot, FranjaUsuario, Embarcacion } from '../state/store.ts';

const ORDEN_VEREDICTO: Veredicto[] = [
  'FAVORABLE',
  'ACEPTABLE',
  'EXIGENTE',
  'DESACONSEJADO',
];

function peorVeredicto(a: Veredicto, b: Veredicto): Veredicto {
  return ORDEN_VEREDICTO.indexOf(a) >= ORDEN_VEREDICTO.indexOf(b) ? a : b;
}

// 1. Color de veredicto
export function veredictoAColor(v: Veredicto): string {
  switch (v) {
    case 'FAVORABLE':
      return 'var(--verdict-favorable)';
    case 'ACEPTABLE':
      return 'var(--verdict-aceptable)';
    case 'EXIGENTE':
      return 'var(--verdict-exigente)';
    case 'DESACONSEJADO':
      return 'var(--verdict-desaconsejado)';
  }
}

// 2. Clave i18n de veredicto
export function veredictoAClaveI18n(v: Veredicto): string {
  switch (v) {
    case 'FAVORABLE':
      return 'verdict.favorable';
    case 'ACEPTABLE':
      return 'verdict.acceptable';
    case 'EXIGENTE':
      return 'verdict.demanding';
    case 'DESACONSEJADO':
      return 'verdict.advisedAgainst';
  }
}

// 3. Color de veredicto de acceso
export function veredictoAccesoAColor(v: VeredictoAcceso): string {
  switch (v) {
    case 'SEGURA':
      return 'var(--verdict-favorable)';
    case 'VIGILAR':
      return 'var(--verdict-aceptable)';
    case 'DIFICIL':
      return 'var(--verdict-exigente)';
    case 'NO_SALIR':
      return 'var(--verdict-desaconsejado)';
  }
}

// 4. Clave i18n de veredicto de acceso
export function veredictoAccesoAClaveI18n(v: VeredictoAcceso): string {
  switch (v) {
    case 'SEGURA':
      return 'verdict.launch.safe';
    case 'VIGILAR':
      return 'verdict.launch.watch';
    case 'DIFICIL':
      return 'verdict.launch.hard';
    case 'NO_SALIR':
      return 'verdict.launch.noGo';
  }
}

// 5. Calcula el veredicto para cada franja horaria definida
export function calcularVeredictoPorFranja(
  spot: Spot,
  weather: SpotWeather | null,
  franjas: FranjaUsuario[],
  categoria: CategoriaKayak | CategoriaPato | string,
  perfil: PerfilKayakista,
  embarcacion?: Embarcacion | TechoAbsoluto | null
): Record<string, Veredicto | null> {
  const res: Record<string, Veredicto | null> = {};
  for (const f of franjas) {
    res[f.id] = null;
  }

  if (!weather || !weather.hourly || weather.hourly.length === 0) {
    return res;
  }

  for (const franja of franjas) {
    const inicio = franja.inicio;
    const franjaDia: FranjaDia =
      inicio >= 0 && inicio < 12
        ? 'manana'
        : inicio >= 12 && inicio < 20
        ? 'tarde'
        : 'noche';

    let peor: Veredicto | null = null;

    for (const h of weather.hourly) {
      const localHour = new Date(h.time).getHours();

      let dentro = false;
      if (franja.inicio < franja.fin) {
        dentro = localHour >= franja.inicio && localHour < franja.fin;
      } else if (franja.inicio > franja.fin) {
        dentro = localHour >= franja.inicio || localHour < franja.fin;
      } else {
        dentro = true;
      }

      if (!dentro) continue;
      if (h.waveHeight == null || h.windSpeed == null) continue;

      const bf = Math.round(Math.pow(h.windSpeed / 0.836, 2 / 3));
      const condiciones: Condiciones = {
        viento: bf,
        ola: h.waveHeight,
        periodo: h.wavePeriod ?? 0,
        corriente: 0,
        marea: 0,
      };

      const resultado = calcularVeredicto(
        spot.zona ?? 'mediterraneo_espanol',
        categoria,
        perfil,
        franjaDia,
        condiciones,
        embarcacion
      );

      peor = peor ? peorVeredicto(peor, resultado.veredicto) : resultado.veredicto;
    }

    res[franja.id] = peor;
  }

  return res;
}

// Veredicto por franja para un día concreto (usado por la Home).
// Calcula el peor veredicto de las horas del día que caen en la
// franja. Se apoya en calcularVeredictoPorFranja filtrando el
// weather a ese día.
export function calcularVeredictoFranjaDia(
  spot: Spot,
  weather: SpotWeather | null,
  franja: FranjaUsuario,
  fechaBase: Date,
  categoria: CategoriaKayak | CategoriaPato | string,
  perfil: PerfilKayakista,
  embarcacion?: Embarcacion | TechoAbsoluto | null
): Veredicto | null {
  if (!weather) return null;
  const y = fechaBase.getFullYear();
  const m = String(fechaBase.getMonth() + 1).padStart(2, '0');
  const d = String(fechaBase.getDate()).padStart(2, '0');
  const key = `${y}-${m}-${d}`;
  const horas = weather.hourly.filter((h) => {
    const hd = new Date(h.time);
    const hy = hd.getFullYear();
    const hm = String(hd.getMonth() + 1).padStart(2, '0');
    const hdd = String(hd.getDate()).padStart(2, '0');
    return `${hy}-${hm}-${hdd}` === key;
  });
  if (horas.length === 0) return null;

  const sub: SpotWeather = { ...weather, hourly: horas };
  const r = calcularVeredictoPorFranja(spot, sub, [franja], categoria, perfil, embarcacion);
  return r[franja.id] ?? null;
}

// 6. Datos para el mini-gráfico.
// Devuelve el path SVG de ola y viento, además de los puntos
// individuales para pintar ejes, iconos y franjas.
// viewBox base: 0 0 100 30 (mantenido por compatibilidad).
export interface MiniGraficoData {
  ola: string;
  viento: string;
  horas: string[];
  olaPuntos: { x: number; y: number; valor: number | null }[];
  vientoPuntos: { x: number; y: number; valor: number | null }[];
  olaMax: number;
  vientoMax: number;
}

export function miniGraficoOlaViento(
  weather: SpotWeather | null,
  _franjaId?: string,
  _franjas?: FranjaUsuario[]
): MiniGraficoData {
  const vacio: MiniGraficoData = {
    ola: '',
    viento: '',
    horas: [],
    olaPuntos: [],
    vientoPuntos: [],
    olaMax: 3,
    vientoMax: 20,
  };
  if (!weather || !weather.hourly || weather.hourly.length === 0) return vacio;

  const puntos = weather.hourly.slice(0, 24);
  if (puntos.length < 2) return vacio;

  const N = puntos.length;

  // Calcular máximos reales (con suelo para no dividir por cero).
  let olaMax = 0.5;
  let vientoMax = 5;
  for (const p of puntos) {
    const o = p.waveHeight ?? 0;
    const v = p.windSpeed ?? 0;
    if (o > olaMax) olaMax = o;
    if (v > vientoMax) vientoMax = v;
  }
  // Redondear hacia arriba con margen del 10 %.
  olaMax = Math.ceil((olaMax * 1.1) * 10) / 10;
  vientoMax = Math.ceil((vientoMax * 1.1));

  const olaPuntos: MiniGraficoData['olaPuntos'] = [];
  const vientoPuntos: MiniGraficoData['vientoPuntos'] = [];
  const olaCoords: string[] = [];
  const vientoCoords: string[] = [];

  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 100;
    const p = puntos[i];

    const oVal = p.waveHeight;
    const vVal = p.windSpeed;

    const oNorm = oVal != null ? Math.max(0, Math.min(1, oVal / olaMax)) : 0;
    const vNorm = vVal != null ? Math.max(0, Math.min(1, vVal / vientoMax)) : 0;

    const yOla = 28 - oNorm * 26;
    const yViento = 28 - vNorm * 26;

    const prefix = i === 0 ? 'M' : 'L';
    olaCoords.push(`${prefix} ${x.toFixed(2)},${yOla.toFixed(2)}`);
    vientoCoords.push(`${prefix} ${x.toFixed(2)},${yViento.toFixed(2)}`);

    olaPuntos.push({ x, y: yOla, valor: oVal });
    vientoPuntos.push({ x, y: yViento, valor: vVal });
  }

  return {
    ola: olaCoords.join(' '),
    viento: vientoCoords.join(' '),
    horas: puntos.map((p) => p.time),
    olaPuntos,
    vientoPuntos,
    olaMax,
    vientoMax,
  };
}