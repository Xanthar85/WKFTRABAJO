// src/screens/Navegacion/ArchivosScreen.tsx
// WKF — Pestaña Archivos (Fase 2 WKF1.055).
// Panel de control de cajas: WKF Waypoints, WKF Rutas, WKF Fav y
// cada bloque importado como caja de primer nivel.
// - Lista plana de elementos finales dentro de una caja.
// - ➤ navegar, 👁 ocultar, ★ favorito, ⋮ opciones por elemento.
// - Cabecera de caja: ✎ renombrar (solo no-sistema), ■ color
//   (solo no-sistema), 🗑 borrar (solo no-sistema).
// - "+" para importar archivo o crear caja manual vacía.
// - "Ver en el mapa" por ruta y por track.
// - WKF Fav muestra waypoints + rutas + tracks + elementos de
//   capa favoritos en una lista plana, con etiqueta de tipo.

import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useNavegacionStore,
  esCajaSistema,
  WKF_WAYPOINTS_ID,
  WKF_RUTAS_ID,
  WKF_FAV_ID,
  CAJAS_SISTEMA,
} from '../../state/navegacion-store.ts';
import { importarArchivo } from '../../lib/navegacion/importar.ts';
import { PALETA_WKF } from '../../lib/colores-wkf.ts';
import type { Carpeta } from '../../db/carpetas-repo.ts';
import type { Waypoint } from '../../db/waypoints-repo.ts';
import type { Ruta } from '../../db/rutas-repo.ts';
import type { Track } from '../../db/tracks-repo.ts';
import type { BloqueCapas, ElementoCapa } from '../../db/capas-repo.ts';
import type { DestinoNavegacion } from './NavegarScreen.tsx';

export interface ArchivosScreenProps {
  onNavegar: (destino: DestinoNavegacion) => void;
}

type ElementoLista =
  | { tipo: 'waypoint'; ref: Waypoint }
  | { tipo: 'ruta'; ref: Ruta }
  | { tipo: 'track'; ref: Track }
  | {
      tipo: 'elemento-capa';
      ref: ElementoCapa;
      bloqueId: string;
      capaId: string;
    };

interface CajaVista {
  id: string;
  nombre: string;
  color?: string;
  esSistema: boolean;
  elementos: ElementoLista[];
}

const COLOR_DEFECTO = '#00E56A';

function etiquetaTipo(tipo: ElementoLista['tipo']): string {
  switch (tipo) {
    case 'waypoint':
      return 'Waypoint';
    case 'ruta':
      return 'Ruta';
    case 'track':
      return 'Track';
    case 'elemento-capa':
      return 'Capa';
  }
}

function iconoTipo(tipo: ElementoLista['tipo']): string {
  switch (tipo) {
    case 'waypoint':
      return '📍';
    case 'ruta':
      return '〰';
    case 'track':
      return '⤳';
    case 'elemento-capa':
      return '⬡';
  }
}

