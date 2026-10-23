// src/components/MapaTacticoLayer.tsx
// v1.050 — Fase 28 + fix: el filtro ahora reacciona al cambio de prop.
// El bug anterior: el CSS solo se aplicaba en eventHandlers.add, que
// Leaflet dispara UNA sola vez. Al cambiar de filtro, el contenedor
// se quedaba con el filtro inicial (Táctico). Ahora un useEffect
// reaplica el filter cada vez que cambia `filtro`.

import React, { useEffect, useRef } from 'react';
import { TileLayer } from 'react-leaflet';
import L from 'leaflet';
import type { FiltroMapa } from '../state/store.ts';

const CLASE_TILE = 'wkf-tile-filtro';
const ID_ESTILO = 'wkf-tile-filtro-style-v1';

const FILTROS_CSS: Record<Exclude<FiltroMapa, 'osm'>, string> = {
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
  filtro = 'azul1',
  opacity = 1,
  zIndex,
}) => {
  const tileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    inyectarEstilos();
  }, []);

  const css = filtro === 'osm' ? null : FILTROS_CSS[filtro];

  // Reaplica el filtro cada vez que cambia `filtro`. El contenedor
  // puede ser null la primera vez (antes de montar la capa); en ese
  // caso, el siguiente render lo recoge.
  useEffect(() => {
    const layer = tileRef.current;
    if (!layer) return;
    const container = layer.getContainer();
    if (!container) return;
    container.style.filter = css ?? 'none';
  }, [css]);

  return (
    <TileLayer
      ref={(l) => {
        tileRef.current = l as L.TileLayer | null;
      }}
      className={CLASE_TILE}
      attribution="&copy; OpenStreetMap contributors"
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      opacity={opacity}
      zIndex={zIndex}
      eventHandlers={{
        add: (e) => {
          const layer = e.target as L.TileLayer;
          tileRef.current = layer;
          const container = layer.getContainer();
          if (container) {
            container.style.filter = css ?? 'none';
          }
        },
      }}
    />
  );
};

export default MapaTacticoLayer;
// src/components/MapaTacticoLayer.tsx