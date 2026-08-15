/**
 * @role The native IndexedDB repository for the one current session and its unchanged audio blobs,
 *   including atomic snapshot replacement and garbage collection of unreferenced blobs.
 */
import type { BlobId } from "@/lib/source";
import { sessionBlobIds, type SessionV4 } from "./session";

const DATABASE = "mulch";
const DATABASE_VERSION = 1;
const SESSIONS = "sessions";
const BLOBS = "blobs";
const CURRENT_SESSION = "current";

export type SessionRepository = {
  /** Resolves to undefined when no snapshot exists; otherwise returns untrusted stored data. */
  load(): Promise<unknown>;
  save(session: SessionV4, retained?: ReadonlySet<BlobId>): Promise<void>;
  ingest(file: File): Promise<BlobId>;
  blob(id: BlobId): Promise<Blob | null>;
  /** Read exactly these stored bytes for a portable projection; missing ids reject. */
  blobs(ids: ReadonlySet<BlobId>): Promise<ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>>>;
  /** Atomically replace the singleton snapshot and all reachable blobs. */
  replace(
    session: SessionV4,
    blobs: ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>>,
    retained?: ReadonlySet<BlobId>,
    current?: () => boolean,
  ): Promise<void>;
};

const request = <T>(value: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    value.addEventListener(
      "success",
      () => {
        resolve(value.result);
      },
      { once: true },
    );
    value.addEventListener(
      "error",
      () => {
        reject(value.error ?? new Error("IndexedDB request failed"));
      },
      { once: true },
    );
  });

const complete = (transaction: IDBTransaction): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener(
      "complete",
      () => {
        resolve();
      },
      { once: true },
    );
    transaction.addEventListener(
      "abort",
      () => {
        reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
      },
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => {
        reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      },
      { once: true },
    );
  });

function open(factory: IDBFactory): Promise<IDBDatabase> {
  const pending = factory.open(DATABASE, DATABASE_VERSION);
  pending.addEventListener("upgradeneeded", () => {
    const database = pending.result;
    if (!database.objectStoreNames.contains(SESSIONS)) database.createObjectStore(SESSIONS);
    if (!database.objectStoreNames.contains(BLOBS)) database.createObjectStore(BLOBS);
  });
  return request(pending);
}

// The returned repository is one closure over one database connection; each member is one
// transaction. A one-line extraction would split transaction setup from the requests it owns.
// oxlint-disable-next-line max-lines-per-function
export function createIndexedDbRepository(factory: IDBFactory = indexedDB): SessionRepository {
  const database = open(factory);
  return {
    load: async () => {
      const db = await database;
      const transaction = db.transaction(SESSIONS, "readonly");
      const done = complete(transaction);
      const value = await request<unknown>(transaction.objectStore(SESSIONS).get(CURRENT_SESSION));
      await done;
      return value;
    },
    save: async (session, retained = new Set()) => {
      const db = await database;
      const transaction = db.transaction([SESSIONS, BLOBS], "readwrite");
      const done = complete(transaction);
      transaction.objectStore(SESSIONS).put(session, CURRENT_SESSION);
      const blobs = transaction.objectStore(BLOBS);
      const keys = await request(blobs.getAllKeys());
      const keep = sessionBlobIds(session);
      for (const id of retained) keep.add(id);
      const present = new Set(keys.filter((key): key is string => typeof key === "string"));
      if ([...keep].some((id) => !present.has(id))) {
        // The session and GC share this transaction, so aborting rolls the put back too.
        transaction.abort();
        await done;
      }
      for (const key of keys) {
        if (typeof key !== "string" || !keep.has(key)) blobs.delete(key);
      }
      await done;
    },
    ingest: async (file) => {
      const db = await database;
      const id = crypto.randomUUID();
      const transaction = db.transaction(BLOBS, "readwrite");
      const done = complete(transaction);
      transaction.objectStore(BLOBS).add(file, id);
      await done;
      return id;
    },
    blob: async (id) => {
      const db = await database;
      const transaction = db.transaction(BLOBS, "readonly");
      const done = complete(transaction);
      const stored = await request<unknown>(transaction.objectStore(BLOBS).get(id));
      await done;
      if (stored === undefined) return null;
      if (!(stored instanceof Blob)) throw new TypeError(`blob ${id} is not a Blob`);
      return stored;
    },
    blobs: async (ids) => {
      const db = await database;
      const transaction = db.transaction(BLOBS, "readonly");
      const done = complete(transaction);
      const store = transaction.objectStore(BLOBS);
      // Queue every request before yielding: reading one Blob's ArrayBuffer can let an otherwise
      // idle IndexedDB transaction auto-commit before a later request is issued.
      const stored = await Promise.all(
        [...ids].map(async (id) => [id, await request<unknown>(store.get(id))] as const),
      );
      await done;
      return new Map(
        await Promise.all(
          stored.map(async ([id, value]) => {
            if (!(value instanceof Blob)) throw new TypeError(`blob ${id} is not a Blob`);
            return [id, new Uint8Array(await value.arrayBuffer())] as const;
          }),
        ),
      );
    },
    replace: async (session, imported, retained = new Set(), current = () => true) => {
      const expected = sessionBlobIds(session);
      if (expected.size !== imported.size || [...expected].some((id) => !imported.has(id))) {
        throw new TypeError("replacement blobs do not exactly match the session");
      }
      const db = await database;
      const transaction = db.transaction([SESSIONS, BLOBS], "readwrite");
      const done = complete(transaction);
      transaction.objectStore(SESSIONS).put(session, CURRENT_SESSION);
      const store = transaction.objectStore(BLOBS);
      const keep = new Set([...expected, ...retained]);
      const keys = await request(store.getAllKeys());
      if (!current()) {
        transaction.abort();
        await done;
      }
      for (const key of keys) {
        if (typeof key !== "string" || !keep.has(key)) store.delete(key);
      }
      for (const [id, bytes] of imported) store.put(new Blob([bytes]), id);
      await done;
    },
  };
}
