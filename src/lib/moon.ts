// src/lib/moon.ts
// WKF — Cálculo lunar. Sin cambios funcionales en v1.010.

export type FaseLunar =
  | 'nueva'
  | 'creciente'
  | 'cuarto_creciente'
  | 'gibosa_creciente'
  | 'llena'
  | 'gibosa_menguante'
  | 'cuarto_menguante'
  | 'menguante';

export interface DatosLuna {
  edad: number;
  fase: FaseLunar;
  iluminacion: number;
  ortoLunar: Date | null;
  ocasoLunar: Date | null;
  transitoLunar: Date | null;
}

const CICLO_LUNAR = 29.530588853;
const RAD = Math.PI / 180;

const LUNA_NUEVA_REF = Date.UTC(2000, 0, 6, 18, 14, 0);

function declinacionLunar(edad: number): number {
  const fase = (edad / CICLO_LUNAR) * 2 * Math.PI;
  return 23.44 * Math.sin(fase) * RAD * 1.1;
}

function anguloHorario(
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

export function calcularLuna(
  fecha: Date,
  lat?: number,
  lon?: number
): DatosLuna {
  const diff = fecha.getTime() - LUNA_NUEVA_REF;
  const dias = diff / 86400000;
  const ciclos = dias / CICLO_LUNAR;
  const faseCiclo = ciclos - Math.floor(ciclos);
  const edad = faseCiclo * CICLO_LUNAR;
  const iluminacion = (1 - Math.cos(2 * Math.PI * faseCiclo)) / 2;

  const datos: DatosLuna = {
    edad,
    fase: clasificarFase(edad),
    iluminacion,
    ortoLunar: null,
    ocasoLunar: null,
    transitoLunar: null,
  };

  if (lat != null && lon != null && Math.abs(lat) < 89) {
    const decl = declinacionLunar(edad);

    const mediodiaSolarUTC = 720 - 4 * lon;
    const desplazamientoMin = faseCiclo * 1440;
    const transitoUTC =
      ((mediodiaSolarUTC + desplazamientoMin) % 1440 + 1440) % 1440;
    const baseUTC = Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate(),
      0,
      0,
      0
    );
    datos.transitoLunar = new Date(baseUTC + transitoUTC * 60000);

    const H = anguloHorario(lat, decl, 0);
    if (H != null) {
      const Hmin = H * 4;
      datos.ortoLunar = new Date(datos.transitoLunar.getTime() - Hmin * 60000);
      datos.ocasoLunar = new Date(datos.transitoLunar.getTime() + Hmin * 60000);
    }
  }

  return datos;
}

function clasificarFase(edad: number): FaseLunar {
  if (edad < 1.85) return 'nueva';
  if (edad < 5.53) return 'creciente';
  if (edad < 9.22) return 'cuarto_creciente';
  if (edad < 12.91) return 'gibosa_creciente';
  if (edad < 16.61) return 'llena';
  if (edad < 20.3) return 'gibosa_menguante';
  if (edad < 23.99) return 'cuarto_menguante';
  if (edad < 27.68) return 'menguante';
  return 'nueva';
}

export function nombreFase(fase: FaseLunar, idioma: 'es' | 'en'): string {
  const es: Record<FaseLunar, string> = {
    nueva: 'Luna nueva',
    creciente: 'Creciente',
    cuarto_creciente: 'Cuarto creciente',
    gibosa_creciente: 'Gibosa creciente',
    llena: 'Luna llena',
    gibosa_menguante: 'Gibosa menguante',
    cuarto_menguante: 'Cuarto menguante',
    menguante: 'Menguante',
  };
  const en: Record<FaseLunar, string> = {
    nueva: 'New moon',
    creciente: 'Waxing crescent',
    cuarto_creciente: 'First quarter',
    gibosa_creciente: 'Waxing gibbous',
    llena: 'Full moon',
    gibosa_menguante: 'Waning gibbous',
    cuarto_menguante: 'Last quarter',
    menguante: 'Waning crescent',
  };
  return idioma === 'en' ? en[fase] : es[fase];
}

export function emojiFase(fase: FaseLunar): string {
  switch (fase) {
    case 'nueva':
      return '🌑';
    case 'creciente':
      return '🌒';
    case 'cuarto_creciente':
      return '🌓';
    case 'gibosa_creciente':
      return '🌔';
    case 'llena':
      return '🌕';
    case 'gibosa_menguante':
      return '🌖';
    case 'cuarto_menguante':
      return '🌗';
    case 'menguante':
      return '🌘';
  }
}