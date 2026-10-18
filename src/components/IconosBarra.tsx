// src/components/IconosBarra.tsx
import React from 'react';

// Exportamos los 5 iconos. Todos usan exactamente la misma estructura
// visual del Logo original, solo cambia el color base.

const IconoBase: React.FC<{ size: number; color: string; glow: boolean; idPrefix: string; delay: string }> = ({ size, color, glow, idPrefix, delay }) => {
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
          <filter id={`${idPrefix}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      <style>{`
        @keyframes radarSpin { 
          100% { transform: rotate(360deg); } 
        }
      `}</style>

      <g
        stroke={color}
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
        filter={glow ? `url(#${idPrefix}-glow)` : undefined}
      >
        {/* Haz giratorio de radar - Asíncrono */}
        <g style={{ 
          transformOrigin: '250px 250px', 
          animation: 'radarSpin 6s linear infinite',
          animationDelay: delay
        }}>
          <path d="M 250 250 L 250 60 A 190 190 0 0 1 384 116 Z" fill={color} opacity="0.15" />
          <line x1="250" y1="250" x2="384" y2="116" stroke={color} strokeWidth="2.5" opacity="0.6" />
        </g>

        {/* Retícula y anillos */}
        <circle cx="250" cy="250" r="236" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.25" />
        <circle cx="250" cy="250" r="200" strokeWidth="2" strokeOpacity="0.4" />
        <circle cx="250" cy="250" r="140" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.2" />
        <circle cx="250" cy="250" r="70" strokeWidth="1.5" strokeOpacity="0.5" />

        {/* Marcas perimetrales */}
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
            <line key={`tick-${i}`} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)}
              strokeWidth={isCardinal ? 3.5 : isMajor ? 2.5 : 1.5} strokeOpacity={isCardinal ? 1 : isMajor ? 0.75 : 0.4} />
          );
        })}

        {/* Cruz de mira */}
        <line x1="250" y1="20" x2="250" y2="100" strokeWidth="3" />
        <line x1="250" y1="400" x2="250" y2="480" strokeWidth="3" />
        <line x1="20" y1="250" x2="100" y2="250" strokeWidth="3" />
        <line x1="400" y1="250" x2="480" y2="250" strokeWidth="3" />

        {/* Arcos cardinales */}
        <path d="M 230 110 A 140 140 0 0 0 110 230" strokeWidth="6" />
        <path d="M 110 270 A 140 140 0 0 0 230 390" strokeWidth="6" />
        <path d="M 270 390 A 140 140 0 0 0 390 270" strokeWidth="6" />
        <path d="M 390 230 A 140 140 0 0 0 270 110" strokeWidth="6" />
      </g>
    </svg>
  );
};

// 1. Puntos (Verde - igual al logo original)
export const WKFPuntosIcon: React.FC<{ size: number; glow: boolean }> = ({ size, glow }) => {
  return <IconoBase size={size} color="var(--accent)" glow={glow} idPrefix="puntos" delay="0s" />;
};

// 2. Previsión (Azul)
export const WKFPrevisionIcon: React.FC<{ size: number; glow: boolean }> = ({ size, glow }) => {
  return <IconoBase size={size} color="#00B8FF" glow={glow} idPrefix="prevision" delay="-1.2s" />;
};

// 3. Navegación (Rojo)
export const WKFNavegacionIcon: React.FC<{ size: number; glow: boolean }> = ({ size, glow }) => {
  return <IconoBase size={size} color="#FF2D55" glow={glow} idPrefix="navegacion" delay="-2.4s" />;
};

// 4. Ko-fi (Rosa Neón)
export const WKFKoFiIcon: React.FC<{ size: number; glow: boolean }> = ({ size, glow }) => {
  return <IconoBase size={size} color="#FF99CC" glow={glow} idPrefix="kofi" delay="-3.6s" />;
};

// 5. Ajustes (Naranja)
export const WKFAjustesIcon: React.FC<{ size: number; glow: boolean }> = ({ size, glow }) => {
  return <IconoBase size={size} color="#FF8A00" glow={glow} idPrefix="ajustes" delay="-4.8s" />;
};
// src/components/IconosBarra.tsx