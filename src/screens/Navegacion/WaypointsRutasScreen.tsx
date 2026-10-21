// src/screens/Navegacion/WaypointsRutasScreen.tsx
// WKF — Sub-pestaña "Waypoints". F4-bis (Paso 4) + Fase C (C2 + C4).
// Cambios Fase C:
//   · C2: Altura fija y envoltorio seguro con minHeight: calc(100dvh - 160px)
//     para corregir el fallo de carga del mapa Leaflet en móviles Samsung.
//   · C4: Menú contextual flotante al pulsar cualquier waypoint en el mapa:
//     Navegar a este waypoint, Renombrar, Asignar color (paleta 24 colores WKF) y Borrar.

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
import { CapaMapa, type CapaMapaProps } from '../../components/CapaMapa.tsx';
import { MapaTacticoLayer } from '../../components/MapaTacticoLayer.tsx';
import { PALETA_WKF } from '../../lib/colores-wkf.ts';
import type { DestinoNavegacion } from './NavegarScreen.tsx';

const CapaMapaConClick = CapaMapa as React.FC<
  CapaMapaProps & {
    onElementoClick?: (
      bloqueId: string,
      capaId: string,
      elementoId: string,
      tipo: 'punto' | 'linea' | 'poligono',
      nombre: string | undefined
    ) => void;
  }
>;

// Extensión para soportar la propiedad opcional de color asignado por el usuario
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

