// src/screens/Navegacion/ImportarScreen.tsx
// WKF — Sub-pestaña "Importar" (F4).
//
// Pantalla con:
//   - Botón grande "Elegir archivo". Input file nativo, acepta
//     .gpx, .kml, .kmz, .json.
//   - Aviso con el resultado (ok / error).
//   - Lista de bloques de capas importados con toggles.
//
// El store se encarga de persistir. Aquí solo orquestamos la
// lectura y mostramos el resultado.

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useNavegacionStore,
  type ResumenImportacion,
} from '../../state/navegacion-store.ts';
import { parsearGPX } from '../../lib/navegacion/parser-gpx.ts';
import { parsearKML } from '../../lib/navegacion/parser-kml.ts';
import { parsearKMZ } from '../../lib/navegacion/parser-kmz.ts';
import { parsearJSONWKF } from '../../lib/navegacion/parser-json-wkf.ts';
import type { BloqueCapas, Capa, ElementoCapa } from '../../db/capas-repo.ts';

type TipoAviso =
  | { tipo: 'ok'; resumen: ResumenImportacion; nombreArchivo: string }
  | { tipo: 'error'; mensaje: string; nombreArchivo: string }
  | null;

function extensionDeArchivo(nombre: string): string {
  const idx = nombre.lastIndexOf('.');
  if (idx < 0) return '';
  return nombre.slice(idx + 1).toLowerCase();
}

// Extrae waypoints sueltos de los elementos de tipo 'punto' de las
function extraerWaypointsDeElementos(
  elementos: ElementoCapa[]
): Array<{ nombre: string; lat: number; lon: number; nota?: string }> {
  const out: Array<{
    nombre: string;
    lat: number;
    lon: number;
    nota?: string;
  }> = [];
  let contador = 1;
  for (const el of elementos) {
    if (el.tipo !== 'punto') continue;
    const rawCoords =
      Array.isArray(el.coords) && Array.isArray(el.coords[0])
        ? el.coords[0]
        : el.coords;
    if (!Array.isArray(rawCoords) || rawCoords.length < 2) continue;
    const lat = rawCoords[0];
    const lon = rawCoords[1];
    if (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      continue;
    }
    out.push({
      nombre:
        el.nombre && el.nombre.trim() !== '' ? el.nombre : `Punto ${contador}`,
      lat,
      lon,
      nota: el.descripcion,
    });
    contador++;
  }
  return out;
}

