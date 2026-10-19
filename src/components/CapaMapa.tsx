// src/components/CapaMapa.tsx
// WKF — Componente que pinta sobre el mapa Leaflet las capas
// importadas (F4.5 / F4-bis, Paso 5 + Paso 6).
//
// Cambios respecto a la versión del Paso 3:
//   · Paso 5: si la capa tiene `colorCapa` definido, ese color
//     manda sobre el color original de cada elemento. Se aplica a
//     puntos, líneas (color) y polígonos (borde y relleno).
//   · Paso 6: edición de geometría — arrastrar vértices de líneas
//     y polígonos. Al soltar un vértice se llama a `onEditarVertice`
//     que persiste la nueva coordenada. Guardado automático.
//
// Sin iconos opcionales todavía (eso es T4, no está en este plan).

import React, { useMemo } from 'react';
import { Marker, Polyline, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';

import type {
  BloqueCapas,
  Capa,
  ElementoCapa,
} from '../db/capas-repo.ts';
import {
  ajustarColorConFallback,
  COLOR_PUNTO_DEFECTO,
  COLOR_LINEA_DEFECTO,
  COLOR_RELLENO_DEFECTO,
} from '../lib/colores-wkf.ts';

const cachePuntos = new Map<string, L.DivIcon>();

function puntoNeon(color: string): L.DivIcon {
  const cached = cachePuntos.get(color);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'wkf-capa-punto',
    html: `
      <div style="
        width:14px;height:14px;border-radius:50%;
        background:${color};
        box-shadow:0 0 6px ${color},0 0 12px ${color}88;
        border:2px solid #000;
        box-sizing:border-box;
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  cachePuntos.set(color, icon);
  return icon;
}

const cacheVertices = new Map<string, L.DivIcon>();

function verticeEditable(color: string): L.DivIcon {
  const cached = cacheVertices.get(color);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'wkf-vertice-editable',
    html: `
      <div style="
        width:12px;height:12px;border-radius:50%;
        background:#0A0A0A;
        border:2px solid ${color};
        box-shadow:0 0 6px ${color};
        box-sizing:border-box;
        cursor:grab;
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
  cacheVertices.set(color, icon);
  return icon;
}

const GROSOR_DEFECTO = 3;
const OPACIDAD_RELLENO_DEFECTO = 0.25;

function esCoordenadaValida(v: unknown): v is [number, number] {
  if (!Array.isArray(v) || v.length < 2) return false;
  const lat = v[0];
  const lon = v[1];
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export type OnEditarVertice = (
  bloqueId: string,
  capaId: string,
  elementoId: string,
  indiceVertice: number,
  lat: number,
  lon: number
) => void;

interface RenderElementoProps {
  elemento: ElementoCapa;
  prefijo: string;
  colorCapaOverride?: string;
  bloqueId: string;
  capaId: string;
  onEditarVertice?: OnEditarVertice;
}

const RenderElemento: React.FC<RenderElementoProps> = ({
  elemento,
  prefijo,
  colorCapaOverride,
  bloqueId,
  capaId,
  onEditarVertice,
}) => {
  const estilo = elemento.estilo ?? {};
  const nombre = elemento.nombre ?? elemento.descripcion;
  const key = `${prefijo}-${elemento.id}`;

  if (elemento.tipo === 'punto') {
    const coordsPunto =
      Array.isArray(elemento.coords) && Array.isArray(elemento.coords[0])
        ? elemento.coords[0]
        : elemento.coords;

    if (!esCoordenadaValida(coordsPunto)) return null;
    const [lat, lon] = coordsPunto;
    const color = colorCapaOverride
      ? colorCapaOverride
      : ajustarColorConFallback(estilo.color, COLOR_PUNTO_DEFECTO);
    const icon = puntoNeon(color);

    return (
      <Marker key={key} position={[lat, lon]} icon={icon}>
        {nombre && (
          <Tooltip direction="top" offset={[0, -10]} permanent={false}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              {nombre}
            </span>
          </Tooltip>
        )}
      </Marker>
    );
  }

  if (elemento.tipo === 'linea') {
    if (!Array.isArray(elemento.coords)) return null;
    const puntos = (elemento.coords as unknown[]).filter(esCoordenadaValida);
    if (puntos.length < 2) return null;

    const color = colorCapaOverride
      ? colorCapaOverride
      : ajustarColorConFallback(estilo.color, COLOR_LINEA_DEFECTO);
    const grosor =
      typeof estilo.grosor === 'number' && estilo.grosor > 0
        ? estilo.grosor
        : GROSOR_DEFECTO;
    const opacidad =
      typeof estilo.opacidad === 'number'
        ? Math.max(0, Math.min(1, estilo.opacidad))
        : 0.9;

    return (
      <React.Fragment key={key}>
        <Polyline
          positions={puntos}
          pathOptions={{
            color,
            weight: grosor,
            opacity: opacidad,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        >
          {nombre && (
            <Tooltip sticky>
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                {nombre}
              </span>
            </Tooltip>
          )}
        </Polyline>

        {onEditarVertice &&
          puntos.length <= 60 &&
          puntos.map((p, idx) => (
            <Marker
              key={`${key}-v-${idx}`}
              position={p}
              icon={verticeEditable(color)}
              draggable={true}
              zIndexOffset={1000}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const ll = marker.getLatLng();
                  onEditarVertice(
                    bloqueId,
                    capaId,
                    elemento.id,
                    idx,
                    ll.lat,
                    ll.lng
                  );
                },
              }}
            />
          ))}
      </React.Fragment>
    );
  }

  if (elemento.tipo === 'poligono') {
    if (!Array.isArray(elemento.coords)) return null;
    const puntos = (elemento.coords as unknown[]).filter(esCoordenadaValida);
    if (puntos.length < 3) return null;

    const colorBorde = colorCapaOverride
      ? colorCapaOverride
      : ajustarColorConFallback(estilo.color, COLOR_LINEA_DEFECTO);
    const colorRelleno = colorCapaOverride
      ? colorCapaOverride
      : ajustarColorConFallback(estilo.relleno, COLOR_RELLENO_DEFECTO);
    const grosor =
      typeof estilo.grosor === 'number' && estilo.grosor > 0
        ? estilo.grosor
        : GROSOR_DEFECTO;
    const opacidadBorde =
      typeof estilo.opacidad === 'number'
        ? Math.max(0, Math.min(1, estilo.opacidad))
        : 1.0;

    return (
      <React.Fragment key={key}>
        <Polygon
          positions={puntos}
          pathOptions={{
            color: colorBorde,
            weight: grosor,
            opacity: opacidadBorde,
            fillColor: colorRelleno,
            fillOpacity: OPACIDAD_RELLENO_DEFECTO,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        >
          {nombre && (
            <Tooltip sticky>
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                {nombre}
              </span>
            </Tooltip>
          )}
        </Polygon>

        {onEditarVertice &&
          puntos.length <= 60 &&
          puntos.map((p, idx) => (
            <Marker
              key={`${key}-v-${idx}`}
              position={p}
              icon={verticeEditable(colorBorde)}
              draggable={true}
              zIndexOffset={1000}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const ll = marker.getLatLng();
                  onEditarVertice(
                    bloqueId,
                    capaId,
                    elemento.id,
                    idx,
                    ll.lat,
                    ll.lng
                  );
                },
              }}
            />
          ))}
      </React.Fragment>
    );
  }

  return null;
};