const MapController: React.FC<{ onMap: (map: L.Map) => void }> = ({ onMap }) => {
  const map = useMap();
  React.useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

function formatearCoord(v: number): string {
  return v.toFixed(5);
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugificarNombre(nombre: string): string {
  return (
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'waypoint'
  );
}

function exportarWaypointJSON(wp: Waypoint) {
  const payload = {
    formato: 'wkf-waypoint',
    version: 1,
    waypoint: {
      nombre: wp.nombre,
      lat: wp.lat,
      lon: wp.lon,
      nota: wp.nota ?? null,
      color: (wp as WaypointConColor).color ?? null,
      creadoEn: wp.creadoEn,
    },
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  descargarBlob(blob, `${slugificarNombre(wp.nombre)}.wkfwp.json`);
}

function exportarWaypointGPX(wp: Waypoint) {
  const escapar = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const fecha = new Date(wp.creadoEn).toISOString();
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF - World Kayak Fishing"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapar(wp.nombre)}</name>
    <time>${fecha}</time>
  </metadata>
  <wpt lat="${wp.lat}" lon="${wp.lon}">
    <name>${escapar(wp.nombre)}</name>
    ${wp.nota ? `<desc>${escapar(wp.nota)}</desc>` : ''}
    <time>${fecha}</time>
  </wpt>
</gpx>
`;
  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  descargarBlob(blob, `${slugificarNombre(wp.nombre)}.gpx`);
}

interface ModalRenombrarProps {
  nombreActual: string;
  onGuardar: (nuevoNombre: string) => void;
  onCancelar: () => void;
}

const ModalRenombrar: React.FC<ModalRenombrarProps> = ({
  nombreActual,
  onGuardar,
  onCancelar,
}) => {
  const { t } = useTranslation();
  const [valor, setValor] = useState(nombreActual);
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
          {t('navegacion.renombrar.titulo')}
        </h3>

        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            marginBottom: 4,
          }}
        >
          {t('navegacion.renombrar.label')}
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
            {t('navegacion.renombrar.cancelar')}
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
            {t('navegacion.renombrar.guardar')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModalCompartirProps {
  onJSON: () => void;
  onGPX: () => void;
  onCancelar: () => void;
}

const ModalCompartir: React.FC<ModalCompartirProps> = ({
  onJSON,
  onGPX,
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
            margin: '0 0 6px 0',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          {t('navegacion.compartir.titulo')}
        </h3>
        <p
          style={{
            margin: '0 0 14px 0',
            fontSize: '0.82rem',
            color: 'var(--text-dim)',
            lineHeight: 1.5,
          }}
        >
          {t('navegacion.compartir.intro')}
        </p>

        <button
          type="button"
          onClick={onJSON}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 8,
            fontFamily: 'inherit',
          }}
        >
          <span>{t('navegacion.compartir.json')}</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 400,
              color: 'var(--text-dim)',
            }}
          >
            {t('navegacion.compartir.jsonDesc')}
          </span>
        </button>

        <button
          type="button"
          onClick={onGPX}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 12,
            fontFamily: 'inherit',
          }}
        >
          <span>{t('navegacion.compartir.gpx')}</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 400,
              color: 'var(--text-dim)',
            }}
          >
            {t('navegacion.compartir.gpxDesc')}
          </span>
        </button>

        <button
          type="button"
          onClick={onCancelar}
          style={{
            width: '100%',
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
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const crearWaypoint = useNavegacionStore((s) => s.crearWaypoint);
  const actualizarWaypoint = useNavegacionStore((s) => s.actualizarWaypoint);
  const borrarWaypoint = useNavegacionStore((s) => s.borrarWaypoint);
  const rutasQueContienen = useNavegacionStore(
    (s) => s.rutasQueContienenWaypoint
  );
  const actualizarVerticeElemento = useNavegacionStore(
    (s) => s.actualizarVerticeElemento
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

  // Caché de iconos Leaflet según estilo y color asignado
  const iconCache = useRef<Map<string, L.DivIcon>>(new Map());
  const obtenerIconoWaypoint = (
    estilo: 'chincheta' | 'punto',
    colorHex?: string
  ) => {
    const color = colorHex || COLOR_DEFECTO;
    const key = `${estilo}:${color.toLowerCase()}`;
    let icon = iconCache.current.get(key);
    if (!icon) {
      icon =
        estilo === 'chincheta'
          ? crearPinIcon(color)
          : crearPuntoNeonIcon(color);
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
                el.nombre!.trim().toLowerCase() === wp.nombre.trim().toLowerCase())
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

  // Estados para modales y menús
  const [renombrando, setRenombrando] = useState<WaypointConColor | null>(null);
  const [compartiendo, setCompartiendo] = useState<WaypointConColor | null>(null);

  // C4: Menú contextual al pulsar waypoint en el mapa
  const [waypointMenu, setWaypointMenu] = useState<WaypointConColor | null>(null);
  const [confirmandoBorradoMenu, setConfirmandoBorradoMenu] = useState(false);
  const [avisoRutasWp, setAvisoRutasWp] = useState<WaypointConColor | null>(null);

  // Fase E Prompt 2: Menú contextual para polígonos y líneas importadas
  const [elementoMenu, setElementoMenu] = useState<{
    bloqueId: string;
    capaId: string;
    elementoId: string;
    tipo: 'poligono' | 'linea';
    nombre?: string;
  } | null>(null);

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
        () => {
          // Si falla, se conserva la vista inicial por defecto
        },
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
      mostrarAviso(
        t('navegacion.colorActualizado', { defaultValue: 'Color actualizado' })
      );
    } catch (err) {
      console.error('Error asignando color a waypoint', err);
    }
  };

  const handleBorrar = async (wp: WaypointConColor) => {
    try {
      await borrarWaypoint(wp.id);
      if (waypointMenu && waypointMenu.id === wp.id) {
        setWaypointMenu(null);
      }
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
    }
  };

  const handleEditarVertice = async (
    bloqueId: string,
    capaId: string,
    elementoId: string,
    indiceVertice: number,
    lat: number,
    lon: number
  ) => {
    try {
      await actualizarVerticeElemento(
        bloqueId,
        capaId,
        elementoId,
        indiceVertice,
        lat,
        lon
      );
      mostrarAviso(
        t('navegacion.verticeActualizado', {
          defaultValue: 'Vértice actualizado',
        })
      );
    } catch (err) {
      console.error('Error actualizando vértice', err);
    }
  };

  React.useEffect(() => {
    return () => {
      if (avisoTimeout.current) window.clearTimeout(avisoTimeout.current);
    };
  }, []);

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
                  vistaActual === 'mapa' ? 'var(--accent)' : 'var(--text-dim)',
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
                  vistaActual === 'lista' ? 'var(--accent)' : 'var(--text-dim)',
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
              border: `1px solid ${modoColocar ? 'var(--accent)' : 'var(--border)'}`,
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

      {/* C2: Contenedor del mapa con flex:1, minHeight:0 y height:100% explícitos */}
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

        {/* C2: Wrapper inmediato con minHeight: calc(100dvh - 160px) como red de seguridad en móviles Samsung */}
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

            {/* Marcadores de Waypoints con icono según estilo y color personalizado */}
            {waypoints.map((wp) => {
              const icon = obtenerIconoWaypoint(estiloWaypoints, wp.color);
              return (
                <Marker
                  key={wp.id}
                  position={[wp.lat, wp.lon]}
                  icon={icon}
                  draggable={true}
                  eventHandlers={{
                    click: () => {
                      if (!modoColocar) {
                        setConfirmandoBorradoMenu(false);
                        setElementoMenu(null);
                        setWaypointMenu(wp);
                      }
                    },
                    dragend: (e) => {
                      const marker = e.target as L.Marker;
                      const ll = marker.getLatLng();
                      void handleDragEnd(wp, ll.lat, ll.lng);
                    },
                  }}
                >
                  <Tooltip direction="top" offset={tooltipOffset} permanent={false}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {wp.nombre}
                    </span>
                  </Tooltip>
                </Marker>
              );
            })}

            <CapaMapaConClick
              bloques={bloquesCapasFiltrados}
              onElementoClick={(bloqueId, capaId, elementoId, tipo, nombre) => {
                if (tipo === 'poligono' || tipo === 'linea') {
                  setWaypointMenu(null);
                  setConfirmandoBorradoMenu(false);
                  setElementoMenu({
                    bloqueId,
                    capaId,
                    elementoId,
                    tipo,
                    nombre,
                  });
                }
              }}
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

          {cargado && waypoints.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {waypoints.map((wp) => (
                <FilaWaypoint
                  key={wp.id}
                  waypoint={wp}
                  onCentrar={() => {
                    setVistaActual('mapa');
                    handleCentrar(wp);
                  }}
                  onRenombrar={() => setRenombrando(wp)}
                  onCompartir={() => setCompartiendo(wp)}
                  onBorrar={() => handleBorrar(wp)}
                  onNavegar={() => handleNavegar(wp)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* C4: Menú contextual flotante al pulsar un waypoint en el mapa */}
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
            {/* Cabecera del menú: nombre del waypoint (no editable aquí) + cerrar */}
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
                    backgroundColor: waypointMenu.color || COLOR_DEFECTO,
                    boxShadow: `0 0 8px ${waypointMenu.color || COLOR_DEFECTO}`,
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
                    {formatearCoord(waypointMenu.lat)}, {formatearCoord(waypointMenu.lon)}
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

            {/* Acción 1: Navegar a este waypoint */}
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
                transition: 'opacity 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1rem' }}>➤</span>
              <span>
                {t('navegacion.acciones.navegar', {
                  defaultValue: 'Navegar a este waypoint',
                })}
              </span>
            </button>

            {/* Acción 2: Renombrar */}
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
              <span style={{ fontSize: '0.95rem', color: 'var(--accent)' }}>✎</span>
              <span>
                {t('navegacion.acciones.renombrar', { defaultValue: 'Renombrar' })}
              </span>
            </button>

            {/* Acción 3: Asignar color (paleta 24 colores WKF) */}
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
                  const colorActual =
                    (waypointMenu.color || COLOR_DEFECTO).toLowerCase();
                  const activo = colorActual === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => void handleAsignarColor(waypointMenu, c.hex)}
                      title={c.nombre}
                      aria-label={c.nombre}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '50%',
                        backgroundColor: c.hex,
                        border: activo ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.6)',
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

            {/* Acción 4: Borrar */}
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
                  {t('navegacion.acciones.borrar', { defaultValue: 'Borrar' })}
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Fase E: Menú contextual flotante al pulsar un polígono o línea importada en el mapa */}
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
              (elementoMenu.tipo === 'poligono'
                ? t('navegacion.elemento.poligono', { defaultValue: 'Polígono' })
                : t('navegacion.elemento.linea', { defaultValue: 'Línea' }))
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
            {/* Cabecera del menú: icono + nombre + tipo + botón cerrar */}
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
                        ? t('navegacion.elemento.poligono', { defaultValue: 'Polígono' })
                        : t('navegacion.elemento.linea', { defaultValue: 'Línea' }))}
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
                      ? t('navegacion.elemento.poligonoImportado', {
                          defaultValue: 'Polígono importado',
                        })
                      : t('navegacion.elemento.lineaImportada', {
                          defaultValue: 'Línea importada',
                        })}
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

            {/* Botón de acción: ➤ Navegar a este polígono / línea */}
            <button
              type="button"
              onClick={() => {
                const el = elementoMenu;
                setElementoMenu(null);
                onNavegar({
                  tipo: el.tipo,
                  bloqueId: el.bloqueId,
                  capaId: el.capaId,
                  elementoId: el.elementoId,
                });
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
                transition: 'opacity 0.15s ease',
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
        <ModalRenombrar
          nombreActual={renombrando.nombre}
          onGuardar={(nuevo) => handleRenombrar(renombrando, nuevo)}
          onCancelar={() => setRenombrando(null)}
        />
      )}

      {compartiendo && (
        <ModalCompartir
          onJSON={() => {
            exportarWaypointJSON(compartiendo);
            setCompartiendo(null);
          }}
          onGPX={() => {
            exportarWaypointGPX(compartiendo);
            setCompartiendo(null);
          }}
          onCancelar={() => setCompartiendo(null)}
        />
      )}

      {/* Modal de aviso si el waypoint está en uso en rutas */}
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
  onCentrar: () => void;
  onRenombrar: () => void;
  onCompartir: () => void;
  onBorrar: () => void;
  onNavegar: () => void;
}

const FilaWaypoint: React.FC<FilaWaypointProps> = ({
  waypoint,
  onCentrar,
  onRenombrar,
  onCompartir,
  onBorrar,
  onNavegar,
}) => {
  const { t } = useTranslation();
  const rutasQueContienen = useNavegacionStore(
    (s) => s.rutasQueContienenWaypoint
  );
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
                    label={t('navegacion.acciones.compartir')}
                    icono="⤴"
                    onClick={() => {
                      setMenuAbierto(false);
                      onCompartir();
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
          ⚠ {t('navegacion.rutas.avisoBorrado.titulo')}
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
            {t('navegacion.rutas.avisoBorrado.cancelar')}
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
            {t('navegacion.rutas.avisoBorrado.confirmar')}
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
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
    }}
  >
    <span style={{ fontSize: '0.95rem', width: 16, textAlign: 'center' }}>
      {icono}
    </span>
    <span>{label}</span>
  </button>
);

export default WaypointsRutasScreen;