// src/screens/Navegacion/ModoManualModal.tsx
// WKF — Modal de modo manual (F6.5).
// Se abre cuando el usuario elige modo manual, cuando el GPS pierde
// señal, o cuando el permiso se deniega.
// Permite teclear:
//   - Rumbo real en grados (0-360).
//   - Velocidad en nudos.
//   - Proa del kayak en punto cardinal (solo si no hay brújula).
// Devuelve los valores al padre con onAplicar.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface DatosModoManual {
  rumboGrados: number;
  velocidadKt: number;
  proaCardinal: string;
}

export interface ModoManualModalProps {
  rumboInicial?: number;
  velocidadInicialKt?: number;
  proaInicial?: string;
  /** Si false, se oculta el campo de proa (cuando hay brújula del móvil). */
  pedirProa?: boolean;
  onAplicar: (datos: DatosModoManual) => void;
  onCancelar: () => void;
}

const CARDINALES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

export const ModoManualModal: React.FC<ModoManualModalProps> = ({
  rumboInicial = 0,
  velocidadInicialKt = 0,
  proaInicial = 'N',
  pedirProa = true,
  onAplicar,
  onCancelar,
}) => {
  const { t } = useTranslation();
  const [rumboTexto, setRumboTexto] = useState<string>(String(rumboInicial));
  const [velocidadTexto, setVelocidadTexto] = useState<string>(
    String(velocidadInicialKt)
  );
  const [proa, setProa] = useState<string>(proaInicial);

  const aplicar = () => {
    const r = parseFloat(rumboTexto);
    const v = parseFloat(velocidadTexto);
    onAplicar({
      rumboGrados: Number.isFinite(r) ? Math.max(0, Math.min(360, r)) : 0,
      velocidadKt: Number.isFinite(v) ? Math.max(0, Math.min(30, v)) : 0,
      proaCardinal: proa,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: '1rem',
    fontFamily: 'var(--font-mono, Fira Code, monospace)',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: 6,
    marginTop: 14,
  };

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 4000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--accent-2)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        <h3
          style={{
            margin: '0 0 4px 0',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--accent-2)',
          }}
        >
          {t('navegacion.manual.titulo', { defaultValue: 'Modo manual' })}
        </h3>
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            lineHeight: 1.45,
          }}
        >
          {t('navegacion.manual.intro', {
            defaultValue:
              'Introduce tu rumbo y tu velocidad a mano. La distancia al waypoint se congela.',
          })}
        </p>

        <label style={labelStyle}>
          {t('navegacion.manual.rumbo', {
            defaultValue: 'Rumbo real (grados, 0-360)',
          })}
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={rumboTexto}
          onChange={(e) => setRumboTexto(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          style={inputStyle}
        />

        <label style={labelStyle}>
          {t('navegacion.manual.velocidad', {
            defaultValue: 'Velocidad (nudos)',
          })}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={velocidadTexto}
          onChange={(e) =>
            setVelocidadTexto(
              e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.')
            )
          }
          placeholder="0.0"
          style={inputStyle}
        />

        {pedirProa && (
          <>
            <label style={labelStyle}>
              {t('navegacion.manual.proa', {
                defaultValue: 'Proa del kayak (punto cardinal)',
              })}
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}
            >
              {CARDINALES.map((c) => {
                const activo = proa === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setProa(c)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 6,
                      border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                      backgroundColor: activo
                        ? 'rgba(0, 229, 106, 0.15)'
                        : 'var(--bg)',
                      color: activo ? 'var(--accent)' : 'var(--text)',
                      fontSize: '0.9rem',
                      fontWeight: activo ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono, Fira Code, monospace)',
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={onCancelar}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel', { defaultValue: 'Cancelar' })}
          </button>
          <button
            type="button"
            onClick={aplicar}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: '#000',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('navegacion.manual.aplicar', { defaultValue: 'Aplicar' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModoManualModal;
// src/screens/Navegacion/ModoManualModal.tsx