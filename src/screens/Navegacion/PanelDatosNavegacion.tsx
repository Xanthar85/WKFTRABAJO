// src/screens/Navegacion/PanelDatosNavegacion.tsx
// WKF — Panel de datos de navegación (Fase D).
// Rediseño del panel inferior:
//   1. Barra horizontal de rumbo (indicador visual 360°, marcas cada 45°,
//      flecha ▲ rumbo a seguir, punto ● rumbo real, arco fino verde/amarillo/rojo).
//   2. Fila de tres datos grandes: DISTANCIA | VELOCIDAD | ETA.
// Fuera del panel: coordenadas, nombre del waypoint y número de waypoint
// (se muestran en la cabecera de navegación).
//
// Fase D (reenvío D3): se añade la prop opcional `velocidadTexto` que,
// si llega, sustituye al formateo interno de `velocidadMs`. Sirve para
// respetar la unidad de velocidad elegida en Ajustes (J7).

import React from 'react';

export interface PanelDatosNavegacionProps {
  distanciaM: number | null;
  rumboASeguir: number | null;
  rumboReal: number | null;
  velocidadMs: number | null;
  /** Velocidad ya formateada con sufijo, p.ej. "12.4 kt" o "23.0 km/h".
   *  Si llega, se usa tal cual y se ignora velocidadMs en la tarjeta. */
  velocidadTexto?: string | null;
  eta: string | null;
  modoManual?: boolean;
}

function formatearDistancia(metros: number | null): { valor: string; sufijo: string } {
  if (metros == null || !Number.isFinite(metros) || metros < 0) {
    return { valor: '---', sufijo: '' };
  }
  if (metros < 1000) {
    return { valor: Math.round(metros).toString(), sufijo: 'm' };
  }
  return { valor: (metros / 1000).toFixed(2), sufijo: 'km' };
}

function formatearVelocidad(ms: number | null): { valor: string; sufijo: string } {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return { valor: '---', sufijo: '' };
  }
  const kt = ms * 1.9438444924406;
  return { valor: kt.toFixed(1), sufijo: 'kt' };
}

const MARCAS_RUMBO: Array<{ deg: number; label: string }> = [
  { deg: 0, label: 'N' },
  { deg: 45, label: 'NE' },
  { deg: 90, label: 'E' },
  { deg: 135, label: 'SE' },
  { deg: 180, label: 'S' },
  { deg: 225, label: 'SO' },
  { deg: 270, label: 'O' },
  { deg: 315, label: 'NO' },
  { deg: 360, label: 'N' },
];

