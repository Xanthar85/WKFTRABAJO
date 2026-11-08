// src/components/Logo.tsx
// WKF — Logo de la app.
// WKF1.085: se elimina el filtro SVG <feGaussianBlur> y se aísla
// el SVG en su propia capa (will-change + translateZ) para evitar
// que la GPU repinte en cada frame.

import React, { useEffect, useRef, useState } from 'react';

export interface LogoProps {
  variant?: 'horizontal' | 'icon';
  size?: 'sm' | 'md' | 'lg' | number;
  scheme?: 'neon' | 'white-on-black' | 'black-on-white';
  className?: string;
  animated?: boolean;
}

const COLORES_VEREDICTO = ['#00E56A', '#E5E500', '#FF8A00', '#FF2D55'];
const DURACION_CICLO_MS = 40000;

function hexARgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function interpolarHex(a: string, b: string, t: number): string {
  const ca = hexARgb(a);
  const cb = hexARgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function colorDelCiclo(t: number): string {
  const n = COLORES_VEREDICTO.length;
  const tramo = t * n;
  const i = Math.floor(tramo) % n;
  const j = (i + 1) % n;
  const frac = tramo - Math.floor(tramo);
  return interpolarHex(COLORES_VEREDICTO[i], COLORES_VEREDICTO[j], frac);
}

function useColorCiclico(activo: boolean): string {
  const [color, setColor] = useState<string>(() => {
    if (!activo) return COLORES_VEREDICTO[0];
    return colorDelCiclo(Math.random());
  });

  const rafRef = useRef<number | null>(null);
  const inicioRef = useRef<number>(performance.now());
  const offsetRef = useRef<number>(Math.random() * DURACION_CICLO_MS);

  useEffect(() => {
    if (!activo) {
      setColor(COLORES_VEREDICTO[0]);
      return;
    }
    inicioRef.current = performance.now();
    const tick = (ahora: number) => {
      const transcurrido = ahora - inicioRef.current + offsetRef.current;
      const t = (transcurrido % DURACION_CICLO_MS) / DURACION_CICLO_MS;
      setColor(colorDelCiclo(t));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [activo]);

  return color;
}

const WKFSymbol: React.FC<{
  size: number;
  color: string;
  glow: boolean;
  strokeBg?: string;
  animatedSweep?: boolean;
}> = ({ size, color, glow, strokeBg, animatedSweep = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="WKF"
      style={{
        display: 'block',
        flexShrink: 0,
        willChange: 'transform',
        transform: 'translateZ(0)',
        filter: glow
          ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color})`
          : undefined,
      }}
    >
      {strokeBg && <rect width="500" height="500" fill={strokeBg} />}

      {animatedSweep && (
        <g
          style={{ transformOrigin: '250px 250px', willChange: 'transform' }}
          className="animate-radar-spin"
        >
          <path d="M 250 250 L 250 60 A 190 190 0 0 1 384 116 Z" fill={color} opacity="0.15" />
          <line x1="250" y1="250" x2="384" y2="116" stroke={color} strokeWidth="2.5" opacity="0.6" />
        </g>
      )}

      <g stroke={color} fill="none" strokeLinecap="square" strokeLinejoin="miter">
        <circle cx="250" cy="250" r="236" stroke="rgba(0, 184, 255, 0.25)" strokeWidth="1.5" strokeDasharray="6 6" />
        <circle cx="250" cy="250" r="200" stroke={color} strokeWidth="2" strokeOpacity="0.4" />
        <circle cx="250" cy="250" r="140" stroke="rgba(0, 184, 255, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="250" cy="250" r="70" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />

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

        <path d="M 60 250 L 175 250 L 215 175 L 255 325 L 285 250 L 440 250" strokeWidth="11" />
        <circle cx="250" cy="250" r="5" fill={color} stroke="none" />
      </g>
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  scheme = 'neon',
  className = '',
  animated,
}) => {
  const px = typeof size === 'number' ? size : size === 'sm' ? 36 : size === 'lg' ? 72 : 48;

  const animarSimbolo = animated !== undefined ? animated : variant === 'horizontal' && scheme === 'neon';
  const colorSimboloAnimado = useColorCiclico(animarSimbolo);

  const palettes = {
    neon: { symbol: 'var(--accent)', wkf: 'var(--accent)', tagline: 'var(--accent-2)', glow: true, strokeBg: undefined },
    'white-on-black': { symbol: '#FFFFFF', wkf: '#FFFFFF', tagline: '#FFFFFF', glow: false, strokeBg: undefined },
    'black-on-white': { symbol: '#0A0A0A', wkf: '#0A0A0A', tagline: '#0A0A0A', glow: false, strokeBg: undefined },
  } as const;

  const palette = palettes[scheme];
  const symbolColor = animarSimbolo ? colorSimboloAnimado : palette.symbol;

  if (variant === 'icon') {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <WKFSymbol size={px} color={symbolColor} glow={palette.glow} strokeBg={palette.strokeBg} animatedSweep={animated !== undefined ? animated : scheme === 'neon'} />
      </div>
    );
  }

  const titleSize = typeof size === 'number' ? Math.round(size * 0.45) : size === 'sm' ? 20 : size === 'lg' ? 44 : 28;
  const taglineSize = typeof size === 'number' ? Math.round(size * 0.12) : size === 'sm' ? 9 : size === 'lg' ? 12 : 10;
  const taglineSpacing = size === 'sm' ? '0.22em' : size === 'lg' ? '0.28em' : '0.24em';
  const gap = typeof size === 'number' ? Math.round(size * 0.15) : size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap, userSelect: 'none' }}>
      <WKFSymbol size={px} color={symbolColor} glow={palette.glow} strokeBg={palette.strokeBg} animatedSweep={animated !== undefined ? animated : true} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: titleSize, letterSpacing: '0.08em', lineHeight: 1, color: palette.wkf }}>WKF</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: taglineSize, letterSpacing: taglineSpacing, marginTop: size === 'sm' ? 4 : 6, textTransform: 'uppercase', color: palette.tagline, opacity: 0.9 }}>WORLD KAYAK FISHING</span>
      </div>
    </div>
  );
};

export default Logo;