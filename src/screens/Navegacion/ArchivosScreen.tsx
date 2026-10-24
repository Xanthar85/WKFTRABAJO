// src/screens/Navegacion/ArchivosScreen.tsx


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
import type { BloqueCapas, Capa, ElementoCapa } from '../../db/capas-repo.ts';
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

function colorEfectivoElemento(
  bloque: BloqueCapas,
  capa: Capa,
  el: ElementoCapa
): string {
  return (
    el.estilo?.color ||
    capa.colorCapa ||
    bloque.colorBloque ||
    COLOR_DEFECTO
  );
}

interface ModalColorProps {
  titulo: string;
  onElegir: (color: string | null) => void;
  onCerrar: () => void;
}

const ModalColor: React.FC<ModalColorProps> = ({
  titulo,
  onElegir,
  onCerrar,
}) => (
  <div
    onClick={onCerrar}
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
        {titulo}
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
            onClick={() => onElegir(c.hex)}
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
          onClick={() => onElegir(null)}
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
          Heredar / sin color
        </button>
        <button
          type="button"
          onClick={onCerrar}
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
);

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
  const crearWaypoint = useNavegacionStore((s) => s.crearWaypoint);

  const alternarVisibleWaypoint = useNavegacionStore((s) => s.alternarVisibleWaypoint);
  const alternarFavoritoWaypoint = useNavegacionStore((s) => s.alternarFavoritoWaypoint);
  const alternarVisibleRuta = useNavegacionStore((s) => s.alternarVisibleRuta);
  const alternarFavoritoRuta = useNavegacionStore((s) => s.alternarFavoritoRuta);
  const alternarVisibleTrack = useNavegacionStore((s) => s.alternarVisibleTrack);
  const alternarFavoritoTrack = useNavegacionStore((s) => s.alternarFavoritoTrack);
  const alternarVisibleElemento = useNavegacionStore((s) => s.alternarVisibleElemento);
  const alternarFavoritoElemento = useNavegacionStore((s) => s.alternarFavoritoElemento);
  const alternarVisibilidadCapa = useNavegacionStore((s) => s.alternarVisibilidadCapa);
  const alternarVisibilidadBloque = useNavegacionStore((s) => s.alternarVisibilidadBloque);

  const actualizarWaypoint = useNavegacionStore((s) => s.actualizarWaypoint);
  const renombrarBloque = useNavegacionStore((s) => s.renombrarBloque);
  const renombrarCapa = useNavegacionStore((s) => s.renombrarCapa);
  const cambiarColorBloque = useNavegacionStore((s) => s.cambiarColorBloque);
  const cambiarColorCapa = useNavegacionStore((s) => s.cambiarColorCapa);
  const cambiarColorElemento = useNavegacionStore((s) => s.cambiarColorElemento);

  const [cajaAbiertaId, setCajaAbiertaId] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [renombrando, setRenombrando] = useState<Carpeta | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<Carpeta | null>(null);
  const [creandoCaja, setCreandoCaja] = useState(false);
  const [nombreCajaNueva, setNombreCajaNueva] = useState('');
  const [creandoWaypoint, setCreandoWaypoint] = useState(false);
  const [nombreWaypointNuevo, setNombreWaypointNuevo] = useState('');
  const [latWaypointNueva, setLatWaypointNueva] = useState('39.5');
  const [lonWaypointNueva, setLonWaypointNueva] = useState('-0.5');

  // Modales de color por nivel
  const [colorCarpeta, setColorCarpeta] = useState<Carpeta | null>(null);
  const [colorBloque, setColorBloque] = useState<BloqueCapas | null>(null);
  const [colorCapaObj, setColorCapaObj] = useState<{ bloque: BloqueCapas; capa: Capa } | null>(null);
  const [colorElementoObj, setColorElementoObj] = useState<{
    bloque: BloqueCapas;
    capa: Capa;
    elemento: ElementoCapa;
  } | null>(null);

  // Modales de renombrar bloque y capa
  const [renombrandoBloque, setRenombrandoBloque] = useState<BloqueCapas | null>(null);
  const [nombreBloqueNuevo, setNombreBloqueNuevo] = useState('');
  const [renombrandoCapa, setRenombrandoCapa] = useState<{ bloque: BloqueCapas; capa: Capa } | null>(null);
  const [nombreCapaNueva, setNombreCapaNueva] = useState('');

  // Renombrar waypoint (solo nombre)
  const [renombrandoWaypoint, setRenombrandoWaypoint] = useState<Waypoint | null>(null);
  const [nombreWaypointEdit, setNombreWaypointEdit] = useState('');

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
        color: b.colorBloque,
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

  const bloqueAbierto = useMemo<BloqueCapas | null>(() => {
    if (!cajaAbiertaId) return null;
    if (!cajaAbiertaId.startsWith('bloque:')) return null;
    const id = cajaAbiertaId.slice('bloque:'.length);
    return bloquesCapas.find((b) => b.id === id) ?? null;
  }, [cajaAbiertaId, bloquesCapas]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesando(true);
    setError(null);
    setAviso(null);

    try {
      const res = await importarArchivo(file);
      if (res.ok === false) {
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

  const confirmarBorradoCaja = async () => {
    if (!confirmandoBorrado) return;
    await borrarCarpeta(confirmandoBorrado.id);
    if (cajaAbiertaId === confirmandoBorrado.id) setCajaAbiertaId(null);
    setConfirmandoBorrado(null);
  };

  const puedeCrearWaypointEnCaja = (caja: CajaVista | null): boolean => {
    if (!caja) return false;
    if (caja.id.startsWith('bloque:')) return false;
    return true;
  };

  const carpetaDestinoWaypoint = (caja: CajaVista): string => {
    if (esCajaSistema(caja.id)) return WKF_WAYPOINTS_ID;
    return caja.id;
  };

  const iniciarCrearWaypoint = () => {
    if (!cajaAbierta) return;
    if (!puedeCrearWaypointEnCaja(cajaAbierta)) return;
    const numero = waypoints.length + 1;
    setNombreWaypointNuevo(`Waypoint ${numero}`);
    setLatWaypointNueva('39.5');
    setLonWaypointNueva('-0.5');
    setCreandoWaypoint(true);
  };

  const confirmarCrearWaypoint = async () => {
    if (!cajaAbierta) return;
    if (!puedeCrearWaypointEnCaja(cajaAbierta)) return;

    const lat = parseFloat(latWaypointNueva);
    const lon = parseFloat(lonWaypointNueva);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      setError('Coordenadas no válidas');
      return;
    }

    const numero = waypoints.length + 1;
    const nombre = nombreWaypointNuevo.trim() || `Waypoint ${numero}`;
    const carpetaId = carpetaDestinoWaypoint(cajaAbierta);
    try {
      await crearWaypoint({ nombre, lat, lon, carpetaId });
      setCreandoWaypoint(false);
      setNombreWaypointNuevo('');
      mostrarAviso(`${nombre} creado en ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    } catch (err) {
      console.error('Error creando waypoint', err);
      setError('Error creando waypoint.');
    }
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

  const colorElementoLista = (el: ElementoLista): string => {
    if (el.tipo === 'waypoint') {
      return (el.ref as Waypoint & { color?: string }).color || COLOR_DEFECTO;
    }
    if (el.tipo === 'elemento-capa') {
      const bloque = bloquesCapas.find((b) => b.id === el.bloqueId);
      const capa = bloque?.capas.find((c) => c.id === el.capaId);
      if (bloque && capa) return colorEfectivoElemento(bloque, capa, el.ref);
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

  const iniciarRenombrarBloque = (b: BloqueCapas) => {
    setRenombrandoBloque(b);
    setNombreBloqueNuevo(b.nombre);
  };
  const confirmarRenombrarBloque = async () => {
    if (!renombrandoBloque) return;
    const limpio = nombreBloqueNuevo.trim();
    if (!limpio) return;
    await renombrarBloque(renombrandoBloque.id, limpio);
    setRenombrandoBloque(null);
    setNombreBloqueNuevo('');
  };

  const iniciarRenombrarCapa = (bloque: BloqueCapas, capa: Capa) => {
    setRenombrandoCapa({ bloque, capa });
    setNombreCapaNueva(capa.nombre);
  };
  const confirmarRenombrarCapa = async () => {
    if (!renombrandoCapa) return;
    const limpio = nombreCapaNueva.trim();
    if (!limpio) return;
    await renombrarCapa(renombrandoCapa.bloque.id, renombrandoCapa.capa.id, limpio);
    setRenombrandoCapa(null);
    setNombreCapaNueva('');
  };

  const iniciarRenombrarWaypoint = (w: Waypoint) => {
    setRenombrandoWaypoint(w);
    setNombreWaypointEdit(w.nombre);
  };
  const confirmarRenombrarWaypoint = async () => {
    if (!renombrandoWaypoint) return;
    const limpio = nombreWaypointEdit.trim();
    if (!limpio) return;
    await actualizarWaypoint(renombrandoWaypoint.id, { nombre: limpio });
    setRenombrandoWaypoint(null);
    setNombreWaypointEdit('');
  };

  const alternarVisibleCapa = (bloque: BloqueCapas, capa: Capa) => {
    void alternarVisibilidadCapa(bloque.id, capa.id, !capa.visible);
  };

  const alternarVisibleBloqueEntero = (bloque: BloqueCapas) => {
    const todasVisibles = bloque.capas.every((c) => c.visible);
    void alternarVisibilidadBloque(bloque.id, !todasVisibles);
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
            minWidth: 0,
            flex: 1,
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
                  flexShrink: 0,
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

        {cajaAbierta && puedeCrearWaypointEnCaja(cajaAbierta) && (
          <button
            type="button"
            onClick={iniciarCrearWaypoint}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              backgroundColor: 'rgba(0, 229, 106, 0.15)',
              color: 'var(--accent)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Waypoint
          </button>
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
                  minHeight: 48,
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
                    onClick={
                      !caja.esSistema && !caja.id.startsWith('bloque:')
                        ? (e) => {
                            e.stopPropagation();
                            const c = carpetas.find((x) => x.id === caja.id);
                            if (c) setColorCarpeta(c);
                          }
                        : undefined
                    }
                    onPointerDown={
                      !caja.esSistema && !caja.id.startsWith('bloque:')
                        ? (e) => e.stopPropagation()
                        : undefined
                    }
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      backgroundColor: caja.color || 'transparent',
                      border: caja.color ? 'none' : '1px dashed var(--text-dim)',
                      flexShrink: 0,
                      cursor:
                        !caja.esSistema && !caja.id.startsWith('bloque:')
                          ? 'pointer'
                          : 'default',
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
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const c = carpetas.find((x) => x.id === caja.id);
                        if (c) iniciarRenombrar(c);
                      }}
                      style={{
                        flexShrink: 0,
                        minWidth: 44,
                        minHeight: 44,
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation',
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      title="Color"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const c = carpetas.find((x) => x.id === caja.id);
                        if (c) setColorCarpeta(c);
                      }}
                      style={{
                        flexShrink: 0,
                        minWidth: 44,
                        minHeight: 44,
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: caja.color || 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '1.05rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation',
                      }}
                    >
                      ■
                    </button>
                    <button
                      type="button"
                      title="Borrar"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const c = carpetas.find((x) => x.id === caja.id);
                        if (c) setConfirmandoBorrado(c);
                      }}
                      style={{
                        flexShrink: 0,
                        minWidth: 44,
                        minHeight: 44,
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: 'var(--verdict-desaconsejado)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation',
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
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const bloqueId = caja.id.slice('bloque:'.length);
                      void borrarCajaBloque(bloqueId);
                    }}
                    style={{
                      flexShrink: 0,
                      minWidth: 44,
                      minHeight: 44,
                      padding: '0 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderLeft: '1px solid var(--border)',
                      color: 'var(--verdict-desaconsejado)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      touchAction: 'manipulation',
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {cargado && cajaAbierta && bloqueAbierto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <button
                type="button"
                title="Color del archivo"
                onClick={() => setColorBloque(bloqueAbierto)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  backgroundColor: bloqueAbierto.colorBloque || 'transparent',
                  border: bloqueAbierto.colorBloque
                    ? 'none'
                    : '1px dashed var(--text-dim)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {bloqueAbierto.nombre}
              </span>
              <button
                type="button"
                title={bloqueAbierto.capas.every((c) => c.visible) ? 'Ocultar todo' : 'Mostrar todo'}
                onClick={() => alternarVisibleBloqueEntero(bloqueAbierto)}
                style={{
                  padding: '0 10px',
                  minHeight: 36,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                {bloqueAbierto.capas.every((c) => c.visible) ? '👁' : '🕶'}
              </button>
              <button
                type="button"
                title="Renombrar archivo"
                onClick={() => iniciarRenombrarBloque(bloqueAbierto)}
                style={{
                  padding: '0 10px',
                  minHeight: 36,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                ✎
              </button>
            </div>

            {bloqueAbierto.capas.map((capa) => (
              <div
                key={capa.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  borderLeft: '2px solid var(--border)',
                  paddingLeft: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                  }}
                >
                  <button
                    type="button"
                    title="Color de la capa"
                    onClick={() => setColorCapaObj({ bloque: bloqueAbierto, capa })}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      backgroundColor: capa.colorCapa || 'transparent',
                      border: capa.colorCapa ? 'none' : '1px dashed var(--text-dim)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--text)',
                    }}
                  >
                    {capa.nombre}
                  </span>
                  <button
                    type="button"
                    title={capa.visible ? 'Ocultar capa' : 'Mostrar capa'}
                    onClick={() => alternarVisibleCapa(bloqueAbierto, capa)}
                    style={{
                      padding: '0 8px',
                      minHeight: 32,
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {capa.visible ? '👁' : '🕶'}
                  </button>
                  <button
                    type="button"
                    title="Renombrar capa"
                    onClick={() => iniciarRenombrarCapa(bloqueAbierto, capa)}
                    style={{
                      padding: '0 8px',
                      minHeight: 32,
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    ✎
                  </button>
                </div>

                {capa.elementos.map((el) => {
                  const listaEl: ElementoLista = {
                    tipo: 'elemento-capa',
                    ref: el,
                    bloqueId: bloqueAbierto.id,
                    capaId: capa.id,
                  };
                  const colorEf = colorEfectivoElemento(bloqueAbierto, capa, el);
                  const visible = el.visible ?? true;
                  const favorito = el.favorito ?? false;
                  return (
                    <div
                      key={`${capa.id}-${el.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        gap: 4,
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: colorEf,
                            boxShadow: `0 0 6px ${colorEf}`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '0.9rem' }}>⬡</span>
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {el.nombre?.trim() || 'Elemento'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 600,
                          }}
                        >
                          {el.tipo}
                        </span>
                      </div>
                      <button
                        type="button"
                        title="Color del elemento"
                        onClick={() =>
                          setColorElementoObj({
                            bloque: bloqueAbierto,
                            capa,
                            elemento: el,
                          })
                        }
                        style={{
                          padding: '0 10px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          color: colorEf,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        ■
                      </button>
                      <button
                        type="button"
                        title={visible ? 'Ocultar' : 'Mostrar'}
                        onClick={() => alternarVisible(listaEl)}
                        style={{
                          padding: '0 10px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        {visible ? '👁' : '🕶'}
                      </button>
                      <button
                        type="button"
                        title={favorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        onClick={() => alternarFavorito(listaEl)}
                        style={{
                          padding: '0 10px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          color: favorito ? '#FFD400' : 'var(--text-dim)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        title="Navegar"
                        onClick={() => navegarA(listaEl)}
                        style={{
                          padding: '0 12px',
                          backgroundColor: 'rgba(0, 229, 106, 0.15)',
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                        }}
                      >
                        ➤
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {cargado && cajaAbierta && !bloqueAbierto && cajaAbierta.elementos.length === 0 && (
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

        {cargado && cajaAbierta && !bloqueAbierto && cajaAbierta.elementos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cajaAbierta.elementos.map((el, idx) => {
              const nombre = nombreElemento(el);
              const visible = visibleElemento(el);
              const favorito = favoritoElemento(el);
              const color = colorElementoLista(el);
              const key = `${el.tipo}-${(el.ref as { id: string }).id}-${idx}`;
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

                  {el.tipo === 'waypoint' && (
                    <button
                      type="button"
                      title="Renombrar waypoint"
                      onClick={() => iniciarRenombrarWaypoint(el.ref)}
                      style={{
                        padding: '0 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderLeft: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                    >
                      ✎
                    </button>
                  )}

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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
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
                  backgroundColor: nombreNuevo.trim() ? 'var(--accent)' : 'var(--border)',
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

      {colorCarpeta && (
        <ModalColor
          titulo={`Color de "${colorCarpeta.nombre}"`}
          onElegir={async (color) => {
            await cambiarColorCarpeta(colorCarpeta.id, color ?? undefined);
            setColorCarpeta(null);
          }}
          onCerrar={() => setColorCarpeta(null)}
        />
      )}

      {colorBloque && (
        <ModalColor
          titulo={`Color del archivo "${colorBloque.nombre}"`}
          onElegir={async (color) => {
            await cambiarColorBloque(colorBloque.id, color);
            setColorBloque(null);
          }}
          onCerrar={() => setColorBloque(null)}
        />
      )}

      {colorCapaObj && (
        <ModalColor
          titulo={`Color de la capa "${colorCapaObj.capa.nombre}"`}
          onElegir={async (color) => {
            await cambiarColorCapa(colorCapaObj.bloque.id, colorCapaObj.capa.id, color);
            setColorCapaObj(null);
          }}
          onCerrar={() => setColorCapaObj(null)}
        />
      )}

      {colorElementoObj && (
        <ModalColor
          titulo={`Color del elemento "${colorElementoObj.elemento.nombre?.trim() || 'Elemento'}"`}
          onElegir={async (color) => {
            await cambiarColorElemento(
              colorElementoObj.bloque.id,
              colorElementoObj.capa.id,
              colorElementoObj.elemento.id,
              color
            );
            setColorElementoObj(null);
          }}
          onCerrar={() => setColorElementoObj(null)}
        />
      )}

      {renombrandoBloque && (
        <div
          onClick={() => setRenombrandoBloque(null)}
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Renombrar archivo
            </h3>
            <input
              type="text"
              value={nombreBloqueNuevo}
              onChange={(e) => setNombreBloqueNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmarRenombrarBloque();
                if (e.key === 'Escape') setRenombrandoBloque(null);
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
                onClick={() => setRenombrandoBloque(null)}
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
                onClick={() => void confirmarRenombrarBloque()}
                disabled={!nombreBloqueNuevo.trim()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: nombreBloqueNuevo.trim() ? 'var(--accent)' : 'var(--border)',
                  color: nombreBloqueNuevo.trim() ? '#000' : 'var(--text-dim)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: nombreBloqueNuevo.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {renombrandoCapa && (
        <div
          onClick={() => setRenombrandoCapa(null)}
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Renombrar capa
            </h3>
            <input
              type="text"
              value={nombreCapaNueva}
              onChange={(e) => setNombreCapaNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmarRenombrarCapa();
                if (e.key === 'Escape') setRenombrandoCapa(null);
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
                onClick={() => setRenombrandoCapa(null)}
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
                onClick={() => void confirmarRenombrarCapa()}
                disabled={!nombreCapaNueva.trim()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: nombreCapaNueva.trim() ? 'var(--accent)' : 'var(--border)',
                  color: nombreCapaNueva.trim() ? '#000' : 'var(--text-dim)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: nombreCapaNueva.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {renombrandoWaypoint && (
        <div
          onClick={() => setRenombrandoWaypoint(null)}
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Renombrar waypoint
            </h3>
            <input
              type="text"
              value={nombreWaypointEdit}
              onChange={(e) => setNombreWaypointEdit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmarRenombrarWaypoint();
                if (e.key === 'Escape') setRenombrandoWaypoint(null);
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
                onClick={() => setRenombrandoWaypoint(null)}
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
                onClick={() => void confirmarRenombrarWaypoint()}
                disabled={!nombreWaypointEdit.trim()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: nombreWaypointEdit.trim() ? 'var(--accent)' : 'var(--border)',
                  color: nombreWaypointEdit.trim() ? '#000' : 'var(--text-dim)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: nombreWaypointEdit.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Guardar
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
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--verdict-desaconsejado)' }}>
              🗑 Borrar caja
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
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
                  backgroundColor: nombreCajaNueva.trim() ? 'var(--accent)' : 'var(--border)',
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

      {creandoWaypoint && (
        <div
          onClick={() => setCreandoWaypoint(false)}
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
              border: '1px solid var(--accent)',
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>
              📍 Nuevo waypoint
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.45 }}>
              Se creará en las coordenadas indicadas. Podrás moverlo o editarlo
              más adelante desde Mapa o desde Archivos.
            </p>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Nombre
            </label>
            <input
              type="text"
              value={nombreWaypointNuevo}
              onChange={(e) => setNombreWaypointNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmarCrearWaypoint();
                if (e.key === 'Escape') setCreandoWaypoint(false);
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                  Latitud
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={latWaypointNueva}
                  onChange={(e) => setLatWaypointNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void confirmarCrearWaypoint();
                    if (e.key === 'Escape') setCreandoWaypoint(false);
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
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                  Longitud
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lonWaypointNueva}
                  onChange={(e) => setLonWaypointNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void confirmarCrearWaypoint();
                    if (e.key === 'Escape') setCreandoWaypoint(false);
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
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setCreandoWaypoint(false)}
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
                onClick={() => void confirmarCrearWaypoint()}
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