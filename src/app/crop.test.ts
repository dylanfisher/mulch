/**
 * @role Seam-level contract tests for `deck.crop`: the loop's frames stored under the id the
 *   command minted, loaded back through the ordinary path, undone in one press, and the source
 *   it was cut from left for the ordinary reachability walk to collect (0047).
 */
// One flat list of the command's success and refusal cases, beside the graph and repository
// doubles they are asserted against (0007).
// oxlint-disable max-lines-per-function
import { describe, expect, it } from "vitest";

import type { SessionRepository } from "@/state/repository";
import { sessionBlobIds } from "@/state/session";
import { manualClock } from "./clock";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";

/** What the host asked the graph and the store to do, in the order it asked. */
type Calls = string[];

/** Stand-in for the cut samples: the seam's business is where these bytes go, not what is in them. */
const CROPPED = Uint8Array.of(82, 73, 70, 70);

type Save = { session: string[]; retained: string[] };

type Fixture = {
  instrument: Instrument;
  calls: Calls;
  events: Event[];
  blobs: Map<string, Blob>;
  saves: Save[];
};

const settle = async (): Promise<void> => {
  for (let remaining = 60; remaining > 0; remaining--) {
    // A crop chains a store, a decode and — on undo — a prepared replacement graph.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const fixture = (): Fixture => {
  const calls: Calls = [];
  const blobs = new Map<string, Blob>();
  const saves: Save[] = [];
  const repository: SessionRepository = {
    load: () => Promise.resolve(),
    save: (session, retained = new Set()) => {
      saves.push({ session: [...sessionBlobIds(session)], retained: [...retained] });
      return Promise.resolve();
    },
    ingest: (bytes, id = "minted") => {
      blobs.set(id, bytes);
      calls.push(`ingest:${id}`);
      return Promise.resolve(id);
    },
    blob: (id) => Promise.resolve(blobs.get(id) ?? null),
    blobs: (ids) => Promise.resolve(new Map([...ids].map((id) => [id, new Uint8Array(0)]))),
    replace: () => Promise.resolve(),
  };
  const instrument = createInstrument(
    manualClock(),
    () =>
      silentEngine({
        loadBlob: (deck, blobId) => {
          calls.push(`loadBlob:${deck}:${blobId}`);
          return Promise.resolve(2);
        },
        setLoop: (_deck, inSecs, outSecs) =>
          outSecs > inSecs ? { in: inSecs, out: outSecs } : null,
        cropped: (deck, inSecs, outSecs) => {
          calls.push(`cropped:${deck}:${inSecs}:${outSecs}`);
          return CROPPED;
        },
      }),
    repository,
  );
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  blobs.set("imported", new Blob([Uint8Array.of(9, 9)]));
  return { instrument, calls, events, blobs, saves };
};

/** Deck a holding imported bytes, with the loop a crop is about to cut it down to. */
const looped = async (instrument: Instrument): Promise<void> => {
  instrument.send({ t: "deck.load", deck: "a", source: { blobId: "imported" } });
  await settle();
  instrument.send({ t: "deck.loop", deck: "a", in: 0.5, out: 1.5 });
};

describe("deck.crop", () => {
  it("stores the loop under the id the command minted and loads it back", async () => {
    const { instrument, calls, events, blobs } = fixture();
    await instrument.ready;
    await looped(instrument);
    calls.length = 0;

    instrument.send({ t: "deck.crop", deck: "a", id: "crop-1" });
    await settle();

    // The samples are taken from the loop the deck actually holds, stored, and only then loaded.
    expect(calls).toEqual(["cropped:a:0.5:1.5", "ingest:crop-1", "loadBlob:a:crop-1"]);
    expect([...new Uint8Array(await blobs.get("crop-1")!.arrayBuffer())]).toEqual([...CROPPED]);

    const deck = instrument.probe().decks.a!;
    expect(deck.source).toEqual({ blobId: "crop-1" });
    // The loop was a range in the old source; the new one is that range, so there is none left.
    expect(deck.loop).toBeNull();
    expect(deck.duration).toBe(2);
    expect(events.filter((event) => event.t === "deck.cropped")).toEqual([
      expect.objectContaining({ t: "deck.cropped", deck: "a", blob: "crop-1", in: 0.5, out: 1.5 }),
    ]);
  });

  it("undoes in one press, back to the source and the loop it was cut from", async () => {
    const { instrument } = fixture();
    await instrument.ready;
    await looped(instrument);
    instrument.send({ t: "deck.crop", deck: "a", id: "crop-1" });
    await settle();

    instrument.send({ t: "history.undo" });
    await settle();

    const deck = instrument.probe().decks.a!;
    expect(deck.source).toEqual({ blobId: "imported" });
    expect(deck.loop).toEqual({ in: 0.5, out: 1.5 });
  });

  it("leaves the cropped-from blob for the reachability walk rather than deleting it", async () => {
    const { instrument, blobs, saves } = fixture();
    await instrument.ready;
    await looped(instrument);
    instrument.send({ t: "deck.crop", deck: "a", id: "crop-1" });
    await settle();

    instrument.send({ t: "session.save" });
    await settle();

    // Nothing was deleted here: the bytes are still there, and the save is what decides.
    expect(blobs.has("imported")).toBe(true);
    const save = saves.at(-1)!;
    // The session names only the crop — which is what makes the old blob collectable — while the
    // checkpoint one press of undo would restore still holds it back.
    expect(save.session).toEqual(["crop-1"]);
    expect(new Set(save.retained)).toEqual(new Set(["crop-1", "imported"]));
  });

  it("refuses a deck with no loop, and stores nothing", async () => {
    const { instrument, events, blobs } = fixture();
    await instrument.ready;
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "imported" } });
    await settle();

    instrument.send({ t: "deck.crop", deck: "a", id: "crop-1" });
    await settle();

    expect(events.at(-1)).toMatchObject({ t: "error", detail: "deck a has no loop to crop to" });
    expect(blobs.has("crop-1")).toBe(false);
    expect(instrument.probe().decks.a!.source).toEqual({ blobId: "imported" });
  });

  it("loses to later intent that arrives while the bytes are still being stored", async () => {
    const { instrument, events } = fixture();
    await instrument.ready;
    await looped(instrument);

    instrument.send({ t: "deck.crop", deck: "a", id: "crop-1" });
    // A newer load, sent before the store settles, is the deck's real intent: the crop's own
    // epoch is already stale, so it neither loads its bytes nor claims on the log that it did.
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 1, hz: 440 } });
    await settle();

    expect(instrument.probe().decks.a!.source).toEqual({ gen: "sine", secs: 1, hz: 440 });
    expect(events.filter((event) => event.t === "deck.cropped")).toEqual([]);
  });
});
