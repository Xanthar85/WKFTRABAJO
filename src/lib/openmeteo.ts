// src/lib/openmeteo.ts
// WKF — Cliente Open-Meteo (Marine + Forecast).
// v1.028 (M3): parámetro models= en la petición atmosférica según
//   el modelo activo. La API marine no se toca.

import type { ModeloId } from './modelos.ts';
import { getModelo } from './modelos.ts';

export type HourlyPoint = {
  time: string;
  waveHeight: number | null;
  windWaveHeight: number | null;
  swellWaveHeight: number | null;
  wavePeriod: number | null;
  windWavePeriod: number | null;
  swellWavePeriod: number | null;
  waveDirection: number | null;
  windWaveDirection: number | null;
  swellWaveDirection: number | null;
  windSpeed: number | null;
  windGusts: number | null;
  windDirection: number | null;
  temperature: number | null;
  apparentTemperature: number | null;
  seaSurfaceTemperature: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  cloudCover: number | null;
  weatherCode: number | null;
  visibility: number | null;
  pressure: number | null;
  seaLevelHeight: number | null;
  currentVelocity: number | null;
  currentDirection: number | null;
};

export type SpotWeather = {
  fetchedAt: number;
  lat: number;
  lon: number;
  timezone: string;
  hourly: HourlyPoint[];
};

const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const ATMOS_URL = 'https://api.open-meteo.com/v1/forecast';

type MarineResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    wave_height: (number | null)[];
    wind_wave_height: (number | null)[];
    swell_wave_height: (number | null)[];
    wave_period: (number | null)[];
    wind_wave_period: (number | null)[];
    swell_wave_period: (number | null)[];
    wave_direction: (number | null)[];
    wind_wave_direction: (number | null)[];
    swell_wave_direction: (number | null)[];
    sea_surface_temperature: (number | null)[];
    sea_level_height_msl: (number | null)[];
    ocean_current_velocity: (number | null)[];
    ocean_current_direction: (number | null)[];
  };
};

type AtmosResponse = {
  timezone: string;
  hourly: {
    time: string[];
    wind_speed_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
    temperature_2m: (number | null)[];
    apparent_temperature: (number | null)[];
    precipitation: (number | null)[];
    precipitation_probability: (number | null)[];
    cloud_cover: (number | null)[];
    weather_code: (number | null)[];
    visibility: (number | null)[];
    pressure_msl: (number | null)[];
  };
};

