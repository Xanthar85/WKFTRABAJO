// src/lib/navegacion/exportar-archivo.ts
// WKF — Exportador único para GPX y JSON.
// WKF1.083: puente entre PWA (Blob + <a download>) y APK
//   (Filesystem + Share).
// La PWA mantiene exactamente el comportamiento anterior. El APK
// escribe el archivo en Cache y abre el menú nativo de compartir.

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
// nativo. Si el usuario cancela, no rompe. Si falla la escritura,
// propaga el error para que el llamante lo muestre.
async function compartirEnApk(
  nombreArchivo: string,
  contenido: string,
  mime: string,
  titulo: string
): Promise<void> {
  const escrito = await Filesystem.writeFile({
    path: nombreArchivo,
    data: contenido,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  const uri = await Filesystem.getUri({
    directory: Directory.Cache,
    path: nombreArchivo,
  });

  await Share.share({
    title: titulo,
    text: titulo,
    url: uri.uri,
    dialogTitle: titulo,
  });

  // Limpieza best-effort. Si falla, no rompe (el sistema limpia
  // Cache igualmente).
  try {
    await Filesystem.deleteFile({
      directory: Directory.Cache,
      path: nombreArchivo,
    });
  } catch {
    // ignore
  }

  void escrito;
  void mime;
}

// Único punto de exportación. La PWA y el APK eligen camino.
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
// src/lib/navegacion/exportar-archivo.ts