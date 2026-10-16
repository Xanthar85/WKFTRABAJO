// src/screens/PrevisionScreen.tsx
// WKF — Pantalla de Previsión meteorológica (tipo Windy).
// v1.019:
//   - Gráfico grande ampliado (ola, viento, deriva, actividad, líneas astronómicas).
//   - ResumenDia con botón MAR CRUZADA que sustituye a Clima cuando aplica.
//   - Modal explicativo de mar cruzada.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, getEmbarcacionParaSpot, type Embarcacion } from '../state/store.ts';
import {
  calcularVeredictoFranjaDia,
  veredictoAColor,
} from '../lib/verdict-ui.ts';
import {
  msAKmh,
  kmhABf,
  weatherCodeAIcono,
  weatherCodeAIconoGrafico,
} from '../lib/openmeteo.ts';
import type { SpotWeather, HourlyPoint } from '../lib/openmeteo.ts';
import type { Spot, FranjaUsuario } from '../state/store.ts';
import {
  calcularVeredicto,
  type FranjaDia,
  type Veredicto,
  type Umbral,
} from '../lib/verdict.ts';
import type { Kayak } from '../lib/kayaks.ts';
import type { Pato } from '../lib/patos.ts';
import { colorNumero, colorPescaCorriente, colorActividadPeces } from '../lib/verdict-color.ts';
import { calcularSol } from '../lib/sun.ts';
import { calcularLuna, emojiFase } from '../lib/moon.ts';
import { calcularActividadPorHora, type ActividadHora } from '../lib/actividad.ts';
import { abreviaturaViento } from '../lib/wind.ts';
import {
  formatearViento,
  formatearOla,
  formatearTemperatura,
  formatearCorriente,
  formatearPrecipitacion,
  valorViento,
  valorOla,
  valorTemperatura,
  SUFIJO_VIENTO,
  SUFIJO_OLA,
  SUFIJO_CORRIENTE,
  SUFIJO_TEMPERATURA,
  SUFIJO_PRECIPITACION,
} from '../lib/unidades.ts';

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const BF_A_KMH_MEDIO: Record<number, number> = {
  0: 1, 1: 3, 2: 8, 3: 15, 4: 24, 5: 33, 6: 44,
  7: 55, 8: 67, 9: 82, 10: 95, 11: 110, 12: 125,
};

function bfAKmh(bf: number): number {
  const b = Math.max(0, Math.min(12, Math.round(bf)));
  return BF_A_KMH_MEDIO[b] ?? 125;
}

// ============================================================
// DETECCIÓN DE MAR CRUZADA (duplicada de SpotScreen)
// ============================================================
function diferenciaAngular(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function hayMarCruzadaEnHora(h: HourlyPoint): boolean {
  const wh = h.windWaveHeight ?? 0;
  const sh = h.swellWaveHeight ?? 0;
  const wd = h.windWaveDirection;
  const sd = h.swellWaveDirection;
  if (wh <= 0.3 || sh <= 0.3) return false;
  if (wd == null || sd == null) return false;
  return diferenciaAngular(wd, sd) > 60;
}

function hayMarCruzadaEnHoras(horas: HourlyPoint[]): boolean {
  return horas.some(hayMarCruzadaEnHora);
}

// ============================================================
// MODAL DE MAR CRUZADA
// ============================================================
const ModalMarCruzada: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--verdict-desaconsejado)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 480,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--verdict-desaconsejado)',
              letterSpacing: '0.04em',
            }}
          >
            {t('marcruzada.titulo')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text)', margin: '0 0 12px 0' }}>
          {t('marcruzada.intro')}
        </p>

        <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text)', margin: '0 0 12px 0' }}>
          {t('marcruzada.cuerpo1')}
        </p>

        <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text)', margin: '0 0 12px 0' }}>
          {t('marcruzada.cuerpo2')}
        </p>

        <p
          style={{
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: 'var(--text-dim)',
            margin: '14px 0 0 0',
            fontStyle: 'italic',
          }}
        >
          {t('marcruzada.criterio')}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// GRÁFICO GRANDE
// ============================================================
interface GraficoGrandeProps {
  weather: SpotWeather | null;
  dia: Date;
  franjas: FranjaUsuario[];
  veredictosPorFranja: Record<string, Veredicto | null>;
  spot: Spot | null;
  embarcacion: Embarcacion;
}

