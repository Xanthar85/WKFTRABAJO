// src/lib/unidades.ts
// WKF — Sistema de unidades personalizado.
// El usuario elige la unidad de cada variable por separado.
// La app arranca en métrico. Los valores crudos llegan siempre en
// unidades internas (km/h, m, °C, hPa, kt, km, mm) y se convierten
// aquí para mostrarlos.
//
// Nada de esto afecta a los veredictos ni a los umbrales. Solo a la
// presentación.

export type UnidadViento = 'kmh' | 'kt' | 'mph' | 'ms';
export type UnidadOla = 'm' | 'ft';
export type UnidadTemperatura = 'c' | 'f';
export type UnidadPresion = 'hpa' | 'inhg' | 'mbar';
export type UnidadCorriente = 'kt' | 'kmh' | 'mph' | 'ms';
export type UnidadDistancia = 'km' | 'mi' | 'nmi';
export type UnidadPrecipitacion = 'mm' | 'in';

export interface SistemaUnidades {
  viento: UnidadViento;
  viento2: UnidadViento;   // segunda columna de la tabla Viento
  ola: UnidadOla;
  temperatura: UnidadTemperatura;
  presion: UnidadPresion;
  corriente: UnidadCorriente;
  distancia: UnidadDistancia;
  visibilidad: UnidadDistancia;
  precipitacion: UnidadPrecipitacion;
}

export const UNIDADES_POR_DEFECTO: SistemaUnidades = {
  viento: 'kmh',
  viento2: 'kt',
  ola: 'm',
  temperatura: 'c',
  presion: 'hpa',
  corriente: 'kt',
  distancia: 'km',
  visibilidad: 'km',
  precipitacion: 'mm',
};

// Opciones que se ofrecen al usuario. Cada variable tiene su lista.
export const OPCIONES_VIENTO: UnidadViento[] = ['kmh', 'kt', 'mph', 'ms'];
export const OPCIONES_OLA: UnidadOla[] = ['m', 'ft'];
export const OPCIONES_TEMPERATURA: UnidadTemperatura[] = ['c', 'f'];
export const OPCIONES_PRESION: UnidadPresion[] = ['hpa', 'inhg', 'mbar'];
export const OPCIONES_CORRIENTE: UnidadCorriente[] = ['kt', 'kmh', 'mph', 'ms'];
export const OPCIONES_DISTANCIA: UnidadDistancia[] = ['km', 'mi', 'nmi'];
export const OPCIONES_PRECIPITACION: UnidadPrecipitacion[] = ['mm', 'in'];

// Sufijos visibles. Cortos, en minúsculas.
export const SUFIJO_VIENTO: Record<UnidadViento, string> = {
  kmh: 'km/h', kt: 'kt', mph: 'mph', ms: 'm/s',
};
export const SUFIJO_OLA: Record<UnidadOla, string> = {
  m: 'm', ft: 'ft',
};
export const SUFIJO_TEMPERATURA: Record<UnidadTemperatura, string> = {
  c: '°C', f: '°F',
};
export const SUFIJO_PRESION: Record<UnidadPresion, string> = {
  hpa: 'hPa', inhg: 'inHg', mbar: 'mbar',
};
export const SUFIJO_CORRIENTE: Record<UnidadCorriente, string> = {
  kt: 'kt', kmh: 'km/h', mph: 'mph', ms: 'm/s',
};
export const SUFIJO_DISTANCIA: Record<UnidadDistancia, string> = {
  km: 'km', mi: 'mi', nmi: 'nmi',
};
export const SUFIJO_PRECIPITACION: Record<UnidadPrecipitacion, string> = {
  mm: 'mm', in: 'in',
};

// Claves i18n para los labels completos que se ven en los selectores.
export const CLAVE_I18N_VIENTO: Record<UnidadViento, string> = {
  kmh: 'unidades.kmh', kt: 'unidades.kt', mph: 'unidades.mph', ms: 'unidades.ms',
};
export const CLAVE_I18N_OLA: Record<UnidadOla, string> = {
  m: 'unidades.m', ft: 'unidades.ft',
};
export const CLAVE_I18N_TEMPERATURA: Record<UnidadTemperatura, string> = {
  c: 'unidades.celsius', f: 'unidades.fahrenheit',
};
export const CLAVE_I18N_PRESION: Record<UnidadPresion, string> = {
  hpa: 'unidades.hpa', inhg: 'unidades.inhg', mbar: 'unidades.mbar',
};
export const CLAVE_I18N_CORRIENTE: Record<UnidadCorriente, string> = {
  kt: 'unidades.kt', kmh: 'unidades.kmh', mph: 'unidades.mph', ms: 'unidades.ms',
};
export const CLAVE_I18N_DISTANCIA: Record<UnidadDistancia, string> = {
  km: 'unidades.km', mi: 'unidades.mi', nmi: 'unidades.nmi',
};
export const CLAVE_I18N_PRECIPITACION: Record<UnidadPrecipitacion, string> = {
  mm: 'unidades.mm', in: 'unidades.in',
};

