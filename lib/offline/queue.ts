import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type OfflineActionType = "create_promise" | "fulfill_promise" | "add_note";

export type OfflineActionPayload = Record<string, unknown>;

export type OfflineQueueItem = {
  id: string;
  actionType: OfflineActionType;
  payload: OfflineActionPayload;
  createdAt: string;
  order: number;
  attempts: number;
  lastError: string | null;
};

type QueueStatus = "queued" | "processing";

type StoredQueueItem = OfflineQueueItem & {
  status: QueueStatus;
};

interface WafaOfflineDB extends DBSchema {
  queue: {
    key: string;
    value: StoredQueueItem;
    indexes: {
      byOrder: [number, string];
      byStatusOrder: [QueueStatus, number, string];
    };
  };
  meta: {
    key: string;
    value: {
      key: string;
      value: number;
    };
  };
}

const DB_NAME = "wafa-offline";
const DB_VERSION = 1;
const QUEUE_STORE = "queue";
const META_STORE = "meta";
const ORDER_KEY = "queue_order_counter";
const STATUS_QUEUED: QueueStatus = "queued";
const STATUS_PROCESSING: QueueStatus = "processing";

let dbPromise: Promise<IDBPDatabase<WafaOfflineDB>> | null = null;

function ensureBrowser() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("Offline queue is only available in the browser");
  }
}

function getDB() {
  ensureBrowser();
  if (!dbPromise) {
    dbPromise = openDB<WafaOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
          queueStore.createIndex("byOrder", ["order", "id"]);
          queueStore.createIndex("byStatusOrder", ["status", "order", "id"]);
        }

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

async function getNextOrder(db: IDBPDatabase<WafaOfflineDB>) {
  const tx = db.transaction([META_STORE], "readwrite");
  const metaStore = tx.objectStore(META_STORE);
  const current = await metaStore.get(ORDER_KEY);
  const nextValue = (current?.value ?? 0) + 1;
  await metaStore.put({ key: ORDER_KEY, value: nextValue });
  await tx.done;
  return nextValue;
}

function toQueueItem(item: StoredQueueItem): OfflineQueueItem {
  return {
    id: item.id,
    actionType: item.actionType,
    payload: item.payload,
    createdAt: item.createdAt,
    order: item.order,
    attempts: item.attempts,
    lastError: item.lastError,
  };
}

export async function enqueueOfflineAction(params: {
  actionType: OfflineActionType;
  payload: OfflineActionPayload;
}) {
  const db = await getDB();
  const id = crypto.randomUUID();
  const order = await getNextOrder(db);

  const record: StoredQueueItem = {
    id,
    actionType: params.actionType,
    payload: params.payload,
    createdAt: new Date().toISOString(),
    order,
    attempts: 0,
    lastError: null,
    status: STATUS_QUEUED,
  };

  await db.put(QUEUE_STORE, record);
  return toQueueItem(record);
}

export async function listQueuedActions() {
  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const index = tx.store.index("byStatusOrder");
  const range = IDBKeyRange.bound([STATUS_QUEUED, 0, ""], [STATUS_QUEUED, Number.MAX_SAFE_INTEGER, "\uffff"]);
  const items = await index.getAll(range);
  await tx.done;
  return items.map(toQueueItem);
}

export async function peekNextQueuedAction() {
  const queued = await listQueuedActions();
  return queued[0] ?? null;
}

export async function markActionProcessing(id: string) {
  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const record = await tx.store.get(id);
  if (!record) {
    await tx.done;
    return null;
  }
  record.status = STATUS_PROCESSING;
  record.attempts += 1;
  await tx.store.put(record);
  await tx.done;
  return toQueueItem(record);
}

export async function markActionFailed(id: string, errorMessage: string) {
  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const record = await tx.store.get(id);
  if (!record) {
    await tx.done;
    return null;
  }
  record.status = STATUS_QUEUED;
  record.lastError = errorMessage;
  await tx.store.put(record);
  await tx.done;
  return toQueueItem(record);
}

export async function completeAction(id: string) {
  const db = await getDB();
  await db.delete(QUEUE_STORE, id);
}

export async function removeAction(id: string) {
  const db = await getDB();
  await db.delete(QUEUE_STORE, id);
}

export async function clearOfflineQueue() {
  const db = await getDB();
  const tx = db.transaction([QUEUE_STORE, META_STORE], "readwrite");
  await tx.objectStore(QUEUE_STORE).clear();
  await tx.objectStore(META_STORE).put({ key: ORDER_KEY, value: 0 });
  await tx.done;
}

