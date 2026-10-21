// src/screens/Navegacion/ImportarScreen.tsx
// WKF — Pantalla de Archivos e Importación.
// Fase 23: Árbol expandible, edición por niveles, exportación.

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavegacionStore } from '../../state/navegacion-store.ts';
import { useAppStore } from '../../state/store.ts';
import { importarArchivo } from '../../lib/navegacion/importar.ts';
import { exportarBloque } from '../../lib/navegacion/exportador-capas.ts';
import { PALETA_WKF } from '../../lib/colores-wkf.ts';
import type { BloqueCapas, Capa, ElementoCapa } from '../../db/capas-repo.ts';
import type { DestinoNavegacion } from './NavegarScreen.tsx';

export interface ImportarScreenProps {
  onNavegar?: (destino: DestinoNavegacion) => void;
}

type NivelEdicion = 
  | { tipo: 'bloque'; bloqueId: string; nombre: string }
  | { tipo: 'capa'; bloqueId: string; capaId: string; nombre: string }
  | { tipo: 'elemento'; bloqueId: string; capaId: string; elementoId: string; nombre: string };

export const ImportarScreen: React.FC<ImportarScreenProps> = ({ onNavegar }) => {
  const { t } = useTranslation();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const importarBloque = useNavegacionStore((s) => s.importarBloque);
  const borrarBloque = useNavegacionStore((s) => s.borrarBloque);
  const alternarVisibilidadCapa = useNavegacionStore((s) => s.alternarVisibilidadCapa);
  const alternarVisibilidadBloque = useNavegacionStore((s) => s.alternarVisibilidadBloque);
  const cambiarColorCapa = useNavegacionStore((s) => s.cambiarColorCapa);

  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);

  const [bloquesExpandidos, setBloquesExpandidos] = useState<Set<string>>(new Set());
  const [capasExpandidas, setCapasExpandidas] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<NivelEdicion | null>(null);
  const [modoExportacion, setModoExportacion] = useState(false);
  const [seleccionExportar, setSeleccionExportar] = useState<Set<string>>(new Set()); 

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesando(true);
    setError(null);
    setResumen(null);

    try {
      const res = await importarArchivo(file);
      if (!res.ok) {
        setError(res.mensaje);
      } else {
        await importarBloque(res.bloque);
        const capasCount = res.bloque.capas.length;
        const elementosCount = res.bloque.capas.reduce((acc, c) => acc + c.elementos.length, 0);
        setResumen(`Importado: ${capasCount} capa(s) · ${elementosCount} elemento(s)`);
      }
    } catch (err) {
      console.error(err);
      setError('Error inesperado al importar.');
    } finally {
      setProcesando(false);
      if (inputFileRef.current) inputFileRef.current.value = '';
    }
  };

  const toggleBloque = (id: string) => {
    setBloquesExpandidos((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleCapa = (id: string) => {
    setCapasExpandidas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const handleExportar = async (tipo: 'json' | 'kml' | 'kmz') => {
    if (seleccionExportar.size === 0) return;
    for (const id of seleccionExportar) {
      const bloque = bloquesCapas.find((b) => b.id === id);
      if (bloque) {
        await exportarBloque(bloque, tipo);
      }
    }
    setModoExportacion(false);
    setSeleccionExportar(new Set());
  };

  const getColorElemento = (el: ElementoCapa, capa: Capa, bloque: BloqueCapas) => {
    return capa.colorCapa || el.estilo?.color || '#00E56A';
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
          {t('navegacion.subtab.importar')}
        </h2>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setModoExportacion((v) => !v)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${modoExportacion ? 'var(--verdict-exigente)' : 'var(--border)'}`,
              backgroundColor: modoExportacion ? 'rgba(255, 138, 0, 0.15)' : 'var(--bg)',
              color: modoExportacion ? 'var(--verdict-exigente)' : 'var(--text)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {modoExportacion ? t('common.cancel', { defaultValue: 'Cancelar' }) : 'Exportar'}
          </button>
          
          <button
            type="button"
            onClick={() => inputFileRef.current?.click()}
            disabled={procesando}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              backgroundColor: 'rgba(0, 229, 106, 0.15)',
              color: 'var(--accent)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: procesando ? 'not-allowed' : 'pointer',
              opacity: procesando ? 0.6 : 1,
            }}
          >
            {procesando ? '...' : 'Importar'}
          </button>
          <input
            type="file"
            ref={inputFileRef}
            onChange={handleFile}
            accept=".gpx,.kml,.kmz,.json"
            style={{ display: 'none' }}
          />
        </div>
      </header>

      {modoExportacion && (
        <div style={{ padding: '12px 14px', backgroundColor: 'rgba(255, 138, 0, 0.1)', borderBottom: '1px solid var(--verdict-exigente)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--verdict-exigente)', fontWeight: 600 }}>
            Selecciona los archivos a exportar:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (seleccionExportar.size === bloquesCapas.length) setSeleccionExportar(new Set());
                else setSeleccionExportar(new Set(bloquesCapas.map(b => b.id)));
              }}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              {seleccionExportar.size === bloquesCapas.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => handleExportar('json')} disabled={seleccionExportar.size === 0} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: seleccionExportar.size > 0 ? 'var(--verdict-exigente)' : 'var(--border)', color: seleccionExportar.size > 0 ? '#000' : 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, cursor: seleccionExportar.size > 0 ? 'pointer' : 'not-allowed' }}>JSON</button>
            <button onClick={() => handleExportar('kml')} disabled={seleccionExportar.size === 0} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: seleccionExportar.size > 0 ? 'var(--verdict-exigente)' : 'var(--border)', color: seleccionExportar.size > 0 ? '#000' : 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, cursor: seleccionExportar.size > 0 ? 'pointer' : 'not-allowed' }}>KML</button>
            <button onClick={() => handleExportar('kmz')} disabled={seleccionExportar.size === 0} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: seleccionExportar.size > 0 ? 'var(--verdict-exigente)' : 'var(--border)', color: seleccionExportar.size > 0 ? '#000' : 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, cursor: seleccionExportar.size > 0 ? 'pointer' : 'not-allowed' }}>KMZ</button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '8px 14px', backgroundColor: 'rgba(255, 45, 85, 0.15)', color: 'var(--verdict-desaconsejado)', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}
      {resumen && (
        <div style={{ padding: '8px 14px', backgroundColor: 'rgba(0, 229, 106, 0.15)', color: 'var(--accent)', fontSize: '0.8rem' }}>
          {resumen}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 20px' }}>
        {bloquesCapas.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', padding: '40px 0', fontStyle: 'italic' }}>
            {t('navegacion.empty.capas', { defaultValue: 'Todavía no has importado ninguna capa.' })}
          </div>
        )}

        {bloquesCapas.map((bloque) => {
          const expandido = bloquesExpandidos.has(bloque.id);
          const seleccionado = seleccionExportar.has(bloque.id);
          return (
            <div key={bloque.id} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              
              {/* FILA BLOQUE (Archivo) */}
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '10px 12px', gap: 8 }}>
                {modoExportacion ? (
                  <input
                    type="checkbox"
                    checked={seleccionado}
                    onChange={(e) => {
                      const s = new Set(seleccionExportar);
                      if (e.target.checked) s.add(bloque.id); else s.delete(bloque.id);
                      setSeleccionExportar(s);
                    }}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                ) : (
                  <button type="button" onClick={() => toggleBloque(bloque.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '1rem', cursor: 'pointer', padding: 0, width: 24 }}>
                    {expandido ? '▼' : '▶'}
                  </button>
                )}

                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📦 {bloque.nombre}
                </span>

                <button type="button" onClick={() => setEditando({ tipo: 'bloque', bloqueId: bloque.id, nombre: bloque.nombre })} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem', padding: 4 }}>✎</button>

                <button
                  type="button"
                  onClick={() => alternarVisibilidadBloque(bloque.id, bloque.capas.some(c => c.visible) ? false : true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem', padding: 4 }}
                >
                  {bloque.capas.some(c => c.visible) ? '👁' : '🕶'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Borrar el archivo "${bloque.nombre}" y todas sus capas?`)) {
                      void borrarBloque(bloque.id);
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--verdict-desaconsejado)', cursor: 'pointer', fontSize: '0.9rem', padding: 4 }}
                >
                  🗑
                </button>
              </div>

              {/* CAPAS */}
              {expandido && (
                <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                  {bloque.capas.map((capa) => {
                    const capaExp = capasExpandidas.has(capa.id);
                    return (
                      <div key={capa.id}>
                        {/* FILA CAPA */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px 8px 36px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                          <button type="button" onClick={() => toggleCapa(capa.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', padding: 0, width: 20 }}>
                            {capaExp ? '▼' : '▶'}
                          </button>
                          
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📁 {capa.nombre}
                          </span>

                          <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: capa.colorCapa || 'transparent', border: capa.colorCapa ? 'none' : '1px dashed var(--text-dim)' }} />

                          <button type="button" onClick={() => setEditando({ tipo: 'capa', bloqueId: bloque.id, capaId: capa.id, nombre: capa.nombre })} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem', padding: 4 }}>✎</button>

                          <button
                            type="button"
                            onClick={() => alternarVisibilidadCapa(bloque.id, capa.id, !capa.visible)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem', padding: 4 }}
                          >
                            {capa.visible ? '👁' : '🕶'}
                          </button>
                        </div>

                        {/* ELEMENTOS */}
                        {capaExp && (
                          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                            {capa.elementos.map((el) => {
                              const color = getColorElemento(el, capa, bloque);
                              const nombreEl = el.nombre || el.tipo.charAt(0).toUpperCase() + el.tipo.slice(1);
                              
                              return (
                                <div key={el.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 6px 60px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 16 }}>
                                    {el.tipo === 'punto' ? '•' : el.tipo === 'linea' ? '〰' : '⬡'}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {nombreEl}
                                  </span>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                                  
                                  <button type="button" onClick={() => setEditando({ tipo: 'elemento', bloqueId: bloque.id, capaId: capa.id, elementoId: el.id, nombre: el.nombre || '' })} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.85rem', padding: 4 }}>✎</button>

                                  {onNavegar && el.tipo !== 'punto' && (
                                    <button
                                      type="button"
                                      onClick={() => onNavegar({ tipo: el.tipo as 'poligono' | 'linea', bloqueId: bloque.id, capaId: capa.id, elementoId: el.id })}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', padding: 4 }}
                                      title="Navegar"
                                    >
                                      ➤
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE EDICIÓN */}
      {editando && (
        <div
          onClick={() => setEditando(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, maxWidth: 420, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Editar {editando.tipo}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 4 }}>
                Asignar color ({editando.nombre || 'Sin nombre'})
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                {PALETA_WKF.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={async () => {
                      if (editando.tipo === 'capa') {
                        await cambiarColorCapa(editando.bloqueId, editando.capaId, c.hex);
                      }
                      setEditando(null);
                    }}
                    title={c.nombre}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: '50%',
                      backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.6)',
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditando(null)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarScreen;
// src/screens/Navegacion/ImportarScreen.tsx