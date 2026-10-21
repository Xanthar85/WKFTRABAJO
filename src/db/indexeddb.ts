// src/db/indexeddb.ts
// WKF — Capa de acceso a IndexedDB.
// v3: se añade el store 'carpetas' (Fase 22).

const DB_NAME = 'wkf-navegacion';
const DB_VERSION = 3;

export const STORE_WAYPOINTS = 'waypoints';
export const STORE_RUTAS = 'rutas';
export const STORE_CAPAS = 'capas';
export const STORE_TRACKS = 'tracks';
export const STORE_CARPETAS = 'carpetas';

let dbPromise: Promise<IDBDatabase> | null = null;

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