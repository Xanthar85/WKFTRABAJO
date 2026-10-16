// src/components/PWAInstallButton.tsx
// WKF — Botón de instalación de la PWA
import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Si ya está instalada como PWA standalone, no mostrar nada
  if (isInstalled) {
    return null;
  }

  // Flujo Android / Chromium / Desktop
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Instalar aplicación en tu dispositivo"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          backgroundColor: 'var(--accent-subtle, rgba(0, 229, 106, 0.12))',
          border: '1px solid var(--accent, #00E56A)',
          borderRadius: 8,
          color: 'var(--accent, #00E56A)',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>📲</span>
        <span>Instalar</span>
      </button>
    );
  }

  // Flujo iOS Safari
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Instalar en iPhone o iPad"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-dim)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>📲</span>
          <span>Instalar</span>
        </button>

        {showIOSGuide && (
          <div
            onClick={() => setShowIOSGuide(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 20,
                maxWidth: 360,
                width: '100%',
                color: 'var(--text)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--accent)',
                }}
              >
                Instalar en iPhone / iPad
              </h3>
              <p
                style={{
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: 'var(--text-dim)',
                  margin: '0 0 16px 0',
                }}
              >
                1. Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra de Safari.<br />
                <br />
                2. Desplázate hacia abajo y selecciona <strong>Añadir a pantalla de inicio</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
