// src/components/IconosBarra.tsx
import React, { useState, useEffect } from 'react';

const AZUL_RETICULA = '#00B8FF';
const ROJO_NAV = '#FF2D55';
const ROSA_KOFI = '#FF99CC';

const ReticulaBase: React.FC<{ glow: boolean; color: string; idPrefix: string }> = ({ glow, color, idPrefix }) => {
  return (
    <g
      stroke={color}
      fill="none"
      strokeLinecap="square"
      strokeLinejoin="miter"
      filter={glow ? `url(#${idPrefix}-glow)` : undefined}
    >
      <circle cx="250" cy="250" r="236" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.25" />
      <circle cx="250" cy="250" r="200" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="250" cy="250" r="140" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.2" />
      <circle cx="250" cy="250" r="70" strokeWidth="1.5" strokeOpacity="0.5" />

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

      <line x1="250" y1="20" x2="250" y2="100" strokeWidth="3" />
      <line x1="250" y1="400" x2="250" y2="480" strokeWidth="3" />
      <line x1="20" y1="250" x2="100" y2="250" strokeWidth="3" />
      <line x1="400" y1="250" x2="480" y2="250" strokeWidth="3" />

      <path d="M 230 110 A 140 140 0 0 0 110 230" strokeWidth="6" />
      <path d="M 110 270 A 140 140 0 0 0 230 390" strokeWidth="6" />
      <path d="M 270 390 A 140 140 0 0 0 390 270" strokeWidth="6" />
      <path d="M 390 230 A 140 140 0 0 0 270 110" strokeWidth="6" />
    </g>
  );
};

const Etiqueta: React.FC<{ text: string; glow: boolean; color: string; idPrefix: string }> = ({ text, glow, color, idPrefix }) => (
  <text 
    x="250" 
    y="470" 
    textAnchor="middle" 
    fill={color} 
    fontSize="32" 
    fontFamily="Fira Code, monospace" 
    fontWeight="bold" 
    filter={glow ? `url(#${idPrefix}-glow)` : undefined}
  >
    {text.toUpperCase()}
  </text>
);

export const WKFNavegacionIcon: React.FC<{
  size: number;
  glow: boolean;
  heading: number;
  label: string;
}> = ({ size, glow, heading, label }) => {
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
          <filter id="wkf-nav-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      
      <ReticulaBase glow={glow} color={ROJO_NAV} idPrefix="wkf-nav" />

      <g filter={glow ? 'url(#wkf-nav-glow)' : undefined}>
        <g style={{ transformOrigin: '250px 250px', transform: `rotate(${heading}deg)` }}>
          <line x1="250" y1="250" x2="250" y2="140" stroke="#FF8A00" strokeWidth="8" strokeLinecap="round" />
          <line x1="250" y1="250" x2="250" y2="360" stroke="#E5E500" strokeWidth="8" strokeLinecap="round" />
        </g>
        <circle cx="250" cy="250" r="10" fill="#0A0A0A" stroke={ROJO_NAV} strokeWidth="3" />
        <circle cx="250" cy="250" r="3" fill={ROJO_NAV} />
      </g>

      <Etiqueta text={label} glow={glow} color={ROJO_NAV} idPrefix="wkf-nav" />
    </svg>
  );
};


