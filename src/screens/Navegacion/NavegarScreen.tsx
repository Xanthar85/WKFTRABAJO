// src/screens/Navegacion/NavegarScreen.tsx
// WKF — Pantalla de navegación y mapa unificados (WKF1.073).
// Reescritura completa. Absorbe MapaScreen.tsx.
//   · Un solo mapa: pinta waypoints, rutas, tracks y capas.
//   · Crea waypoints con el botón "+" (modal con nombre y coords).
//   · Waypoints del store arrastrables (dragend → actualizarWaypoint).
//   · Selección de waypoint / ruta / track / elemento de capa con ➤.
//   · Centrado con "◎": encuadra todos los elementos visibles.
//   · Control de secuencia ⏮ ⏭ ⇄ para rutas y tracks.
// Bug 1 cerrado: el reset de estado se deriva del destino, no de un
//   useEffect que se puede desincronizar con el keep-alive.
// Bug 2 cerrado: handleInvertir resetea índice y ultimoWaypointLlegadoRef
//   en el mismo tick. El extremo físico cambia de verdad.
// Bug 3 (waypoints huérfanos) y 3b (ruta resucitada) NO se tocan aquí:
//   se cierran en navegacion-store.ts.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  Marker,
  Polyline,
  Polygon,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAppStore, type FiltroMapa } from '../../state/store.ts';
import { MapaTacticoLayer } from '../../components/MapaTacticoLayer.tsx';
import { CapaMapa, type OnElementoClick } from '../../components/CapaMapa.tsx';
import {
  useNavegacionStore,
  calcularWaypointsDesdeTrack,
  DENSIDAD_TRACK_METROS,
} from '../../state/navegacion-store.ts';
import { BrujulaNavegacion } from './BrujulaNavegacion.tsx';
import { PanelDatosNavegacion } from './PanelDatosNavegacion.tsx';
import { ModoManualModal, type DatosModoManual } from './ModoManualModal.tsx';
import {
  iniciarGPS,
  type PosicionGPS,
  type EstadoGPS,
  type MotivoErrorGPS,
  type GPSHandle,
} from '../../lib/navegacion/gps.ts';
import {
  iniciarBrujula,
  pedirPermisoBrujula,
  tieneBrujula,
  type BrujulaHandle,
  type EstadoBrujula,
} from '../../lib/navegacion/brujula.ts';
import {
  bearingOrtodromico,
  distanciaHaversine,
} from '../../lib/navegacion/bearing.ts';
import {
  crearTrackRecorder,
  type TrackRecorder,
  type EstadoRecorder,
} from '../../lib/navegacion/track-recorder.ts';
import {
  mantenerPantallaEncendida,
  type WakeLockHandle,
} from '../../lib/navegacion/wake-lock.ts';
import type { PuntoTrack } from '../../db/tracks-repo.ts';
import type { BloqueCapas, ElementoCapa } from '../../db/capas-repo.ts';

export type DestinoNavegacion =
  | { tipo: 'waypoint'; id: string }
  | { tipo: 'ruta'; id: string }
  | { tipo: 'track'; id: string }
  | { tipo: 'poligono'; bloqueId: string; capaId: string; elementoId: string }
  | { tipo: 'linea'; bloqueId: string; capaId: string; elementoId: string }
  | { tipo: 'punto-capa'; bloqueId: string; capaId: string; elementoId: string };

export interface NavegarScreenProps {
  destino: DestinoNavegacion | null;
  onCambiarDestino: () => void;
  onNavegarAElemento?: (
    bloqueId: string,
    capaId: string,
    elementoId: string,
    tipo: 'punto' | 'linea' | 'poligono'
  ) => void;
  onNavegarADestino?: (destino: DestinoNavegacion) => void;
}

const ORDEN_FILTROS: FiltroMapa[] = [
  'osm',
  'azul1',
  'azul2',
  'granate1',
  'granate2',
  'oscuro',
];

const iconoCacheNavegar = new Map<string, L.DivIcon>();