export async function fetchSpotWeather(
  lat: number,
  lon: number,
  days = 7,
  modeloId: ModeloId = 'ecmwf'
): Promise<SpotWeather> {
  const forecastDays = String(Math.max(1, Math.min(16, days)));

  const marineParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      'wave_height',
      'wind_wave_height',
      'swell_wave_height',
      'wave_period',
      'wind_wave_period',
      'swell_wave_period',
      'wave_direction',
      'wind_wave_direction',
      'swell_wave_direction',
      'sea_surface_temperature',
      'sea_level_height_msl',
      'ocean_current_velocity',
      'ocean_current_direction',
    ].join(','),
    forecast_days: forecastDays,
    timezone: 'auto',
  });

  const atmosParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'precipitation_probability',
      'cloud_cover',
      'weather_code',
      'visibility',
      'pressure_msl',
    ].join(','),
    forecast_days: forecastDays,
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  });

  const modelo = getModelo(modeloId);
  if (modelo) {
    atmosParams.set('models', modelo.apiName);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const atmosParamsSinModelo = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'precipitation_probability',
      'cloud_cover',
      'weather_code',
      'visibility',
      'pressure_msl',
    ].join(','),
    forecast_days: forecastDays,
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  });

  let marineRes: Response;
  let atmosRes: Response;

  try {
    [marineRes, atmosRes] = await Promise.all([
      fetch(`${MARINE_URL}?${marineParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }),
      fetch(`${ATMOS_URL}?${atmosParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }

  // Si Atmos falla (503 de Harmonie u otro), reintentar SIN modelo
  if (!atmosRes.ok) {
    atmosRes = await fetch(`${ATMOS_URL}?${atmosParamsSinModelo.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  }

  if (!marineRes.ok) throw new Error(`marine http ${marineRes.status}`);
  if (!atmosRes.ok) throw new Error(`atmos http ${atmosRes.status}`);

  const marine = (await marineRes.json()) as MarineResponse;
  const atmos = (await atmosRes.json()) as AtmosResponse;

  const atmosByTime = new Map<string, number>();
  atmos.hourly.time.forEach((t, i) => atmosByTime.set(t, i));

  const hourly: HourlyPoint[] = marine.hourly.time.map((t, i) => {
    const ai = atmosByTime.get(t);

    const rawVelocity = marine.hourly.ocean_current_velocity?.[i] ?? null;
    const currentVelocity =
      rawVelocity != null
        ? Math.round((rawVelocity / 0.514444) * 100) / 100
        : null;

    const windKmh =
      ai !== undefined ? atmos.hourly.wind_speed_10m[ai] ?? null : null;
    const gustsKmh =
      ai !== undefined ? atmos.hourly.wind_gusts_10m[ai] ?? null : null;

    return {
      time: t,
      waveHeight: marine.hourly.wave_height?.[i] ?? null,
      windWaveHeight: marine.hourly.wind_wave_height?.[i] ?? null,
      swellWaveHeight: marine.hourly.swell_wave_height?.[i] ?? null,
      wavePeriod: marine.hourly.wave_period?.[i] ?? null,
      windWavePeriod: marine.hourly.wind_wave_period?.[i] ?? null,
      swellWavePeriod: marine.hourly.swell_wave_period?.[i] ?? null,
      waveDirection: marine.hourly.wave_direction?.[i] ?? null,
      windWaveDirection: marine.hourly.wind_wave_direction?.[i] ?? null,
      swellWaveDirection: marine.hourly.swell_wave_direction?.[i] ?? null,
      windSpeed: windKmh,
      windGusts: gustsKmh,
      windDirection:
        ai !== undefined ? atmos.hourly.wind_direction_10m[ai] ?? null : null,
      temperature:
        ai !== undefined ? atmos.hourly.temperature_2m[ai] ?? null : null,
      apparentTemperature:
        ai !== undefined
          ? atmos.hourly.apparent_temperature?.[ai] ?? null
          : null,
      seaSurfaceTemperature:
        marine.hourly.sea_surface_temperature?.[i] ?? null,
      precipitation:
        ai !== undefined ? atmos.hourly.precipitation[ai] ?? null : null,
      precipitationProbability:
        ai !== undefined
          ? atmos.hourly.precipitation_probability?.[ai] ?? null
          : null,
      cloudCover:
        ai !== undefined ? atmos.hourly.cloud_cover?.[ai] ?? null : null,
      weatherCode:
        ai !== undefined ? atmos.hourly.weather_code?.[ai] ?? null : null,
      visibility:
        ai !== undefined ? atmos.hourly.visibility?.[ai] ?? null : null,
      pressure:
        ai !== undefined ? atmos.hourly.pressure_msl?.[ai] ?? null : null,
      seaLevelHeight: marine.hourly.sea_level_height_msl?.[i] ?? null,
      currentVelocity,
      currentDirection: marine.hourly.ocean_current_direction?.[i] ?? null,
    };
  });

  return {
    fetchedAt: Date.now(),
    lat: marine.latitude,
    lon: marine.longitude,
    timezone: marine.timezone,
    hourly,
  };
}

export function kmhAKn(kmh: number | null): number | null {
  if (kmh == null) return null;
  return Math.round((kmh / 1.852) * 10) / 10;
}

export function kmhABf(kmh: number | null): number | null {
  if (kmh == null) return null;
  const umbrales = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  for (let i = 0; i < umbrales.length; i++) {
    if (kmh < umbrales[i]) return i;
  }
  return 12;
}

export function msAKmh(v: number | null): number | null {
  if (v == null) return null;
  return Math.round(v * 10) / 10;
}

export function gradosACardinal16(grados: number | null): string {
  if (grados == null) return '—';
  const puntos = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  const idx = Math.round(((grados % 360) + 360) % 360 / 22.5) % 16;
  return puntos[idx];
}

export function weatherCodeAIcono(code: number | null, isNight = false): string {
  if (code == null) return '—';
  if (code === 0) return isNight ? '🌙' : '☀️';
  if (code <= 2) return isNight ? '🌙' : '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '—';
}

export function weatherCodeAIconoGrafico(code: number | null): string {
  if (code == null) return '·';
  if (code === 0) return '☀';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁';
  if (code >= 45 && code <= 48) return '≡';
  if (code >= 51 && code <= 67) return '☂';
  if (code >= 71 && code <= 86) return '❄';
  if (code >= 95) return '⚡';
  return '·';
}
// src/lib/openmeteo.ts