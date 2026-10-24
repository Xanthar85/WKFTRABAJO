// src/screens/Navegacion/MapaScreen.tsx
// WKF — Pestaña Mapa (Fase 3 WKF1.055 + Fallo A).
// WKF1.057 + WKF1.058:
//   · Selección interactiva de waypoints, rutas y tracks.
//   · Botón ➤ para navegar al elemento seleccionado.
//   · ZoomControl y Tooltip en waypoints.

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
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

const PIN_WAYPOINT_STORE_ICON = L.divIcon({
  className: 'wkf-nav-waypoint-store',
  html: `
    <div style="
      width:12px;height:12px;border-radius:50%;
      background:#00E56A;
      box-shadow:0 0 6px #00E56A,0 0 12px #00E56A88;
      border:2px solid #000;
      box-sizing:border-box;
    "></div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const MapController: React.FC<{ onMap: (map: L.Map) => void }> = ({ onMap }) => {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

const MapClickHandler: React.FC<{ onMapClick: () => void }> = ({ onMapClick }) => {
  useMapEvents({
    click() {
      onMapClick();
    },
  });
  return null;
};

export interface MapaScreenProps {
  onNavegar?: (destino: DestinoNavegacion) => void;
}

export const MapaScreen: React.FC<MapaScreenProps> = ({ onNavegar }) => {
  const { t } = useTranslation();

  const filtroMapa = useAppStore((s) => s.ajustes.filtroMapa);
  const setFiltroMapa = useAppStore((s) => s.setFiltroMapa);

  const waypoints = useNavegacionStore((s) => s.waypoints);
  const rutas = useNavegacionStore((s) => s.rutas);
  const tracks = useNavegacionStore((s) => s.tracks);
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [seleccion, setSeleccion] = useState<
    | { tipo: 'waypoint'; id: string; nombre: string }
    | { tipo: 'ruta'; id: string; nombre: string }
    | { tipo: 'track'; id: string; nombre: string }
    | null
  >(null);

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
    if (waypointsVisibles.length === 0) return;
    if (waypointsVisibles.length === 1) {
      const w = waypointsVisibles[0];
      mapInstance.flyTo([w.lat, w.lon], 13);
      return;
    }
    const bounds = L.latLngBounds(
      waypointsVisibles.map((w) => [w.lat, w.lon] as [number, number])
    );
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
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
          zoom={waypointsVisibles.length === 0 ? 6 : 13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapController onMap={setMapInstance} />
          <MapClickHandler onMapClick={() => setSeleccion(null)} />
          <ZoomControl position="bottomright" />
          <MapaTacticoLayer filtro={filtroMapa} />

          <CapaMapa bloques={bloquesCapas} />

          {rutasVisibles.map((r) => {
            const isSelected = seleccion?.tipo === 'ruta' && seleccion.id === r.id;
            return (
              <Polyline
                key={`ruta-${r.id}`}
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
            );
          })}

          {tracksVisibles.map((tk) => {
            const isSelected = seleccion?.tipo === 'track' && seleccion.id === tk.id;
            return (
              <Polyline
                key={`track-${tk.id}`}
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
            );
          })}

          {waypointsVisibles.map((w) => (
            <Marker
              key={`wp-${w.id}-${w.visible === false ? 'off' : 'on'}`}
              position={[w.lat, w.lon]}
              icon={PIN_WAYPOINT_STORE_ICON}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  setSeleccion({ tipo: 'waypoint', id: w.id, nombre: w.nombre });
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                {w.nombre}
              </Tooltip>
            </Marker>
          ))}
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
        </div>
      </div>
    </div>
  );
};

export default MapaScreen;