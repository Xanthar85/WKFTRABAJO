// src/db/indexeddb.ts
// WKF — Capa de acceso a IndexedDB.
// v5: migración de `orden` para waypoints, rutas, tracks y capas.
//   · Añade `orden` a cada registro existente si no lo tiene.
//   · Waypoints: orden por creadoEn dentro de su carpetaId.
//   · Rutas: orden por creadoEn dentro de su carpetaId.
//   · Tracks: orden por creadoEn dentro de su carpetaId.
//   · Bloques: orden por importadoEn a nivel de bloque (si falta).
//     Dentro de cada bloque, capas y elementos por su orden natural.
// WKF1.068: eliminado el residuo `const id = ...; void id;` de
// migrarOrdenWaypoints. No se usaba para nada.

const DB_NAME = 'wkf-navegacion';
const DB_VERSION = 5;

export const STORE_WAYPOINTS = 'waypoints';
export const STORE_RUTAS = 'rutas';
export const STORE_CAPAS = 'capas';
export const STORE_TRACKS = 'tracks';
export const STORE_CARPETAS = 'carpetas';
export const STORE_PREFERENCIAS = 'preferencias';

let dbPromise: Promise<IDBDatabase> | null = null;

function migrarOrdenWaypoints(store: IDBObjectStore): void {
  const req = store.getAll();
  req.onsuccess = () => {
    const todos = req.result as Array<Record<string, unknown>>;
    const contadorPorCaja = new Map<string, number>();
    // Ordenar por creadoEn ascendente para respetar el orden natural.
    todos.sort((a, b) => {
      const ca = typeof a.creadoEn === 'number' ? a.creadoEn : 0;
      const cb = typeof b.creadoEn === 'number' ? b.creadoEn : 0;
      return ca - cb;
    });
    for (const w of todos) {
      const carpeta = (w.carpetaId as string | undefined) ?? '__sin_caja__';
      if (typeof w.orden === 'number') {
        const prev = contadorPorCaja.get(carpeta) ?? 0;
        if (w.orden + 1 > prev) contadorPorCaja.set(carpeta, w.orden + 1);
        continue;
      }
      const siguiente = contadorPorCaja.get(carpeta) ?? 0;
      const actualizado = { ...w, orden: siguiente };
      store.put(actualizado);
      contadorPorCaja.set(carpeta, siguiente + 1);
    }
  };
}

function migrarOrdenRutas(store: IDBObjectStore): void {
  const req = store.getAll();
  req.onsuccess = () => {
    const todos = req.result as Array<Record<string, unknown>>;
    const contadorPorCaja = new Map<string, number>();
    todos.sort((a, b) => {
      const ca = typeof a.creadoEn === 'number' ? a.creadoEn : 0;
      const cb = typeof b.creadoEn === 'number' ? b.creadoEn : 0;
      return ca - cb;
    });
    for (const r of todos) {
      const carpeta = (r.carpetaId as string | undefined) ?? '__sin_caja__';
      if (typeof r.orden === 'number') {
        const prev = contadorPorCaja.get(carpeta) ?? 0;
        if (r.orden + 1 > prev) contadorPorCaja.set(carpeta, r.orden + 1);
        continue;
      }
      const siguiente = contadorPorCaja.get(carpeta) ?? 0;
      store.put({ ...r, orden: siguiente });
      contadorPorCaja.set(carpeta, siguiente + 1);
    }
  };
}

function migrarOrdenTracks(store: IDBObjectStore): void {
  const req = store.getAll();
  req.onsuccess = () => {
    const todos = req.result as Array<Record<string, unknown>>;
    const contadorPorCaja = new Map<string, number>();
    todos.sort((a, b) => {
      const ca = typeof a.creadoEn === 'number' ? a.creadoEn : 0;
      const cb = typeof b.creadoEn === 'number' ? b.creadoEn : 0;
      return ca - cb;
    });
    for (const t of todos) {
      const carpeta = (t.carpetaId as string | undefined) ?? '__sin_caja__';
      if (typeof t.orden === 'number') {
        const prev = contadorPorCaja.get(carpeta) ?? 0;
        if (t.orden + 1 > prev) contadorPorCaja.set(carpeta, t.orden + 1);
        continue;
      }
      const siguiente = contadorPorCaja.get(carpeta) ?? 0;
      store.put({ ...t, orden: siguiente });
      contadorPorCaja.set(carpeta, siguiente + 1);
    }
  };
}