const GraficoGrande: React.FC<GraficoGrandeProps> = ({
  weather,
  dia,
  franjas,
  veredictosPorFranja,
  spot,
  embarcacion,
}) => {
  const ajustes = useAppStore((s) => s.ajustes);
  const { t } = useTranslation();
  const u = ajustes.unidades;

  if (!weather || !weather.hourly || weather.hourly.length === 0) {
    return (
      <div
        style={{
          height: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.85rem',
          fontStyle: 'italic',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        —
      </div>
    );
  }

  const keyDia = localDateKey(dia);
  const puntos = weather.hourly
    .filter((h) => localDateKey(new Date(h.time)) === keyDia)
    .slice(0, 24);

  if (puntos.length === 0) {
    return (
      <div
        style={{
          height: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.85rem',
          fontStyle: 'italic',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        —
      </div>
    );
  }

  const W = 720;
  const H = 320;
  const paddingLeft = 34;
  const paddingRight = 34;
  const paddingTop = 20;
  const paddingBottom = 42;
  const plotW = W - paddingLeft - paddingRight;
  const plotH = H - paddingTop - paddingBottom;

  let olaMaxDia = 0;
  let vientoMaxDia = 0;
  let derivaMaxDia = 0;
  for (const p of puntos) {
    const o = p.waveHeight ?? 0;
    const v = msAKmh(p.windSpeed) ?? 0;
    const d = p.currentVelocity != null ? p.currentVelocity * 1.852 : 0;
    if (o > olaMaxDia) olaMaxDia = o;
    if (v > vientoMaxDia) vientoMaxDia = v;
    if (d > derivaMaxDia) derivaMaxDia = d;
  }

  const maxIzquierda = Math.max(olaMaxDia, derivaMaxDia, 0.1);
  let escalaIzquierda = Math.ceil(maxIzquierda * 1.15 * 10) / 10;
  if (escalaIzquierda < 0.1) escalaIzquierda = 0.1;

  let vientoEscala = Math.ceil((vientoMaxDia * 1.15) / 5) * 5;
  if (vientoEscala < 5) vientoEscala = 5;

  const xHora = (h: number) => paddingLeft + (h / 23) * plotW;
  const yIzquierda = (v: number) =>
    paddingTop + plotH - (Math.min(v, escalaIzquierda) / escalaIzquierda) * plotH;
  const yDerecha = (v: number) =>
    paddingTop + plotH - (Math.min(v, vientoEscala) / vientoEscala) * plotH;

  const franjaActiva =
    franjas.find((f) => f.id === ajustes.franjaActivaId) ?? franjas[0] ?? null;
  let umbralActivo: Umbral | null = null;
  if (franjaActiva) {
    const inicio = franjaActiva.inicio;
    const franjaDia: FranjaDia =
      inicio >= 0 && inicio < 12
        ? 'manana'
        : inicio >= 12 && inicio < 20
        ? 'tarde'
        : 'noche';

    const zonaSpot = spot?.zona ?? 'mediterraneo_espanol';
    const categoriaSpot = embarcacion.categoriaWKF;

    const res = calcularVeredicto(
      zonaSpot,
      categoriaSpot,
      ajustes.perfil,
      franjaDia,
      { viento: 0, ola: 0, periodo: 0, corriente: 0, marea: 0 },
      embarcacion
    );
    umbralActivo = res.umbralAplicado;
  }

  const sol = calcularSol(dia, spot?.lat ?? 0, spot?.lon ?? 0);
  const luna = calcularLuna(dia, spot?.lat ?? 0, spot?.lon ?? 0);

  const horaDecimal = (d: Date | null | undefined): number | null => {
    if (!d) return null;
    return d.getHours() + d.getMinutes() / 60;
  };

  interface LineaVertical {
    hora: number;
    color: string;
    icono: string;
    label: string;
    strokeWidth: number;
  }

  const lineasVerticales: LineaVertical[] = [];
  if (sol) {
    const orto = horaDecimal(sol.orto);
    const mediodia = horaDecimal(sol.mediodiaSolar);
    const ocaso = horaDecimal(sol.ocaso);
    const civilInicio = horaDecimal(sol.crepusculoCivilInicio);
    const civilFin = horaDecimal(sol.crepusculoCivilFin);

    if (orto != null) {
      lineasVerticales.push({ hora: orto, color: '#FFD500', icono: '☀', label: 'orto', strokeWidth: 1.5 });
    }
    if (mediodia != null) {
      lineasVerticales.push({ hora: mediodia, color: '#FFD500', icono: '☀', label: 'mediodía', strokeWidth: 1 });
    }
    if (ocaso != null) {
      lineasVerticales.push({ hora: ocaso, color: '#FFD500', icono: '☀', label: 'ocaso', strokeWidth: 1.5 });
    }
    if (civilInicio != null) {
      lineasVerticales.push({ hora: civilInicio, color: '#00B8FF', icono: '🌅', label: 'crepúsculo civil', strokeWidth: 1 });
    }
    if (civilFin != null) {
      lineasVerticales.push({ hora: civilFin, color: '#00B8FF', icono: '🌇', label: 'crepúsculo civil', strokeWidth: 1 });
    }
  }
  if (luna) {
    const ortoL = horaDecimal(luna.ortoLunar);
    const ocasoL = horaDecimal(luna.ocasoLunar);
    const emoji = emojiFase(luna.fase);
    if (ortoL != null) {
      lineasVerticales.push({ hora: ortoL, color: '#B0B0B0', icono: emoji, label: 'orto lunar', strokeWidth: 1 });
    }
    if (ocasoL != null) {
      lineasVerticales.push({ hora: ocasoL, color: '#B0B0B0', icono: emoji, label: 'ocaso lunar', strokeWidth: 1 });
    }
  }

  const actividad: ActividadHora[] = useMemo(() => {
    if (!weather?.hourly || !spot) return [];
    const mapa = new Map<string, { orto: Date | null; ocaso: Date | null }>();
    for (const h of weather.hourly) {
      const d = new Date(h.time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!mapa.has(key)) {
        const s = calcularSol(d, spot.lat, spot.lon);
        mapa.set(key, { orto: s?.orto ?? null, ocaso: s?.ocaso ?? null });
      }
    }
    return calcularActividadPorHora(weather.hourly, mapa);
  }, [weather, spot]);

  const actividadPorHora = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of actividad) {
      const h = new Date(a.hora).getHours();
      const k = `${new Date(a.hora).getFullYear()}-${new Date(a.hora).getMonth()}-${new Date(a.hora).getDate()}`;
      if (k === keyDia) m.set(h, a.coeficiente);
    }
    return m;
  }, [actividad, keyDia]);

  const olaPath = puntos
    .map((p, i) => {
      if (p.waveHeight == null) return null;
      const x = xHora(new Date(p.time).getHours());
      const y = yIzquierda(p.waveHeight);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((s): s is string => s !== null)
    .join(' ');

  const olaArea = (() => {
    const validos = puntos
      .map((p) => {
        if (p.waveHeight == null) return null;
        return { x: xHora(new Date(p.time).getHours()), y: yIzquierda(p.waveHeight) };
      })
      .filter((v): v is { x: number; y: number } => v !== null);
    if (validos.length < 2) return '';
    const first = validos[0];
    const last = validos[validos.length - 1];
    const lines = validos.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(1)},${v.y.toFixed(1)}`);
    return `${lines.join(' ')} L ${last.x.toFixed(1)},${(paddingTop + plotH).toFixed(1)} L ${first.x.toFixed(1)},${(paddingTop + plotH).toFixed(1)} Z`;
  })();

  const vientoPath = puntos
    .map((p, i) => {
      const v = msAKmh(p.windSpeed);
      if (v == null) return null;
      const x = xHora(new Date(p.time).getHours());
      const y = yDerecha(v);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((s): s is string => s !== null)
    .join(' ');

  const vientoArea = (() => {
    const validos = puntos
      .map((p) => {
        const v = msAKmh(p.windSpeed);
        if (v == null) return null;
        return { x: xHora(new Date(p.time).getHours()), y: yDerecha(v) };
      })
      .filter((v): v is { x: number; y: number } => v !== null);
    if (validos.length < 2) return '';
    const first = validos[0];
    const last = validos[validos.length - 1];
    const lines = validos.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(1)},${v.y.toFixed(1)}`);
    return `${lines.join(' ')} L ${last.x.toFixed(1)},${(paddingTop + plotH).toFixed(1)} L ${first.x.toFixed(1)},${(paddingTop + plotH).toFixed(1)} Z`;
  })();

  const derivaPath = puntos
    .map((p, i) => {
      if (p.currentVelocity == null) return null;
      const kmh = p.currentVelocity * 1.852;
      const x = xHora(new Date(p.time).getHours());
      const y = yIzquierda(kmh);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((s): s is string => s !== null)
    .join(' ');

  const marcasY = [0, 0.5, 1];
  const ahora = new Date();
  const esHoy = localDateKey(ahora) === keyDia;
  const horaAhora = ahora.getHours() + ahora.getMinutes() / 60;

  const umbOlaExi = umbralActivo ? umbralActivo.ola.exi : null;
  const umbOlaDes = umbralActivo ? umbralActivo.ola.des : null;
  const umbVieExiKmh = umbralActivo ? bfAKmh(umbralActivo.viento.exi) : null;
  const umbVieDesKmh = umbralActivo ? bfAKmh(umbralActivo.viento.des) : null;

  const COLOR_DERIVA = '#FF8A00';
  const COLOR_ACTIVIDAD = 'rgba(255, 255, 255, 0.55)';

  return (
    <div
      style={{
        width: '100%',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 8,
        backgroundColor: 'var(--bg)',
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {franjas.map((f) => {
          const v = veredictosPorFranja[f.id] ?? null;
          if (!v) return null;
          const color = veredictoAColor(v);
          const tramos: Array<[number, number]> = [];
          if (f.inicio < f.fin) tramos.push([f.inicio, f.fin]);
          else {
            tramos.push([f.inicio, 24]);
            tramos.push([0, f.fin]);
          }
          return tramos.map(([a, b], k) => {
            const x1 = xHora(a);
            const x2 = xHora(Math.min(23, b));
            const w = Math.max(0, x2 - x1);
            const yBottom = paddingTop + plotH;
            return (
              <g key={`franja-bg-${f.id}-${k}`}>
                <rect x={x1} y={paddingTop} width={w} height={plotH} fill={color} fillOpacity={0.03} />
                <line x1={x1} y1={yBottom} x2={x2} y2={yBottom} stroke={color} strokeWidth={2} />
              </g>
            );
          });
        })}

        {marcasY.map((frac) => {
          const y = paddingTop + plotH - frac * plotH;
          return (
            <line
              key={`grid-${frac}`}
              x1={paddingLeft} y1={y} x2={paddingLeft + plotW} y2={y}
              stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 3"
            />
          );
        })}

        {lineasVerticales.map((lv, i) => {
          const x = xHora(lv.hora);
          if (x < paddingLeft - 2 || x > paddingLeft + plotW + 2) return null;
          return (
            <g key={`lv-${i}`}>
              <line
                x1={x} y1={paddingTop} x2={x} y2={paddingTop + plotH}
                stroke={lv.color}
                strokeWidth={lv.strokeWidth}
                strokeDasharray={lv.strokeWidth < 1.5 ? '3 3' : undefined}
                opacity={0.75}
              />
              <text x={x} y={paddingTop + 12} fontSize={11} fill={lv.color} textAnchor="middle" style={{ pointerEvents: 'none' }}>
                {lv.icono}
              </text>
            </g>
          );
        })}

        {Array.from({ length: 24 }, (_, h) => {
          const coef = actividadPorHora.get(h);
          if (coef == null || coef === 0) return null;
          const x = xHora(h);
          const altura = (coef / 10) * plotH * 0.9;
          const barW = Math.max(2, plotW / 24 - 4);
          const y = paddingTop + plotH - altura;
          return (
            <g key={`act-${h}`}>
              <rect x={x - barW / 2} y={y} width={barW} height={altura} fill={COLOR_ACTIVIDAD} opacity={0.35} />
              {coef >= 7 && (
                <text x={x} y={y - 3} fontSize={7} fill="rgba(255,255,255,0.85)" textAnchor="middle" fontFamily="Fira Code, monospace">
                  {coef}
                </text>
              )}
            </g>
          );
        })}

        {umbOlaExi != null && umbOlaExi > 0 && umbOlaExi <= escalaIzquierda && (() => {
          const y = yIzquierda(umbOlaExi);
          const yText = y - 3 < paddingTop + 7 ? y + 9 : y - 3;
          const valConvertido = valorOla(umbOlaExi, u.ola) ?? umbOlaExi;
          return (
            <g key="umb-ola-exi">
              <line x1={paddingLeft} y1={y} x2={paddingLeft + plotW} y2={y} stroke="var(--verdict-exigente-text, #d97706)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
              <text x={paddingLeft + 4} y={yText} fontSize={9} fill="var(--verdict-exigente-text, #d97706)" fontFamily="Fira Code, monospace" opacity={0.85}>
                {valConvertido.toFixed(1)} {SUFIJO_OLA[u.ola]}
              </text>
            </g>
          );
        })()}

        {umbOlaDes != null && umbOlaDes > 0 && umbOlaDes <= escalaIzquierda && (() => {
          const y = yIzquierda(umbOlaDes);
          const yText = y - 3 < paddingTop + 7 ? y + 9 : y - 3;
          const valConvertido = valorOla(umbOlaDes, u.ola) ?? umbOlaDes;
          return (
            <g key="umb-ola-des">
              <line x1={paddingLeft} y1={y} x2={paddingLeft + plotW} y2={y} stroke="var(--verdict-desaconsejado-text, #dc2626)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
              <text x={paddingLeft + 4} y={yText} fontSize={9} fill="var(--verdict-desaconsejado-text, #dc2626)" fontFamily="Fira Code, monospace" opacity={0.85}>
                {valConvertido.toFixed(1)} {SUFIJO_OLA[u.ola]}
              </text>
            </g>
          );
        })()}

        {umbVieExiKmh != null && umbVieExiKmh > 0 && umbVieExiKmh <= vientoEscala && (() => {
          const y = yDerecha(umbVieExiKmh);
          const yText = y - 3 < paddingTop + 7 ? y + 9 : y - 3;
          const valConvertido = valorViento(umbVieExiKmh, u.viento) ?? umbVieExiKmh;
          return (
            <g key="umb-vie-exi">
              <line x1={paddingLeft} y1={y} x2={paddingLeft + plotW} y2={y} stroke="var(--verdict-exigente-text, #d97706)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
              <text x={paddingLeft + plotW - 4} y={yText} fontSize={9} fill="var(--verdict-exigente-text, #d97706)" textAnchor="end" fontFamily="Fira Code, monospace" opacity={0.85}>
                {Math.round(valConvertido)} {SUFIJO_VIENTO[u.viento]}
              </text>
            </g>
          );
        })()}

        {umbVieDesKmh != null && umbVieDesKmh > 0 && umbVieDesKmh <= vientoEscala && (() => {
          const y = yDerecha(umbVieDesKmh);
          const yText = y - 3 < paddingTop + 7 ? y + 9 : y - 3;
          const valConvertido = valorViento(umbVieDesKmh, u.viento) ?? umbVieDesKmh;
          return (
            <g key="umb-vie-des">
              <line x1={paddingLeft} y1={y} x2={paddingLeft + plotW} y2={y} stroke="var(--verdict-desaconsejado-text, #dc2626)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
              <text x={paddingLeft + plotW - 4} y={yText} fontSize={9} fill="var(--verdict-desaconsejado-text, #dc2626)" textAnchor="end" fontFamily="Fira Code, monospace" opacity={0.85}>
                {Math.round(valConvertido)} {SUFIJO_VIENTO[u.viento]}
              </text>
            </g>
          );
        })()}

        {marcasY.map((frac) => {
          const valCrudo = frac * escalaIzquierda;
          const valConvertido = valorOla(valCrudo, u.ola) ?? valCrudo;
          const y = paddingTop + plotH - frac * plotH;
          return (
            <g key={`yizq-${frac}`}>
              <line x1={paddingLeft - 4} y1={y} x2={paddingLeft} y2={y} stroke="var(--text-dim)" strokeWidth={0.6} />
              <text x={paddingLeft - 6} y={y + 3} fontSize={9} fill="var(--text-dim)" textAnchor="end" fontFamily="Fira Code, monospace">
                {valConvertido.toFixed(1)}
              </text>
            </g>
          );
        })}

        {marcasY.map((frac) => {
          const valCrudo = frac * vientoEscala;
          const valConvertido = valorViento(valCrudo, u.viento) ?? valCrudo;
          const y = paddingTop + plotH - frac * plotH;
          return (
            <g key={`yder-${frac}`}>
              <line x1={paddingLeft + plotW} y1={y} x2={paddingLeft + plotW + 4} y2={y} stroke="var(--text-dim)" strokeWidth={0.6} />
              <text x={paddingLeft + plotW + 6} y={y + 3} fontSize={9} fill="var(--text-dim)" textAnchor="start" fontFamily="Fira Code, monospace">
                {Math.round(valConvertido)}
              </text>
            </g>
          );
        })}

        <line x1={paddingLeft} y1={paddingTop + plotH} x2={paddingLeft + plotW} y2={paddingTop + plotH} stroke="var(--border)" strokeWidth={0.6} />

        {olaArea && <path d={olaArea} fill="var(--accent)" opacity={0.15} />}
        {olaPath && (
          <path d={olaPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {derivaPath && (
          <path d={derivaPath} fill="none" stroke={COLOR_DERIVA} strokeWidth={1.6} strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        )}

        {vientoArea && <path d={vientoArea} fill="var(--accent-2)" opacity={0.12} />}
        {vientoPath && (
          <path d={vientoPath} fill="none" stroke="var(--accent-2)" strokeWidth={1.6} strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {franjas.map((f) => {
          const v = veredictosPorFranja[f.id] ?? null;
          const color = v ? veredictoAColor(v) : 'var(--text-dim)';
          const tramos: Array<{ a: number; b: number; len: number }> = [];
          if (f.inicio < f.fin) {
            tramos.push({ a: f.inicio, b: f.fin, len: f.fin - f.inicio });
          } else {
            tramos.push({ a: f.inicio, b: 24, len: 24 - f.inicio });
            tramos.push({ a: 0, b: f.fin, len: f.fin });
          }

          let elegido = tramos[0];
          if (tramos.length > 1) {
            if (tramos[1].len >= tramos[0].len) {
              elegido = tramos[1];
            }
          }

          const centroHora = (elegido.a + Math.min(23, elegido.b)) / 2;
          const xCentro = xHora(centroHora);

          return (
            <text key={`label-franja-${f.id}`} x={xCentro} y={paddingTop + plotH + 13} fontSize={10} fill={color} textAnchor="middle" fontFamily="Fira Code, monospace" fontWeight={600}>
              {f.nombre}
            </text>
          );
        })}

        {Array.from({ length: 24 }, (_, h) => {
          const x = xHora(h);
          const yTick = paddingTop + plotH;
          return (
            <g key={`xh-${h}`}>
              <line x1={x} y1={yTick} x2={x} y2={yTick + 2} stroke="var(--text-dim)" strokeWidth={0.5} opacity={0.5} />
              <text x={x} y={paddingTop + plotH + 26} fontSize={8.5} fill="var(--text-dim)" textAnchor="middle" fontFamily="Fira Code, monospace">
                {h}
              </text>
            </g>
          );
        })}

        {esHoy && (
          <g>
            <line x1={xHora(horaAhora)} y1={paddingTop} x2={xHora(horaAhora)} y2={paddingTop + plotH} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
            <text x={xHora(horaAhora)} y={paddingTop - 6} fontSize={9} fill="var(--accent)" textAnchor="middle" fontFamily="Fira Code, monospace" fontWeight={600}>
              Ahora
            </text>
          </g>
        )}
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 34px 0',
          fontSize: '0.9rem',
          color: 'var(--text-dim)',
        }}
      >
        {puntos
          .filter((_, i) => i % 2 === 0)
          .map((p) => (
            <span key={p.time}>{weatherCodeAIconoGrafico(p.weatherCode)}</span>
          ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 14,
          padding: '6px 0 2px',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono, Fira Code, monospace)',
          color: 'var(--text-dim)',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>{t('prevision.legendWaves', { defaultValue: '— Ola' })} ({SUFIJO_OLA[u.ola]})</span>
        <span style={{ color: 'var(--accent-2)' }}>{t('prevision.legendWind', { defaultValue: '┄ Viento' })} ({SUFIJO_VIENTO[u.viento]})</span>
        <span style={{ color: COLOR_DERIVA }}>{t('prevision.legendDrift', { defaultValue: '┈ Deriva' })} (km/h)</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('prevision.legendActivity', { defaultValue: '▮ Actividad' })} (0-10)</span>
        <span style={{ color: '#FFD500' }}>{t('prevision.legendSun', { defaultValue: '│ Sol' })}</span>
        <span style={{ color: '#B0B0B0' }}>{t('prevision.legendMoon', { defaultValue: '│ Luna' })}</span>
        <span style={{ color: '#00B8FF' }}>{t('prevision.legendTwilight', { defaultValue: '│ Crepúsculo civil' })}</span>
      </div>
    </div>
  );
};

// ============================================================
// RESUMEN DÍA — con botón MAR CRUZADA que sustituye a Clima
// ============================================================
interface ResumenDiaProps {
  puntos: HourlyPoint[];
  onAbrirMarCruzada?: () => void;
}

const ResumenDia: React.FC<ResumenDiaProps> = ({ puntos, onAbrirMarCruzada }) => {
  const { t } = useTranslation();
  const ajustes = useAppStore((s) => s.ajustes);
  const u = ajustes.unidades;

  let olaMax = 0;
  let vientoMax = 0;
  const weatherCodeCount: Record<number, number> = {};
  for (const p of puntos) {
    if (p.waveHeight != null && p.waveHeight > olaMax) olaMax = p.waveHeight;
    const v = msAKmh(p.windGusts ?? p.windSpeed);
    if (v != null && v > vientoMax) vientoMax = v;
    if (p.weatherCode != null) {
      weatherCodeCount[p.weatherCode] = (weatherCodeCount[p.weatherCode] ?? 0) + 1;
    }
  }
  const weatherCodeDominante =
    Object.entries(weatherCodeCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const iconoClima =
    weatherCodeDominante != null
      ? weatherCodeAIcono(Number(weatherCodeDominante), false)
      : '—';

  const marCruzada = hayMarCruzadaEnHoras(puntos);

  const cardStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 12px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    textAlign: 'center',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4,
  };
  const valueStyle: React.CSSProperties = {
    fontSize: '1.4rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono, Fira Code, monospace)',
  };

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <div style={cardStyle}>
        <div style={labelStyle}>{t('prevision.maxWave')}</div>
        <div style={{ ...valueStyle, color: 'var(--accent)' }}>
          {formatearOla(olaMax, u.ola)}
        </div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>{t('prevision.maxWind')}</div>
        <div style={{ ...valueStyle, color: 'var(--accent-2)' }}>
          {formatearViento(vientoMax, u.viento)}
        </div>
      </div>
      {marCruzada ? (
        <button
          type="button"
          onClick={onAbrirMarCruzada}
          style={{
            ...cardStyle,
            backgroundColor: 'rgba(255, 45, 85, 0.15)',
            border: '2px solid var(--verdict-desaconsejado)',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(255, 45, 85, 0.35)',
          }}
        >
          <div style={{ ...labelStyle, color: 'var(--verdict-desaconsejado)' }}>
            {t('prevision.marCruzada', { defaultValue: 'Aviso' })}
          </div>
          <div
            style={{
              ...valueStyle,
              color: 'var(--verdict-desaconsejado)',
              fontSize: '0.95rem',
              letterSpacing: '0.06em',
              lineHeight: 1.2,
            }}
          >
            MAR CRUZADA
          </div>
        </button>
      ) : (
        <div style={cardStyle}>
          <div style={labelStyle}>{t('prevision.clima', { defaultValue: 'Clima' })}</div>
          <div style={{ ...valueStyle, fontSize: '1.6rem', lineHeight: 1.2 }}>{iconoClima}</div>
        </div>
      )}
    </div>
  );
};

function formatearCabeceraDia(fecha: Date, lang: string): string {
  const locale = lang.startsWith('en') ? 'en-GB' : 'es-ES';
  const diaSemana = fecha
    .toLocaleDateString(locale, { weekday: 'short' })
    .replace('.', '')
    .toUpperCase();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${diaSemana}, ${dia}/${mes}`;
}

function obtenerFranjaDia(fecha: Date): FranjaDia {
  const h = fecha.getHours();
  if (h < 12) return 'manana';
  if (h < 20) return 'tarde';
  return 'noche';
}

interface Tabla72HorasProps {
  weather: SpotWeather | null;
  spot: Spot | null;
  lang: string;
}

const Tabla72Horas: React.FC<Tabla72HorasProps> = ({ weather, spot, lang }) => {
  const { t } = useTranslation();
  const ajustes = useAppStore((s) => s.ajustes);
  const kayakActivo = getEmbarcacionParaSpot(spot, ajustes);
  const categoriaKayak = kayakActivo.categoriaWKF;

  const actividadMap = useMemo(() => {
    if (!weather?.hourly || !spot) return new Map<string, ActividadHora>();
    const mapaSol = new Map<string, { orto: Date | null; ocaso: Date | null }>();
    for (const h of weather.hourly) {
      const d = new Date(h.time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!mapaSol.has(key)) {
        const sol = calcularSol(d, spot.lat, spot.lon);
        mapaSol.set(key, { orto: sol?.orto ?? null, ocaso: sol?.ocaso ?? null });
      }
    }
    const lista = calcularActividadPorHora(weather.hourly, mapaSol);
    const m = new Map<string, ActividadHora>();
    for (const item of lista) {
      m.set(item.hora, item);
    }
    return m;
  }, [weather, spot]);

  const filas72 = useMemo(() => {
    const ahora = new Date();
    const baseYear = ahora.getFullYear();
    const baseMonth = ahora.getMonth();
    const baseDay = ahora.getDate();
    const ahoraHora = ahora.getHours();

    const result: Array<{
      fecha: Date;
      esCambioDia: boolean;
      point: HourlyPoint | null;
    }> = [];

    let prevDia: number | null = null;

    for (let i = 0; i < 72; i++) {
      const fecha = new Date(baseYear, baseMonth, baseDay, ahoraHora + i, 0, 0, 0);
      const diaNum = fecha.getDate();
      const esCambioDia = prevDia !== null && diaNum !== prevDia;
      prevDia = diaNum;

      let point: HourlyPoint | null = null;
      if (weather?.hourly) {
        point =
          weather.hourly.find((h) => {
            const d = new Date(h.time);
            return (
              d.getFullYear() === fecha.getFullYear() &&
              d.getMonth() === fecha.getMonth() &&
              d.getDate() === fecha.getDate() &&
              d.getHours() === fecha.getHours()
            );
          }) ?? null;
      }

      result.push({ fecha, esCambioDia, point });
    }

    return result;
  }, [weather]);

  const u = ajustes.unidades;

  const columnas: Array<{ key: string; label: string; unit: string }> = [
    { key: 'hora', label: 'Hora', unit: '' },
    { key: 'clima', label: t('factors.clima', { defaultValue: 'Clima' }), unit: '' },
    { key: 'temp', label: 'Temp', unit: `(${SUFIJO_TEMPERATURA[u.temperatura] ?? '°C'})` },
    { key: 'lluvia', label: 'Lluvia', unit: `(${SUFIJO_PRECIPITACION[u.precipitacion] ?? 'mm'})` },
    { key: 'olaf', label: t('factors.olaFondo', { defaultValue: 'OlaF' }), unit: `(${SUFIJO_OLA[u.ola] ?? 'm'})` },
    { key: 'per', label: 'Per', unit: '(s)' },
    { key: 'olav', label: t('factors.olaViento', { defaultValue: 'OlaV' }), unit: `(${SUFIJO_OLA[u.ola] ?? 'm'})` },
    { key: 'viento', label: 'Viento', unit: `(${SUFIJO_VIENTO[u.viento] ?? 'km/h'})` },
    { key: 'racha', label: t('factors.racha', { defaultValue: 'Racha' }), unit: `(${SUFIJO_VIENTO[u.viento] ?? 'km/h'})` },
    { key: 'deriva', label: t('factors.deriva', { defaultValue: 'Deriva' }), unit: '(km/h)' },
    { key: 'act', label: 'Actividad', unit: '(x/10)' },
  ];

  const celdaBase: React.CSSProperties = {
    padding: '5px 2px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        marginTop: 12,
        border: '1px solid var(--border)',
        borderRadius: 8,
        backgroundColor: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxHeight: '55vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono, Fira Code, monospace)',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--surface)',
              zIndex: 10,
              boxShadow: '0 1px 0 var(--border)',
            }}
          >
            <tr>
              {columnas.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '6px 2px',
                    fontWeight: 600,
                    color: 'var(--text-dim)',
                    fontSize: '0.68rem',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    verticalAlign: 'bottom',
                  }}
                >
                  <div style={{ lineHeight: 1.2 }}>{col.label}</div>
                  <div
                    style={{
                      fontSize: '0.6rem',
                      opacity: col.unit ? 0.75 : 0,
                      lineHeight: 1.2,
                      marginTop: 1,
                      minHeight: '0.72rem',
                    }}
                  >
                    {col.unit || '\u00A0'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas72.map((item) => {
              const { fecha, esCambioDia, point } = item;
              const franjaDia = obtenerFranjaDia(fecha);
              const horaTexto = `${String(fecha.getHours()).padStart(2, '0')}:00`;

              const climaIcono = weatherCodeAIcono(
                point?.weatherCode ?? null,
                fecha.getHours() < 7 || fecha.getHours() >= 21
              );

              const tempVal = valorTemperatura(point?.temperature ?? null, u.temperatura);
              const tempTexto = tempVal != null ? tempVal.toFixed(1).replace('.', ',') : '—';

              const precipVal = point?.precipitation ?? null;
              const lluviaTexto =
                precipVal == null || precipVal === 0
                  ? '—'
                  : (u.precipitacion === 'in' ? precipVal / 25.4 : precipVal)
                      .toFixed(1)
                      .replace('.', ',');

              const olaFVal = valorOla(point?.swellWaveHeight ?? null, u.ola);
              let olaFTexto = '—';
              if (olaFVal != null) {
                const alturaTxt = olaFVal.toFixed(1).replace('.', ',');
                if (point?.swellWaveDirection != null) {
                  const card = abreviaturaViento(point.swellWaveDirection);
                  olaFTexto = `${alturaTxt}/${card}`;
                } else {
                  olaFTexto = alturaTxt;
                }
              }
              const vOlaF =
                point?.swellWaveHeight != null && spot
                  ? calcularVeredicto(
                      spot.zona ?? 'mediterraneo_espanol',
                      categoriaKayak,
                      ajustes.perfil,
                      franjaDia,
                      {
                        viento: 0,
                        ola: point.swellWaveHeight,
                        periodo: point.swellWavePeriod ?? point.wavePeriod ?? 0,
                        corriente: 0,
                        marea: 0,
                      },
                      kayakActivo
                    ).veredictoPorFactor.ola
                  : null;
              const colorOlaF = colorNumero(vOlaF, ajustes.colorTabla);

              const perTexto =
                point?.wavePeriod != null
                  ? `${Math.round(point.wavePeriod)}`
                  : '—';
              const vPer =
                point?.wavePeriod != null && spot
                  ? calcularVeredicto(
                      spot.zona ?? 'mediterraneo_espanol',
                      categoriaKayak,
                      ajustes.perfil,
                      franjaDia,
                      {
                        viento: 0,
                        ola: 0,
                        periodo: point.wavePeriod,
                        corriente: 0,
                        marea: 0,
                      },
                      kayakActivo
                    ).veredictoPorFactor.periodo
                  : null;
              const colorPer = colorNumero(vPer, ajustes.colorTabla);

              const olaVVal = valorOla(point?.windWaveHeight ?? null, u.ola);
              const olaVTexto = olaVVal != null ? olaVVal.toFixed(1).replace('.', ',') : '—';
              const vOlaV =
                point?.windWaveHeight != null && spot
                  ? calcularVeredicto(
                      spot.zona ?? 'mediterraneo_espanol',
                      categoriaKayak,
                      ajustes.perfil,
                      franjaDia,
                      {
                        viento: 0,
                        ola: point.windWaveHeight,
                        periodo: point.windWavePeriod ?? point.wavePeriod ?? 0,
                        corriente: 0,
                        marea: 0,
                      },
                      kayakActivo
                    ).veredictoPorFactor.ola
                  : null;
              const colorOlaV = colorNumero(vOlaV, ajustes.colorTabla);

              const vVmed =
                point?.windSpeed != null && spot
                  ? calcularVeredicto(
                      spot.zona ?? 'mediterraneo_espanol',
                      categoriaKayak,
                      ajustes.perfil,
                      franjaDia,
                      {
                        viento: kmhABf(point.windSpeed) ?? 0,
                        ola: 0,
                        periodo: 0,
                        corriente: 0,
                        marea: 0,
                      },
                      kayakActivo
                    ).veredictoPorFactor.viento
                  : null;
              const colorVmed = colorNumero(vVmed, ajustes.colorTabla);

              const valorVientoNum = valorViento(point?.windSpeed ?? null, u.viento);
              let vientoTexto = '—';
              if (valorVientoNum != null && point?.windSpeed != null && point.windSpeed > 0) {
                const vStr = valorVientoNum.toFixed(1).replace('.', ',');
                if (point.windDirection != null) {
                  const card = abreviaturaViento(point.windDirection);
                  vientoTexto = `${vStr}/${card}`;
                } else {
                  vientoTexto = vStr;
                }
              }

              const vVmax =
                point?.windGusts != null && spot
                  ? calcularVeredicto(
                      spot.zona ?? 'mediterraneo_espanol',
                      categoriaKayak,
                      ajustes.perfil,
                      franjaDia,
                      {
                        viento: kmhABf(point.windGusts) ?? 0,
                        ola: 0,
                        periodo: 0,
                        corriente: 0,
                        marea: 0,
                      },
                      kayakActivo
                    ).veredictoPorFactor.viento
                  : null;
              const colorVmax = colorNumero(vVmax, ajustes.colorTabla);

              const valorRachaNum = valorViento(point?.windGusts ?? null, u.viento);
              const rachaTexto =
                valorRachaNum != null ? valorRachaNum.toFixed(1).replace('.', ',') : '—';
              const esRachaFuerte = point?.windGusts != null && point.windGusts >= 30;

              const colorKN = point?.currentVelocity != null
                ? colorPescaCorriente(point.currentVelocity)
                : null;

              let derivaTexto = '—';
              if (point?.currentVelocity != null) {
                const kmhDeriva = point.currentVelocity * 1.852;
                const dStr = kmhDeriva.toFixed(1).replace('.', ',');
                if (point.currentDirection != null) {
                  const card = abreviaturaViento(point.currentDirection);
                  derivaTexto = `${dStr}/${card}`;
                } else {
                  derivaTexto = dStr;
                }
              }

              const actItem = point ? actividadMap.get(point.time) : null;
              const actTexto =
                actItem != null ? String(actItem.coeficiente) : '—';

              return (
                <React.Fragment key={fecha.toISOString()}>
                  {esCambioDia && (
                    <tr>
                      <td
                        colSpan={11}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: 'rgba(0, 230, 118, 0.08)',
                          color: 'var(--accent)',
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          textAlign: 'left',
                          borderTop: '1px solid var(--border)',
                          borderBottom: '1px solid var(--border)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {formatearCabeceraDia(fecha, lang)}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ ...celdaBase, color: 'var(--text-dim)', fontWeight: 500 }}>
                      {horaTexto}
                    </td>
                    <td style={{ ...celdaBase, fontSize: '0.82rem' }}>{climaIcono}</td>
                    <td style={{ ...celdaBase, color: 'var(--text)' }}>{tempTexto}</td>
                    <td style={{ ...celdaBase, color: 'var(--text)' }}>{lluviaTexto}</td>
                    <td style={{ ...celdaBase, color: colorOlaF ?? 'var(--text)', fontWeight: colorOlaF ? 600 : 400 }}>
                      {olaFTexto}
                    </td>
                    <td style={{ ...celdaBase, color: colorPer ?? 'var(--text)', fontWeight: colorPer ? 600 : 400 }}>
                      {perTexto}
                    </td>
                    <td style={{ ...celdaBase, color: colorOlaV ?? 'var(--text)', fontWeight: colorOlaV ? 600 : 400 }}>
                      {olaVTexto}
                    </td>
                    <td style={{ ...celdaBase, color: colorVmed ?? 'var(--text)', fontWeight: colorVmed ? 600 : 400 }}>
                      {vientoTexto}
                    </td>
                    <td
                      style={{
                        ...celdaBase,
                        color: esRachaFuerte ? '#FF2D55' : (colorVmax ?? 'var(--text)'),
                        fontWeight: esRachaFuerte ? 700 : (colorVmax ? 600 : 400),
                        textShadow: esRachaFuerte ? '0 0 6px rgba(255, 45, 85, 0.7)' : 'none',
                      }}
                    >
                      {rachaTexto}
                    </td>
                    <td style={{ ...celdaBase, color: colorKN ?? 'var(--text)', fontWeight: colorKN ? 600 : 400 }}>
                      {derivaTexto}
                    </td>
                    <td style={{
                      ...celdaBase,
                      color: colorActividadPeces(actItem?.coeficiente ?? null) ?? 'var(--text)',
                      fontWeight: colorActividadPeces(actItem?.coeficiente ?? null) ? 600 : 400,
                    }}>{actTexto}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PrevisionScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const spots = useAppStore((s) => s.spots);
  const ajustes = useAppStore((s) => s.ajustes);
  const getFreshWeather = useAppStore((s) => s.getFreshWeather);

  const [spotActivoId, setSpotActivoId] = useState<string | null>(
    spots[0]?.id ?? null
  );
  const [diaOffset, setDiaOffset] = useState(0);
  const [modalMarCruzadaAbierto, setModalMarCruzadaAbierto] = useState(false);

  const spotActivo = spots.find((s) => s.id === spotActivoId) ?? spots[0] ?? null;
  const weather = spotActivo ? getFreshWeather(spotActivo.id) : null;
  const embarcacionSpot = getEmbarcacionParaSpot(spotActivo, ajustes);
  const categoriaSpot = embarcacionSpot.categoriaWKF;

  const lang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const dias = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + i);
      return { offset: i, fecha: d, key: localDateKey(d) };
    });
  }, []);

  const diaSeleccionado = dias[diaOffset];

  const veredictosPorFranja = useMemo(() => {
    const out: Record<string, Veredicto | null> = {};
    if (!spotActivo || !diaSeleccionado) return out;
    for (const f of ajustes.franjas) {
      out[f.id] = calcularVeredictoFranjaDia(
        spotActivo,
        weather,
        f,
        diaSeleccionado.fecha,
        categoriaSpot,
        ajustes.perfil,
        embarcacionSpot
      );
    }
    return out;
  }, [spotActivo, weather, ajustes.franjas, categoriaSpot, ajustes.perfil, diaSeleccionado, embarcacionSpot]);

  const puntosDia = useMemo(() => {
    if (!weather || !diaSeleccionado) return [];
    const key = diaSeleccionado.key;
    return weather.hourly
      .filter((h) => localDateKey(new Date(h.time)) === key)
      .slice(0, 24);
  }, [weather, diaSeleccionado]);

  const etiquetaDia = (offset: number, fecha: Date): string => {
    if (offset === 0) return t('home.today');
    if (offset === 1) return t('home.tomorrow');
    if (offset === 2) return t('home.dayAfter');
    return fecha.toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  if (spots.length === 0) {
    return (
      <div
        style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.9rem',
        }}
      >
        {t('prevision.noSpots')}
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 4px 80px' }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 4 }}>
        {spots.map((s) => {
          const activo = s.id === spotActivo?.id;
          return (
            <button
              key={s.id}
              onClick={() => setSpotActivoId(s.id)}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: 6,
                border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                backgroundColor: activo ? 'var(--accent-subtle)' : 'transparent',
                color: activo ? 'var(--accent)' : 'var(--text)',
                fontSize: '0.8rem',
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {s.name || t('common.unnamed')}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
        {dias.map(({ offset, fecha }) => {
          const activo = offset === diaOffset;
          return (
            <button
              key={offset}
              onClick={() => setDiaOffset(offset)}
              style={{
                flexShrink: 0,
                padding: '5px 10px',
                borderRadius: 6,
                border: `1px solid ${activo ? 'var(--accent-2)' : 'var(--border)'}`,
                backgroundColor: activo ? 'rgba(0, 184, 255, 0.12)' : 'transparent',
                color: activo ? 'var(--accent-2)' : 'var(--text-dim)',
                fontSize: '0.75rem',
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {etiquetaDia(offset, fecha)}
            </button>
          );
        })}
      </div>

      <GraficoGrande
        weather={weather}
        dia={diaSeleccionado.fecha}
        franjas={ajustes.franjas}
        veredictosPorFranja={veredictosPorFranja}
        spot={spotActivo}
        embarcacion={embarcacionSpot}
      />

      {puntosDia.length > 0 && (
        <ResumenDia
          puntos={puntosDia}
          onAbrirMarCruzada={() => setModalMarCruzadaAbierto(true)}
        />
      )}

      <Tabla72Horas spot={spotActivo} weather={weather} lang={lang} />

      {modalMarCruzadaAbierto && (
        <ModalMarCruzada onClose={() => setModalMarCruzadaAbierto(false)} />
      )}
    </div>
  );
};

export default PrevisionScreen;