// src/components/MapaTacticoLayer.tsx
// WKF — Capa de mapa táctico (F4-bis, Paso 2).
// TileLayer OSM con filtro CSS aplicado SOLO a los tiles (el agua
// queda negra, la tierra verde neón). Encima se pinta una capa de
// topónimos costeros filtrada por viewport, con punto visible y
// nombre en el color más legible de la paleta WKF.
//
// Requiere: Leaflet (ya instalado). Sin dependencias externas.
//
// El filtro CSS se aplica al contenedor del TileLayer mediante
// className en el propio <TileLayer>. React-leaflet permite pasar
// className al TileLayer. El filtro se define en styles inline para
// no depender de CSS global.

import React, { useEffect, useMemo, useState } from 'react';
import { TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

import {
  POBLACIONES_COSTERAS,
  filtrarPorViewport,
  type PoblacionCostera,
} from '../lib/poblaciones-costeras.ts';

// Filtro CSS del mapa táctico:
//   · invert(1) → agua (azul claro OSM) pasa a naranja, tierra
//     (beige) pasa a azul oscuro.
//   · hue-rotate(…) → lleva el naranja a verde neón.
//   · saturate / brightness / contrast ajustan a neón sobre negro.
// El resultado es fondo casi negro, tierra verde neón.
const FILTRO_TACTICO =
  'invert(1) hue-rotate(90deg) saturate(2.2) brightness(1.15) contrast(1.1)';

// ID de clase aplicado al TileLayer. El CSS se inyecta una sola vez.
const CLASE_TILE_TACTICO = 'wkf-tile-tactico';

function inyectarEstilosTacticos() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wkf-tile-tactico-style')) return;
  const style = document.createElement('style');
  style.id = 'wkf-tile-tactico-style';
  style.textContent = `
    .${CLASE_TILE_TACTICO} .leaflet-tile-pane {
      filter: ${FILTRO_TACTICO};
    }
  `;
  document.head.appendChild(style);
}

// El punto y el nombre se pintan con el color más legible de la
// paleta WKF sobre el fondo negro: el verde neón (contraste
// máximo). El nombre se coloca al lado del punto, sin fondo.
const COLOR_TOPONIMO = '#00E56A';

const iconToponimoCache = new Map<string, L.DivIcon>();

function iconToponimo(nombre: string): L.DivIcon {
  const cacheKey = nombre;
  const cached = iconToponimoCache.get(cacheKey);
  if (cached) return cached;

  const html = `
    <div class="wkf-toponimo" style="
      display:flex;align-items:center;gap:5px;
      font-family:'Fira Code',monospace;font-size:11px;
      color:${COLOR_TOPONIMO};white-space:nowrap;
      pointer-events:none;user-select:none;
      text-shadow:0 0 3px #000,0 0 3px #000,0 0 2px #000;
    ">
      <span style="
        display:inline-block;width:6px;height:6px;border-radius:50%;
        background:${COLOR_TOPONIMO};
        box-shadow:0 0 6px ${COLOR_TOPONIMO};
        flex-shrink:0;
      "></span>
      <span>${nombre}</span>
    </div>
  `;

  const icon = L.divIcon({
    className: 'wkf-toponimo-marker',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
  iconToponimoCache.set(cacheKey, icon);
  return icon;
}

interface ViewportBounds {
  sur: number;
  oeste: number;
  norte: number;
  este: number;
}

const BOUNDS_MUNDO: ViewportBounds = {
  sur: -90,
  oeste: -180,
  norte: 90,
  este: 180,
};

function useViewportBounds(): ViewportBounds {
  const map = useMap();
  const [bounds, setBounds] = useState<ViewportBounds>(BOUNDS_MUNDO);

  useEffect(() => {
    function actualizar() {
      const b = map.getBounds();
      // Ligero margen del 10 % para que los topónimos no aparezcan
      // justo en el borde cuando el usuario hace un pequeño paneo.
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const latMargin = (ne.lat - sw.lat) * 0.1;
      const lonMargin = (ne.lng - sw.lng) * 0.1;
      setBounds({
        sur: Math.max(-90, sw.lat - latMargin),
        oeste: Math.max(-180, sw.lng - lonMargin),
        norte: Math.min(90, ne.lat + latMargin),
        este: Math.min(180, ne.lng + lonMargin),
      });
    }

    actualizar();
    map.on('moveend', actualizar);
    map.on('zoomend', actualizar);

    return () => {
      map.off('moveend', actualizar);
      map.off('zoomend', actualizar);
    };
  }, [map]);

  return bounds;
}

const ToponimosCosteros: React.FC = () => {
  const bounds = useViewportBounds();

  const visibles: PoblacionCostera[] = useMemo(
    () => filtrarPorViewport(POBLACIONES_COSTERAS, bounds),
    [bounds]
  );

  return (
    <>
      {visibles.map((p) => (
        <Marker
          key={`top-${p.nombre}-${p.lat}-${p.lon}`}
          position={[p.lat, p.lon]}
          icon={iconToponimo(p.nombre)}
          interactive={false}
          keyboard={false}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
            {p.nombre}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
};

export interface MapaTacticoLayerProps {
  /** Muestra u oculta los topónimos costeros. Por defecto true. */
  mostrarToponimos?: boolean;
  /** Opacidad del TileLayer. Por defecto 1. */
  opacity?: number;
  /** z-index del TileLayer (por defecto el de Leaflet). */
  zIndex?: number;
}

export const MapaTacticoLayer: React.FC<MapaTacticoLayerProps> = ({
  mostrarToponimos = true,
  opacity = 1,
  zIndex,
}) => {
  useEffect(() => {
    inyectarEstilosTacticos();
  }, []);

  return (
    <>
      <TileLayer
        className={CLASE_TILE_TACTICO}
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        opacity={opacity}
        zIndex={zIndex}
      />
      {mostrarToponimos && <ToponimosCosteros />}
    </>
  );
};

export default MapaTacticoLayer;
// src/components/MapaTacticoLayer.tsx