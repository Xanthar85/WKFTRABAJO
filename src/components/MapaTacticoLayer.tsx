// src/components/MapaTacticoLayer.tsx
import React, { useEffect } from 'react';
import { TileLayer } from 'react-leaflet';

const FILTRO_TACTICO =
  'invert(1) sepia(1) hue-rotate(190deg) saturate(8) brightness(0.7) contrast(2)';

const CLASE_TILE_TACTICO = 'wkf-tile-tactico';
const ID_ESTILO_TACTICO = 'wkf-tile-tactico-style-v3';

function inyectarEstilosTacticos() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ID_ESTILO_TACTICO)) return;
  const style = document.createElement('style');
  style.id = ID_ESTILO_TACTICO;
  style.textContent = `
    .${CLASE_TILE_TACTICO} img.leaflet-tile {
      filter: ${FILTRO_TACTICO};
    }
    .${CLASE_TILE_TACTICO} {
      background: #000;
    }
  `;
  document.head.appendChild(style);
}

export interface MapaTacticoLayerProps {
  opacity?: number;
  zIndex?: number;
}

export const MapaTacticoLayer: React.FC<MapaTacticoLayerProps> = ({
  opacity = 1,
  zIndex,
}) => {
  useEffect(() => {
    inyectarEstilosTacticos();
  }, []);

  return (
    <TileLayer
      className={CLASE_TILE_TACTICO}
      attribution="&copy; OpenStreetMap contributors"
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      opacity={opacity}
      zIndex={zIndex}
    />
  );
};

export default MapaTacticoLayer;
// src/components/MapaTacticoLayer.tsx