export const ArchivosScreen: React.FC<ArchivosScreenProps> = ({
  onNavegar,
}) => {
  const { t } = useTranslation();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const waypoints = useNavegacionStore((s) => s.waypoints);
  const rutas = useNavegacionStore((s) => s.rutas);
  const tracks = useNavegacionStore((s) => s.tracks);
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const carpetas = useNavegacionStore((s) => s.carpetas);
  const cargado = useNavegacionStore((s) => s.cargado);

  const crearCarpeta = useNavegacionStore((s) => s.crearCarpeta);
  const renombrarCarpeta = useNavegacionStore((s) => s.renombrarCarpeta);
  const cambiarColorCarpeta = useNavegacionStore((s) => s.cambiarColorCarpeta);
  const borrarCarpeta = useNavegacionStore((s) => s.borrarCarpeta);
  const importarBloque = useNavegacionStore((s) => s.importarBloque);
  const borrarBloque = useNavegacionStore((s) => s.borrarBloque);

  const alternarVisibleWaypoint = useNavegacionStore(
    (s) => s.alternarVisibleWaypoint
  );
  const alternarFavoritoWaypoint = useNavegacionStore(
    (s) => s.alternarFavoritoWaypoint
  );
  const alternarVisibleRuta = useNavegacionStore(
    (s) => s.alternarVisibleRuta
  );
  const alternarFavoritoRuta = useNavegacionStore(
    (s) => s.alternarFavoritoRuta
  );
  const alternarVisibleTrack = useNavegacionStore(
    (s) => s.alternarVisibleTrack
  );
  const alternarFavoritoTrack = useNavegacionStore(
    (s) => s.alternarFavoritoTrack
  );
  const alternarVisibleElemento = useNavegacionStore(
    (s) => s.alternarVisibleElemento
  );
  const alternarFavoritoElemento = useNavegacionStore(
    (s) => s.alternarFavoritoElemento
  );

  const [cajaAbiertaId, setCajaAbiertaId] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [renombrando, setRenombrando] = useState<Carpeta | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [coloreando, setColoreando] = useState<Carpeta | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<Carpeta | null>(
    null
  );
  const [creandoCaja, setCreandoCaja] = useState(false);
  const [nombreCajaNueva, setNombreCajaNueva] = useState('');

  const mostrarAviso = (msg: string) => {
    setAviso(msg);
    window.setTimeout(() => setAviso(null), 2200);
  };

  const cajas: CajaVista[] = useMemo(() => {
    const idsCarpetasSistema = new Set([
      WKF_WAYPOINTS_ID,
      WKF_RUTAS_ID,
      WKF_FAV_ID,
    ]);
    const lista: CajaVista[] = [];

    // 1) WKF Waypoints
    lista.push({
      id: WKF_WAYPOINTS_ID,
      nombre:
        CAJAS_SISTEMA.find((c) => c.id === WKF_WAYPOINTS_ID)?.nombre ??
        'WKF Waypoints',
      color: CAJAS_SISTEMA.find((c) => c.id === WKF_WAYPOINTS_ID)?.color,
      esSistema: true,
      elementos: waypoints
        .filter(
          (w) =>
            !w.carpetaId ||
            w.carpetaId === WKF_WAYPOINTS_ID ||
            (!idsCarpetasSistema.has(w.carpetaId) &&
              !carpetas.some((c) => c.id === w.carpetaId))
        )
        .map<ElementoLista>((w) => ({ tipo: 'waypoint', ref: w })),
    });

    // 2) WKF Rutas
    lista.push({
      id: WKF_RUTAS_ID,
      nombre:
        CAJAS_SISTEMA.find((c) => c.id === WKF_RUTAS_ID)?.nombre ??
        'WKF Rutas',
      color: CAJAS_SISTEMA.find((c) => c.id === WKF_RUTAS_ID)?.color,
      esSistema: true,
      elementos: [
        ...rutas.map<ElementoLista>((r) => ({ tipo: 'ruta', ref: r })),
        ...tracks.map<ElementoLista>((tr) => ({ tipo: 'track', ref: tr })),
      ],
    });

    // 3) WKF Fav
    const favElements: ElementoLista[] = [];
    for (const w of waypoints) {
      if (w.favorito) favElements.push({ tipo: 'waypoint', ref: w });
    }
    for (const r of rutas) {
      if (r.favorito) favElements.push({ tipo: 'ruta', ref: r });
    }
    for (const tk of tracks) {
      if (tk.favorito) favElements.push({ tipo: 'track', ref: tk });
    }
    for (const b of bloquesCapas) {
      for (const cp of b.capas) {
        for (const el of cp.elementos) {
          if (el.favorito) {
            favElements.push({
              tipo: 'elemento-capa',
              ref: el,
              bloqueId: b.id,
              capaId: cp.id,
            });
          }
        }
      }
    }
    lista.push({
      id: WKF_FAV_ID,
      nombre:
        CAJAS_SISTEMA.find((c) => c.id === WKF_FAV_ID)?.nombre ?? 'WKF Fav',
      color: CAJAS_SISTEMA.find((c) => c.id === WKF_FAV_ID)?.color,
      esSistema: true,
      elementos: favElements,
    });

    // 4) Carpetas manuales
    for (const c of carpetas) {
      lista.push({
        id: c.id,
        nombre: c.nombre,
        color: c.color,
        esSistema: esCajaSistema(c.id),
        elementos: waypoints
          .filter((w) => w.carpetaId === c.id)
          .map<ElementoLista>((w) => ({ tipo: 'waypoint', ref: w })),
      });
    }

    // 5) Cada bloque importado como caja de primer nivel
    for (const b of bloquesCapas) {
      const elementosBloque: ElementoLista[] = [];
      for (const cp of b.capas) {
        for (const el of cp.elementos) {
          elementosBloque.push({
            tipo: 'elemento-capa',
            ref: el,
            bloqueId: b.id,
            capaId: cp.id,
          });
        }
      }
      lista.push({
        id: `bloque:${b.id}`,
        nombre: b.nombre,
        esSistema: false,
        elementos: elementosBloque,
      });
    }

    return lista;
  }, [waypoints, rutas, tracks, bloquesCapas, carpetas]);

  const cajaAbierta = useMemo(() => {
    if (!cajaAbiertaId) return null;
    return cajas.find((c) => c.id === cajaAbiertaId) ?? null;
  }, [cajaAbiertaId, cajas]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesando(true);
    setError(null);
    setAviso(null);

    try {
      const res = await importarArchivo(file);
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      const bloque = await importarBloque(res.bloque);
      const capasCount = bloque.capas.length;
      const elementosCount = bloque.capas.reduce(
        (acc, c) => acc + c.elementos.length,
        0
      );
      mostrarAviso(
        `Importado: ${capasCount} capa(s) · ${elementosCount} elemento(s)`
      );
    } catch (err) {
      console.error(err);
      setError('Error inesperado al importar.');
    } finally {
      setProcesando(false);
      if (inputFileRef.current) inputFileRef.current.value = '';
    }
  };

  const iniciarRenombrar = (c: Carpeta) => {
    setRenombrando(c);
    setNombreNuevo(c.nombre);
  };

  const confirmarRenombrar = async () => {
    if (!renombrando) return;
    const limpio = nombreNuevo.trim();
    if (!limpio) return;
    await renombrarCarpeta(renombrando.id, limpio);
    setRenombrando(null);
    setNombreNuevo('');
  };

  const confirmarCrearCaja = async () => {
    const limpio = nombreCajaNueva.trim();
    if (!limpio) return;
    await crearCarpeta(limpio);
    setCreandoCaja(false);
    setNombreCajaNueva('');
  };

  const confirmarColorCaja = async (color: string | undefined) => {
    if (!coloreando) return;
    await cambiarColorCarpeta(coloreando.id, color);
    setColoreando(null);
  };

  const confirmarBorradoCaja = async () => {
    if (!confirmandoBorrado) return;
    await borrarCarpeta(confirmandoBorrado.id);
    if (cajaAbiertaId === confirmandoBorrado.id) setCajaAbiertaId(null);
    setConfirmandoBorrado(null);
  };

  const navegarA = (el: ElementoLista) => {
    if (el.tipo === 'waypoint') {
      onNavegar({ tipo: 'waypoint', id: el.ref.id });
    } else if (el.tipo === 'ruta') {
      onNavegar({ tipo: 'ruta', id: el.ref.id });
    } else if (el.tipo === 'track') {
      if (!el.ref.puntos || el.ref.puntos.length < 2) {
        mostrarAviso('Este track está vacío. No se puede navegar.');
        return;
      }
      onNavegar({ tipo: 'track', id: el.ref.id });
    } else if (el.tipo === 'elemento-capa') {
      if (el.ref.tipo === 'poligono') {
        onNavegar({
          tipo: 'poligono',
          bloqueId: el.bloqueId,
          capaId: el.capaId,
          elementoId: el.ref.id,
        });
      } else if (el.ref.tipo === 'linea') {
        onNavegar({
          tipo: 'linea',
          bloqueId: el.bloqueId,
          capaId: el.capaId,
          elementoId: el.ref.id,
        });
      } else {
        mostrarAviso('Los puntos importados no se navegan desde aquí.');
      }
    }
  };

  const alternarVisible = (el: ElementoLista) => {
    if (el.tipo === 'waypoint') void alternarVisibleWaypoint(el.ref.id);
    else if (el.tipo === 'ruta') void alternarVisibleRuta(el.ref.id);
    else if (el.tipo === 'track') void alternarVisibleTrack(el.ref.id);
    else if (el.tipo === 'elemento-capa') {
      void alternarVisibleElemento(
        el.bloqueId,
        el.capaId,
        el.ref.id,
        !(el.ref.visible ?? true)
      );
    }
  };

  const alternarFavorito = (el: ElementoLista) => {
    if (el.tipo === 'waypoint') void alternarFavoritoWaypoint(el.ref.id);
    else if (el.tipo === 'ruta') void alternarFavoritoRuta(el.ref.id);
    else if (el.tipo === 'track') void alternarFavoritoTrack(el.ref.id);
    else if (el.tipo === 'elemento-capa') {
      void alternarFavoritoElemento(el.bloqueId, el.capaId, el.ref.id);
    }
  };

  const nombreElemento = (el: ElementoLista): string => {
    if (el.tipo === 'waypoint') return el.ref.nombre;
    if (el.tipo === 'ruta') return el.ref.nombre;
    if (el.tipo === 'track') return el.ref.nombre;
    return el.ref.nombre?.trim() || 'Elemento';
  };

  const visibleElemento = (el: ElementoLista): boolean => {
    if (el.tipo === 'elemento-capa') return el.ref.visible ?? true;
    return (el.ref as { visible?: boolean }).visible ?? true;
  };

  const favoritoElemento = (el: ElementoLista): boolean => {
    if (el.tipo === 'elemento-capa') return el.ref.favorito ?? false;
    return (el.ref as { favorito?: boolean }).favorito ?? false;
  };

  const colorElemento = (el: ElementoLista): string => {
    if (el.tipo === 'waypoint') {
      return (el.ref as Waypoint & { color?: string }).color || COLOR_DEFECTO;
    }
    if (el.tipo === 'elemento-capa') {
      return el.ref.estilo?.color || COLOR_DEFECTO;
    }
    return COLOR_DEFECTO;
  };

  const verEnMapa = (el: ElementoLista) => {
    navegarA(el);
  };

  const borrarCajaBloque = async (bloqueId: string) => {
    if (!window.confirm('¿Borrar este archivo y todas sus capas?')) return;
    await borrarBloque(bloqueId);
    if (cajaAbiertaId === `bloque:${bloqueId}`) setCajaAbiertaId(null);
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
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {cajaAbierta ? (
            <>
              <button
                type="button"
                onClick={() => setCajaAbiertaId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label="Volver"
              >
                ←
              </button>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: cajaAbierta.color || 'var(--border)',
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {cajaAbierta.nombre}
              </span>
            </>
          ) : (
            <span>Archivos</span>
          )}
        </h2>

        {!cajaAbierta && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                setCreandoCaja(true);
                setNombreCajaNueva('');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Carpeta
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
              {procesando ? '...' : '+ Importar'}
            </button>
            <input
              type="file"
              ref={inputFileRef}
              onChange={handleFile}
              accept=".gpx,.kml,.kmz,.json"
              style={{ display: 'none' }}
            />
          </div>
        )}
      </header>

      {error && (
        <div
          style={{
            padding: '8px 14px',
            backgroundColor: 'rgba(255, 45, 85, 0.15)',
            color: 'var(--verdict-desaconsejado)',
            fontSize: '0.8rem',
          }}
        >
          {error}
        </div>
      )}

      {aviso && (
        <div
          style={{
            padding: '8px 14px',
            backgroundColor: 'rgba(0, 229, 106, 0.15)',
            color: 'var(--accent)',
            fontSize: '0.8rem',
          }}
        >
          {aviso}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px 14px 20px',
        }}
      >
        {!cargado && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
              padding: 30,
            }}
          >
            Cargando…
          </div>
        )}

        {cargado && !cajaAbierta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cajas.map((caja) => (
              <div
                key={caja.id}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 6,
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCajaAbiertaId(caja.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '12px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text)',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      backgroundColor: caja.color || 'transparent',
                      border: caja.color ? 'none' : '1px dashed var(--text-dim)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {caja.nombre}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono, Fira Code, monospace)',
                    }}
                  >
                    {caja.elementos.length}
                  </span>
                </button>

                {!caja.esSistema && !caja.id.startsWith('bloque:') && (
                  <>
                    <button
                      type="button"
                      title="Renombrar"
                      onClick={() => {
                        const c = carpetas.find((x) => x.id === caja.id);
                        if (c) iniciarRenombrar(c);
                      }}
                      style={{
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      title="Color"
                      onClick={() => {
                        const c = carpetas.find((x) => x.id === caja.id);
                        if (c) setColoreando(c);
                      }}
                      style={{
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                      }}
                    >
                      ■
                    </button>
                    <button
                      type="button"
                      title="Borrar"
                      onClick={() => {
                        const c = carpetas.find((x) => x.id === caja.id);
                        if (c) setConfirmandoBorrado(c);
                      }}
                      style={{
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: 'var(--verdict-desaconsejado)',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                      }}
                    >
                      🗑
                    </button>
                  </>
                )}

                {caja.id.startsWith('bloque:') && (
                  <button
                    type="button"
                    title="Borrar archivo"
                    onClick={() => {
                      const bloqueId = caja.id.slice('bloque:'.length);
                      void borrarCajaBloque(bloqueId);
                    }}
                    style={{
                      padding: '0 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderLeft: '1px solid var(--border)',
                      color: 'var(--verdict-desaconsejado)',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {cargado && cajaAbierta && cajaAbierta.elementos.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
              padding: '40px 0',
              fontStyle: 'italic',
            }}
          >
            Caja vacía.
          </div>
        )}

        {cargado && cajaAbierta && cajaAbierta.elementos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cajaAbierta.elementos.map((el, idx) => {
              const nombre = nombreElemento(el);
              const visible = visibleElemento(el);
              const favorito = favoritoElemento(el);
              const color = colorElemento(el);
              const key = `${el.tipo}-${
                (el.ref as { id: string }).id
              }-${idx}`;
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 6,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '0.95rem' }}>{iconoTipo(el.tipo)}</span>
                    <span
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: 'var(--text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {nombre}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-dim)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                      }}
                    >
                      {etiquetaTipo(el.tipo)}
                    </span>
                  </div>

                  {(el.tipo === 'ruta' || el.tipo === 'track') && (
                    <button
                      type="button"
                      title="Ver en el mapa"
                      onClick={() => verEnMapa(el)}
                      style={{
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: 'var(--accent-2)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      🗺
                    </button>
                  )}

                  <button
                    type="button"
                    title={visible ? 'Ocultar' : 'Mostrar'}
                    onClick={() => alternarVisible(el)}
                    style={{
                      padding: '0 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderLeft: '1px solid var(--border)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                    }}
                  >
                    {visible ? '👁' : '🕶'}
                  </button>

                  <button
                    type="button"
                    title={favorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    onClick={() => alternarFavorito(el)}
                    style={{
                      padding: '0 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderLeft: '1px solid var(--border)',
                      color: favorito ? '#FFD400' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                    }}
                  >
                    ★
                  </button>

                  <button
                    type="button"
                    title="Navegar"
                    onClick={() => navegarA(el)}
                    style={{
                      padding: '0 14px',
                      backgroundColor: 'rgba(0, 229, 106, 0.15)',
                      border: 'none',
                      borderLeft: '1px solid var(--border)',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    ➤
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {renombrando && (
        <div
          onClick={() => setRenombrando(null)}
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
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              Renombrar caja
            </h3>
            <input
              type="text"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmarRenombrar();
                if (e.key === 'Escape') setRenombrando(null);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setRenombrando(null)}
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
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarRenombrar()}
                disabled={!nombreNuevo.trim()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: nombreNuevo.trim()
                    ? 'var(--accent)'
                    : 'var(--border)',
                  color: nombreNuevo.trim() ? '#000' : 'var(--text-dim)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: nombreNuevo.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {coloreando && (
        <div
          onClick={() => setColoreando(null)}
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
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              maxWidth: 380,
              width: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3
              style={{
                margin: '0 0 14px 0',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              Color de "{coloreando.nombre}"
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {PALETA_WKF.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void confirmarColorCaja(c.hex)}
                  title={c.nombre}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    backgroundColor: c.hex,
                    border: '1px solid rgba(0,0,0,0.6)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => void confirmarColorCaja(undefined)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Sin color
              </button>
              <button
                type="button"
                onClick={() => setColoreando(null)}
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
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmandoBorrado && (
        <div
          onClick={() => setConfirmandoBorrado(null)}
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
              border: '1px solid var(--verdict-desaconsejado)',
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--verdict-desaconsejado)',
              }}
            >
              🗑 Borrar caja
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '0.85rem',
                color: 'var(--text)',
                lineHeight: 1.5,
              }}
            >
              ¿Borrar la caja "{confirmandoBorrado.nombre}"? Los waypoints
              que contiene se moverán a "WKF Waypoints". No se borran.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmandoBorrado(null)}
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
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarBorradoCaja()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--verdict-desaconsejado)',
                  backgroundColor: 'rgba(255, 45, 85, 0.15)',
                  color: 'var(--verdict-desaconsejado)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {creandoCaja && (
        <div
          onClick={() => setCreandoCaja(false)}
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
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              Nueva carpeta
            </h3>
            <input
              type="text"
              value={nombreCajaNueva}
              onChange={(e) => setNombreCajaNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmarCrearCaja();
                if (e.key === 'Escape') setCreandoCaja(false);
              }}
              placeholder="Nombre de la carpeta"
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setCreandoCaja(false)}
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
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarCrearCaja()}
                disabled={!nombreCajaNueva.trim()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: nombreCajaNueva.trim()
                    ? 'var(--accent)'
                    : 'var(--border)',
                  color: nombreCajaNueva.trim() ? '#000' : 'var(--text-dim)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: nombreCajaNueva.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivosScreen;
// src/screens/Navegacion/ArchivosScreen.tsx