interface RenderCapaProps {
  bloqueId: string;
  capa: Capa;
  onEditarVertice?: OnEditarVertice;
}

const RenderCapa: React.FC<RenderCapaProps> = ({
  bloqueId,
  capa,
  onEditarVertice,
}) => {
  if (!capa.visible) return null;
  if (!Array.isArray(capa.elementos) || capa.elementos.length === 0) {
    return null;
  }

  const prefijo = `${bloqueId}-${capa.id}`;

  return (
    <>
      {capa.elementos.map((el) => (
        <RenderElemento
          key={`${prefijo}-${el.id}`}
          elemento={el}
          prefijo={prefijo}
          colorCapaOverride={capa.colorCapa}
          bloqueId={bloqueId}
          capaId={capa.id}
          onEditarVertice={onEditarVertice}
        />
      ))}
    </>
  );
};

export interface CapaMapaProps {
  bloques: BloqueCapas[];
  /** Si se define, se permite arrastrar vértices de líneas y
   *  polígonos. Al soltar un vértice se llama con la nueva
   *  coordenada. Si no se define, no se muestra ningún vértice. */
  onEditarVertice?: OnEditarVertice;
}

export const CapaMapa: React.FC<CapaMapaProps> = ({
  bloques,
  onEditarVertice,
}) => {
  const bloquesValidos = useMemo(() => {
    if (!Array.isArray(bloques)) return [];
    return bloques.filter(
      (b) => b && Array.isArray(b.capas) && b.capas.length > 0
    );
  }, [bloques]);

  if (bloquesValidos.length === 0) return null;

  return (
    <>
      {bloquesValidos.map((bloque) => (
        <React.Fragment key={bloque.id}>
          {bloque.capas.map((capa) => (
            <RenderCapa
              key={`${bloque.id}-${capa.id}`}
              bloqueId={bloque.id}
              capa={capa}
              onEditarVertice={onEditarVertice}
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
};

export default CapaMapa;
// src/components/CapaMapa.tsx