function migrarOrdenCapas(store: IDBObjectStore): void {
  const req = store.getAll();
  req.onsuccess = () => {
    const bloques = req.result as Array<Record<string, unknown>>;
    bloques.sort((a, b) => {
      const ca = typeof a.importadoEn === 'number' ? a.importadoEn : 0;
      const cb = typeof b.importadoEn === 'number' ? b.importadoEn : 0;
      return ca - cb;
    });
    let ordenBloque = 0;
    for (const b of bloques) {
      const ordenBloqueActual =
        typeof b.orden === 'number' ? b.orden : ordenBloque;
      const capasArr = Array.isArray(b.capas) ? b.capas : [];
      const capas = capasArr.map((c: Record<string, unknown>, idxCapa: number) => {
        const ordenCapa =
          typeof c.orden === 'number' ? c.orden : idxCapa;
        const elementosArr = Array.isArray(c.elementos) ? c.elementos : [];
        const elementos = elementosArr.map(
          (el: Record<string, unknown>, idxEl: number) => ({
            ...el,
            orden: typeof el.orden === 'number' ? el.orden : idxEl,
          })
        );
        return { ...c, orden: ordenCapa, elementos };
      });
      store.put({ ...b, orden: ordenBloqueActual, capas });
      ordenBloque = ordenBloqueActual + 1;
    }
  };
}

function abrirDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este navegador'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_WAYPOINTS)) {
          db.createObjectStore(STORE_WAYPOINTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_RUTAS)) {
          db.createObjectStore(STORE_RUTAS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CAPAS)) {
          db.createObjectStore(STORE_CAPAS, { keyPath: 'id' });
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_TRACKS)) {
          db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        }
      }

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_CARPETAS)) {
          db.createObjectStore(STORE_CARPETAS, { keyPath: 'id' });
        }
      }

      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STORE_PREFERENCIAS)) {
          db.createObjectStore(STORE_PREFERENCIAS, { keyPath: 'clave' });
        }
      }

      if (oldVersion < 5) {
        // Migración de orden. La transacción de onupgradeneeded es
        // readwrite sobre todos los stores, así que los getAll/put
        // que se hacen aquí están permitidos.
        const tx = req.transaction;
        if (tx) {
          const storeWp = tx.objectStore(STORE_WAYPOINTS);
          const storeRt = tx.objectStore(STORE_RUTAS);
          const storeTr = tx.objectStore(STORE_TRACKS);
          const storeCp = tx.objectStore(STORE_CAPAS);
          migrarOrdenWaypoints(storeWp);
          migrarOrdenRutas(storeRt);
          migrarOrdenTracks(storeTr);
          migrarOrdenCapas(storeCp);
        }
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('Error desconocido abriendo IndexedDB'));
    };

    req.onblocked = () => {};
  });

  return dbPromise;
}

export async function getDB(): Promise<IDBDatabase> {
  return abrirDB();
}

export async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void,
  resolveWith?: (req: IDBRequest) => T
): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(storeName, mode);
    const store = transaccion.objectStore(storeName);

    let request: IDBRequest | void;
    try {
      request = fn(store);
    } catch (err) {
      reject(err);
      return;
    }

    transaccion.oncomplete = () => {
      if (request && resolveWith) {
        resolve(resolveWith(request));
      } else {
        resolve(undefined);
      }
    };

    transaccion.onerror = () => {
      reject(transaccion.error ?? new Error('Error en transacción IndexedDB'));
    };

    transaccion.onabort = () => {
      reject(transaccion.error ?? new Error('Transacción IndexedDB abortada'));
    };
  });
}

export async function ejecutar<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(storeName, mode);
    const store = transaccion.objectStore(storeName);

    let request: IDBRequest<T>;
    try {
      request = fn(store);
    } catch (err) {
      reject(err);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Error IndexedDB'));
    transaccion.onabort = () =>
      reject(transaccion.error ?? new Error('Transacción IndexedDB abortada'));
  });
}

export async function obtenerTodos<T>(storeName: string): Promise<T[]> {
  return ejecutar<T[]>(storeName, 'readonly', (store) => store.getAll());
}

export async function borrarBase(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await getDB();
  db.close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
// src/db/indexeddb.ts