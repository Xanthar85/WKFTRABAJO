// src/screens/Navegacion/ArchivosScreen.tsx
// WKF1.067:
//   · ▲▼ activos también con capa, elemento-capa y elemento (waypoint,
//     ruta, track) seleccionados. Mueven dentro de su contenedor.
//   · Orden visual por `orden` (con fallback a creadoEn / importadoEn).
//   · Bloques y capas ordenados por `orden`.
// WKF1.083: habilitado 🎨 para rutas y tracks.
//   · Puede cambiar el color de una ruta o track desde la paleta.
//   · Si eligen "Heredar / sin color", el elemento vuelve al color
//     por defecto del render (#00B8FF para ambos).

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
import { useAppStore } from '../../state/store.ts';
import { type Zona, type TipoAcceso, TIPOS_ACCESO } from '../../lib/verdict.ts';
import { stringsEs } from '../../i18n/strings.es.ts';
import { detectarZona } from '../../lib/zonas-geo.ts';
import { importarArchivo } from '../../lib/navegacion/importar.ts';
import { PALETA_WKF } from '../../lib/colores-wkf.ts';
import type { Carpeta } from '../../db/carpetas-repo.ts';
import type { Waypoint } from '../../db/waypoints-repo.ts';
import type { Ruta } from '../../db/rutas-repo.ts';
import type { Track } from '../../db/tracks-repo.ts';
import type { BloqueCapas, Capa, ElementoCapa } from '../../db/capas-repo.ts';
import type { DestinoNavegacion } from './NavegarScreen.tsx';

