// src/screens/Navegacion/NavegarScreen.tsx
// WKF — Sub-pestaña "Navegar".
// F1: pantalla en construcción. En F6 se añade el mapa, la flecha de
// rumbo, la grabación de track cada 5 s y el fallback manual sin GPS.

import React from 'react';
import { useTranslation } from 'react-i18next';

export const NavegarScreen: React.FC = () => {
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
        ➤
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

export default NavegarScreen;