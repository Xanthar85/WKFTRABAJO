// src/screens/Navegacion/MapaScreen.tsx
// WKF — Pestaña Mapa (Fase 3 WKF1.055 + Fallo A).
// WKF1.057:
//   · Fix Fallo A: filtro de waypoints visibles por `visible`.

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAppStore, type FiltroMapa } from '../../state/store.ts';
import { MapaTacticoLayer } from '../../components/MapaTacticoLayer.tsx';
import { CapaMapa } from '../../components/CapaMapa.tsx';
import { useNavegacionStore } from '../../state/navegacion-store.ts';

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

export const MapaScreen: React.FC = () => {
  const { t } = useTranslation();

  const filtroMapa = useAppStore((s) => s.ajustes.filtroMapa);
  const setFiltroMapa = useAppStore((s) => s.setFiltroMapa);

  const waypoints = useNavegacionStore((s) => s.waypoints);
  const rutas = useNavegacionStore((s) => s.rutas);
  const tracks = useNavegacionStore((s) => s.tracks);
  const bloquesCapas = useNavegacionStore((s) => s.bloquesCapas);

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const waypointsPorId = useMemo(() => {
    const m = new Map<string, typeof waypoints[number]>();
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
          <MapaTacticoLayer filtro={filtroMapa} />

          <CapaMapa bloques={bloquesCapas} />

          {rutasVisibles.map((r) => (
            <Polyline
              key={`ruta-${r.id}`}
              positions={r.puntos}
              pathOptions={{
                color: '#00E56A',
                weight: 2,
                opacity: 0.55,
                dashArray: '4 4',
              }}
            />
          ))}

          {tracksVisibles.map((tk) => (
            <Polyline
              key={`track-${tk.id}`}
              positions={tk.puntos}
              pathOptions={{
                color: '#00B8FF',
                weight: 2,
                opacity: 0.7,
              }}
            />
          ))}

          {waypointsVisibles.map((w) => (
            <Marker
              key={`wp-${w.id}-${w.visible === false ? 'off' : 'on'}`}
              position={[w.lat, w.lon]}
              icon={PIN_WAYPOINT_STORE_ICON}
              interactive={false}
            />
          ))}
        </MapContainer>

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
        </div>
      </div>
    </div>
  );
};

export default MapaScreen;
// src/screens/Navegacion/MapaScreen.tsx