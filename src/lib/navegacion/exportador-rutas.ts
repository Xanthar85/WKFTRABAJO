// src/lib/navegacion/exportador-rutas.ts
// WKF — Generador de archivos para exportar rutas (F5).
// Convierte una ruta (con sus waypoints) en un archivo GPX estándar
// o en un JSON interno de WKF.

import type { Ruta } from '../../db/rutas-repo.ts';
import type { Waypoint } from '../../db/waypoints-repo.ts';

export function generarJSONRuta(ruta: Ruta, waypointsDeLaRuta: Waypoint[]): string {
  const payload = {
    formato: 'wkf-ruta',
    version: 1,
    ruta: {
      nombre: ruta.nombre,
      nota: ruta.nota ?? null,
      origen: ruta.origen,
      puntos: waypointsDeLaRuta.map((w) => ({
        nombre: w.nombre,
        lat: w.lat,
        lon: w.lon,
        nota: w.nota ?? null,
      })),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function generarGPXRuta(ruta: Ruta, waypointsDeLaRuta: Waypoint[]): string {
  const escapar = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const wpts = waypointsDeLaRuta
    .map(
      (w) => `
  <wpt lat="${w.lat}" lon="${w.lon}">
    <name>${escapar(w.nombre)}</name>
    ${w.nota ? `<desc>${escapar(w.nota)}</desc>` : ''}
  </wpt>`
    )
    .join('');

  const rtepts = waypointsDeLaRuta
    .map((w) => `    <rtept lat="${w.lat}" lon="${w.lon}"><name>${escapar(w.nombre)}</name></rtept>`)
    .join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WKF - World Kayak Fishing"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapar(ruta.nombre)}</name>
  </metadata>${wpts}
  <rte>
    <name>${escapar(ruta.nombre)}</name>
${rtepts}
  </rte>
</gpx>
`;
  return gpx;
}

export function descargarArchivo(contenido: string, nombre: string, tipoMime: string) {
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugificar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'ruta';
}