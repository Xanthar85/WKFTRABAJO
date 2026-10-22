// src/components/MapaTacticoLayer.tsx
// v1.048 — Fase 28: recibe el filtro por prop. 7 modos.
import React, { useEffect } from 'react';
import { TileLayer } from 'react-leaflet';
import L from 'leaflet';
import type { FiltroMapa } from '../state/store.ts';

const CLASE_TILE = 'wkf-tile-filtro';
const ID_ESTILO = 'wkf-tile-filtro-style-v1';

const FILTROS_CSS: Record<Exclude<FiltroMapa, 'osm'>, string> = {
  tactico:
    'invert(1) sepia(1) hue-rotate(190deg) saturate(8) brightness(0.7) contrast(2)',
  azul1:
    'invert(1) sepia(1) hue-rotate(190deg) saturate(8) brightness(0.7) contrast(2)',
  azul2:
    'invert(1) hue-rotate(200deg) saturate(5) contrast(1.5) brightness(0.6)',
  granate1:
    'invert(1) hue-rotate(180deg) sepia(1) saturate(3) brightness(0.8) contrast(1.5)',
  granate2:
    'invert(1) hue-rotate(180deg) contrast(1.5) brightness(0.9) sepia(1) hue-rotate(-50deg) saturate(5)',
  oscuro:
    'invert(1) grayscale(1) contrast(4) sepia(1) hue-rotate(-30deg) saturate(8)',
};

function inyectarEstilos() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ID_ESTILO)) return;
  const style = document.createElement('style');
  style.id = ID_ESTILO;
  style.textContent = `
    .${CLASE_TILE} img.leaflet-tile { transition: filter 0.2s ease; }
    .${CLASE_TILE} { background: #000; }
  `;
  document.head.appendChild(style);
}

export interface MapaTacticoLayerProps {
  filtro?: FiltroMapa;
  opacity?: number;
  zIndex?: number;
}

export const MapaTacticoLayer: React.FC<MapaTacticoLayerProps> = ({
  filtro = 'tactico',
  opacity = 1,
  zIndex,
}) => {
  useEffect(() => {
    inyectarEstilos();
  }, []);

  const css = filtro === 'osm' ? null : FILTROS_CSS[filtro];

  return (
    <TileLayer
      className={CLASE_TILE}
      attribution="&copy; OpenStreetMap contributors"
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      opacity={opacity}
      zIndex={zIndex}
      eventHandlers={{
        add: (e) => {
          const container = (e.target as L.TileLayer).getContainer();
          if (container) {
            container.style.filter = css ?? 'none';
          }
        },
      }}
    />
  );
};

export default MapaTacticoLayer;