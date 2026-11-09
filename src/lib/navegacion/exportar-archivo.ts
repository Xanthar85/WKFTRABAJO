// src/lib/navegacion/exportar-archivo.ts
// WKF — Exportador único para GPX, KML y JSON.
// WKF1.088: fix del share en APK. La carpeta Cache es privada en
// Android 11+ y el share sheet no puede leerla. Se usa Documents,
// que es pública y accesible por otras apps.

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const TABLA_MIME_EXTENSION: Array<{ contiene: string; extension: string }> = [
  { contiene: 'json', extension: 'json' },
  { contiene: 'kml', extension: 'kml' },
  { contiene: 'kmz', extension: 'kmz' },
  { contiene: 'gpx', extension: 'gpx' },
];

function extensionDesdeMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  for (const fila of TABLA_MIME_EXTENSION) {
    if (m.includes(fila.contiene)) return fila.extension;
  }
  return 'bin';
}

function sanearNombre(nombre: string, extension: string): string {
  const limpio = (nombre || '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) return `WKF - archivo.${extension}`;
  return `${limpio}.${extension}`;
}

async function compartirEnPwa(
  nombreArchivo: string,
  contenido: string,
  mime: string,
  titulo: string
): Promise<void> {
  const blob = new Blob([contenido], { type: mime });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], nombreArchivo, { type: mime });
      if (
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: titulo });
        return;
      }
    } catch (e: unknown) {
      const err = e as { name?: string } | null;
      if (err?.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function compartirEnApk(
  nombreArchivo: string,
  contenido: string,
  mime: string,
  titulo: string
): Promise<void> {
  const pathEscritura = nombreArchivo;
  let uriArchivo: string;

  try {
    // Usamos Documents (pública) en lugar de Cache (privada).
    // En Android 11+ Cache es privada y el share sheet no puede leerla.
    await Filesystem.writeFile({
      path: pathEscritura,
      data: contenido,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    // getUri es instantáneo en Documents, no necesita timeout.
    const uriResult = await Filesystem.getUri({
      directory: Directory.Documents,
      path: pathEscritura,
    });

    uriArchivo = uriResult.uri;

    await Share.share({
      title: titulo,
      text: titulo,
      url: uriArchivo,
      dialogTitle: titulo,
    });
  } catch (err) {
    console.error('Error en compartirEnApk', err);
    throw err;
  } finally {
    // Limpieza diferida del archivo temporal en Documents
    setTimeout(() => {
      void Filesystem.deleteFile({
        directory: Directory.Documents,
        path: pathEscritura,
      }).catch(() => {});
    }, 2000);
  }
}

async function descargarEnApk(
  nombreArchivo: string,
  contenido: string
): Promise<void> {
  const CARPETA_WKF = 'WKF';
  const path = `${CARPETA_WKF}/${nombreArchivo}`;

  try {
    try {
      await Filesystem.mkdir({
        path: CARPETA_WKF,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      /* ya existe o no se puede crear: writeFile lo intentará igual */
    }

    await Filesystem.writeFile({
      path,
      data: contenido,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  } catch (err) {
    console.error('Error en descargarEnApk', err);
    throw err;
  }
}

export async function guardarYCompartirArchivo(
  nombreSinExtension: string,
  contenido: string,
  mime: string,
  titulo?: string
): Promise<void> {
  const extension = extensionDesdeMime(mime);
  const nombreArchivo = sanearNombre(nombreSinExtension, extension);
  const tituloFinal = titulo ?? nombreSinExtension;

  if (Capacitor.isNativePlatform()) {
    await compartirEnApk(nombreArchivo, contenido, mime, tituloFinal);
    return;
  }
  await compartirEnPwa(nombreArchivo, contenido, mime, tituloFinal);
}

export async function descargarArchivoWKf(
  nombreSinExtension: string,
  contenido: string,
  mime: string
): Promise<void> {
  const extension = extensionDesdeMime(mime);
  const nombreArchivo = sanearNombre(nombreSinExtension, extension);

  if (Capacitor.isNativePlatform()) {
    await descargarEnApk(nombreArchivo, contenido);
    return;
  }

  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}