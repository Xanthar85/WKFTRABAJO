// src/db/grabacion-activa-repo.ts
// WKF — Repositorio del track en curso (grabación activa).
// WKF1.073: persistencia por punto en IndexedDB para que un cierre
// de pestaña o suspensión del sistema no pierda la grabación.
// Un solo registro con id fijo 'actual'.

import {
  STORE_GRABACION_ACTIVA,
  ejecutar,
} from './indexeddb.ts';
import type { PuntoTrack } from './tracks-repo.ts';

export interface GrabacionActiva {
  id: 'actual';
  estado: 'recording' | 'paused';
  puntos: PuntoTrack[];
  iniciadoEn: number;
}

const ID_FIJO = 'actual';

export async function leerGrabacionActiva(): Promise<GrabacionActiva | null> {
  const g = await ejecutar<GrabacionActiva | undefined>(
    STORE_GRABACION_ACTIVA,
    'readonly',
    (store) => store.get(ID_FIJO)
  );
  return g ?? null;
}

export async function guardarGrabacionActiva(
  datos: Omit<GrabacionActiva, 'id'>
): Promise<GrabacionActiva> {
  const g: GrabacionActiva = {
    id: ID_FIJO,
    estado: datos.estado,
    puntos: datos.puntos,
    iniciadoEn: datos.iniciadoEn,
  };
  await ejecutar(STORE_GRABACION_ACTIVA, 'readwrite', (store) => store.put(g));
  return g;
}

export async function borrarGrabacionActiva(): Promise<void> {
  await ejecutar(STORE_GRABACION_ACTIVA, 'readwrite', (store) =>
    store.delete(ID_FIJO)
  );
}
// src/db/grabacion-activa-repo.ts
