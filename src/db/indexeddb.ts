// src/db/indexeddb.ts
// WKF — Capa de acceso a IndexedDB.
// v4: se añade STORE_PREFERENCIAS para cajas del sistema
// (WKF Fav / WKF Rutas / WKF Waypoints) y migración de datos
// existentes. WKF1.054.
// v5: migración de `orden` para waypoints, rutas, tracks y
// elementos de capa. WKF1.067.

const DB_NAME = 'wkf-navegacion';
const DB_VERSION = 5;

export const STORE_WAYPOINTS = 'waypoints';
export const STORE_RUTAS = 'rutas';
export const STORE_CAPAS = 'capas';
export const STORE_TRACKS = 'tracks';
export const STORE_CARPETAS = 'carpetas';
export const STORE_PREFERENCIAS = 'preferencias';

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
      const transaccion = req.transaction;

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

      if (oldVersion < 5 && transaccion) {
        // Añadir `orden` a waypoints, rutas y tracks existentes.
        const aplicarOrdenSimple = (storeName: string) => {
          if (!db.objectStoreNames.contains(storeName)) return;
          const store = transaccion.objectStore(storeName);
          const cursorReq = store.openCursor();
          let contador = 0;
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return;
            const valor = cursor.value as Record<string, unknown> & {
              creadoEn?: number;
              orden?: number;
            };
            if (valor.orden === undefined) {
              valor.orden = valor.creadoEn ?? contador;
              cursor.update(valor);
            }
            contador++;
            cursor.continue();
          };
        };
        aplicarOrdenSimple(STORE_WAYPOINTS);
        aplicarOrdenSimple(STORE_RUTAS);
        aplicarOrdenSimple(STORE_TRACKS);

        // Capas: recorrer bloques y añadir `orden` a cada elemento
        // que no lo tenga. Aprovechamos para asegurar `orden` en la
        // capa y en el bloque.
        if (db.objectStoreNames.contains(STORE_CAPAS)) {
          const storeCapas = transaccion.objectStore(STORE_CAPAS);
          const cursorCapas = storeCapas.openCursor();
          let contadorBloque = 0;
          cursorCapas.onsuccess = () => {
            const cursor = cursorCapas.result;
            if (!cursor) return;
            const bloque = cursor.value as {
              orden?: number;
              importadoEn?: number;
              capas?: Array<{
                orden?: number;
                elementos?: Array<{ orden?: number }>;
              }>;
            };
            let modificado = false;
            if (bloque.orden === undefined) {
              bloque.orden = bloque.importadoEn ?? contadorBloque;
              modificado = true;
            }
            if (Array.isArray(bloque.capas)) {
              bloque.capas = bloque.capas.map((capa, idxCapa) => {
                let capaMod = false;
                const capaNueva = { ...capa };
                if (capaNueva.orden === undefined) {
                  capaNueva.orden = idxCapa;
                  capaMod = true;
                }
                if (Array.isArray(capaNueva.elementos)) {
                  let idxEl = 0;
                  capaNueva.elementos = capaNueva.elementos.map((el) => {
                    if (el.orden === undefined) {
                      capaMod = true;
                      return { ...el, orden: idxEl++ };
                    }
                    idxEl++;
                    return el;
                  });
                }
                if (capaMod) modificado = true;
                return capaNueva;
              });
            }
            if (modificado) cursor.update(bloque);
            contadorBloque++;
            cursor.continue();
          };
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