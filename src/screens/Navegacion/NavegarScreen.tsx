// src/screens/Navegacion/NavegarScreen.tsx
// WKF — Pantalla de navegación completa (F6.5c + Fase D).
//
// Integra:
//   - Mapa Leaflet con zoom 13, tile OSM estándar, marcador del
//     kayak, marcador del waypoint actual, línea quebrada si es ruta.
//   - BrújulaNavegacion encima del mapa (esquina superior derecha).
//   - PanelDatosNavegacion abajo.
//   - Botones flotantes: Parar (grande, abajo), Pausar/Reanudar/
//     Empezar a grabar (track), Centrar mapa, Cambiar destino,
//     Guardar posición actual.
//   - Listeners de gps.ts, brujula.ts y track-recorder.ts.
//   - Modo manual puro (sin GPS y sin brújula) con rumbo, velocidad
//     y proa tecleados. Botón para abrir ModoManualModal.
//   - Aviso de llegada con banner + pitido + vibración.
//
// Fase D (D3 aplicado a mano):
//   - Cabecera limpia: solo GPS + nombre + Cambiar destino. Sin N/M.
//   - Velocidad formateada con la unidad de Ajustes (unidadVelocidad).
//   - PanelDatosNavegacion recibe `velocidadTexto` ya formateada.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAppStore } from '../../state/store.ts';
import { useNavegacionStore } from '../../state/navegacion-store.ts';
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
import type { PuntoTrack } from '../../db/tracks-repo.ts';

export type DestinoNavegacion =
  | { tipo: 'waypoint'; id: string }
  | { tipo: 'ruta'; id: string }
  | { tipo: 'track'; id: string };

export interface NavegarScreenProps {
  destino: DestinoNavegacion | null;
  onCambiarDestino: () => void;
}

// ─────────────────────────────────────────────────────────────
// Iconos Leaflet
// ─────────────────────────────────────────────────────────────

const PIN_WAYPOINT_ICON = L.divIcon({
  className: 'wkf-nav-waypoint-pin',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="16" r="11" stroke="#00E56A" stroke-width="2.5" fill="#0A0A0A"/>
      <circle cx="20" cy="16" r="3.5" fill="#00E56A"/>
      <path d="M20 28 L17 34 L20 32.5 L23 34 Z" fill="#00E56A"/>
    </svg>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 32],
});

const PIN_WAYPOINT_SECUNDARIO_ICON = L.divIcon({
  className: 'wkf-nav-waypoint-sec',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="10" stroke="#00E56A" stroke-width="3" fill="#0A0A0A" opacity="0.7"/>
      <circle cx="20" cy="20" r="3" fill="#00E56A" opacity="0.85"/>
    </svg>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const KAYAK_ICON = L.divIcon({
  className: 'wkf-nav-kayak',
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="14" stroke="#00B8FF" stroke-width="2.5" fill="rgba(0, 184, 255, 0.25)"/>
      <circle cx="20" cy="20" r="6" fill="#00B8FF"/>
      <circle cx="20" cy="20" r="2" fill="#0A0A0A"/>
    </svg>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// ─────────────────────────────────────────────────────────────
// Controlador del mapa (para setView / flyTo)
// ─────────────────────────────────────────────────────────────

const MapController: React.FC<{ onMap: (map: L.Map) => void }> = ({ onMap }) => {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

// ─────────────────────────────────────────────────────────────
// Pitido de llegada (AudioContext)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────

function formatearEta(
  metros: number | null,
  velocidadMs: number | null
): string | null {
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

function nombreTrackPorDefecto(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `Track ${yyyy}-${mm}-${dd} ${hh}:${mi}`;
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
  unidad: UnidadVelocidad
): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  let valor: number;
  switch (unidad) {
    case 'kt':
      valor = ms * 1.9438444924406;
      break;
    case 'kmh':
      valor = ms * 3.6;
      break;
    case 'mph':
      valor = ms * 2.2369362920544;
      break;
    case 'ms':
      valor = ms;
      break;
  }
  return `${valor.toFixed(1)} ${SUFIJO_UNIDAD_VELOCIDAD[unidad]}`;
}

// ─────────────────────────────────────────────────────────────
// Modal "¿Guardar track?" al parar
// ─────────────────────────────────────────────────────────────

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
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--accent)',
          }}
        >
          {t('navegacion.track.guardarTitulo', {
            defaultValue: '¿Guardar el track?',
          })}
        </h3>
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: '0.82rem',
            color: 'var(--text-dim)',
            lineHeight: 1.5,
          }}
        >
          {t('navegacion.track.guardarIntro', {
            defaultValue:
              'Puedes guardarlo para repetir este recorrido en otra ocasión, o tirarlo si no te interesa.',
          })}
        </p>

        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          {t('navegacion.track.nombreLabel', {
            defaultValue: 'Nombre del track',
          })}
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

