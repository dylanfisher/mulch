import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyName,
  failedMessage,
  INITIAL_YARD_EMOJI,
  partBadge,
  songLabel,
  YARD_ADJECTIVES,
  YARD_EMOJI,
  YARD_PLANTS,
} from "@/lib/copy";
import { boundsLabel } from "./copyAuto.ts";
// The effect name pools left this file for ./copyNames.ts when copy.ts came within twenty lines of
// the hard cap; their cases stay here, where the rest of the instrument's naming is proved.
import { EFFECT_NAMES, effectName } from "./copyNames.ts";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import { partVoice } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_PART_DEFAULTS, type SongPart } from "@/lib/playerSong";

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

/** A part, told apart by the one field these cases are about. */
const part = (name: string): SongPart => ({
  id: "0000-aaa1",
  name,
  ...PLAYER_PART_DEFAULTS,
  voice: partVoice(PLAYER_DEFAULTS),
});

/**
 * What a part is called, which a part now carries rather than only wears: the card reads its song
 * out by those names, and a copy is called what it was taken from with the marker saying it is a
 * second one — cut to fit *before* the marker, so what a copy is called always passes the guard a
 * name goes through and always still reads as a copy (P134, src/lib/guards.ts).
 */
describe("what a part is called", () => {
  it("reads a song out by the names its parts were given", () => {
    expect(songLabel([part("Riff"), part("Break")])).toBe("Riff · Break");
    // An un-named part is not a case: a part is minted with its own badge as its name, so what
    // this reads for one nothing has renamed is that badge (principle 5).
    expect(songLabel([part(partBadge("0000-aaa1"))])).toBe("AAA1");
  });

  it("marks a copy, and keeps it inside the bound a durable name has", () => {
    expect(copyName("Riff")).toBe("Riff Copy");
    const long = copyName("R".repeat(DURABLE_TEXT_MAX));
    expect(long.length).toBe(DURABLE_TEXT_MAX);
    expect(long.endsWith("Copy")).toBe(true);
  });
});

describe("what a window on a run says", () => {
  // 0064: a range that crosses zero reaches values just under it, and `toFixed` alone reads those
  // as "-0.0" — a minus sign on a number the same call is displaying as nothing. The dial's own
  // readout rounds first and re-signs, and a window on the very same parameter must agree.
  it("reads an end just under zero as nothing, the way the dial above it does", () => {
    expect(boundsLabel(-0.04, 6, 1)).toBe("0.0–6.0");
    expect(boundsLabel(-0.4, 6, 1)).toBe("-0.4–6.0");
    expect(boundsLabel(0.25, 0.4, 2)).toBe("0.25–0.40");
  });
});
