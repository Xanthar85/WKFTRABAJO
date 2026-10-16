// src/components/PantallaDeslizante.tsx
// WKF — Wrapper que anima la entrada y salida de pantallas superpuestas.
// Se usa desde Home para envolver SpotScreen, MapScreen y TutorialScreen.

import React, { useEffect, useState } from 'react';

interface PantallaDeslizanteProps {
  children: React.ReactNode;
  onClose: () => void;
  /** Si es true, la pantalla está en proceso de cierre. El padre debe
   *  mantenerla montada hasta que onClose se dispare de verdad. */
  activa: boolean;
  zIndex?: number;
}

export const PantallaDeslizante: React.FC<PantallaDeslizanteProps> = ({
  children,
  onClose,
  activa,
  zIndex,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activa) {
      // Fuerza un reflow antes de activar la transición para que
      // el navegador detecte el cambio de estado.
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
    }
  }, [activa]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'var(--bg)',
    zIndex: zIndex ?? 200,
    transform: visible ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div
      style={style}
      onTransitionEnd={() => {
        if (!visible) onClose();
      }}
    >
      {children}
    </div>
  );
};

export default PantallaDeslizante;
