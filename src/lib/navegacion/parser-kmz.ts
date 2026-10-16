// src/lib/navegacion/parser-kmz.ts
// WKF — Parser de KMZ (F4 — Importar).
// Un KMZ es un ZIP que contiene un doc.kml (a veces con otro
// nombre). Descomprimimos en el navegador con JSZip (ya está en
// el proyecto, lo usa el resto de WKF). El resultado del KML se
// delega en parser-kml.ts.

import JSZip from 'jszip';
import { parsearKML, type ResultadoKML } from './parser-kml.ts';

export type ResultadoKMZ = ResultadoKML;

// Extrae el primer archivo .kml que encuentre dentro del ZIP.
// La convención KMZ es que el KML principal se llame doc.kml y
// esté en la raíz, pero algunos fabricantes lo meten en subcarpetas
// o con otros nombres. Buscamos el primero con extensión .kml.
async function extraerKMLDeZip(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(blob);

  // Primero intentamos doc.kml en la raíz.
  const docRaiz = zip.file('doc.kml');
  if (docRaiz) {
    return docRaiz.async('string');
  }

  // Si no, buscamos cualquier .kml, priorizando los de la raíz.
  const nombres = Object.keys(zip.files);
  const kmls: string[] = [];
  for (const nombre of nombres) {
    const f = zip.files[nombre];
    if (f.dir) continue;
    const lower = nombre.toLowerCase();
    if (lower.endsWith('.kml')) {
      kmls.push(nombre);
    }
  }

  if (kmls.length === 0) {
    throw new Error('El KMZ no contiene ningún archivo .kml');
  }

  // Priorizamos los que no tienen "/" (raíz).
  const sinCarpeta = kmls.filter((n) => !n.includes('/'));
  const elegido = sinCarpeta.length > 0 ? sinCarpeta[0] : kmls[0];

  const archivo = zip.file(elegido);
  if (!archivo) {
    throw new Error('No se pudo leer el KML del KMZ');
  }
  return archivo.async('string');
}

export async function parsearKMZ(blob: Blob): Promise<ResultadoKMZ> {
  const textoKML = await extraerKMLDeZip(blob);
  return parsearKML(textoKML);
}