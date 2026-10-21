// src/screens/Navegacion/RutasScreen.tsx
// WKF — Sub-pestaña "Rutas".
// F6.5b: botón "Navegar" en fila de ruta.
// Fase C: C1 desduplicación + C3 tracks.
// Fase 21 (Bug 3): ➤ del track con stopPropagation y guarda
//   para tracks vacíos (aviso + botón gris).

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAppStore } from '../../state/store.ts';
import { useNavegacionStore } from '../../state/navegacion-store.ts';
import type { Waypoint } from '../../db/waypoints-repo.ts';
import type { Ruta } from '../../db/rutas-repo.ts';
import type { Track } from '../../db/tracks-repo.ts';
import { CapaMapa } from '../../components/CapaMapa.tsx';
import { MapaTacticoLayer } from '../../components/MapaTacticoLayer.tsx';
import {
  generarJSONRuta,
  generarGPXRuta,
  descargarArchivo,
  slugificar,
} from '../../lib/navegacion/exportador-rutas.ts';
import type { DestinoNavegacion } from './NavegarScreen.tsx';

const SPAIN_CENTER: [number, number] = [39.5, -0.5];
const INITIAL_ZOOM = 6;

function formatearDuracion(ms: number): string {
  if (!ms || ms <= 0) return '0 min';
  const totalSeg = Math.round(ms / 1000);
  const horas = Math.floor(totalSeg / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = totalSeg % 60;
  if (horas > 0) {
    return `${horas}h ${min}m`;
  }
  if (min > 0) {
    return `${min}m ${seg}s`;
  }
  return `${seg}s`;
}

function crearPinIcon(color: string, size = 32) {
  return L.divIcon({
    className: 'wkf-waypoint-pin',
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="16" r="10" stroke="${color}" stroke-width="2.5" fill="#0A0A0A"/>
        <circle cx="20" cy="16" r="3" fill="${color}"/>
        <path d="M20 27 L17 33 L20 31.5 L23 33 Z" fill="${color}"/>
      </svg>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 4],
  });
}

const PIN_VERDE = crearPinIcon('#00E56A');
const PIN_NARANJA = crearPinIcon('#FF8A00');
const COLOR_RUTA = '#00E56A';

