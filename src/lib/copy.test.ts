import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EFFECT_NAMES,
  effectName,
  exportSourceName,
  failedMessage,
  INITIAL_YARD_EMOJI,
  YARD_ADJECTIVES,
  YARD_PLANTS,
} from "@/lib/copy";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("effect name pools", () => {
  // A name read on its own says which kind of thing it names, which it can only do while no two
  // effects share a noun — and while no pool repeats an entry inside itself.
  /** The sentence four surfaces wrote out, one of which had already dropped a word from it. */
  it("says a failure the same way whatever failed", () => {
    expect(failedMessage("Session export", new Error("no room"))).toBe(
      "Session export failed: Error: no room",
    );
    // A reason that is not an Error still arrives whole rather than as [object Object].
    expect(failedMessage("Import", "the file was empty")).toBe("Import failed: the file was empty");
  });

  it("shares no noun between two effects, and repeats nothing inside a pool", () => {
    const nouns = Object.values(EFFECT_NAMES).flatMap((pools) => pools.nouns);
    expect(new Set(nouns).size).toBe(nouns.length);
    for (const { adjectives } of Object.values(EFFECT_NAMES)) {
      expect(new Set(adjectives).size).toBe(adjectives.length);
    }
  });

  it("draws one word from each pool, and refuses an effect it has no pools for", () => {
    for (const [effect, { adjectives, nouns }] of Object.entries(EFFECT_NAMES)) {
      const [adjective, noun, ...rest] = effectName(effect, crypto.randomUUID()).split(" ");
      expect(rest).toEqual([]);
      expect(adjectives).toContain(adjective);
      expect(nouns).toContain(noun);
    }
    expect(() => effectName("chorus", "one")).toThrow(/no name pool/u);
    // What the record inherits is not a pool: drawing from `Object.prototype.constructor` would
    // read `undefined` typed as a name rather than saying which pool is missing.
    expect(() => effectName("constructor", "one")).toThrow(/no name pool/u);
  });

  // The whole of 0076: the name is a function of the instance's own durable id, so nothing has to
  // carry it and no reorder, reload or archive can change it. `Math.random` is pinned to one value
  // to prove the pick never reaches it.
  it("gives one id one name, and reaches every pairing of the two pools", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(effectName("delay", "rack-delay")).toBe(effectName("delay", "rack-delay"));
    const pools = EFFECT_NAMES["delay"]!;
    const drawn = new Set(
      Array.from({ length: 1024 }, (_, index) => effectName("delay", `instance-${index}`)),
    );
    // Two pools multiplied, not a flat list: a rack far longer than either pool still reads as
    // distinct cards, which is the whole of P55's first half.
    expect(drawn.size).toBe(pools.adjectives.length * pools.nouns.length);
    expect(drawn.size).toBeGreaterThan(pools.nouns.length);
  });
});

/** A boot, as the module sees one: fresh imports with `Math.random` pinned to one value. */
const boot = (random: number) => {
  vi.resetModules();
  vi.spyOn(Math, "random").mockReturnValue(random);
  return import("@/lib/copy");
};

describe("the first yard", () => {
  it("keeps its emoji fixed while its name is a draw", async () => {
    const first = await boot(0);
    const last = await boot(0.99);
    expect(first.INITIAL_YARD_EMOJI).toBe(INITIAL_YARD_EMOJI);
    expect(last.INITIAL_YARD_EMOJI).toBe(INITIAL_YARD_EMOJI);
    expect(first.INITIAL_YARD_NAME).not.toBe(last.INITIAL_YARD_NAME);
    expect(last.INITIAL_YARD_NAME).toBe(`${YARD_ADJECTIVES.at(-1)} ${YARD_PLANTS.at(-1)}`);
  });
});

describe("exportSourceName", () => {
  it("says the yard and the file it is playing, and the yard alone when there is none", () => {
    expect(exportSourceName("Quiet Fern", "birds.wav")).toBe("Quiet Fern birds");
    expect(exportSourceName("Quiet Fern", null)).toBe("Quiet Fern");
  });

  it("takes off the source's own extension, in whatever case it arrived", () => {
    expect(exportSourceName("Quiet Fern", "birds.WAV")).toBe("Quiet Fern birds");
    expect(exportSourceName("Quiet Fern", "birds.flac")).toBe("Quiet Fern birds");
    // Only the one it ends with: a name is not a list of extensions to strip.
    expect(exportSourceName("Quiet Fern", "birds.wav.mp3")).toBe("Quiet Fern birds.wav");
  });

  it("keeps a name that is not an audio file's, and refuses to be named after nothing", () => {
    expect(exportSourceName("Quiet Fern", "birds")).toBe("Quiet Fern birds");
    // A file called `.wav` has no name under its extension, and neither would the export.
    expect(exportSourceName("Quiet Fern", ".wav")).toBe("Quiet Fern");
  });
});
