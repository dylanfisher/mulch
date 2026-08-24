import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EFFECT_NAMES,
  effectName,
  exportDateStamp,
  exportSourceName,
  failedMessage,
  INITIAL_YARD_EMOJI,
  YARD_ADJECTIVES,
  YARD_EMOJI,
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

// Draws are independent, so the draw a repeat is first expected at is the birthday number: about
// sqrt(pi * readings / 2) of them. That number is what the pools are sized by (0149) — they are
// not asked to be unique forever, only to outlast a session's worth of draws.
/** How many draws from a pool of this many readings before a repeat is expected. */
const drawsBeforeARepeat = (readings: number): number => Math.sqrt((Math.PI * readings) / 2);

/** Every effect's two pools, flattened one half at a time. */
const effectPools = Object.values(EFFECT_NAMES);

describe("the words a name is drawn from", () => {
  it("outlasts a session's worth of yards and of one kind of effect", () => {
    expect(drawsBeforeARepeat(YARD_ADJECTIVES.length * YARD_PLANTS.length)).toBeGreaterThan(24);
    for (const { adjectives, nouns } of effectPools) {
      expect(drawsBeforeARepeat(adjectives.length * nouns.length)).toBeGreaterThan(12);
    }
    // The picture a yard wears beside its name widens with the words, from a pool that used to
    // repeat by the fourth yard.
    expect(drawsBeforeARepeat(YARD_EMOJI.length)).toBeGreaterThan(6);
  });

  // Every entry is half of a label the instrument writes, so every entry is Titlecase (0059): one
  // word, capital first, nothing shouted.
  it("says every word of every pool Titlecase", () => {
    const words = [
      ...YARD_ADJECTIVES,
      ...YARD_PLANTS,
      ...effectPools.flatMap((pools) => pools.adjectives),
      ...effectPools.flatMap((pools) => pools.nouns),
    ];
    for (const word of words) expect(word).toMatch(/^[A-Z][a-z]+$/u);
  });

  // A yard's pools are as long as an effect's are now, and a word written twice in one of them is
  // a reading the draw can never reach.
  it("writes no word of a yard's own three pools twice", () => {
    for (const pool of [YARD_ADJECTIVES, YARD_PLANTS, YARD_EMOJI]) {
      expect(new Set(pool).size).toBe(pool.length);
    }
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

/** One take, made at a minute that is not the minute this test runs in. */
const MADE = new Date(2026, 7, 22, 17, 19, 44);
const STAMP = "2026-08-22 1719";

describe("exportDateStamp", () => {
  it("says the local day and the local minute, in characters a filesystem writes back", () => {
    expect(exportDateStamp(MADE)).toBe(STAMP);
    // Padded on both halves, or January the ninth at 09:05 sorts between October and November.
    expect(exportDateStamp(new Date(2026, 0, 9, 9, 5))).toBe("2026-01-09 0905");
  });

  // P95: two takes of one yard an hour apart used to be one name twice.
  it("separates two takes of one yard taken a minute apart", () => {
    expect(exportSourceName("Quiet Fern", null, new Date(2026, 7, 22, 17, 19))).not.toBe(
      exportSourceName("Quiet Fern", null, new Date(2026, 7, 22, 17, 20)),
    );
  });
});

describe("exportSourceName", () => {
  it("leads with when, says the yard and what it is playing, and skips the last when there is none", () => {
    expect(exportSourceName("Quiet Fern", "birds.wav", MADE)).toBe(`${STAMP} Quiet Fern birds`);
    expect(exportSourceName("Quiet Fern", null, MADE)).toBe(`${STAMP} Quiet Fern`);
  });

  it("takes off the source's own extension, in whatever case it arrived", () => {
    expect(exportSourceName("Quiet Fern", "birds.WAV", MADE)).toBe(`${STAMP} Quiet Fern birds`);
    expect(exportSourceName("Quiet Fern", "birds.flac", MADE)).toBe(`${STAMP} Quiet Fern birds`);
    // Only the one it ends with: a name is not a list of extensions to strip.
    expect(exportSourceName("Quiet Fern", "birds.wav.mp3", MADE)).toBe(
      `${STAMP} Quiet Fern birds.wav`,
    );
  });

  it("keeps a name that is not an audio file's, and refuses to be named after nothing", () => {
    expect(exportSourceName("Quiet Fern", "birds", MADE)).toBe(`${STAMP} Quiet Fern birds`);
    // A file called `.wav` has no name under its extension, and neither would the export.
    expect(exportSourceName("Quiet Fern", ".wav", MADE)).toBe(`${STAMP} Quiet Fern`);
  });
});