// ─────────────────────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────────────────────

export const NavegarScreen: React.FC<NavegarScreenProps> = ({
  destino,
  onCambiarDestino,
}) => {
  const { t } = useTranslation();

  // Store global de ajustes (persistido).
  const ajustes = useAppStore((s) => s.ajustes);

  // Store de navegación (waypoints, rutas, tracks, acciones).
  const waypoints = useNavegacionStore((s) => s.waypoints);
  const rutas = useNavegacionStore((s) => s.rutas);
  const tracks = useNavegacionStore((s) => s.tracks);
  const crearTrackDesdeGrabacion = useNavegacionStore(
    (s) => s.crearTrackDesdeGrabacion
  );
  const crearWaypointStore = useNavegacionStore((s) => s.crearWaypoint);

  // ── Resolución del waypoint actual y de la ruta completa ─────
  const waypointsPorId = useMemo(() => {
    const m = new Map<string, typeof waypoints[number]>();
    for (const w of waypoints) m.set(w.id, w);
    return m;
  }, [waypoints]);

  const trackDestino = useMemo(() => {
    if (!destino || destino.tipo !== 'track') return null;
    return tracks.find((t) => t.id === destino.id) ?? null;
  }, [destino, tracks]);

  const rutaActiva = useMemo(() => {
    if (!destino) return null;
    if (destino.tipo === 'ruta') {
      return rutas.find((r) => r.id === destino.id) ?? null;
    }
    if (destino.tipo === 'track' && trackDestino?.rutaId) {
      return rutas.find((r) => r.id === trackDestino.rutaId) ?? null;
    }
    return null;
  }, [destino, rutas, trackDestino]);

  const waypointsDeRuta = useMemo(() => {
    if (rutaActiva) {
      return rutaActiva.waypointIds
        .map((id) => waypointsPorId.get(id))
        .filter((w): w is NonNullable<typeof w> => w != null);
    }
    if (destino?.tipo === 'track' && trackDestino) {
      return (trackDestino.puntos || []).map((p, idx) => ({
        id: `track-wp-${trackDestino.id}-${idx}`,
        nombre: `${trackDestino.nombre} #${idx + 1}`,
        lat: p.lat,
        lon: p.lon,
        creadoEn: p.ts || trackDestino.creadoEn || Date.now(),
      }));
    }
    return [];
  }, [rutaActiva, waypointsPorId, destino, trackDestino]);

  const waypointSuelto = useMemo(() => {
    if (!destino || destino.tipo !== 'waypoint') return null;
    return waypointsPorId.get(destino.id) ?? null;
  }, [destino, waypointsPorId]);

  const [indiceWaypointActual, setIndiceWaypointActual] = useState(0);

  useEffect(() => {
    setIndiceWaypointActual(0);
  }, [destino?.tipo, (destino as { id?: string })?.id]);

  const esRutaOTrack =
    Boolean(rutaActiva) ||
    (destino?.tipo === 'track' && waypointsDeRuta.length > 0);

  // El waypoint actual (destino de la aguja).
  const waypointActual = esRutaOTrack
    ? waypointsDeRuta[indiceWaypointActual] ?? null
    : waypointSuelto;

  const tituloCabecera =
    destino?.tipo === 'track' && !rutaActiva && trackDestino
      ? trackDestino.nombre
      : waypointActual?.nombre ?? '';

  // ── Estado del GPS, brújula, modo manual y recorder ──────────
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
  const [centradoAutomatico, setCentradoAutomatico] = useState(true);
  const [recorderEstado, setRecorderEstado] = useState<EstadoRecorder>('idle');
  const [puntosTrack, setPuntosTrack] = useState<PuntoTrack[]>([]);
  const [trackIniciado, setTrackIniciado] = useState(false);

  const [modalGuardarTrack, setModalGuardarTrack] = useState<{
    puntos: PuntoTrack[];
    nombreSugerido: string;
  } | null>(null);

  const gpsHandleRef = useRef<GPSHandle | null>(null);
  const brujulaHandleRef = useRef<BrujulaHandle | null>(null);
  const recorderRef = useRef<TrackRecorder | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);
  const ultimoWaypointLlegadoRef = useRef<string | null>(null);

  // ── GPS ─────────────────────────────────────────────────────
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
            defaultValue:
              'Sin señal GPS tras 30 s. Puedes pasar a modo manual.',
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

  // ── Brújula del móvil ───────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    if (!tieneBrujula()) {
      setEstadoBrujula('no_soportado');
      return;
    }

    (async () => {
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
    })();

    return () => {
      cancelado = true;
      brujulaHandleRef.current?.parar();
      brujulaHandleRef.current = null;
    };
  }, []);

  // ── Track recorder (se crea al pulsar "Empezar a grabar") ───
  const crearRecorder = () => {
    if (recorderRef.current) return recorderRef.current;
    const rec = crearTrackRecorder({
      onPunto: (p) => {
        setPuntosTrack((prev) => [...prev, p]);
      },
      onAutoguardado: () => {
        // El autoguardado a IndexedDB se gestiona dentro del
        // propio track-recorder. Aquí solo reflejamos estado.
      },
    });
    recorderRef.current = rec;
    return rec;
  };

  const empezarAGrabar = () => {
    const rec = crearRecorder();
    rec.arrancar();
    setRecorderEstado(rec.estado());
    setTrackIniciado(true);
    setAviso(null);
  };

  const pausarTrack = () => {
    recorderRef.current?.pausar();
    if (recorderRef.current) setRecorderEstado(recorderRef.current.estado());
  };

  const reanudarTrack = () => {
    recorderRef.current?.reanudar();
    if (recorderRef.current) setRecorderEstado(recorderRef.current.estado());
  };

  // ── Cálculo distancia / rumbo / ETA ─────────────────────────
  const latActual = modoManualActivo ? null : posicion?.lat ?? null;
  const lonActual = modoManualActivo ? null : posicion?.lon ?? null;
  const velocidadMs =
    modoManualActivo && datosManual
      ? datosManual.velocidadKt * 0.514444
      : posicion?.velocidad ?? null;

  const unidadVelocidad: UnidadVelocidad =
    ajustes.unidadVelocidad === 'kmh' ||
    ajustes.unidadVelocidad === 'mph' ||
    ajustes.unidadVelocidad === 'ms' ||
    ajustes.unidadVelocidad === 'kt'
      ? ajustes.unidadVelocidad
      : 'kt';

  const velocidadTexto = formatearVelocidadUsuario(velocidadMs, unidadVelocidad);

  const rumboRealEfectivo = (() => {
    if (rumboReal != null) return rumboReal;
    if (posicion?.rumbo != null) return posicion.rumbo;
    if (modoManualActivo && datosManual) return datosManual.rumboGrados;
    return null;
  })();

  const distanciaM = (() => {
    if (latActual == null || lonActual == null || !waypointActual) return null;
    return distanciaHaversine(
      latActual,
      lonActual,
      waypointActual.lat,
      waypointActual.lon
    );
  })();

  const rumboASeguir = (() => {
    if (latActual == null || lonActual == null || !waypointActual) return null;
    return bearingOrtodromico(
      latActual,
      lonActual,
      waypointActual.lat,
      waypointActual.lon
    );
  })();

  const etaTexto = formatearEta(distanciaM, velocidadMs);

  // ── Detección de llegada ────────────────────────────────────
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

    ultimoWaypointLlegadoRef.current = waypointActual.id;

    if (ajustes.sonidoLlegada) tocarPitidoLlegada();
    if (ajustes.vibracionLlegada) vibrarLlegada();

    setBannerLlegada(true);
    if (bannerTimeoutRef.current) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      setBannerLlegada(false);
      bannerTimeoutRef.current = null;
    }, 3000);

    if (esRutaOTrack && indiceWaypointActual < waypointsDeRuta.length - 1) {
      window.setTimeout(() => {
        setIndiceWaypointActual((i) => Math.min(i + 1, waypointsDeRuta.length - 1));
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanciaM, waypointActual?.id]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  // ── Centrado del mapa ───────────────────────────────────────
  useEffect(() => {
    if (!mapInstance) return;
    if (!centradoAutomatico) return;
    if (latActual == null || lonActual == null) return;
    mapInstance.setView([latActual, lonActual], mapInstance.getZoom());
  }, [latActual, lonActual, mapInstance, centradoAutomatico]);

  // ── Botones ─────────────────────────────────────────────────
  const handleCentrar = () => {
    setCentradoAutomatico(true);
    if (mapInstance && latActual != null && lonActual != null) {
      mapInstance.flyTo([latActual, lonActual], 13);
    }
  };

  const handleGuardarPosicionActual = async () => {
    // Un solo toque, sin diálogo. Guarda como "Waypoint N".
    let lat = latActual;
    let lon = lonActual;

    if (lat == null || lon == null) {
      const { leerPosicionPuntual } = await import(
        '../../lib/navegacion/gps.ts'
      );
      const p = await leerPosicionPuntual();
      if (!p) {
        setAviso(
          t('navegacion.guardarPosicion.sinGps', {
            defaultValue:
              'No se puede guardar la posición: no hay GPS ni lectura puntual disponible.',
          })
        );
        window.setTimeout(() => setAviso(null), 3000);
        return;
      }
      lat = p.lat;
      lon = p.lon;
    }

    try {
      const siguiente = waypoints.length + 1;
      const nombre = `Waypoint ${siguiente}`;
      await crearWaypointStore({ nombre, lat, lon });
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

  const handleAplicarModoManual = (datos: DatosModoManual) => {
    setDatosManual(datos);
    setModoManualActivo(true);
    setModalManualAbierto(false);
  };

  const handleParar = () => {
    gpsHandleRef.current?.parar();
    brujulaHandleRef.current?.parar();

    const rec = recorderRef.current;
    if (rec) {
      rec.parar();
    }
    const puntosGrabados = puntosTrack.slice();

    if (trackIniciado && puntosGrabados.length >= 2) {
      setModalGuardarTrack({
        puntos: puntosGrabados,
        nombreSugerido: nombreTrackPorDefecto(),
      });
      return;
    }

    onCambiarDestino();
  };

  const handleGuardarTrack = async (nombre: string) => {
    if (!modalGuardarTrack) return;
    try {
      await crearTrackDesdeGrabacion(nombre, modalGuardarTrack.puntos);
      setModalGuardarTrack(null);
      setAviso(
        t('navegacion.track.guardado', {
          defaultValue: 'Track guardado',
        })
      );
      window.setTimeout(() => {
        onCambiarDestino();
      }, 400);
    } catch (err) {
      console.error('Error guardando track', err);
      setAviso(
        t('navegacion.track.errorGuardar', {
          defaultValue: 'Error guardando el track.',
        })
      );
    }
  };

  const handleTirarTrack = () => {
    setModalGuardarTrack(null);
    onCambiarDestino();
  };

  const handleCancelarGuardarTrack = () => {
    setModalGuardarTrack(null);
    setPuntosTrack([]);
    setTrackIniciado(false);
    setRecorderEstado('idle');
    recorderRef.current = null;
  };

  // ── Render ──────────────────────────────────────────────────
  const centroMapa: [number, number] = (() => {
    if (latActual != null && lonActual != null) return [latActual, lonActual];
    if (waypointActual) return [waypointActual.lat, waypointActual.lon];
    return [39.5, -0.5];
  })();

  const rutaPolyline: [number, number][] = esRutaOTrack
    ? waypointsDeRuta.map((w) => [w.lat, w.lon] as [number, number])
    : [];

  const marcadoresSecundarios = rutaActiva
    ? waypointsDeRuta
        .map((w, i) => ({ w, i }))
        .filter(({ i }) => i !== indiceWaypointActual)
    : [];

  if (!destino || !waypointActual) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--text-dim)',
          gap: 16,
        }}
      >
        <div style={{ fontSize: '2rem', opacity: 0.5 }}>➤</div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.5, maxWidth: 400 }}>
          {t('navegacion.sinDestino', {
            defaultValue:
              'No hay ningún waypoint o ruta seleccionado. Vuelve a la lista y pulsa "Navegar".',
          })}
        </div>
        <button
          type="button"
          onClick={onCambiarDestino}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid var(--accent)',
            backgroundColor: 'var(--accent)',
            color: '#000',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('navegacion.volverLista', { defaultValue: 'Ir a waypoints' })}
        </button>
      </div>
    );
  }

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
    if (recorderEstado === 'recording') {
      pausarTrack();
    } else if (recorderEstado === 'paused') {
      reanudarTrack();
    } else {
      empezarAGrabar();
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
      {/* Cabecera */}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            flex: 1,
          }}
        >
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
        </div>

        <button
          type="button"
          onClick={onCambiarDestino}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('navegacion.cambiarDestino', {
            defaultValue: 'Cambiar destino',
          })}
        </button>
      </header>

      {/* Banner de llegada */}
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
          ✓{' '}
          {t('navegacion.llegada', {
            defaultValue: '¡Has llegado al waypoint!',
          })}
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

      {/* Mapa */}
      <div
        style={{
          flexShrink: 0,
          flex: 1,
          minHeight: 240,
          position: 'relative',
        }}
      >
        <MapContainer
          center={centroMapa}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapController onMap={setMapInstance} />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

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

          {marcadoresSecundarios.map(({ w }) => (
            <Marker
              key={`sec-${w.id}`}
              position={[w.lat, w.lon]}
              icon={PIN_WAYPOINT_SECUNDARIO_ICON}
              interactive={false}
            />
          ))}

          {waypointActual && (
            <Marker
              position={[waypointActual.lat, waypointActual.lon]}
              icon={PIN_WAYPOINT_ICON}
              interactive={false}
            />
          )}

          {latActual != null && lonActual != null && (
            <Marker
              position={[latActual, lonActual]}
              icon={KAYAK_ICON}
              interactive={false}
            />
          )}
        </MapContainer>

        {/* Brújula superpuesta, esquina superior derecha */}
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
            size={110}
            color="#00E56A"
            glow
          />
        </div>

        {/* Botón modo manual */}
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
        </div>

        {/* Botón guardar posición actual */}
        <button
          type="button"
          onClick={handleGuardarPosicionActual}
          title={t('navegacion.guardarPosicion.boton', {
            defaultValue: 'Guardar posición actual',
          })}
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

      {/* Panel de datos + controles de abajo */}
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
          distanciaM={distanciaM}
          rumboASeguir={rumboASeguir}
          rumboReal={rumboRealEfectivo}
          velocidadMs={velocidadMs}
          velocidadTexto={velocidadTexto}
          eta={etaTexto}
          modoManual={modoManualActivo}
        />

        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'stretch',
          }}
        >
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
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
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

      {/* Modal de modo manual */}
      {modalManualAbierto && (
        <ModoManualModal
          rumboInicial={datosManual?.rumboGrados ?? rumboRealEfectivo ?? 0}
          velocidadInicialKt={datosManual?.velocidadKt ?? 0}
          proaInicial={datosManual?.proaCardinal ?? 'N'}
          pedirProa={estadoBrujula !== 'activo'}
          onAplicar={handleAplicarModoManual}
          onCancelar={() => setModalManualAbierto(false)}
        />
      )}

      {/* Modal ¿Guardar track? */}
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