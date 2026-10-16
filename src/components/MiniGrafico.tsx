// src/components/MiniGrafico.tsx
// WKF — Mini-gráfico de la tarjeta Home en formato tabla Windy.
// v1.011: formato tabla por horas. 8 columnas cada 3 h.
// Cada columna: hora, icono clima, temperatura, ola, viento, dirección.
// Cada número coloreado según su veredicto.

import React, { useMemo } from 'react';
import type { SpotWeather, HourlyPoint } from '../lib/openmeteo.ts';
import type { FranjaUsuario } from '../state/store.ts';
import type { Veredicto, CategoriaKayak, PerfilKayakista, Zona } from '../lib/verdict.ts';
import { calcularVeredicto, type FranjaDia } from '../lib/verdict.ts';
import { colorNumero, type NivelColorTabla } from '../lib/verdict-color.ts';
import {
  weatherCodeAIconoGrafico,
  msAKmh,
  gradosACardinal16,
} from '../lib/openmeteo.ts';
import { useAppStore } from '../state/store.ts';
import {
  valorViento,
  valorOla,
  SUFIJO_VIENTO,
  SUFIJO_OLA,
  formatearViento,
  formatearOla,
} from '../lib/unidades.ts';

export interface MiniGraficoProps {
  weather: SpotWeather | null;
  franjas: FranjaUsuario[];
  veredictos: Record<string, Veredicto | null>;
  fullWidth?: boolean;
}

interface ColumnaHora {
  hora: number;
  weatherCode: number | null;
  temperatura: number | null;
  ola: number | null;
  vientoKmh: number | null;
  vientoDir: number | null;
  vTemperatura: Veredicto | null;
  vOla: Veredicto | null;
  vViento: Veredicto | null;
}

function calcularFranjaDia(hora: number): FranjaDia {
  if (hora < 12) return 'manana';
  if (hora < 20) return 'tarde';
  return 'noche';
}

function extraerColumnas(
  weather: SpotWeather | null,
  zona: Zona,
  categoria: CategoriaKayak,
  perfil: PerfilKayakista
): ColumnaHora[] {
  if (!weather || !weather.hourly || weather.hourly.length === 0) return [];

  const ahora = new Date();
  const hoyKey = `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}`;

  const delDia = weather.hourly.filter((h) => {
    const d = new Date(h.time);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return k === hoyKey;
  });

  const fuente: HourlyPoint[] = delDia.length >= 12 ? delDia : weather.hourly.slice(0, 24);

  const porHora = new Map<number, HourlyPoint>();
  for (const h of fuente) {
    const hh = new Date(h.time).getHours();
    if (!porHora.has(hh)) porHora.set(hh, h);
  }

  const horas = [0, 3, 6, 9, 12, 15, 18, 21];

  return horas.map((hh) => {
    const p = porHora.get(hh) ?? null;
    const franjaDia = calcularFranjaDia(hh);

    if (!p) {
      return {
        hora: hh,
        weatherCode: null,
        temperatura: null,
        ola: null,
        vientoKmh: null,
        vientoDir: null,
        vTemperatura: null,
        vOla: null,
        vViento: null,
      };
    }

    const bf =
      p.windSpeed != null
        ? Math.round(Math.pow(p.windSpeed / 0.836, 2 / 3))
        : 0;

    const vOla =
      p.waveHeight != null
        ? calcularVeredicto(zona, categoria, perfil, franjaDia, {
            viento: 0,
            ola: p.waveHeight,
            periodo: p.wavePeriod ?? 0,
            corriente: 0,
            marea: 0,
          }).veredictoPorFactor.ola
        : null;

    const vViento =
      p.windSpeed != null
        ? calcularVeredicto(zona, categoria, perfil, franjaDia, {
            viento: bf,
            ola: 0,
            periodo: 0,
            corriente: 0,
            marea: 0,
          }).veredictoPorFactor.viento
        : null;

    let vTemperatura: Veredicto | null = null;
    if (p.temperature != null) {
      if (p.temperature >= 12) vTemperatura = 'FAVORABLE';
      else if (p.temperature >= 5) vTemperatura = 'ACEPTABLE';
      else if (p.temperature >= 0) vTemperatura = 'EXIGENTE';
      else vTemperatura = 'DESACONSEJADO';
    }

    return {
      hora: hh,
      weatherCode: p.weatherCode,
      temperatura: p.temperature,
      ola: p.waveHeight,
      vientoKmh: msAKmh(p.windSpeed),
      vientoDir: p.windDirection,
      vTemperatura,
      vOla,
      vViento,
    };
  });
}

const celdaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '3px 2px',
  fontFamily: 'var(--font-mono, Fira Code, monospace)',
  fontSize: '0.65rem',
  lineHeight: 1.1,
};

export const MiniGrafico: React.FC<MiniGraficoProps> = ({ weather }) => {
  const ajustes = useAppStore((s) => s.ajustes);
  const spots = useAppStore((s) => s.spots);
  const zona = spots[0]?.zona ?? 'mediterraneo_espanol';
  const nivelColor: NivelColorTabla = ajustes.colorTabla;

  const columnas = useMemo(
    () =>
      extraerColumnas(
        weather,
        zona,
        ajustes.categoriaKayak,
        ajustes.perfil
      ),
    [weather, zona, ajustes.categoriaKayak, ajustes.perfil]
  );

  if (columnas.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          padding: '14px 8px',
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.7rem',
          fontStyle: 'italic',
          border: '1px solid var(--border)',
          borderRadius: 4,
        }}
      >
        —
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 2,
        border: '1px solid var(--border)',
        borderRadius: 4,
        backgroundColor: 'var(--bg)',
        padding: 4,
      }}
    >
      {columnas.map((c) => {
        const colorTemp = colorNumero(c.vTemperatura, nivelColor);
        const colorOla = colorNumero(c.vOla, nivelColor);
        const colorViento = colorNumero(c.vViento, nivelColor);
        return (
          <div key={c.hora} style={celdaStyle}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>
              {String(c.hora).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1 }}>
              {weatherCodeAIconoGrafico(c.weatherCode)}
            </div>
            <div style={{ color: colorTemp ?? 'var(--text)', fontWeight: colorTemp ? 700 : 500 }}>
              {c.temperatura != null ? `${Math.round(c.temperatura)}°` : '—'}
            </div>
            <div style={{ color: colorOla ?? 'var(--text)', fontWeight: colorOla ? 700 : 500 }}>
              {formatearOla(c.ola, ajustes.unidades.ola)}
            </div>
            <div style={{ color: colorViento ?? 'var(--text)', fontWeight: colorViento ? 700 : 500 }}>
              {formatearViento(c.vientoKmh, ajustes.unidades.viento)}
            </div>
            <div
              style={{
                color: 'var(--text-dim)',
                fontSize: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {c.vientoDir != null ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      transform: `rotate(${c.vientoDir + 180}deg)`,
                      fontSize: '0.7rem',
                    }}
                  >
                    ↑
                  </span>
                  <span>{gradosACardinal16(c.vientoDir)}</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MiniGrafico;
