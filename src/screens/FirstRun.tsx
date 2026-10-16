// src/screens/FirstRun.tsx
// WKF — Pantalla de primer arranque (3 pasos: Idioma, Unidades, Kayak opcional).

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../state/store.ts';
import { Logo } from '../components/Logo.tsx';
import {
  OPCIONES_VIENTO,
  OPCIONES_OLA,
  OPCIONES_TEMPERATURA,
  OPCIONES_PRESION,
  OPCIONES_CORRIENTE,
  OPCIONES_DISTANCIA,
  OPCIONES_PRECIPITACION,
  SUFIJO_VIENTO,
  SUFIJO_OLA,
  SUFIJO_TEMPERATURA,
  SUFIJO_PRESION,
  SUFIJO_CORRIENTE,
  SUFIJO_DISTANCIA,
  SUFIJO_PRECIPITACION,
  type SistemaUnidades,
} from '../lib/unidades.ts';
import { CATALOGO_KAYAKS, type Kayak } from '../lib/kayaks.ts';
import { CATALOGO_PATOS, type Pato } from '../lib/patos.ts';

type EmbarcacionConTipo = (Kayak & { tipoVaso: 'kayak' }) | (Pato & { tipoVaso: 'pato' });

export const FirstRun: React.FC = () => {
  const { t, i18n } = useTranslation();
  const markFirstRunDone = useAppStore((state) => state.markFirstRunDone);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const ajustes = useAppStore((state) => state.ajustes);
  const setUnidades = useAppStore((state) => state.setUnidades);
  const setKayakIds = useAppStore((state) => state.setKayakIds);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showKayakModal, setShowKayakModal] = useState(false);
  const [kayakSearchQuery, setKayakSearchQuery] = useState('');

  const catalogoUnificado: EmbarcacionConTipo[] = useMemo(() => [
    ...CATALOGO_KAYAKS.map((k) => ({ ...k, tipoVaso: 'kayak' as const })),
    ...CATALOGO_PATOS.map((p) => ({ ...p, tipoVaso: 'pato' as const })),
  ], []);

  const filteredKayaks = useMemo(() => {
    const terms = kayakSearchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return catalogoUnificado.filter((k) => {
      if (terms.length === 0) return true;
      const text = `${k.marca} ${k.modelo} ${k.tipoVaso}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    }).sort((a, b) => {
      const cmpMarca = a.marca.localeCompare(b.marca);
      if (cmpMarca !== 0) return cmpMarca;
      return a.modelo.localeCompare(b.modelo);
    });
  }, [catalogoUnificado, kayakSearchQuery]);

  const selectedKayak = useMemo(() => {
    const id = ajustes.kayakIds[0];
    if (!id) return null;
    return catalogoUnificado.find((k) => k.id === id) ?? null;
  }, [ajustes.kayakIds, catalogoUnificado]);

  const handleSelectKayak = (k: EmbarcacionConTipo) => {
    setKayakIds([k.id]);
    setShowKayakModal(false);
  };

  const buttonOptionStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    backgroundColor: active
      ? 'var(--accent-subtle, rgba(0, 229, 106, 0.15))'
      : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text)',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  });

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <Logo variant="horizontal" size="lg" />
        </header>

        {/* Indicador de progreso */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            padding: '0 4px',
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            {t('firstrun.progress', { step, total: 3 })}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: 24,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    s <= step ? 'var(--accent)' : 'var(--border)',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* PASO 1 — Idioma */}
        {step === 1 && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                marginBottom: 8,
                color: 'var(--text)',
              }}
            >
              {t('firstrun.step1Title')}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted, var(--text-dim))',
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              {t('firstrun.step1Body')}
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
              <button
                type="button"
                onClick={() => {
                  setLanguage('es');
                  void i18n.changeLanguage('es');
                }}
                style={buttonOptionStyle(language === 'es')}
              >
                Español
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('en');
                  void i18n.changeLanguage('en');
                }}
                style={buttonOptionStyle(language === 'en')}
              >
                English
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                width: '100%',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '1rem',
                padding: '14px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: '#0A0A0A',
                boxShadow: '0 0 20px rgba(0, 229, 106, 0.45)',
              }}
            >
              {t('firstrun.next')} →
            </button>
          </div>
        )}

        {/* PASO 2 — Unidades */}
        {step === 2 && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                marginBottom: 8,
                color: 'var(--text)',
              }}
            >
              {t('firstrun.step2Title')}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted, var(--text-dim))',
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {t('firstrun.step2Body')}
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                maxHeight: '48vh',
                overflowY: 'auto',
                paddingRight: 4,
                marginBottom: 20,
              }}
            >
              {/* Viento (columna 1) */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.viento1')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_VIENTO.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ viento: u })}
                      style={buttonOptionStyle(ajustes.unidades.viento === u)}
                    >
                      {SUFIJO_VIENTO[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Viento (columna 2) */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.viento2')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_VIENTO.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ viento2: u })}
                      style={buttonOptionStyle(ajustes.unidades.viento2 === u)}
                    >
                      {SUFIJO_VIENTO[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ola */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.ola')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_OLA.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ ola: u })}
                      style={buttonOptionStyle(ajustes.unidades.ola === u)}
                    >
                      {SUFIJO_OLA[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperatura */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.temperatura')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_TEMPERATURA.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ temperatura: u })}
                      style={buttonOptionStyle(ajustes.unidades.temperatura === u)}
                    >
                      {SUFIJO_TEMPERATURA[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presión */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.presion')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_PRESION.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ presion: u })}
                      style={buttonOptionStyle(ajustes.unidades.presion === u)}
                    >
                      {SUFIJO_PRESION[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corriente */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.corriente')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_CORRIENTE.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ corriente: u })}
                      style={buttonOptionStyle(ajustes.unidades.corriente === u)}
                    >
                      {SUFIJO_CORRIENTE[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distancia */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.distancia')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_DISTANCIA.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ distancia: u })}
                      style={buttonOptionStyle(ajustes.unidades.distancia === u)}
                    >
                      {SUFIJO_DISTANCIA[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibilidad */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.visibilidad')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_DISTANCIA.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ visibilidad: u })}
                      style={buttonOptionStyle(ajustes.unidades.visibilidad === u)}
                    >
                      {SUFIJO_DISTANCIA[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Precipitación */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {t('unidades.precipitacion')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OPCIONES_PRECIPITACION.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidades({ precipitacion: u })}
                      style={buttonOptionStyle(ajustes.unidades.precipitacion === u)}
                    >
                      {SUFIJO_PRECIPITACION[u]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: 20,
              }}
            >
              ℹ️ {t('unidades.note')}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                }}
              >
                ← {t('firstrun.back')}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#0A0A0A',
                  boxShadow: '0 0 20px rgba(0, 229, 106, 0.45)',
                }}
              >
                {t('firstrun.next')} →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 — Kayak (opcional) */}
        {step === 3 && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                marginBottom: 8,
                color: 'var(--text)',
              }}
            >
              {t('firstrun.step3Title')}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted, var(--text-dim))',
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {t('firstrun.step3Body')}
            </p>

            {/* Embarcación actual */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                marginBottom: 24,
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {t('settings.slotsTitle')}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
                  {selectedKayak
                    ? `${selectedKayak.marca} ${selectedKayak.modelo} (${selectedKayak.categoriaWKF})`
                    : CATALOGO_KAYAKS[0]
                    ? `${CATALOGO_KAYAKS[0].marca} ${CATALOGO_KAYAKS[0].modelo} (${CATALOGO_KAYAKS[0].categoriaWKF})`
                    : '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKayakSearchQuery('');
                  setShowKayakModal(true);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--accent)',
                  backgroundColor: 'transparent',
                  color: 'var(--accent)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('kayak.select')}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '14px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                }}
              >
                ← {t('firstrun.back')}
              </button>
              <button
                type="button"
                onClick={markFirstRunDone}
                style={{
                  flex: 2,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  padding: '14px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#0A0A0A',
                  boxShadow: '0 0 25px rgba(0, 229, 106, 0.55)',
                }}
              >
                {t('firstrun.start')} 🚀
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE SELECCIÓN DE KAYAK */}
      {showKayakModal && (
        <div
          onClick={() => setShowKayakModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 2000,
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
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              maxWidth: 480,
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {t('kayak.select')}
              </h3>
              <button
                onClick={() => setShowKayakModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={kayakSearchQuery}
              onChange={(e) => setKayakSearchQuery(e.target.value)}
              placeholder={t('kayak.searchPlaceholder')}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
                fontSize: '0.9rem',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flex: 1,
              }}
            >
              {filteredKayaks.length === 0 && (
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    color: 'var(--text-muted)',
                    padding: '12px 4px',
                    textAlign: 'center',
                  }}
                >
                  {t('kayak.notFound')}
                </div>
              )}
              {filteredKayaks.map((k) => (
                <button
                  key={k.id}
                  onClick={() => handleSelectKayak(k)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor:
                      ajustes.kayakIds[0] === k.id
                        ? 'var(--accent-subtle, rgba(0, 229, 106, 0.15))'
                        : 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {k.marca} {k.modelo}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {k.tipoVaso}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'Fira Code, monospace',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--accent)',
                    }}
                  >
                    {k.categoriaWKF}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default FirstRun;