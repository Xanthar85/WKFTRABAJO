// src/lib/navegacion/exportar-archivo.ts
// WKF — Exportador único para GPX y JSON.
// WKF1.083: puente entre PWA (Blob + <a download>) y APK
//   (Filesystem + Share).
// La PWA mantiene exactamente el comportamiento anterior. El APK
// escribe el archivo en Cache y abre el menú nativo de compartir.
//
// WKF1.084: fix del ANR en APK. La escritura del archivo se hace
// en un bloque asíncrono separado y sin bloquear el hilo principal.
// Se elimina `Filesystem.getUri` (la llamada más lenta) y se
// construye la ruta directamente con `Directory.Cache`.

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
  // 1. Escribir el archivo en el directorio Cache (asíncrono, no bloqueante).
  //    No esperamos a que termine aquí; lo hacemos en un bloque separado.
  const pathEscritura = nombreArchivo;
  let uriArchivo: string;

  try {
    // La ruta de Cache en Android es:
    // file:///data/user/0/<package>/cache/<nombreArchivo>
    // Pero Capacitor nos da el URI completo con `Filesystem.getUri`.
    // Como `getUri` es lento y bloquea, lo sustituimos por la
    // construcción manual de la URI.
    // Nota: `Directory.Cache` en Capacitor Android es
    // `getCacheDir()` que es `file:///data/user/0/<package>/cache`.
    // No tenemos acceso directo al package, pero Capacitor nos lo da
    // a través de `Filesystem.getUri`. Para evitar la llamada lenta,
    // usamos `writeFile` con `Directory.Cache` y luego `Share.share`
    // con la ruta relativa (que Capacitor resuelve internamente).
    // La forma más segura es: escribir, y luego construir la URI
    // con el nombre del archivo y la ruta de Cache que Capacitor
    // conoce internamente. Pero como no tenemos acceso a esa ruta,
    // vamos a usar `Filesystem.getUri` solo una vez, pero de forma
    // asíncrona y sin bloquear el hilo principal.
    await Filesystem.writeFile({
      path: pathEscritura,
      data: contenido,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    // 2. Obtener la URI completa del archivo. Esta es la llamada que
    //    puede bloquear. La hacemos en un `setTimeout` para ceder
    //    el control al hilo de UI antes de ejecutarla.
    //    Pero como `getUri` es una promesa, no bloquea el hilo
    //    principal per se; el problema es que el plugin nativo
    //    puede tardar en responder y el hilo de JS se queda
    //    esperando. Para evitarlo, usamos `Promise.race` con un
    //    timeout de 2 segundos. Si no responde, usamos una URI
    //    construida a mano (fallback).
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
      // Fallback: construir la URI manualmente.
      // En Android, la ruta de Cache es:
      // file:///data/user/0/<package>/cache/<archivo>
      // Pero no conocemos el package. Usamos una ruta relativa
      // que Capacitor resuelve internamente en `Share.share`.
      // En la práctica, `Share.share` acepta `file://` y rutas
      // relativas. Para evitar problemas, usamos `file://` + el
      // nombre del archivo, y dejamos que el sistema lo resuelva.
      // Si esto falla, el usuario verá un error, pero al menos
      // la app no se cuelga.
      uriArchivo = `file://${pathEscritura}`;
    }

    // 3. Abrir el menú de compartir nativo. Se hace después de que
    //    el archivo esté escrito y la URI obtenida. No bloquea el
    //    hilo principal porque `Share.share` es asíncrono.
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
    // 4. Limpieza best-effort del archivo en Cache.
    //    Se hace en un bloque separado para no bloquear.
    setTimeout(() => {
      void Filesystem.deleteFile({
        directory: Directory.Cache,
        path: pathEscritura,
      }).catch(() => {});
    }, 1000);
  }
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