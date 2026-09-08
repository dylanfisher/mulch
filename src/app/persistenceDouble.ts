/**
 * @role The doubles the facade's persistence seams are driven through — a repository that records
 *   what it was asked to keep, an engine that records the calls it was asked to make, and the
 *   microtask drain those two need to settle.
 * @instead A double with no persistence in it at all → src/app/engineDouble.ts, which this one
 *   wraps.
 */
import type { BlobId } from "@/lib/source";
import { genSecs } from "@/lib/waveform";
import type { SessionRepository } from "@/state/repository";
import type { Session } from "@/state/session";
import { deckIn, deckIdsOf, fromDecks, patchDeck, type SessionStore } from "@/state/store";
import type { ParamId } from "@/audio/params";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";

export type RepositoryDouble = SessionRepository & {
  saves: Session[];
  /** The reachable set each save was told to keep — everything else is what GC collects. */
  kept: Set<BlobId>[];
  ingests: Blob[];
  blobMap: Map<BlobId, Blob>;
};

export function repositoryDouble(stored?: unknown): RepositoryDouble {
  const blobs = new Map<BlobId, Blob>();
  const saves: Session[] = [];
  const kept: Set<BlobId>[] = [];
  const ingests: Blob[] = [];
  return {
    saves,
    kept,
    ingests,
    blobMap: blobs,
    load: () => Promise.resolve(stored),
    save: (session, retained = new Set()) => {
      saves.push(session);
      kept.push(new Set(retained));
      return Promise.resolve();
    },
    // An id the caller named is honoured, the way the real store honours a crop's minted one.
    ingest: (bytes, id = `blob-${ingests.length + 1}`) => {
      ingests.push(bytes);
      blobs.set(id, bytes);
      return Promise.resolve(id);
    },
    blob: (id) => Promise.resolve(blobs.get(id) ?? null),
    blobs: async (ids) =>
      new Map(
        await Promise.all(
          [...ids].map(async (id) => {
            const blob = blobs.get(id);
            if (blob === undefined) throw new Error(`missing blob: ${id}`);
            return [id, new Uint8Array(await blob.arrayBuffer())] as const;
          }),
        ),
      ),
    replace: (session, imported) => {
      saves.push(session);
      blobs.clear();
      for (const [id, bytes] of imported) blobs.set(id, new Blob([bytes]));
      return Promise.resolve();
    },
  };
}

// A flat stub per Engine method, so the length tracks the size of the interface rather than any
// logic in the double (0007).
// oxlint-disable-next-line max-lines-per-function
export const engineDouble = (
  // Like the real engine: the bytes are read through the provider it is handed, so a blob the
  // repository does not hold refuses here rather than before the call.
  loadBlob: Engine["loadBlob"] = async (_deck, _blobId, blob) => {
    await blob();
    return 3;
  },
  calls: string[] = [],
  /**
   * The store a prepared restore measures into, or null for a double that does not. The real
   * host's `measure()` writes every restored deck, which is why it runs after the session has
   * been replaced rather than inside `commit()` — a restore may add decks the live one never
   * held, and `patchDeck` refuses those (0029). Passing the store is what makes that ordering
   * observable here instead of only in the browser smoke.
   */
  store: SessionStore | null = null,
): Engine =>
  silentEngine({
    addDeck: (deck) => {
      calls.push(`addDeck:${deck}`);
    },
    removeDeck: (deck) => {
      calls.push(`removeDeck:${deck}`);
    },
    load: (deck, source) => {
      calls.push(`load:${deck}`);
      return genSecs(source.gen);
    },
    loadBlob: (deck, blobId, blob, current) => {
      calls.push(`loadBlob:${deck}`);
      return loadBlob(deck, blobId, blob, current).then((duration) =>
        current() ? duration : null,
      );
    },
    setLoop: (deck, from, to) => {
      calls.push(`loop:${deck}`);
      return { in: from, out: to };
    },
    setParam: (deck, _instance, param: ParamId) => {
      calls.push(`param:${deck}:${param}`);
    },
    setAutomation: (deck, _instance, param) => {
      calls.push(`automation:${deck}:${param}`);
    },
    addEffect: (deck, _instance, effect) => {
      calls.push(`effect:${deck}:${effect}`);
      return 0;
    },
    setEffectBypass: (deck, effect, bypassed) => {
      calls.push(`bypass:${deck}:${effect}:${String(bypassed)}`);
    },
    removeEffect: (deck, effect) => {
      calls.push(`remove:${deck}:${effect}`);
    },
    reorderEffects: (deck, order) => {
      calls.push(`reorder:${deck}:${order.join("|")}`);
    },
    // Like the real engine: the bytes are read through the provider it is handed, so a source the
    // repository does not hold refuses here rather than before the call.
    sourcePeaks: async (_source, blob) => {
      await blob();
      return { peaks: { min: new Float32Array(), max: new Float32Array() }, duration: 0 };
    },
    prepareRestore: (session) =>
      Promise.resolve({
        durations: fromDecks(deckIdsOf(session.deckList), (deck) =>
          deckIn(session.decks, deck).source === null ? 0 : 3,
        ),
        commit: () => {},
        measure: () => {
          if (store === null) return;
          for (const { id: deck } of session.deckList) patchDeck(store, deck, { analysis: null });
        },
        discard: () => {},
      }),
  });

export const turns = async (): Promise<void> => {
  for (let remaining = 8; remaining > 0; remaining--) {
    // Promise chains in the facade deliberately serialize decode, snapshot, repository commit,
    // and event emission. Drain that finite microtask chain without advancing fake time.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};
