// src/screens/Navegacion/BrujulaNavegacion.tsx
// WKF — Brújula de navegación (F6.4 + fix WKF1.050).
// · La aguja rota con `heading` (rumbo real del kayak, 0-360).
// · Extremo NARANJA → NORTE. Extremo AMARILLO → SUR.
// · El dial (anillos, marcas, cuadrantes) queda fijo.
// · Si no hay heading válido, la aguja apunta al norte (0).

import React from 'react';

export interface BrujulaNavegacionProps {
  heading: number;
  size?: number;
  color?: string;
  glow?: boolean;
  animatedSweep?: boolean;
  strokeBg?: string;
}

export const BrujulaNavegacion: React.FC<BrujulaNavegacionProps> = ({
  heading,
  size = 200,
  color = '#00E56A',
  glow = true,
  animatedSweep = false,
  strokeBg = '#0A0A0A',
}) => {
  const rumboNormalizado = Number.isFinite(heading)
    ? ((heading % 360) + 360) % 360
    : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {strokeBg && <rect width="500" height="500" fill={strokeBg} />}
      {glow && (
        <defs>
          <filter id="brujula-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
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

      <g
        stroke={color}
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
        filter={glow ? 'url(#brujula-glow)' : undefined}
      >
        <circle
          cx="250"
          cy="250"
          r="236"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="6 6"
          strokeOpacity="0.25"
        />
        <circle
          cx="250"
          cy="250"
          r="200"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.4"
        />
        <circle
          cx="250"
          cy="250"
          r="140"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 3"
          strokeOpacity="0.2"
        />
        <circle
          cx="250"
          cy="250"
          r="70"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity="0.5"
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
          return (
            <line
              key={`tick-${i}`}
              x1={x1.toFixed(1)}
              y1={y1.toFixed(1)}
              x2={x2.toFixed(1)}
              y2={y2.toFixed(1)}
              strokeWidth={isCardinal ? 3.5 : isMajor ? 2.5 : 1.5}
              strokeOpacity={isCardinal ? 1 : isMajor ? 0.75 : 0.4}
            />
          );
        })}

        <line x1="250" y1="20" x2="250" y2="100" strokeWidth="3" />
        <line x1="250" y1="400" x2="250" y2="480" strokeWidth="3" />
        <line x1="20" y1="250" x2="100" y2="250" strokeWidth="3" />
        <line x1="400" y1="250" x2="480" y2="250" strokeWidth="3" />

        <path d="M 230 110 A 140 140 0 0 0 110 230" strokeWidth="6" />
        <path d="M 110 270 A 140 140 0 0 0 230 390" strokeWidth="6" />
        <path d="M 270 390 A 140 140 0 0 0 390 270" strokeWidth="6" />
        <path d="M 390 230 A 140 140 0 0 0 270 110" strokeWidth="6" />

        {/* Aguja: rota con heading. Naranja → norte, amarillo → sur. */}
        <g
          style={{
            transformOrigin: '250px 250px',
            transform: `rotate(${rumboNormalizado}deg)`,
            transition: 'transform 0.15s linear',
          }}
        >
          {/* Extremo NORTE (naranja) */}
          <line
            x1="250"
            y1="250"
            x2="250"
            y2="140"
            stroke="#FF8A00"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Extremo SUR (amarillo) */}
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

        <circle cx="250" cy="250" r="10" fill="#0A0A0A" stroke={color} strokeWidth="3" />
        <circle cx="250" cy="250" r="3" fill={color} />
      </g>
    </svg>
  );
};

export default BrujulaNavegacion;