/**
 * @role What a file handed to a yard becomes: one ingest carrying the file as it arrived, the blob
 *   id the deck is then loaded with, and the refusals — an unaccepted name before the store, bytes
 *   that will not decode in the decode's own words, correlated by blob so two yards' imports stay
 *   apart, and a yard removed under the load. Split from src/ui/Deck.test.tsx at the hard cap;
 *   what the yard draws of its source, the picker's accept list included, stays there.
 */
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import { byNameRepository, ingestingRepository } from "@/app/persistenceDouble";
import { importDeckFile } from "@/ui/Deck";

const stubEngine = () => silentEngine();

const importing = async (name: string) => {
  const ingested: Blob[] = [];
  const instrument = createInstrument(manualClock(), stubEngine, ingestingRepository(ingested));
  await instrument.ready;
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: "" });
  const failure = await importDeckFile(instrument, "a", file).then(() => null, String);
  await Promise.resolve();
  return { file, ingested, failure, source: instrument.probe().decks.a!.source };
};

/** A host that decodes nothing, refusing the way `decodeNamed` does — by naming the blob. */
const refusingEngine = () =>
  silentEngine({
    loadBlob: (_deck, blobId) =>
      Promise.reject(
        new Error(`could not decode ${blobId} (3 bytes): EncodingError: Unable to decode`),
      ),
  });

// One `it` per claim this file's one ingest makes — the format list, the bytes that reach the
// store, and the two refusals. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("Deck file import", () => {
  it("ingests once and loads only the returned blob id", async () => {
    const { file, ingested, failure, source } = await importing("sample.wav");

    expect(failure).toBeNull();
    expect(ingested).toEqual([file]);
    expect(source).toEqual({ blobId: "stored-id" });
  });

  // P18: every format is the same import, and the file itself is what reaches the store — the
  // identity is the assertion, because a converting path would hand over something else (0043).
  it("hands every accepted format to one ingest, exactly as it arrived", async () => {
    const imports = await Promise.all(
      ["track.m4a", "track.flac", "track.ogg", "track.mp3", "track.aiff"].map((name) =>
        importing(name),
      ),
    );

    for (const { file, ingested, source } of imports) {
      expect(ingested).toEqual([file]);
      expect(source).toEqual({ blobId: "stored-id" });
    }
  });

  // Loudly, and before the blob store has been touched: a file nothing can decode is not
  // something to keep bytes of.
  it("refuses an unaccepted file without storing it or touching the deck", async () => {
    const { ingested, failure, source } = await importing("notes.txt");

    expect(failure).toContain("notes.txt");
    expect(ingested).toEqual([]);
    expect(source).toBeNull();
  });

  /**
   * P95: `.m4a` names a container and not a codec — Chrome decodes the AAC in one and refuses the
   * ALAC in the next — so a name the picker accepts is not a promise the bytes will play. The
   * decode's refusal reaches the bus as an error and `send` returns void, so before this the
   * whole failure was a yard that stayed empty and said nothing.
   */
  it("refuses an import whose bytes will not decode, in the decode's own words", async () => {
    const instrument = createInstrument(manualClock(), refusingEngine, ingestingRepository([]));
    await instrument.ready;
    const file = new File([new Uint8Array([1, 2, 3])], "lossless.m4a", { type: "" });

    const failure = await importDeckFile(instrument, "a", file).then(() => null, String);

    expect(failure).toContain("stored-id");
    expect(failure).toContain("Unable to decode");
    expect(instrument.probe().decks.a?.source).toBeNull();
  });

  /**
   * The refusal is correlated by the blob, because an `error` event carries no deck: an import
   * that took any failed load for its own would answer one yard's refusal with another yard's
   * success — the same silence, reported as a success.
   */
  it("keeps two imports apart, so one yard's refusal is not another's", async () => {
    const instrument = createInstrument(manualClock(), refusingEngine, byNameRepository());
    await instrument.ready;
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌵", name: "Wild Bramble" });
    const refusal = (deck: "a" | "b", name: string): Promise<string | null> =>
      importDeckFile(instrument, deck, new File([new Uint8Array([1])], name)).then(
        () => null,
        String,
      );

    const [first, second] = await Promise.all([refusal("a", "one.wav"), refusal("b", "two.m4a")]);

    expect(first).toContain("one.wav");
    expect(second).toContain("two.m4a");
  });

  /**
   * The other way a load ends without answering: the yard it was decoding into is gone. The
   * import is over — there is nothing to report and nothing left to report it on — and a promise
   * left pending would keep its listener on the bus for the life of the page.
   */
  it("gives up when the yard it was loading into is removed under it", async () => {
    const instrument = createInstrument(
      manualClock(),
      () => silentEngine({ loadBlob: () => new Promise(() => {}) }),
      byNameRepository(),
    );
    await instrument.ready;
    const settled = importDeckFile(
      instrument,
      "a",
      new File([new Uint8Array([1])], "slow.m4a"),
    ).then(() => "over");

    await Promise.resolve();
    instrument.send({ t: "deck.remove", deck: "a" });

    expect(await settled).toBe("over");
  });
});
