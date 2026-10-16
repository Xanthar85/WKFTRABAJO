// src/db/indexeddb.ts
// WKF — Capa de acceso a IndexedDB para la capa de navegación.
// F1: creación de la base, apertura, cierre y utilidades comunes.
// Los repositorios (waypoints, rutas, capas) se apoyan en este módulo.

const DB_NAME = 'wkf-navegacion';
const DB_VERSION = 1;

export const STORE_WAYPOINTS = 'waypoints';
export const STORE_RUTAS = 'rutas';
export const STORE_CAPAS = 'capas';

let dbPromise: Promise<IDBDatabase> | null = null;

function abrirDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este navegador'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_WAYPOINTS)) {
        db.createObjectStore(STORE_WAYPOINTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RUTAS)) {
        db.createObjectStore(STORE_RUTAS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CAPAS)) {
        db.createObjectStore(STORE_CAPAS, { keyPath: 'id' });
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

    req.onblocked = () => {
      // Otra pestaña tiene la base abierta con una versión antigua.
      // No bloqueamos al usuario: se resolverá cuando cierre la otra.
    };
  });

  return dbPromise;
}

export async function getDB(): Promise<IDBDatabase> {
  return abrirDB();
}

/**
 * Ejecuta una operación de escritura o lectura en un almacén.
 * El callback recibe el object store y devuelve lo que quiera; la
 * promesa resuelve con ese valor cuando la transacción termina.
 */
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

/**
 * Variante más cómoda para "escribir y quedarme con el resultado del
 * request". Resuelve cuando el request tiene éxito, sin esperar a que
 * cierre la transacción entera. Se usa para add / put / delete.
 */
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

/**
 * Devuelve todos los registros de un almacén.
 */
export async function obtenerTodos<T>(storeName: string): Promise<T[]> {
  return ejecutar<T[]>(storeName, 'readonly', (store) => store.getAll());
}

/**
 * Borra toda la base. Útil para "borrar todos los datos" desde Ajustes
 * en fases posteriores.
 */
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