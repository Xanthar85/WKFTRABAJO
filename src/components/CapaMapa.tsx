// src/components/CapaMapa.tsx

import React from 'react';
import { Polyline, Polygon, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { BloqueCapas, ElementoCapa, Capa } from '../db/capas-repo.ts';
import { PALETA_WKF, esColorInvisible, colorWkfMasCercano } from '../lib/colores-wkf.ts';

export type OnElementoClick = (
  bloqueId: string,
  capaId: string,
  elementoId: string,
  tipo: 'punto' | 'linea' | 'poligono',
  nombre: string | undefined
) => void;

export interface CapaMapaProps {
  bloques: BloqueCapas[];
  onElementoClick?: OnElementoClick;
}

const iconCache = new Map<string, L.DivIcon>();

function obtenerIconoPunto(color: string, size = 10): L.DivIcon {
  const key = `${color}:${size}`;
  if (iconCache.has(key)) return iconCache.get(key)!;

  const icon = L.divIcon({
    className: 'wkf-capa-punto',
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        box-shadow:0 0 4px ${color};
        border:1px solid #000;
        box-sizing:border-box;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

function resolverColor(
  original: string | undefined,
  tipo: 'linea' | 'poligono'
): string {
  if (!original) return tipo === 'linea' ? '#FF00FF' : '#00E56A';
  if (esColorInvisible(original)) {
    return colorWkfMasCercano(original);
  }
  return original;
}

// Herencia de color: elemento → capa → bloque → defecto.
function colorEfectivo(
  bloque: BloqueCapas,
  capa: Capa,
  el: ElementoCapa,
  tipo: 'linea' | 'poligono'
): string {
  const base =
    el.estilo?.color || capa.colorCapa || bloque.colorBloque || undefined;
  return resolverColor(base, tipo);
}

export const CapaMapa: React.FC<CapaMapaProps> = ({
  bloques,
  onElementoClick,
}) => {
  if (!bloques || bloques.length === 0) return null;

  return (
    <>
      {bloques.map((bloque) =>
        bloque.capas.map((capa) => {
          if (!capa.visible) return null;

          return capa.elementos.map((el) => {
            if ((el.visible ?? true) === false) return null;

            const handleClick = (e: L.LeafletMouseEvent) => {
              if (!onElementoClick) return;
              L.DomEvent.stopPropagation(e);
              onElementoClick(bloque.id, capa.id, el.id, el.tipo, el.nombre);
            };

            const colorFinal = colorEfectivo(
              bloque,
              capa,
              el,
              el.tipo === 'punto' ? 'linea' : el.tipo
            );

            if (el.tipo === 'punto') {
              const c = el.coords;
              let lat = 0;
              let lon = 0;

              if (Array.isArray(c)) {
                if (typeof c[0] === 'number' && typeof c[1] === 'number') {
                  lat = c[0] as number;
                  lon = c[1] as number;
                } else if (
                  Array.isArray(c[0]) &&
                  typeof c[0][0] === 'number' &&
                  typeof c[0][1] === 'number'
                ) {
                  lat = c[0][0];
                  lon = c[0][1];
                }
              }

              if (lat === 0 && lon === 0) return null;

              return (
                <Marker
                  key={`${bloque.id}-${capa.id}-${el.id}`}
                  position={[lat, lon]}
                  icon={obtenerIconoPunto(colorFinal)}
                  eventHandlers={{ click: handleClick }}
                >
                  {el.nombre && (
                    <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {el.nombre}
                      </span>
                    </Tooltip>
                  )}
                </Marker>
              );
            }

            if (el.tipo === 'linea') {
              const pts = el.coords as [number, number][];
              return (
                <Polyline
                  key={`${bloque.id}-${capa.id}-${el.id}`}
                  positions={pts}
                  pathOptions={{
                    color: colorFinal,
                    weight: 3,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{ click: handleClick }}
                >
                  {el.nombre && (
                    <Tooltip sticky opacity={1}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {el.nombre}
                      </span>
                    </Tooltip>
                  )}
                </Polyline>
              );
            }

            if (el.tipo === 'poligono') {
              const pts = el.coords as [number, number][];
              return (
                <Polygon
                  key={`${bloque.id}-${capa.id}-${el.id}`}
                  positions={pts}
                  pathOptions={{
                    color: colorFinal,
                    weight: 2,
                    opacity: 0.85,
                    fillColor: resolverColor(
                      el.estilo?.relleno ||
                        capa.colorCapa ||
                        bloque.colorBloque ||
                        undefined,
                      'poligono'
                    ),
                    fillOpacity: 0.22,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{ click: handleClick }}
                >
                  {el.nombre && (
                    <Tooltip sticky opacity={1}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {el.nombre}
                      </span>
                    </Tooltip>
                  )}
                </Polygon>
              );
            }

            return null;
          });
        })
      )}
    </>
  );
};

// src/components/CapaMapa.tsx