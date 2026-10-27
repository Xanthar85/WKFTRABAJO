// src/screens/Navegacion/ArchivosScreen.tsx
// WKF1.061: BUG 3 (WKF Fav muestra sus elementos), BUG 1 (crear ruta
// desde Archivos) y MEJORA 4 (menú ⋮ en cada elemento, botones limpios).
// WKF1.063: Añadidas opciones de Mover, Duplicar y Exportar en el menú ⋮.

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function iconoTipo(tipo: ElementoLista['tipo']): string | null {
  switch (tipo) {
    case 'waypoint':
      return null;
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

function parsearCoordenadas(
  texto: string
): { lat: number; lon: number } | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const partes = limpio.split(/[\s,;]+/).filter(Boolean);
  if (partes.length < 2) return null;
  const lat = parseFloat(partes[0]);
  const lon = parseFloat(partes[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
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
      <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
        {titulo}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
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
  const crearRuta = useNavegacionStore((s) => s.crearRuta);

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

  const moverWaypointACarpeta = useNavegacionStore((s) => s.moverWaypointACarpeta);
  const duplicarWaypoint = useNavegacionStore((s) => s.duplicarWaypoint);
  const exportarWaypoint = useNavegacionStore((s) => s.exportarWaypoint);
  const exportarRuta = useNavegacionStore((s) => s.exportarRuta);
  const exportarTrack = useNavegacionStore((s) => s.exportarTrack);
  const exportarElementoCapa = useNavegacionStore((s) => s.exportarElementoCapa);

  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [renombrando, setRenombrando] = useState<Carpeta | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<Carpeta | null>(null);
  const [creandoCaja, setCreandoCaja] = useState(false);
  const [nombreCajaNueva, setNombreCajaNueva] = useState('');
  const [creandoWaypoint, setCreandoWaypoint] = useState(false);
  const [cajaWaypointId, setCajaWaypointId] = useState<string | null>(null);
  const [nombreWaypointNuevo, setNombreWaypointNuevo] = useState('');
  const [coordsWaypointNueva, setCoordsWaypointNueva] = useState('39.5, -0.5');

  const [creandoRuta, setCreandoRuta] = useState(false);
  const [nombreRutaNueva, setNombreRutaNueva] = useState('');
  const [seleccionRuta, setSeleccionRuta] = useState<Set<string>>(() => new Set());

  const [colorCarpeta, setColorCarpeta] = useState<Carpeta | null>(null);
  const [colorBloque, setColorBloque] = useState<BloqueCapas | null>(null);
  const [colorCapaObj, setColorCapaObj] = useState<{ bloque: BloqueCapas; capa: Capa } | null>(null);
  const [colorElementoObj, setColorElementoObj] = useState<{
    bloque: BloqueCapas;
    capa: Capa;
    elemento: ElementoCapa;
  } | null>(null);

  const [renombrandoBloque, setRenombrandoBloque] = useState<BloqueCapas | null>(null);
  const [nombreBloqueNuevo, setNombreBloqueNuevo] = useState('');
  const [renombrandoCapa, setRenombrandoCapa] = useState<{ bloque: BloqueCapas; capa: Capa } | null>(null);
  const [nombreCapaNueva, setNombreCapaNueva] = useState('');

  const [renombrandoWaypoint, setRenombrandoWaypoint] = useState<Waypoint | null>(null);
  const [nombreWaypointEdit, setNombreWaypointEdit] = useState('');
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [menuCajaAbierto, setMenuCajaAbierto] = useState<{
    tipo: 'caja' | 'bloque';
    id: string;
    nombre: string;
    color?: string;
  } | null>(null);

  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set<string>());

  const toggle = (clave: string) => {
    setAbiertos((prev) => {
      const s = new Set(prev);
      if (s.has(clave)) s.delete(clave);
      else s.add(clave);
      return s;
    });
  };

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
    setAbiertos((prev) => {
      const s = new Set(prev);
      s.delete('caja:' + confirmandoBorrado.id);
      return s;
    });
    setConfirmandoBorrado(null);
  };

  const puedeCrearWaypointEnCaja = (cajaId: string | null): boolean => {
    if (!cajaId) return false;
    if (cajaId.startsWith('bloque:')) return false;
    return true;
  };

  const carpetaDestinoWaypoint = (cajaId: string): string => {
    if (esCajaSistema(cajaId)) return WKF_WAYPOINTS_ID;
    return cajaId;
  };

  const iniciarCrearWaypoint = (cajaId: string) => {
    if (!puedeCrearWaypointEnCaja(cajaId)) return;
    setCajaWaypointId(cajaId);
    const numero = waypoints.length + 1;
    setNombreWaypointNuevo(`Waypoint ${numero}`);
    setCoordsWaypointNueva('39.5, -0.5');
    setCreandoWaypoint(true);
  };

  const iniciarCrearWaypointGlobal = () => {
    let cajaPrevia: string | null = null;
    for (const clave of abiertos) {
      if (clave.startsWith('caja:')) {
        const id = clave.slice(5);
        if (id === WKF_WAYPOINTS_ID || carpetas.some((c) => c.id === id)) {
          cajaPrevia = id;
          break;
        }
      }
    }
    setCajaWaypointId(cajaPrevia);
    const numero = waypoints.length + 1;
    setNombreWaypointNuevo(`Waypoint ${numero}`);
    setCoordsWaypointNueva('39.5, -0.5');
    setCreandoWaypoint(true);
  };

  const confirmarCrearWaypoint = async () => {
    const destinoId = cajaWaypointId || WKF_WAYPOINTS_ID;
    if (!puedeCrearWaypointEnCaja(destinoId)) return;

    const coords = parsearCoordenadas(coordsWaypointNueva);
    if (!coords) {
      setError('Coordenadas no válidas (formato: lat, lon)');
      return;
    }
    const { lat, lon } = coords;

    const numero = waypoints.length + 1;
    const nombre = nombreWaypointNuevo.trim() || `Waypoint ${numero}`;
    const carpetaId = carpetaDestinoWaypoint(destinoId);
    try {
      await crearWaypoint({ nombre, lat, lon, carpetaId });
      setCreandoWaypoint(false);
      setCajaWaypointId(null);
      setNombreWaypointNuevo('');
      setCoordsWaypointNueva('39.5, -0.5');
      mostrarAviso(`${nombre} creado en ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    } catch (err) {
      console.error('Error creando waypoint', err);
      setError('Error creando waypoint.');
    }
  };

  const iniciarCrearRuta = () => {
    setNombreRutaNueva(`Ruta ${rutas.length + 1}`);
    setSeleccionRuta(new Set());
    setCreandoRuta(true);
  };

  const toggleSeleccionRuta = (id: string) => {
    setSeleccionRuta((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const confirmarCrearRuta = async () => {
    const nombreLimpio = nombreRutaNueva.trim();
    if (!nombreLimpio) {
      setError('El nombre de la ruta no puede estar vacío.');
      return;
    }
    if (seleccionRuta.size < 2) {
      setError('Selecciona al menos 2 waypoints.');
      return;
    }
    try {
      await crearRuta({
        nombre: nombreLimpio,
        waypointIds: Array.from(seleccionRuta),
        origen: 'manual',
      });
      setCreandoRuta(false);
      setNombreRutaNueva('');
      setSeleccionRuta(new Set());
      mostrarAviso(`Ruta "${nombreLimpio}" creada.`);
    } catch (err) {
      console.error(err);
      setError('Error creando ruta.');
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
        onNavegar({
          tipo: 'punto-capa',
          bloqueId: el.bloqueId,
          capaId: el.capaId,
          elementoId: el.ref.id,
        });
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

  const borrarCajaBloque = async (bloqueId: string) => {
    if (!window.confirm('¿Borrar este archivo y todas sus capas?')) return;
    await borrarBloque(bloqueId);
    setAbiertos((prev) => {
      const s = new Set(prev);
      s.delete('bloque:' + bloqueId);
      return s;
    });
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

  const toggleMenu = (id: string) => {
    setMenuAbiertoId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!menuAbiertoId) return;
    const handleClickFuera = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.menu-elemento')) return;
      setMenuAbiertoId(null);
    };
    document.addEventListener('click', handleClickFuera);
    return () => {
      document.removeEventListener('click', handleClickFuera);
    };
  }, [menuAbiertoId]);

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
          <span>Archivos</span>
        </h2>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => iniciarCrearWaypointGlobal()}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              backgroundColor: 'rgba(0, 229, 106, 0.15)',
              color: 'var(--accent)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Waypoint
          </button>
          <button
            type="button"
            onClick={iniciarCrearRuta}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              backgroundColor: 'rgba(0, 229, 106, 0.15)',
              color: 'var(--accent)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Ruta
          </button>
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
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', padding: 30 }}>
            Cargando…
          </div>
        )}

        {cargado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cajas.map((caja) => {
              const esBloque = caja.id.startsWith('bloque:');
              const bloqueId = esBloque ? caja.id.slice('bloque:'.length) : null;
              const bloque = bloqueId
                ? bloquesCapas.find((b) => b.id === bloqueId) ?? null
                : null;
              const abierto = esBloque
                ? bloque != null && abiertos.has('bloque:' + bloque.id)
                : abiertos.has('caja:' + caja.id);
              return (
                <div
                  key={caja.id}
                  style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
                >
                  <div
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
                      onClick={() => {
                        if (esBloque && bloque) toggle('bloque:' + bloque.id);
                        else toggle('caja:' + caja.id);
                      }}
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
                          fontSize: '0.9rem',
                          color: 'var(--accent)',
                          flexShrink: 0,
                          width: 12,
                          textAlign: 'center',
                        }}
                      >
                        {abierto ? '▾' : '▸'}
                      </span>
                      <span style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: caja.color || 'transparent', border: caja.color ? 'none' : '1px dashed var(--text-dim)', flexShrink: 0 }} />
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
                    </button>

                    {!caja.esSistema && !esBloque && (
                      <button
                        type="button"
                        title={caja.elementos.every((el) => visibleElemento(el)) ? 'Ocultar caja' : 'Mostrar caja'}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const todosVisibles = caja.elementos.every((el) => visibleElemento(el));
                          caja.elementos.forEach((el) => {
                            const visible = visibleElemento(el);
                            if (todosVisibles && visible) alternarVisible(el);
                            else if (!todosVisibles && !visible) alternarVisible(el);
                          });
                        }}
                        style={{ flexShrink: 0, minWidth: 44, minHeight: 44, padding: '0 12px', backgroundColor: 'transparent', border: 'none', borderLeft: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                      >
                        {caja.elementos.every((el) => visibleElemento(el)) ? '👁' : '🕶'}
                      </button>
                    )}

                    {!caja.esSistema && !esBloque && (
                      <button
                        type="button"
                        title="Opciones"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuCajaAbierto({ tipo: 'caja', id: caja.id, nombre: caja.nombre, color: caja.color });
                        }}
                        style={{
                          flexShrink: 0,
                          minWidth: 44,
                          minHeight: 44,
                          padding: '0 12px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          touchAction: 'manipulation',
                        }}
                      >
                        ⋮
                      </button>
                    )}

                    {esBloque && bloque && (
                      <>
                        <button
                          type="button"
                          title={bloque.capas.every((c) => c.visible) ? 'Ocultar todo' : 'Mostrar todo'}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            alternarVisibleBloqueEntero(bloque);
                          }}
                          style={{
                            flexShrink: 0,
                            minWidth: 44,
                            minHeight: 44,
                            padding: '0 12px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderLeft: '1px solid var(--border)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            touchAction: 'manipulation',
                          }}
                        >
                          {bloque.capas.every((c) => c.visible) ? '👁' : '🕶'}
                        </button>
                        <button
                          type="button"
                          title="Opciones"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuCajaAbierto({ tipo: 'bloque', id: bloque.id, nombre: bloque.nombre, color: bloque.colorBloque });
                          }}
                          style={{
                            flexShrink: 0,
                            minWidth: 44,
                            minHeight: 44,
                            padding: '0 12px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderLeft: '1px solid var(--border)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            touchAction: 'manipulation',
                          }}
                        >
                          ⋮
                        </button>
                      </>
                    )}
                  </div>

                  {abierto && esBloque && bloque && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {bloque.capas.map((capa) => {
                        const claveCapa = 'capa:' + bloque.id + ':' + capa.id;
                        const capaAbierta = abiertos.has(claveCapa);
                        return (
                          <div
                            key={capa.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              borderLeft: '2px solid var(--border)',
                              marginLeft: 12,
                              paddingLeft: 8,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'stretch',
                                minHeight: 40,
                                backgroundColor: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                overflow: 'hidden',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => toggle(claveCapa)}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  padding: '8px 10px',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  color: 'var(--text)',
                                  fontFamily: 'inherit',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--accent)',
                                    flexShrink: 0,
                                    width: 12,
                                    textAlign: 'center',
                                  }}
                                >
                                  {capaAbierta ? '▾' : '▸'}
                                </span>
                                <span style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: capa.colorCapa || 'transparent', border: capa.colorCapa ? 'none' : '1px dashed var(--text-dim)', flexShrink: 0 }} />
                                <span
                                  style={{
                                    fontSize: '0.84rem',
                                    fontWeight: 600,
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {capa.nombre}
                                </span>
                              </button>

                              <button
                                type="button"
                                title={capa.visible ? 'Ocultar capa' : 'Mostrar capa'}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alternarVisibleCapa(bloque, capa);
                                }}
                                style={{
                                  flexShrink: 0,
                                  minWidth: 38,
                                  minHeight: 38,
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  borderLeft: '1px solid var(--border)',
                                  color: 'var(--text)',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {capa.visible ? '👁' : '🕶'}
                              </button>
                              <button
                                type="button"
                                title="Renombrar capa"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  iniciarRenombrarCapa(bloque, capa);
                                }}
                                style={{
                                  flexShrink: 0,
                                  minWidth: 38,
                                  minHeight: 38,
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  borderLeft: '1px solid var(--border)',
                                  color: 'var(--text-dim)',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                ✎
                              </button>
                            </div>

                            {capaAbierta &&
                              capa.elementos.map((el) => {
                                const listaEl: ElementoLista = {
                                  tipo: 'elemento-capa',
                                  ref: el,
                                  bloqueId: bloque.id,
                                  capaId: capa.id,
                                };
                                const colorEf = colorEfectivoElemento(bloque, capa, el);
                                const visible = el.visible ?? true;
                                const favorito = el.favorito ?? false;
                                return (
                                  <div
                                    key={`${capa.id}-${el.id}`}
                                    className="menu-elemento"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'stretch',
                                      gap: 4,
                                      backgroundColor: 'var(--surface)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 6,
                                      overflow: 'hidden',
                                      marginLeft: 8,
                                      position: 'relative',
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
                                      title="Opciones"
                                      onClick={() => toggleMenu(`${capa.id}-${el.id}`)}
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
                                      ⋮
                                    </button>
                                    <button
                                      type="button"
                                      title="Navegar"
                                      onClick={() => {
                                        if (el.tipo === 'punto') {
                                          onNavegar({
                                            tipo: 'punto-capa',
                                            bloqueId: bloque.id,
                                            capaId: capa.id,
                                            elementoId: el.id,
                                          });
                                        } else if (el.tipo === 'linea') {
                                          onNavegar({
                                            tipo: 'linea',
                                            bloqueId: bloque.id,
                                            capaId: capa.id,
                                            elementoId: el.id,
                                          });
                                        } else {
                                          onNavegar({
                                            tipo: 'poligono',
                                            bloqueId: bloque.id,
                                            capaId: capa.id,
                                            elementoId: el.id,
                                          });
                                        }
                                      }}
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
                                    {menuAbiertoId === `${capa.id}-${el.id}` && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: '100%',
                                          right: 0,
                                          zIndex: 100,
                                          backgroundColor: 'var(--surface)',
                                          border: '1px solid var(--border)',
                                          borderRadius: 8,
                                          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          minWidth: 180,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setColorElementoObj({ bloque, capa, elemento: el });
                                            setMenuAbiertoId(null);
                                          }}
                                          style={{
                                            padding: '10px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderBottom: '1px solid var(--border)',
                                            color: 'var(--text)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                          }}
                                        >
                                          🎨 Color
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            alternarVisible(listaEl);
                                            setMenuAbiertoId(null);
                                          }}
                                          style={{
                                            padding: '10px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderBottom: '1px solid var(--border)',
                                            color: 'var(--text)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                          }}
                                        >
                                          {visible ? '🕶 Ocultar' : '👁 Mostrar'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            alternarFavorito(listaEl);
                                            setMenuAbiertoId(null);
                                          }}
                                          style={{
                                            padding: '10px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderBottom: '1px solid var(--border)',
                                            color: favorito ? '#FFD400' : 'var(--text)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                          }}
                                        >
                                          {favorito ? '★ Quitar favorito' : '☆ Añadir favorito'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            void exportarElementoCapa(bloque.id, capa.id, el.id);
                                            setMenuAbiertoId(null);
                                          }}
                                          style={{
                                            padding: '10px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: 'var(--text)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                          }}
                                        >
                                          📤 Exportar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {abierto && !esBloque && caja.elementos.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        fontSize: '0.85rem',
                        padding: '20px 0',
                        fontStyle: 'italic',
                      }}
                    >
                      Caja vacía.
                    </div>
                  )}

                  {abierto && !esBloque && caja.elementos.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {caja.elementos.map((el, idx) => {
                        const nombre = nombreElemento(el);
                        const visible = visibleElemento(el);
                        const favorito = favoritoElemento(el);
                        const color = colorElementoLista(el);
                        const key = `${el.tipo}-${(el.ref as { id: string }).id}-${idx}`;
                        return (
                          <div
                            key={key}
                            className="menu-elemento"
                            style={{
                              display: 'flex',
                              alignItems: 'stretch',
                              gap: 6,
                              backgroundColor: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                                padding: '10px 12px',
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
                                  backgroundColor: color,
                                  boxShadow: `0 0 6px ${color}`,
                                  flexShrink: 0,
                                }}
                              />
                              {iconoTipo(el.tipo) && <span style={{ fontSize: '0.95rem' }}>{iconoTipo(el.tipo)}</span>}
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
                            </div>

                            <button
                              type="button"
                              title="Opciones"
                              onClick={() => toggleMenu(key)}
                              style={{
                                padding: '0 12px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderLeft: '1px solid var(--border)',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                              }}
                            >
                              ⋮
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

                            {menuAbiertoId === key && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  zIndex: 100,
                                  backgroundColor: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 8,
                                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  minWidth: 180,
                                }}
                              >
                                {el.tipo === 'waypoint' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      iniciarRenombrarWaypoint(el.ref);
                                      setMenuAbiertoId(null);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid var(--border)',
                                      color: 'var(--text)',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    ✎ Renombrar
                                  </button>
                                )}
                                {el.tipo === 'waypoint' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void moverWaypointACarpeta(el.ref.id, caja.id === WKF_WAYPOINTS_ID ? WKF_RUTAS_ID : caja.id);
                                      setMenuAbiertoId(null);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid var(--border)',
                                      color: 'var(--text)',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    ➡ Mover a...
                                  </button>
                                )}
                                {el.tipo === 'waypoint' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void duplicarWaypoint(el.ref.id);
                                      setMenuAbiertoId(null);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid var(--border)',
                                      color: 'var(--text)',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    ⧉ Duplicar
                                  </button>
                                )}
                                {el.tipo === 'waypoint' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void exportarWaypoint(el.ref.id);
                                      setMenuAbiertoId(null);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid var(--border)',
                                      color: 'var(--text)',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    📤 Exportar
                                  </button>
                                )}
                                {el.tipo === 'ruta' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void exportarRuta(el.ref.id);
                                      setMenuAbiertoId(null);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid var(--border)',
                                      color: 'var(--text)',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    📤 Exportar
                                  </button>
                                )}
                                {el.tipo === 'track' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void exportarTrack(el.ref.id);
                                      setMenuAbiertoId(null);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid var(--border)',
                                      color: 'var(--text)',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    📤 Exportar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    alternarVisible(el);
                                    setMenuAbiertoId(null);
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {visible ? '🕶 Ocultar' : '👁 Mostrar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    alternarFavorito(el);
                                    setMenuAbiertoId(null);
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: favorito ? '#FFD400' : 'var(--text)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {favorito ? '★ Quitar favorito' : '☆ Añadir favorito'}
                                </button>
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
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Coordenadas
            </label>
            <input
              type="text"
              placeholder="Ej: 39.5, -0.5"
              value={coordsWaypointNueva}
              onChange={(e) => setCoordsWaypointNueva(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Carpeta / Caja
            </label>
            <select
              value={
                cajaWaypointId && carpetas.some((c) => c.id === cajaWaypointId)
                  ? cajaWaypointId
                  : WKF_WAYPOINTS_ID
              }
              onChange={(e) => setCajaWaypointId(e.target.value)}
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
            >
              <option value={WKF_WAYPOINTS_ID}>WKF Waypoints</option>
              {carpetas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
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

      {creandoRuta && (
        <div
          onClick={() => setCreandoRuta(false)}
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
              〰 Nueva ruta
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.45 }}>
              Selecciona al menos 2 waypoints (en orden) para crear la ruta.
            </p>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Nombre
            </label>
            <input
              type="text"
              value={nombreRutaNueva}
              onChange={(e) => setNombreRutaNueva(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Waypoints ({seleccionRuta.size} seleccionados)
            </label>
            <div
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 6,
                backgroundColor: 'var(--bg)',
                marginBottom: 16,
              }}
            >
              {waypoints.map((w) => (
                <label
                  key={w.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={seleccionRuta.has(w.id)}
                    onChange={() => toggleSeleccionRuta(w.id)}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{w.nombre}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setCreandoRuta(false)}
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
                onClick={() => void confirmarCrearRuta()}
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

      {menuCajaAbierto && (
        <div
          onClick={() => setMenuCajaAbierto(null)}
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
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              {menuCajaAbierto.nombre}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  if (menuCajaAbierto.tipo === 'caja') {
                    const c = carpetas.find((x) => x.id === menuCajaAbierto.id);
                    if (c) iniciarRenombrar(c);
                  } else {
                    const b = bloquesCapas.find((x) => x.id === menuCajaAbierto.id);
                    if (b) iniciarRenombrarBloque(b);
                  }
                  setMenuCajaAbierto(null);
                }}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                ✎ Renombrar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (menuCajaAbierto.tipo === 'caja') {
                    const c = carpetas.find((x) => x.id === menuCajaAbierto.id);
                    if (c) setColorCarpeta(c);
                  } else {
                    const b = bloquesCapas.find((x) => x.id === menuCajaAbierto.id);
                    if (b) setColorBloque(b);
                  }
                  setMenuCajaAbierto(null);
                }}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                🎨 Cambiar color
              </button>
              <button
                type="button"
                onClick={() => {
                  if (menuCajaAbierto.tipo === 'caja') {
                    const c = carpetas.find((x) => x.id === menuCajaAbierto.id);
                    if (c) setConfirmandoBorrado(c);
                  } else {
                    void borrarCajaBloque(menuCajaAbierto.id);
                  }
                  setMenuCajaAbierto(null);
                }}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--verdict-desaconsejado)', backgroundColor: 'rgba(255,45,85,0.1)', color: 'var(--verdict-desaconsejado)', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
              >
                🗑 Borrar
              </button>
              <button
                type="button"
                onClick={() => setMenuCajaAbierto(null)}
                style={{ padding: '12px 14px', borderRadius: 8, border: 'none', backgroundColor: 'var(--border)', color: 'var(--text)', textAlign: 'center', cursor: 'pointer', fontSize: '0.9rem', marginTop: 4 }}
              >
                Cancelar
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