// ─── Conversiones internas ─────────────────────────────────────────
// Los valores crudos llegan así desde las fuentes:
//   Viento: km/h
//   Ola: m
//   Temperatura: °C
//   Presión: hPa
//   Corriente: kt
//   Distancia: km
//   Precipitación: mm

function formatearNumero(valor: number, decimales: number): string {
  return valor.toFixed(decimales);
}

// Viento. Entrada en km/h.
export function formatearViento(
  kmh: number | null,
  unidad: UnidadViento
): string {
  if (kmh == null) return '—';
  let valor: number;
  switch (unidad) {
    case 'kmh': valor = kmh; break;
    case 'kt': valor = kmh / 1.852; break;
    case 'mph': valor = kmh / 1.609344; break;
    case 'ms': valor = kmh / 3.6; break;
  }
  return `${formatearNumero(valor, 1)} ${SUFIJO_VIENTO[unidad]}`;
}

// Ola. Entrada en metros.
export function formatearOla(
  metros: number | null,
  unidad: UnidadOla
): string {
  if (metros == null) return '—';
  const valor = unidad === 'ft' ? metros * 3.28084 : metros;
  return `${formatearNumero(valor, 2)} ${SUFIJO_OLA[unidad]}`;
}

// Temperatura. Entrada en °C.
export function formatearTemperatura(
  celsius: number | null,
  unidad: UnidadTemperatura
): string {
  if (celsius == null) return '—';
  const valor = unidad === 'f' ? celsius * 9 / 5 + 32 : celsius;
  return `${formatearNumero(valor, 1)} ${SUFIJO_TEMPERATURA[unidad]}`;
}

// Presión. Entrada en hPa.
export function formatearPresion(
  hpa: number | null,
  unidad: UnidadPresion
): string {
  if (hpa == null) return '—';
  let valor: number;
  let decimales: number;
  switch (unidad) {
    case 'hpa': valor = hpa; decimales = 0; break;
    case 'inhg': valor = hpa * 0.02953; decimales = 2; break;
    case 'mbar': valor = hpa; decimales = 0; break;
  }
  return `${formatearNumero(valor, decimales)} ${SUFIJO_PRESION[unidad]}`;
}

// Corriente. Entrada en nudos.
export function formatearCorriente(
  kt: number | null,
  unidad: UnidadCorriente
): string {
  if (kt == null) return '—';
  let valor: number;
  let decimales: number;
  switch (unidad) {
    case 'kt': valor = kt; decimales = 2; break;
    case 'kmh': valor = kt * 1.852; decimales = 1; break;
    case 'mph': valor = kt * 1.150779; decimales = 1; break;
    case 'ms': valor = kt * 0.514444; decimales = 1; break;
  }
  return `${formatearNumero(valor, decimales)} ${SUFIJO_CORRIENTE[unidad]}`;
}

// Distancia. Entrada en km.
export function formatearDistancia(
  km: number | null,
  unidad: UnidadDistancia
): string {
  if (km == null) return '—';
  let valor: number;
  switch (unidad) {
    case 'km': valor = km; break;
    case 'mi': valor = km / 1.609344; break;
    case 'nmi': valor = km / 1.852; break;
  }
  return `${formatearNumero(valor, 1)} ${SUFIJO_DISTANCIA[unidad]}`;
}

// Precipitación. Entrada en mm.
export function formatearPrecipitacion(
  mm: number | null,
  unidad: UnidadPrecipitacion
): string {
  if (mm == null) return '—';
  if (unidad === 'in') {
    return `${formatearNumero(mm / 25.4, 2)} ${SUFIJO_PRECIPITACION.in}`;
  }
  return `${formatearNumero(mm, 1)} ${SUFIJO_PRECIPITACION.mm}`;
}

// Helper de conveniencia: dado un km/h, devuelve también el valor
// numérico sin sufijo (para pintar solo el número, cuando hace falta).
export function valorViento(kmh: number | null, unidad: UnidadViento): number | null {
  if (kmh == null) return null;
  switch (unidad) {
    case 'kmh': return kmh;
    case 'kt': return kmh / 1.852;
    case 'mph': return kmh / 1.609344;
    case 'ms': return kmh / 3.6;
  }
}

export function valorOla(m: number | null, unidad: UnidadOla): number | null {
  if (m == null) return null;
  return unidad === 'ft' ? m * 3.28084 : m;
}

export function valorTemperatura(c: number | null, unidad: UnidadTemperatura): number | null {
  if (c == null) return null;
  return unidad === 'f' ? c * 9 / 5 + 32 : c;
}

export function valorPresion(hpa: number | null, unidad: UnidadPresion): number | null {
  if (hpa == null) return null;
  return unidad === 'inhg' ? hpa * 0.02953 : hpa;
}

export function valorCorriente(kt: number | null, unidad: UnidadCorriente): number | null {
  if (kt == null) return null;
  switch (unidad) {
    case 'kt': return kt;
    case 'kmh': return kt * 1.852;
    case 'mph': return kt * 1.150779;
    case 'ms': return kt * 0.514444;
  }
}
