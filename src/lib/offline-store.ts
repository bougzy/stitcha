/* -------------------------------------------------------------------------- */
/*  Offline-First Data Store using IndexedDB                                   */
/*  Uses the `idb` library for a Promise-based IndexedDB wrapper              */
/*  All mutations write locally first, then sync to MongoDB in background     */
/* -------------------------------------------------------------------------- */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "stitcha-offline";
const DB_VERSION = 1;

interface SyncQueueItem {
  id: string;
  url: string;
  method: string;
  body?: string;
  createdAt: number;
  retries: number;
}

/* ---- Database schema ---- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbPromise: Promise<IDBPDatabase<any>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Clients store
        if (!db.objectStoreNames.contains("clients")) {
          const clientStore = db.createObjectStore("clients", { keyPath: "_id" });
          clientStore.createIndex("designerId", "designerId");
        }
        // Orders store
        if (!db.objectStoreNames.contains("orders")) {
          const orderStore = db.createObjectStore("orders", { keyPath: "_id" });
          orderStore.createIndex("designerId", "designerId");
        }
        // Measurements store
        if (!db.objectStoreNames.contains("measurements")) {
          db.createObjectStore("measurements", { keyPath: "_id" });
        }
        // Sync queue for pending API requests
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
          syncStore.createIndex("createdAt", "createdAt");
        }
        // Key-value store for metadata
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}

/* -------------------------------------------------------------------------- */
/*  Generic CRUD operations                                                    */
/* -------------------------------------------------------------------------- */

export const offlineStore = {
  /** Get all items from a store */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAll(storeName: string): Promise<any[]> {
    const db = await getDB();
    if (!db) return [];
    return db.getAll(storeName);
  },

  /** Get a single item by key */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(storeName: string, key: string): Promise<any | undefined> {
    const db = await getDB();
    if (!db) return undefined;
    return db.get(storeName, key);
  },

  /** Put (upsert) an item */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async put(storeName: string, value: any): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put(storeName, value);
  },

  /** Put multiple items */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async putMany(storeName: string, items: any[]): Promise<void> {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction(storeName, "readwrite");
    await Promise.all([...items.map((item) => tx.store.put(item)), tx.done]);
  },

  /** Delete an item */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete(storeName, key);
  },

  /** Clear all items from a store */
  async clear(storeName: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.clear(storeName);
  },

  /** Get/set metadata */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMeta(key: string): Promise<any> {
    const db = await getDB();
    if (!db) return null;
    return db.get("meta", key);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async setMeta(key: string, value: any): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put("meta", value, key);
  },
};

/* -------------------------------------------------------------------------- */
/*  Sync Queue — queues failed API requests for retry                         */
/* -------------------------------------------------------------------------- */

export const syncQueue = {
  /** Add a failed request to the retry queue */
  async add(url: string, method: string, body?: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      method,
      body,
      createdAt: Date.now(),
      retries: 0,
    };
    await db.put("syncQueue", item);
  },

  /** Get all pending sync items */
  async getAll(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    if (!db) return [];
    return db.getAll("syncQueue");
  },

  /** Remove a successfully synced item */
  async remove(id: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete("syncQueue", id);
  },

  /** Process all pending sync items */
  async flush(): Promise<{ synced: number; failed: number }> {
    const items = await this.getAll();
    let synced = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.body ? { "Content-Type": "application/json" } : undefined,
          body: item.body,
        });

        if (res.ok) {
          await this.remove(item.id);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  },

  /** Get count of pending items */
  async count(): Promise<number> {
    const items = await this.getAll();
    return items.length;
  },
};

/* -------------------------------------------------------------------------- */
/*  Sync Status                                                                */
/* -------------------------------------------------------------------------- */

export type SyncStatus = "synced" | "pending" | "failed" | "offline";

export async function getSyncStatus(): Promise<SyncStatus> {
  if (!navigator.onLine) return "offline";
  const count = await syncQueue.count();
  if (count > 0) return "pending";
  return "synced";
}

/* -------------------------------------------------------------------------- */
/*  Seed local store from server on first load                                 */
/* -------------------------------------------------------------------------- */

export async function seedFromServer(): Promise<void> {
  try {
    const lastSync = await offlineStore.getMeta("lastSyncTimestamp");
    const now = Date.now();

    // Only re-seed if last sync was more than 5 minutes ago
    if (lastSync && now - lastSync < 5 * 60 * 1000) return;

    const [clientsRes, ordersRes] = await Promise.all([
      fetch("/api/clients?limit=200"),
      fetch("/api/orders?limit=200"),
    ]);

    if (clientsRes.ok) {
      const json = await clientsRes.json();
      if (json.success && json.data?.clients) {
        await offlineStore.putMany("clients", json.data.clients);
      }
    }

    if (ordersRes.ok) {
      const json = await ordersRes.json();
      if (json.success && json.data) {
        const orders = Array.isArray(json.data) ? json.data : json.data.orders || [];
        await offlineStore.putMany("orders", orders);
      }
    }

    await offlineStore.setMeta("lastSyncTimestamp", now);
  } catch {
    // Silently fail — we're likely offline
  }
}
