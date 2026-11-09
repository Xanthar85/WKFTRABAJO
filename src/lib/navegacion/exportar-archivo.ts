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
  _mime: string,
  titulo: string
): Promise<void> {
  const pathEscritura = nombreArchivo;
  let uriArchivo: string;

  try {
    // 1. Guardar SIEMPRE una copia permanente en Documentos/WKF del móvil.
    // En Android, el menú de compartir (ACTION_SEND) no tiene un botón nativo del OS
    // para "Guardar en el dispositivo" a menos que el fabricante o el usuario tengan
    // una app como "Files de Google" instalada. Al guardarlo directamente aquí,
    // garantizamos que el archivo FÍSICO quede guardado en el móvil inmediatamente.
    try {
      await descargarEnApk(nombreArchivo, contenido);
    } catch (saveErr) {
      console.warn('No se pudo guardar copia automática en Documentos/WKF:', saveErr);
    }

    // 2. Escribir el archivo en Directory.Cache para el FileProvider del Share Sheet.
    // La carpeta Cache está mapeada en Android mediante <cache-path name="my_cache_images" path="." />
    // en file_paths.xml, lo cual es imprescindible para que FileProvider.getUriForFile
    // pueda otorgar permisos temporales de lectura (FLAG_GRANT_READ_URI_PERMISSION)
    // a apps externas seleccionadas en el share sheet (WhatsApp, Organic Maps, Drive, etc.).
    await Filesystem.writeFile({
      path: pathEscritura,
      data: contenido,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    const uriResult = await Filesystem.getUri({
      directory: Directory.Cache,
      path: pathEscritura,
    });

    uriArchivo = uriResult.uri;

    // 3. Abrir menú nativo de compartir (Share Sheet).
    // Se pasa 'files: [uriArchivo]' para compartir el archivo adjunto.
    // En dialogTitle se informa que el archivo ya está en Documentos/WKF.
    await Share.share({
      title: titulo,
      files: [uriArchivo],
      dialogTitle: `${titulo} (guardado en Documentos/WKF)`,
    });
  } catch (err: unknown) {
    const errorStr = String(err);
    const esCancelado =
      (err instanceof Error && err.message.toLowerCase().includes('cancel')) ||
      errorStr.toLowerCase().includes('cancel');

    if (esCancelado) {
      // El usuario pulsó atrás o cerró el diálogo; no es un error.
      // El archivo ya está guardado en Documentos/WKF.
      return;
    }

    console.error('Error al compartir en APK:', err);

    // Si el share sheet falla por cualquier motivo, notificar al usuario
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(
        `El archivo se ha guardado en Documentos/WKF/${nombreArchivo}`
      );
    }
  } finally {
    // Limpieza diferida (10 minutos) para dar tiempo a WhatsApp/Drive a leer el archivo desde Cache.
    // La copia en Documentos/WKF NO se borra.
    setTimeout(() => {
      void Filesystem.deleteFile({
        directory: Directory.Cache,
        path: pathEscritura,
      }).catch(() => {});
    }, 10 * 60 * 1000);
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