export const ImportarScreen: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<TipoAviso>(null);
  const [procesando, setProcesando] = useState(false);

  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const importarContenido = useNavegacionStore((s) => s.importarContenido);
  const borrarBloque = useNavegacionStore((s) => s.borrarBloque);
  const alternarVisibilidadCapa = useNavegacionStore(
    (s) => s.alternarVisibilidadCapa
  );
  const cargado = useNavegacionStore((s) => s.cargado);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = extensionDeArchivo(file.name);
    setProcesando(true);
    setAviso(null);

    try {
      let resumen: ResumenImportacion;

      if (extension === 'gpx') {
        const texto = await file.text();
        const resultado = parsearGPX(texto);

        // Aplanamos: waypoints sueltos + todos los puntos de todas
        // las rutas van como waypoints. Las rutas se referencian por
        // nombre, y el store resuelve los nombres a ids reales.
        const waypointsDeRutas = resultado.rutas.flatMap((r) => r.puntos);
        const todosWaypoints = [...resultado.waypoints, ...waypointsDeRutas];

        resumen = await importarContenido({
          waypoints: todosWaypoints,
          rutas: resultado.rutas.map((r) => ({
            nombre: r.nombre,
            nombresWaypoints: r.puntos.map((p) => p.nombre),
            origen: 'manual' as const,
          })),
          bloquesCapas: [],
        });
      } else if (extension === 'kml' || extension === 'kmz') {
        const resultado =
          extension === 'kml'
            ? parsearKML(await file.text())
            : await parsearKMZ(file);

        // Todos los puntos de todas las capas van también a waypoints.
        const todosElementos = resultado.capas.flatMap((c) => c.elementos);
        const waypointsExtraidos = extraerWaypointsDeElementos(
          todosElementos
        );

        // Cada capa del KML/KMZ se convierte en un bloque de capas
        // con UNA sola capa dentro. El bloque conserva el nombre
        // original del Folder.
        const bloquesCapas: Omit<BloqueCapas, 'id'>[] = resultado.capas.map((c) => {
          const capas: Omit<Capa, 'id'>[] = [
            {
              nombre: c.nombre,
              visible: true,
              elementos: c.elementos,
            },
          ];
          return {
            nombre: c.nombre,
            formato: extension as 'kml' | 'kmz',
            importadoEn: Date.now(),
            capas: capas as unknown as Capa[],
          };
        });

        resumen = await importarContenido({
          waypoints: waypointsExtraidos,
          rutas: [],
          bloquesCapas,
        });
      } else if (extension === 'json') {
        const texto = await file.text();
        const resultado = parsearJSONWKF(texto);
        if (resultado.formato === 'desconocido') {
          throw new Error('Formato JSON no reconocido');
        }
        resumen = await importarContenido({
          waypoints: resultado.waypoints,
          rutas: resultado.rutas,
          bloquesCapas: resultado.bloquesCapas as unknown as Omit<BloqueCapas, 'id'>[],
        });
      } else {
        throw new Error(
          `Extensión no soportada: "${extension || 'sin extensión'}"`
        );
      }

      setAviso({ tipo: 'ok', resumen, nombreArchivo: file.name });
    } catch (err) {
      console.error('Error importando', err);
      setAviso({
        tipo: 'error',
        mensaje: err instanceof Error ? err.message : 'Error desconocido',
        nombreArchivo: file.name,
      });
    } finally {
      setProcesando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCambiarVisibilidadTodas = async (visible: boolean) => {
    for (const bloque of bloquesCapas) {
      for (const capa of bloque.capas) {
        if (capa.visible !== visible) {
          await alternarVisibilidadCapa(bloque.id, capa.id, visible);
        }
      }
    }
  };

  const handleToggleBloque = async (bloqueId: string, visible: boolean) => {
    const bloque = bloquesCapas.find((b) => b.id === bloqueId);
    if (!bloque) return;
    for (const capa of bloque.capas) {
      if (capa.visible !== visible) {
        await alternarVisibilidadCapa(bloque.id, capa.id, visible);
      }
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
          }}
        >
          {t('navegacion.subtab.importar')}
        </h2>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 14px 24px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '18px 16px',
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={procesando}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 10,
              border: `2px dashed ${
                procesando ? 'var(--border)' : 'var(--accent)'
              }`,
              backgroundColor: procesando
                ? 'var(--bg)'
                : 'rgba(0, 229, 106, 0.08)',
              color: procesando ? 'var(--text-dim)' : 'var(--accent)',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: procesando ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>
              {procesando ? '⏳' : '📂'}
            </span>
            <span>
              {procesando
                ? t('navegacion.importar.procesando')
                : t('navegacion.importar.elegirArchivo')}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gpx,.kml,.kmz,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div
            style={{
              marginTop: 12,
              fontSize: '0.78rem',
              color: 'var(--text-dim)',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {t('navegacion.importar.formatosSoportados')}
          </div>
        </div>

        {aviso && aviso.tipo === 'ok' && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid var(--verdict-favorable)',
              backgroundColor: 'rgba(0, 229, 106, 0.10)',
              color: 'var(--verdict-favorable)',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              ✓ {aviso.nombreArchivo}
            </div>
            <div>
              {t('navegacion.importar.resumenWaypoints', {
                count: aviso.resumen.waypointsImportados,
              })}
            </div>
            {aviso.resumen.rutasImportadas > 0 && (
              <div>
                {t('navegacion.importar.resumenRutas', {
                  count: aviso.resumen.rutasImportadas,
                })}
              </div>
            )}
            {aviso.resumen.bloquesImportados > 0 && (
              <div>
                {t('navegacion.importar.resumenBloques', {
                  count: aviso.resumen.bloquesImportados,
                })}
              </div>
            )}
            {aviso.resumen.descartados > 0 && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: '0.78rem',
                  color: 'var(--verdict-exigente)',
                }}
              >
                ⚠{' '}
                {t('navegacion.importar.descartados', {
                  count: aviso.resumen.descartados,
                })}
              </div>
            )}
          </div>
        )}

        {aviso && aviso.tipo === 'error' && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid var(--verdict-desaconsejado)',
              backgroundColor: 'rgba(255, 45, 85, 0.10)',
              color: 'var(--verdict-desaconsejado)',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              ✕ {aviso.nombreArchivo}
            </div>
            <div>
              {t('navegacion.importar.errorPrefijo')} {aviso.mensaje}
            </div>
          </div>
        )}

        {cargado && bloquesCapas.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '16px 0 8px 0',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-dim)',
                }}
              >
                {t('navegacion.importar.capasImportadas')}
              </h3>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCambiarVisibilidadTodas(true)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Activar todas
                </button>
                <button
                  type="button"
                  onClick={() => handleCambiarVisibilidadTodas(false)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-dim)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Desactivar todas
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {bloquesCapas.map((bloque) => (
                <BloqueCapasFila
                  key={bloque.id}
                  bloque={bloque}
                  onBorrar={() => borrarBloque(bloque.id)}
                  onToggleCapa={(capaId, visible) =>
                    alternarVisibilidadCapa(bloque.id, capaId, visible)
                  }
                  onToggleBloque={(visible) =>
                    handleToggleBloque(bloque.id, visible)
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface BloqueCapasFilaProps {
  bloque: BloqueCapas;
  onBorrar: () => void;
  onToggleCapa: (capaId: string, visible: boolean) => void;
  onToggleBloque: (visible: boolean) => void;
}

const BloqueCapasFila: React.FC<BloqueCapasFilaProps> = ({
  bloque,
  onBorrar,
  onToggleCapa,
  onToggleBloque,
}) => {
  const { t } = useTranslation();
  const [confirmando, setConfirmando] = useState(false);

  const totalElementos = bloque.capas.reduce(
    (sum, c) => sum + c.elementos.length,
    0
  );

  const todasVisibles =
    bloque.capas.length > 0 && bloque.capas.every((c) => c.visible);
  const algunaVisible = bloque.capas.some((c) => c.visible);
  const archivoEncendido = algunaVisible;

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}>
              📄
            </span>
            <span
              style={{
                fontSize: '1.02rem',
                fontWeight: 700,
                color: archivoEncendido ? 'var(--text)' : 'var(--text-dim)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={bloque.nombre}
            >
              {bloque.nombre}
            </span>
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              marginTop: 4,
              paddingLeft: 28,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {bloque.formato} ·{' '}
            {t('navegacion.importar.bloqueResumen', {
              capas: bloque.capas.length,
              elementos: totalElementos,
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Interruptor general del archivo */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '4px 6px',
              borderRadius: 6,
              backgroundColor: archivoEncendido
                ? 'rgba(0, 229, 106, 0.08)'
                : 'transparent',
            }}
            title={
              archivoEncendido
                ? 'Desactivar archivo completo'
                : 'Activar archivo completo'
            }
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
                width: 18,
                height: 18,
                accentColor: 'var(--accent)',
                cursor: 'pointer',
              }}
            />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: archivoEncendido ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {archivoEncendido ? 'Visible' : 'Oculto'}
            </span>
          </label>

          {confirmando ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {t('navegacion.borrar.cancelar')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmando(false);
                  onBorrar();
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--verdict-desaconsejado)',
                  backgroundColor: 'rgba(255, 45, 85, 0.15)',
                  color: 'var(--verdict-desaconsejado)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('navegacion.borrar.borrar')}
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
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                padding: '4px 8px',
                lineHeight: 1,
              }}
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {bloque.capas.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '6px 12px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            opacity: archivoEncendido ? 1 : 0.55,
          }}
        >
          {bloque.capas.map((capa) => (
            <label
              key={capa.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                marginLeft: 16,
                borderRadius: 6,
                cursor: archivoEncendido ? 'pointer' : 'default',
                fontSize: '0.82rem',
                color:
                  capa.visible && archivoEncendido
                    ? 'var(--text)'
                    : 'var(--text-dim)',
                backgroundColor:
                  capa.visible && archivoEncendido
                    ? 'rgba(0, 229, 106, 0.06)'
                    : 'transparent',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  style={{ fontSize: '0.95rem', lineHeight: 1, flexShrink: 0 }}
                >
                  📁
                </span>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {capa.nombre}
                </span>{' '}
                <span
                  style={{
                    color: 'var(--text-dim)',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  ({capa.elementos.length})
                </span>
              </span>
              {archivoEncendido && (
                <input
                  type="checkbox"
                  checked={capa.visible}
                  onChange={(e) => onToggleCapa(capa.id, e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: 'var(--accent)',
                    cursor: 'pointer',
                    marginLeft: 8,
                    flexShrink: 0,
                  }}
                />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImportarScreen;