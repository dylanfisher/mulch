// The persistence layer's own transactions, over the one fake IndexedDB in the repo — which
// stands in for the platform the way src/audio/effects/rack.test.ts's fake stands in for the
// audio graph: requests answered in order, a commit once the queue drains, and an abort that puts
// every store back the way it was. Node has no IndexedDB and every seam above this file is handed
// a repository double, so these transactions run nowhere else.
import { describe, expect, it } from "vitest";
import { importedFileName } from "@/lib/source";
import { createIndexedDbRepository } from "./repository";
import { sessionSnapshot } from "./session";
import { createSessionStore, INITIAL_DECK_ID, patchDeck } from "./store";

type Listeners = Map<string, (() => void)[]>;

const listen = (held: Listeners, type: string, listener: () => void) => {
  held.set(type, [...(held.get(type) ?? []), listener]);
};

const fire = (held: Listeners, type: string) => {
  for (const listener of held.get(type) ?? []) listener();
};

/**
 * One in-memory database, opened once and read through transactions over one shared set of
 * stores. Both waivers below are the same one the repository takes for the same reason: a
 * transaction is its queue, its commit and its abort together, and a helper lifted out of it
 * would take the state those three share with it (0007).
 */
// oxlint-disable-next-line max-lines-per-function
function fakeFactory(): IDBFactory {
  const stores = new Map<string, Map<string, unknown>>();

  // oxlint-disable-next-line max-lines-per-function
  const transaction = (names: string | string[], mode: string) => {
    const scope = typeof names === "string" ? [names] : names;
    const failure: { error: Error | null } = { error: null };
    const events: Listeners = new Map();
    const before = new Map([...stores].map(([name, held]) => [name, new Map(held)]));
    const queue: (() => void)[] = [];
    let settled = false;
    let running = false;

    const abort = () => {
      if (settled) return;
      settled = true;
      for (const [name, held] of before) {
        const live = stores.get(name);
        if (live === undefined) continue;
        live.clear();
        for (const [key, value] of held) live.set(key, value);
      }
      fire(events, "abort");
    };

    // A request is answered on a microtask and the transaction commits on a macrotask, so the
    // continuation of an awaited read still gets to issue its writes — the auto-commit hazard the
    // repository's own `blobs` comment is about.
    const step = () => {
      if (running || settled) return;
      running = true;
      queueMicrotask(() => {
        running = false;
        const next = queue.shift();
        if (next === undefined) {
          setTimeout(commit, 0);
          return;
        }
        next();
        step();
      });
    };

    const commit = () => {
      if (settled) return;
      if (queue.length > 0) {
        step();
        return;
      }
      settled = true;
      fire(events, "complete");
    };

    const ask = <T>(run: () => T) => {
      const own: Listeners = new Map();
      const value: {
        result: T | undefined;
        error: Error | null;
        addEventListener: (type: string, listener: () => void) => void;
      } = {
        result: undefined,
        error: null,
        addEventListener: (type, listener) => {
          listen(own, type, listener);
        },
      };
      queue.push(() => {
        try {
          value.result = run();
          fire(own, "success");
        } catch (thrown) {
          // What IndexedDB does with a failed request nobody handled: the failure becomes the
          // transaction's, bubbles to it as an error, and takes it down — which is how `add`
          // refusing a taken id reaches the caller carrying the platform's own reason.
          value.error = thrown instanceof Error ? thrown : new Error("request failed");
          failure.error = value.error;
          fire(own, "error");
          fire(events, "error");
          abort();
        }
      });
      step();
      // oxlint-disable-next-line no-unsafe-type-assertion -- the repository reads `result`, `error` and `addEventListener`
      return value as unknown as IDBRequest<T>;
    };

    // A transaction reaches exactly the stores it named, and writes only when it said it would:
    // a browser throws NotFoundError and ReadOnlyError here, and the repository's claim that the
    // session and the collection share one transaction is only a claim if the fake lets a
    // narrower one through.
    const objectStore = (name: string) => {
      const held = stores.get(name);
      if (held === undefined) throw new Error(`no object store ${name}`);
      if (!scope.includes(name)) throw new Error(`transaction does not hold ${name}`);
      const write = <T>(run: () => T) => {
        if (mode !== "readwrite") throw new Error(`${name} is open read-only`);
        return ask(run);
      };
      return {
        get: (key: string) => ask(() => held.get(key)),
        getAllKeys: () => ask(() => [...held.keys()]),
        add: (value: unknown, key: string) =>
          write(() => {
            if (held.has(key)) throw new Error(`key ${key} already exists`);
            held.set(key, value);
          }),
        put: (value: unknown, key: string) => write(() => held.set(key, value)),
        delete: (key: string) => write(() => held.delete(key)),
      };
    };

    return {
      get error() {
        return failure.error;
      },
      abort,
      objectStore,
      addEventListener: (type: string, listener: () => void) => {
        listen(events, type, listener);
      },
    };
  };

  const database = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => stores.set(name, new Map()),
    transaction,
  };

  const open = () => {
    const own: Listeners = new Map();
    const pending = {
      result: database,
      error: null,
      addEventListener: (type: string, listener: () => void) => {
        listen(own, type, listener);
      },
    };
    queueMicrotask(() => {
      fire(own, "upgradeneeded");
      fire(own, "success");
    });
    // oxlint-disable-next-line no-unsafe-type-assertion -- the fake answers exactly what `open` uses
    return pending as unknown as IDBOpenDBRequest;
  };

  // oxlint-disable-next-line no-unsafe-type-assertion -- `open` is all the repository asks of a factory
  return { open } as unknown as IDBFactory;
}

