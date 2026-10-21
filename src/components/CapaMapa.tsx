// src/components/CapaMapa.tsx
// WKF — Renderizado de las capas importadas en el mapa.
// Fase 23: Añadidos eventHandlers y selección de elementos.

import React from 'react';
import { Polyline, Polygon, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { BloqueCapas, ElementoCapa } from '../db/capas-repo.ts';
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

function resolverColor(original: string | undefined, tipo: 'linea' | 'poligono'): string {
  if (!original) return tipo === 'linea' ? '#FF00FF' : '#00E56A';
  if (esColorInvisible(original)) {
    return colorWkfMasCercano(original);
  }
  return original;
}

export const CapaMapa: React.FC<CapaMapaProps> = ({ bloques, onElementoClick }) => {
  if (!bloques || bloques.length === 0) return null;

  return (
    <>
      {bloques.map((bloque) =>
        bloque.capas.map((capa) => {
          if (!capa.visible) return null;

          return capa.elementos.map((el) => {
            const handleClick = (e: L.LeafletMouseEvent) => {
              if (!onElementoClick) return;
              L.DomEvent.stopPropagation(e);
              onElementoClick(
                bloque.id,
                capa.id,
                el.id,
                el.tipo,
                el.nombre
              );
            };

            const colorFinal = resolverColor(
              capa.colorCapa || el.estilo?.color,
              el.tipo === 'punto' ? 'linea' : el.tipo
            );

            if (el.tipo === 'punto') {
              const coords = Array.isArray(el.coords) && Array.isArray(el.coords[0])
                ? el.coords[0]
                : el.coords;
              if (!Array.isArray(coords) || coords.length < 2) return null;

              return (
                <Marker
                  key={`${bloque.id}-${capa.id}-${el.id}`}
                  position={[coords[0], coords[1]]}
                  icon={obtenerIconoPunto(colorFinal)}
                  eventHandlers={{ click: handleClick }}
                >
                  {el.nombre && (
                    <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{el.nombre}</span>
                    </Tooltip>
                  )}
                </Marker>
              );
            }

            if (el.tipo === 'linea') {
              return (
                <Polyline
                  key={`${bloque.id}-${capa.id}-${el.id}`}
                  positions={el.coords as [number, number][]}
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
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{el.nombre}</span>
                    </Tooltip>
                  )}
                </Polyline>
              );
            }

            if (el.tipo === 'poligono') {
              return (
                <Polygon
                  key={`${bloque.id}-${capa.id}-${el.id}`}
                  positions={el.coords as [number, number][]}
                  pathOptions={{
                    color: colorFinal,
                    weight: 2,
                    opacity: 0.85,
                    fillColor: resolverColor(el.estilo?.relleno || el.estilo?.color, 'poligono'),
                    fillOpacity: 0.22,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{ click: handleClick }}
                >
                  {el.nombre && (
                    <Tooltip sticky opacity={1}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{el.nombre}</span>
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