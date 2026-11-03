// src/components/APKInstallButton.tsx
// WKF — Botón de descarga del APK firmado. Solo visible en la PWA.

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';

const APK_URL = 'https://github.com/Xanthar85/WKFTRABAJO/releases/download/v0.1.0/app-release.apk';

export const APKInstallButton: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false);

  if (Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        title="Descargar app nativa (APK)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--accent-2, #00B8FF)',
          borderRadius: 8,
          color: 'var(--accent-2, #00B8FF)',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1, marginRight: '6px' }}>🎣</span>
        <span>APK</span>
      </button>

      {showGuide && (
        <div
          onClick={() => setShowGuide(false)}
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
                color: 'var(--accent-2)',
              }}
            >
              WKF App Nativa (APK)
            </h3>
            <p
              style={{
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: 'var(--text-dim)',
                margin: '0 0 16px 0',
              }}
            >
              La versión APK usa los sensores nativos del móvil (brújula, GPS en segundo plano y pantalla siempre encendida). 
              <br /><br />
              Al no venir de Google Play, tendrás que permitir la instalación desde "Orígenes desconocidos" en tu móvil Android. Es totalmente segura.
            </p>
            <a
              href={APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowGuide(false)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 0',
                backgroundColor: 'var(--accent-2)',
                border: 'none',
                borderRadius: 6,
                color: '#000',
                fontSize: '0.9rem',
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              Descargar APK
            </a>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              style={{
                width: '100%',
                padding: '8px 0',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
};