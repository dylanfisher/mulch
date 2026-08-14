/**
 * @role The native IndexedDB repository for the one current session and its unchanged audio blobs,
 *   including atomic snapshot replacement and garbage collection of unreferenced blobs.
 */
import type { BlobId } from "@/lib/source";
import type { SessionV2 } from "./session";

const DATABASE = "mulch";
const DATABASE_VERSION = 1;
const SESSIONS = "sessions";
const BLOBS = "blobs";
const CURRENT_SESSION = "current";

export type SessionRepository = {
  /** Resolves to undefined when no snapshot exists; otherwise returns untrusted stored data. */
  load(): Promise<unknown>;
  save(session: SessionV2): Promise<void>;
  ingest(file: File): Promise<BlobId>;
  blob(id: BlobId): Promise<Blob | null>;
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

const referencedBlobs = (session: SessionV2): Set<BlobId> => {
  const ids = new Set<BlobId>();
  for (const deck of Object.values(session.decks)) {
    if (deck.source !== null && "blobId" in deck.source) ids.add(deck.source.blobId);
  }
  return ids;
};

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
    save: async (session) => {
      const db = await database;
      const transaction = db.transaction([SESSIONS, BLOBS], "readwrite");
      const done = complete(transaction);
      transaction.objectStore(SESSIONS).put(session, CURRENT_SESSION);
      const blobs = transaction.objectStore(BLOBS);
      const keys = await request(blobs.getAllKeys());
      const keep = referencedBlobs(session);
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
  };
}