function crearIconoNavegar(
  color: string = '#00E56A',
  tipo: 'destino' | 'normal' | 'secundario' = 'normal'
): L.DivIcon {
  const clave = `${color}:${tipo}`;
  const existente = iconoCacheNavegar.get(clave);
  if (existente) return existente;

  let icono: L.DivIcon;
  if (tipo === 'destino') {
    icono = L.divIcon({
      className: 'wkf-nav-waypoint-destino',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: ${color};
          box-shadow: 0 0 14px ${color}, 0 0 28px ${color}aa;
          border: 3px solid #000;
          box-sizing: border-box;
        "></div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  } else if (tipo === 'secundario') {
    icono = L.divIcon({
      className: 'wkf-nav-waypoint-sec',
      html: `
        <div style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: ${color};
          box-shadow: 0 0 6px ${color}, 0 0 12px ${color}66;
          border: 2px solid #000;
          box-sizing: border-box;
          opacity: 0.85;
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  } else {
    icono = L.divIcon({
      className: 'wkf-nav-waypoint-store',
      html: `
        <div style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: ${color};
          box-shadow: 0 0 8px ${color}, 0 0 16px ${color}88;
          border: 2px solid #000;
          box-sizing: border-box;
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  iconoCacheNavegar.set(clave, icono);
  return icono;
}

const MapController: React.FC<{ onMap: (map: L.Map) => void }> = ({ onMap }) => {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

const MapClickHandler: React.FC<{
  onMapClick: (latlng: L.LatLng) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

function tocarPitidoLlegada(): void {
  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    }, 500);
  } catch {
    /* ignore */
  }
}

function vibrarLlegada(): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate([200, 100, 200]);
  } catch {
    /* ignore */
  }
}

function formatearEta(metros: number | null, velocidadMs: number | null): string | null {
  if (metros == null || velocidadMs == null) return null;
  if (velocidadMs <= 0.05) return null;
  const seg = metros / velocidadMs;
  if (!Number.isFinite(seg) || seg < 0) return null;
  const min = Math.round(seg / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

type UnidadVelocidad = 'kt' | 'kmh' | 'mph' | 'ms';

const SUFIJO_UNIDAD_VELOCIDAD: Record<UnidadVelocidad, string> = {
  kt: 'kt',
  kmh: 'km/h',
  mph: 'mph',
  ms: 'm/s',
};

function formatearVelocidadUsuario(
  ms: number | null,
  unidad: UnidadVelocidad = 'kt'
): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  let valor = 0;
  if (unidad === 'kt') valor = ms * 1.9438444924406;
  else if (unidad === 'kmh') valor = ms * 3.6;
  else if (unidad === 'mph') valor = ms * 2.2369362920544;
  else if (unidad === 'ms') valor = ms;
  return `${valor.toFixed(1)} ${SUFIJO_UNIDAD_VELOCIDAD[unidad]}`;
}

function nombreTrackPorDefecto(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `Track ${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function buscarElementoCapa(
  bloques: BloqueCapas[],
  bloqueId: string,
  capaId: string,
  elementoId: string
): ElementoCapa | null {
  const b = bloques.find((blk) => blk.id === bloqueId);
  if (b) {
    const c = b.capas.find((cp) => cp.id === capaId);
    if (c) {
      const el = c.elementos.find((e) => e.id === elementoId);
      if (el) return el;
    }
  }
  for (const blk of bloques) {
    for (const cp of blk.capas) {
      const el = cp.elementos.find((e) => e.id === elementoId);
      if (el) return el;
    }
  }
  return null;
}

function extraerPuntos(
  coords: [number, number][] | [number, number] | undefined
): [number, number][] {
  if (!coords) return [];
  if (!Array.isArray(coords)) return [];
  if (coords.length === 0) return [];
  if (typeof coords[0] === 'number') {
    return [coords as [number, number]];
  }
  return (coords as unknown[]).filter(
    (p): p is [number, number] =>
      Array.isArray(p) &&
      p.length >= 2 &&
      Number.isFinite(p[0]) &&
      Number.isFinite(p[1])
  );
}

function calcularCentroide(puntos: [number, number][]): [number, number] | null {
  if (!puntos.length) return null;
  let sumLat = 0;
  let sumLon = 0;
  for (const [lat, lon] of puntos) {
    sumLat += lat;
    sumLon += lon;
  }
  return [sumLat / puntos.length, sumLon / puntos.length];
}

function puntoMasCercanoEnSegmento(
  p1: [number, number],
  p2: [number, number],
  p: [number, number]
): [number, number] {
  const [lat1, lon1] = p1;
  const [lat2, lon2] = p2;
  const [latK, lonK] = p;

  const latMed = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(latMed);

  const dx = (lon2 - lon1) * cosLat;
  const dy = lat2 - lat1;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) return [lat1, lon1];

  const px = (lonK - lon1) * cosLat;
  const py = latK - lat1;

  let t = (px * dx + py * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  return [lat1 + t * (lat2 - lat1), lon1 + t * (lon2 - lon1)];
}

function calcularPuntoMasCercanoLinea(
  puntos: [number, number][],
  latKayak: number | null,
  lonKayak: number | null
): [number, number] | null {
  if (!puntos.length) return null;
  if (latKayak == null || lonKayak == null || puntos.length === 1) {
    return puntos[0];
  }

  let mejorPunto = puntos[0];
  let menorDistancia = Infinity;

  for (let i = 0; i < puntos.length - 1; i++) {
    const ptCercano = puntoMasCercanoEnSegmento(
      puntos[i],
      puntos[i + 1],
      [latKayak, lonKayak]
    );
    const d = distanciaHaversine(latKayak, lonKayak, ptCercano[0], ptCercano[1]);
    if (d < menorDistancia) {
      menorDistancia = d;
      mejorPunto = ptCercano;
    }
  }

  return mejorPunto;
}

interface ModalGuardarTrackProps {
  nombreSugerido: string;
  onGuardar: (nombre: string) => void;
  onTirar: () => void;
  onCancelar: () => void;
}

const ModalGuardarTrack: React.FC<ModalGuardarTrackProps> = ({
  nombreSugerido,
  onGuardar,
  onTirar,
  onCancelar,
}) => {
  const { t } = useTranslation();
  const [nombre, setNombre] = useState(nombreSugerido);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--accent)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)' }}>
          {t('navegacion.track.guardarTitulo', { defaultValue: '¿Guardar el track?' })}
        </h3>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {t('navegacion.track.guardarIntro', {
            defaultValue:
              'Puedes guardarlo para repetir este recorrido en otra ocasión, o tirarlo si no te interesa.',
          })}
        </p>

        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
          {t('navegacion.track.nombreLabel', { defaultValue: 'Nombre del track' })}
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => onGuardar(nombre.trim() || nombreSugerido)}
            disabled={!nombre.trim()}
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: nombre.trim() ? 'var(--accent)' : 'var(--border)',
              color: nombre.trim() ? '#000' : 'var(--text-dim)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: nombre.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {t('navegacion.track.guardar', { defaultValue: 'Guardar track' })}
          </button>
          <button
            type="button"
            onClick={onTirar}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--verdict-exigente)',
              backgroundColor: 'rgba(255, 138, 0, 0.1)',
              color: 'var(--verdict-exigente)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('navegacion.track.tirar', { defaultValue: 'Tirar el track' })}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel', { defaultValue: 'Cancelar' })}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModalNuevoWaypointProps {
  nombreInicial: string;
  coords: { lat: number; lon: number } | null;
  onGuardar: (nombre: string) => void;
  onCerrar: () => void;
}

const ModalNuevoWaypoint: React.FC<ModalNuevoWaypointProps> = ({
  nombreInicial,
  coords,
  onGuardar,
  onCerrar,
}) => {
  const [nombre, setNombre] = useState(nombreInicial);
  return (
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
          border: '1px solid var(--accent)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>
          📍 Nuevo waypoint
        </h3>
        {coords && (
          <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
          </p>
        )}
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
          Nombre
        </label>
        <input
          type="text"
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onGuardar(nombre.trim() || nombreInicial);
            if (e.key === 'Escape') onCerrar();
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
          <button
            type="button"
            onClick={() => onGuardar(nombre.trim() || nombreInicial)}
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
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

const AUTO_CENTRADO_PAUSA_MS = 60_000;

const STORAGE_GRABACION = 'wkf-nav-track-grabacion';

interface GrabacionPersistida {
  estado: 'recording' | 'paused';
  puntos: PuntoTrack[];
  iniciadoEn: number;
}

function leerGrabacionPersistida(): GrabacionPersistida | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_GRABACION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.estado !== 'recording' && parsed.estado !== 'paused') return null;
    if (!Array.isArray(parsed.puntos)) return null;
    return parsed as GrabacionPersistida;
  } catch {
    return null;
  }
}

function persistirGrabacion(g: GrabacionPersistida | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (g) {
      sessionStorage.setItem(STORAGE_GRABACION, JSON.stringify(g));
    } else {
      sessionStorage.removeItem(STORAGE_GRABACION);
    }
  } catch {
    // ignore
  }
}

export const NavegarScreen: React.FC<NavegarScreenProps> = ({
  destino,
  onCambiarDestino,
  onNavegarAElemento,
  onNavegarADestino,
}) => {
  const { t } = useTranslation();

  const ajustes = useAppStore((s) => s.ajustes);
  const filtroMapa = useAppStore((s) => s.ajustes.filtroMapa);
  const setFiltroMapa = useAppStore((s) => s.setFiltroMapa);
  const mapaNorteArriba = useAppStore((s) => s.ajustes.mapaNorteArriba);

  const renderIcono = (
    color: string = '#00E56A',
    tipo: 'destino' | 'normal' | 'secundario' = 'normal'
  ) => {
    return crearIconoNavegar(color, tipo);
  };

  const waypoints = useNavegacionStore((s) => s.waypoints);
  const rutas = useNavegacionStore((s) => s.rutas);
  const tracks = useNavegacionStore((s) => s.tracks);
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const crearTrackDesdeGrabacion = useNavegacionStore((s) => s.crearTrackDesdeGrabacion);
  const crearWaypointStore = useNavegacionStore((s) => s.crearWaypoint);
  const actualizarWaypoint = useNavegacionStore((s) => s.actualizarWaypoint);

  const [posicion, setPosicion] = useState<PosicionGPS | null>(null);
  const [estadoGPS, setEstadoGPS] = useState<EstadoGPS>('inactivo');
  const [rumboReal, setRumboReal] = useState<number | null>(null);
  const [estadoBrujula, setEstadoBrujula] = useState<EstadoBrujula>('inactivo');
  const [modoManualActivo, setModoManualActivo] = useState(false);
  const [datosManual, setDatosManual] = useState<DatosModoManual | null>(null);
  const [modalManualAbierto, setModalManualAbierto] = useState(false);

  const [aviso, setAviso] = useState<string | null>(null);
  const [bannerLlegada, setBannerLlegada] = useState(false);

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const contenedorMapaRef = useRef<HTMLDivElement | null>(null);
  const [centradoAutomatico, setCentradoAutomatico] = useState(true);
  const [recorderEstado, setRecorderEstado] = useState<EstadoRecorder>('idle');
  const [puntosTrack, setPuntosTrack] = useState<PuntoTrack[]>([]);
  const [trackIniciado, setTrackIniciado] = useState(false);
  const [avisoHuecoTrack, setAvisoHuecoTrack] = useState(false);
  const grabacionRestauradaRef = useRef(false);

  // Modo creación de waypoint (absorbe MapaScreen).
  const [modoCreacion, setModoCreacion] = useState(false);
  const [nuevoWaypointCoords, setNuevoWaypointCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [nombreNuevoWaypoint, setNombreNuevoWaypoint] = useState('');

  // Selección de elementos del mapa (absorbe MapaScreen).
  const [destinoSeleccionadoMapa, setDestinoSeleccionadoMapa] =
    useState<DestinoNavegacion | null>(null);
  const [nombreSeleccionadoMapa, setNombreSeleccionadoMapa] =
    useState<string | null>(null);

  // WKF1.067: dirección de navegación para rutas y tracks.
  const [direccionInvertida, setDireccionInvertida] = useState(false);

  // WKF1.067: bandera para que los controles ⏮ ⏭ no disparen pitido ni
  // banner (son saltos voluntarios, no llegadas reales).
  const saltarPitidoRef = useRef(false);

  const [waypointPuntualCapa, setWaypointPuntualCapa] = useState<{
    id: string;
    nombre: string;
    lat: number;
    lon: number;
    creadoEn: number;
  } | null>(null);

  const [modalGuardarTrack, setModalGuardarTrack] = useState<{
    puntos: PuntoTrack[];
    nombreSugerido: string;
  } | null>(null);

  const gpsHandleRef = useRef<GPSHandle | null>(null);
  const brujulaHandleRef = useRef<BrujulaHandle | null>(null);
  const recorderRef = useRef<TrackRecorder | null>(null);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);
  const ultimoWaypointLlegadoRef = useRef<string | null>(null);

  const pausaCentradoHastaRef = useRef<number>(0);
  const pausaTimerRef = useRef<number | null>(null);

  const latActual = modoManualActivo ? null : posicion?.lat ?? null;
  const lonActual = modoManualActivo ? null : posicion?.lon ?? null;
  const velocidadMs = modoManualActivo ? null : posicion?.velocidad ?? null;

  const rumboRealEfectivo = (() => {
    if (rumboReal != null) return rumboReal;
    if (posicion?.rumbo != null) return posicion.rumbo;
    if (modoManualActivo && datosManual) return datosManual.rumboGrados;
    return null;
  })();

  const velocidadTexto = formatearVelocidadUsuario(
    velocidadMs,
    ajustes.unidadVelocidad ?? 'kt'
  );
  const rumboManual = modoManualActivo && datosManual ? datosManual.rumboGrados : null;

  const waypointsPorId = useMemo(() => {
    const m = new Map<string, typeof waypoints[number]>();
    for (const w of waypoints) m.set(w.id, w);
    return m;
  }, [waypoints]);

  const rutaActiva = useMemo(() => {
    if (!destino || destino.tipo !== 'ruta') return null;
    return rutas.find((r) => r.id === destino.id) ?? null;
  }, [destino, rutas]);

  const trackActivo = useMemo(() => {
    if (!destino || destino.tipo !== 'track') return null;
    return tracks.find((t) => t.id === destino.id) ?? null;
  }, [destino, tracks]);

  const waypointsDeRuta = useMemo(() => {
    if (!rutaActiva) return [];
    return rutaActiva.waypointIds
      .map((id) => waypointsPorId.get(id))
      .filter((w): w is NonNullable<typeof w> => w != null);
  }, [rutaActiva, waypointsPorId]);

  const waypointsDeTrack = useMemo(() => {
    if (!trackActivo) return [];
    if (!Array.isArray(trackActivo.puntos) || trackActivo.puntos.length === 0) return [];
    const densidadClave = ajustes.densidadWaypointsTrack;
    const densidadM = DENSIDAD_TRACK_METROS[densidadClave] ?? 100;
    const filtrados = calcularWaypointsDesdeTrack(trackActivo.puntos, densidadM);
    return filtrados.map((p, idx) => ({
      id: `${trackActivo.id}-p-${idx}`,
      nombre: `${trackActivo.nombre} #${idx + 1}`,
      lat: p.lat,
      lon: p.lon,
      creadoEn: p.ts || trackActivo.creadoEn,
    }));
  }, [trackActivo, ajustes.densidadWaypointsTrack]);

  const waypointSuelto = useMemo(() => {
    if (!destino || destino.tipo !== 'waypoint') return null;
    return waypointsPorId.get(destino.id) ?? null;
  }, [destino, waypointsPorId]);

  const elementoCapa = useMemo(() => {
    if (!destino) return null;
    if (
      destino.tipo === 'poligono' ||
      destino.tipo === 'linea' ||
      destino.tipo === 'punto-capa'
    ) {
      return buscarElementoCapa(bloquesCapas, destino.bloqueId, destino.capaId, destino.elementoId);
    }
    return null;
  }, [destino, bloquesCapas]);

  const coordsElementoCapa = useMemo(() => {
    if (!elementoCapa) return [];
    return extraerPuntos(elementoCapa.coords);
  }, [elementoCapa]);

  const waypointVirtual = useMemo(() => {
    if (!destino || !elementoCapa) return null;

    if (destino.tipo === 'poligono') {
      const centroide = calcularCentroide(coordsElementoCapa);
      if (!centroide) return null;
      return {
        id: `poly-${elementoCapa.id}`,
        nombre:
          elementoCapa.nombre?.trim() ||
          t('navegacion.destinoPoligono', { defaultValue: 'Polígono' }),
        lat: centroide[0],
        lon: centroide[1],
        creadoEn: Date.now(),
      };
    }

    if (destino.tipo === 'linea') {
      const ptCercano = calcularPuntoMasCercanoLinea(coordsElementoCapa, latActual, lonActual);
      if (!ptCercano) return null;
      return {
        id: `line-${elementoCapa.id}`,
        nombre:
          elementoCapa.nombre?.trim() ||
          t('navegacion.destinoLinea', { defaultValue: 'Línea' }),
        lat: ptCercano[0],
        lon: ptCercano[1],
        creadoEn: Date.now(),
      };
    }

    if (destino.tipo === 'punto-capa') {
      if (!coordsElementoCapa.length) return null;
      const [lat, lon] = coordsElementoCapa[0];
      return {
        id: `punto-${elementoCapa.id}`,
        nombre: elementoCapa.nombre?.trim() || 'Punto',
        lat,
        lon,
        creadoEn: Date.now(),
      };
    }

    return null;
  }, [destino, elementoCapa, coordsElementoCapa, latActual, lonActual, t]);

  const [indiceWaypointActual, setIndiceWaypointActual] = useState(0);

  const esRutaOTrack = !!(rutaActiva || trackActivo);
  const puntosDeSecuenciaBase = rutaActiva
    ? waypointsDeRuta
    : trackActivo
    ? waypointsDeTrack
    : [];

  const puntosDeSecuencia = useMemo(() => {
    if (direccionInvertida) {
      return puntosDeSecuenciaBase.slice().reverse();
    }
    return puntosDeSecuenciaBase;
  }, [puntosDeSecuenciaBase, direccionInvertida]);

  const waypointActual = esRutaOTrack
    ? puntosDeSecuencia[indiceWaypointActual] ?? null
    : waypointVirtual ?? waypointSuelto ?? waypointPuntualCapa;

  const totalWaypoints = esRutaOTrack ? puntosDeSecuencia.length : 1;
  const numeroWaypointTexto = esRutaOTrack
    ? `${indiceWaypointActual + 1}/${totalWaypoints}`
    : null;
  const sinDestino = !destino || !waypointActual;
  const hayDestinoSeleccionado = !sinDestino;

  // ─── BUG 1: reset derivado del destino, no de un useEffect ──────────
  // Identidad del destino para resetear estado sin que el keep-alive del
  // contenedor (NavegacionScreen) nos deje con estado viejo.
  const destinoKey = useMemo(() => {
    if (!destino) return 'libre';
    if (destino.tipo === 'waypoint') return `wp:${destino.id}`;
    if (destino.tipo === 'ruta') return `rt:${destino.id}`;
    if (destino.tipo === 'track') return `tk:${destino.id}`;
    return `${destino.tipo}:${destino.bloqueId}:${destino.capaId}:${destino.elementoId}`;
  }, [destino]);

  const ultimoDestinoKeyRef = useRef<string>(destinoKey);

  useEffect(() => {
    if (ultimoDestinoKeyRef.current === destinoKey) return;
    ultimoDestinoKeyRef.current = destinoKey;
    setIndiceWaypointActual(0);
    ultimoWaypointLlegadoRef.current = null;
    setDestinoSeleccionadoMapa(null);
    setNombreSeleccionadoMapa(null);
    setDireccionInvertida(false);
    saltarPitidoRef.current = false;
  }, [destinoKey]);

  useEffect(() => {
    if (grabacionRestauradaRef.current) return;
    grabacionRestauradaRef.current = true;
    const g = leerGrabacionPersistida();
    if (!g || g.puntos.length < 2) return;

    setPuntosTrack(g.puntos);
    setTrackIniciado(true);
    setRecorderEstado(g.estado);
    setAvisoHuecoTrack(true);

    const rec = crearRecorder();
    rec.arrancar();
    if (g.estado === 'paused') {
      rec.pausar();
    }

    window.setTimeout(() => setAvisoHuecoTrack(false), 8000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!trackIniciado) return;
    if (recorderEstado !== 'recording' && recorderEstado !== 'paused') return;
    persistirGrabacion({
      estado: recorderEstado,
      puntos: puntosTrack,
      iniciadoEn: puntosTrack[0]?.ts ?? Date.now(),
    });
  }, [puntosTrack, recorderEstado, trackIniciado]);

  // ─── Wake lock (dueño único: NavegarScreen) ────────────────────────
  useEffect(() => {
    let cancelado = false;
    void mantenerPantallaEncendida().then((h) => {
      if (!h) return;
      if (cancelado) {
        h.parar();
        return;
      }
      wakeLockRef.current = h;
    });
    return () => {
      cancelado = true;
      wakeLockRef.current?.parar();
      wakeLockRef.current = null;
    };
  }, []);

  // ─── GPS ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    const handle = iniciarGPS(
      (p) => {
        if (cancelado) return;
        setPosicion(p);
      },
      (e) => {
        if (cancelado) return;
        setEstadoGPS(e);
      },
      (motivo: MotivoErrorGPS) => {
        if (cancelado) return;
        if (motivo === 'permiso_denegado') {
          setAviso(
            t('navegacion.gps.permisoDenegado', {
              defaultValue: 'GPS denegado. Navegando en modo manual.',
            })
          );
          setModoManualActivo(true);
          setModalManualAbierto(true);
        } else if (motivo === 'no_disponible') {
          setAviso(
            t('navegacion.gps.noDisponible', {
              defaultValue: 'GPS no disponible. Navegando en modo manual.',
            })
          );
          setModoManualActivo(true);
          setModalManualAbierto(true);
        }
      },
      () => {
        if (cancelado) return;
        setAviso(
          t('navegacion.gps.sinSenal', {
            defaultValue: 'Sin señal GPS tras 30 s. Puedes pasar a modo manual.',
          })
        );
      }
    );
    gpsHandleRef.current = handle;

    return () => {
      cancelado = true;
      handle.parar();
      gpsHandleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Brújula ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    if (!tieneBrujula()) {
      setEstadoBrujula('no_soportado');
      return;
    }

    (async () => {
      try {
        const res = await pedirPermisoBrujula();
        if (cancelado) return;
        if (res !== 'granted') {
          setEstadoBrujula('permiso_denegado');
          return;
        }
        const handle = iniciarBrujula(
          (grados) => {
            if (cancelado) return;
            setRumboReal(grados);
          },
          (estado) => {
            if (cancelado) return;
            setEstadoBrujula(estado);
          }
        );
        brujulaHandleRef.current = handle;
      } catch (err) {
        if (cancelado) return;
        console.error('Error inicializando la brújula', err);
        setEstadoBrujula('no_soportado');
      }
    })();

    return () => {
      cancelado = true;
      brujulaHandleRef.current?.parar();
      brujulaHandleRef.current = null;
    };
  }, []);

  // ─── Map life-cycle: tamaño y centrado automático ──────────────────
  useEffect(() => {
    if (!mapInstance) return;
    const timer = window.setTimeout(() => {
      mapInstance.invalidateSize();
    }, 200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance || !contenedorMapaRef.current) return;
    const obs = new ResizeObserver(() => {
      mapInstance.invalidateSize();
    });
    obs.observe(contenedorMapaRef.current);
    return () => obs.disconnect();
  }, [mapInstance, contenedorMapaRef.current]);

  useEffect(() => {
    if (!mapInstance) return;
    const onDragStart = () => {
      pausarCentrado();
    };
    const onZoomStart = () => {
      pausarCentrado();
    };
    mapInstance.on('dragstart', onDragStart);
    mapInstance.on('zoomstart', onZoomStart);
    return () => {
      mapInstance.off('dragstart', onDragStart);
      mapInstance.off('zoomstart', onZoomStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance]);

  const pausarCentrado = () => {
    setCentradoAutomatico(false);
    pausaCentradoHastaRef.current = Date.now() + AUTO_CENTRADO_PAUSA_MS;
    if (pausaTimerRef.current) window.clearTimeout(pausaTimerRef.current);
    pausaTimerRef.current = window.setTimeout(() => {
      setCentradoAutomatico(true);
      pausaCentradoHastaRef.current = 0;
      pausaTimerRef.current = null;
    }, AUTO_CENTRADO_PAUSA_MS);
  };

  useEffect(() => {
    return () => {
      if (pausaTimerRef.current) window.clearTimeout(pausaTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    if (!centradoAutomatico) return;
    if (latActual == null || lonActual == null) return;
    mapInstance.setView([latActual, lonActual], mapInstance.getZoom());
  }, [latActual, lonActual, mapInstance, centradoAutomatico]);

  const handleCentrar = () => {
    if (pausaTimerRef.current) {
      window.clearTimeout(pausaTimerRef.current);
      pausaTimerRef.current = null;
    }
    pausaCentradoHastaRef.current = 0;
    setCentradoAutomatico(true);
    if (!mapInstance) return;

    // Primero: si hay GPS, centra en el kayak.
    if (latActual != null && lonActual != null) {
      mapInstance.flyTo([latActual, lonActual], 13);
      return;
    }

    // Si no hay GPS, encuadra todos los elementos visibles (absorbe MapaScreen).
    const todosPuntos: [number, number][] = [
      ...waypoints
        .filter((w) => (w.visible ?? true) !== false)
        .map((w) => [w.lat, w.lon] as [number, number]),
      ...rutas
        .filter((r) => (r.visible ?? true) !== false)
        .flatMap((r) =>
          r.waypointIds
            .map((id) => waypointsPorId.get(id))
            .filter((w): w is NonNullable<typeof w> => w != null)
            .filter((w) => (w.visible ?? true) !== false)
            .map((w) => [w.lat, w.lon] as [number, number])
        ),
      ...tracks
        .filter((t) => (t.visible ?? true) !== false)
        .flatMap((t) =>
          (Array.isArray(t.puntos) ? t.puntos : []).map(
            (p) => [p.lat, p.lon] as [number, number]
          )
        ),
    ];

    if (todosPuntos.length === 0) {
      mapInstance.flyTo([39.5, -0.5], 12);
      return;
    }
    if (todosPuntos.length === 1) {
      mapInstance.flyTo(todosPuntos[0], 15);
      return;
    }
    const bounds = L.latLngBounds(todosPuntos);
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  // ─── Guardar waypoint en posición actual ───────────────────────────
  const handleGuardarPosicionActual = async () => {
    try {
      let lat = latActual;
      let lon = lonActual;

      if (lat == null || lon == null) {
        const gps = await import('../../lib/navegacion/gps.ts');
        const p = await gps.leerPosicionPuntual();
        if (!p) {
          setAviso(
            t('navegacion.guardarPosicion.sinGps', {
              defaultValue: 'No se puede guardar la posición: no hay GPS ni lectura puntual disponible.',
            })
          );
          window.setTimeout(() => setAviso(null), 3000);
          return;
        }
        lat = p.lat;
        lon = p.lon;
      }

      const siguiente = waypoints.length + 1;
      const nombre = `Waypoint ${siguiente}`;
      await crearWaypointStore({
        nombre,
        lat,
        lon,
        color: '#00E56A',
      });
      setAviso(
        t('navegacion.guardarPosicion.guardado', {
          defaultValue: '{{nombre}} guardado',
          nombre,
        })
      );
      window.setTimeout(() => setAviso(null), 2200);
    } catch (err) {
      console.error('Error guardando posición actual', err);
      setAviso(
        t('navegacion.guardarPosicion.error', {
          defaultValue: 'Error guardando la posición.',
        })
      );
      window.setTimeout(() => setAviso(null), 3000);
    }
  };

  // ─── Modo manual ────────────────────────────────────────────────────
  const handleAplicarModoManual = (datos: DatosModoManual) => {
    setDatosManual(datos);
    setModoManualActivo(true);
    setModalManualAbierto(false);
  };

  // ─── Parar / guardar track ─────────────────────────────────────────
  const handleParar = () => {
    const rec = recorderRef.current;
    if (rec) rec.parar();
    const puntosGrabados = puntosTrack.slice();
    persistirGrabacion(null);
    setRecorderEstado('stopped');

    if (trackIniciado && puntosGrabados.length >= 2) {
      setModalGuardarTrack({
        puntos: puntosGrabados,
        nombreSugerido: nombreTrackPorDefecto(),
      });
      return;
    }

    gpsHandleRef.current?.parar();
    brujulaHandleRef.current?.parar();
    setPuntosTrack([]);
    setTrackIniciado(false);
    onCambiarDestino();
  };

  const handleGuardarTrack = async (nombre: string) => {
    if (!modalGuardarTrack) return;
    try {
      await crearTrackDesdeGrabacion(nombre, modalGuardarTrack.puntos);
      persistirGrabacion(null);
      setModalGuardarTrack(null);
      setAviso(t('navegacion.track.guardado', { defaultValue: 'Track guardado' }));
      window.setTimeout(() => {
        onCambiarDestino();
      }, 400);
    } catch (err) {
      console.error('Error guardando track', err);
      setAviso(t('navegacion.track.errorGuardar', { defaultValue: 'Error guardando el track.' }));
    }
  };

  const handleTirarTrack = () => {
    persistirGrabacion(null);
    setModalGuardarTrack(null);
    onCambiarDestino();
  };

  const handleCancelarGuardarTrack = () => {
    persistirGrabacion(null);
    setModalGuardarTrack(null);
    setPuntosTrack([]);
    setTrackIniciado(false);
    setRecorderEstado('idle');
    recorderRef.current = null;
  };

  // ─── Control de secuencia (rutas y tracks) ─────────────────────────
  const handleAvanzar = () => {
    if (!esRutaOTrack) return;
    if (indiceWaypointActual >= puntosDeSecuencia.length - 1) return;
    saltarPitidoRef.current = true;
    setIndiceWaypointActual((i) => Math.min(i + 1, puntosDeSecuencia.length - 1));
  };

  const handleRetroceder = () => {
    if (!esRutaOTrack) return;
    if (indiceWaypointActual <= 0) return;
    saltarPitidoRef.current = true;
    setIndiceWaypointActual((i) => Math.max(i - 1, 0));
  };

  // BUG 2: handleInvertir resetea índice y ultimoWaypointLlegadoRef
  // en el mismo tick. El extremo físico cambia de verdad.
  const handleInvertir = () => {
    if (!esRutaOTrack) return;
    const total = puntosDeSecuencia.length;
    if (total <= 1) return;
    const nuevoIndice = total - 1 - indiceWaypointActual;
    setDireccionInvertida((v) => !v);
    setIndiceWaypointActual(nuevoIndice);
    ultimoWaypointLlegadoRef.current = null;
    saltarPitidoRef.current = false;
  };

  // ─── Mapa: punto de partida, polylines ─────────────────────────────
  const centroMapa: [number, number] = (() => {
    if (latActual != null && lonActual != null) return [latActual, lonActual];
    if (waypointActual) return [waypointActual.lat, waypointActual.lon];
    return [39.5, -0.5];
  })();

  const rutaPolyline: [number, number][] = esRutaOTrack
    ? puntosDeSecuencia.map((w) => [w.lat, w.lon] as [number, number])
    : [];

  const marcadoresSecundarios = esRutaOTrack
    ? puntosDeSecuencia
        .map((w, i) => ({ w, i }))
        .filter(({ i }) => i !== indiceWaypointActual)
    : [];

  const waypointsStoreVisibles = waypoints.filter((w) => {
    if ((w.visible ?? true) === false) return false;
    if (waypointActual && 'id' in waypointActual && waypointActual.id === w.id) return false;
    return true;
  });

  const rutasVisibles = useMemo(() => {
    return rutas
      .filter((r) => (r.visible ?? true) !== false && r.id !== rutaActiva?.id)
      .map((r) => ({
        id: r.id,
        nombre: r.nombre,
        puntos: r.waypointIds
          .map((id) => waypointsPorId.get(id))
          .filter((w): w is NonNullable<typeof w> => w != null)
          .filter((w) => (w.visible ?? true) !== false)
          .map((w) => [w.lat, w.lon] as [number, number]),
      }))
      .filter((r) => r.puntos.length >= 2);
  }, [rutas, waypointsPorId, rutaActiva]);

  const tracksVisibles = useMemo(() => {
    return tracks
      .filter((t) => (t.visible ?? true) !== false && t.id !== trackActivo?.id)
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        puntos: (t.puntos ?? []).map((p) => [p.lat, p.lon] as [number, number]),
      }))
      .filter((t) => t.puntos.length >= 2);
  }, [tracks, trackActivo]);

  // ─── GPS / brújula, texto de estado ────────────────────────────────
  const estadoGPSTexto =
    estadoGPS === 'activo'
      ? t('navegacion.estadoGPS.activo', { defaultValue: 'GPS activo' })
      : estadoGPS === 'buscando'
      ? t('navegacion.estadoGPS.buscando', { defaultValue: 'Buscando señal' })
      : estadoGPS === 'error'
      ? t('navegacion.estadoGPS.error', { defaultValue: 'GPS no disponible' })
      : t('navegacion.estadoGPS.inactivo', { defaultValue: 'GPS inactivo' });

  const estadoGPSColor =
    estadoGPS === 'activo'
      ? 'var(--verdict-favorable)'
      : estadoGPS === 'buscando'
      ? 'var(--verdict-aceptable)'
      : estadoGPS === 'error'
      ? 'var(--verdict-desaconsejado)'
      : 'var(--text-dim)';

  const etiquetaTrack =
    recorderEstado === 'recording'
      ? t('navegacion.track.pausar', { defaultValue: 'Pausar track' })
      : recorderEstado === 'paused'
      ? t('navegacion.track.reanudar', { defaultValue: 'Reanudar track' })
      : t('navegacion.track.empezar', { defaultValue: 'Empezar a grabar' });

  const onClickTrack = () => {
    if (recorderEstado === 'recording') pausarTrack();
    else if (recorderEstado === 'paused') reanudarTrack();
    else empezarAGrabar();
  };

  const crearRecorder = () => {
    if (recorderRef.current) return recorderRef.current;
    const rec = crearTrackRecorder({
      onPunto: (p) => setPuntosTrack((prev) => [...prev, p]),
      onAutoguardado: () => {},
    });
    recorderRef.current = rec;
    return rec;
  };

  const empezarAGrabar = () => {
    const rec = crearRecorder();
    rec.arrancar();
    setRecorderEstado('recording');
    setTrackIniciado(true);
    setAviso(null);
  };

  const pausarTrack = () => {
    recorderRef.current?.pausar();
    setRecorderEstado('paused');
  };

  const reanudarTrack = () => {
    recorderRef.current?.reanudar();
    setRecorderEstado('recording');
  };

  const distanciaM = (() => {
    if (latActual == null || lonActual == null || !waypointActual) return null;
    return distanciaHaversine(latActual, lonActual, waypointActual.lat, waypointActual.lon);
  })();

  const rumboASeguir = (() => {
    if (latActual == null || lonActual == null || !waypointActual) return null;
    return bearingOrtodromico(latActual, lonActual, waypointActual.lat, waypointActual.lon);
  })();

  const etaTexto = formatearEta(distanciaM, velocidadMs);

  useEffect(() => {
    if (!waypointActual) return;
    if (distanciaM == null) return;
    if (distanciaM > ajustes.umbralLlegadaM) {
      if (ultimoWaypointLlegadoRef.current === waypointActual.id) {
        ultimoWaypointLlegadoRef.current = null;
      }
      return;
    }
    if (ultimoWaypointLlegadoRef.current === waypointActual.id) return;

    if (saltarPitidoRef.current) {
      saltarPitidoRef.current = false;
      ultimoWaypointLlegadoRef.current = waypointActual.id;
      return;
    }

    ultimoWaypointLlegadoRef.current = waypointActual.id;

    if (ajustes.sonidoLlegada) tocarPitidoLlegada();
    if (ajustes.vibracionLlegada) vibrarLlegada();

    setBannerLlegada(true);
    if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = window.setTimeout(() => {
      setBannerLlegada(false);
      bannerTimeoutRef.current = null;
    }, 3000);

    if (esRutaOTrack && indiceWaypointActual < puntosDeSecuencia.length - 1) {
      window.setTimeout(() => {
        setIndiceWaypointActual((i) => Math.min(i + 1, puntosDeSecuencia.length - 1));
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanciaM, waypointActual?.id]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  const tituloCabecera = destinoSeleccionadoMapa
    ? nombreSeleccionadoMapa || 'Destino seleccionado'
    : sinDestino
    ? t('navegacion.sinDestinoTitulo', { defaultValue: 'Navegación libre' })
    : waypointActual!.nombre;

  const mostrarNumero =
    !destinoSeleccionadoMapa && !sinDestino && !!numeroWaypointTexto;

  const handleElementoCapaClick: OnElementoClick = (
    bloqueId,
    capaId,
    elementoId,
    tipo
  ) => {
    const bloque = bloquesCapas.find((b) => b.id === bloqueId);
    const capa = bloque?.capas.find((c) => c.id === capaId);
    const el = capa?.elementos.find((e) => e.id === elementoId);
    const nombre =
      el?.nombre?.trim() ||
      (tipo === 'poligono' ? 'Polígono' : tipo === 'linea' ? 'Línea' : 'Punto');

    if (tipo === 'poligono') {
      setDestinoSeleccionadoMapa({ tipo: 'poligono', bloqueId, capaId, elementoId });
    } else if (tipo === 'linea') {
      setDestinoSeleccionadoMapa({ tipo: 'linea', bloqueId, capaId, elementoId });
    } else {
      setDestinoSeleccionadoMapa({ tipo: 'punto-capa', bloqueId, capaId, elementoId });
    }
    setNombreSeleccionadoMapa(nombre);
  };

  // ─── Crear waypoint (absorbe MapaScreen) ───────────────────────────
  const handleMapClick = (latlng: L.LatLng) => {
    if (modoCreacion) {
      setNombreNuevoWaypoint(`Waypoint ${waypoints.length + 1}`);
      setNuevoWaypointCoords({ lat: latlng.lat, lon: latlng.lng });
      setModoCreacion(false);
      return;
    }
    setDestinoSeleccionadoMapa(null);
    setNombreSeleccionadoMapa(null);
  };

  const handleGuardarWaypointNuevo = async (nombre: string) => {
    if (!nuevoWaypointCoords) return;
    try {
      await crearWaypointStore({
        nombre,
        lat: nuevoWaypointCoords.lat,
        lon: nuevoWaypointCoords.lon,
      });
      setNuevoWaypointCoords(null);
      setNombreNuevoWaypoint('');
      setAviso(`${nombre} creado`);
      window.setTimeout(() => setAviso(null), 2200);
    } catch (err) {
      console.error('Error creando waypoint', err);
      setAviso('Error creando waypoint');
      window.setTimeout(() => setAviso(null), 2200);
    }
  };

  // ─── Selección y navegación desde el mapa ──────────────────────────
  const handleMarcadorClick = (w: { id: string; nombre: string }) => {
    setDestinoSeleccionadoMapa({ tipo: 'waypoint', id: w.id });
    setNombreSeleccionadoMapa(w.nombre);
  };

  const handleRutaClick = (r: { id: string; nombre: string }) => {
    setDestinoSeleccionadoMapa({ tipo: 'ruta', id: r.id });
    setNombreSeleccionadoMapa(r.nombre);
  };

  const handleTrackClick = (tk: { id: string; nombre: string }) => {
    setDestinoSeleccionadoMapa({ tipo: 'track', id: tk.id });
    setNombreSeleccionadoMapa(tk.nombre);
  };

  const handleWaypointDrag = async (w: { id: string }, latlng: L.LatLng) => {
    try {
      await actualizarWaypoint(w.id, { lat: latlng.lat, lon: latlng.lng });
    } catch (err) {
      console.error('Error moviendo waypoint', err);
    }
  };

  const modoBrujula: 'norte' | 'rumbo' = 'norte';

  const rotacionKayak = Number.isFinite(rumboRealEfectivo ?? NaN)
    ? (rumboRealEfectivo as number)
    : 0;
  const kayakIconoRotado = useMemo(
    () =>
      L.divIcon({
        className: 'wkf-nav-kayak',
        html: `
          <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" style="transform:rotate(${rotacionKayak}deg);transition:transform 0.25s linear;">
              <ellipse cx="22" cy="22" rx="19" ry="19" fill="rgba(255,45,85,0.18)" stroke="#FF2D55" stroke-width="1" stroke-opacity="0.7"/>
              <path d="M 22 5
                       C 26 9 28 14 28 20
                       C 28 28 26 34 22 39
                       C 18 34 16 28 16 20
                       C 16 14 18 9 22 5 Z"
                    fill="#FF2D55" stroke="#0A0A0A" stroke-width="1.2"/>
              <path d="M 22 8
                       C 24.5 11 26 15 26 20
                       C 26 26 24.5 31 22 35
                       C 19.5 31 18 26 18 20
                       C 18 15 19.5 11 22 8 Z"
                    fill="none" stroke="#0A0A0A" stroke-width="0.8" stroke-opacity="0.55"/>
              <ellipse cx="22" cy="21" rx="3" ry="5" fill="#0A0A0A" stroke="#00E56A" stroke-width="0.8"/>
              <path d="M 22 3 L 20 6 L 24 6 Z" fill="#00E56A"/>
              <circle cx="22" cy="22" r="1.5" fill="#00E56A"/>
            </svg>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
    [rotacionKayak]
  );

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
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: estadoGPSColor,
              flexShrink: 0,
              boxShadow: `0 0 6px ${estadoGPSColor}`,
            }}
            title={estadoGPSTexto}
          />
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--accent)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {tituloCabecera}
          </div>
          {mostrarNumero && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono, Fira Code, monospace)',
                flexShrink: 0,
              }}
            >
              {numeroWaypointTexto}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
          }}
        >
          <button
            type="button"
            disabled={!destinoSeleccionadoMapa && !hayDestinoSeleccionado}
            onClick={() => {
              if (destinoSeleccionadoMapa) {
                onNavegarADestino?.(destinoSeleccionadoMapa);
                setDestinoSeleccionadoMapa(null);
                setNombreSeleccionadoMapa(null);
                return;
              }
              if (hayDestinoSeleccionado && destino) {
                onNavegarADestino?.(destino);
              }
            }}
            title={
              destinoSeleccionadoMapa
                ? `Navegar a ${nombreSeleccionadoMapa || 'destino'}`
                : hayDestinoSeleccionado
                ? 'Navegar a destino'
                : 'Selecciona un destino primero'
            }
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: `1px solid ${
                destinoSeleccionadoMapa || hayDestinoSeleccionado
                  ? 'var(--accent)'
                  : 'var(--border)'
              }`,
              backgroundColor:
                destinoSeleccionadoMapa || hayDestinoSeleccionado
                  ? 'rgba(0, 229, 106, 0.15)'
                  : 'var(--bg)',
              color:
                destinoSeleccionadoMapa || hayDestinoSeleccionado
                  ? 'var(--accent)'
                  : 'var(--text-dim)',
              fontSize: '1.05rem',
              fontWeight: 700,
              cursor:
                destinoSeleccionadoMapa || hayDestinoSeleccionado
                  ? 'pointer'
                  : 'not-allowed',
              opacity:
                destinoSeleccionadoMapa || hayDestinoSeleccionado ? 1 : 0.4,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                destinoSeleccionadoMapa || hayDestinoSeleccionado
                  ? '0 0 10px rgba(0, 229, 106, 0.3)'
                  : 'none',
            }}
          >
            ➤
          </button>
        </div>

        <button
          type="button"
          onClick={onCambiarDestino}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: `1px solid ${
              sinDestino ? 'var(--accent)' : 'var(--verdict-aceptable)'
            }`,
            backgroundColor: sinDestino
              ? 'rgba(0, 229, 106, 0.15)'
              : 'rgba(255, 234, 0, 0.15)',
            color: sinDestino
              ? 'var(--accent)'
              : 'var(--verdict-aceptable)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {sinDestino
            ? t('navegacion.elegirDestino', { defaultValue: 'Elegir destino' })
            : t('navegacion.cambiarDestino', { defaultValue: 'Cambiar destino' })}
        </button>
      </header>

      {bannerLlegada && (
        <div
          style={{
            flexShrink: 0,
            padding: '10px 14px',
            backgroundColor: 'rgba(0, 229, 106, 0.18)',
            borderBottom: '2px solid var(--accent)',
            color: 'var(--accent)',
            fontSize: '0.9rem',
            fontWeight: 800,
            textAlign: 'center',
            letterSpacing: '0.04em',
          }}
        >
          ✓ {t('navegacion.llegada', { defaultValue: '¡Has llegado al destino!' })}
        </div>
      )}

      {avisoHuecoTrack && (
        <div
          style={{
            flexShrink: 0,
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 138, 0, 0.15)',
            borderBottom: '1px solid var(--verdict-exigente)',
            color: 'var(--verdict-exigente)',
            fontSize: '0.78rem',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          ⚠️ Grabación reanudada. Entre el último punto guardado y el nuevo
          puede haber una raya recta: el track no se ha cortado, solo ha
          estado unos segundos sin grabar.
        </div>
      )}

      {aviso && (
        <div
          style={{
            flexShrink: 0,
            padding: '7px 12px',
            backgroundColor: 'rgba(0, 184, 255, 0.15)',
            borderBottom: '1px solid var(--accent-2)',
            color: 'var(--accent-2)',
            fontSize: '0.78rem',
            textAlign: 'center',
          }}
        >
          {aviso}
        </div>
      )}

      <div
        style={{
          flexShrink: 0,
          flex: 1,
          minHeight: 240,
          position: 'relative',
        }}
      >
        <div ref={contenedorMapaRef} style={{ width: '100%', height: '100%' }}>
          <MapContainer
            center={centroMapa}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
          <MapController onMap={setMapInstance} />
          <MapClickHandler onMapClick={handleMapClick} />
          <MapaTacticoLayer filtro={filtroMapa} />

          <CapaMapa bloques={bloquesCapas} onElementoClick={handleElementoCapaClick} />

          {rutaPolyline.length >= 2 && (
            <Polyline
              positions={rutaPolyline}
              pathOptions={{
                color: '#00E56A',
                weight: 2,
                opacity: 0.55,
                dashArray: '4 4',
              }}
            />
          )}

          {latActual != null && lonActual != null && waypointActual && (
            <Polyline
              positions={[
                [latActual, lonActual],
                [waypointActual.lat, waypointActual.lon],
              ]}
              pathOptions={{
                color: '#00B8FF',
                weight: 2,
                opacity: 0.45,
                dashArray: '6 6',
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false,
              }}
            />
          )}

          {destino?.tipo === 'poligono' && coordsElementoCapa.length >= 3 && (
            <Polygon
              positions={coordsElementoCapa}
              pathOptions={{
                color: elementoCapa?.estilo?.color || '#00E56A',
                weight: 3,
                opacity: 0.85,
                fillColor:
                  elementoCapa?.estilo?.relleno ||
                  elementoCapa?.estilo?.color ||
                  '#00E56A',
                fillOpacity: 0.22,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {destino?.tipo === 'linea' && coordsElementoCapa.length >= 2 && (
            <Polyline
              positions={coordsElementoCapa}
              pathOptions={{
                color: elementoCapa?.estilo?.color || '#00E56A',
                weight: 4,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {destino?.tipo === 'punto-capa' && coordsElementoCapa.length >= 1 && (
            <Marker
              position={coordsElementoCapa[0]}
              icon={renderIcono(elementoCapa?.estilo?.color || '#00E56A', 'destino')}
              interactive={false}
            />
          )}

          {rutasVisibles.map((r) => {
            const isSelected =
              destinoSeleccionadoMapa?.tipo === 'ruta' &&
              destinoSeleccionadoMapa.id === r.id;
            return (
              <React.Fragment key={`ruta-nav-${r.id}`}>
                <Polyline
                  positions={r.puntos}
                  pathOptions={{
                    color: isSelected ? '#00E56A' : '#00B8FF',
                    weight: isSelected ? 4 : 3,
                    opacity: isSelected ? 1 : 0.65,
                    dashArray: '6 6',
                  }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      handleRutaClick(r);
                    },
                  }}
                />
                <Polyline
                  positions={r.puntos}
                  pathOptions={{ weight: 24, opacity: 0, interactive: true }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      handleRutaClick(r);
                    },
                  }}
                />
              </React.Fragment>
            );
          })}

          {tracksVisibles.map((tk) => {
            const isSelected =
              destinoSeleccionadoMapa?.tipo === 'track' &&
              destinoSeleccionadoMapa.id === tk.id;
            return (
              <React.Fragment key={`track-nav-${tk.id}`}>
                <Polyline
                  positions={tk.puntos}
                  pathOptions={{
                    color: isSelected ? '#00E56A' : '#FF8A00',
                    weight: isSelected ? 4 : 3,
                    opacity: isSelected ? 1 : 0.65,
                  }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      handleTrackClick(tk);
                    },
                  }}
                />
                <Polyline
                  positions={tk.puntos}
                  pathOptions={{ weight: 24, opacity: 0, interactive: true }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      handleTrackClick(tk);
                    },
                  }}
                />
              </React.Fragment>
            );
          })}

          {waypointsStoreVisibles.map((w) => {
            const isSelected =
              destinoSeleccionadoMapa?.tipo === 'waypoint' &&
              destinoSeleccionadoMapa.id === w.id;
            return (
              <Marker
                key={`store-${w.id}`}
                position={[w.lat, w.lon]}
                icon={renderIcono(
                  w.color || '#00E56A',
                  isSelected ? 'destino' : 'normal'
                )}
                draggable={true}
                interactive={true}
                bubblingMouseEvents={false}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    handleMarcadorClick(w);
                  },
                  dragend: (e) => {
                    const marker = e.target as L.Marker;
                    const latlng = marker.getLatLng();
                    void handleWaypointDrag(w, latlng);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  {w.nombre}
                </Tooltip>
              </Marker>
            );
          })}

          {marcadoresSecundarios.map(({ w }) => (
            <Marker
              key={`sec-${w.id}`}
              position={[w.lat, w.lon]}
              icon={renderIcono(
                (w as { color?: string }).color || '#00E56A',
                'secundario'
              )}
              interactive={false}
            />
          ))}

          {waypointActual && (
            <Marker
              position={[waypointActual.lat, waypointActual.lon]}
              icon={renderIcono(
                (waypointActual as { color?: string }).color || '#00E56A',
                'destino'
              )}
              interactive={false}
            />
          )}

          {latActual != null && lonActual != null && (
            <Marker
              position={[latActual, lonActual]}
              icon={kayakIconoRotado}
              interactive={false}
            />
          )}
        </MapContainer>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <BrujulaNavegacion
            heading={rumboRealEfectivo ?? 0}
            modo={modoBrujula}
            size={110}
            color="#00E56A"
            glow
          />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => setModoCreacion(!modoCreacion)}
            title={modoCreacion ? 'Cancelar creación' : 'Crear waypoint'}
            aria-label={modoCreacion ? 'Cancelar creación' : 'Crear waypoint'}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: `1px solid ${
                modoCreacion
                  ? 'var(--verdict-desaconsejado, #ef4444)'
                  : 'var(--accent, #00E56A)'
              }`,
              backgroundColor: 'var(--surface)',
              color: modoCreacion
                ? 'var(--verdict-desaconsejado, #ef4444)'
                : 'var(--accent, #00E56A)',
              fontSize: '1.2rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            +
          </button>

          <button
            type="button"
            onClick={() => setModalManualAbierto(true)}
            title={t('navegacion.manual.boton', { defaultValue: 'Modo manual' })}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: `1px solid ${modoManualActivo ? 'var(--accent-2)' : 'var(--border)'}`,
              backgroundColor: 'var(--surface)',
              color: modoManualActivo ? 'var(--accent-2)' : 'var(--text)',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            ✎
          </button>

          <button
            type="button"
            onClick={handleCentrar}
            title={t('navegacion.centrar', { defaultValue: 'Centrar mapa' })}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            ◎
          </button>

          <button
            type="button"
            onClick={() => {
              const idx = ORDEN_FILTROS.indexOf(filtroMapa);
              const siguiente = ORDEN_FILTROS[(idx + 1) % ORDEN_FILTROS.length];
              setFiltroMapa(siguiente);
            }}
            title={t('navegacion.cambiarMapa', { defaultValue: 'Cambiar mapa' })}
            aria-label={t('navegacion.cambiarMapa', { defaultValue: 'Cambiar mapa' })}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            🗺️
          </button>

          {esRutaOTrack && (
            <>
              <button
                type="button"
                onClick={handleRetroceder}
                disabled={indiceWaypointActual <= 0}
                title="Waypoint anterior"
                aria-label="Waypoint anterior"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${
                    indiceWaypointActual > 0 ? 'var(--accent)' : 'var(--border)'
                  }`,
                  backgroundColor: 'var(--surface)',
                  color:
                    indiceWaypointActual > 0
                      ? 'var(--accent)'
                      : 'var(--text-muted, #888)',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor:
                    indiceWaypointActual > 0 ? 'pointer' : 'not-allowed',
                  opacity: indiceWaypointActual > 0 ? 1 : 0.4,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
              >
                ⏮
              </button>

              <button
                type="button"
                onClick={handleAvanzar}
                disabled={indiceWaypointActual >= puntosDeSecuencia.length - 1}
                title="Waypoint siguiente"
                aria-label="Waypoint siguiente"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${
                    indiceWaypointActual < puntosDeSecuencia.length - 1
                      ? 'var(--accent)'
                      : 'var(--border)'
                  }`,
                  backgroundColor: 'var(--surface)',
                  color:
                    indiceWaypointActual < puntosDeSecuencia.length - 1
                      ? 'var(--accent)'
                      : 'var(--text-muted, #888)',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor:
                    indiceWaypointActual < puntosDeSecuencia.length - 1
                      ? 'pointer'
                      : 'not-allowed',
                  opacity:
                    indiceWaypointActual < puntosDeSecuencia.length - 1
                      ? 1
                      : 0.4,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
              >
                ⏭
              </button>

              <button
                type="button"
                onClick={handleInvertir}
                title={
                  direccionInvertida
                    ? 'Volver al sentido original'
                    : 'Invertir sentido de la ruta'
                }
                aria-label={
                  direccionInvertida
                    ? 'Volver al sentido original'
                    : 'Invertir sentido de la ruta'
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${
                    direccionInvertida
                      ? 'var(--verdict-aceptable)'
                      : 'var(--border)'
                  }`,
                  backgroundColor: 'var(--surface)',
                  color: direccionInvertida
                    ? 'var(--verdict-aceptable)'
                    : 'var(--text)',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
              >
                ⇄
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => mapInstance?.zoomIn()}
            title="Acercar"
            aria-label="Acercar"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '1.1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            +
          </button>

          <button
            type="button"
            onClick={() => mapInstance?.zoomOut()}
            title="Alejar"
            aria-label="Alejar"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '1.1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            −
          </button>
        </div>

        <button
          type="button"
          onClick={handleGuardarPosicionActual}
          title={t('navegacion.guardarPosicion.boton', { defaultValue: 'Guardar posición actual' })}
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            zIndex: 1000,
            width: 48,
            height: 48,
            borderRadius: 24,
            border: '2px solid var(--accent)',
            backgroundColor: 'rgba(0, 229, 106, 0.15)',
            color: 'var(--accent)',
            fontSize: '1.3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
          }}
        >
          📌
        </button>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '10px 10px 12px',
          backgroundColor: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <PanelDatosNavegacion
          distanciaM={sinDestino ? null : distanciaM}
          rumboASeguir={sinDestino ? null : rumboASeguir}
          rumboReal={rumboRealEfectivo}
          velocidadMs={velocidadMs}
          velocidadTexto={velocidadTexto}
          eta={sinDestino ? null : etaTexto}
          modoManual={modoManualActivo}
          rumboManual={rumboManual}
        />

        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <button
            type="button"
            onClick={onClickTrack}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: 8,
              border:
                recorderEstado === 'recording'
                  ? '1px solid var(--verdict-aceptable)'
                  : recorderEstado === 'paused'
                  ? '1px solid var(--verdict-exigente)'
                  : '1px solid var(--accent)',
              backgroundColor:
                recorderEstado === 'recording'
                  ? 'rgba(229, 229, 0, 0.15)'
                  : recorderEstado === 'paused'
                  ? 'rgba(255, 138, 0, 0.15)'
                  : 'rgba(0, 229, 106, 0.15)',
              color:
                recorderEstado === 'recording'
                  ? 'var(--verdict-aceptable)'
                  : recorderEstado === 'paused'
                  ? 'var(--verdict-exigente)'
                  : 'var(--accent)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              minWidth: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {recorderEstado === 'recording' ? '⏸' : recorderEstado === 'paused' ? '▶' : '⏺'}{' '}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {etiquetaTrack}
            </span>
          </button>

          <button
            type="button"
            onClick={handleParar}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--verdict-desaconsejado)',
              backgroundColor: 'rgba(255, 45, 85, 0.15)',
              color: 'var(--verdict-desaconsejado)',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            ⏹ {t('navegacion.parar', { defaultValue: 'Parar' })}
          </button>
        </div>
      </div>

      {nuevoWaypointCoords && (
        <ModalNuevoWaypoint
          nombreInicial={nombreNuevoWaypoint}
          coords={nuevoWaypointCoords}
          onGuardar={handleGuardarWaypointNuevo}
          onCerrar={() => {
            setNuevoWaypointCoords(null);
            setNombreNuevoWaypoint('');
          }}
        />
      )}

      {modalManualAbierto && (
        <ModoManualModal
          rumboInicial={datosManual?.rumboGrados ?? rumboRealEfectivo ?? 0}
          proaInicial={datosManual?.proaCardinal ?? 'N'}
          pedirProa={estadoBrujula !== 'activo'}
          onAplicar={handleAplicarModoManual}
          onCancelar={() => setModalManualAbierto(false)}
        />
      )}

      {modalGuardarTrack && (
        <ModalGuardarTrack
          nombreSugerido={modalGuardarTrack.nombreSugerido}
          onGuardar={handleGuardarTrack}
          onTirar={handleTirarTrack}
          onCancelar={handleCancelarGuardarTrack}
        />
      )}
    </div>
  );
};

export default NavegarScreen;
// src/screens/Navegacion/NavegarScreen.tsx