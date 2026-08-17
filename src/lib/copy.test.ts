import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EFFECT_NAMES,
  effectName,
  exportAudioName,
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
  // pools hold the same entry — and while no pool repeats an entry inside itself.
  it("shares no entry between two pools", () => {
    const drawn = Object.values(EFFECT_NAMES).flat();
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it("draws from the pool the effect names, and refuses an effect it has no pool for", () => {
    for (const [effect, pool] of Object.entries(EFFECT_NAMES)) {
      expect(pool).toContain(effectName(effect, crypto.randomUUID()));
    }
    expect(() => effectName("chorus", "one")).toThrow(/no name pool/u);
    // What the record inherits is not a pool: drawing from `Object.prototype.constructor` would
    // read `undefined` typed as a name rather than saying which pool is missing.
    expect(() => effectName("constructor", "one")).toThrow(/no name pool/u);
  });

  // The whole of 0076: the name is a function of the instance's own durable id, so nothing has to
  // carry it and no reorder, reload or archive can change it. `Math.random` is pinned to one value
  // to prove the pick never reaches it.
  it("gives one id one name, and spreads ids across the pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(effectName("delay", "rack-delay")).toBe(effectName("delay", "rack-delay"));
    const drawn = new Set(
      Array.from({ length: 64 }, (_, index) => effectName("delay", `instance-${index}`)),
    );
    expect(drawn.size).toBe(EFFECT_NAMES["delay"]!.length);
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

describe("exportAudioName", () => {
  it("says the yard and the bytes, and the yard alone when there are none", () => {
    expect(exportAudioName("Quiet Fern", "blob-1")).toBe("Quiet Fern blob-1");
    expect(exportAudioName("Quiet Fern", null)).toBe("Quiet Fern");
  });
});
