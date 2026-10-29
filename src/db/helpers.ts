// src/db/helpers.ts
// WKF — Helpers compartidos por los repositorios de IndexedDB.
// WKF1.068: centralización de `nuevoId` (antes había una copia
// local en cada repo: waypoints, rutas, tracks, carpetas, capas).
// El prefijo se mantiene por tipo para no cambiar el formato de
// los ids existentes: wp-, rt-, tr-, carp-, bl-, cp-, el-.

export function nuevoId(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
// src/db/helpers.ts