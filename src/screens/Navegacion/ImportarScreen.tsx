// src/screens/Navegacion/ImportarScreen.tsx
// WKF — Pantalla de importación de capas (GPX, KML, KMZ, JSON).
// F4-bis (Paso 5): añade selector de color por capa con paleta
// cerrada WKF, y botón "Restaurar colores WKF" que borra todos
// los overrides de colorCapa en todos los bloques.
//
// Se mantiene la estructura de la pantalla anterior: header con
// botón importar, árbol de capas por archivo (un bloque por
// archivo, con sus capas dentro), casillas con estado
// indeterminado, plegar/desplegar por archivo, borrado solo a
// nivel de archivo, contador de elementos por capa, detección de
// duplicado por nombre + formato.
//
// Este archivo NO conoce la pantalla del mapa. Su único trabajo
// es gestionar el árbol de capas y sus colores.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNavegacionStore } from '../../state/navegacion-store.ts';
import type { BloqueCapas, Capa } from '../../db/capas-repo.ts';
import { PALETA_WKF } from '../../lib/colores-wkf.ts';
import {
  importarArchivo,
  type ResultadoImportacion,
} from '../../lib/navegacion/importar.ts';

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null;

const COLOR_WKF_FALLBACK = PALETA_WKF[0]?.hex ?? '#00E56A';

function colorDominanteCapa(capa: Capa): string {
  if (capa.colorCapa) return capa.colorCapa;
  const primero = capa.elementos.find((e) => e.estilo?.color);
  if (primero?.estilo?.color) return primero.estilo.color;
  return COLOR_WKF_FALLBACK;
}

function colorCapaEsMixta(capa: Capa): boolean {
  if (capa.colorCapa) return false;
  const colores = new Set<string>();
  for (const el of capa.elementos) {
    const c = el.estilo?.color;
    if (c) colores.add(c.toLowerCase());
    if (colores.size > 1) return true;
  }
  return false;
}

interface SelectorColorCapaProps {
  colorActual: string | null;
  esMixta: boolean;
  onElegir: (hex: string) => void;
  onLimpiar: () => void;
}

