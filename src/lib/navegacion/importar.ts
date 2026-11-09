// src/lib/navegacion/importar.ts
// WKF — Punto único de importación de archivos (GPX, KML, KMZ, JSON).
// F4-bis (Paso 5). Recibe un File crudo y devuelve el bloque ya
// parseado listo para guardar (o un error legible).
//
// v1.039-fix1: los parsers devuelven capas SIN id. Este módulo
// añade el id de cada capa con `nuevoIdCapa()` para que el bloque
// resultante sea un Omit<BloqueCapas, 'id'> con Capa[] completas.
//
// WKF1.083: normalización de colores al importar.
//   · Los KML/KMZ ya traen `estilo.color` (en #RRGGBB) desde
//     parser-kml.ts. Aquí lo pasamos por `colorWkfMasCercano` para
//     asignar el más parecido de la paleta de 24.
//   · Si el elemento no trae color, no se toca (hereda el de la
//     capa o el del bloque, como hasta ahora).
//   · Si TODOS los elementos de una capa comparten color tras la
//     normalización y la capa no tiene color propio, se asigna ese
//     color a `capa.colorCapa` para que Archivos lo muestre.

import type {
  BloqueCapas,
  Capa,
  ElementoCapa,
} from '../../db/capas-repo.ts';
import { colorWkfMasCercano } from '../colores-wkf.ts';
import { parsearGPX } from './parser-gpx.ts';
import { parsearKML } from './parser-kml.ts';
import { parsearKMZ } from './parser-kmz.ts';
import { parsearJSONWKF } from './parser-json-wkf.ts';

export type BloqueCapasParseado = Omit<BloqueCapas, 'id'>;

export type ResultadoImportacion =
  | { ok: true; bloque: BloqueCapasParseado }
  | { ok: false; mensaje: string };