const MapController: React.FC<{ onMap: (map: L.Map) => void }> = ({ onMap }) => {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

interface ModalRenombrarProps {
  nombreActual: string;
  titulo?: string;
  onGuardar: (nuevoNombre: string) => void;
  onCancelar: () => void;
}

const ModalRenombrar: React.FC<ModalRenombrarProps> = ({
  nombreActual,
  titulo,
  onGuardar,
  onCancelar,
}) => {
  const { t } = useTranslation();
  const [valor, setValor] = useState(nombreActual);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const guardar = () => {
    const limpio = valor.trim();
    if (!limpio) return;
    onGuardar(limpio);
  };

  return (
    <div
      onClick={onCancelar}
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
          {titulo ?? t('navegacion.rutas.renombrar.titulo')}
        </h3>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            marginBottom: 4,
          }}
        >
          {t('navegacion.rutas.renombrar.label')}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardar();
            if (e.key === 'Escape') onCancelar();
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
            onClick={onCancelar}
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
            {t('navegacion.rutas.renombrar.cancelar')}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!valor.trim()}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: valor.trim() ? 'var(--accent)' : 'var(--border)',
              color: valor.trim() ? '#000' : 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: valor.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {t('navegacion.rutas.renombrar.guardar')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModalGuardarRutaProps {
  nombreSugerido: string;
  totalWaypoints: number;
  onGuardar: (nombre: string) => void;
  onCancelar: () => void;
}

const ModalGuardarRuta: React.FC<ModalGuardarRutaProps> = ({
  nombreSugerido,
  totalWaypoints,
  onGuardar,
  onCancelar,
}) => {
  const { t } = useTranslation();
  const [valor, setValor] = useState(nombreSugerido);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const guardar = () => {
    const limpio = valor.trim();
    if (!limpio) return;
    onGuardar(limpio);
  };

  return (
    <div
      onClick={onCancelar}
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
        <h3
          style={{
            margin: '0 0 6px 0',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--accent)',
          }}
        >
          {t('navegacion.rutas.crear.titulo')}
        </h3>
        <p
          style={{
            margin: '0 0 14px 0',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            lineHeight: 1.4,
          }}
        >
          {t('navegacion.rutas.crear.resumen', { count: totalWaypoints })}
        </p>

        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            marginBottom: 4,
          }}
        >
          {t('navegacion.rutas.crear.nombreLabel')}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardar();
            if (e.key === 'Escape') onCancelar();
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
            onClick={onCancelar}
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
            {t('navegacion.rutas.crear.cancelar')}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!valor.trim()}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: valor.trim() ? 'var(--accent)' : 'var(--border)',
              color: valor.trim() ? '#000' : 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: valor.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {t('navegacion.rutas.crear.guardar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface RutasScreenProps {
  onNavegar: (destino: DestinoNavegacion) => void;
}

export const RutasScreen: React.FC<RutasScreenProps> = ({ onNavegar }) => {
  const { t } = useTranslation();
  const waypoints = useNavegacionStore((s) => s.waypoints);
  const rutas = useNavegacionStore((s) => s.rutas);
  const tracks = useNavegacionStore((s) => s.tracks);
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const crearRuta = useNavegacionStore((s) => s.crearRuta);
  const actualizarRuta = useNavegacionStore((s) => s.actualizarRuta);
  const borrarRuta = useNavegacionStore((s) => s.borrarRuta);
  const borrarTrack = useNavegacionStore((s) => s.borrarTrack);
  const actualizarTrack = useNavegacionStore((s) => s.actualizarTrack);
  const convertirTrackEnRuta = useNavegacionStore((s) => s.convertirTrackEnRuta);
  const recargarTracks = useNavegacionStore((s) => s.recargarTracks);
  const cargado = useNavegacionStore((s) => s.cargado);

  const mapaTactico = useAppStore((s) => s.ajustes.mapaTactico);
  const setMapaTactico = useAppStore((s) => s.setMapaTactico);

  const [mapaTacticoLocal, setMapaTacticoLocal] = useState(mapaTactico);

  useEffect(() => {
    setMapaTacticoLocal(mapaTactico);
  }, [mapaTactico]);

  useEffect(() => {
    void recargarTracks();
  }, [recargarTracks]);

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [waypointsSeleccionados, setWaypointsSeleccionados] = useState<string[]>([]);
  const [rutaActivaId, setRutaActivaId] = useState<string | null>(null);
  const [trackActivoId, setTrackActivoId] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const avisoTimeout = useRef<number | null>(null);

  const [renombrando, setRenombrando] = useState<Ruta | null>(null);
  const [renombrandoTrack, setRenombrandoTrack] = useState<Track | null>(null);
  const [guardandoRuta, setGuardandoRuta] = useState(false);

  const bloquesCapasFiltrados = useMemo(() => {
    return bloquesCapas.map((bloque) => ({
      ...bloque,
      capas: bloque.capas.map((capa) => ({
        ...capa,
        elementos: capa.elementos.filter((el) => {
          if (el.tipo !== 'punto') return true;
          const coords =
            Array.isArray(el.coords) && Array.isArray(el.coords[0])
              ? el.coords[0]
              : el.coords;
          if (!Array.isArray(coords) || coords.length < 2) return true;
          const [lat, lon] = coords as [number, number];
          const coincide = waypoints.some(
            (wp) =>
              (Math.abs(wp.lat - lat) < 0.0001 &&
                Math.abs(wp.lon - lon) < 0.0001) ||
              (Boolean(el.nombre) &&
                Boolean(wp.nombre) &&
                el.nombre!.trim().toLowerCase() ===
                  wp.nombre.trim().toLowerCase())
          );
          return !coincide;
        }),
      })),
    }));
  }, [bloquesCapas, waypoints]);

  const waypointsPorId = useMemo(() => {
    const m = new Map<string, Waypoint>();
    for (const w of waypoints) m.set(w.id, w);
    return m;
  }, [waypoints]);

  const rutaActiva = useMemo(
    () => (rutaActivaId ? rutas.find((r) => r.id === rutaActivaId) ?? null : null),
    [rutas, rutaActivaId]
  );

  const puntosRutaActiva = useMemo(() => {
    if (!rutaActiva) return [];
    return rutaActiva.waypointIds
      .map((id) => waypointsPorId.get(id))
      .filter((w): w is Waypoint => w != null)
      .map((w) => [w.lat, w.lon] as [number, number]);
  }, [rutaActiva, waypointsPorId]);

  const trackActivo = useMemo(
    () => (trackActivoId ? tracks.find((t) => t.id === trackActivoId) ?? null : null),
    [tracks, trackActivoId]
  );

  const puntosTrackActivo = useMemo<[number, number][]>(() => {
    if (!trackActivo || !trackActivo.puntos) return [];
    return trackActivo.puntos.map((p) => [p.lat, p.lon] as [number, number]);
  }, [trackActivo]);

  const centroInicial = useMemo<[number, number]>(() => {
    if (waypoints.length === 0) return SPAIN_CENTER;
    const ultimo = waypoints[waypoints.length - 1];
    return [ultimo.lat, ultimo.lon];
  }, []);

  const mostrarAviso = (msg: string) => {
    setAviso(msg);
    if (avisoTimeout.current) window.clearTimeout(avisoTimeout.current);
    avisoTimeout.current = window.setTimeout(() => setAviso(null), 2200);
  };

  useEffect(() => {
    return () => {
      if (avisoTimeout.current) window.clearTimeout(avisoTimeout.current);
    };
  }, []);

  const iniciarSeleccion = () => {
    setModoSeleccion(true);
    setWaypointsSeleccionados([]);
    setRutaActivaId(null);
    setTrackActivoId(null);
  };

  const cancelarSeleccion = () => {
    setModoSeleccion(false);
    setWaypointsSeleccionados([]);
    setGuardandoRuta(false);
  };

  const toggleWaypointSeleccion = (id: string) => {
    setWaypointsSeleccionados((prev) => {
      const idx = prev.lastIndexOf(id);
      if (idx !== -1) {
        const copia = [...prev];
        copia.splice(idx, 1);
        return copia;
      }
      return [...prev, id];
    });
  };

  const abrirGuardarRuta = () => {
    if (waypointsSeleccionados.length < 2) {
      mostrarAviso(t('navegacion.rutas.crear.minimoDos'));
      return;
    }
    setGuardandoRuta(true);
  };

  const confirmarGuardarRuta = async (nombre: string) => {
    try {
      await crearRuta({
        nombre,
        waypointIds: [...waypointsSeleccionados],
        origen: 'manual',
      });
      mostrarAviso(t('navegacion.rutas.creada', { nombre }));
      setModoSeleccion(false);
      setWaypointsSeleccionados([]);
      setGuardandoRuta(false);
    } catch (err) {
      console.error('Error creando ruta', err);
      mostrarAviso(t('navegacion.rutas.errorGuardar'));
    }
  };

  const handleRenombrar = async (ruta: Ruta, nuevoNombre: string) => {
    try {
      await actualizarRuta(ruta.id, { nombre: nuevoNombre });
      setRenombrando(null);
    } catch (err) {
      console.error('Error renombrando ruta', err);
    }
  };

  const handleBorrar = async (ruta: Ruta) => {
    try {
      await borrarRuta(ruta.id);
      if (rutaActivaId === ruta.id) setRutaActivaId(null);
    } catch (err) {
      console.error('Error borrando ruta', err);
    }
  };

  const handleCentrarRuta = (ruta: Ruta) => {
    setRutaActivaId((prev) => (prev === ruta.id ? null : ruta.id));
    setTrackActivoId(null);
    if (!mapInstance) return;
    const puntos = ruta.waypointIds
      .map((id) => waypointsPorId.get(id))
      .filter((w): w is Waypoint => w != null);
    if (puntos.length === 0) return;
    if (puntos.length === 1) {
      mapInstance.flyTo([puntos[0].lat, puntos[0].lon], 14);
      return;
    }
    const bounds = L.latLngBounds(
      puntos.map((w) => [w.lat, w.lon] as [number, number])
    );
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  const handleNavegarRuta = (ruta: Ruta) => {
    onNavegar({ tipo: 'ruta', id: ruta.id });
  };

  const handleCentrarTrack = (track: Track) => {
    setTrackActivoId((prev) => (prev === track.id ? null : track.id));
    setRutaActivaId(null);
    if (!mapInstance || !track.puntos || track.puntos.length === 0) return;
    if (track.puntos.length === 1) {
      mapInstance.flyTo([track.puntos[0].lat, track.puntos[0].lon], 14);
      return;
    }
    const bounds = L.latLngBounds(
      track.puntos.map((p) => [p.lat, p.lon] as [number, number])
    );
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  const handleRenombrarTrack = async (track: Track, nuevoNombre: string) => {
    try {
      await actualizarTrack(track.id, { nombre: nuevoNombre });
      setRenombrandoTrack(null);
    } catch (err) {
      console.error('Error renombrando track', err);
    }
  };

  const handleBorrarTrack = async (track: Track) => {
    try {
      await borrarTrack(track.id);
      if (trackActivoId === track.id) setTrackActivoId(null);
      mostrarAviso(t('navegacion.trackBorrado', { defaultValue: 'Track borrado' }));
    } catch (err) {
      console.error('Error borrando track', err);
    }
  };

  const handleConvertirTrack = async (track: Track) => {
    try {
      const rutaCreada = await convertirTrackEnRuta(track.id);
      if (rutaCreada) {
        mostrarAviso(t('navegacion.rutas.creada', { nombre: rutaCreada.nombre }));
      } else {
        mostrarAviso(
          t('navegacion.errorConvertirTrack', {
            defaultValue: 'No se pudo convertir el track en ruta',
          })
        );
      }
    } catch (err) {
      console.error('Error convirtiendo track en ruta', err);
    }
  };

  const handleNavegarTrack = (track: Track) => {
    if (!Array.isArray(track.puntos) || track.puntos.length < 2) {
      mostrarAviso(
        t('navegacion.trackVacioAviso', {
          defaultValue: 'Este track está vacío. No se puede navegar.',
        })
      );
      return;
    }
    onNavegar({ tipo: 'track', id: track.id });
  };

  const nombreSugerido = useMemo(() => {
    const n = rutas.length + 1;
    return `${t('navegacion.rutas.prefijoNombre')} ${n}`;
  }, [rutas.length, t]);

  const estaSeleccionado = (id: string) =>
    modoSeleccion && waypointsSeleccionados.includes(id);

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
          {t('navegacion.subtab.rutas')}
        </h2>

        {!modoSeleccion ? (
          <button
            type="button"
            onClick={iniciarSeleccion}
            disabled={waypoints.length < 2}
            title={
              waypoints.length < 2
                ? t('navegacion.rutas.necesitaDosWaypoints')
                : undefined
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${
                waypoints.length < 2 ? 'var(--border)' : 'var(--accent)'
              }`,
              backgroundColor:
                waypoints.length < 2 ? 'var(--bg)' : 'rgba(0, 229, 106, 0.15)',
              color: waypoints.length < 2 ? 'var(--text-dim)' : 'var(--accent)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: waypoints.length < 2 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>+</span>
            <span>{t('navegacion.rutas.addRuta')}</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={cancelarSeleccion}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={abrirGuardarRuta}
              disabled={waypointsSeleccionados.length < 2}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor:
                  waypointsSeleccionados.length < 2
                    ? 'var(--border)'
                    : 'var(--accent)',
                color:
                  waypointsSeleccionados.length < 2
                    ? 'var(--text-dim)'
                    : '#000',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor:
                  waypointsSeleccionados.length < 2
                    ? 'not-allowed'
                    : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t('navegacion.rutas.guardarRuta', {
                count: waypointsSeleccionados.length,
              })}
            </button>
          </div>
        )}
      </header>

      {modoSeleccion && (
        <div
          style={{
            flexShrink: 0,
            padding: '7px 14px',
            backgroundColor: 'rgba(0, 184, 255, 0.15)',
            borderBottom: '1px solid var(--accent-2)',
            color: 'var(--accent-2)',
            fontSize: '0.78rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          📍 {t('navegacion.rutas.modoSeleccion')}
        </div>
      )}

      {aviso && (
        <div
          style={{
            flexShrink: 0,
            padding: '7px 14px',
            backgroundColor: 'rgba(0, 229, 106, 0.15)',
            borderBottom: '1px solid var(--accent)',
            color: 'var(--accent)',
            fontSize: '0.78rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {aviso}
        </div>
      )}

      <div
        style={{
          flexShrink: 0,
          height: '50vh',
          minHeight: 240,
          position: 'relative',
          cursor: modoSeleccion ? 'pointer' : 'default',
        }}
      >
        <button
          type="button"
          onClick={() => {
            const nuevo = !mapaTacticoLocal;
            setMapaTacticoLocal(nuevo);
            setMapaTactico(nuevo);
          }}
          title={t('navegacion.cambiarMapa')}
          aria-label={t('navegacion.cambiarMapa')}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            fontSize: '1.2rem',
            transition: 'transform 0.15s ease, background-color 0.15s ease',
          }}
        >
          🗺️
        </button>

        <MapContainer
          center={centroInicial}
          zoom={waypoints.length === 0 ? INITIAL_ZOOM : 13}
          style={{ width: '100%', height: '100%' }}
        >
          <MapController onMap={setMapInstance} />
          {mapaTacticoLocal ? (
            <MapaTacticoLayer />
          ) : (
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {waypoints.map((wp) => {
            const sel = estaSeleccionado(wp.id);
            const icon = sel ? PIN_NARANJA : PIN_VERDE;

            return (
              <Marker
                key={wp.id}
                position={[wp.lat, wp.lon]}
                icon={icon}
                draggable={false}
                eventHandlers={{
                  click: () => {
                    if (modoSeleccion) toggleWaypointSeleccion(wp.id);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -28]} permanent={false}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {wp.nombre}
                  </span>
                </Tooltip>
              </Marker>
            );
          })}

          {puntosTrackActivo.length >= 2 && (
            <Polyline
              positions={puntosTrackActivo}
              pathOptions={{
                color: '#00E56A',
                weight: 2,
                opacity: 0.85,
              }}
            />
          )}

          {puntosRutaActiva.length >= 2 && (
            <Polyline
              positions={puntosRutaActiva}
              pathOptions={{
                color: COLOR_RUTA,
                weight: 3,
                opacity: 0.9,
              }}
            />
          )}

          <CapaMapa bloques={bloquesCapasFiltrados} />
        </MapContainer>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px 14px 20px',
          backgroundColor: 'var(--bg)',
        }}
      >
        {!cargado && (
          <div
            style={{
              padding: '20px 4px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.85rem',
            }}
          >
            {t('navegacion.lista.cargando')}
          </div>
        )}

        {cargado && rutas.length === 0 && tracks.length === 0 && !modoSeleccion && (
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
            {t('navegacion.rutas.lista.vacia')}
          </div>
        )}

        {cargado && rutas.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tracks.length > 0 && (
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-dim)',
                  padding: '4px 2px 2px',
                }}
              >
                {t('navegacion.subtab.rutas', { defaultValue: 'Rutas' })} ({rutas.length})
              </div>
            )}
            {rutas.map((r) => (
              <FilaRuta
                key={r.id}
                ruta={r}
                waypointsCount={r.waypointIds.length}
                activa={rutaActivaId === r.id}
                todosLosWaypoints={waypoints}
                onCentrar={() => handleCentrarRuta(r)}
                onRenombrar={() => setRenombrando(r)}
                onBorrar={() => handleBorrar(r)}
                onNavegar={() => handleNavegarRuta(r)}
              />
            ))}
          </div>
        )}

        {cargado && tracks.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginTop: rutas.length > 0 ? 16 : 0,
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-dim)',
                padding: '4px 2px 2px',
              }}
            >
              Tracks ({tracks.length})
            </div>
            {tracks.map((t) => (
              <FilaTrack
                key={t.id}
                track={t}
                activa={trackActivoId === t.id}
                onCentrar={() => handleCentrarTrack(t)}
                onConvertir={() => handleConvertirTrack(t)}
                onRenombrar={() => setRenombrandoTrack(t)}
                onBorrar={() => handleBorrarTrack(t)}
                onNavegar={() => handleNavegarTrack(t)}
              />
            ))}
          </div>
        )}
      </div>

      {renombrando && (
        <ModalRenombrar
          nombreActual={renombrando.nombre}
          onGuardar={(nuevo) => handleRenombrar(renombrando, nuevo)}
          onCancelar={() => setRenombrando(null)}
        />
      )}

      {renombrandoTrack && (
        <ModalRenombrar
          nombreActual={renombrandoTrack.nombre}
          titulo={t('navegacion.tracks.renombrar.titulo', {
            defaultValue: 'Renombrar track',
          })}
          onGuardar={(nuevo) => handleRenombrarTrack(renombrandoTrack, nuevo)}
          onCancelar={() => setRenombrandoTrack(null)}
        />
      )}

      {guardandoRuta && (
        <ModalGuardarRuta
          nombreSugerido={nombreSugerido}
          totalWaypoints={waypointsSeleccionados.length}
          onGuardar={confirmarGuardarRuta}
          onCancelar={() => setGuardandoRuta(false)}
        />
      )}
    </div>
  );
};

interface FilaRutaProps {
  ruta: Ruta;
  waypointsCount: number;
  activa: boolean;
  todosLosWaypoints: Waypoint[];
  onCentrar: () => void;
  onRenombrar: () => void;
  onBorrar: () => void;
  onNavegar: () => void;
}

const FilaRuta: React.FC<FilaRutaProps> = ({
  ruta,
  waypointsCount,
  activa,
  todosLosWaypoints,
  onCentrar,
  onRenombrar,
  onBorrar,
  onNavegar,
}) => {
  const { t } = useTranslation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  const exportar = async (tipo: 'json' | 'gpx') => {
    const waypointsDeRuta = ruta.waypointIds
      .map((id) => todosLosWaypoints.find((w) => w.id === id))
      .filter((w): w is Waypoint => w != null);

    if (tipo === 'json') {
      const contenido = generarJSONRuta(ruta, waypointsDeRuta);
      const nombreArchivo = `${slugificar(ruta.nombre)}.wkfruta.json`;
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [
            new File([contenido], nombreArchivo, {
              type: 'application/json',
            }),
          ],
        })
      ) {
        try {
          await navigator.share({
            files: [
              new File([contenido], nombreArchivo, {
                type: 'application/json',
              }),
            ],
            title: ruta.nombre,
          });
        } catch (e) {
          /* ignore */
        }
      } else {
        descargarArchivo(contenido, nombreArchivo, 'application/json');
      }
    } else {
      const contenido = generarGPXRuta(ruta, waypointsDeRuta);
      const nombreArchivo = `${slugificar(ruta.nombre)}.gpx`;
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [
            new File([contenido], nombreArchivo, {
              type: 'application/gpx+xml',
            }),
          ],
        })
      ) {
        try {
          await navigator.share({
            files: [
              new File([contenido], nombreArchivo, {
                type: 'application/gpx+xml',
              }),
            ],
            title: ruta.nombre,
          });
        } catch (e) {
          /* ignore */
        }
      } else {
        descargarArchivo(contenido, nombreArchivo, 'application/gpx+xml');
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 6,
        backgroundColor: 'var(--surface)',
        border: `1px solid ${activa ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onCentrar}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '10px 12px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text)',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: activa ? 'var(--accent)' : 'var(--text)',
          }}
        >
          {ruta.nombre}
        </div>
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            marginTop: 2,
          }}
        >
          {t('navegacion.rutas.waypointsCount', { count: waypointsCount })}
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavegar();
        }}
        title={t('navegacion.acciones.navegarRuta', {
          defaultValue: 'Navegar esta ruta',
        })}
        style={{
          padding: '0 14px',
          backgroundColor: 'rgba(0, 229, 106, 0.15)',
          border: 'none',
          borderLeft: '1px solid var(--border)',
          color: 'var(--accent)',
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        ➤
      </button>

      {confirmandoBorrado ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('navegacion.borrar.confirmar')}
          </span>
          <button
            type="button"
            onClick={() => setConfirmandoBorrado(false)}
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
              setConfirmandoBorrado(false);
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
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={t('navegacion.acciones.centrar')}
            style={{
              height: '100%',
              padding: '0 14px',
              backgroundColor: menuAbierto
                ? 'rgba(0, 229, 106, 0.12)'
                : 'transparent',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              color: menuAbierto ? 'var(--accent)' : 'var(--text)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ⋮
          </button>

          {menuAbierto && (
            <>
              <div
                onClick={() => setMenuAbierto(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 3990,
                  backgroundColor: 'transparent',
                }}
              />
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 4000,
                  minWidth: 180,
                  overflow: 'hidden',
                }}
              >
                <BotonMenu
                  label={t('navegacion.acciones.centrar')}
                  icono="◎"
                  onClick={() => {
                    setMenuAbierto(false);
                    onCentrar();
                  }}
                />
                <BotonMenu
                  label={t('navegacion.acciones.renombrar')}
                  icono="✎"
                  onClick={() => {
                    setMenuAbierto(false);
                    onRenombrar();
                  }}
                />
                <BotonMenu
                  label="Exportar GPX"
                  icono="↓"
                  onClick={() => {
                    setMenuAbierto(false);
                    exportar('gpx');
                  }}
                />
                <BotonMenu
                  label="Exportar JSON"
                  icono="↓"
                  onClick={() => {
                    setMenuAbierto(false);
                    exportar('json');
                  }}
                />
                <BotonMenu
                  label={t('navegacion.acciones.borrar')}
                  icono="🗑"
                  peligro
                  onClick={() => {
                    setMenuAbierto(false);
                    setConfirmandoBorrado(true);
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface FilaTrackProps {
  track: Track;
  activa?: boolean;
  onCentrar: () => void;
  onConvertir: () => void;
  onRenombrar: () => void;
  onBorrar: () => void;
  onNavegar: () => void;
}

const FilaTrack: React.FC<FilaTrackProps> = ({
  track,
  activa = false,
  onCentrar,
  onConvertir,
  onRenombrar,
  onBorrar,
  onNavegar,
}) => {
  const { t } = useTranslation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  const duracionTexto = formatearDuracion(track.duracionMs ?? 0);
  const distanciaTexto = `${(track.distanciaKm ?? 0).toFixed(2)} km`;
  const navegable = Array.isArray(track.puntos) && track.puntos.length >= 2;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 6,
        backgroundColor: 'var(--surface)',
        border: `1px solid ${activa ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onCentrar}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '10px 12px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text)',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: activa ? 'var(--accent)' : 'var(--text)',
          }}
        >
          {track.nombre}
        </div>
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            marginTop: 2,
          }}
        >
          {distanciaTexto} • {duracionTexto}
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!navegable) return;
          onNavegar();
        }}
        disabled={!navegable}
        title={
          navegable
            ? t('navegacion.acciones.navegarTrack', {
                defaultValue: 'Navegar este track',
              })
            : t('navegacion.trackVacioAviso', {
                defaultValue: 'Este track está vacío. No se puede navegar.',
              })
        }
        aria-label={t('navegacion.acciones.navegarTrack', {
          defaultValue: 'Navegar este track',
        })}
        style={{
          padding: '0 14px',
          backgroundColor: navegable
            ? 'rgba(0, 229, 106, 0.15)'
            : 'transparent',
          border: 'none',
          borderLeft: '1px solid var(--border)',
          color: navegable ? 'var(--accent)' : 'var(--text-dim)',
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: navegable ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          opacity: navegable ? 1 : 0.45,
        }}
      >
        ➤
      </button>

      {confirmandoBorrado ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('navegacion.borrar.confirmar', { defaultValue: '¿Borrar?' })}
          </span>
          <button
            type="button"
            onClick={() => setConfirmandoBorrado(false)}
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
            {t('navegacion.borrar.cancelar', { defaultValue: 'Cancelar' })}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmandoBorrado(false);
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
            {t('navegacion.borrar.borrar', { defaultValue: 'Borrar' })}
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={t('navegacion.acciones.opciones', {
              defaultValue: 'Opciones',
            })}
            style={{
              height: '100%',
              padding: '0 14px',
              backgroundColor: menuAbierto
                ? 'rgba(0, 229, 106, 0.12)'
                : 'transparent',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              color: menuAbierto ? 'var(--accent)' : 'var(--text)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ⋮
          </button>

          {menuAbierto && (
            <>
              <div
                onClick={() => setMenuAbierto(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 3990,
                  backgroundColor: 'transparent',
                }}
              />
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 4000,
                  minWidth: 180,
                  overflow: 'hidden',
                }}
              >
                <BotonMenu
                  label={t('navegacion.tracks.convertirEnRuta', {
                    defaultValue: 'Convertir en ruta',
                  })}
                  icono="🔀"
                  onClick={() => {
                    setMenuAbierto(false);
                    onConvertir();
                  }}
                />
                <BotonMenu
                  label={t('navegacion.acciones.renombrar', {
                    defaultValue: 'Renombrar',
                  })}
                  icono="✎"
                  onClick={() => {
                    setMenuAbierto(false);
                    onRenombrar();
                  }}
                />
                <BotonMenu
                  label={t('navegacion.acciones.borrar', {
                    defaultValue: 'Borrar',
                  })}
                  icono="🗑"
                  peligro
                  onClick={() => {
                    setMenuAbierto(false);
                    setConfirmandoBorrado(true);
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const BotonMenu: React.FC<{
  label: string;
  icono: string;
  onClick: () => void;
  peligro?: boolean;
}> = ({ label, icono, onClick, peligro = false }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '10px 14px',
      border: 'none',
      backgroundColor: 'transparent',
      color: peligro ? 'var(--verdict-desaconsejado)' : 'var(--text)',
      fontSize: '0.85rem',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = peligro
        ? 'rgba(255, 45, 85, 0.12)'
        : 'rgba(0, 229, 106, 0.08)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
        'transparent';
    }}
  >
    <span style={{ fontSize: '0.95rem', width: 16, textAlign: 'center' }}>
      {icono}
    </span>
    <span>{label}</span>
  </button>
);

export default RutasScreen;
// src/screens/Navegacion/RutasScreen.tsx