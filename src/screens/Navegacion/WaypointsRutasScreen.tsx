// src/screens/Navegacion/WaypointsRutasScreen.tsx
// WKF — Sub-pestaña "Waypoints y rutas".
// F2.1: mapa Leaflet real, botón "+ Waypoint" en cabecera,
//       modo "colocar pin" explícito (un toque = un waypoint),
//       guardado automático con nombre "Waypoint N",
//       persistencia real en IndexedDB vía navegacion-store.
// La lista de waypoints con acciones (editar, borrar, navegar)
// llega en F2.2. Aquí se muestra la lista simple para confirmar
// que se está guardando bien.

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

import { useNavegacionStore } from '../../state/navegacion-store.ts';
import type { Waypoint } from '../../db/waypoints-repo.ts';

const SPAIN_CENTER: [number, number] = [39.5, -0.5];
const INITIAL_ZOOM = 6;

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

const WAYPOINT_PIN = crearPinIcon('#00E56A');
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

export const WaypointsRutasScreen: React.FC = () => {
  const { t } = useTranslation();
  const waypoints = useNavegacionStore((s) => s.waypoints);
  const crearWaypoint = useNavegacionStore((s) => s.crearWaypoint);
  const cargado = useNavegacionStore((s) => s.cargado);

  const [modoColocar, setModoColocar] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const avisoTimeout = useRef<number | null>(null);

  // Centro del mapa: si hay waypoints, el último creado.
  // Si no, España peninsular.
  const centroInicial = useMemo<[number, number]>(() => {
    if (waypoints.length === 0) return SPAIN_CENTER;
    const ultimo = waypoints[waypoints.length - 1];
    return [ultimo.lat, ultimo.lon];
  }, []);

  const handlePick = async (lat: number, lon: number) => {
    // Salir del modo colocación antes de guardar.
    setModoColocar(false);

    const siguiente = waypoints.length + 1;
    const nombre = `Waypoint ${siguiente}`;

    try {
      await crearWaypoint({ nombre, lat, lon });
      mostrarAviso(`✓ ${nombre} guardado`);
    } catch (err) {
      console.error('Error creando waypoint', err);
      mostrarAviso('Error al guardar el waypoint');
    }
  };

  const mostrarAviso = (msg: string) => {
    setAviso(msg);
    if (avisoTimeout.current) window.clearTimeout(avisoTimeout.current);
    avisoTimeout.current = window.setTimeout(() => setAviso(null), 2200);
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
      {/* Cabecera con título + botón "+ Waypoint" */}
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
          {t('navegacion.subtab.waypoints', { defaultValue: 'Waypoints y rutas' })}
        </h2>

        <button
          type="button"
          onClick={() => setModoColocar((v) => !v)}
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
              ? t('common.cancel', { defaultValue: 'Cancelar' })
              : t('navegacion.addWaypoint', { defaultValue: 'Waypoint' })}
          </span>
        </button>
      </header>

      {/* Aviso flotante del modo / de guardado */}
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
          📍 Toca el mapa para colocar el waypoint
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

      {/* Mapa — ocupa la mitad superior */}
      <div
        style={{
          flexShrink: 0,
          height: '55vh',
          minHeight: 260,
          position: 'relative',
          cursor: modoColocar ? 'crosshair' : 'default',
        }}
      >
        <MapContainer
          center={centroInicial}
          zoom={waypoints.length === 0 ? INITIAL_ZOOM : 13}
          style={{ width: '100%', height: '100%' }}
        >
          <MapController onMap={setMapInstance} />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler activo={modoColocar} onPick={handlePick} />

          {waypoints.map((wp) => (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lon]}
              icon={WAYPOINT_PIN}
            >
              <Tooltip direction="top" offset={[0, -28]} permanent={false}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {wp.nombre}
                </span>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {/* Cruz en el centro cuando el mapa está en modo colocación */}
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

      {/* Lista de waypoints debajo del mapa */}
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
            Cargando…
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
            Todavía no tienes waypoints.
            <br />
            Pulsa <strong style={{ color: 'var(--accent)' }}>+ Waypoint</strong> y
            toca el mapa para colocar el primero.
          </div>
        )}

        {cargado && waypoints.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {waypoints.map((wp) => (
              <FilaWaypoint
                key={wp.id}
                waypoint={wp}
                onClick={() => {
                  if (mapInstance) {
                    mapInstance.flyTo([wp.lat, wp.lon], 14);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FilaWaypoint: React.FC<{
  waypoint: Waypoint;
  onClick: () => void;
}> = ({ waypoint, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        width: '100%',
        padding: '10px 12px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {waypoint.nombre}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono, Fira Code, monospace)',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            marginTop: 2,
          }}
        >
          {formatearCoord(waypoint.lat)}, {formatearCoord(waypoint.lon)}
        </div>
      </div>
      <span
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-dim)',
          flexShrink: 0,
        }}
      >
        ›
      </span>
    </button>
  );
};

export default WaypointsRutasScreen;