const SelectorColorCapa: React.FC<SelectorColorCapaProps> = ({
  colorActual,
  esMixta,
  onElegir,
  onLimpiar,
}) => {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title={t('navegacion.importar.colorCapa', {
          defaultValue: 'Color de la capa',
        })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 4px',
          border: '1px solid var(--border)',
          borderRadius: 4,
          backgroundColor: 'var(--bg)',
          cursor: 'pointer',
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 3,
            backgroundColor: esMixta ? undefined : colorActual ?? COLOR_WKF_FALLBACK,
            backgroundImage: esMixta
              ? 'linear-gradient(45deg, #00E56A 0%, #FF00FF 100%)'
              : undefined,
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        />
        <span>▾</span>
      </button>

      {abierto && (
        <>
          <div
            onClick={() => setAbierto(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 4990,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              padding: 8,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 5000,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 24px)',
              gap: 6,
            }}
          >
            {PALETA_WKF.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.nombre}
                onClick={() => {
                  onElegir(c.hex);
                  setAbierto(false);
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border:
                    colorActual?.toLowerCase() === c.hex.toLowerCase()
                      ? '2px solid #fff'
                      : '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: c.hex,
                  boxShadow: `0 0 6px ${c.hex}55`,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => {
                onLimpiar();
                setAbierto(false);
              }}
              title={t('navegacion.importar.colorOriginal', {
                defaultValue: 'Volver al color original',
              })}
              style={{
                gridColumn: 'span 4',
                padding: '4px 8px',
                marginTop: 2,
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-dim)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              {t('navegacion.importar.colorOriginal', {
                defaultValue: 'Volver al color original',
              })}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

interface FilaCapaProps {
  bloque: BloqueCapas;
  capa: Capa;
  archivoEncendido: boolean;
  onToggleCapa: (visible: boolean) => void;
  onColorCapa: (hex: string | null) => void;
}

const FilaCapa: React.FC<FilaCapaProps> = ({
  capa,
  archivoEncendido,
  onToggleCapa,
  onColorCapa,
}) => {
  const colorDominante = colorDominanteCapa(capa);
  const mixta = colorCapaEsMixta(capa);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        padding: '4px 0',
        paddingLeft: 16,
        fontSize: '0.75rem',
        color:
          capa.visible && archivoEncendido
            ? 'var(--text)'
            : 'var(--text-dim)',
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          flex: 1,
          cursor: archivoEncendido ? 'pointer' : 'default',
        }}
      >
        <input
          type="checkbox"
          checked={capa.visible}
          disabled={!archivoEncendido}
          onChange={(e) => onToggleCapa(e.target.checked)}
          style={{
            width: 14,
            height: 14,
            accentColor: 'var(--accent)',
            cursor: archivoEncendido ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>📁</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {capa.nombre} ({capa.elementos.length})
        </span>
      </label>

      {archivoEncendido && (
        <SelectorColorCapa
          colorActual={colorDominante}
          esMixta={mixta}
          onElegir={(hex) => onColorCapa(hex)}
          onLimpiar={() => onColorCapa(null)}
        />
      )}
    </div>
  );
};

interface FilaBloqueProps {
  bloque: BloqueCapas;
  onBorrar: () => void;
  onToggleCapa: (capaId: string, visible: boolean) => void;
  onToggleBloque: (visible: boolean) => void;
  onColorCapa: (capaId: string, hex: string | null) => void;
}

const FilaBloque: React.FC<FilaBloqueProps> = ({
  bloque,
  onBorrar,
  onToggleCapa,
  onToggleBloque,
  onColorCapa,
}) => {
  const { t } = useTranslation();
  const [expandido, setExpandido] = useState(true);
  const [confirmando, setConfirmando] = useState(false);

  const todasVisibles =
    bloque.capas.length > 0 && bloque.capas.every((c) => c.visible);
  const algunaVisible = bloque.capas.some((c) => c.visible);
  const archivoEncendido = algunaVisible;

  const nombreArchivo = useMemo(() => {
    const ext = bloque.formato.toLowerCase();
    if (bloque.nombre.toLowerCase().endsWith(`.${ext}`)) {
      return bloque.nombre;
    }
    return `${bloque.nombre}.${bloque.formato}`;
  }, [bloque.nombre, bloque.formato]);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: expandido && bloque.capas.length > 0 ? 6 : 0,
        }}
      >
        <input
          type="checkbox"
          checked={todasVisibles}
          ref={(input) => {
            if (input) {
              input.indeterminate = algunaVisible && !todasVisibles;
            }
          }}
          onChange={(e) => onToggleBloque(e.target.checked)}
          style={{
            width: 16,
            height: 16,
            accentColor: 'var(--accent)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            padding: '0 2px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {expandido ? '▾' : '▸'}
        </button>
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          title={nombreArchivo}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            padding: 0,
            textAlign: 'left',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: archivoEncendido ? 'var(--text)' : 'var(--text-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          📄 {nombreArchivo}
        </button>
        {confirmando ? (
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              style={{
                padding: '2px 4px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-dim)',
                fontSize: '0.65rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmando(false);
                onBorrar();
              }}
              style={{
                padding: '2px 4px',
                borderRadius: 4,
                border: '1px solid var(--verdict-desaconsejado)',
                backgroundColor: 'rgba(255, 45, 85, 0.15)',
                color: 'var(--verdict-desaconsejado)',
                fontSize: '0.65rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗑
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            title={t('navegacion.acciones.borrar')}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--verdict-desaconsejado)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              padding: '2px 4px',
              flexShrink: 0,
            }}
          >
            🗑
          </button>
        )}
      </div>

      {expandido && bloque.capas.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            opacity: archivoEncendido ? 1 : 0.55,
          }}
        >
          {bloque.capas.map((capa) => (
            <FilaCapa
              key={capa.id}
              bloque={bloque}
              capa={capa}
              archivoEncendido={archivoEncendido}
              onToggleCapa={(v) => onToggleCapa(capa.id, v)}
              onColorCapa={(hex) => onColorCapa(capa.id, hex)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ImportarScreen: React.FC = () => {
  const { t } = useTranslation();

  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const importarBloque = useNavegacionStore((s) => s.importarBloque);
  const borrarBloque = useNavegacionStore((s) => s.borrarBloque);
  const alternarVisibilidadCapa = useNavegacionStore(
    (s) => s.alternarVisibilidadCapa
  );
  const alternarVisibilidadBloque = useNavegacionStore(
    (s) => s.alternarVisibilidadBloque
  );
  const cambiarColorCapa = useNavegacionStore((s) => s.cambiarColorCapa);
  const restaurarColoresWKF = useNavegacionStore(
    (s) => s.restaurarColoresWKF
  );

  const [aviso, setAviso] = useState<Aviso>(null);
  const avisoTimeout = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    return () => {
      if (avisoTimeout.current) window.clearTimeout(avisoTimeout.current);
    };
  }, []);

  const mostrarAviso = (tipo: 'ok' | 'error', texto: string) => {
    setAviso({ tipo, texto });
    if (avisoTimeout.current) window.clearTimeout(avisoTimeout.current);
    avisoTimeout.current = window.setTimeout(() => setAviso(null), 3500);
  };

  const hayAlgunaVisible = useMemo(
    () => bloquesCapas.some((b) => b.capas.some((c) => c.visible)),
    [bloquesCapas]
  );

  const handleAbrirSelector = () => {
    fileInputRef.current?.click();
  };

  const handleArchivos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImportando(true);
    try {
      for (const file of Array.from(files)) {
        try {
          const resultado: ResultadoImportacion = await importarArchivo(file);
          if (resultado.ok) {
            const duplicado = bloquesCapas.some(
              (b) =>
                b.nombre.toLowerCase() ===
                  resultado.bloque.nombre.toLowerCase() &&
                b.formato === resultado.bloque.formato
            );
            if (duplicado) {
              mostrarAviso(
                'error',
                t('navegacion.importar.duplicado', {
                  nombre: resultado.bloque.nombre,
                  defaultValue: 'Ya importado: {{nombre}}',
                })
              );
              continue;
            }
            await importarBloque(resultado.bloque);
            mostrarAviso(
              'ok',
              t('navegacion.importar.ok', {
                nombre: resultado.bloque.nombre,
                defaultValue: 'Importado: {{nombre}}',
              })
            );
          } else {
            mostrarAviso('error', resultado.mensaje);
          }
        } catch (err) {
          console.error('Error importando archivo', file.name, err);
          mostrarAviso(
            'error',
            t('navegacion.importar.errorGeneral', {
              defaultValue: 'Error importando el archivo',
            })
          );
        }
      }
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAlternarTodas = async () => {
    const objetivo = !hayAlgunaVisible;
    for (const bloque of bloquesCapas) {
      await alternarVisibilidadBloque(bloque.id, objetivo);
    }
  };

  const handleRestaurarColores = async () => {
    try {
      await restaurarColoresWKF();
      mostrarAviso(
        'ok',
        t('navegacion.importar.coloresRestaurados', {
          defaultValue: 'Colores WKF restaurados',
        })
      );
    } catch (err) {
      console.error('Error restaurando colores WKF', err);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg)',
      }}
    >
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {t('navegacion.importar.capasImportadas')}
        </h2>

        <button
          type="button"
          onClick={handleAbrirSelector}
          disabled={importando}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid var(--accent)',
            backgroundColor: 'rgba(0, 229, 106, 0.15)',
            color: 'var(--accent)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: importando ? 'not-allowed' : 'pointer',
            opacity: importando ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {importando
            ? t('navegacion.importar.importando', {
                defaultValue: 'Importando…',
              })
            : t('navegacion.importar.importar', {
                defaultValue: '+ Importar archivo',
              })}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx,.kml,.kmz,.json,.wkfjson,application/gpx+xml,application/json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
          multiple
          onChange={(e) => void handleArchivos(e.target.files)}
          style={{ display: 'none' }}
        />
      </header>

      {aviso && (
        <div
          style={{
            flexShrink: 0,
            padding: '7px 14px',
            backgroundColor:
              aviso.tipo === 'ok'
                ? 'rgba(0, 229, 106, 0.15)'
                : 'rgba(255, 45, 85, 0.15)',
            borderBottom: `1px solid ${
              aviso.tipo === 'ok'
                ? 'var(--accent)'
                : 'var(--verdict-desaconsejado)'
            }`,
            color:
              aviso.tipo === 'ok'
                ? 'var(--accent)'
                : 'var(--verdict-desaconsejado)',
            fontSize: '0.78rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {aviso.texto}
        </div>
      )}

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '8px 14px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
        }}
      >
        <button
          type="button"
          onClick={handleAlternarTodas}
          disabled={bloquesCapas.length === 0}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: bloquesCapas.length === 0 ? 'not-allowed' : 'pointer',
            opacity: bloquesCapas.length === 0 ? 0.5 : 1,
          }}
        >
          {hayAlgunaVisible
            ? t('navegacion.importar.desactivarTodas', {
                defaultValue: '✕ Desactivar todas',
              })
            : t('navegacion.importar.activarTodas', {
                defaultValue: '✓ Activar todas',
              })}
        </button>

        <button
          type="button"
          onClick={handleRestaurarColores}
          disabled={bloquesCapas.length === 0}
          title={t('navegacion.importar.restaurarColores', {
            defaultValue: 'Restaurar colores WKF',
          })}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--accent-2)',
            backgroundColor: 'rgba(0, 184, 255, 0.12)',
            color: 'var(--accent-2)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: bloquesCapas.length === 0 ? 'not-allowed' : 'pointer',
            opacity: bloquesCapas.length === 0 ? 0.5 : 1,
          }}
        >
          {t('navegacion.importar.restaurarColores', {
            defaultValue: 'Restaurar colores WKF',
          })}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px 14px 24px',
          backgroundColor: 'var(--bg)',
        }}
      >
        {bloquesCapas.length === 0 ? (
          <div
            style={{
              padding: '30px 16px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            {t('navegacion.empty.capas', {
              defaultValue:
                'Aún no has importado ninguna capa. Pulsa "+ Importar archivo" para empezar.',
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bloquesCapas.map((bloque) => (
              <FilaBloque
                key={bloque.id}
                bloque={bloque}
                onBorrar={() => borrarBloque(bloque.id)}
                onToggleCapa={(capaId, visible) =>
                  alternarVisibilidadCapa(bloque.id, capaId, visible)
                }
                onToggleBloque={(visible) =>
                  alternarVisibilidadBloque(bloque.id, visible)
                }
                onColorCapa={(capaId, hex) =>
                  cambiarColorCapa(bloque.id, capaId, hex)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportarScreen;
// src/screens/Navegacion/ImportarScreen.tsx