// src/screens/NavegacionScreen.tsx
// WKF — Pantalla raíz de la pestaña Navegación.
// F4: cuatro sub-pestañas — Waypoints, Rutas, Navegar, Importar.
// Carga el store de navegación desde IndexedDB al abrirse.

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavegacionStore } from '../state/navegacion-store.ts';
import { WaypointsRutasScreen } from './Navegacion/WaypointsRutasScreen.tsx';
import { RutasScreen } from './Navegacion/RutasScreen.tsx';
import { NavegarScreen } from './Navegacion/NavegarScreen.tsx';
import { ImportarScreen } from './Navegacion/ImportarScreen.tsx';

type SubTab = 'waypoints' | 'rutas' | 'navegar' | 'importar';

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
        {(['waypoints', 'rutas', 'navegar', 'importar'] as SubTab[]).map(
          (id) => {
            const activo = subTab === id;
            const labelKey =
              id === 'waypoints'
                ? 'navegacion.subtab.waypoints'
                : id === 'rutas'
                ? 'navegacion.subtab.rutas'
                : id === 'navegar'
                ? 'navegacion.subtab.navegar'
                : 'navegacion.subtab.importar';
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => setSubTab(id)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  border: 'none',
                  borderBottom: `2px solid ${
                    activo ? 'var(--accent)' : 'transparent'
                  }`,
                  backgroundColor: activo ? 'var(--bg)' : 'transparent',
                  color: activo ? 'var(--accent)' : 'var(--text-dim)',
                  fontSize: '0.82rem',
                  fontWeight: activo ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(labelKey)}
              </button>
            );
          }
        )}
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
        {subTab === 'rutas' && <RutasScreen />}
        {subTab === 'navegar' && <NavegarScreen />}
        {subTab === 'importar' && <ImportarScreen />}
      </div>
    </div>
  );
};

export default NavegacionScreen;