export const WKFPrevisionIcon: React.FC<{
  size: number;
  glow: boolean;
  label: string;
}> = ({ size, glow, label }) => {
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setPhase((p) => (p + 1) % 5), 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase === 4) {
      const timeout = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
      }, 5700);
      return () => clearTimeout(timeout);
    }
    setFlash(false);
  }, [phase]);

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
          <filter id="wkf-prev-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="clip-prev">
            <circle cx="250" cy="250" r="200" />
          </clipPath>
        </defs>
      )}

      <ReticulaBase glow={glow} color={AZUL_RETICULA} idPrefix="wkf-prev" />

      <g filter={glow ? 'url(#wkf-prev-glow)' : undefined}>
        {phase === 0 && (
          <g stroke="#E5E500">
            <circle cx="250" cy="250" r="60" strokeWidth="6" />
            <line x1="250" y1="150" x2="250" y2="170" strokeWidth="6" />
            <line x1="250" y1="330" x2="250" y2="350" strokeWidth="6" />
            <line x1="150" y1="250" x2="170" y2="250" strokeWidth="6" />
            <line x1="330" y1="250" x2="350" y2="250" strokeWidth="6" />
            <line x1="180" y1="180" x2="195" y2="195" strokeWidth="6" />
            <line x1="305" y1="305" x2="320" y2="320" strokeWidth="6" />
            <line x1="180" y1="320" x2="195" y2="305" strokeWidth="6" />
            <line x1="305" y1="195" x2="320" y2="180" strokeWidth="6" />
          </g>
        )}
        {phase === 1 && (
          <g stroke="#FF8A00" strokeWidth="6" opacity="0.9" fill="none" strokeLinecap="round">
            <path d="M 120 200 Q 200 150 250 200 T 380 200" />
            <path d="M 110 250 Q 190 200 250 250 T 390 250" />
            <path d="M 130 300 Q 210 250 250 300 T 370 300" />
          </g>
        )}
        {phase === 2 && (
          <g stroke="#FF2D55" strokeWidth="6" fill="none" strokeLinecap="round">
            <path d="M 100 290 Q 180 180 250 290 T 400 290" />
            <path d="M 220 250 Q 235 230 250 250" strokeWidth="4" />
          </g>
        )}
        {phase === 3 && (
          <g stroke="#007BFF" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 170 280 Q 170 230 210 230 Q 230 190 280 210 Q 330 190 340 240 Q 380 250 360 290 Q 340 310 300 310 L 190 310 Q 150 310 170 280 Z" />
          </g>
        )}
        {phase === 4 && flash && (
          <g clipPath="url(#clip-prev)">
            <rect x="0" y="0" width="500" height="500" fill="#FFFFFF" />
            <polygon points="300,150 180,270 240,270 200,350 320,230 260,230" fill="#000000" stroke="#000000" strokeWidth="2" />
          </g>
        )}
      </g>

      <Etiqueta text={label} glow={glow} color={AZUL_RETICULA} idPrefix="wkf-prev" />
    </svg>
  );
};


export const WKFKoFiIcon: React.FC<{
  size: number;
  glow: boolean;
  label: string;
}> = ({ size, glow, label }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {glow && (
          <>
            <filter id="wkf-kofi-glow-pink" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="wkf-kofi-glow-blue" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </>
        )}
        <style>{`@keyframes kofiPulse { 0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 4px ${ROSA_KOFI}); } 50% { opacity: 1; filter: drop-shadow(0 0 15px ${ROSA_KOFI}) drop-shadow(0 0 30px ${ROSA_KOFI}); } } .kofi-flicker { animation: kofiPulse 3s ease-in-out infinite; }`}</style>
      </defs>
      
      <ReticulaBase glow={glow} color={AZUL_RETICULA} idPrefix="wkf-kofi" />

      <g 
        className="kofi-flicker"
        stroke={ROSA_KOFI} 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        filter={glow ? 'url(#wkf-kofi-glow-pink)' : undefined}
      >
        <path d="M 180 280 Q 220 240 280 180 Q 320 140 350 110 Q 340 150 320 190 Q 280 260 220 310 Z" strokeWidth="6" />
        <path d="M 260 200 Q 280 170 300 160 Q 290 190 280 210" strokeWidth="6" />
        <path d="M 200 260 Q 180 280 160 290 Q 190 270 210 250" strokeWidth="6" />
        <circle cx="320" cy="150" r="8" fill={ROSA_KOFI} stroke="none" />
        <path d="M 350 110 Q 370 90 380 120 Q 385 140 365 140" strokeWidth="4" />
      </g>

      <Etiqueta text={label} glow={glow} color={ROSA_KOFI} idPrefix="wkf-kofi" />
    </svg>
  );
};
// src/components/IconosBarra.tsx