const ETIQUETAS_ACCESO: Record<TipoAcceso, string> = {
  playa_arena: 'Playa de arena',
  playa_piedras: 'Playa de piedras / bolos',
  roca: 'Roca plana',
  roquedo_vertical: 'Roquedo / acantilado',
  puerto_escollera: 'Escollera / espigón',
  rampa_hormigon: 'Rampa de hormigón',
  puerto_protegido: 'Puerto protegido',
  desde_embarcacion: 'Desde embarcación',
  otro: 'Otro',
};

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generarGpxWaypoint(wp: Waypoint): string {
  const nombre = escaparXml(wp.nombre || 'Waypoint');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="${wp.lat}" lon="${wp.lon}">
    <name>${nombre}</name>
  </wpt>
</gpx>`;
}

async function compartirOdescargarGpx(nombre: string, contenidoGpx: string) {
  const nombreArchivo = `${(nombre || 'waypoint').replace(/[/\\?%*:|"<>]/g, '_').trim() || 'waypoint'}.gpx`;
  const blob = new Blob([contenidoGpx], { type: 'application/gpx+xml;charset=utf-8' });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], nombreArchivo, { type: 'application/gpx+xml' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: nombre,
        });
        return;
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ArchivosScreenProps {
  onNavegar: (destino: DestinoNavegacion) => void;
  onVerTrackEnMapa?: (id: string) => void;
}

type TipoElementoLista = 'waypoint' | 'ruta' | 'track' | 'elemento-capa';

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

type Seleccion =
  | { tipo: 'ninguna' }
  | { tipo: 'carpeta'; id: string; esSistema: boolean }
  | { tipo: 'bloque'; id: string }
  | { tipo: 'capa'; bloqueId: string; capaId: string }
  | { tipo: 'elemento'; elemento: ElementoLista };

interface CajaVista {
  id: string;
  nombre: string;
  color?: string;
  esSistema: boolean;
  esBloque: boolean;
  elementos: ElementoLista[];
}

const COLOR_DEFECTO = '#00E56A';
const COLOR_DEFECTO_RUTA = '#00B8FF';

// Devuelve el id de la caja en la que vive un elemento
// waypoint/ruta/track. Para WKF Waypoints devuelve el id de
// sistema; para rutas y tracks sin carpetaId devuelve WKF Rutas;
// para el resto devuelve su carpetaId si existe.
function cajaDeElemento(el: ElementoLista): string | null {
  if (el.tipo === 'waypoint') {
    return el.ref.carpetaId ?? WKF_WAYPOINTS_ID;
  }
  if (el.tipo === 'ruta') {
    return el.ref.carpetaId ?? WKF_RUTAS_ID;
  }
  if (el.tipo === 'track') {
    return el.ref.carpetaId ?? WKF_RUTAS_ID;
  }
  return null;
}

function etiquetaTipo(tipo: TipoElementoLista): string {
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

function iconoTipo(tipo: TipoElementoLista): string | null {
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

// Orden visual de elementos dentro de una caja: mezcla waypoints, rutas
// y tracks. Usa `orden` cuando existe; si no, cae a creadoEn.
function claveOrdenElemento(
  el: ElementoLista,
  base: number,
  contador: number
): number {
  if (el.tipo === 'elemento-capa') {
    if (typeof el.ref.orden === 'number') return el.ref.orden;
    return base + contador;
  }
  if (typeof el.ref.orden === 'number') return el.ref.orden;
  const creadoEn = (el.ref as { creadoEn?: number }).creadoEn ?? base;
  return creadoEn + contador;
}

interface ModalWkfProps {
  titulo: string;
  colorBorde?: string;
  children: React.ReactNode;
  onCerrar: () => void;
}

const ModalWkf: React.FC<ModalWkfProps> = ({
  titulo,
  colorBorde,
  children,
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
        border: `1px solid ${colorBorde ?? 'var(--border)'}`,
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
          color: colorBorde ?? 'var(--text)',
        }}
      >
        {titulo}
      </h3>
      {children}
    </div>
  </div>
);

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
  <ModalWkf titulo={titulo} onCerrar={onCerrar}>
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
  </ModalWkf>
);

export const ArchivosScreen: React.FC<ArchivosScreenProps> = ({
  onNavegar,
  onVerTrackEnMapa,
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
  const borrarCajaConContenido = useNavegacionStore((s) => s.borrarCajaConContenido);
  const contarContenidoCaja = useNavegacionStore((s) => s.contarContenidoCaja);
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
  const actualizarRuta = useNavegacionStore((s) => s.actualizarRuta);
  const actualizarTrack = useNavegacionStore((s) => s.actualizarTrack);
  const renombrarBloque = useNavegacionStore((s) => s.renombrarBloque);
  const renombrarCapa = useNavegacionStore((s) => s.renombrarCapa);
  const renombrarElementoCapa = useNavegacionStore((s) => s.renombrarElementoCapa);
  const cambiarColorBloque = useNavegacionStore((s) => s.cambiarColorBloque);
  const cambiarColorCapa = useNavegacionStore((s) => s.cambiarColorCapa);
  const cambiarColorElemento = useNavegacionStore((s) => s.cambiarColorElemento);
  const cambiarColorRuta = useNavegacionStore((s) => s.cambiarColorRuta);
  const cambiarColorTrack = useNavegacionStore((s) => s.cambiarColorTrack);

  const duplicarRuta = useNavegacionStore((s) => s.duplicarRuta);
  const duplicarTrack = useNavegacionStore((s) => s.duplicarTrack);
  const duplicarElementoCapa = useNavegacionStore((s) => s.duplicarElementoCapa);

  const exportarWaypoint = useNavegacionStore((s) => s.exportarWaypoint);
  const exportarRuta = useNavegacionStore((s) => s.exportarRuta);
  const exportarTrack = useNavegacionStore((s) => s.exportarTrack);
  const exportarElementoCapa = useNavegacionStore((s) => s.exportarElementoCapa);
  const exportarCapa = useNavegacionStore((s) => s.exportarCapa);
  const exportarCaja = useNavegacionStore((s) => s.exportarCaja);

  const moverArriba = useNavegacionStore((s) => s.moverArriba);
  const moverAbajo = useNavegacionStore((s) => s.moverAbajo);
  const moverElementoACaja = useNavegacionStore((s) => s.moverElementoACaja);
  const moverElementoCapa = useNavegacionStore((s) => s.moverElementoCapa);

  const borrarWaypoint = useNavegacionStore((s) => s.borrarWaypoint);
  const borrarRuta = useNavegacionStore((s) => s.borrarRuta);
  const borrarTrack = useNavegacionStore((s) => s.borrarTrack);
  const borrarElementoCapa = useNavegacionStore((s) => s.borrarElementoCapa);
  const borrarCapaSuelta = useNavegacionStore((s) => s.borrarCapaSuelta);

  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [seleccion, setSeleccion] = useState<Seleccion>({ tipo: 'ninguna' });
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set<string>());

  const [creandoCaja, setCreandoCaja] = useState(false);
  const [nombreCajaNueva, setNombreCajaNueva] = useState('');
  const [creandoWaypoint, setCreandoWaypoint] = useState(false);
  const [cajaWaypointId, setCajaWaypointId] = useState<string | null>(null);
  const [nombreWaypointNuevo, setNombreWaypointNuevo] = useState('');
  const [coordsWaypointNueva, setCoordsWaypointNueva] = useState('39.5, -0.5');

  const [renombrandoCarpeta, setRenombrandoCarpeta] = useState<Carpeta | null>(null);
  const [nombreCarpetaEdit, setNombreCarpetaEdit] = useState('');
  const [renombrandoBloque, setRenombrandoBloque] = useState<BloqueCapas | null>(null);
  const [nombreBloqueEdit, setNombreBloqueEdit] = useState('');
  const [renombrandoCapa, setRenombrandoCapa] = useState<{ bloque: BloqueCapas; capa: Capa } | null>(null);
  const [nombreCapaEdit, setNombreCapaEdit] = useState('');
  const [renombrandoElemento, setRenombrandoElemento] = useState<ElementoLista | null>(null);
  const [nombreElementoEdit, setNombreElementoEdit] = useState('');

  const [colorCarpeta, setColorCarpeta] = useState<Carpeta | null>(null);
  const [colorBloque, setColorBloque] = useState<BloqueCapas | null>(null);
  const [colorCapaObj, setColorCapaObj] = useState<{ bloque: BloqueCapas; capa: Capa } | null>(null);
  const [colorElementoObj, setColorElementoObj] = useState<{
    bloque: BloqueCapas;
    capa: Capa;
    elemento: ElementoCapa;
  } | null>(null);
  const [colorRutaObj, setColorRutaObj] = useState<Ruta | null>(null);
  const [colorTrackObj, setColorTrackObj] = useState<Track | null>(null);

  const [moviendo, setMoviendo] = useState<ElementoLista | null>(null);
  const [duplicando, setDuplicando] = useState<ElementoLista | null>(null);
  const [moviendoCapa, setMoviendoCapa] = useState<ElementoLista | null>(null);

  const [borradoCaja, setBorradoCaja] = useState<Carpeta | null>(null);
  const [borradoBloque, setBorradoBloque] = useState<BloqueCapas | null>(null);
  const [borradoCapa, setBorradoCapa] = useState<{
    bloque: BloqueCapas;
    capa: Capa;
  } | null>(null);

  const convertirWaypointEnSpot = useAppStore((s) => s.convertirWaypointEnSpot);

  const [convertirSpotWp, setConvertirSpotWp] = useState<Waypoint | null>(null);
  const [nombreSpotEdit, setNombreSpotEdit] = useState('');
  const [zonaSpotEdit, setZonaSpotEdit] = useState<Zona>('mediterraneo_espanol');
  const [tipoAccesoSpotEdit, setTipoAccesoSpotEdit] = useState<TipoAcceso | ''>('playa_arena');
  const [menuExportShareWp, setMenuExportShareWp] =
    useState<Waypoint | null>(null);

  const compartirWaypointGpx = async (wp: Waypoint) => {
    try {
      const gpx = generarGpxWaypoint(wp);
      await compartirOdescargarGpx(wp.nombre, gpx);
    } catch (err) {
      console.error(err);
      mostrarAviso('Error al compartir GPX.');
    }
  };

  const mostrarAviso = (msg: string) => {
    setAviso(msg);
    window.setTimeout(() => setAviso(null), 2200);
  };

  // ─── Árbol ────────────────────────────────────────────────────────────
  const cajas: CajaVista[] = useMemo(() => {
    const idsCarpetasSistema = new Set([
      WKF_WAYPOINTS_ID,
      WKF_RUTAS_ID,
      WKF_FAV_ID,
    ]);
    const lista: CajaVista[] = [];
    const base = Date.now();
    let contador = 0;

    const ordenarElementos = (els: ElementoLista[]): ElementoLista[] => {
      const copia = els.slice();
      const mapa = new Map<ElementoLista, number>();
      for (const el of copia) {
        mapa.set(el, claveOrdenElemento(el, base, contador++));
      }
      copia.sort((a, b) => (mapa.get(a) ?? 0) - (mapa.get(b) ?? 0));
      return copia;
    };

    const cajaWp: CajaVista = {
      id: WKF_WAYPOINTS_ID,
      nombre:
        CAJAS_SISTEMA.find((c) => c.id === WKF_WAYPOINTS_ID)?.nombre ??
        'WKF Waypoints',
      color: CAJAS_SISTEMA.find((c) => c.id === WKF_WAYPOINTS_ID)?.color,
      esSistema: true,
      esBloque: false,
      elementos: ordenarElementos(
        waypoints
          .filter(
            (w) =>
              !w.carpetaId ||
              w.carpetaId === WKF_WAYPOINTS_ID ||
              (!idsCarpetasSistema.has(w.carpetaId) &&
                !carpetas.some((c) => c.id === w.carpetaId))
          )
          .map<ElementoLista>((w) => ({ tipo: 'waypoint', ref: w }))
      ),
    };
    lista.push(cajaWp);

    const rutasYtracks = ordenarElementos([
      ...rutas
        .filter((r) => !r.carpetaId)
        .map<ElementoLista>((r) => ({ tipo: 'ruta', ref: r })),
      ...tracks
        .filter((tr) => !tr.carpetaId)
        .map<ElementoLista>((tr) => ({ tipo: 'track', ref: tr })),
    ]);

    lista.push({
      id: WKF_RUTAS_ID,
      nombre:
        CAJAS_SISTEMA.find((c) => c.id === WKF_RUTAS_ID)?.nombre ??
        'WKF Rutas',
      color: CAJAS_SISTEMA.find((c) => c.id === WKF_RUTAS_ID)?.color,
      esSistema: true,
      esBloque: false,
      elementos: rutasYtracks,
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
      esBloque: false,
      elementos: ordenarElementos(favElements),
    });

    type Mezcla = { tipo: 'carpeta' | 'bloque'; ordenEfectivo: number; item: Carpeta | BloqueCapas };
    const mezcla: Mezcla[] = [];
    let contadorMezcla = 0;

    for (const c of carpetas) {
      if (esCajaSistema(c.id)) continue;
      mezcla.push({
        tipo: 'carpeta',
        ordenEfectivo: c.orden !== undefined ? c.orden : (c.creadoEn || base) + contadorMezcla++,
        item: c,
      });
    }
    for (const b of bloquesCapas) {
      mezcla.push({
        tipo: 'bloque',
        ordenEfectivo: b.orden !== undefined ? b.orden : (b.importadoEn || base) + contadorMezcla++,
        item: b,
      });
    }
    mezcla.sort((a, b) => a.ordenEfectivo - b.ordenEfectivo);

    for (const m of mezcla) {
      if (m.tipo === 'carpeta') {
        const c = m.item as Carpeta;
        const elementos: ElementoLista[] = [];
        for (const w of waypoints) {
          if (w.carpetaId === c.id) {
            elementos.push({ tipo: 'waypoint', ref: w });
          }
        }
        for (const r of rutas) {
          if (r.carpetaId === c.id) {
            elementos.push({ tipo: 'ruta', ref: r });
          }
        }
        for (const tk of tracks) {
          if (tk.carpetaId === c.id) {
            elementos.push({ tipo: 'track', ref: tk });
          }
        }
        lista.push({
          id: c.id,
          nombre: c.nombre,
          color: c.color,
          esSistema: false,
          esBloque: false,
          elementos: ordenarElementos(elementos),
        });
      } else {
        const b = m.item as BloqueCapas;
        const elementos: ElementoLista[] = [];
        for (const cp of b.capas) {
          for (const el of cp.elementos) {
            elementos.push({
              tipo: 'elemento-capa',
              ref: el,
              bloqueId: b.id,
              capaId: cp.id,
            });
          }
        }
        lista.push({
          id: b.id,
          nombre: b.nombre,
          color: b.colorBloque,
          esSistema: false,
          esBloque: true,
          elementos: ordenarElementos(elementos),
        });
      }
    }

    return lista;
  }, [waypoints, rutas, tracks, bloquesCapas, carpetas]);

  // ─── Visibilidad en cascada ───────────────────────────────────────────
  const visibilidadCaja = (caja: CajaVista): 'todas' | 'ninguna' | 'mixta' => {
    if (caja.esBloque) {
      const bloque = bloquesCapas.find((b) => b.id === caja.id);
      if (!bloque || bloque.capas.length === 0) return 'ninguna';
      const visibles = bloque.capas.filter((c) => c.visible).length;
      if (visibles === 0) return 'ninguna';
      if (visibles === bloque.capas.length) return 'todas';
      return 'mixta';
    }
    if (caja.elementos.length === 0) return 'ninguna';
    let visibles = 0;
    for (const el of caja.elementos) {
      if (visibleElemento(el)) visibles++;
    }
    if (visibles === 0) return 'ninguna';
    if (visibles === caja.elementos.length) return 'todas';
    return 'mixta';
  };

  const alternarVisibilidadCaja = (caja: CajaVista) => {
    if (caja.esBloque) {
      const bloque = bloquesCapas.find((b) => b.id === caja.id);
      if (!bloque) return;
      const estado = visibilidadCaja(caja);
      const objetivo = estado !== 'todas';
      void alternarVisibilidadBloque(bloque.id, objetivo);
      return;
    }
    const estado = visibilidadCaja(caja);
    const objetivo = estado !== 'todas';
    for (const el of caja.elementos) {
      const vis = visibleElemento(el);
      if (objetivo && !vis) alternarVisible(el);
      if (!objetivo && vis) alternarVisible(el);
    }
  };

  const visibilidadCapa = (bloque: BloqueCapas, capa: Capa): boolean =>
    capa.visible;

  // ─── Helpers elementos ───────────────────────────────────────────────
  const visibleElemento = (el: ElementoLista): boolean => {
    if (el.tipo === 'elemento-capa') return el.ref.visible ?? true;
    return (el.ref as { visible?: boolean }).visible ?? true;
  };

  const favoritoElemento = (el: ElementoLista): boolean => {
    if (el.tipo === 'elemento-capa') return el.ref.favorito ?? false;
    return (el.ref as { favorito?: boolean }).favorito ?? false;
  };

  const nombreElemento = (el: ElementoLista): string => {
    if (el.tipo === 'waypoint') return el.ref.nombre;
    if (el.tipo === 'ruta') return el.ref.nombre;
    if (el.tipo === 'track') return el.ref.nombre;
    return el.ref.nombre?.trim() || 'Elemento';
  };

  const colorElementoLista = (el: ElementoLista): string => {
    if (el.tipo === 'waypoint') {
      return el.ref.color || COLOR_DEFECTO;
    }
    if (el.tipo === 'ruta') {
      return el.ref.color || COLOR_DEFECTO_RUTA;
    }
    if (el.tipo === 'track') {
      return el.ref.color || COLOR_DEFECTO_RUTA;
    }
    if (el.tipo === 'elemento-capa') {
      const bloque = bloquesCapas.find((b) => b.id === el.bloqueId);
      const capa = bloque?.capas.find((c) => c.id === el.capaId);
      if (bloque && capa) return colorEfectivoElemento(bloque, capa, el.ref);
    }
    return COLOR_DEFECTO;
  };

  const navegarA = (el: ElementoLista) => {
    if (el.tipo === 'waypoint') {
      onNavegar({ tipo: 'waypoint', id: el.ref.id });
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

  // ─── Selección ────────────────────────────────────────────────────────
  const seleccionarCaja = (caja: CajaVista) => {
    const claveAbierto = caja.esBloque ? `bloque:${caja.id}` : `caja:${caja.id}`;

    const yaSel = caja.esBloque
      ? seleccion.tipo === 'bloque' && seleccion.id === caja.id
      : seleccion.tipo === 'carpeta' && seleccion.id === caja.id;

    if (yaSel) {
      setSeleccion({ tipo: 'ninguna' });
      setAbiertos((prev) => {
        const s = new Set(prev);
        s.delete(claveAbierto);
        return s;
      });
      return;
    }

    if (caja.esBloque) {
      setSeleccion({ tipo: 'bloque', id: caja.id });
    } else {
      setSeleccion({
        tipo: 'carpeta',
        id: caja.id,
        esSistema: caja.esSistema,
      });
    }

    setAbiertos((prev) => {
      if (prev.has(claveAbierto)) return prev;
      const s = new Set(prev);
      s.add(claveAbierto);
      return s;
    });
  };

  const seleccionarElemento = (el: ElementoLista) => {
    if (
      seleccion.tipo === 'elemento' &&
      (seleccion.elemento.ref as { id: string }).id ===
        (el.ref as { id: string }).id &&
      seleccion.elemento.tipo === el.tipo
    ) {
      setSeleccion({ tipo: 'ninguna' });
    } else {
      setSeleccion({ tipo: 'elemento', elemento: el });
    }
  };

  const seleccionarCapa = (bloqueId: string, capaId: string) => {
    const claveCapa = `capa:${bloqueId}:${capaId}`;

    const yaSel =
      seleccion.tipo === 'capa' &&
      seleccion.bloqueId === bloqueId &&
      seleccion.capaId === capaId;

    if (yaSel) {
      setSeleccion({ tipo: 'ninguna' });
      setAbiertos((prev) => {
        const s = new Set(prev);
        s.delete(claveCapa);
        return s;
      });
      return;
    }

    setSeleccion({ tipo: 'capa', bloqueId, capaId });

    setAbiertos((prev) => {
      if (prev.has(claveCapa)) return prev;
      const s = new Set(prev);
      s.add(claveCapa);
      return s;
    });
  };

  const esSeleccionCaja = (caja: CajaVista): boolean => {
    if (caja.esBloque) {
      return seleccion.tipo === 'bloque' && seleccion.id === caja.id;
    }
    return seleccion.tipo === 'carpeta' && seleccion.id === caja.id;
  };

  const esSeleccionElemento = (el: ElementoLista): boolean => {
    if (seleccion.tipo !== 'elemento') return false;
    if (seleccion.elemento.tipo !== el.tipo) return false;
    return (
      (seleccion.elemento.ref as { id: string }).id ===
      (el.ref as { id: string }).id
    );
  };

  // ─── Handlers de acciones del encabezado ────────────────────────────
  const accionRenombrar = () => {
    if (seleccion.tipo === 'carpeta' && !seleccion.esSistema) {
      const c = carpetas.find((x) => x.id === seleccion.id);
      if (c) {
        setRenombrandoCarpeta(c);
        setNombreCarpetaEdit(c.nombre);
      }
    } else if (seleccion.tipo === 'bloque') {
      const b = bloquesCapas.find((x) => x.id === seleccion.id);
      if (b) {
        setRenombrandoBloque(b);
        setNombreBloqueEdit(b.nombre);
      }
    } else if (seleccion.tipo === 'capa') {
      const b = bloquesCapas.find((x) => x.id === seleccion.bloqueId);
      const c = b?.capas.find((cp) => cp.id === seleccion.capaId);
      if (b && c) {
        setRenombrandoCapa({ bloque: b, capa: c });
        setNombreCapaEdit(c.nombre);
      }
    } else if (seleccion.tipo === 'elemento') {
      setRenombrandoElemento(seleccion.elemento);
      setNombreElementoEdit(nombreElemento(seleccion.elemento));
    }
  };

  const accionColor = () => {
    if (seleccion.tipo === 'carpeta' && !seleccion.esSistema) {
      const c = carpetas.find((x) => x.id === seleccion.id);
      if (c) setColorCarpeta(c);
    } else if (seleccion.tipo === 'bloque') {
      const b = bloquesCapas.find((x) => x.id === seleccion.id);
      if (b) setColorBloque(b);
    } else if (seleccion.tipo === 'capa') {
      const b = bloquesCapas.find((x) => x.id === seleccion.bloqueId);
      const c = b?.capas.find((cp) => cp.id === seleccion.capaId);
      if (b && c) setColorCapaObj({ bloque: b, capa: c });
    } else if (seleccion.tipo === 'elemento') {
      const el = seleccion.elemento;
      if (el.tipo === 'elemento-capa') {
        const b = bloquesCapas.find((x) => x.id === el.bloqueId);
        const c = b?.capas.find((cp) => cp.id === el.capaId);
        if (b && c) setColorElementoObj({ bloque: b, capa: c, elemento: el.ref });
      } else if (el.tipo === 'waypoint') {
        return;
      } else if (el.tipo === 'ruta') {
        setColorRutaObj(el.ref);
      } else if (el.tipo === 'track') {
        setColorTrackObj(el.ref);
      }
    }
  };

  const accionSubir = () => {
    if (seleccion.tipo === 'carpeta' && !seleccion.esSistema) {
      void moverArriba('carpeta', seleccion.id);
    } else if (seleccion.tipo === 'bloque') {
      void moverArriba('bloque', seleccion.id);
    } else if (seleccion.tipo === 'capa') {
      void moverArriba('capa', seleccion.capaId, {
        bloqueId: seleccion.bloqueId,
        capaId: seleccion.capaId,
      });
    } else if (seleccion.tipo === 'elemento') {
      const el = seleccion.elemento;
      if (el.tipo === 'elemento-capa') {
        void moverArriba('elemento-capa', el.ref.id, {
          bloqueId: el.bloqueId,
          capaId: el.capaId,
        });
      } else {
        const cajaId = cajaDeElemento(el);
        if (cajaId) {
          void moverArriba('elemento', (el.ref as { id: string }).id, {
            cajaId,
          });
        }
      }
    }
  };

  const accionBajar = () => {
    if (seleccion.tipo === 'carpeta' && !seleccion.esSistema) {
      void moverAbajo('carpeta', seleccion.id);
    } else if (seleccion.tipo === 'bloque') {
      void moverAbajo('bloque', seleccion.id);
    } else if (seleccion.tipo === 'capa') {
      void moverAbajo('capa', seleccion.capaId, {
        bloqueId: seleccion.bloqueId,
        capaId: seleccion.capaId,
      });
    } else if (seleccion.tipo === 'elemento') {
      const el = seleccion.elemento;
      if (el.tipo === 'elemento-capa') {
        void moverAbajo('elemento-capa', el.ref.id, {
          bloqueId: el.bloqueId,
          capaId: el.capaId,
        });
      } else {
        const cajaId = cajaDeElemento(el);
        if (cajaId) {
          void moverAbajo('elemento', (el.ref as { id: string }).id, {
            cajaId,
          });
        }
      }
    }
  };

  const accionMover = () => {
    if (seleccion.tipo !== 'elemento') return;
    const el = seleccion.elemento;
    if (el.tipo === 'elemento-capa') {
      setMoviendoCapa(el);
    } else {
      setMoviendo(el);
    }
  };

  const accionDuplicar = () => {
    if (seleccion.tipo !== 'elemento') return;
    const el = seleccion.elemento;
    if (el.tipo === 'waypoint') {
      setDuplicando(el);
      return;
    }
    else if (el.tipo === 'ruta') void duplicarRuta(el.ref.id);
    else if (el.tipo === 'track') void duplicarTrack(el.ref.id);
    else if (el.tipo === 'elemento-capa') {
      void duplicarElementoCapa(el.bloqueId, el.capaId, el.ref.id);
    }
    mostrarAviso('Duplicado.');
  };

  const accionExportar = () => {
    if (seleccion.tipo === 'carpeta') {
      void exportarCaja('carpeta', seleccion.id);
      return;
    }
    if (seleccion.tipo === 'bloque') {
      void exportarCaja('bloque', seleccion.id);
      return;
    }
    if (seleccion.tipo === 'capa') {
      void exportarCapa(seleccion.bloqueId, seleccion.capaId);
      return;
    }
    if (seleccion.tipo !== 'elemento') return;
    const el = seleccion.elemento;
    if (el.tipo === 'waypoint') void exportarWaypoint(el.ref.id);
    else if (el.tipo === 'ruta') void exportarRuta(el.ref.id);
    else if (el.tipo === 'track') void exportarTrack(el.ref.id);
    else if (el.tipo === 'elemento-capa') {
      void exportarElementoCapa(el.bloqueId, el.capaId, el.ref.id);
    }
  };

  const accionConvertirEnPunto = () => {
    if (seleccion.tipo !== 'elemento') return;

    const el = seleccion.elemento;

    if (el.tipo === 'waypoint') {
      const wp = el.ref as Waypoint;
      const zonaDetectada = detectarZona(wp.lat, wp.lon);
      setConvertirSpotWp(wp);
      setNombreSpotEdit(wp.nombre);
      setZonaSpotEdit(zonaDetectada || 'mediterraneo_espanol');
      setTipoAccesoSpotEdit('playa_arena');
      return;
    }

    if (el.tipo === 'elemento-capa' && el.ref.tipo === 'punto') {
      const coords = el.ref.coords;
      let lat: number | null = null;
      let lon: number | null = null;
      if (Array.isArray(coords)) {
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          lat = coords[0];
          lon = coords[1];
        } else if (
          Array.isArray(coords[0]) &&
          typeof coords[0][0] === 'number' &&
          typeof coords[0][1] === 'number'
        ) {
          lat = coords[0][0];
          lon = coords[0][1];
        }
      }
      if (lat == null || lon == null) return;
      const nombreBase = el.ref.nombre?.trim() || 'Punto';
      const zonaDetectada = detectarZona(lat, lon);
      setConvertirSpotWp({
        id: el.ref.id,
        nombre: nombreBase,
        lat,
        lon,
        creadoEn: 0,
        carpetaId: el.bloqueId,
        visible: el.ref.visible ?? true,
        favorito: el.ref.favorito ?? false,
      });
      setNombreSpotEdit(nombreBase);
      setZonaSpotEdit(zonaDetectada || 'mediterraneo_espanol');
      setTipoAccesoSpotEdit('playa_arena');
      return;
    }
  };

  const confirmarConvertirEnSpot = async () => {
    if (!convertirSpotWp) return;
    const nombre = nombreSpotEdit.trim() || convertirSpotWp.nombre;
    const origenElemento =
      seleccion.tipo === 'elemento' && seleccion.elemento.tipo === 'elemento-capa'
        ? { bloqueId: seleccion.elemento.bloqueId, capaId: seleccion.elemento.capaId }
        : null;

    const nuevoId = convertirWaypointEnSpot(
      nombre,
      convertirSpotWp.lat,
      convertirSpotWp.lon,
      zonaSpotEdit,
      tipoAccesoSpotEdit ? (tipoAccesoSpotEdit as TipoAcceso) : null
    );

    if (!nuevoId) return;

    if (origenElemento) {
      await borrarElementoCapa(
        origenElemento.bloqueId,
        origenElemento.capaId,
        convertirSpotWp.id
      );
    } else {
      await borrarWaypoint(convertirSpotWp.id);
    }

    setConvertirSpotWp(null);
    setSeleccion({ tipo: 'ninguna' });
    mostrarAviso(`"${nombre}" convertido en Punto.`);
  };

  const accionBorrar = () => {
    if (seleccion.tipo === 'carpeta' && !seleccion.esSistema) {
      const c = carpetas.find((x) => x.id === seleccion.id);
      if (c) setBorradoCaja(c);
    } else if (seleccion.tipo === 'bloque') {
      const b = bloquesCapas.find((x) => x.id === seleccion.id);
      if (b) setBorradoBloque(b);
    } else if (seleccion.tipo === 'capa') {
      const b = bloquesCapas.find((x) => x.id === seleccion.bloqueId);
      const c = b?.capas.find((cp) => cp.id === seleccion.capaId);
      if (b && c) setBorradoCapa({ bloque: b, capa: c });
    } else if (seleccion.tipo === 'elemento') {
      const el = seleccion.elemento;
      if (el.tipo === 'waypoint') void borrarWaypoint(el.ref.id);
      else if (el.tipo === 'ruta') void borrarRuta(el.ref.id);
      else if (el.tipo === 'track') void borrarTrack(el.ref.id);
      else if (el.tipo === 'elemento-capa')
        void borrarElementoCapa(el.bloqueId, el.capaId, el.ref.id);
      setSeleccion({ tipo: 'ninguna' });
    }
  };

  // ─── Habilitación de botones del encabezado ─────────────────────────
  const haySeleccion = seleccion.tipo !== 'ninguna';

  const puedeRenombrar =
    haySeleccion &&
    !(seleccion.tipo === 'carpeta' && seleccion.esSistema);

  const puedeColor =
    !haySeleccion
      ? false
      : seleccion.tipo === 'carpeta'
      ? !seleccion.esSistema
      : seleccion.tipo === 'bloque'
      ? true
      : seleccion.tipo === 'capa'
      ? true
      : seleccion.tipo === 'elemento'
      ? seleccion.elemento.tipo === 'elemento-capa' ||
        seleccion.elemento.tipo === 'waypoint' ||
        seleccion.elemento.tipo === 'ruta' ||
        seleccion.elemento.tipo === 'track'
      : false;

  // ▲▼ activos siempre que haya selección de caja, capa o elemento.
  // En cajas de sistema no se mueve entre hermanas (no aplica).
  const puedeSubir =
    !haySeleccion
      ? false
      : (seleccion.tipo === 'carpeta' && !seleccion.esSistema) ||
        seleccion.tipo === 'bloque' ||
        seleccion.tipo === 'capa' ||
        seleccion.tipo === 'elemento';

  const puedeBajar = puedeSubir;

  const puedeMover = haySeleccion && seleccion.tipo === 'elemento';

  const puedeDuplicar = puedeMover;

  const puedeConvertirEnSpot =
    haySeleccion &&
    seleccion.tipo === 'elemento' &&
    (seleccion.elemento.tipo === 'waypoint' ||
      (seleccion.elemento.tipo === 'elemento-capa' &&
        seleccion.elemento.ref.tipo === 'punto'));

  const puedeExportar =
    haySeleccion &&
    (seleccion.tipo === 'carpeta' ||
      seleccion.tipo === 'bloque' ||
      seleccion.tipo === 'capa' ||
      seleccion.tipo === 'elemento');

  const puedeBorrar =
    !haySeleccion
      ? false
      : (seleccion.tipo === 'carpeta' && !seleccion.esSistema) ||
        seleccion.tipo === 'bloque' ||
        seleccion.tipo === 'capa' ||
        seleccion.tipo === 'elemento';

  const hayFavoritosEnCaja = (caja: CajaVista): number => {
    let n = 0;
    for (const el of caja.elementos) {
      if (favoritoElemento(el)) n++;
    }
    return n;
  };

  // ─── Creación (lógica conservada) ───────────────────────────────────
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

  const confirmarCrearCaja = async () => {
    const limpio = nombreCajaNueva.trim();
    if (!limpio) return;
    await crearCarpeta(limpio);
    setCreandoCaja(false);
    setNombreCajaNueva('');
  };

  const iniciarCrearWaypointGlobal = () => {
    let cajaPrevia: string | null = null;
    if (seleccion.tipo === 'carpeta' && !seleccion.esSistema) {
      cajaPrevia = seleccion.id;
    }
    setCajaWaypointId(cajaPrevia);
    const numero = waypoints.length + 1;
    setNombreWaypointNuevo(`Waypoint ${numero}`);
    setCoordsWaypointNueva('39.5, -0.5');
    setCreandoWaypoint(true);
  };

  const puedeCrearWaypointEnCaja = (cajaId: string | null): boolean => {
    if (!cajaId) return true;
    if (esCajaSistema(cajaId)) return true;
    if (bloquesCapas.some((b) => b.id === cajaId)) return false;
    return true;
  };

  const carpetaDestinoWaypoint = (cajaId: string): string => {
    if (esCajaSistema(cajaId)) return WKF_WAYPOINTS_ID;
    return cajaId;
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


  const confirmarRenombrarCarpeta = async () => {
    if (!renombrandoCarpeta) return;
    const limpio = nombreCarpetaEdit.trim();
    if (!limpio) return;
    await renombrarCarpeta(renombrandoCarpeta.id, limpio);
    setRenombrandoCarpeta(null);
    setNombreCarpetaEdit('');
  };

  const confirmarRenombrarBloque = async () => {
    if (!renombrandoBloque) return;
    const limpio = nombreBloqueEdit.trim();
    if (!limpio) return;
    await renombrarBloque(renombrandoBloque.id, limpio);
    setRenombrandoBloque(null);
    setNombreBloqueEdit('');
  };

  const confirmarRenombrarCapa = async () => {
    if (!renombrandoCapa) return;
    const limpio = nombreCapaEdit.trim();
    if (!limpio) return;
    await renombrarCapa(renombrandoCapa.bloque.id, renombrandoCapa.capa.id, limpio);
    setRenombrandoCapa(null);
    setNombreCapaEdit('');
  };

  const confirmarRenombrarElemento = async () => {
    if (!renombrandoElemento) return;
    const limpio = nombreElementoEdit.trim();
    if (!limpio) return;
    const el = renombrandoElemento;
    if (el.tipo === 'waypoint') {
      await actualizarWaypoint(el.ref.id, { nombre: limpio });
    } else if (el.tipo === 'ruta') {
      await actualizarRuta(el.ref.id, { nombre: limpio });
    } else if (el.tipo === 'track') {
      await actualizarTrack(el.ref.id, { nombre: limpio });
    } else if (el.tipo === 'elemento-capa') {
      await renombrarElementoCapa(el.bloqueId, el.capaId, el.ref.id, limpio);
    }
    setRenombrandoElemento(null);
    setNombreElementoEdit('');
  };

  const confirmarMoverElemento = async (carpetaDestinoId: string) => {
    if (!moviendo) return;
    if (moviendo.tipo === 'waypoint') {
      await moverElementoACaja('waypoint', moviendo.ref.id, carpetaDestinoId);
    } else if (moviendo.tipo === 'ruta') {
      await moverElementoACaja('ruta', moviendo.ref.id, carpetaDestinoId);
    } else if (moviendo.tipo === 'track') {
      await moverElementoACaja('track', moviendo.ref.id, carpetaDestinoId);
    }
    setMoviendo(null);
    mostrarAviso('Movido.');
  };

  const confirmarDuplicarWaypoint = async (carpetaDestinoId: string) => {
    if (!duplicando || duplicando.tipo !== 'waypoint') return;
    const wp = duplicando.ref as Waypoint;
    const nuevo = await crearWaypoint({
      nombre: `${wp.nombre} (copia)`,
      lat: wp.lat,
      lon: wp.lon,
      nota: wp.nota,
      carpetaId: carpetaDestinoId,
      color: wp.color,
    });
    setDuplicando(null);
    setSeleccion({ tipo: 'ninguna' });
    if (nuevo) mostrarAviso('Duplicado.');
  };

  const confirmarMoverCapa = async (
    bloqueDestinoId: string,
    capaDestinoId: string
  ) => {
    if (!moviendoCapa || moviendoCapa.tipo !== 'elemento-capa') return;
    const origen = moviendoCapa;
    if (
      origen.bloqueId === bloqueDestinoId &&
      origen.capaId === capaDestinoId
    ) {
      setMoviendoCapa(null);
      return;
    }
    await moverElementoCapa(
      origen.bloqueId,
      origen.capaId,
      origen.ref.id,
      bloqueDestinoId,
      capaDestinoId
    );
    setMoviendoCapa(null);
    setSeleccion({ tipo: 'ninguna' });
    mostrarAviso('Elemento movido.');
  };

  const confirmarBorrarCaja = async () => {
    if (!borradoCaja) return;
    await borrarCajaConContenido(borradoCaja.id);
    setAbiertos((prev) => {
      const s = new Set(prev);
      s.delete('caja:' + borradoCaja.id);
      return s;
    });
    setBorradoCaja(null);
    setSeleccion({ tipo: 'ninguna' });
  };

  const confirmarBorrarBloque = async () => {
    if (!borradoBloque) return;
    await borrarBloque(borradoBloque.id);
    setAbiertos((prev) => {
      const s = new Set(prev);
      s.delete('bloque:' + borradoBloque.id);
      return s;
    });
    setBorradoBloque(null);
    setSeleccion({ tipo: 'ninguna' });
  };

  // ─── Render ──────────────────────────────────────────────────────────
  const estiloBotonBarra = (activo: boolean): React.CSSProperties => ({
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    backgroundColor: activo ? 'rgba(0,229,106,0.15)' : 'var(--bg)',
    color: activo ? 'var(--accent)' : 'var(--text-dim)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: activo ? 'pointer' : 'not-allowed',
    opacity: activo ? 1 : 0.4,
    whiteSpace: 'nowrap',
  });

  const estiloBotonFila = (activo: boolean): React.CSSProperties => ({
    padding: '0 10px',
    border: 'none',
    borderLeft: '1px solid var(--border)',
    backgroundColor: activo ? 'rgba(0,229,106,0.15)' : 'transparent',
    color: activo ? 'var(--accent)' : 'var(--text)',
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
  });

  const todasLasCapas = useMemo(() => {
    const lista: Array<{ bloque: BloqueCapas; capa: Capa }> = [];
    for (const b of bloquesCapas) {
      const capas = b.capas.slice().sort((a, c) => {
        const oa = a.orden ?? 0;
        const oc = c.orden ?? 0;
        return oa - oc;
      });
      for (const c of capas) {
        lista.push({ bloque: b, capa: c });
      }
    }
    return lista;
  }, [bloquesCapas]);

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
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
          Archivos
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={iniciarCrearWaypointGlobal}
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
            onClick={() => {
              setCreandoCaja(true);
              setNombreCajaNueva('');
            }}
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

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: 4,
          padding: '8px 14px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          overflowX: 'auto',
        }}
      >
        <button type="button" onClick={accionRenombrar} disabled={!puedeRenombrar} style={estiloBotonBarra(puedeRenombrar)}>✎</button>
        <button type="button" onClick={accionColor} disabled={!puedeColor} style={estiloBotonBarra(puedeColor)}>🎨</button>
        <button type="button" onClick={accionSubir} disabled={!puedeSubir} style={estiloBotonBarra(puedeSubir)}>▲</button>
        <button type="button" onClick={accionBajar} disabled={!puedeBajar} style={estiloBotonBarra(puedeBajar)}>▼</button>
        <button type="button" onClick={accionMover} disabled={!puedeMover} style={estiloBotonBarra(puedeMover)}>📁</button>
        <button type="button" onClick={accionDuplicar} disabled={!puedeDuplicar} style={estiloBotonBarra(puedeDuplicar)}>📋</button>
        <button type="button" onClick={accionConvertirEnPunto} disabled={!puedeConvertirEnSpot} title={puedeConvertirEnSpot ? 'Convertir en Punto de pesca' : 'Selecciona un waypoint o un punto de capa para convertir'} style={estiloBotonBarra(puedeConvertirEnSpot)}>📌</button>
        <button type="button" onClick={accionExportar} disabled={!puedeExportar} style={estiloBotonBarra(puedeExportar)}>📤</button>
        <button type="button" onClick={accionBorrar} disabled={!puedeBorrar} style={estiloBotonBarra(puedeBorrar)}>🗑</button>
      </div>

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
              const esBloque = caja.esBloque;
              const bloque = esBloque ? bloquesCapas.find((b) => b.id === caja.id) ?? null : null;
              const claveAbierto = esBloque ? `bloque:${caja.id}` : `caja:${caja.id}`;
              const abierto = abiertos.has(claveAbierto);
              const seleccionada = esSeleccionCaja(caja);
              const vis = visibilidadCaja(caja);

              return (
                <div key={caja.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div
                    onClick={() => seleccionarCaja(caja)}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      minHeight: 48,
                      backgroundColor: seleccionada ? 'rgba(0,229,106,0.10)' : 'var(--surface)',
                      border: `1px solid ${seleccionada ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '12px 12px',
                        textAlign: 'left',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', color: 'var(--accent)', flexShrink: 0, width: 12, textAlign: 'center' }}>
                        {abierto ? '▾' : '▸'}
                      </span>
                      <span
                        style={{
                          width: 16,
                          height: 16,
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
                    </div>
                    <button
                      type="button"
                      title={vis === 'todas' ? 'Ocultar todo' : 'Mostrar todo'}
                      onClick={(e) => {
                        e.stopPropagation();
                        alternarVisibilidadCaja(caja);
                      }}
                      style={estiloBotonFila(vis === 'todas')}
                    >
                      {vis === 'todas' ? '👁' : '🕶'}
                    </button>
                  </div>

                  {abierto && esBloque && bloque && (() => {
                    const capasOrdenadas = bloque.capas.slice().sort((a, c) => {
                      const oa = a.orden ?? 0;
                      const oc = c.orden ?? 0;
                      return oa - oc;
                    });
                    return (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {capasOrdenadas.map((capa) => {
                          const claveCapa = `capa:${bloque.id}:${capa.id}`;
                          const capaAbierta = abiertos.has(claveCapa);
                          const capaSel =
                            seleccion.tipo === 'capa' &&
                            seleccion.bloqueId === bloque.id &&
                            seleccion.capaId === capa.id;
                          const elementosOrdenados = capa.elementos.slice().sort((a, c) => {
                            const oa = a.orden ?? 0;
                            const oc = c.orden ?? 0;
                            return oa - oc;
                          });
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
                                onClick={() => seleccionarCapa(bloque.id, capa.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'stretch',
                                  minHeight: 40,
                                  backgroundColor: capaSel ? 'rgba(0,229,106,0.10)' : 'var(--surface)',
                                  border: `1px solid ${capaSel ? 'var(--accent)' : 'var(--border)'}`,
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: '8px 10px',
                                    textAlign: 'left',
                                    color: 'var(--text)',
                                    fontFamily: 'inherit',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span style={{ fontSize: '0.85rem', color: 'var(--accent)', flexShrink: 0, width: 12, textAlign: 'center' }}>
                                    {capaAbierta ? '▾' : '▸'}
                                  </span>
                                  <span
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: 3,
                                      backgroundColor: capa.colorCapa || 'transparent',
                                      border: capa.colorCapa ? 'none' : '1px dashed var(--text-dim)',
                                      flexShrink: 0,
                                    }}
                                  />
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
                                </div>
                                <button
                                  type="button"
                                  title={visibilidadCapa(bloque, capa) ? 'Ocultar capa' : 'Mostrar capa'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void alternarVisibilidadCapa(bloque.id, capa.id, !capa.visible);
                                  }}
                                  style={estiloBotonFila(capa.visible)}
                                >
                                  {capa.visible ? '👁' : '🕶'}
                                </button>
                              </div>

                              {capaAbierta &&
                                elementosOrdenados.map((el) => {
                                  const listaEl: ElementoLista = {
                                    tipo: 'elemento-capa',
                                    ref: el,
                                    bloqueId: bloque.id,
                                    capaId: capa.id,
                                  };
                                  const elSel = esSeleccionElemento(listaEl);
                                  const colorEf = colorEfectivoElemento(bloque, capa, el);
                                  const visible = el.visible ?? true;
                                  const favorito = el.favorito ?? false;
                                  return (
                                    <div
                                      key={`${capa.id}-${el.id}`}
                                      onClick={() => seleccionarElemento(listaEl)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'stretch',
                                        backgroundColor: elSel ? 'rgba(0,229,106,0.10)' : 'var(--surface)',
                                        border: `1px solid ${elSel ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        marginLeft: 8,
                                        cursor: 'pointer',
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
                                        title={visible ? 'Ocultar' : 'Mostrar'}
                                        onClick={(e) => { e.stopPropagation(); alternarVisible(listaEl); }}
                                        style={estiloBotonFila(visible)}
                                      >
                                        {visible ? '👁' : '🕶'}
                                      </button>
                                      <button
                                        type="button"
                                        title={favorito ? 'Quitar favorito' : 'Añadir favorito'}
                                        onClick={(e) => { e.stopPropagation(); alternarFavorito(listaEl); }}
                                        style={estiloBotonFila(favorito)}
                                      >
                                        {favorito ? '★' : '☆'}
                                      </button>
                                      <button
                                        type="button"
                                        title="Navegar"
                                        onClick={(e) => { e.stopPropagation(); navegarA(listaEl); }}
                                        style={{
                                          padding: '0 12px',
                                          backgroundColor: 'rgba(0, 229, 106, 0.15)',
                                          border: 'none',
                                          borderLeft: '1px solid var(--border)',
                                          color: 'var(--accent)',
                                          cursor: 'pointer',
                                          fontSize: '0.9rem',
                                          fontWeight: 700,
                                        }}
                                      >
                                        ➤
                                      </button>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {abierto && !esBloque && caja.elementos.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', padding: '20px 0', fontStyle: 'italic' }}>
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
                        const elSel = esSeleccionElemento(el);
                        const key = `${el.tipo}-${(el.ref as { id: string }).id}-${idx}`;
                        return (
                          <div
                            key={key}
                            onClick={() => seleccionarElemento(el)}
                            style={{
                              display: 'flex',
                              alignItems: 'stretch',
                              backgroundColor: elSel ? 'rgba(0,229,106,0.10)' : 'var(--surface)',
                              border: `1px solid ${elSel ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
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
                              title={visible ? 'Ocultar' : 'Mostrar'}
                              onClick={(e) => { e.stopPropagation(); alternarVisible(el); }}
                              style={estiloBotonFila(visible)}
                            >
                              {visible ? '👁' : '🕶'}
                            </button>
                            <button
                              type="button"
                              title={favorito ? 'Quitar favorito' : 'Añadir favorito'}
                              onClick={(e) => { e.stopPropagation(); alternarFavorito(el); }}
                              style={estiloBotonFila(favorito)}
                            >
                              {favorito ? '★' : '☆'}
                            </button>
                            {el.tipo === 'waypoint' && (
                              <button
                                type="button"
                                title="Compartir GPX"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuExportShareWp(el.ref as Waypoint);
                                }}
                                style={estiloBotonFila(false)}
                              >
                                📤
                              </button>
                            )}
                            {(el.tipo === 'ruta' || el.tipo === 'track') ? (
                              <button
                                type="button"
                                title="Ver en el mapa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idElemento = (el.ref as { id: string }).id;
                                  if (onVerTrackEnMapa) {
                                    onVerTrackEnMapa(idElemento);
                                  } else {
                                    sessionStorage.setItem('wkf-nav-resaltar', idElemento);
                                    onNavegar({ tipo: 'track', id: idElemento });
                                  }
                                }}
                                style={{
                                  padding: '0 14px',
                                  backgroundColor: 'rgba(0, 184, 255, 0.15)',
                                  border: 'none',
                                  borderLeft: '1px solid var(--border)',
                                  color: 'var(--accent-2)',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                }}
                              >
                                🗺️
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Navegar"
                                onClick={(e) => { e.stopPropagation(); navegarA(el); }}
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

      {creandoCaja && (
        <ModalWkf titulo="Nueva carpeta" onCerrar={() => setCreandoCaja(false)}>
          <input
            type="text"
            value={nombreCajaNueva}
            onChange={(e) => setNombreCajaNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmarCrearCaja();
              if (e.key === 'Escape') setCreandoCaja(false);
            }}
            placeholder="Nombre de la carpeta"
            autoFocus
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setCreandoCaja(false)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmarCrearCaja()} disabled={!nombreCajaNueva.trim()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', backgroundColor: nombreCajaNueva.trim() ? 'var(--accent)' : 'var(--border)', color: nombreCajaNueva.trim() ? '#000' : 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, cursor: nombreCajaNueva.trim() ? 'pointer' : 'not-allowed' }}>
              Crear
            </button>
          </div>
        </ModalWkf>
      )}

      {creandoWaypoint && (
        <ModalWkf titulo="📍 Nuevo waypoint" colorBorde="var(--accent)" onCerrar={() => setCreandoWaypoint(false)}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Nombre</label>
          <input
            type="text"
            value={nombreWaypointNuevo}
            onChange={(e) => setNombreWaypointNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmarCrearWaypoint();
              if (e.key === 'Escape') setCreandoWaypoint(false);
            }}
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          />
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Coordenadas</label>
          <input
            type="text"
            placeholder="Ej: 39.5, -0.5"
            value={coordsWaypointNueva}
            onChange={(e) => setCoordsWaypointNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmarCrearWaypoint();
              if (e.key === 'Escape') setCreandoWaypoint(false);
            }}
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          />
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Carpeta / Caja</label>
          <select
            value={cajaWaypointId && carpetas.some((c) => c.id === cajaWaypointId) ? cajaWaypointId : WKF_WAYPOINTS_ID}
            onChange={(e) => setCajaWaypointId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          >
            <option value={WKF_WAYPOINTS_ID}>WKF Waypoints</option>
            {carpetas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setCreandoWaypoint(false)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmarCrearWaypoint()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', backgroundColor: 'var(--accent)', color: '#000', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              Crear
            </button>
          </div>
        </ModalWkf>
      )}


      {renombrandoCarpeta && (
        <ModalWkf titulo="Renombrar caja" onCerrar={() => setRenombrandoCarpeta(null)}>
          <input
            type="text"
            autoFocus
            value={nombreCarpetaEdit}
            onChange={(e) => setNombreCarpetaEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmarRenombrarCarpeta();
              if (e.key === 'Escape') setRenombrandoCarpeta(null);
            }}
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setRenombrandoCarpeta(null)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmarRenombrarCarpeta()} disabled={!nombreCarpetaEdit.trim()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', backgroundColor: nombreCarpetaEdit.trim() ? 'var(--accent)' : 'var(--border)', color: nombreCarpetaEdit.trim() ? '#000' : 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, cursor: nombreCarpetaEdit.trim() ? 'pointer' : 'not-allowed' }}>
              Guardar
            </button>
          </div>
        </ModalWkf>
      )}

      {renombrandoBloque && (
        <ModalWkf titulo="Renombrar archivo" onCerrar={() => setRenombrandoBloque(null)}>
          <input
            type="text"
            autoFocus
            value={nombreBloqueEdit}
            onChange={(e) => setNombreBloqueEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmarRenombrarBloque();
              if (e.key === 'Escape') setRenombrandoBloque(null);
            }}
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setRenombrandoBloque(null)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmarRenombrarBloque()} disabled={!nombreBloqueEdit.trim()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', backgroundColor: nombreBloqueEdit.trim() ? 'var(--accent)' : 'var(--border)', color: nombreBloqueEdit.trim() ? '#000' : 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, cursor: nombreBloqueEdit.trim() ? 'pointer' : 'not-allowed' }}>
              Guardar
            </button>
          </div>
        </ModalWkf>
      )}

      {renombrandoCapa && (
        <ModalWkf titulo="Renombrar capa" onCerrar={() => setRenombrandoCapa(null)}>
          <input
            type="text"
            autoFocus
            value={nombreCapaEdit}
            onChange={(e) => setNombreCapaEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmarRenombrarCapa();
              if (e.key === 'Escape') setRenombrandoCapa(null);
            }}
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setRenombrandoCapa(null)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmarRenombrarCapa()} disabled={!nombreCapaEdit.trim()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', backgroundColor: nombreCapaEdit.trim() ? 'var(--accent)' : 'var(--border)', color: nombreCapaEdit.trim() ? '#000' : 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, cursor: nombreCapaEdit.trim() ? 'pointer' : 'not-allowed' }}>
              Guardar
            </button>
          </div>
        </ModalWkf>
      )}

      {renombrandoElemento && (
        <ModalWkf titulo={`Renombrar ${etiquetaTipo(renombrandoElemento.tipo).toLowerCase()}`} onCerrar={() => setRenombrandoElemento(null)}>
          <input
            type="text"
            autoFocus
            value={nombreElementoEdit}
            onChange={(e) => setNombreElementoEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void confirmarRenombrarElemento();
              if (e.key === 'Escape') setRenombrandoElemento(null);
            }}
            style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setRenombrandoElemento(null)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="button" onClick={() => void confirmarRenombrarElemento()} disabled={!nombreElementoEdit.trim()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', backgroundColor: nombreElementoEdit.trim() ? 'var(--accent)' : 'var(--border)', color: nombreElementoEdit.trim() ? '#000' : 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, cursor: nombreElementoEdit.trim() ? 'pointer' : 'not-allowed' }}>
              Guardar
            </button>
          </div>
        </ModalWkf>
      )}

      {moviendo && (
        <ModalWkf titulo="Mover a..." onCerrar={() => setMoviendo(null)}>
          <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
            Selecciona la caja o carpeta de destino para "{nombreElemento(moviendo)}":
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
            {carpetas.filter((c) => !esCajaSistema(c.id)).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => void confirmarMoverElemento(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c.color || '#888', flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{c.nombre}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setMoviendo(null)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
            Cancelar
          </button>
        </ModalWkf>
      )}

      {duplicando && duplicando.tipo === 'waypoint' && (
        <ModalWkf titulo="Duplicar waypoint en..." onCerrar={() => setDuplicando(null)}>
          <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
            Selecciona la carpeta de destino para la copia de "{nombreElemento(duplicando)}":
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => void confirmarDuplicarWaypoint(WKF_WAYPOINTS_ID)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#00E56A', flexShrink: 0 }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>WKF Waypoints</span>
            </button>
            {carpetas.filter((c) => !esCajaSistema(c.id)).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => void confirmarDuplicarWaypoint(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c.color || '#888', flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{c.nombre}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setDuplicando(null)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
            Cancelar
          </button>
        </ModalWkf>
      )}

      {moviendoCapa && (
        <ModalWkf titulo="Mover elemento a capa" onCerrar={() => setMoviendoCapa(null)}>
          <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
            Selecciona la capa de destino para "{moviendoCapa.tipo === 'elemento-capa' ? (moviendoCapa.ref.nombre?.trim() || 'Elemento') : 'Elemento'}":
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            {todasLasCapas.map(({ bloque, capa }) => {
              const esActual =
                moviendoCapa.tipo === 'elemento-capa' &&
                moviendoCapa.bloqueId === bloque.id &&
                moviendoCapa.capaId === capa.id;
              const numEls = capa.elementos.length;
              return (
                <button
                  key={`${bloque.id}-${capa.id}`}
                  type="button"
                  disabled={esActual}
                  onClick={() => void confirmarMoverCapa(bloque.id, capa.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                    padding: '10px 12px',
                    backgroundColor: esActual ? 'rgba(0,229,106,0.08)' : 'var(--bg)',
                    border: `1px solid ${esActual ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    color: 'var(--text)',
                    cursor: esActual ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: esActual ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    {bloque.nombre} › {capa.nombre}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {numEls} elemento(s){esActual ? ' · capa actual' : ''}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setMoviendoCapa(null)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
            Cancelar
          </button>
        </ModalWkf>
      )}

      {borradoCaja && (() => {
        const contenido = contarContenidoCaja(borradoCaja.id);
        const total = contenido.waypoints + contenido.rutas + contenido.tracks;
        return (
          <ModalWkf titulo="🗑 Borrar caja" colorBorde="var(--verdict-desaconsejado)" onCerrar={() => setBorradoCaja(null)}>
            {total > 0 && (
              <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: 'var(--verdict-desaconsejado)', lineHeight: 1.5, fontWeight: 600 }}>
                ⚠️ Vas a borrar la caja "{borradoCaja.nombre}" y sus {total} elemento(s) ({contenido.waypoints} waypoint(s), {contenido.rutas} ruta(s), {contenido.tracks} track(s)). Los favoritos que contiene también se borrarán.
              </p>
            )}
            {total === 0 && (
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
                La caja "{borradoCaja.nombre}" está vacía. ¿Borrarla?
              </p>
            )}
            <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setBorradoCaja(null)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={() => void confirmarBorrarCaja()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--verdict-desaconsejado)', backgroundColor: 'rgba(255, 45, 85, 0.15)', color: 'var(--verdict-desaconsejado)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Borrar todo
              </button>
            </div>
          </ModalWkf>
        );
      })()}

      {borradoCapa && (
        <ModalWkf
          titulo="🗑 Borrar capa"
          colorBorde="var(--verdict-desaconsejado)"
          onCerrar={() => setBorradoCapa(null)}
        >
          <p
            style={{
              margin: '0 0 12px 0',
              fontSize: '0.82rem',
              color: 'var(--verdict-desaconsejado)',
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            {borradoCapa.capa.elementos.length > 0
              ? `⚠️ Vas a borrar la capa "${borradoCapa.capa.nombre}" con ${borradoCapa.capa.elementos.length} elemento(s). Los favoritos que contiene también se borrarán.`
              : `La capa "${borradoCapa.capa.nombre}" está vacía. ¿Borrarla?`}
          </p>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '0.78rem',
              color: 'var(--text-dim)',
              lineHeight: 1.4,
            }}
          >
            El archivo "{borradoCapa.bloque.nombre}" se queda con el
            resto de capas. Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setBorradoCapa(null)}
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
              onClick={() => {
                void borrarCapaSuelta(borradoCapa.bloque.id, borradoCapa.capa.id);
                setAbiertos((prev) => {
                  const s = new Set(prev);
                  s.delete(
                    'capa:' + borradoCapa.bloque.id + ':' + borradoCapa.capa.id
                  );
                  return s;
                });
                setBorradoCapa(null);
                setSeleccion({ tipo: 'ninguna' });
              }}
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
              Borrar capa
            </button>
          </div>
        </ModalWkf>
      )}

      {borradoBloque && (() => {
        const caja = cajas.find((c) => c.esBloque && c.id === borradoBloque.id);
        const numFav = caja ? hayFavoritosEnCaja(caja) : 0;
        return (
          <ModalWkf titulo="🗑 Borrar archivo" colorBorde="var(--verdict-desaconsejado)" onCerrar={() => setBorradoBloque(null)}>
            {numFav > 0 && (
              <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: 'var(--verdict-desaconsejado)', lineHeight: 1.5, fontWeight: 600 }}>
                ⚠️ Este archivo contiene {numFav} favorito(s). Se borrarán también.
              </p>
            )}
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
              ¿Borrar el archivo "{borradoBloque.nombre}" y todas sus capas?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setBorradoBloque(null)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={() => void confirmarBorrarBloque()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--verdict-desaconsejado)', backgroundColor: 'rgba(255, 45, 85, 0.15)', color: 'var(--verdict-desaconsejado)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Borrar
              </button>
            </div>
          </ModalWkf>
        );
      })()}

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

      {colorRutaObj && (
        <ModalColor
          titulo={`Color de la ruta "${colorRutaObj.nombre}"`}
          onElegir={async (color) => {
            await cambiarColorRuta(colorRutaObj.id, color);
            setColorRutaObj(null);
          }}
          onCerrar={() => setColorRutaObj(null)}
        />
      )}

      {colorTrackObj && (
        <ModalColor
          titulo={`Color del track "${colorTrackObj.nombre}"`}
          onElegir={async (color) => {
            await cambiarColorTrack(colorTrackObj.id, color);
            setColorTrackObj(null);
          }}
          onCerrar={() => setColorTrackObj(null)}
        />
      )}

      {convertirSpotWp && (
        <ModalWkf
          titulo="📍 Convertir en Punto"
          colorBorde="var(--accent)"
          onCerrar={() => setConvertirSpotWp(null)}
        >
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Nombre
          </label>
          <input
            type="text"
            value={nombreSpotEdit}
            onChange={(e) => setNombreSpotEdit(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />

          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Zona
          </label>
          <select
            value={zonaSpotEdit}
            onChange={(e) => setZonaSpotEdit(e.target.value as Zona)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          >
            {Object.entries(stringsEs.zones).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Tipo de acceso
          </label>
          <select
            value={tipoAccesoSpotEdit}
            onChange={(e) =>
              setTipoAccesoSpotEdit(e.target.value as TipoAcceso | '')
            }
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
            <option value="">Sin especificar</option>
            {TIPOS_ACCESO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETAS_ACCESO[tipo] || tipo}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setConvertirSpotWp(null)}
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
              onClick={() => void confirmarConvertirEnSpot()}
              disabled={!nombreSpotEdit.trim()}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: nombreSpotEdit.trim()
                  ? 'var(--accent)'
                  : 'var(--border)',
                color: nombreSpotEdit.trim() ? '#000' : 'var(--text-dim)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: nombreSpotEdit.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Convertir en Punto
            </button>
          </div>
        </ModalWkf>
      )}

      {menuExportShareWp && (
        <ModalWkf
          titulo="Waypoint"
          onCerrar={() => setMenuExportShareWp(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const wp = menuExportShareWp;
                setMenuExportShareWp(null);
                void exportarWaypoint(wp.id);
              }}
              style={{
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--accent)',
                backgroundColor: 'rgba(0, 229, 106, 0.15)',
                color: 'var(--accent)',
                fontSize: '0.85rem', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Exportar
            </button>
            <button
              type="button"
              onClick={() => {
                const wp = menuExportShareWp;
                setMenuExportShareWp(null);
                void compartirWaypointGpx(wp);
              }}
              style={{
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--accent-2)',
                backgroundColor: 'rgba(0, 184, 255, 0.15)',
                color: 'var(--accent-2)',
                fontSize: '0.85rem', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Compartir
            </button>
            <button
              type="button"
              onClick={() => setMenuExportShareWp(null)}
              style={{
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-dim)',
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </ModalWkf>
      )}
    </div>
  );
};

export default ArchivosScreen;
// src/screens/Navegacion/ArchivosScreen.tsx