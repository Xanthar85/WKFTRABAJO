// src/screens/Navegacion/WaypointsRutasScreen.tsx
// WKF — Sub-pestaña "Waypoints y rutas".
// F1: pantalla en construcción. En F2 se añade la gestión de
// waypoints. En F3, la de rutas. En F4, la importación de capas.

import React from 'react';
import { useTranslation } from 'react-i18next';

export const WaypointsRutasScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--text-dim)',
      }}
    >
      <div style={{ fontSize: '2.4rem', marginBottom: 12, opacity: 0.6 }}>
        🧭
      </div>
      <div
        style={{
          fontSize: '0.95rem',
          lineHeight: 1.5,
          maxWidth: 420,
          fontStyle: 'italic',
        }}
      >
        {t('navegacion.wip')}
      </div>
    </div>
  );
};

export default WaypointsRutasScreen;