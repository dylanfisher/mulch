import { describe, expect, it } from "vitest";

import { assertBlobId, assertSourceRef, importedBlobId, importedFileName, toneOf } from "./source";
import { TONE_SECS } from "./waveform";

describe("the durable shape of a source", () => {
  it("takes a generator's frequency and a blob's id, and refuses a mixture of the two", () => {
    expect(() => {
      assertSourceRef({ blobId: "abc" });
    }).not.toThrow();
    expect(() => {
      assertSourceRef({ gen: "sine", hz: 440.25 });
    }).not.toThrow();
    expect(() => {
      assertSourceRef({ blobId: "abc", gen: "sine" });
    }).toThrow(/mixes blob and generator/u);
    expect(() => {
      assertSourceRef({ gen: "shepard" });
    }).toThrow(/gen is unknown/u);
  });

  it("refuses a tone that carries a pitch: the pitch is deck.tone, not a load argument", () => {
    // The boundary this step moved (0110). A stored tone from before it no longer validates and
    // the session is discarded rather than repaired (0026).
    expect(() => {
      assertSourceRef({ gen: "tone", hz: 440.25 });
    }).toThrow(/hz/u);
    expect(() => {
      assertSourceRef({ gen: "tone" });
    }).not.toThrow();
  });

  it("refuses a generator that carries a length: a drawn source is its kind's own (P127)", () => {
    // The boundary this step moved: a load says what it sounds like and nothing about how long
    // it is. A stored source from before it no longer validates and the session is discarded
    // rather than repaired (0026).
    expect(() => {
      assertSourceRef({ gen: "sine", secs: 2 });
    }).toThrow(/not a generator source/u);
    expect(() => {
      assertSourceRef({ gen: "sine", hz: 220, secs: 2 });
    }).toThrow(/not a generator source/u);
    expect(() => {
      assertSourceRef({ gen: "tone", secs: TONE_SECS });
    }).toThrow(/not a generator source/u);
    expect(toneOf({ gen: "tone" })).toEqual({ gen: "tone" });
    expect(toneOf({ gen: "sine" })).toBeNull();
  });
});

describe("the name an imported blob carries", () => {
  it("hands back the file it was minted from", () => {
    const id = importedBlobId("birds.wav", crypto.randomUUID());
    expect(importedFileName(id)).toBe("birds.wav");
  });

  it("says nothing for an id no import minted", () => {
    // A crop and a flatten name their bytes after the command that minted them (0047), and a
    // stored session may hold ids from a build before any of this — none of them is a file name.
    expect(importedFileName(crypto.randomUUID())).toBeNull();
    expect(importedFileName("take-1")).toBeNull();
    expect(importedFileName("import:")).toBeNull();
  });

  it("is two ids for one file imported twice", () => {
    const first = importedBlobId("birds.wav", crypto.randomUUID());
    expect(first).not.toBe(importedBlobId("birds.wav", crypto.randomUUID()));
  });

  it("stays a durable id whatever the file was called", () => {
    const long = importedBlobId(
      `${"unreasonably long field recording".repeat(4)}.wav`,
      crypto.randomUUID(),
    );
    expect(() => {
      assertBlobId(long, "blobId");
    }).not.toThrow();
    // Truncated rather than refused: the name is a description, and the id is what has a limit.
    expect(importedFileName(long)).toBe(importedFileName(long));
    expect(importedFileName(long)?.startsWith("unreasonably long")).toBe(true);
  });
});
