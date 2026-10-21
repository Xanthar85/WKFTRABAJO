// src/screens/Navegacion/WaypointsRutasScreen.tsx
// WKF — Sub-pestaña "Waypoints". Fase 22: Carpetas.
// Menú de edición accesible por el lápiz (✎) del panel rápido.
// Waypoints agrupados por carpetas en la vista lista.

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAppStore } from '../../state/store.ts';
import { useNavegacionStore } from '../../state/navegacion-store.ts';
import type { Waypoint } from '../../db/waypoints-repo.ts';
import type { Carpeta } from '../../db/carpetas-repo.ts';
import {
  CapaMapa,
  type CapaMapaProps,
  type OnElementoClick,
} from '../../components/CapaMapa.tsx';
import { MapaTacticoLayer } from '../../components/MapaTacticoLayer.tsx';
import { PALETA_WKF } from '../../lib/colores-wkf.ts';
import type { DestinoNavegacion } from './NavegarScreen.tsx';

const CapaMapaConClick = CapaMapa as React.FC<
  CapaMapaProps & { onElementoClick?: OnElementoClick }
>;

export type WaypointConColor = Waypoint & {
  color?: string;
};

const SPAIN_CENTER: [number, number] = [39.5, -0.5];
const INITIAL_ZOOM = 6;
const COLOR_DEFECTO = '#00E56A';

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

