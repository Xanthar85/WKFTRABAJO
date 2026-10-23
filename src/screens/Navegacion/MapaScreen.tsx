// src/screens/Navegacion/MapaScreen.tsx
// WKF — Pestaña Mapa (Fase 3 WKF1.055 + Fallo A + pulsación larga WKF1.057).
// WKF1.057:
//   · Fix Fallo A: filtro de waypoints visibles por `visible`.
//   · Pulsación larga en el mapa = crea waypoint al instante
//     con nombre "Waypoint N" en WKF Waypoints. Sin modal.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAppStore, type FiltroMapa } from '../../state/store.ts';
import { MapaTacticoLayer } from '../../components/MapaTacticoLayer.tsx';
import { CapaMapa } from '../../components/CapaMapa.tsx';
import {
  useNavegacionStore,
  WKF_WAYPOINTS_ID,
} from '../../state/navegacion-store.ts';

const ORDEN_FILTROS: FiltroMapa[] = [
  'osm',
  'azul1',
  'azul2',
  'granate1',
  'granate2',
  'oscuro',
];

const PULSACION_LARGA_MS = 650;

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

const PulsacionLargaHandler: React.FC<{
  onLongPress: (lat: number, lon: number) => void;
}> = ({ onLongPress }) => {
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ lat: number; lon: number } | null>(null);

  const cancelar = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    originRef.current = null;
  };

  useMapEvents({
    mousedown(e) {
      cancelar();
      originRef.current = { lat: e.latlng.lat, lon: e.latlng.lng };
      timerRef.current = window.setTimeout(() => {
        const o = originRef.current;
        timerRef.current = null;
        originRef.current = null;
        if (o) onLongPress(o.lat, o.lon);
      }, PULSACION_LARGA_MS);
    },
    mouseup() {
      cancelar();
    },
    mouseout() {
      cancelar();
    },
    touchstart(e) {
      cancelar();
      const p = e.originalEvent?.touches?.[0];
      if (p) {
        const map = (e.target as L.Evented & { _map?: L.Map })._map;
        if (map) {
          const ll = map.mouseEventToLatLng(p);
          originRef.current = { lat: ll.lat, lon: ll.lng };
          timerRef.current = window.setTimeout(() => {
            const o = originRef.current;
            timerRef.current = null;
            originRef.current = null;
            if (o) onLongPress(o.lat, o.lon);
          }, PULSACION_LARGA_MS);
        }
      }
    },
    touchend() {
      cancelar();
    },
    touchcancel() {
      cancelar();
    },
    dragstart() {
      cancelar();
    },
    zoomstart() {
      cancelar();
    },
  });

  useEffect(() => {
    return () => {
      cancelar();
    };
  }, []);

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
  const crearWaypoint = useNavegacionStore((s) => s.crearWaypoint);

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const mostrarAviso = (msg: string) => {
    setAviso(msg);
    window.setTimeout(() => setAviso(null), 2000);
  };

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

  const handlePulsacionLarga = async (lat: number, lon: number) => {
    try {
      const numero = waypoints.length + 1;
      const nombre = `Waypoint ${numero}`;
      await crearWaypoint({
        nombre,
        lat,
        lon,
        carpetaId: WKF_WAYPOINTS_ID,
      });
      mostrarAviso(`${nombre} creado`);
    } catch (err) {
      console.error('Error creando waypoint por pulsación larga', err);
      mostrarAviso('Error creando waypoint.');
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

          <PulsacionLargaHandler onLongPress={handlePulsacionLarga} />

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

        {aviso && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1500,
              padding: '8px 14px',
              backgroundColor: 'rgba(0, 229, 106, 0.18)',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              color: 'var(--accent)',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}
          >
            {aviso}
          </div>
        )}

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