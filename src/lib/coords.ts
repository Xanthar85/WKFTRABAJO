// src/lib/coords.ts
// WKF — Conversión de coordenadas. Sin cambios en v1.010.

export type FormatoCoords = 'dd' | 'dms' | 'ddm';

export interface Coords {
  lat: number;
  lon: number;
}

function ddADms(valor: number, esLat: boolean): string {
  const abs = Math.abs(valor);
  const grados = Math.floor(abs);
  const minutosTotal = (abs - grados) * 60;
  const minutos = Math.floor(minutosTotal);
  const segundos = (minutosTotal - minutos) * 60;

  const hemisferio = esLat
    ? valor >= 0
      ? 'N'
      : 'S'
    : valor >= 0
    ? 'E'
    : 'O';

  const seg = segundos.toFixed(1);
  return `${grados}°${minutos}'${seg}"${hemisferio}`;
}

function ddADdm(valor: number, esLat: boolean): string {
  const abs = Math.abs(valor);
  const grados = Math.floor(abs);
  const minutos = (abs - grados) * 60;

  const hemisferio = esLat
    ? valor >= 0
      ? 'N'
      : 'S'
    : valor >= 0
    ? 'E'
    : 'O';

  const min = minutos.toFixed(3);
  return `${grados}°${min}'${hemisferio}`;
}

export function formatearLat(lat: number, formato: FormatoCoords): string {
  switch (formato) {
    case 'dd':
      return `${lat.toFixed(5)}°`;
    case 'dms':
      return ddADms(lat, true);
    case 'ddm':
      return ddADdm(lat, true);
  }
}

export function formatearLon(lon: number, formato: FormatoCoords): string {
  switch (formato) {
    case 'dd':
      return `${lon.toFixed(5)}°`;
    case 'dms':
      return ddADms(lon, false);
    case 'ddm':
      return ddADdm(lon, false);
  }
}

export function formatearCoords(
  lat: number,
  lon: number,
  formato: FormatoCoords
): string {
  return `${formatearLat(lat, formato)} ${formatearLon(lon, formato)}`;
}

function parsearDd(texto: string): Coords | null {
  const match = texto.match(/(-?\d+\.?\d*)\s*[,°]?\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function parsearDmsODdm(texto: string): Coords | null {
  const regex =
    /(\d+)\s*°\s*(\d+\.?\d*)\s*['′]?\s*(\d+\.?\d*)?\s*["″]?\s*([NSEOnseo])/g;
  const matches = [...texto.matchAll(regex)];
  if (matches.length < 2) return null;

  const parsearBloque = (
    m: RegExpMatchArray,
    esLat: boolean
  ): number | null => {
    const grados = parseFloat(m[1]);
    const minutos = parseFloat(m[2]);
    const segundos = m[3] !== undefined ? parseFloat(m[3]) : 0;
    const hemisferio = m[4].toUpperCase();

    let valor = grados + minutos / 60 + segundos / 3600;

    const esNegativo =
      (esLat && hemisferio === 'S') ||
      (!esLat && (hemisferio === 'O' || hemisferio === 'W'));

    if (esNegativo) valor = -valor;

    if (esLat && (valor < -90 || valor > 90)) return null;
    if (!esLat && (valor < -180 || valor > 180)) return null;

    return valor;
  };

  const lat = parsearBloque(matches[0], true);
  const lon = parsearBloque(matches[1], false);
  if (lat === null || lon === null) return null;
  return { lat, lon };
}

export function parsearCoords(texto: string): Coords | null {
  const limpio = texto.trim();
  if (!limpio) return null;

  if (/[°'′"″]/.test(limpio) && /[NSEOnseo]/.test(limpio)) {
    return parsearDmsODdm(limpio);
  }

  return parsearDd(limpio);
}