export const PanelDatosNavegacion: React.FC<PanelDatosNavegacionProps> = ({
  distanciaM,
  rumboASeguir,
  rumboReal,
  velocidadMs,
  velocidadTexto,
  eta,
  modoManual = false,
}) => {
  const dist = formatearDistancia(distanciaM);
  const vel = formatearVelocidad(velocidadMs);
  const usarTextoVelocidad =
    typeof velocidadTexto === 'string' && velocidadTexto.trim() !== '';

  const tieneASeguir = rumboASeguir != null && Number.isFinite(rumboASeguir);
  const tieneReal = rumboReal != null && Number.isFinite(rumboReal);
  const sinDatosRumbo = !tieneASeguir && !tieneReal;

  const rA = tieneASeguir ? ((rumboASeguir! % 360) + 360) % 360 : null;
  const rR = tieneReal ? ((rumboReal! % 360) + 360) % 360 : null;

  // Diferencia angular normalizada a [-180, +180]
  // Positiva = rumbo a seguir está a estribor (derecha) del rumbo real
  // Negativa = rumbo a seguir está a babor (izquierda) del rumbo real
  let diffAngular: number | null = null;
  let colorArco = 'var(--accent)';
  if (rA != null && rR != null) {
    diffAngular = ((rA - rR + 540) % 360) - 180;
    const absDiff = Math.abs(diffAngular);
    if (absDiff < 20) {
      colorArco = 'var(--accent)'; // verde
    } else if (absDiff < 60) {
      colorArco = 'var(--verdict-aceptable)'; // amarillo
    } else {
      colorArco = 'var(--verdict-desaconsejado)'; // rojo
    }
  }

  // Generación de paths del arco en escala SVG 0-1000
  const generarPathsArco = (): string[] => {
    if (rA == null || rR == null || diffAngular == null || Math.abs(diffAngular) < 1) {
      return [];
    }

    const y = 23;
    const cury = 8; // Arco curvado hacia arriba
    const diff = diffAngular;

    if (diff > 0) {
      // Hacia la derecha (estribor)
      if (rA >= rR) {
        const x1 = (rR / 360) * 1000;
        const x2 = (rA / 360) * 1000;
        const mx = (x1 + x2) / 2;
        return [`M ${x1} ${y} Q ${mx} ${cury} ${x2} ${y}`];
      } else {
        // Cruza el meridiano 360°/0°
        const x1 = (rR / 360) * 1000;
        const mx1 = (x1 + 1000) / 2;
        const x2 = (rA / 360) * 1000;
        const mx2 = x2 / 2;
        return [
          `M ${x1} ${y} Q ${mx1} ${cury} 1000 ${y}`,
          `M 0 ${y} Q ${mx2} ${cury} ${x2} ${y}`,
        ];
      }
    } else {
      // Hacia la izquierda (babor)
      if (rA <= rR) {
        const x1 = (rR / 360) * 1000;
        const x2 = (rA / 360) * 1000;
        const mx = (x1 + x2) / 2;
        return [`M ${x1} ${y} Q ${mx} ${cury} ${x2} ${y}`];
      } else {
        // Cruza 0°/360°
        const x1 = (rR / 360) * 1000;
        const mx1 = x1 / 2;
        const x2 = (rA / 360) * 1000;
        const mx2 = (1000 + x2) / 2;
        return [
          `M ${x1} ${y} Q ${mx1} ${cury} 0 ${y}`,
          `M 1000 ${y} Q ${mx2} ${cury} ${x2} ${y}`,
        ];
      }
    }
  };

  const pathsArco = generarPathsArco();

  // Estilos de tarjetas de datos
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '9px 6px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
  };

  const cardLabelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-dim)',
    textAlign: 'center',
    lineHeight: 1.2,
  };

  const cardValorStyle: React.CSSProperties = {
    fontSize: '1.45rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono, Fira Code, monospace)',
    color: 'var(--accent)',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'baseline',
    gap: 3,
  };

  const cardUnidadStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-dim)',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. BARRA HORIZONTAL DE RUMBO (46 px)                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 46,
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <svg
            viewBox="0 0 1000 46"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <line
              x1="0"
              y1="23"
              x2="1000"
              y2="23"
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="2,3"
              vectorEffect="non-scaling-stroke"
            />

            {MARCAS_RUMBO.map((m, idx) => {
              const x = (m.deg / 360) * 1000;
              const isCardinal = m.label.length === 1;
              return (
                <line
                  key={`tick-${idx}`}
                  x1={x}
                  y1={isCardinal ? 18 : 20}
                  x2={x}
                  y2={isCardinal ? 28 : 26}
                  stroke={isCardinal ? 'var(--text-dim)' : 'var(--border)'}
                  strokeWidth={isCardinal ? 1.5 : 1}
                  vectorEffect="non-scaling-stroke"
                  opacity={isCardinal ? 0.7 : 0.4}
                />
              );
            })}

            {pathsArco.map((d, i) => (
              <path
                key={`arco-${i}`}
                d={d}
                fill="none"
                stroke={colorArco}
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter="drop-shadow(0 0 3px rgba(0,0,0,0.5))"
              />
            ))}
          </svg>

          {MARCAS_RUMBO.map((m, idx) => {
            const pct = (m.deg / 360) * 100;
            const isNorte = m.label === 'N';
            return (
              <div
                key={`label-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  bottom: 3,
                  transform:
                    pct === 0
                      ? 'translateX(3px)'
                      : pct === 100
                      ? 'translateX(calc(-100% - 3px))'
                      : 'translateX(-50%)',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono, Fira Code, monospace)',
                  fontWeight: m.label.length === 1 ? 700 : 500,
                  color: isNorte ? 'var(--accent)' : 'var(--text-dim)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}
              >
                {m.label}
              </div>
            );
          })}

          {rA != null && (
            <div
              title={`Rumbo a seguir: ${Math.round(rA)}°`}
              style={{
                position: 'absolute',
                left: `${(rA / 360) * 100}%`,
                top: 4,
                transform: 'translateX(-50%)',
                color: 'var(--accent)',
                fontSize: '0.85rem',
                lineHeight: 1,
                filter: 'drop-shadow(0 0 5px var(--accent))',
                zIndex: 4,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              ▲
            </div>
          )}

          {rR != null && (
            <div
              title={`Rumbo real: ${Math.round(rR)}°`}
              style={{
                position: 'absolute',
                left: `${(rR / 360) * 100}%`,
                top: 14,
                transform: 'translateX(-50%)',
                color: 'var(--accent-2)',
                fontSize: '0.82rem',
                lineHeight: 1,
                filter: 'drop-shadow(0 0 4px var(--accent-2))',
                zIndex: 5,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              ●
            </div>
          )}

          {sinDatosRumbo && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dim)',
                fontSize: '1rem',
                fontWeight: 700,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              —
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.62rem',
            color: 'var(--text-dim)',
            padding: '0 4px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                color: 'var(--accent)',
                fontSize: '0.75rem',
                filter: 'drop-shadow(0 0 3px var(--accent))',
                lineHeight: 1,
              }}
            >
              ▲
            </span>
            <span>Rumbo a seguir</span>
            {rA != null && (
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                {Math.round(rA)}°
              </span>
            )}
          </span>

          {diffAngular != null && (
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                color: colorArco,
              }}
            >
              {Math.abs(diffAngular) < 1
                ? '0°'
                : `${Math.round(Math.abs(diffAngular))}° ${diffAngular > 0 ? 'estribor' : 'babor'}`}
            </span>
          )}

          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {rR != null && (
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                {Math.round(rR)}°
              </span>
            )}
            <span>Rumbo real</span>
            <span
              style={{
                color: 'var(--accent-2)',
                fontSize: '0.75rem',
                filter: 'drop-shadow(0 0 3px var(--accent-2))',
                lineHeight: 1,
              }}
            >
              ●
            </span>
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. FILA DE TRES DATOS: DISTANCIA | VELOCIDAD | ETA        */}
      {/* ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
        {/* Distancia */}
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Distancia</span>
          <div style={cardValorStyle}>
            <span>{dist.valor}</span>
            {dist.sufijo && <span style={cardUnidadStyle}>{dist.sufijo}</span>}
          </div>
        </div>

        {/* Velocidad */}
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Velocidad</span>
          <div style={{ ...cardValorStyle, color: 'var(--text)' }}>
            {usarTextoVelocidad ? (
              <span>{velocidadTexto}</span>
            ) : (
              <>
                <span>{vel.valor}</span>
                {vel.sufijo && <span style={cardUnidadStyle}>{vel.sufijo}</span>}
              </>
            )}
          </div>
        </div>

        {/* ETA */}
        <div style={cardStyle}>
          <span style={cardLabelStyle}>ETA</span>
          <div style={{ ...cardValorStyle, color: 'var(--text)' }}>
            <span>{modoManual ? '---' : eta ?? '---'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelDatosNavegacion;
// src/screens/Navegacion/PanelDatosNavegacion.tsx