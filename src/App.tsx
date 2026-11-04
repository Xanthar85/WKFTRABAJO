// src/App.tsx
// WKF — Componente raíz.

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { useAppStore } from './state/store.ts';
import { useNavegacionStore } from './state/navegacion-store.ts';
import { FirstRun } from './screens/FirstRun.tsx';
import { Home } from './screens/Home.tsx';
import { Logo } from './components/Logo.tsx';

export const App: React.FC = () => {
  const { i18n } = useTranslation();
  const firstRunDone = useAppStore((state) => state.firstRunDone);
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const cargadoNavegacion = useNavegacionStore((state) => state.cargado);
  const cargarNavegacion = useNavegacionStore((state) => state.cargar);
  const [minimoSplashPasado, setMinimoSplashPasado] = React.useState(false);
  const [bundleListo, setBundleListo] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  useEffect(() => {
    if (!cargadoNavegacion) {
      void cargarNavegacion();
    }
    const timer = window.setTimeout(() => {
      setMinimoSplashPasado(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [cargadoNavegacion, cargarNavegacion]);

  // OTA (Capgo): escucha la descarga de un bundle nuevo y avisa al usuario.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelado = false;
    let handle: { remove: () => Promise<void> } | null = null;

    void (async () => {
      try {
        handle = await CapacitorUpdater.addListener('downloadComplete', () => {
          if (cancelado) return;
          setBundleListo(true);
        });
      } catch (err) {
        console.error('No se pudo registrar downloadComplete', err);
      }
    })();

    return () => {
      cancelado = true;
      if (handle) {
        void handle.remove();
      }
    };
  }, []);

  const aplicarBundle = async () => {
    try {
      await CapacitorUpdater.reload();
    } catch (err) {
      console.error('Error recargando bundle OTA', err);
    }
  };

  const mostrandoCarga = !cargadoNavegacion || !minimoSplashPasado;

  if (mostrandoCarga) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'var(--bg, #0A0A0A)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 20px calc(24px + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            maxWidth: '100%',
          }}
        >
          <Logo size={120} animated={true} />
          <div
            style={{
              width: 200,
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: 'var(--accent)',
                borderRadius: 4,
                animation: 'wkf-splash-bar 1.8s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>↓</span>
            <span>Desliza hacia abajo para refrescar</span>
          </div>
        </div>
        <style>{`
          @keyframes wkf-splash-bar {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {bundleListo && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 'calc(12px + env(safe-area-inset-bottom))',
            zIndex: 10000,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--accent)',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text)' }}>
            Actualización descargada. Se aplicará al reiniciar la app.
          </span>
          <button
            type="button"
            onClick={aplicarBundle}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: '#000',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Reiniciar
          </button>
          <button
            type="button"
            onClick={() => setBundleListo(false)}
            aria-label="Cerrar aviso"
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
      {firstRunDone ? <Home /> : <FirstRun />}
    </>
  );
};

export default App;
// src/App.tsx