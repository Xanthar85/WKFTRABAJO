// src/components/ShareButton.tsx
// WKF — Botón de compartir.
// Usa la Web Share API si está disponible (móviles, Chrome Android,
// Safari iOS). Si no, copia la URL al portapapeles y muestra un
// feedback "Enlace copiado" durante 1,5 s.
// No depende de i18n externo para el texto del botón (usa t() si
// está disponible, con fallback en español).

import React, { useState } from 'react';

const URL_COMPARTIR = 'https://wkf.vercel.app';

interface ShareButtonProps {
  /** Texto que se pasa al share nativo. Si no se pasa, se usa
   *  el título por defecto de la app. */
  title?: string;
  text?: string;
  /** Tamaño del botón. Por defecto 'md'. */
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

    // Web Share API disponible (móviles sobre todo).
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      navigator.canShare?.(shareData) !== false
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // El usuario canceló o falló. No hacemos nada.
        // Si fue un error real, caemos al fallback.
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: copiar al portapapeles.
    try {
      await navigator.clipboard.writeText(URL_COMPARTIR);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Si tampoco hay clipboard, no podemos hacer nada.
      // Silencio discreto.
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
          {/* Icono de compartir universal: tres nodos conectados. */}
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