function nuevoIdCapa(): string {
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

// Normaliza los colores de un elemento capa: si trae `estilo.color`,
// lo sustituye por el más parecido de la paleta WKF. Si no trae,
// lo deja como está.
function normalizarColorElemento(el: ElementoCapa): ElementoCapa {
  if (!el.estilo || !el.estilo.color) return el;
  const cercano = colorWkfMasCercano(el.estilo.color);
  return {
    ...el,
    estilo: {
      ...el.estilo,
      color: cercano,
    },
  };
}

// Normaliza los colores de una capa completa. Si tras la
// normalización TODOS los elementos con color comparten el mismo
// y la capa no tenía color propio, se asigna ese color a la capa
// para que Archivos lo muestre en el cuadradito.
function normalizarColorCapa(capa: Capa): Capa {
  const elementos = capa.elementos.map(normalizarColorElemento);
  let colorComun: string | null = null;
  let todosIguales = true;
  let algunoConColor = false;

  for (const el of elementos) {
    const c = el.estilo?.color;
    if (!c) continue;
    if (!algunoConColor) {
      colorComun = c;
      algunoConColor = true;
    } else if (c !== colorComun) {
      todosIguales = false;
      break;
    }
  }

  const colorCapa =
    capa.colorCapa ?? (todosIguales && algunoConColor ? colorComun ?? undefined : undefined);

  return {
    ...capa,
    elementos,
    colorCapa,
  };
}

function normalizarColoresBloque(bloque: BloqueCapasParseado): BloqueCapasParseado {
  const colorBloque = bloque.colorBloque
    ? colorWkfMasCercano(bloque.colorBloque)
    : undefined;
  return {
    ...bloque,
    colorBloque,
    capas: bloque.capas.map(normalizarColorCapa),
  };
}

// Convierte un array de capas-parser (sin id) a Capa[] (con id).
function asignarIdsCapas(capas: Array<Omit<Capa, 'id'>>): Capa[] {
  return capas.map((c) => ({
    ...c,
    id: nuevoIdCapa(),
    elementos: Array.isArray(c.elementos) ? c.elementos : [],
    colorCapa: c.colorCapa,
  }));
}

// Bloque de capas mínimo para un punto único o una lista de
// puntos sueltos. Todos van a la misma capa "Capa importada".
function capaDePuntos(nombreCapa: string, elementos: ElementoCapa[]): Capa {
  return {
    id: nuevoIdCapa(),
    nombre: nombreCapa,
    visible: true,
    elementos,
  };
}

async function parsearComoCapas(
  file: File,
  tipo: 'gpx' | 'kml' | 'kmz'
): Promise<ResultadoImportacion> {
  try {
    if (tipo === 'kmz') {
      const res = await parsearKMZ(file);
      if (!res.capas || res.capas.length === 0) {
        return {
          ok: false,
          mensaje: 'El KMZ no contiene capas con elementos válidos.',
        };
      }
      const bloque: BloqueCapasParseado = {
        nombre: nombreSinExtension(file.name),
        formato: 'kmz',
        importadoEn: Date.now(),
        capas: asignarIdsCapas(res.capas),
      };
      return { ok: true, bloque: normalizarColoresBloque(bloque) };
    }

    const texto = await leerTexto(file);

    if (tipo === 'gpx') {
      const resultado = parsearGPX(texto);
      if (
        resultado.waypoints.length === 0 &&
        resultado.rutas.length === 0
      ) {
        return {
          ok: false,
          mensaje: 'El GPX no contiene waypoints ni rutas válidas.',
        };
      }
      const elementos: ElementoCapa[] = [];
      for (const w of resultado.waypoints) {
        elementos.push({
          id: `gpx-${elementos.length + 1}`,
          tipo: 'punto',
          coords: [w.lat, w.lon],
          nombre: w.nombre,
          descripcion: w.nota,
          estilo: w.color ? { color: w.color } : undefined,
        });
      }
      for (const r of resultado.rutas) {
        elementos.push({
          id: `gpx-${elementos.length + 1}`,
          tipo: 'linea',
          coords: r.puntos.map((p) => [p.lat, p.lon] as [number, number]),
          nombre: r.nombre,
          estilo: r.color ? { color: r.color } : undefined,
        });
      }
      const bloque: BloqueCapasParseado = {
        nombre: nombreSinExtension(file.name),
        formato: 'gpx',
        importadoEn: Date.now(),
        capas: [capaDePuntos('GPX importado', elementos)],
      };
      return { ok: true, bloque: normalizarColoresBloque(bloque) };
    }

    // KML
    const resultado = parsearKML(texto);
    if (!resultado.capas || resultado.capas.length === 0) {
      return {
        ok: false,
        mensaje: 'El KML no contiene capas con elementos válidos.',
      };
    }
    const bloque: BloqueCapasParseado = {
      nombre: nombreSinExtension(file.name),
      formato: 'kml',
      importadoEn: Date.now(),
      capas: asignarIdsCapas(resultado.capas),
    };
    return { ok: true, bloque: normalizarColoresBloque(bloque) };
  } catch (err) {
    console.error('Error parseando archivo', file.name, err);
    const mensaje =
      err instanceof Error ? err.message : 'Error desconocido al leer el archivo.';
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
      const elemento: ElementoCapa = {
        id: 'json-1',
        tipo: 'punto',
        coords: [w.lat, w.lon],
        nombre: w.nombre,
        descripcion: w.nota,
        estilo: w.color ? { color: w.color } : undefined,
      };
      const bloque: BloqueCapasParseado = {
        nombre: w.nombre || nombreSinExtension(file.name),
        formato: 'json',
        importadoEn: Date.now(),
        capas: [capaDePuntos('Waypoint JSON', [elemento])],
      };
      return { ok: true, bloque: normalizarColoresBloque(bloque) };
    }

    // wkf-navegacion: si trae bloques de capas, devolvemos el primero.
    if (resultado.bloquesCapas.length === 0) {
      return {
        ok: false,
        mensaje: 'El JSON WKF no contiene capas importables.',
      };
    }
    const primero = resultado.bloquesCapas[0];
    const bloque: BloqueCapasParseado = {
      nombre: primero.nombre,
      colorBloque: primero.colorBloque,
      formato: primero.formato,
      importadoEn: primero.importadoEn,
      capas: asignarIdsCapas(primero.capas),
    };
    return { ok: true, bloque: normalizarColoresBloque(bloque) };
  } catch (err) {
    console.error('Error parseando JSON WKF', file.name, err);
    const mensaje =
      err instanceof Error ? err.message : 'Error desconocido al leer el JSON.';
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