// src/screens/Navegacion/PanelDatosNavegacion.tsx
// WKF — Panel de datos de navegación (F6.4).
// Muestra 3 datos grandes (distancia, rumbo a seguir, rumbo real)
// y 5 datos pequeños (velocidad, ETA, coordenadas, nombre del
// waypoint, número de waypoint). Datos inexistentes → "---".
//
// Props:
//   distanciaM: distancia al waypoint actual en metros, o null.
//   rumboASeguir: rumbo al waypoint en grados, o null.
//   rumboReal: rumbo real del kayak en grados, o null.
//   velocidadMs: velocidad actual en m/s, o null.
//   eta: string ya formateada ("12 min", "1h 05min"), o null.
//   coordenadas: string ya formateada ("40.12345, 0.12345"), o null.
//   nombreWaypoint: nombre del waypoint actual, o null.
//   numeroWaypoint: "2/5" si es ruta, o null si es waypoint suelto.
//   posicionCongelada: si true, muestra icono de pausa junto a la
//                      distancia con tooltip "Distancia congelada".
//   modoManual: si true, el ETA se oculta ("---").

import React from 'react';

export interface PanelDatosNavegacionProps {
  distanciaM: number | null;
  rumboASeguir: number | null;
  rumboReal: number | null;
  velocidadMs: number | null;
  eta: string | null;
  coordenadas: string | null;
  nombreWaypoint: string | null;
  numeroWaypoint: string | null;
  posicionCongelada?: boolean;
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

function formatearGrados(grados: number | null): string {
  if (grados == null || !Number.isFinite(grados)) return '---';
  return `${Math.round(((grados % 360) + 360) % 360)}°`;
}

function formatearVelocidad(ms: number | null): { valor: string; sufijo: string } {
  if (ms == null || !Number.isFinite(ms)) {
    return { valor: '---', sufijo: '' };
  }
  const kt = ms * 1.9438444924406;
  return { valor: kt.toFixed(1), sufijo: 'kt' };
}

export const PanelDatosNavegacion: React.FC<PanelDatosNavegacionProps> = ({
  distanciaM,
  rumboASeguir,
  rumboReal,
  velocidadMs,
  eta,
  coordenadas,
  nombreWaypoint,
  numeroWaypoint,
  posicionCongelada = false,
  modoManual = false,
}) => {
  const dist = formatearDistancia(distanciaM);
  const vel = formatearVelocidad(velocidadMs);

  const granStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '10px 6px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
  };
  const granLabelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-dim)',
    textAlign: 'center',
    lineHeight: 1.2,
  };
  const granValorStyle: React.CSSProperties = {
    fontSize: '1.6rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono, Fira Code, monospace)',
    color: 'var(--accent)',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
  };
  const granUnidadStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-dim)',
  };

  const smallStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    padding: '6px 4px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    flex: 1,
    minWidth: 0,
  };
  const smallLabelStyle: React.CSSProperties = {
    fontSize: '0.58rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-dim)',
    textAlign: 'center',
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  };
  const smallValorStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono, Fira Code, monospace)',
    color: 'var(--text)',
    lineHeight: 1.1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
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
      {/* Fila 1: 3 datos grandes */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={granStyle}>
          <span style={granLabelStyle}>Distancia</span>
          <span style={granValorStyle}>
            {dist.valor}
            {posicionCongelada && (
              <span
                title="Distancia congelada. Se actualizará cuando vuelva el GPS."
                style={{
                  marginLeft: 4,
                  fontSize: '1rem',
                  color: 'var(--text-dim)',
                }}
              >
                ⏸
              </span>
            )}
          </span>
          {dist.sufijo && <span style={granUnidadStyle}>{dist.sufijo}</span>}
        </div>

        <div style={granStyle}>
          <span style={granLabelStyle}>Rumbo a seguir</span>
          <span style={{ ...granValorStyle, color: 'var(--accent-2)' }}>
            {formatearGrados(rumboASeguir)}
          </span>
        </div>

        <div style={granStyle}>
          <span style={granLabelStyle}>Rumbo real</span>
          <span style={{ ...granValorStyle, color: '#FF8A00' }}>
            {formatearGrados(rumboReal)}
          </span>
        </div>
      </div>

      {/* Fila 2: 5 datos pequeños */}
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={smallStyle}>
          <span style={smallLabelStyle}>Velocidad</span>
          <span style={smallValorStyle}>
            {vel.valor}
            {vel.sufijo && (
              <span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: 2 }}>
                {vel.sufijo}
              </span>
            )}
          </span>
        </div>

        <div style={smallStyle}>
          <span style={smallLabelStyle}>ETA</span>
          <span style={smallValorStyle}>
            {modoManual ? '---' : eta ?? '---'}
          </span>
        </div>

        <div style={smallStyle}>
          <span style={smallLabelStyle}>Coordenadas</span>
          <span style={smallValorStyle} title={coordenadas ?? '---'}>
            {coordenadas ?? '---'}
          </span>
        </div>

        <div style={smallStyle}>
          <span style={smallLabelStyle}>Waypoint</span>
          <span style={smallValorStyle} title={nombreWaypoint ?? '---'}>
            {nombreWaypoint ?? '---'}
          </span>
        </div>

        <div style={smallStyle}>
          <span style={smallLabelStyle}>Nº</span>
          <span style={smallValorStyle}>{numeroWaypoint ?? '---'}</span>
        </div>
      </div>
    </div>
  );
};

export default PanelDatosNavegacion;
// src/screens/Navegacion/PanelDatosNavegacion.tsx