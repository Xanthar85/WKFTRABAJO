// src/lib/navegacion/importar.ts
// WKF — Punto único de importación de archivos (GPX, KML, KMZ, JSON).
// F4-bis (Paso 5). Recibe un File crudo y devuelve el bloque ya
// parseado listo para guardar (o un error legible).
//
// Firma que consume ImportarScreen.tsx:
//   importarArchivo(file) => { ok: true, bloque } | { ok: false, mensaje }
//
// El bloque devuelto NO tiene id todavía. Es un BloqueCapasImportado
// con la estructura que espera el store (nombre, formato, importadoEn,
// capas). El store se encarga de crear los ids y de persistir.

import type { BloqueCapas } from '../../db/capas-repo.ts';
import { parsearGPX } from './parser-gpx.ts';
import { parsearKML } from './parser-kml.ts';
import { parsearKMZ } from './parser-kmz.ts';
import { parsearJSONWKF } from './parser-json-wkf.ts';

export type BloqueCapasParseado = Omit<BloqueCapas, 'id'>;

export type ResultadoImportacion =
  | { ok: true; bloque: BloqueCapasParseado }
  | { ok: false; mensaje: string };

function extensionDe(nombre: string): string {
  const partes = nombre.toLowerCase().split('.');
  return partes.length > 1 ? partes[partes.length - 1] : '';
}

function nombreSinExtension(nombre: string): string {
  const partes = nombre.split('.');
  if (partes.length <= 1) return nombre;
  return partes.slice(0, -1).join('.');
}

async function leerTexto(file: File): Promise<string> {
  return await file.text();
}

async function parsearComoCapas(
  file: File,
  tipo: 'gpx' | 'kml' | 'kmz'
): Promise<ResultadoImportacion> {
  try {
    if (tipo === 'kmz') {
      const res = await parsearKMZ(file);
      if (!res.capas || res.capas.length === 0) {
        return { ok: false, mensaje: 'El KMZ no contiene capas con elementos válidos.' };
      }
      return {
        ok: true,
        bloque: {
          nombre: nombreSinExtension(file.name),
          formato: 'kmz',
          importadoEn: Date.now(),
          capas: res.capas,
        },
      };
    }

    const texto = await leerTexto(file);
    const res = tipo === 'gpx' ? parsearGPX(texto) : parsearKML(texto);

    if (tipo === 'gpx') {
      const resultado = res as ReturnType<typeof parsearGPX>;
      if (resultado.waypoints.length === 0 && resultado.rutas.length === 0) {
        return { ok: false, mensaje: 'El GPX no contiene waypoints ni rutas válidas.' };
      }
      // Un GPX no tiene capas como tal. Metemos todos los puntos y
      // líneas en una sola capa "GPX importado".
      const elementos: BloqueCapasParseado['capas'][number]['elementos'] = [];
      for (const w of resultado.waypoints) {
        elementos.push({
          id: `gpx-${elementos.length + 1}`,
          tipo: 'punto',
          coords: [w.lat, w.lon],
          nombre: w.nombre,
          descripcion: w.nota,
        });
      }
      for (const r of resultado.rutas) {
        elementos.push({
          id: `gpx-${elementos.length + 1}`,
          tipo: 'linea',
          coords: r.puntos.map((p) => [p.lat, p.lon] as [number, number]),
          nombre: r.nombre,
        });
      }
      return {
        ok: true,
        bloque: {
          nombre: nombreSinExtension(file.name),
          formato: 'gpx',
          importadoEn: Date.now(),
          capas: [
            {
              nombre: 'GPX importado',
              visible: true,
              elementos,
            },
          ],
        },
      };
    }

    // KML
    const resultado = res as ReturnType<typeof parsearKML>;
    if (!resultado.capas || resultado.capas.length === 0) {
      return { ok: false, mensaje: 'El KML no contiene capas con elementos válidos.' };
    }
    return {
      ok: true,
      bloque: {
        nombre: nombreSinExtension(file.name),
        formato: 'kml',
        importadoEn: Date.now(),
        capas: resultado.capas,
      },
    };
  } catch (err) {
    console.error('Error parseando archivo', file.name, err);
    const mensaje = err instanceof Error ? err.message : 'Error desconocido al leer el archivo.';
    return { ok: false, mensaje };
  }
}

async function parsearComoJSON(file: File): Promise<ResultadoImportacion> {
  try {
    const texto = await leerTexto(file);
    const resultado = parsearJSONWKF(texto);

    if (resultado.formato === 'desconocido') {
      return { ok: false, mensaje: 'El JSON no tiene un formato WKF reconocido.' };
    }

    if (resultado.formato === 'wkf-waypoint') {
      if (resultado.waypoints.length === 0) {
        return { ok: false, mensaje: 'El JSON no contiene ningún waypoint.' };
      }
      const w = resultado.waypoints[0];
      return {
        ok: true,
        bloque: {
          nombre: w.nombre || nombreSinExtension(file.name),
          formato: 'json',
          importadoEn: Date.now(),
          capas: [
            {
              nombre: 'Waypoint JSON',
              visible: true,
              elementos: [
                {
                  id: 'json-1',
                  tipo: 'punto',
                  coords: [w.lat, w.lon],
                  nombre: w.nombre,
                  descripcion: w.nota,
                },
              ],
            },
          ],
        },
      };
    }

    // wkf-navegacion: si trae bloques de capas, devolvemos el primero.
    // El resto los gestiona el store aparte si el usuario quiere.
    if (resultado.bloquesCapas.length === 0) {
      return {
        ok: false,
        mensaje: 'El JSON WKF no contiene capas importables.',
      };
    }
    const primero = resultado.bloquesCapas[0];
    return {
      ok: true,
      bloque: {
        nombre: primero.nombre,
        formato: primero.formato,
        importadoEn: primero.importadoEn,
        capas: primero.capas,
      },
    };
  } catch (err) {
    console.error('Error parseando JSON WKF', file.name, err);
    const mensaje = err instanceof Error ? err.message : 'Error desconocido al leer el JSON.';
    return { ok: false, mensaje };
  }
}

export async function importarArchivo(file: File): Promise<ResultadoImportacion> {
  const ext = extensionDe(file.name);

  switch (ext) {
    case 'gpx':
      return parsearComoCapas(file, 'gpx');
    case 'kml':
      return parsearComoCapas(file, 'kml');
    case 'kmz':
      return parsearComoCapas(file, 'kmz');
    case 'json':
    case 'wkfjson':
      return parsearComoJSON(file);
    default:
      return {
        ok: false,
        mensaje: `Formato no soportado: .${ext}. Usa GPX, KML, KMZ o JSON de WKF.`,
      };
  }
}
// src/lib/navegacion/importar.ts