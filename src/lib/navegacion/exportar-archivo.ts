// src/lib/navegacion/exportar-archivo.ts
// WKF — Exportador único para GPX y JSON.
// WKF1.083: puente entre PWA (Blob + <a download>) y APK
//   (Filesystem + Share).
// WKF1.084: fix del ANR en APK. Se elimina `Filesystem.getUri` del
//   camino de compartir y se construye la URI con `Directory.Cache`.
// WKF1.085: se añade `descargarArchivoWKf`, que en APK escribe el
//   archivo en `Documents/WKF/` (sin share sheet). El botón
//   "Descargar" y el botón "Compartir" son dos acciones distintas,
//   tanto en PWA como en APK. `guardarYCompartirArchivo` se
//   mantiene intacta para el botón "Compartir".

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Sanitiza el nombre de archivo. Quita caracteres que Android no
// acepta y colapsa espacios. Si el resultado queda vacío, usa un
// nombre por defecto.
function sanearNombre(nombre: string, extension: string): string {
  const limpio = (nombre || '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) return `WKF - archivo.${extension}`;
  return `${limpio}.${extension}`;
}

// PWA: intenta Web Share API con fichero; si no, descarga con <a>.
// Comportamiento idéntico al que había antes en ArchivosScreen.
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

// APK: escribe en Cache (temporal) y abre el menú de compartir
// nativo. WKF1.084: la escritura se hace en un bloque asíncrono
// separado para no bloquear el hilo principal (UI thread) y evitar
// el ANR. Se elimina `Filesystem.getUri` y se construye la URI
// directamente con `Directory.Cache`.
async function compartirEnApk(
  nombreArchivo: string,
  contenido: string,
  mime: string,
  titulo: string
): Promise<void> {
  const pathEscritura = nombreArchivo;
  let uriArchivo: string;

  try {
    await Filesystem.writeFile({
      path: pathEscritura,
      data: contenido,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    const uriPromise = Filesystem.getUri({
      directory: Directory.Cache,
      path: pathEscritura,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('getUri timeout')), 2000)
    );

    try {
      const uriResult = await Promise.race([uriPromise, timeoutPromise]);
      uriArchivo = uriResult.uri;
    } catch {
      uriArchivo = `file://${pathEscritura}`;
    }

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
    setTimeout(() => {
      void Filesystem.deleteFile({
        directory: Directory.Cache,
        path: pathEscritura,
      }).catch(() => {});
    }, 1000);
  }
}

// APK: escribe el archivo en `Documents/WKF/` sin abrir el share
// sheet. Es la acción "Descargar". En Android 10+ `Directory.Documents`
// escribe en la carpeta pública Documents/ sin permisos. En Android 9
// o inferior, Capacitor pide WRITE_EXTERNAL_STORAGE la primera vez.
async function descargarEnApk(
  nombreArchivo: string,
  contenido: string
): Promise<void> {
  const CARPETA_WKF = 'WKF';
  const path = `${CARPETA_WKF}/${nombreArchivo}`;

  try {
    // Aseguramos la subcarpeta (si ya existe, writeFile lo sobrescribe;
    // si el directorio no existe, mkdir lo crea; el catch ignora "ya existe").
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

// Único punto de exportación "Compartir". La PWA y el APK eligen camino.
export async function guardarYCompartirArchivo(
  nombreSinExtension: string,
  contenido: string,
  mime: string,
  titulo?: string
): Promise<void> {
  const extension = mime.includes('json') ? 'json' : 'gpx';
  const nombreArchivo = sanearNombre(nombreSinExtension, extension);
  const tituloFinal = titulo ?? nombreSinExtension;

  if (Capacitor.isNativePlatform()) {
    await compartirEnApk(nombreArchivo, contenido, mime, tituloFinal);
    return;
  }
  await compartirEnPwa(nombreArchivo, contenido, mime, tituloFinal);
}

// Punto de exportación "Descargar". En PWA dispara la descarga del
// navegador (igual que hacía antes el <a download>). En APK escribe
// en Documents/WKF/ y no abre el share sheet.
export async function descargarArchivoWKf(
  nombreSinExtension: string,
  contenido: string,
  mime: string
): Promise<void> {
  const extension = mime.includes('json') ? 'json' : 'gpx';
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
// src/lib/navegacion/exportar-archivo.ts