/**
 * @role How long a burst sounds and where its seams fall: that a burst is wall seconds no loop may
 *   scale (0119), and that the shortest one a spec may ask for still carries every fade it needs
 *   (P82, 0089).
 * @instead Everything else the player promises — where it may read, that it draws its seed's own
 *   sequence, that a pattern is armed ahead of the clock → src/audio/player.ts's own suite, which
 *   is at the hard cap and is why this file exists, exactly as src/audio/playerLanding.test.ts
 *   does. What a landing is → that file. Where a seam is drawn → src/audio/playerSeam.ts.
 */
import { describe, expect, it } from "vitest";

import {
  PLAYER_BURST_MIN,
  PLAYER_FADE_SECS,
  PLAYER_MIN_SLOT_SECS,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { createDeckVoice } from "./deck";
import { destination, fakeContext, type Call } from "./deckDouble";
import { AUTOMATION_REARM_SECS, MAX_PLAYER_STEPS } from "./transport";

/** A loop the grid divides into 0.2s slots — well clear of the shortest one that can seam. */
const SPAN = 3.2;
const SLOT = SPAN / PLAYER_SLOTS;
/** The chain's own two gains — the deck fader and the rack's input — before any step's. */
const PRE_PLAYER_GAINS = 2;

/**
 * A plain pattern with nothing drawn under it: one count on every landing, one rate and no wait,
 * so the only thing moving a window in the cases below is the burst they are about. Its own
 * literal rather than the one src/audio/player.test.ts declares, the way every test file in this
 * instrument declares the spec it is asking about (principle 2).
 */
const PLAYER: PlayerSpec = {
  bypassed: false,
  bed: 0,
  bedPer: "jump",
  beds: [],
  bedEvery: 0,
  bedDistance: 2,
  bedBias: 0,
  bedHome: 0,
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
  arrangeAmount: 1,
  arrangeGrow: 0,
  arrangeSpan: 0,
  arrangeApart: 0,
  distance: 4,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  ratchet: 0,
  gate: 0,
  drop: 0,
  reverse: 0,
  spark: 0,
  sparkLevel: 0.5,
  sparkDelay: 0,
  burst: SLOT,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restPulses: 0,
  restSpan: 8,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  climb: 0,
  albums: [],
  cast: PLAYER_CAST_MAX,
};

/**
 * One deck voice on a fake graph, already jumping. The voice is built here rather than shared,
 * for the reason src/audio/deckDouble.ts gives: `createDeckVoice` has one production owner and
 * only a test file may stand in for it.
 */
function jumping(patch: Partial<PlayerSpec> = {}, span = SPAN) {
  const { context, gainLogs, now, sources } = fakeContext();
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
  voice.setLoop(0, span);
  voice.setPlayer({ ...PLAYER, ...patch });
  voice.play();
  return { gainLogs, now, sources, voice };
}

/** One step's seams, in the order they were scheduled: [starts at, when, over]. */
const seamsOf = (host: ReturnType<typeof jumping>, step: number): Call[] =>
  (host.gainLogs[PRE_PLAYER_GAINS + step] ?? []).filter(
    ([method]) => method === "setValueCurveAtTime",
  );

describe("a burst at the transport", () => {
  /**
   * The whole claim of 0119, in one case: a burst is a duration and the loop it is jumping around
   * is not allowed to scale it. The same spec and the same seed over two loops of very different
   * lengths sound windows of exactly the same length — before this, the longer loop stretched
   * every burst by the ratio between them, which made the out point a transpose control.
   */
  it("sounds one burst the same length on any loop", () => {
    const burst = SLOT * 0.5;
    const windows = [SPAN, SPAN * 4].map((span) =>
      jumping({ burst }, span).sources.map((source) => source.loopEnd - source.loopStart),
    );
    const [tight, wide] = windows;
    if (tight === undefined || wide === undefined) throw new Error("two loops, or no claim");
    expect(tight.length).toBeGreaterThan(4);
    for (const window of [...tight, ...wide]) expect(window).toBeCloseTo(burst, 9);
  });

  // The player's own clock, in the seconds the transport makes of it: a burst below one slot
  // loops only its own length, and the step is that length times its repeats (P67).
  it("sounds a burst shorter than the slot it started in", () => {
    const host = jumping({ burst: SLOT * 0.5 });
    expect(host.sources.length).toBeGreaterThan(4);
    for (const source of host.sources) {
      const offset = source.started[0]?.[1] ?? Number.NaN;
      // Still one of the loop's own sixteenths — the burst is how long it stays, not where.
      expect(offset / SLOT).toBeCloseTo(Math.round(offset / SLOT), 9);
      expect(source.loopEnd - source.loopStart).toBeCloseTo(SLOT / 2, 9);
    }
  });

  // The shortest burst a spec may ask for is now the seam floor itself rather than something
  // under it, because a burst is wall seconds and the knob's floor is the transport's own
  // (0119) — so the shortest window is reached rather than pinned to, on every loop rather than
  // only on loops long enough. With nothing resting, nothing gating and no clock held, every step
  // opens exactly where the one before it closed, so the only wait left between two jumps is a
  // tick of the session's clock (P75, 0089, 0097).
  it("plays the shortest burst at the seam floor, and leaves no gap at either end", () => {
    expect(PLAYER_BURST_MIN).toBe(PLAYER_MIN_SLOT_SECS);
    for (const burst of [PLAYER_BURST_MIN, SLOT]) {
      const host = jumping({ burst });
      expect(host.sources.length).toBeGreaterThan(4);
      const floored = burst === PLAYER_BURST_MIN;
      host.sources.forEach((source, step) => {
        expect(source.loopEnd - source.loopStart).toBeCloseTo(
          floored ? PLAYER_MIN_SLOT_SECS : SLOT,
          9,
        );
        const after = host.sources[step + 1];
        if (after === undefined) return;
        // Its stop is a seam past its end, and the next one opens on that end: a true crossfade
        // rather than a butt splice, and nothing at all between the two.
        const gap = (after.started[0]?.[0] ?? 0) - ((source.stopped[0] ?? 0) - PLAYER_FADE_SECS);
        expect(gap).toBeCloseTo(0, 9);
      });
    }
  });

  /**
   * The floor is a seam budget, and this is the budget being spent right down to it: a loop whose
   * slots are exactly `PLAYER_MIN_SLOT_SECS`, a burst under that so every window is pinned there,
   * and a gate hard enough to put three curves inside one repeat. Web Audio throws
   * `NotSupportedError` on two `setValueCurveAtTime` calls that overlap by a float's last bit, so
   * a fade halved one notch too far is a pattern that stops mid-performance rather than one that
   * sounds wrong — which is why the floor moves with the fade and not on its own (P82, 0089).
   */
  it("lays every seam of a step at the floor down before the next one begins", () => {
    // The floor said in the units it was argued in: two hundred bursts a second, with ~48 samples
    // at 48kHz to get from one step to the next. Both are the fade's, five of which it is.
    expect(1 / PLAYER_MIN_SLOT_SECS).toBeCloseTo(200, 9);
    expect(Math.round(PLAYER_FADE_SECS * 48_000)).toBe(48);
    const floorSpan = PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS;
    // Ungated, cut, and asked for a cut too hard to leave room — the three ways `seam` draws.
    for (const gate of [0, 0.7, 1]) {
      const host = jumping({ burst: PLAYER_BURST_MIN, gate }, floorSpan);
      expect(host.sources.length).toBeGreaterThan(4);
      host.sources.forEach((source, step) => {
        expect(source.loopEnd - source.loopStart).toBeCloseTo(PLAYER_MIN_SLOT_SECS, 12);
        const seams = seamsOf(host, step);
        expect(seams.length).toBeGreaterThan(0);
        seams.forEach((curve, index) => {
          expect(curve[3]).toBe(PLAYER_FADE_SECS);
          const next = seams[index + 1];
          if (next === undefined) return;
          expect(next[2] ?? Number.NaN).toBeGreaterThanOrEqual((curve[2] ?? 0) + PLAYER_FADE_SECS);
        });
        // And the source outlasts its own last curve: a fade running past a stop is the same
        // discontinuity the fade exists to remove.
        expect(source.stopped[0] ?? Number.NaN).toBeGreaterThanOrEqual(
          (seams.at(-1)?.[2] ?? 0) + PLAYER_FADE_SECS,
        );
      });
    }
  });

  // The cap on one arming has to cover the re-arm cadence or a pattern at the floor starves
  // between two ticks — every step is at least the floor long, so the cap times the floor is how
  // far ahead one arming can reach. The same claim a lane makes in src/audio/deck.test.ts.
  it("arms far enough ahead at the floor to reach the next re-arm", () => {
    expect(PLAYER_MIN_SLOT_SECS * MAX_PLAYER_STEPS).toBeGreaterThan(AUTOMATION_REARM_SECS);
  });
});
