/**
 * @role What one landing of a jumping pattern is, at the transport: how long each of its repeats
 *   sounds, and whether it sounds at all — the two knobs P118 gave a landing.
 * @instead Everything else the player promises — where it may read, that it draws its seed's own
 *   sequence, that every seam is a fade and that it arms ahead of the clock → src/audio/player.ts's
 *   own suite, which is at the hard cap and is why these two claims are a file of their own.
 */
import { describe, expect, it } from "vitest";

import { PLAYER_FADE_SECS, PLAYER_SLOTS, type PlayerSpec } from "@/lib/player";
import { createDeckVoice } from "./deck";
import { destination, fakeContext, type Call } from "./deckDouble";

/** A loop the grid divides into 0.2s slots — well clear of the shortest one that can seam. */
const SPAN = 3.2;
const SLOT = SPAN / PLAYER_SLOTS;

/**
 * A plain pattern with nothing drawn under it: one count on every landing, one rate, no wait and
 * no stray, so the only thing moving a window in either case below is the knob it is about. Its
 * own literal rather than the one src/audio/player.test.ts declares, the way every test file in
 * this instrument declares the spec it is asking about (principle 2).
 */
const PLAYER: PlayerSpec = {
  seed: 7,
  bias: 0,
  stride: 0,
  home: 0,
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  distance: 4,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  ratchet: 0,
  gate: 0,
  drop: 0,
  burst: SLOT,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  song: [],
};

/** The chain's own two gains — the deck fader and the rack's input — before any step's. */
const PRE_PLAYER_GAINS = 2;

/**
 * One deck voice on a fake graph, already jumping. The voice is built here rather than shared,
 * for the reason src/audio/deckDouble.ts gives: `createDeckVoice` has one production owner and
 * only a test file may stand in for it.
 */
function jumping(patch: Partial<PlayerSpec> = {}) {
  const { context, gainLogs, sources } = fakeContext();
  const reporter = {
    port: {
      addEventListener: () => {},
      removeEventListener: () => {},
      start: () => {},
      postMessage: () => {},
      close: () => {},
    },
    disconnect: () => {},
  };
  const voice = createDeckVoice(
    context,
    destination(),
    // oxlint-disable-next-line no-unsafe-type-assertion -- only the port and disconnect are used
    reporter as unknown as AudioWorkletNode,
    { started: () => {}, looped: () => {}, stopped: () => {}, xrun: () => {} },
  );
  // oxlint-disable-next-line no-unsafe-type-assertion -- the fake never reads a buffer's samples
  voice.load({ duration: 4 } as AudioBuffer);
  voice.setLoop(0, SPAN);
  voice.setPlayer({ ...PLAYER, ...patch });
  voice.play();
  return { gainLogs, sources };
}

type Host = ReturnType<typeof jumping>;

/** One step's seams, in the order they were scheduled. */
const seamsOf = (host: Host, step: number): Call[] =>
  (host.gainLogs[PRE_PLAYER_GAINS + step] ?? []).filter(
    ([method]) => method === "setValueCurveAtTime",
  );

/** Where each of a deck's steps began, to nine places — past any rounding a fade adds. */
const startsOf = (host: Host): string[] =>
  host.sources.map((source) => (source.started[0]?.[0] ?? Number.NaN).toFixed(9));

describe("a ratcheted landing", () => {
  /**
   * The ratchet, in the only two places a repeat's length is computed: where the landing ends, and
   * where each of its repeats opens. A hold that accelerates into the next jump is exactly this
   * and nothing else — the count is a geometric run rather than a run of equal windows (P118).
   */
  it("shrinks its repeats, and ends where their sum says", () => {
    const ratchet = 0.25;
    const host = jumping({ ratchet, gate: 1 });
    // What the whole landing occupies, off the source's own scheduled stop: the geometric sum of
    // four repeats of this fixture's burst, rather than four of them standing equal.
    const sum = [0, 1, 2, 3].reduce((secs, repeat) => secs + SLOT * (1 - ratchet) ** repeat, 0);
    for (const source of host.sources) {
      const held = (source.stopped[0] ?? 0) - (source.started[0]?.[0] ?? 0) - PLAYER_FADE_SECS;
      expect(held).toBeCloseTo(sum, 9);
      expect(held).toBeLessThan(PLAYER.repeats * SLOT);
    }
    // And the repeats inside it open at those partial sums: a cut landing carries one pair of
    // seams per repeat, so the openings are every other one and the gaps between them shrink.
    // Every cut landing of the pass, not the first one that happens to be cut: the gate is drawn
    // per landing, so one step is a sample of the seed rather than a claim about the arithmetic.
    const cut = host.sources
      .map((_source, step) => seamsOf(host, step))
      .filter((seams) => seams.length > 2);
    expect(cut.length).toBeGreaterThan(2);
    for (const seams of cut) {
      const opens = seams.filter((_seam, index) => index % 2 === 0).map((seam) => seam[2] ?? 0);
      expect(opens).toHaveLength(PLAYER.repeats);
      const spacings = opens.slice(1).map((at, index) => at - (opens[index] ?? Number.NaN));
      expect(spacings[0]).toBeCloseTo(SLOT, 9);
      spacings.slice(1).forEach((gap, index) => {
        expect(gap).toBeCloseTo((spacings[index] ?? Number.NaN) * (1 - ratchet), 9);
      });
    }
  });
});

describe("a dropped landing", () => {
  /**
   * The hole: a landing that is scheduled, placed and never opened. Its source is built, started,
   * stopped and reaped exactly as a sounding one is — which is what keeps `position` answering
   * inside it and the step after it beginning where it always would have — and the whole of what
   * makes it silent is a fader that gets no curve at all (P118).
   */
  it("is scheduled, never opens, and leaves the next landing where it was", () => {
    const holes = jumping({ drop: 1 });
    const sounding = jumping({ drop: 0 });
    expect(holes.sources).toHaveLength(sounding.sources.length);
    // The same windows, landing for landing. A drop that fires spends a draw, so the two passes
    // walk different slots — this fixture varies nothing and waits for nothing, so what a window
    // is made of is the count and the burst alone and the two passes lay them at the same instants.
    // That is the whole claim: a hole occupies its place rather than collapsing out of the grid.
    expect(startsOf(holes)).toEqual(startsOf(sounding));
    const spacings = holes.sources
      .slice(1)
      .map(
        (source, step) =>
          (source.started[0]?.[0] ?? 0) - (holes.sources[step]?.started[0]?.[0] ?? 0),
      );
    for (const gap of spacings) expect(gap).toBeCloseTo(PLAYER.repeats * SLOT, 9);
    // Every one of them stops on its own schedule, so nothing is left wired in with no `ended` to
    // reap it — a dropped landing is a step the transport lets go of like any other.
    expect(holes.sources.every((source) => source.stopped.length === 1)).toBe(true);
    expect(holes.sources.every((_source, step) => seamsOf(holes, step).length === 0)).toBe(true);
    expect(sounding.sources.every((_source, step) => seamsOf(sounding, step).length === 2)).toBe(
      true,
    );
  });
});
