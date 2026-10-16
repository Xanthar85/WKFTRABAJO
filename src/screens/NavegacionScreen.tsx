// src/screens/NavegacionScreen.tsx
// WKF — Pantalla raíz de la pestaña Navegación.
// F1: monta la estructura con dos sub-pestañas y carga el store de
// navegación desde IndexedDB al abrirse. Las pantallas internas
// están vacías y se rellenan en F2, F3, F4, F5 y F6.

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavegacionStore } from '../state/navegacion-store.ts';
import { WaypointsRutasScreen } from './Navegacion/WaypointsRutasScreen.tsx';
import { NavegarScreen } from './Navegacion/NavegarScreen.tsx';

type SubTab = 'waypoints' | 'navegar';

export const NavegacionScreen: React.FC = () => {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('waypoints');

  const cargar = useNavegacionStore((s) => s.cargar);
  const cargado = useNavegacionStore((s) => s.cargado);
  const error = useNavegacionStore((s) => s.error);

  useEffect(() => {
    if (!cargado) {
      void cargar();
    }
  }, [cargado, cargar]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        role="tablist"
        style={{
          display: 'flex',
          flexShrink: 0,
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {(['waypoints', 'navegar'] as SubTab[]).map((id) => {
          const activo = subTab === id;
          const labelKey =
            id === 'waypoints' ? 'navegacion.subtab.waypoints' : 'navegacion.subtab.navegar';
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => setSubTab(id)}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: 'none',
                borderBottom: `2px solid ${activo ? 'var(--accent)' : 'transparent'}`,
                backgroundColor: activo ? 'var(--bg)' : 'transparent',
                color: activo ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: '0.9rem',
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(255, 45, 85, 0.12)',
            borderBottom: '1px solid var(--verdict-desaconsejado)',
            color: 'var(--verdict-desaconsejado)',
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {subTab === 'waypoints' && <WaypointsRutasScreen />}
        {subTab === 'navegar' && <NavegarScreen />}
      </div>
    </div>
  );
};

export default NavegacionScreen;