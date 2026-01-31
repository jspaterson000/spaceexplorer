// src/data/cache.ts
import type { TLE } from './types';

const DB_NAME = 'cosmic-explorer';
const DB_VERSION = 1;
const STORE_NAME = 'tles';
const META_STORE = 'meta';

export class TLECache {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDB();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'catalogNumber' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  async store(tles: TLE[]): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const metaStore = tx.objectStore(META_STORE);

      // Clear existing and add new
      store.clear();
      for (const tle of tles) {
        store.put(tle);
      }

      // Update timestamp
      metaStore.put({ key: 'timestamp', value: Date.now() });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll(): Promise<TLE[]> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTimestamp(): Promise<number | null> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.get('timestamp');

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async isStale(maxAgeMs: number): Promise<boolean> {
    const timestamp = await this.getTimestamp();
    if (!timestamp) return true;
    return Date.now() - timestamp >= maxAgeMs;
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.objectStore(META_STORE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
