// src/components/CapaMapa.tsx
// WKF — Componente que pinta sobre el mapa Leaflet las capas
// importadas (F4.5).
//
// Responsabilidad única: dado un array de BloqueCapas, pintar
// TODOS los elementos visibles de TODAS las capas visibles.
// No gestiona estado, no persiste, no decide. Solo pinta.
//
// Se integra dentro de un <MapContainer> de react-leaflet, así
// que usa los componentes hijos (Marker, Polyline, Polygon) y
// hereda el mapa del contexto.
//
// Tipos de elemento soportados:
//   - 'punto'   → Marker con pin WKF coloreado según el estilo.
//   - 'linea'   → Polyline con color y grosor del estilo.
//   - 'poligono'→ Polygon con color de borde, relleno y opacidad.
//
// Rendimiento: para cientos de elementos se usan componentes
// individuales de react-leaflet. Leaflet agrupa el render en
// canvas/svg. Si en el futuro hay miles, se migrará a
// L.geoJSON con un solo layer. Por ahora, simple y correcto.

import React, { useMemo } from 'react';
import { Marker, Polyline, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';

import type {
  BloqueCapas,
  Capa,
  ElementoCapa,
} from '../db/capas-repo.ts';

// ─────────────────────────────────────────────────────────────
// Icono de punto. Un pin SVG compacto, coloreado. Se cachea por
// color para no regenerar el divIcon en cada render.
// ─────────────────────────────────────────────────────────────

const cachePines = new Map<string, L.DivIcon>();

function pinPorColor(color: string): L.DivIcon {
  const cached = cachePines.get(color);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'wkf-capa-pin',
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="16" r="9" stroke="${color}" stroke-width="2.5" fill="#0A0A0A"/>
        <circle cx="20" cy="16" r="2.8" fill="${color}"/>
        <path d="M20 27 L17 33 L20 31.5 L23 33 Z" fill="${color}"/>
      </svg>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 22],
  });
  cachePines.set(color, icon);
  return icon;
}

// ─────────────────────────────────────────────────────────────
// Helpers de estilo
// ─────────────────────────────────────────────────────────────

const COLOR_PUNTO_DEFECTO = '#00E56A';   // Verde neón
const COLOR_LINEA_DEFECTO = '#FF00FF';   // Magenta / Fucsia neón (resalta sobre azul)
const COLOR_RELLENO_DEFECTO = '#00E56A'; // Relleno verde neón
const GROSOR_DEFECTO = 3;                // Más gordo para verlo desde lejos
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

// ─────────────────────────────────────────────────────────────
// Render de un elemento individual
// ─────────────────────────────────────────────────────────────

interface RenderElementoProps {
  elemento: ElementoCapa;
  /** Prefijo único para claves (bloqueId + capaId). */
  prefijo: string;
}

const RenderElemento: React.FC<RenderElementoProps> = ({
  elemento,
  prefijo,
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
    const color = estilo.color || COLOR_PUNTO_DEFECTO;
    const icon = pinPorColor(color);

    return (
      <Marker key={key} position={[lat, lon]} icon={icon}>
        {nombre && (
          <Tooltip direction="top" offset={[0, -22]} permanent={false}>
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

    const color = COLOR_LINEA_DEFECTO;
    const grosor = typeof estilo.grosor === 'number' && estilo.grosor > 0
      ? estilo.grosor
      : GROSOR_DEFECTO;
    const opacidad = typeof estilo.opacidad === 'number'
      ? Math.max(0, Math.min(1, estilo.opacidad))
      : 0.9;

    return (
      <Polyline
        key={key}
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
    );
  }

  if (elemento.tipo === 'poligono') {
    if (!Array.isArray(elemento.coords)) return null;
    const puntos = (elemento.coords as unknown[]).filter(esCoordenadaValida);
    if (puntos.length < 3) return null;

    const colorBorde = COLOR_LINEA_DEFECTO;
    const colorRelleno = COLOR_RELLENO_DEFECTO;
    const grosor = GROSOR_DEFECTO;
    const opacidadBorde = 1.0; // Totalmente opaco

    return (
      <Polygon
        key={key}
        positions={puntos}
        pathOptions={{
          color: colorBorde,
          weight: grosor,
          opacity: opacidadBorde,
          fillColor: colorRelleno,
          fillOpacity: 0.25,
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
    );
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
// Render de una capa entera (solo si visible)
// ─────────────────────────────────────────────────────────────

interface RenderCapaProps {
  bloqueId: string;
  capa: Capa;
}

const RenderCapa: React.FC<RenderCapaProps> = ({ bloqueId, capa }) => {
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
        />
      ))}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Componente público
// ─────────────────────────────────────────────────────────────

export interface CapaMapaProps {
  /** Bloques de capas importados. Se pintan todos los elementos
   *  visibles de todas las capas visibles. */
  bloques: BloqueCapas[];
}

export const CapaMapa: React.FC<CapaMapaProps> = ({ bloques }) => {
  // Filtrado defensivo: solo bloques con capas. Se memoiza para
  // no recalcular en cada render si el array es estable.
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
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
};

export default CapaMapa;