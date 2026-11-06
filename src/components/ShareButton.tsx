// src/components/ShareButton.tsx
// WKF — Botón de compartir.
// Usa Capacitor Share en nativo y Web Share API en PWA.

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

const URL_COMPARTIR = 'https://wkf.vercel.app';

interface ShareButtonProps {
  title?: string;
  text?: string;
  size?: 'sm' | 'md';
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  title = 'WKF — World Kayak Fishing',
  text = 'El mar no avisa. WKF sí. Tu cuaderno de pesca en kayak y desde costa. Gratis, bilingüe, sin cuentas, sin nube. Todo se queda en tu dispositivo.',
  size = 'md',
}) => {
  const [copiado, setCopiado] = useState(false);

  const handleClick = async () => {
    const shareData: ShareData = {
      title,
      text,
      url: URL_COMPARTIR,
    };

    // 1. Nativo (APK)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title,
          text,
          url: URL_COMPARTIR,
          dialogTitle: 'Compartir WKF',
        });
        return;
      } catch (err) {
        console.error('Error al compartir nativo', err);
      }
    }

    // 2. Web (PWA)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // 3. Fallback (copiar)
    try {
      await navigator.clipboard.writeText(URL_COMPARTIR);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // ignore
    }
  };

  const padding = size === 'sm' ? '6px 8px' : '8px 10px';
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={copiado ? 'Enlace copiado' : 'Compartir WKF'}
      aria-label={copiado ? 'Enlace copiado' : 'Compartir WKF'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding,
        backgroundColor: 'var(--bg)',
        border: `1px solid ${copiado ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        color: copiado ? 'var(--accent)' : 'var(--text-dim)',
        cursor: 'pointer',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '0.85rem',
        fontWeight: 500,
        transition: 'all 0.15s ease',
        position: 'relative',
        lineHeight: 1,
      }}
    >
      {copiado ? (
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>✓</span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </button>
  );
};

export default ShareButton; 