/** A durable session whose one yard plays the bytes stored under `id`. */
const sessionWith = (id: string) => {
  const store = createSessionStore();
  patchDeck(store, INITIAL_DECK_ID, { source: { blobId: id } });
  return sessionSnapshot(store.getState());
};

// One case per transaction the repository owns, over the one fake above them all; the length is
// the number of transactions rather than any setup a split would remove (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the IndexedDB repository", () => {
  it("stores the session, keeps what is retained, and collects the rest", async () => {
    const repository = createIndexedDbRepository(fakeFactory());
    await repository.ingest(new Blob(["kept"]), "kept");
    await repository.ingest(new Blob(["held"]), "held");
    await repository.ingest(new Blob(["stray"]), "stray");

    // `held` is named by no source: it is the bytes a live checkpoint is still holding, and the
    // caller says so rather than the session.
    await repository.save(sessionWith("kept"), new Set(["held"]));

    expect(await repository.load()).toEqual(sessionWith("kept"));
    expect((await repository.blob("kept"))?.size).toBe(4);
    expect((await repository.blob("held"))?.size).toBe(4);
    expect(await repository.blob("stray")).toBeNull();
  });

  it("refuses to store a session whose bytes are not there, and keeps the last one", async () => {
    const repository = createIndexedDbRepository(fakeFactory());
    await repository.ingest(new Blob(["kept"]), "kept");
    await repository.save(sessionWith("kept"));

    await expect(repository.save(sessionWith("missing"))).rejects.toThrow(/aborted/u);
    // The session and the collection share one transaction, so the refusal rolls the put back:
    // what is stored keeps naming bytes that are there.
    expect(await repository.load()).toEqual(sessionWith("kept"));
    expect((await repository.blob("kept"))?.size).toBe(4);
  });

  it("refuses a second ingest under an id already taken (0047)", async () => {
    const repository = createIndexedDbRepository(fakeFactory());
    await repository.ingest(new Blob(["first"]), "take");

    // The reason is the failed request's, not the transaction's own: a browser's ConstraintError
    // says the key exists, and a caller that only ever heard "aborted" could not tell this apart
    // from a quota failure.
    await expect(repository.ingest(new Blob(["second"]), "take")).rejects.toThrow(
      /already exists/u,
    );
    expect(await (await repository.blob("take"))?.text()).toBe("first");
  });

  it("mints an imported file's own name into the id it stores it under (P91)", async () => {
    const repository = createIndexedDbRepository(fakeFactory());
    const id = await repository.ingest(new File([Uint8Array.of(1, 2, 3)], "birds.wav"));
    // The id is what an export reads a file's name back out of; nothing else durable carries it.
    expect(importedFileName(id)).toBe("birds.wav");
    expect(await (await repository.blob(id))?.text()).toBe("\u0001\u0002\u0003");
    // Two imports of one file are two blobs, so the name cannot be the whole of the id.
    expect(await repository.ingest(new File([Uint8Array.of(4)], "birds.wav"))).not.toBe(id);
    // Bytes that were never a file say nothing about one — a crop's are named by its command.
    expect(importedFileName(await repository.ingest(new Blob(["minted"])))).toBeNull();
  });

  it("reads exactly the bytes a portable projection asks for, or refuses", async () => {
    const repository = createIndexedDbRepository(fakeFactory());
    await repository.ingest(new Blob(["one"]), "one");
    await repository.ingest(new Blob(["twotwo"]), "two");

    const held = await repository.blobs(new Set(["one", "two"]));
    expect([...held].map(([id, bytes]) => [id, bytes.length])).toEqual([
      ["one", 3],
      ["two", 6],
    ]);
    // An archive short one source is a broken archive, so a missing id is a refusal rather than
    // a gap in the map.
    await expect(repository.blobs(new Set(["one", "gone"]))).rejects.toThrow(/not a Blob/u);
  });

  it("keeps what an earlier open stored when the database is opened again", async () => {
    const factory = fakeFactory();
    const first = createIndexedDbRepository(factory);
    await first.ingest(new Blob(["kept"]), "kept");
    await first.save(sessionWith("kept"));

    // The fake runs every open as an upgrade, which is the case the repository's
    // `objectStoreNames.contains` guards are written for: a store that is already there is not
    // created again, because creating it again is an empty one.
    const second = createIndexedDbRepository(factory);
    expect(await second.load()).toEqual(sessionWith("kept"));
    expect((await second.blob("kept"))?.size).toBe(4);
  });

  it("refuses a replacement whose bytes are not exactly the session's", async () => {
    const repository = createIndexedDbRepository(fakeFactory());
    const stray = new Map([["two", new Uint8Array([1])]]);
    await expect(repository.replace(sessionWith("one"), new Map())).rejects.toThrow(
      /do not exactly match/u,
    );
    await expect(repository.replace(sessionWith("one"), stray)).rejects.toThrow(
      /do not exactly match/u,
    );
  });
});
