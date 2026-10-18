// src/components/IconosBarra.tsx
import React, { useState, useEffect } from 'react';

// --- Icono de Navegación (Brújula) ---
export const WKFNavegacionIcon: React.FC<{
  size: number;
  glow: boolean;
  heading: number;
  label: string;
}> = ({ size, glow, heading, label }) => {
  const color = '#FF2D55';
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
          <filter id="wkf-glow-nav" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g
        stroke={color}
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
        filter={glow ? 'url(#wkf-glow-nav)' : undefined}
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
        <g style={{ transformOrigin: '250px 250px', transform: `rotate(${heading}deg)` }}>
          <line x1="250" y1="250" x2="250" y2="140" stroke="#FF8A00" strokeWidth="8" strokeLinecap="round" />
          <line x1="250" y1="250" x2="250" y2="360" stroke="#E5E500" strokeWidth="8" strokeLinecap="round" />
        </g>
        <circle cx="250" cy="250" r="10" fill="#0A0A0A" stroke={color} strokeWidth="3" />
      </g>
      <text x="250" y="460" textAnchor="middle" fill={color} fontSize="32" fontFamily="Fira Code, monospace" fontWeight="bold" filter={glow ? 'url(#wkf-glow-nav)' : undefined}>{label.toUpperCase()}</text>
    </svg>
  );
};


// --- Icono de Previsión (Ciclo de estados) ---
export const WKFPrevisionIcon: React.FC<{
  size: number;
  glow: boolean;
  label: string;
}> = ({ size, glow, label }) => {
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const color = '#00B8FF';

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
          <filter id="wkf-glow-forecast" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="clip-radar-forecast">
            <circle cx="250" cy="250" r="200" />
          </clipPath>
        </defs>
      )}
      <g
        stroke={color}
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
        filter={glow ? 'url(#wkf-glow-forecast)' : undefined}
      >
        <circle cx="250" cy="250" r="236" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.25" />
        <circle cx="250" cy="250" r="200" strokeWidth="2" strokeOpacity="0.4" />
        <circle cx="250" cy="250" r="140" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.2" />
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * 10 - 90) * Math.PI / 180;
          const major = i % 3 === 0;
          const cardinal = i % 9 === 0;
          return <line key={i} x1={250 + (major ? 204 : 210) * Math.cos(a)} y1={250 + (major ? 204 : 210) * Math.sin(a)} x2={250 + 218 * Math.cos(a)} y2={250 + 218 * Math.sin(a)} strokeWidth={cardinal ? 3.5 : major ? 2.5 : 1.5} strokeOpacity={cardinal ? 1 : major ? 0.75 : 0.4} />;
        })}

        {phase === 0 && <g stroke="#E5E500" filter={glow ? 'url(#wkf-glow-forecast)' : undefined}><circle cx="250" cy="250" r="50" strokeWidth="6" /><line x1="250" y1="160" x2="250" y2="180" strokeWidth="6" /><line x1="250" y1="320" x2="250" y2="340" strokeWidth="6" /><line x1="160" y1="250" x2="180" y2="250" strokeWidth="6" /><line x1="320" y1="250" x2="340" y2="250" strokeWidth="6" /></g>}
        {phase === 1 && <g stroke="#FF8A00" strokeWidth="6" opacity="0.9" fill="none" strokeLinecap="round"><path d="M 130 210 Q 200 170 250 210 T 370 210" /><path d="M 120 250 Q 190 210 250 250 T 380 250" /><path d="M 140 290 Q 210 250 250 290 T 360 290" /></g>}
        {phase === 2 && <g stroke="#FF2D55" strokeWidth="6" fill="none" strokeLinecap="round"><path d="M 110 280 Q 180 200 250 280 T 390 280" /></g>}
        {phase === 3 && <g stroke="#007BFF" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M 170 280 Q 170 230 210 230 Q 230 190 280 210 Q 330 190 340 240 Q 380 250 360 290 Q 340 310 300 310 L 190 310 Q 150 310 170 280 Z" /></g>}
        {phase === 4 && flash && <g clipPath="url(#clip-radar-forecast)"><rect x="0" y="0" width="500" height="500" fill="#FFFFFF" /><polygon points="300,150 180,270 240,270 200,350 320,230 260,230" fill="#000000" stroke="#000000" strokeWidth="2" /></g>}
      </g>
      <text x="250" y="460" textAnchor="middle" fill={color} fontSize="32" fontFamily="Fira Code, monospace" fontWeight="bold" filter={glow ? 'url(#wkf-glow-forecast)' : undefined}>{label.toUpperCase()}</text>
    </svg>
  );
};


// --- Icono de Ko-fi (Rapala neón) ---
export const WKFKoFiIcon: React.FC<{
  size: number;
  glow: boolean;
  label: string;
}> = ({ size, glow, label }) => {
  const neonPink = '#FF99CC';
  const royalBlue = '#0055FF';
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
            <filter id="wkf-neon-glow-pink" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
             <filter id="wkf-glow-blue" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </>
        )}
        <style>{`@keyframes neonPulse { 0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 4px ${neonPink}); } 50% { opacity: 1; filter: drop-shadow(0 0 15px ${neonPink}) drop-shadow(0 0 30px ${neonPink}); } } .neon-flicker { animation: neonPulse 3s ease-in-out infinite; }`}</style>
      </defs>
      <g stroke={royalBlue} fill="none" strokeLinecap="square" strokeLinejoin="miter" filter={glow ? 'url(#wkf-glow-blue)' : undefined} opacity="0.8">
        <circle cx="250" cy="250" r="236" strokeWidth="1.5" strokeDasharray="6 6" />
        <circle cx="250" cy="250" r="200" strokeWidth="2" />
        <circle cx="250" cy="250" r="140" strokeWidth="1" strokeDasharray="3 3" />
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * 10 - 90) * Math.PI / 180;
          const major = i % 3 === 0;
          const cardinal = i % 9 === 0;
          return <line key={i} x1={250 + (major ? 204 : 210) * Math.cos(a)} y1={250 + (major ? 204 : 210) * Math.sin(a)} x2={250 + 218 * Math.cos(a)} y2={250 + 218 * Math.sin(a)} strokeWidth={cardinal ? 3.5 : major ? 2.5 : 1.5} strokeOpacity={cardinal ? 1 : major ? 0.75 : 0.4} />;
        })}
      </g>
      <g className="neon-flicker" stroke={neonPink} fill="none" strokeLinecap="round" strokeLinejoin="round" filter={glow ? 'url(#wkf-neon-glow-pink)' : undefined}>
        <path d="M 180 280 Q 220 240 280 180 Q 320 140 350 110 Q 340 150 320 190 Q 280 260 220 310 Z" strokeWidth="6" />
        <path d="M 260 200 Q 280 170 300 160 Q 290 190 280 210" strokeWidth="6" />
        <path d="M 200 260 Q 180 280 160 290 Q 190 270 210 250" strokeWidth="6" />
        <circle cx="320" cy="150" r="8" fill={neonPink} stroke="none" />
        <path d="M 350 110 Q 370 90 380 120 Q 385 140 365 140" strokeWidth="4" />
      </g>
       <text x="250" y="460" textAnchor="middle" fill={neonPink} fontSize="32" fontFamily="Fira Code, monospace" fontWeight="bold" filter={glow ? 'url(#wkf-neon-glow-pink)' : undefined}>{label.toUpperCase()}</text>
    </svg>
  );
};
// src/components/IconosBarra.tsx