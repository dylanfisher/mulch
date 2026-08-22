import { describe, expect, it } from "vitest";

import { assertSourceRef, toneOf } from "./source";
import { TONE_SECS } from "./waveform";

describe("the durable shape of a source", () => {
  it("takes a generator's frequency and a blob's id, and refuses a mixture of the two", () => {
    expect(() => {
      assertSourceRef({ blobId: "abc" });
    }).not.toThrow();
    expect(() => {
      assertSourceRef({ gen: "sine", secs: 2, hz: 440.25 });
    }).not.toThrow();
    expect(() => {
      assertSourceRef({ blobId: "abc", gen: "sine" });
    }).toThrow(/mixes blob and generator/u);
    expect(() => {
      assertSourceRef({ gen: "shepard", secs: 2 });
    }).toThrow(/gen is unknown/u);
  });

  it("refuses a tone that carries a pitch: the pitch is deck.tone, not a load argument", () => {
    // The boundary this step moved (0110). A stored tone from before it no longer validates and
    // the session is discarded rather than repaired (0026).
    expect(() => {
      assertSourceRef({ gen: "tone", secs: TONE_SECS, hz: 440.25 });
    }).toThrow(/hz/u);
    expect(() => {
      assertSourceRef({ gen: "tone", secs: TONE_SECS });
    }).not.toThrow();
  });

  it("refuses a tone of any length but its own: one second is a whole number of cycles", () => {
    expect(() => {
      assertSourceRef({ gen: "tone", secs: 2 });
    }).toThrow(/secs/u);
    expect(toneOf({ gen: "tone", secs: TONE_SECS })).toEqual({ gen: "tone", secs: TONE_SECS });
    expect(toneOf({ gen: "sine", secs: 2 })).toBeNull();
  });
});