function crearPuntoNeonIcon(color: string, size = 14) {
  return L.divIcon({
    className: 'wkf-waypoint-neon',
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        box-shadow:0 0 6px ${color},0 0 12px ${color}88;
        border:2px solid #000;
        box-sizing:border-box;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function crearPuntoNeonEditableIcon(color: string, size = 22) {
  return L.divIcon({
    className: 'wkf-waypoint-neon-editable',
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        box-shadow:0 0 10px ${color},0 0 20px ${color};
        border:2px solid #00B8FF;
        box-sizing:border-box;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const CROSSHAIR_COLOR = '#00B8FF';

interface ClickHandlerProps {
  activo: boolean;
  onPick: (lat: number, lon: number) => void;
}

const ClickHandler: React.FC<ClickHandlerProps> = ({ activo, onPick }) => {
  useMapEvents({
    click(e) {
      if (!activo) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapController: React.FC<{ onMap: (map: L.Map) => void }> = ({
  onMap,
}) => {
  const map = useMap();
  React.useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

function formatearCoord(v: number): string {
  return v.toFixed(5);
}

// ─────────────────────────────────────────────────────────────
// Modales
// ─────────────────────────────────────────────────────────────

interface ModalSimpleProps {
  titulo: string;
  label: string;
  valorInicial: string;
  onGuardar: (v: string) => void;
  onCancelar: () => void;
}

const ModalSimple: React.FC<ModalSimpleProps> = ({
  titulo,
  label,
  valorInicial,
  onGuardar,
  onCancelar,
}) => {
  const { t } = useTranslation();
  const [valor, setValor] = useState(valorInicial);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
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
          {titulo}
        </h3>

        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            marginBottom: 4,
          }}
        >
          {label}
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
            {t('common.cancel', { defaultValue: 'Cancelar' })}
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
            {t('common.save', { defaultValue: 'Guardar' })}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModalCarpetasProps {
  carpetas: Carpeta[];
  carpetaActualId?: string;
  onSeleccionar: (id?: string) => void;
  onCerrar: () => void;
}

const ModalCarpetas: React.FC<ModalCarpetasProps> = ({
  carpetas,
  carpetaActualId,
  onSeleccionar,
  onCerrar,
}) => {
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
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
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
          Mover a carpeta
        </h3>

        <div
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => onSeleccionar(undefined)}
            style={{
              padding: '12px',
              textAlign: 'left',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor:
                !carpetaActualId ? 'rgba(0, 229, 106, 0.15)' : 'var(--bg)',
              color: !carpetaActualId ? 'var(--accent)' : 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sin carpeta (General)
          </button>
          {carpetas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSeleccionar(c.id)}
              style={{
                padding: '12px',
                textAlign: 'left',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor:
                  carpetaActualId === c.id
                    ? 'rgba(0, 229, 106, 0.15)'
                    : 'var(--bg)',
                color:
                  carpetaActualId === c.id ? 'var(--accent)' : 'var(--text)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📁 {c.nombre}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCerrar}
          style={{
            width: '100%',
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
  );
};

export interface WaypointsRutasScreenProps {
  onNavegar: (destino: DestinoNavegacion) => void;
}

export const WaypointsRutasScreen: React.FC<WaypointsRutasScreenProps> = ({
  onNavegar,
}) => {
  const { t } = useTranslation();
  const waypoints = useNavegacionStore((s) => s.waypoints as WaypointConColor[]);
  const carpetas = useNavegacionStore((s) => s.carpetas);
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  
  const crearWaypoint = useNavegacionStore((s) => s.crearWaypoint);
  const actualizarWaypoint = useNavegacionStore((s) => s.actualizarWaypoint);
  const borrarWaypoint = useNavegacionStore((s) => s.borrarWaypoint);
  
  const crearCarpeta = useNavegacionStore((s) => s.crearCarpeta);
  const renombrarCarpeta = useNavegacionStore((s) => s.renombrarCarpeta);
  const borrarCarpeta = useNavegacionStore((s) => s.borrarCarpeta);
  const moverWaypointACarpeta = useNavegacionStore((s) => s.moverWaypointACarpeta);
  const rutasQueContienen = useNavegacionStore(
    (s) => s.rutasQueContienenWaypoint
  );

  const cargado = useNavegacionStore((s) => s.cargado);
  const mapaTactico = useAppStore((s) => s.ajustes.mapaTactico);
  const setMapaTactico = useAppStore((s) => s.setMapaTactico);
  const estiloWaypoints = useAppStore(
    (s) => s.ajustes.estiloWaypoints ?? 'punto'
  );

  const [mapaTacticoLocal, setMapaTacticoLocal] = useState(mapaTactico);

  React.useEffect(() => {
    setMapaTacticoLocal(mapaTactico);
  }, [mapaTactico]);

  const [editandoWaypointId, setEditandoWaypointId] = useState<string | null>(
    null
  );

  const iconCache = useRef<Map<string, L.DivIcon>>(new Map());
  const obtenerIconoWaypoint = (
    estilo: 'chincheta' | 'punto',
    colorHex?: string,
    editando = false
  ) => {
    const color = colorHex || COLOR_DEFECTO;
    const key = `${estilo}:${color.toLowerCase()}:${editando ? 'e' : 'n'}`;
    let icon = iconCache.current.get(key);
    if (!icon) {
      if (editando) {
        icon = crearPuntoNeonEditableIcon(color);
      } else if (estilo === 'chincheta') {
        icon = crearPinIcon(color);
      } else {
        icon = crearPuntoNeonIcon(color);
      }
      iconCache.current.set(key, icon);
    }
    return icon;
  };

  const tooltipOffset: [number, number] =
    estiloWaypoints === 'chincheta' ? [0, -28] : [0, -10];

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

  const [vistaActual, setVistaActual] = useState<'mapa' | 'lista'>('mapa');
  const [modoColocar, setModoColocar] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const coordsUsuarioRef = useRef<[number, number] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const avisoTimeout = useRef<number | null>(null);

  const [renombrando, setRenombrando] = useState<WaypointConColor | null>(null);
  const [renombrandoRuta, setRenombrandoRuta] = useState<any>(null);
  const [compartiendo, setCompartiendo] = useState<WaypointConColor | null>(null);

  const [waypointMenu, setWaypointMenu] = useState<WaypointConColor | null>(null);
  const [waypointQuick, setWaypointQuick] = useState<WaypointConColor | null>(null);
  
  const [moviendoACarpeta, setMoviendoACarpeta] = useState<WaypointConColor | null>(null);

  const [confirmandoBorradoMenu, setConfirmandoBorradoMenu] = useState(false);
  const [avisoRutasWp, setAvisoRutasWp] = useState<WaypointConColor | null>(null);

  const [elementoMenu, setElementoMenu] = useState<{
    bloqueId: string;
    capaId: string;
    elementoId: string;
    tipo: 'poligono' | 'linea';
    nombre?: string;
  } | null>(null);

  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [carpetaRenombrando, setCarpetaRenombrando] = useState<Carpeta | null>(null);

  const centroInicial = useMemo<[number, number]>(() => {
    if (waypoints.length === 0) return SPAIN_CENTER;
    const primero = waypoints[0];
    return [primero.lat, primero.lon];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          coordsUsuarioRef.current = [lat, lon];
          if (mapRef.current) {
            mapRef.current.setView([lat, lon], 13);
          } else if (mapInstance) {
            mapInstance.setView([lat, lon], 13);
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  }, [mapInstance]);

  React.useEffect(() => {
    if (vistaActual === 'mapa' && (mapRef.current || mapInstance)) {
      const map = mapRef.current || mapInstance;
      map?.invalidateSize();
      const timer = setTimeout(() => {
        map?.invalidateSize();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [vistaActual, mapInstance]);

  const mostrarAviso = (msg: string) => {
    setAviso(msg);
    if (avisoTimeout.current) window.clearTimeout(avisoTimeout.current);
    avisoTimeout.current = window.setTimeout(() => setAviso(null), 2200);
  };

  const handlePick = async (lat: number, lon: number) => {
    setModoColocar(false);
    const siguiente = waypoints.length + 1;
    const nombre = `Waypoint ${siguiente}`;
    try {
      await crearWaypoint({ nombre, lat, lon });
      mostrarAviso(t('navegacion.creado', { nombre }));
    } catch (err) {
      console.error('Error creando waypoint', err);
      mostrarAviso(t('navegacion.errorGuardar'));
    }
  };

  const handleRenombrar = async (wp: WaypointConColor, nuevoNombre: string) => {
    try {
      await actualizarWaypoint(wp.id, { nombre: nuevoNombre });
      setRenombrando(null);
      if (waypointMenu && waypointMenu.id === wp.id) {
        setWaypointMenu({ ...waypointMenu, nombre: nuevoNombre });
      }
    } catch (err) {
      console.error('Error renombrando waypoint', err);
    }
  };

  const handleAsignarColor = async (wp: WaypointConColor, colorHex: string) => {
    try {
      await actualizarWaypoint(wp.id, { color: colorHex } as unknown as Partial<Waypoint>);
      setWaypointMenu((prev) =>
        prev && prev.id === wp.id ? { ...prev, color: colorHex } : prev
      );
      mostrarAviso(t('navegacion.colorActualizado', { defaultValue: 'Color actualizado' }));
    } catch (err) {
      console.error('Error asignando color a waypoint', err);
    }
  };

  const handleBorrar = async (wp: WaypointConColor) => {
    try {
      await borrarWaypoint(wp.id);
      if (waypointMenu && waypointMenu.id === wp.id) setWaypointMenu(null);
      if (editandoWaypointId === wp.id) setEditandoWaypointId(null);
    } catch (err) {
      console.error('Error borrando waypoint', err);
    }
  };

  const handleCentrar = (wp: WaypointConColor) => {
    if (mapInstance) {
      mapInstance.flyTo([wp.lat, wp.lon], 14);
    }
  };

  const handleNavegar = (wp: WaypointConColor) => {
    onNavegar({ tipo: 'waypoint', id: wp.id });
  };

  const handleDragEnd = async (
    wp: WaypointConColor,
    nuevaLat: number,
    nuevaLon: number
  ) => {
    try {
      await actualizarWaypoint(wp.id, { lat: nuevaLat, lon: nuevaLon });
      mostrarAviso(t('navegacion.actualizado', { nombre: wp.nombre }));
    } catch (err) {
      console.error('Error guardando nueva posición', err);
    } finally {
      setEditandoWaypointId(null);
    }
  };

  const handleElementoClick = (
    bloqueId: string,
    capaId: string,
    elementoId: string,
    tipo: 'punto' | 'linea' | 'poligono',
    nombre: string | undefined
  ) => {
    if (tipo === 'punto') return;
    setWaypointMenu(null);
    setWaypointQuick(null);
    setConfirmandoBorradoMenu(false);
    setElementoMenu({ bloqueId, capaId, elementoId, tipo, nombre });
  };

  // Agrupación de waypoints para la lista
  const waypointsAgrupados = useMemo(() => {
    const grupos: { carpeta: Carpeta | null; waypoints: WaypointConColor[] }[] = [];
    
    // 1. Por cada carpeta existente
    carpetas.forEach((c) => {
      const wps = waypoints.filter((w) => w.carpetaId === c.id);
      if (wps.length > 0) grupos.push({ carpeta: c, waypoints: wps });
    });

    // 2. Los que no tienen carpeta o su carpeta ya no existe
    const idsCarpetas = new Set(carpetas.map((c) => c.id));
    const sueltos = waypoints.filter((w) => !w.carpetaId || !idsCarpetas.has(w.carpetaId));
    if (sueltos.length > 0) grupos.push({ carpeta: null, waypoints: sueltos });

    return grupos;
  }, [waypoints, carpetas]);

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
          {t('navegacion.subtab.waypoints')}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg)',
              borderRadius: 8,
              padding: 2,
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setVistaActual('mapa')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor:
                  vistaActual === 'mapa'
                    ? 'rgba(0, 229, 106, 0.18)'
                    : 'transparent',
                color:
                  vistaActual === 'mapa'
                    ? 'var(--accent)'
                    : 'var(--text-dim)',
                fontSize: '0.82rem',
                fontWeight: vistaActual === 'mapa' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t('navegacion.vistas.mapa', { defaultValue: 'Mapa' })}
            </button>
            <button
              type="button"
              onClick={() => setVistaActual('lista')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor:
                  vistaActual === 'lista'
                    ? 'rgba(0, 229, 106, 0.18)'
                    : 'transparent',
                color:
                  vistaActual === 'lista'
                    ? 'var(--accent)'
                    : 'var(--text-dim)',
                fontSize: '0.82rem',
                fontWeight: vistaActual === 'lista' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t('navegacion.vistas.lista', { defaultValue: 'Lista' })}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!modoColocar && vistaActual !== 'mapa') {
                setVistaActual('mapa');
              }
              setModoColocar((v) => !v);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${
                modoColocar ? 'var(--accent)' : 'var(--border)'
              }`,
              backgroundColor: modoColocar
                ? 'rgba(0, 229, 106, 0.15)'
                : 'var(--bg)',
              color: modoColocar ? 'var(--accent)' : 'var(--text)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>
              {modoColocar ? '✕' : '+'}
            </span>
            <span>
              {modoColocar
                ? t('common.cancel')
                : t('navegacion.addWaypoint')}
            </span>
          </button>
        </div>
      </header>

      {modoColocar && (
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
          📍 {t('navegacion.modocolocar')}
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
          display: vistaActual === 'mapa' ? 'flex' : 'none',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          height: '100%',
          position: 'relative',
          cursor: modoColocar ? 'crosshair' : 'default',
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

        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: 'calc(100dvh - 160px)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <MapContainer
            center={centroInicial}
            zoom={waypoints.length === 0 ? INITIAL_ZOOM : 13}
            style={{ width: '100%', height: '100%' }}
          >
            <MapController
              onMap={(map) => {
                setMapInstance(map);
                mapRef.current = map;
                if (coordsUsuarioRef.current) {
                  map.setView(coordsUsuarioRef.current, 13);
                }
              }}
            />
            {mapaTacticoLocal ? (
              <MapaTacticoLayer />
            ) : (
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}
            <ClickHandler activo={modoColocar} onPick={handlePick} />

            {waypoints.map((wp) => {
              const estaEditando = editandoWaypointId === wp.id;
              const icon = obtenerIconoWaypoint(
                estiloWaypoints,
                wp.color,
                estaEditando
              );
              return (
                <Marker
                  key={wp.id}
                  position={[wp.lat, wp.lon]}
                  icon={icon}
                  draggable={estaEditando}
                  eventHandlers={{
                    click: () => {
                      if (modoColocar) return;
                      if (editandoWaypointId === wp.id) return;
                      setWaypointMenu(null);
                      setConfirmandoBorradoMenu(false);
                      setElementoMenu(null);
                      setWaypointQuick(wp);
                    },
                    dragend: (e) => {
                      const marker = e.target as L.Marker;
                      const ll = marker.getLatLng();
                      void handleDragEnd(wp, ll.lat, ll.lng);
                    },
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={tooltipOffset}
                    permanent={false}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {wp.nombre}
                    </span>
                  </Tooltip>
                </Marker>
              );
            })}

            <CapaMapaConClick
              bloques={bloquesCapasFiltrados}
              onElementoClick={handleElementoClick}
            />
          </MapContainer>
        </div>

        {modoColocar && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: `2px dashed ${CROSSHAIR_COLOR}`,
                borderRadius: '50%',
                boxShadow: `0 0 12px ${CROSSHAIR_COLOR}55`,
                opacity: 0.55,
              }}
            />
          </div>
        )}
      </div>

      {vistaActual === 'lista' && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 14px 20px',
            backgroundColor: 'var(--bg)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Waypoints
            </h3>
            <button
              type="button"
              onClick={() => setCreandoCarpeta(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--accent)',
                backgroundColor: 'transparent',
                color: 'var(--accent)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Carpeta
            </button>
          </div>

          {!cargado && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', padding: 20 }}>
              {t('navegacion.lista.cargando')}
            </div>
          )}

          {cargado && waypoints.length === 0 && (
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
              {t('navegacion.lista.vacia')}
            </div>
          )}

          {cargado && waypointsAgrupados.map((grupo) => (
            <div key={grupo.carpeta?.id ?? 'general'} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 2px 8px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: '1rem' }}>
                  {grupo.carpeta ? '📁' : '📍'}
                </span>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    flex: 1,
                  }}
                >
                  {grupo.carpeta ? grupo.carpeta.nombre : 'Sin carpeta'}
                </span>
                {grupo.carpeta && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setCarpetaRenombrando(grupo.carpeta)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                      title="Renombrar carpeta"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Borrar la carpeta "${grupo.carpeta?.nombre}"? Los waypoints se moverán a "Sin carpeta".`)) {
                          void borrarCarpeta(grupo.carpeta!.id);
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--verdict-desaconsejado)', cursor: 'pointer' }}
                      title="Borrar carpeta"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grupo.waypoints.map((wp) => (
                  <FilaWaypoint
                    key={wp.id}
                    waypoint={wp}
                    carpetas={carpetas}
                    onCentrar={() => {
                      setVistaActual('mapa');
                      handleCentrar(wp);
                    }}
                    onRenombrar={() => setRenombrando(wp)}
                    onMoverCarpeta={() => setMoviendoACarpeta(wp)}
                    onCompartir={() => setCompartiendo(wp)}
                    onBorrar={() => handleBorrar(wp)}
                    onNavegar={() => handleNavegar(wp)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {waypointQuick && (
        <>
          <div
            onClick={() => setWaypointQuick(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              zIndex: 3490,
            }}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={waypointQuick.nombre}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3500,
              width: 'calc(100% - 32px)',
              maxWidth: 380,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
              padding: '16px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: waypointQuick.color || COLOR_DEFECTO,
                    boxShadow: `0 0 8px ${
                      waypointQuick.color || COLOR_DEFECTO
                    }`,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {waypointQuick.nombre}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    const wp = waypointQuick;
                    setWaypointQuick(null);
                    setConfirmandoBorradoMenu(false);
                    setElementoMenu(null);
                    setWaypointMenu(wp);
                  }}
                  aria-label="Editar"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => setWaypointQuick(null)}
                  aria-label={t('common.close', { defaultValue: 'Cerrar' })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const wp = waypointQuick;
                setWaypointQuick(null);
                handleNavegar(wp);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: '#000',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '1.05rem' }}>➤</span>
              <span>
                {t('navegacion.acciones.navegar', {
                  defaultValue: 'Navegar a este waypoint',
                })}
              </span>
            </button>
          </div>
        </>
      )}

      {waypointMenu && (
        <>
          <div
            onClick={() => {
              setWaypointMenu(null);
              setConfirmandoBorradoMenu(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              zIndex: 3490,
            }}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={waypointMenu.nombre}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3500,
              width: 'calc(100% - 32px)',
              maxWidth: 380,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
              padding: '16px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor:
                      waypointMenu.color || COLOR_DEFECTO,
                    boxShadow: `0 0 8px ${
                      waypointMenu.color || COLOR_DEFECTO
                    }`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {waypointMenu.nombre}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, Fira Code, monospace)',
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      marginTop: 2,
                    }}
                  >
                    {formatearCoord(waypointMenu.lat)},{' '}
                    {formatearCoord(waypointMenu.lon)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWaypointMenu(null);
                  setConfirmandoBorradoMenu(false);
                }}
                aria-label={t('common.close', { defaultValue: 'Cerrar' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const wp = waypointMenu;
                setWaypointMenu(null);
                setConfirmandoBorradoMenu(false);
                setEditandoWaypointId(wp.id);
                setVistaActual('mapa');
                if (mapInstance) {
                  mapInstance.flyTo([wp.lat, wp.lon], 15);
                }
                mostrarAviso(
                  t('navegacion.moverAviso', {
                    defaultValue:
                      'Arrastra el waypoint a su nueva posición',
                  })
                );
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--accent-2)',
                backgroundColor: 'rgba(0, 184, 255, 0.10)',
                color: 'var(--accent-2)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '1rem' }}>↔</span>
              <span>
                {t('navegacion.acciones.mover', {
                  defaultValue: 'Mover waypoint',
                })}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const wp = waypointMenu;
                setWaypointMenu(null);
                setConfirmandoBorradoMenu(false);
                handleNavegar(wp);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: '#000',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '1rem' }}>➤</span>
              <span>
                {t('navegacion.acciones.navegar', {
                  defaultValue: 'Navegar a este waypoint',
                })}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const wp = waypointMenu;
                setWaypointMenu(null);
                setConfirmandoBorradoMenu(false);
                setRenombrando(wp);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '0.95rem', color: 'var(--accent)' }}>
                ✎
              </span>
              <span>
                {t('navegacion.acciones.renombrar', {
                  defaultValue: 'Renombrar',
                })}
              </span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('navegacion.acciones.asignarColor', {
                  defaultValue: 'Asignar color',
                })}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 6,
                  padding: '2px 0',
                }}
              >
                {PALETA_WKF.map((c) => {
                  const colorActual = (
                    waypointMenu.color || COLOR_DEFECTO
                  ).toLowerCase();
                  const activo = colorActual === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        void handleAsignarColor(waypointMenu, c.hex)
                      }
                      title={c.nombre}
                      aria-label={c.nombre}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '50%',
                        backgroundColor: c.hex,
                        border: activo
                          ? '2px solid #ffffff'
                          : '1px solid rgba(0,0,0,0.6)',
                        boxShadow: activo
                          ? `0 0 8px ${c.hex}, 0 0 2px #fff`
                          : `0 0 3px ${c.hex}66`,
                        transform: activo ? 'scale(1.15)' : 'scale(1)',
                        cursor: 'pointer',
                        padding: 0,
                        outline: 'none',
                        transition: 'transform 0.12s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {confirmandoBorradoMenu ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 10px',
                  backgroundColor: 'rgba(255, 45, 85, 0.1)',
                  borderRadius: 8,
                  border: '1px solid var(--verdict-desaconsejado)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--verdict-desaconsejado)',
                    fontWeight: 600,
                  }}
                >
                  {t('navegacion.borrar.confirmar')}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setConfirmandoBorradoMenu(false)}
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
                    onClick={async () => {
                      const wp = waypointMenu;
                      setWaypointMenu(null);
                      setConfirmandoBorradoMenu(false);
                      await handleBorrar(wp);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: 'var(--verdict-desaconsejado)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t('navegacion.borrar.borrar')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const afectadas = rutasQueContienen(waypointMenu.id);
                  if (afectadas.length > 0) {
                    const wp = waypointMenu;
                    setWaypointMenu(null);
                    setConfirmandoBorradoMenu(false);
                    setAvisoRutasWp(wp);
                  } else {
                    setConfirmandoBorradoMenu(true);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 45, 85, 0.3)',
                  backgroundColor: 'transparent',
                  color: 'var(--verdict-desaconsejado)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>🗑</span>
                <span>
                  {t('navegacion.acciones.borrar', {
                    defaultValue: 'Borrar',
                  })}
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {elementoMenu && (
        <>
          <div
            onClick={() => setElementoMenu(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              zIndex: 3490,
            }}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              elementoMenu.nombre ||
              (elementoMenu.tipo === 'poligono' ? 'Polígono' : 'Línea')
            }
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3500,
              width: 'calc(100% - 32px)',
              maxWidth: 380,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
              padding: '16px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'rgba(0, 229, 106, 0.12)',
                    border: '1px solid var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  {elementoMenu.tipo === 'poligono' ? '⬡' : '〰'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {elementoMenu.nombre ||
                      (elementoMenu.tipo === 'poligono'
                        ? 'Polígono'
                        : 'Línea')}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      marginTop: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 600,
                    }}
                  >
                    {elementoMenu.tipo === 'poligono'
                      ? 'Polígono importado'
                      : 'Línea importada'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setElementoMenu(null)}
                aria-label={t('common.close', { defaultValue: 'Cerrar' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = elementoMenu;
                onNavegar({
                  tipo: el.tipo,
                  bloqueId: el.bloqueId,
                  capaId: el.capaId,
                  elementoId: el.elementoId,
                });
                setElementoMenu(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: '#000',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '1rem' }}>➤</span>
              <span>
                {elementoMenu.tipo === 'poligono'
                  ? t('navegacion.acciones.navegarPoligono', {
                      defaultValue: 'Navegar a este polígono',
                    })
                  : t('navegacion.acciones.navegarLinea', {
                      defaultValue: 'Navegar a esta línea',
                    })}
              </span>
            </button>
          </div>
        </>
      )}

      {renombrando && (
        <ModalSimple
          titulo={t('navegacion.renombrar.titulo', { defaultValue: 'Renombrar waypoint' })}
          label={t('navegacion.renombrar.label', { defaultValue: 'Nombre' })}
          valorInicial={renombrando.nombre}
          onGuardar={(nuevo) => handleRenombrar(renombrando, nuevo)}
          onCancelar={() => setRenombrando(null)}
        />
      )}

      {creandoCarpeta && (
        <ModalSimple
          titulo="Nueva carpeta"
          label="Nombre de la carpeta"
          valorInicial=""
          onGuardar={async (nombre) => {
            await crearCarpeta(nombre);
            setCreandoCarpeta(false);
          }}
          onCancelar={() => setCreandoCarpeta(false)}
        />
      )}

      {carpetaRenombrando && (
        <ModalSimple
          titulo="Renombrar carpeta"
          label="Nombre"
          valorInicial={carpetaRenombrando.nombre}
          onGuardar={async (nombre) => {
            await renombrarCarpeta(carpetaRenombrando.id, nombre);
            setCarpetaRenombrando(null);
          }}
          onCancelar={() => setCarpetaRenombrando(null)}
        />
      )}

      {moviendoACarpeta && (
        <ModalCarpetas
          carpetas={carpetas}
          carpetaActualId={moviendoACarpeta.carpetaId}
          onSeleccionar={async (id) => {
            await moverWaypointACarpeta(moviendoACarpeta.id, id);
            setMoviendoACarpeta(null);
          }}
          onCerrar={() => setMoviendoACarpeta(null)}
        />
      )}

      {avisoRutasWp && (
        <ModalAvisoRutas
          nombreWaypoint={avisoRutasWp.nombre}
          rutasAfectadas={rutasQueContienen(avisoRutasWp.id).length}
          onConfirmar={async () => {
            const wp = avisoRutasWp;
            setAvisoRutasWp(null);
            await handleBorrar(wp);
          }}
          onCancelar={() => setAvisoRutasWp(null)}
        />
      )}
    </div>
  );
};

interface FilaWaypointProps {
  waypoint: WaypointConColor;
  carpetas: Carpeta[];
  onCentrar: () => void;
  onRenombrar: () => void;
  onMoverCarpeta: () => void;
  onCompartir: () => void;
  onBorrar: () => void;
  onNavegar: () => void;
}

const FilaWaypoint: React.FC<FilaWaypointProps> = ({
  waypoint,
  carpetas,
  onCentrar,
  onRenombrar,
  onMoverCarpeta,
  onCompartir,
  onBorrar,
  onNavegar,
}) => {
  const { t } = useTranslation();
  const rutasQueContienen = useNavegacionStore((s) => s.rutasQueContienenWaypoint);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [avisandoRutas, setAvisandoRutas] = useState(false);

  const iniciarBorrado = () => {
    const afectadas = rutasQueContienen(waypoint.id);
    if (afectadas.length > 0) {
      setAvisandoRutas(true);
    } else {
      setConfirmandoBorrado(true);
    }
  };

  return (
    <>
      <div
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
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: waypoint.color || COLOR_DEFECTO,
                boxShadow: `0 0 6px ${waypoint.color || COLOR_DEFECTO}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {waypoint.nombre}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, Fira Code, monospace)',
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              marginTop: 2,
              paddingLeft: 18,
            }}
          >
            {formatearCoord(waypoint.lat)}, {formatearCoord(waypoint.lon)}
          </div>
        </button>

        <button
          type="button"
          onClick={onNavegar}
          title={t('navegacion.acciones.navegar', {
            defaultValue: 'Navegar a este waypoint',
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
              aria-label={t('navegacion.acciones.opciones', { defaultValue: 'Opciones' })}
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
                    label={t('navegacion.acciones.centrar', { defaultValue: 'Centrar en mapa' })}
                    icono="◎"
                    onClick={() => {
                      setMenuAbierto(false);
                      onCentrar();
                    }}
                  />
                  <BotonMenu
                    label="Mover a carpeta"
                    icono="📁"
                    onClick={() => {
                      setMenuAbierto(false);
                      onMoverCarpeta();
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
                    label={t('navegacion.acciones.borrar')}
                    icono="🗑"
                    peligro
                    onClick={() => {
                      setMenuAbierto(false);
                      iniciarBorrado();
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {avisandoRutas && (
        <ModalAvisoRutas
          nombreWaypoint={waypoint.nombre}
          rutasAfectadas={rutasQueContienen(waypoint.id).length}
          onConfirmar={() => {
            setAvisandoRutas(false);
            onBorrar();
          }}
          onCancelar={() => setAvisandoRutas(false)}
        />
      )}
    </>
  );
};

interface ModalAvisoRutasProps {
  nombreWaypoint: string;
  rutasAfectadas: number;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const ModalAvisoRutas: React.FC<ModalAvisoRutasProps> = ({
  nombreWaypoint,
  rutasAfectadas,
  onConfirmar,
  onCancelar,
}) => {
  const { t } = useTranslation();
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
          border: '1px solid var(--verdict-exigente)',
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
            color: 'var(--verdict-exigente)',
          }}
        >
          ⚠ {t('navegacion.rutas.avisoBorrado.titulo', { defaultValue: 'Waypoint en uso' })}
        </h3>
        <p
          style={{
            margin: '0 0 16px 0',
            fontSize: '0.85rem',
            color: 'var(--text)',
            lineHeight: 1.5,
          }}
        >
          {t('navegacion.rutas.avisoBorrado.cuerpo', {
            nombre: nombreWaypoint,
            count: rutasAfectadas,
            defaultValue: `"${nombreWaypoint}" está en ${rutasAfectadas} ruta(s). Si lo borras, se quitará de esas rutas. Las rutas seguirán existiendo con los demás waypoints.`
          })}
        </p>
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
            {t('navegacion.rutas.avisoBorrado.cancelar', { defaultValue: 'Cancelar' })}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
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
            {t('navegacion.rutas.avisoBorrado.confirmar', { defaultValue: 'Borrar igual' })}
          </button>
        </div>
      </div>
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

export default WaypointsRutasScreen;
// src/screens/Navegacion/WaypointsRutasScreen.tsx