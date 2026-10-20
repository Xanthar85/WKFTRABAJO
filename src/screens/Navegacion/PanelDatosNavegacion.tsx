// src/screens/Navegacion/PanelDatosNavegacion.tsx
// WKF — Panel de datos de navegación (Fase D, correcciones v6 - FINAL).
//
// El Triángulo Verde (Rumbo a seguir) es el único elemento FIJO,
// clavado en el centro de la barra.
// Todo lo demás (letras, bola, barra) se mueve respecto a él.
//   - Fila 1: Letras cardinales grandes y blancas + triángulo verde.
//   - Fila 2: Bola azul (Rumbo real) + barra de desvío glow.
//   - Textos: "Rumbo a seguir" y "Rumbo real".

import React from 'react';

export interface PanelDatosNavegacionProps {
  distanciaM: number | null;
  rumboASeguir: number | null;
  rumboReal: number | null;
  velocidadMs: number | null;
  velocidadTexto?: string | null;
  eta: string | null;
  modoManual?: boolean;
  rumboManual?: number | null;
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

const CARDINALES: Array<{ deg: number; label: string; esCardinal: boolean }> = [
  { deg: 0, label: 'N', esCardinal: true },
  { deg: 45, label: 'NE', esCardinal: false },
  { deg: 90, label: 'E', esCardinal: true },
  { deg: 135, label: 'SE', esCardinal: false },
  { deg: 180, label: 'S', esCardinal: true },
  { deg: 225, label: 'SO', esCardinal: false },
  { deg: 270, label: 'O', esCardinal: true },
  { deg: 315, label: 'NO', esCardinal: false },
];

function normalizar360(v: number): number {
  return ((v % 360) + 360) % 360;
}

function diffAngular(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

export const PanelDatosNavegacion: React.FC<PanelDatosNavegacionProps> = ({
  distanciaM,
  rumboASeguir,
  rumboReal,
  velocidadMs,
  velocidadTexto,
  eta,
  modoManual = false,
  rumboManual = null,
}) => {
  const dist = formatearDistancia(distanciaM);
  const vel = formatearVelocidad(velocidadMs);
  const usarTextoVelocidad =
    typeof velocidadTexto === 'string' && velocidadTexto.trim() !== '';

  const tieneASeguir = rumboASeguir != null && Number.isFinite(rumboASeguir);
  const tieneManual = rumboManual != null && Number.isFinite(rumboManual);
  const tieneReal = rumboReal != null && Number.isFinite(rumboReal);

  const rumboASeguirNorm = tieneASeguir ? normalizar360(rumboASeguir!) : (tieneManual ? normalizar360(rumboManual!) : null);
  const rumboRealNorm = tieneReal ? normalizar360(rumboReal!) : null;

  // El centro de la cinta es el Rumbo a seguir (triángulo verde fijo).
  const centroCinta = rumboASeguirNorm ?? 0;

  // Posición del rumbo real (bola azul) respecto al centro.
  const deltaReal = rumboRealNorm != null ? diffAngular(centroCinta, rumboRealNorm) : null;
  const pctReal = deltaReal != null ? 50 + (deltaReal / 180) * 50 : null;

  // Desviación para el color
  let colorBarra = 'var(--accent)';
  if (deltaReal != null) {
    const abs = Math.abs(deltaReal);
    if (abs < 20) colorBarra = 'var(--accent)';
    else if (abs < 60) colorBarra = 'var(--verdict-aceptable)';
    else colorBarra = 'var(--verdict-desaconsejado)';
  }

  // Posición de las marcas cardinales respecto al centro
  const marcasVisibles: Array<{ pct: number; label: string; esCardinal: boolean }> = [];
  
  // Marcas cada 45 grados (letras)
  for (let repet = -1; repet <= 1; repet++) {
    for (const c of CARDINALES) {
      const deg = c.deg + repet * 360;
      const d = diffAngular(centroCinta, deg);
      if (d < -90 || d > 90) continue;
      const pct = ((d + 90) / 180) * 100;
      marcasVisibles.push({ pct, label: c.label, esCardinal: c.esCardinal });
    }
  }

  // Marcas de precisión (cada 15 grados) sin letra
  const marcasPrecision: number[] = [];
  for (let repet = -1; repet <= 1; repet++) {
    for (let deg = 0; deg < 360; deg += 15) {
      if (deg % 45 === 0) continue; // Las de 45 las pinta el bucle de letras
      const d = diffAngular(centroCinta, deg + repet * 360);
      if (d < -90 || d > 90) continue;
      marcasPrecision.push(((d + 90) / 180) * 100);
    }
  }

  const barraRectaStyle: React.CSSProperties | null =
    pctReal != null && Math.abs(deltaReal ?? 0) >= 1
      ? {
          position: 'absolute',
          top: 14, // centrado verticalmente en la fila inferior
          left: `${Math.min(50, pctReal)}%`,
          width: `${Math.abs(pctReal - 50)}%`,
          height: 3,
          backgroundColor: colorBarra,
          borderRadius: 2,
          boxShadow: `0 0 6px ${colorBarra}, 0 0 12px ${colorBarra}`,
          pointerEvents: 'none',
        }
      : null;

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

  const sinDatos = rumboASeguirNorm == null && rumboRealNorm == null;

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
      {/* BARRA HORIZONTAL DE RUMBO                                 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        
        {/* Contenedor de la brújula (2 filas grandes) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 80, // Más alta ahora que hay 2 renglones
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* ── FILA 1: Letras y Triángulo Verde ── */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Marcas de precisión (líneas blancas finas) */}
            {marcasPrecision.map((pct, idx) => (
              <div
                key={`prec-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  bottom: 0,
                  width: 1,
                  height: 6,
                  backgroundColor: 'var(--text-dim)',
                  opacity: 0.5,
                  pointerEvents: 'none',
                }}
              />
            ))}
            
            {/* Marcas cardinales (letras grandes y blancas) */}
            {marcasVisibles.map((m, idx) => (
              <div
                key={`marca-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${m.pct}%`,
                  bottom: 4,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    width: m.esCardinal ? 2 : 1,
                    height: 8,
                    backgroundColor: m.esCardinal ? 'var(--text)' : 'var(--text-dim)',
                    opacity: 0.8,
                    marginBottom: 2,
                  }}
                />
                <div
                  style={{
                    fontSize: m.esCardinal ? '0.85rem' : '0.7rem',
                    fontFamily: 'var(--font-mono, Fira Code, monospace)',
                    fontWeight: m.esCardinal ? 800 : 600,
                    color: '#FFFFFF', // Blanco potente
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.label}
                </div>
              </div>
            ))}

            {/* Triángulo Verde FIJO en el centro */}
            {rumboASeguirNorm != null && (
              <div
                title={`Rumbo a seguir: ${Math.round(rumboASeguirNorm)}°`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 2,
                  transform: 'translateX(-50%)',
                  color: 'var(--accent)',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  filter: 'drop-shadow(0 0 5px var(--accent))',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  zIndex: 10,
                }}
              >
                ▲
              </div>
            )}
          </div>

          {/* ── FILA 2: Bola azul y barra de desvío ── */}
          <div style={{ position: 'absolute', top: 40, left: 0, right: 0, height: 40 }}>
            {/* Eje horizontal sutil */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 19,
                height: 1,
                backgroundColor: 'var(--border)',
                opacity: 0.4,
                pointerEvents: 'none',
              }}
            />

            {/* Barra recta con glow (desde centro hacia la bola) */}
            {barraRectaStyle && <div style={barraRectaStyle} />}

            {/* Bola azul (Rumbo real) */}
            {pctReal != null && (
              <div
                title={`Rumbo real: ${Math.round(rumboRealNorm!)}°`}
                style={{
                  position: 'absolute',
                  left: `${pctReal}%`,
                  top: 13,
                  transform: 'translateX(-50%)',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-2)',
                  border: '2px solid var(--bg)',
                  boxShadow: '0 0 6px var(--accent-2), 0 0 12px var(--accent-2)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  zIndex: 5,
                }}
              />
            )}
          </div>

          {sinDatos && (
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

        {/* Leyenda inferior con nombres completos y mayúsculas correctas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono, Fira Code, monospace)',
            color: 'var(--text)',
            padding: '0 4px',
            lineHeight: 1.2,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                color: 'var(--accent)',
                fontSize: '0.85rem',
                filter: 'drop-shadow(0 0 3px var(--accent))',
                lineHeight: 1,
              }}
            >
              ▲
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
              Rumbo a seguir
            </span>
            <span style={{ fontWeight: 700 }}>
              {rumboASeguirNorm != null ? `${Math.round(rumboASeguirNorm)}°` : '—'}
            </span>
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 700 }}>
              {rumboRealNorm != null ? `${Math.round(rumboRealNorm)}°` : '—'}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
              Rumbo real
            </span>
            <span
              style={{
                color: 'var(--accent-2)',
                fontSize: '0.85rem',
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
      {/* FILA DE TRES DATOS: DISTANCIA | VELOCIDAD | ETA           */}
      {/* ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Distancia</span>
          <div style={cardValorStyle}>
            <span>{dist.valor}</span>
            {dist.sufijo && <span style={cardUnidadStyle}>{dist.sufijo}</span>}
          </div>
        </div>

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