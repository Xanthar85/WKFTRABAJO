// src/screens/Navegacion/MapaScreen.tsx
// WKF — Pestaña Mapa (Fase 3 WKF1.055 + Fallo A).
// WKF1.057 + WKF1.058:
//   · Selección interactiva de waypoints, rutas y tracks.
//   · Botón ➤ para navegar al elemento seleccionado.
//   · ZoomControl y Tooltip en waypoints.
// WKF1.061: Bug 2b - rutas y tracks visibles en Mapa.
// WKF1.063: Eliminados `as any` de los colores de waypoints.

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAppStore, type FiltroMapa } from '../../state/store.ts';
import { MapaTacticoLayer } from '../../components/MapaTacticoLayer.tsx';
import { CapaMapa } from '../../components/CapaMapa.tsx';
import { useNavegacionStore } from '../../state/navegacion-store.ts';
import type { DestinoNavegacion } from './NavegarScreen.tsx';

const ORDEN_FILTROS: FiltroMapa[] = [
  'osm',
  'azul1',
  'azul2',
  'granate1',
  'granate2',
  'oscuro',
];

const iconoCacheMapa = new Map<string, L.DivIcon>();

function crearIconoWaypoint(color: string = '#00E56A'): L.DivIcon {
  const existente = iconoCacheMapa.get(color);
  if (existente) return existente;

  const icono = L.divIcon({
    className: 'wkf-nav-waypoint-punto',
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

  iconoCacheMapa.set(color, icono);
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

export interface MapaScreenProps {
  onNavegar: (destino: DestinoNavegacion) => void;
}

export const MapaScreen: React.FC<MapaScreenProps> = ({ onNavegar }) => {
  const { t } = useTranslation();

  const filtroMapa = useAppStore((s) => s.ajustes.filtroMapa);
  const setFiltroMapa = useAppStore((s) => s.setFiltroMapa);

  const waypoints = useNavegacionStore((s) => s.waypoints);
  const rutas = useNavegacionStore((s) => s.rutas);
  const tracks = useNavegacionStore((s) => s.tracks);
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);
  const actualizarWaypoint = useNavegacionStore((s) => s.actualizarWaypoint);

  const [modoCreacion, setModoCreacion] = useState(false);
  const [nuevoWaypointCoords, setNuevoWaypointCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [nombreNuevoWaypoint, setNombreNuevoWaypoint] = useState('');

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [seleccion, setSeleccion] = useState<
    | { tipo: 'waypoint'; id: string; nombre: string }
    | { tipo: 'ruta'; id: string; nombre: string }
    | { tipo: 'track'; id: string; nombre: string }
    | null
  >(null);

  const handleGuardarWaypoint = async () => {
    if (!nuevoWaypointCoords) return;
    const nombre =
      nombreNuevoWaypoint.trim() || `Waypoint ${waypoints.length + 1}`;
    await useNavegacionStore.getState().crearWaypoint({
      nombre,
      lat: nuevoWaypointCoords.lat,
      lon: nuevoWaypointCoords.lon,
    });
    setNuevoWaypointCoords(null);
    setModoCreacion(false);
  };

  const waypointsPorId = useMemo(() => {
    const m = new Map<string, (typeof waypoints)[number]>();
    for (const w of waypoints) m.set(w.id, w);
    return m;
  }, [waypoints]);

  const rutasVisibles = useMemo(() => {
    return rutas
      .filter((r) => (r.visible ?? true) !== false)
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
  }, [rutas, waypointsPorId]);

  const tracksVisibles = useMemo(() => {
    return tracks
      .filter((t) => (t.visible ?? true) !== false)
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        puntos: (Array.isArray(t.puntos) ? t.puntos : []).map(
          (p) => [p.lat, p.lon] as [number, number]
        ),
      }))
      .filter((t) => t.puntos.length >= 2);
  }, [tracks]);

  const waypointsVisibles = useMemo(
    () => waypoints.filter((w) => (w.visible ?? true) !== false),
    [waypoints]
  );

  const centroInicial: [number, number] = (() => {
    if (waypointsVisibles.length > 0) {
      const primero = waypointsVisibles[0];
      return [primero.lat, primero.lon];
    }
    return [39.5, -0.5];
  })();

  const handleCentrar = () => {
    if (!mapInstance) return;
    const todosPuntos: [number, number][] = [
      ...waypointsVisibles.map((w) => [w.lat, w.lon] as [number, number]),
      ...rutasVisibles.flatMap((r) => r.puntos),
      ...tracksVisibles.flatMap((t) => t.puntos),
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

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        position: 'relative',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapContainer
          center={centroInicial}
          zoom={waypointsVisibles.length === 0 ? 12 : 13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapController onMap={setMapInstance} />
          <MapClickHandler
            onMapClick={(latlng) => {
              if (modoCreacion) {
                setNombreNuevoWaypoint(`Waypoint ${waypoints.length + 1}`);
                setNuevoWaypointCoords({ lat: latlng.lat, lon: latlng.lng });
              } else {
                setSeleccion(null);
              }
            }}
          />
          <MapaTacticoLayer filtro={filtroMapa} />

          <CapaMapa bloques={bloquesCapas} />

          {rutasVisibles.map((r) => {
            const isSelected = seleccion?.tipo === 'ruta' && seleccion.id === r.id;
            return (
              <React.Fragment key={`ruta-${r.id}`}>
                <Polyline
                  positions={r.puntos}
                  pathOptions={{
                    color: '#00E56A',
                    weight: isSelected ? 4 : 2,
                    opacity: isSelected ? 1 : 0.55,
                    dashArray: '4 4',
                  }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      setSeleccion({ tipo: 'ruta', id: r.id, nombre: r.nombre });
                    },
                  }}
                />
                <Polyline
                  positions={r.puntos}
                  pathOptions={{ weight: 24, opacity: 0, interactive: true }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      setSeleccion({ tipo: 'ruta', id: r.id, nombre: r.nombre });
                    },
                  }}
                />
              </React.Fragment>
            );
          })}

          {tracksVisibles.map((tk) => {
            const isSelected = seleccion?.tipo === 'track' && seleccion.id === tk.id;
            return (
              <React.Fragment key={`track-${tk.id}`}>
                <Polyline
                  positions={tk.puntos}
                  pathOptions={{
                    color: '#00B8FF',
                    weight: isSelected ? 4 : 2,
                    opacity: isSelected ? 1 : 0.7,
                  }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      setSeleccion({ tipo: 'track', id: tk.id, nombre: tk.nombre });
                    },
                  }}
                />
                <Polyline
                  positions={tk.puntos}
                  pathOptions={{ weight: 24, opacity: 0, interactive: true }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      setSeleccion({ tipo: 'track', id: tk.id, nombre: tk.nombre });
                    },
                  }}
                />
              </React.Fragment>
            );
          })}

          {waypointsVisibles.map((w) => {
            const colorWp = w.color || '#00E56A';
            const icon = crearIconoWaypoint(colorWp);
            return (
              <Marker
                key={`wp-${w.id}-${w.visible === false ? 'off' : 'on'}`}
                position={[w.lat, w.lon]}
                icon={icon}
                draggable={true}
                interactive={true}
                bubblingMouseEvents={false}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    setSeleccion({ tipo: 'waypoint', id: w.id, nombre: w.nombre });
                  },
                  dragend: (e) => {
                    const marker = e.target as L.Marker;
                    const latlng = marker.getLatLng();
                    actualizarWaypoint(w.id, { lat: latlng.lat, lon: latlng.lng });
                  },
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -8]}
                  opacity={1}
                >
                  {w.nombre}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>

        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
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
            disabled={!seleccion}
            onClick={() => {
              if (seleccion) {
                onNavegar?.({ tipo: seleccion.tipo, id: seleccion.id });
                setSeleccion(null);
              }
            }}
            title={
              seleccion
                ? `Navegar a ${seleccion.nombre}`
                : 'Selecciona un elemento para navegar'
            }
            aria-label={
              seleccion
                ? `Navegar a ${seleccion.nombre}`
                : 'Navegar'
            }
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: seleccion ? '#00E56A' : 'var(--text-muted, #888)',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: seleccion ? 'pointer' : 'not-allowed',
              opacity: seleccion ? 1 : 0.4,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            ➤
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

        {nuevoWaypointCoords && (
          <div
            onClick={() => setNuevoWaypointCoords(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex: 4000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
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
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                📍 Nuevo waypoint
              </h3>
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '0.78rem',
                  color: 'var(--text-dim)',
                }}
              >
                {nuevoWaypointCoords.lat.toFixed(5)}, {nuevoWaypointCoords.lon.toFixed(5)}
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
                Nombre
              </label>
              <input
                type="text"
                autoFocus
                value={nombreNuevoWaypoint}
                onChange={(e) => setNombreNuevoWaypoint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleGuardarWaypoint();
                  if (e.key === 'Escape') setNuevoWaypointCoords(null);
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
                  onClick={() => setNuevoWaypointCoords(null)}
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
                  onClick={() => void handleGuardarWaypoint()}
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
        )}
      </div>
    </div>
  );
};

export default MapaScreen;
// src/screens/Navegacion/MapaScreen.tsx