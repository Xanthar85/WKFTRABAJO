// src/lib/navegacion/exportador-capas.ts
// WKF — Exportador de capas (Fase 23).
// Genera KML, KMZ o JSON a partir de un BloqueCapas.

import JSZip from 'jszip';
import type { BloqueCapas, ElementoCapa } from '../../db/capas-repo.ts';
import { descargarArchivo, slugificar } from './exportador-rutas.ts';

function escaparXML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colorAKmlHex(hex?: string): string {
  if (!hex) return 'ff00e56a'; // ARGB en KML (alfa + RGB)
  const clean = hex.replace('#', '');
  return `ff${clean}`;
}

function generarKmlElemento(el: ElementoCapa): string {
  const nombre = escaparXML(el.nombre || 'Elemento');
  const color = colorAKmlHex(el.estilo?.color);

  if (el.tipo === 'punto') {
    const coords = Array.isArray(el.coords) && Array.isArray(el.coords[0])
      ? el.coords[0]
      : el.coords;
    if (!Array.isArray(coords) || coords.length < 2) return '';
    return `
    <Placemark>
      <name>${nombre}</name>
      <styleUrl>#wkfPunto</styleUrl>
      <Point>
        <coordinates>${coords[1]},${coords[0]},0</coordinates>
      </Point>
    </Placemark>`;
  }

  if (el.tipo === 'linea') {
    const coordsStr = (el.coords as [number, number][])
      .map((p) => `${p[1]},${p[0]},0`)
      .join(' ');
    return `
    <Placemark>
      <name>${nombre}</name>
      <styleUrl>#wkfLinea_${color.replace('#','')}</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordsStr}</coordinates>
      </LineString>
    </Placemark>`;
  }

  if (el.tipo === 'poligono') {
    const coordsStr = (el.coords as [number, number][])
      .map((p) => `${p[1]},${p[0]},0`)
      .join(' ');
    const relleno = colorAKmlHex(el.estilo?.relleno || el.estilo?.color);
    return `
    <Placemark>
      <name>${nombre}</name>
      <styleUrl>#wkfPoligono_${color.replace('#','')}</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
  }

  return '';
}

export function generarKMLBloque(bloque: BloqueCapas): string {
  const capasXml = bloque.capas
    .map((capa) => {
      const elementos = capa.elementos
        .map((el) => generarKmlElemento(el))
        .join('');
      return `
    <Folder>
      <name>${escaparXML(capa.nombre)}</name>
      ${elementos}
    </Folder>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escaparXML(bloque.nombre)}</name>
    <Style id="wkfPunto">
      <IconStyle>
        <color>ff00e56a</color>
        <scale>1.0</scale>
      </IconStyle>
    </Style>
    ${capasXml}
  </Document>
</kml>`;
}

export function generarJSONBloque(bloque: BloqueCapas): string {
  const payload = {
    formato: 'wkf-bloque',
    version: 1,
    bloque: {
      nombre: bloque.nombre,
      formato: bloque.formato,
      importadoEn: bloque.importadoEn,
      capas: bloque.capas,
    },
  };
  return JSON.stringify(payload, null, 2);
}

export async function exportarBloque(
  bloque: BloqueCapas,
  tipo: 'json' | 'kml' | 'kmz'
): Promise<void> {
  const nombreBase = slugificar(bloque.nombre);

  if (tipo === 'json') {
    const json = generarJSONBloque(bloque);
    descargarArchivo(json, `${nombreBase}.wkfcapa.json`, 'application/json');
    return;
  }

  const kml = generarKMLBloque(bloque);
  
  if (tipo === 'kml') {
    descargarArchivo(kml, `${nombreBase}.kml`, 'application/vnd.google-earth.kml+xml');
    return;
  }

  if (tipo === 'kmz') {
    const zip = new JSZip();
    zip.file('doc.kml', kml);
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreBase}.kmz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}