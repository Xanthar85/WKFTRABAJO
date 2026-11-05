// src/screens/Navegacion/BrujulaNavegacion.tsx
// WKF — Brújula de navegación (F6.4 + fix WKF1.050 + Fase Melón).
// Fix: la aguja no rotaba en Chrome Android. El filter glow aplicado
// al <g> que rota congela el transform. Solución: el glow va al dial,
// la aguja va sin filter y sin transition.
// Colores: extremo NARANJA = norte, extremo AMARILLO = sur.
//
// FASE MELÓN (WKF1.078):
//   · La AGUJA siempre marca el norte de la Tierra (independiente del
//     modo del mapa). Si giras el móvil, la aguja gira.
//   · La ROSA DE LOS VIENTOS (el dial con los grados) marca el norte
//     del mapa. En 'norte' está fija, en 'rumbo' gira con el mapa.

import React from 'react';

export type ModoBrujula = 'norte' | 'rumbo';

export interface BrujulaNavegacionProps {
  heading: number;
  size?: number;
  color?: string;
  glow?: boolean;
  animatedSweep?: boolean;
  strokeBg?: string;
  modo?: ModoBrujula;
}

export const BrujulaNavegacion: React.FC<BrujulaNavegacionProps> = ({
  heading,
  size = 200,
  color = '#00E56A',
  glow = true,
  animatedSweep = false,
  strokeBg,
  modo = 'norte',
}) => {
  const rumboNormalizado = Number.isFinite(heading)
    ? ((heading % 360) + 360) % 360
    : 0;

  // La aguja siempre marca el norte de la Tierra.
  // Si el móvil está orientado al norte, heading=0, la aguja apunta arriba.
  // Si el móvil está orientado al este, heading=90, la aguja apunta a la izquierda.
  // En coordenadas SVG, rotar el grupo por -heading hace que la aguja
  // apunte hacia el norte real.
  const rotacionAguja = -rumboNormalizado;

  // La rosa de los vientos (el dial) marca el norte del mapa.
  // Si el mapa está en 'norte', el dial está fijo.
  // Si el mapa está en 'rumbo', el dial gira con el mapa (que está rotado
  // por -heading en la pantalla, así que el dial debe rotar por -heading
  // también para compensar).
  const rotacionRosa = modo === 'rumbo' ? -rumboNormalizado : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {glow && (
        <defs>
          <filter id="brujula-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blurWide" />
            <feGaussianBlur stdDeviation="4" result="blurTight" />
            <feMerge>
              <feMergeNode in="blurWide" />
              <feMergeNode in="blurTight" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {animatedSweep && (
        <g
          style={{
            transformOrigin: '250px 250px',
            animation: 'radarSpin 6s linear infinite',
          }}
        >
          <path
            d="M 250 250 L 250 60 A 190 190 0 0 1 384 116 Z"
            fill={color}
            opacity="0.15"
          />
          <line
            x1="250"
            y1="250"
            x2="384"
            y2="116"
            stroke={color}
            strokeWidth="2.5"
            opacity="0.6"
          />
        </g>
      )}

      {/* DIAL (anillos, marcas, cuadrantes).
          Gira con el mapa si el modo es 'rumbo'. */}
      <g
        transform={`rotate(${rotacionRosa} 250 250)`}
        stroke={color}
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <circle
          cx="250"
          cy="250"
          r="236"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="6 6"
          strokeOpacity="0.45"
        />
        <circle
          cx="250"
          cy="250"
          r="200"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.6"
        />
        <circle
          cx="250"
          cy="250"
          r="140"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 3"
          strokeOpacity="0.4"
        />
        <circle
          cx="250"
          cy="250"
          r="70"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />

        {Array.from({ length: 36 }, (_, i) => {
          const angleDeg = i * 10;
          const rad = ((angleDeg - 90) * Math.PI) / 180;
          const isCardinal = angleDeg % 90 === 0;
          const isMajor = angleDeg % 30 === 0;
          const rInner = isCardinal ? 198 : isMajor ? 204 : 210;
          const rOuter = 218;
          const x1 = 250 + rInner * Math.cos(rad);
          const y1 = 250 + rInner * Math.sin(rad);
          const x2 = 250 + rOuter * Math.cos(rad);
          const y2 = 250 + rOuter * Math.sin(rad);
          const isNorthOrSouth = angleDeg === 0 || angleDeg === 180;
          const strokeColor =
            angleDeg === 0
              ? '#FF8A00'
              : angleDeg === 180
              ? '#E5E500'
              : color;
          return (
            <line
              key={`tick-${i}`}
              x1={x1.toFixed(1)}
              y1={y1.toFixed(1)}
              x2={x2.toFixed(1)}
              y2={y2.toFixed(1)}
              stroke={strokeColor}
              strokeWidth={isNorthOrSouth ? 8 : isCardinal ? 3.5 : isMajor ? 2.5 : 1.5}
              strokeLinecap={isNorthOrSouth ? 'round' : undefined}
              strokeOpacity={isCardinal ? 1 : isMajor ? 0.95 : 0.6}
            />
          );
        })}

        <line x1="250" y1="20" x2="250" y2="100" stroke="#FF8A00" strokeWidth="8" strokeLinecap="round" />
        <line x1="250" y1="400" x2="250" y2="480" stroke="#E5E500" strokeWidth="8" strokeLinecap="round" />
        <line x1="20" y1="250" x2="100" y2="250" stroke={color} strokeWidth="3.5" />
        <line x1="400" y1="250" x2="480" y2="250" stroke={color} strokeWidth="3.5" />

        <path d="M 230 110 A 140 140 0 0 0 110 230" stroke={color} strokeWidth="6" />
        <path d="M 110 270 A 140 140 0 0 0 230 390" stroke={color} strokeWidth="6" />
        <path d="M 270 390 A 140 140 0 0 0 390 270" stroke={color} strokeWidth="6" />
        <path d="M 390 230 A 140 140 0 0 0 270 110" stroke={color} strokeWidth="6" />
      </g>

      {/* AGUJA. Marca SIEMPRE el norte de la Tierra. */}
      <g
        transform={`rotate(${rotacionAguja} 250 250)`}
        filter={glow ? 'url(#brujula-glow)' : undefined}
      >
        <line
          x1="250"
          y1="250"
          x2="250"
          y2="140"
          stroke="#FF8A00"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line
          x1="250"
          y1="250"
          x2="250"
          y2="360"
          stroke="#E5E500"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>

      {/* Centro (eje de la aguja). Fuera del grupo que rota. */}
      <circle cx="250" cy="250" r="10" fill="#0A0A0A" stroke={color} strokeWidth="3" />
      <circle cx="250" cy="250" r="3" fill={color} />
    </svg>
  );
};

export default BrujulaNavegacion;
// src/screens/Navegacion/BrujulaNavegacion.tsx