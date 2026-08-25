/**
 * @role The player's transport contract: where a pass may read, that it reads the sequence its
 *   seed draws and no other, that every seam is a fade, and that a pattern is armed ahead of the
 *   clock the way a lane is (0089).
 */
// One file over the 400-line cap, and what is over it is cases rather than code: the transport
// makes one claim per case and they are read in order. Splitting it would put half the player's
// contract in a file whose name says it is the other half, and both halves stand on the one deck
// fixture below. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import {
  PLAYER_BURST_MIN,
  PLAYER_FADE_SECS,
  PLAYER_MIN_SLOT_SECS,
  PLAYER_RATES,
  PLAYER_SLOTS,
  SYNC_MAX_SECS,
  type PlayerSpec,
} from "@/lib/player";
import { playerSequence } from "@/lib/playerWalk";
import { createDeckVoice } from "./deck";
import { destination, fakeContext, type Call } from "./deckDouble";
import { emptyDeckPeek } from "./deckPeek";
import { AUTOMATION_REARM_SECS, LOOKAHEAD_SECS, MAX_PLAYER_STEPS } from "./transport";

/**
 * One deck voice on a fake graph, plus the port the worklet would report over. The graph is a
 * parameter so two voices can be built on one of them, which is the only way to ask what two
 * yards on one clock do — they share a context and its `currentTime` or they share nothing.
 */
export function deck(graph = fakeContext()) {
  const { context, gainCalls, gainLogs, now, sources } = graph;
  let listener: ((event: MessageEvent<unknown>) => void) | null = null;
  /** Every plan the transport posted, in order — `null` for a stop (src/audio/deck.ts). */
  const plans: unknown[] = [];
  const reporter = {
    port: {
      addEventListener: (_type: string, next: (event: MessageEvent<unknown>) => void) => {
        listener = next;
      },
      removeEventListener: () => {},
      start: () => {},
      postMessage: (message: unknown) => plans.push(message),
      close: () => {},
    },
    disconnect: () => {},
  };
  const report = (message: unknown): void => {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the handler reads only `data`
    listener?.({ data: message } as MessageEvent<unknown>);
  };
  /** Every stop the transport reported, with what it left held (0038). */
  const stops: { reason: string; held: number | null }[] = [];
  const voice = createDeckVoice(
    context,
    destination(),
    // oxlint-disable-next-line no-unsafe-type-assertion -- only the port and disconnect are used
    reporter as unknown as AudioWorkletNode,
    {
      started: () => {},
      looped: () => {},
      stopped: (reason, held) => {
        stops.push({ reason, held });
      },
      xrun: () => {},
    },
  );
  // oxlint-disable-next-line no-unsafe-type-assertion -- the fake never reads a buffer's samples
  voice.load({ duration: 4 } as AudioBuffer);
  return { gainCalls, gainLogs, now, voice, report, plans, sources, stops };
}

/** Where each of these steps began, on the clock. Nine places is past any rounding a fade adds. */
const startsOf = (steps: ReturnType<typeof fakeContext>["sources"]): number[] =>
  steps.map((source) => source.started[0]?.[0] ?? Number.NaN);
const exact = (at: number): string => at.toFixed(9);

/** When and where one of a jumping deck's steps actually started, off the source it built. */
const startOf = (host: ReturnType<typeof deck>, step: number): [number, number] =>
  host.sources[step]?.started[0] ?? [Number.NaN, Number.NaN];

// The player's whole transport contract: where it may read, that it reads the sequence its seed
// draws and no other, that every seam is a fade, and that a pattern is armed ahead of the clock
// the way a lane is (0089).
// oxlint-disable-next-line max-lines-per-function
describe("deck player", () => {
  /** A loop the grid divides into 0.2s slots — well clear of the shortest one that can seam. */
  const SPAN = 3.2;
  const SLOT = SPAN / PLAYER_SLOTS;
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
    // A burst is wall seconds now (0119). One slot of this fixture's loop, which is what every
    // case below was written around back when the number said "slots" and meant this length.
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
    song: [],
  };
  /** The chain's own two gains — the deck fader and the rack's input — before any step's. */
  const PRE_PLAYER_GAINS = 2;

  const jumping = (patch: Partial<PlayerSpec> = {}, span = SPAN) => {
    const host = deck();
    host.voice.setLoop(0, span);
    host.voice.setPlayer({ ...PLAYER, ...patch });
    host.voice.play();
    return host;
  };

  /** One step's seams, in the order they were scheduled: [starts at, when, over]. */
  const seamsOf = (host: ReturnType<typeof deck>, step: number): Call[] =>
    (host.gainLogs[PRE_PLAYER_GAINS + step] ?? []).filter(
      ([method]) => method === "setValueCurveAtTime",
    );

  it("reads only from the loop's own grid, one slot at a time", () => {
    const host = jumping();
    expect(host.sources.length).toBeGreaterThan(4);
    // One fader per step and not one more: a deck that grew a gain somewhere else would be
    // reading the wrong log below rather than failing.
    expect(host.gainLogs).toHaveLength(PRE_PLAYER_GAINS + host.sources.length);
    for (const source of host.sources) {
      const offset = source.started[0]?.[1] ?? Number.NaN;
      expect(offset / SLOT).toBeCloseTo(Math.round(offset / SLOT), 9);
      expect(source.loop).toBe(true);
      expect(source.loopStart).toBeCloseTo(offset, 9);
      expect(source.loopEnd).toBeCloseTo(offset + SLOT, 9);
    }
  });

  // The transport plays the walk and never a pattern of its own, and a second play of the same
  // session is the same performance — which is what the seed is for (0068, 0089).
  it("plays the sequence its seed draws, and draws it again on the next play", () => {
    const host = jumping();
    const first = host.sources.length;
    const offsets = host.sources.map((source) => source.started[0]?.[1] ?? Number.NaN);
    const drawn = playerSequence(PLAYER, first).map((step) => step.slot * SLOT);
    expect(offsets.map((at) => at.toFixed(9))).toEqual(drawn.map((at) => at.toFixed(9)));
    host.voice.stop();
    host.voice.play();
    const again = host.sources.slice(first).map((source) => source.started[0]?.[1] ?? Number.NaN);
    expect(again.map((at) => at.toFixed(9))).toEqual(offsets.map((at) => at.toFixed(9)));
  });

  // The proof the step named: there is no path on which a source begins or ends bare.
  it("fades every seam, so no jump is ever a click", () => {
    const host = jumping();
    expect(host.sources.length).toBeGreaterThan(4);
    host.sources.forEach((_source, step) => {
      const seams = seamsOf(host, step);
      expect(seams.length).toBeGreaterThan(0);
      // Opens at its own first sample, on the rising half of the equal-power law.
      expect(seams[0]?.[1]).toBe(0);
      expect(seams[0]?.[2]).toBeCloseTo(startOf(host, step)[0], 9);
      // And closes on the falling half, over the same seam length, before it is stopped.
      expect(seams.at(-1)?.[1]).toBe(1);
      for (const seam of seams) expect(seam[3]).toBe(PLAYER_FADE_SECS);
    });
  });

  // An unstuttered step closes over the next one's opening rather than before it: the two are one
  // equal-power crossfade, and the squares of the pair sum to one across the seam.
  it("crosses an ungated step into the next one over the same window", () => {
    const host = jumping({ gate: 0 });
    host.sources.forEach((_source, step) => {
      const seams = seamsOf(host, step);
      expect(seams).toHaveLength(2);
      const next = host.sources[step + 1];
      if (next === undefined) return;
      expect(seams[1]?.[2]).toBeCloseTo(startOf(host, step + 1)[0], 9);
    });
  });

  it("cuts every repeat at a hard gate, and leaves them whole at none", () => {
    const open = jumping({ gate: 0 });
    const hard = jumping({ gate: 1 });
    const counts = (host: ReturnType<typeof deck>): number[] =>
      host.sources.map((_source, step) => seamsOf(host, step).length);
    expect(counts(open).every((seams) => seams === 2)).toBe(true);
    expect(Math.max(...counts(hard))).toBeGreaterThan(2);
    // Every cut is still a pair — a repeat that closes is a repeat that opened again.
    expect(counts(hard).every((seams) => seams % 2 === 0)).toBe(true);
  });

  // One plan, posted once: every step is a whole number of slots, so the grid the reporter counts
  // boundaries against never moves however far the pattern jumps (0089).
  // The plan a jumping pass posts is the loop's own grid and not a step's: a boundary every
  // sixteenth would change what `deck.looped` counts and flood the ring with it (0089).
  it("posts one plan for the whole pattern, on the loop's grid", () => {
    const host = jumping();
    expect(host.plans).toHaveLength(1);
    expect(host.plans[0]).toMatchObject({ offset: 0, period: SPAN, phase: 0, resume: false });
  });

  it("paints the slot it is reading rather than the one the plan was posted with", () => {
    const host = jumping();
    const third = host.sources[2];
    if (third === undefined) throw new Error("the pattern armed fewer than three steps");
    host.now((third.started[0]?.[0] ?? 0) + SLOT / 2);
    const out = emptyDeckPeek();
    host.voice.peek(out);
    expect(out.position).toBeCloseTo((third.started[0]?.[1] ?? 0) + SLOT / 2, 6);
  });

  /**
   * What a song is doing, read the way a position is: off the step the clock is actually inside
   * rather than off the walk, which is armed seconds ahead of it. It is the whole of what the
   * card's header, its lit row and its dials paint from, and nothing about it is durable or ever
   * reaches React (0157, plan §2).
   */
  it("reports the part it is standing in, and the voice under it, across a boundary", () => {
    const song = [
      { id: "one", character: "stutter", amount: 1, length: 1, chorus: false },
      { id: "two", character: "breathe", amount: 1, length: 1, chorus: false },
    ] as const;
    const host = jumping({ song });
    const laid = playerSequence({ ...PLAYER, song }, 2);
    const out = emptyDeckPeek();

    // Inside the first step, which is the first part's one jump.
    host.now(startOf(host, 0)[0] + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.part).toBe("one");
    expect(out.player.voice).toEqual(laid[0]?.voice);

    // And past the boundary, where the part standing is the next one and its numbers are its own.
    host.now(startOf(host, 1)[0] + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.part).toBe("two");
    expect(out.player.voice).toEqual(laid[1]?.voice);
    expect(out.player.voice).not.toEqual(laid[0]?.voice);

    // A deck with no pass running stands in nothing at all, rather than holding the last part it
    // was in: this read is the transport's and it stops with it.
    host.voice.stop();
    host.voice.peek(out);
    expect(out.player).toEqual({ part: null, voice: null, song: null });
  });

  // The same reason the lanes are armed on demand: nothing on the main thread runs during a
  // render, so a jump not built before the render reaches it never sounds (0071).
  it("arms the next stretch of jumps the same offline as live", () => {
    const host = jumping();
    const armed = host.sources.length;
    host.now(AUTOMATION_REARM_SECS);
    host.voice.armAutomation();
    expect(host.sources.length).toBeGreaterThan(armed);
  });

  it("stops the steps it had scheduled ahead of the clock", () => {
    const host = jumping();
    const armed = host.sources.length;
    host.voice.stop();
    for (const source of host.sources) expect(source.stopped).toContain(undefined);
    // Nothing new was built on the way out, and the deck reads as stopped.
    expect(host.sources).toHaveLength(armed);
    expect(host.voice.planned()).toBe(false);
  });

  it("does not jump a loop whose slots are too short to carry a seam", () => {
    const host = deck();
    // Just under the floor: the same loop one slot longer would jump.
    host.voice.setLoop(0, PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS * 0.9);
    host.voice.setPlayer(PLAYER);
    host.voice.play();
    expect(host.sources).toHaveLength(1);
    expect(host.gainLogs).toHaveLength(PRE_PLAYER_GAINS);
  });

  it("restarts on a loop move, so a loop that grew a grid hands the pass over", () => {
    const host = deck();
    // Too short to jump: it plays straight, which is an ordinary pass with a player held.
    host.voice.setLoop(0, PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS * 0.9);
    host.voice.setPlayer(PLAYER);
    host.voice.play();
    expect(host.sources).toHaveLength(1);

    // Widened under the playing deck, with the playhead still well inside it — the move a deck
    // with no player keeps playing through. This one restarts, because only a restart offers the
    // pass to the player, and the loop now has a grid to jump around (0089).
    host.voice.setLoop(0, SPAN);
    expect(host.sources.length).toBeGreaterThan(1);
    expect(host.gainLogs.length).toBeGreaterThan(PRE_PLAYER_GAINS);
  });

  it("plays its loop straight with no player, and builds no fader for it", () => {
    const host = deck();
    host.voice.setLoop(0, SPAN);
    host.voice.play();
    expect(host.sources).toHaveLength(1);
    expect(host.sources[0]?.loopEnd).toBe(SPAN);
    expect(host.gainLogs).toHaveLength(PRE_PLAYER_GAINS);
  });

  // Two automation curves that overlap on one AudioParam by so much as a float's last bit are a
  // NotSupportedError, and the arithmetic that pins a short repeat's gate is exactly where two of
  // them would touch. 0.51s is a loop whose slots make that pinning bite.
  it("leaves a whole fade between every pair of seams it schedules", () => {
    const host = jumping({ gate: 1 }, 0.51);
    expect(host.sources.length).toBeGreaterThan(8);
    let gated = 0;
    host.sources.forEach((_source, step) => {
      const seams = seamsOf(host, step);
      if (seams.length > 2) gated++;
      for (let index = 1; index < seams.length; index++) {
        const previous = seams[index - 1] ?? [];
        const ends = (previous[2] ?? 0) + (previous[3] ?? 0);
        expect((seams[index]?.[2] ?? 0) - ends).toBeGreaterThanOrEqual(PLAYER_FADE_SECS * 0.99);
      }
    });
    // And the hard gate did cut some of them, so the loop above had pairs to measure.
    expect(gated).toBeGreaterThan(0);
  });

  // A tick that arrives late — a stalled main thread, a background tab Chrome throttles to one
  // interval a minute — must not lay every remaining step down in the past, which would be a deck
  // that reads as playing and is silent for good.
  it("arms from the clock rather than from a cursor a late tick left behind", () => {
    const host = jumping();
    const armed = host.sources.length;
    host.now(60);
    host.voice.armAutomation();
    const fresh = host.sources.slice(armed);
    expect(fresh.length).toBeGreaterThan(0);
    for (const source of fresh) expect(source.started[0]?.[0] ?? 0).toBeGreaterThanOrEqual(60);
  });

  // Offline nothing delivers an `ended` event until the render is over, so the prune is the only
  // thing that reaches a finished step — and a step dropped from the list without being let go of
  // is still wired into the chain for the whole render (0086).
  it("lets go of a step that has finished rather than dropping it still wired in", () => {
    const host = jumping();
    const first = host.sources[0];
    if (first === undefined) throw new Error("the pattern armed no steps");
    expect(first.disconnected).toBe(0);
    host.now((first.stopped[0] ?? 0) + 1);
    host.voice.armAutomation();
    expect(first.disconnected).toBeGreaterThan(0);
  });

  // The steps a speed change has not reached yet are laid down again at the new rate rather than
  // played at it. What that re-arm now moves is how much buffer a window gets through, not how
  // long the window is: a burst is wall seconds and no longer divides by the rate (0119).
  it("lays the steps ahead of a speed change down again at the new rate", () => {
    const host = jumping();
    const armed = host.sources.length;
    host.now(0.2);
    host.voice.setParam(null, "deck.speed", 2);
    const ahead = host.sources
      .slice(0, armed)
      .filter((source) => (source.started[0]?.[0] ?? 0) > 0.2 + LOOKAHEAD_SECS);
    expect(ahead.length).toBeGreaterThan(0);
    for (const source of ahead) expect(source.stopped).toContain(undefined);
    const fresh = host.sources.slice(armed);
    expect(fresh.length).toBeGreaterThan(0);
    // Twice the buffer for the same window: the burst is unchanged in seconds and the rate is
    // what decides how far through the loop those seconds read. Clamped at the loop's own end for
    // a step that started late in the grid, which is a jump staying inside it (0089).
    for (const source of fresh) {
      const from = source.started[0]?.[1] ?? Number.NaN;
      expect(source.loopEnd - source.loopStart).toBeCloseTo(Math.min(SLOT * 2, SPAN - from), 9);
    }
    // And the window itself did not move. Before 0119 the shortest step at 2x was half a slot;
    // now the shortest is one whole burst however fast the deck is reading.
    const shortest = Math.min(
      ...fresh.map((source) => (source.stopped[0] ?? 0) - (source.started[0]?.[0] ?? 0)),
    );
    expect(shortest).toBeGreaterThanOrEqual(SLOT);
  });

  // The one other reader of the plan. It is a metronome for a jumping pass and never a position,
  // so a loop cleared under one has to ask the pattern where it had got to.
  it("carries a jumping deck's own position out of a cleared loop", () => {
    const host = jumping();
    const jumped = host.sources.find((source) => (source.started[0]?.[1] ?? 0) > SPAN / 2);
    if (jumped === undefined) throw new Error("the pattern never reached the far half of the loop");
    host.now((jumped.started[0]?.[0] ?? 0) + SLOT / 4);
    const before = host.sources.length;
    host.voice.setLoop(0, 0);
    const resumed = host.sources[before];
    expect(host.sources).toHaveLength(before + 1);
    // Exactly where the pattern will have reached when the replacement source starts: the slot it
    // is reading, plus the quarter-slot the clock has moved and the lookahead it will move again.
    const into = SLOT / 4 + LOOKAHEAD_SECS;
    expect(resumed?.started[0]?.[1] ?? 0).toBeCloseTo((jumped.started[0]?.[1] ?? 0) + into, 9);
  });

  /**
   * Switching the module off is a transport change and restarts the deck, but it is not a seek:
   * the replacement source picks the pattern's own position up rather than the top of the loop,
   * the way a loop move keeps the playhead that survives it (0091, P87). Without it, bypassing
   * the module threw the read head back to `loop.in` mid-performance.
   */
  it("keeps the read position when the module is switched off", () => {
    const host = jumping();
    const jumped = host.sources.find((source) => (source.started[0]?.[1] ?? 0) > SPAN / 2);
    if (jumped === undefined) throw new Error("the pattern never reached the far half of the loop");
    host.now((jumped.started[0]?.[0] ?? 0) + SLOT / 4);
    const before = host.sources.length;
    host.voice.setPlayer(null);
    const resumed = host.sources[before];
    expect(host.sources).toHaveLength(before + 1);
    // The same arithmetic the cleared loop above gets: the slot the pattern is reading, plus the
    // quarter-slot the clock has moved and the lookahead it will move before the source starts.
    const into = SLOT / 4 + LOOKAHEAD_SECS;
    expect(resumed?.started[0]?.[1] ?? 0).toBeCloseTo((jumped.started[0]?.[1] ?? 0) + into, 9);
  });

  /**
   * The other side of it, and the one place a switch *on* reaches the same road: a loop whose
   * slots are too short for a seam has no grid to jump around, so `begin` returns nothing and the
   * deck plays straight. That restart is not a seek either, so it keeps the position it was on —
   * a module turned on over a loop that cannot carry it must not move the read head (P87).
   */
  it("keeps the read position when a switch on finds no grid to jump around", () => {
    const host = deck();
    const span = PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS * 0.9;
    host.voice.setLoop(0, span);
    host.voice.play();
    host.now(span / 2);
    host.voice.setPlayer(PLAYER);
    const resumed = host.sources[1];
    // One ordinary pass replaced by another: no grid means no step sources at all.
    expect(host.sources).toHaveLength(2);
    // Where the deck will be reading when that source starts: the pass began one lookahead after
    // zero and the replacement starts one lookahead after now, so the two cancel and what is left
    // is the half-loop the clock has moved.
    expect(resumed?.started[0]?.[1] ?? 0).toBeCloseTo(span / 2, 9);
  });

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

  it("rests between two bursts, so a pattern breathes rather than runs on", () => {
    const host = jumping({ rest: 1 });
    expect(host.sources.length).toBeGreaterThan(4);
    let gaps = 0;
    host.sources.forEach((source, step) => {
      const after = host.sources[step + 1];
      if (after === undefined) return;
      gaps++;
      // A whole slot of silence between one step ending and the next one opening, less the seam
      // the first of them fades out over.
      const gap = (after.started[0]?.[0] ?? 0) - (source.stopped[0] ?? 0);
      expect(gap).toBeCloseTo(SLOT - PLAYER_FADE_SECS, 9);
    });
    expect(gaps).toBeGreaterThan(3);
  });

  it("draws a new read rate every hold jumps, and reads the step at it", () => {
    const host = jumping({ hold: 1, seed: 3 });
    const rates = host.sources.map((source) => source.playbackRate.value);
    for (const rate of rates) expect(PLAYER_RATES).toContain(rate);
    expect(rates.some((rate) => rate !== 1)).toBe(true);
    // And the window is not measured at that rate: a step reading twice as fast is exactly as
    // long as one reading at the deck's own, because a burst is wall seconds (0119). What the
    // rate buys is pitch and how far through the loop the window gets, never its length.
    const drawn = playerSequence({ ...PLAYER, hold: 1, seed: 3 }, rates.length);
    host.sources.forEach((source, step) => {
      const held = drawn[step];
      if (held === undefined) return;
      const wall = (source.stopped[0] ?? 0) - (source.started[0]?.[0] ?? 0) - PLAYER_FADE_SECS;
      expect(wall).toBeCloseTo(held.repeats * held.burst, 9);
    });
  });

  // The outcome P67 promoted the clause on: a person shaping a burst pattern has to hear what
  // they are shaping. A step is armed a whole horizon before it sounds, so a moved number that
  // waited for the next play could never be heard where it was turned.
  it("hears a moved number inside one loop rather than at the end of the horizon", () => {
    const host = jumping();
    const armed = host.sources.length;
    const at = 0.5;
    host.now(at);
    host.voice.setPlayer({ ...PLAYER, burst: SLOT * 0.5, rest: 0.5 });

    // A step is built with a scheduled stop, so a bare `stop()` in its log is a cancellation.
    const cancelled = host.sources
      .slice(0, armed)
      .filter((source) => source.stopped.includes(undefined));
    // Everything past the fade horizon went, and there was something there to go.
    expect(cancelled.length).toBeGreaterThan(2);
    for (const source of cancelled) {
      expect(source.started[0]?.[0] ?? 0).toBeGreaterThan(at + PLAYER_FADE_SECS);
    }
    // The step already sounding keeps the window and the seams it was built with: cutting it is
    // the click the module is faded to avoid.
    expect(host.sources[0]?.stopped).not.toContain(undefined);
    const fresh = host.sources.slice(armed);
    expect(fresh.length).toBeGreaterThan(0);
    // Heard well inside one turn of the loop rather than at the end of the arming horizon.
    expect(fresh[0]?.started[0]?.[0] ?? Number.NaN).toBeLessThan(at + SPAN);
  });

  // And what replaces them is the tail of the same walk under the new spec — a pure function of
  // the seed and how many steps have been laid down, never of a wall clock (P67, 0068).
  it("derives the tail of the pattern again rather than restarting it", () => {
    const host = jumping();
    const armed = host.sources.length;
    host.now(0.5);
    const moved: PlayerSpec = { ...PLAYER, distance: 1, bias: 1 };
    host.voice.setPlayer(moved);

    // Every step is built with a scheduled stop, so what marks a cancelled one is the bare
    // `stop()` the drop made — and what is left is how many steps the walk has laid down.
    const laid =
      armed -
      host.sources.slice(0, armed).filter((source) => source.stopped.includes(undefined)).length;
    const fresh = host.sources.slice(armed);
    expect(fresh.length).toBeGreaterThan(2);
    const drawn = playerSequence(moved, laid + fresh.length).slice(laid);
    expect(fresh.map((source) => (source.started[0]?.[1] ?? Number.NaN).toFixed(9))).toEqual(
      drawn.map((step) => (step.slot * SLOT).toFixed(9)),
    );
    // The tail, not the top: the pattern did not begin again at slot 0.
    expect(laid).toBeGreaterThan(0);
  });

  // A jump is a move inside the loop's grid (0089), and a burst longer than a slot reads on
  // through the slots after it — up to the loop's own end and never past it.
  it("keeps a burst longer than a slot inside the loop it is jumping around", () => {
    // Seed 3 is the one whose walk reaches the top of the grid, where a four-slot burst has
    // nowhere left to read: without a ceiling it would run on into the file past the loop.
    const host = jumping({ burst: SLOT * 4, repeats: 1, seed: 3 });
    expect(host.sources.length).toBeGreaterThan(2);
    let clamped = 0;
    let past = 0;
    for (const source of host.sources) {
      expect(source.loopEnd).toBeLessThanOrEqual(SPAN + 1e-9);
      expect(source.loopEnd).toBeGreaterThan(source.loopStart);
      if (source.loopEnd - source.loopStart > SLOT * 1.5) past++;
      if (source.loopEnd - source.loopStart < SLOT * 3.9) clamped++;
    }
    // It did read past its own slot where the loop had room, and was cut short where it did not.
    expect(past).toBeGreaterThan(0);
    expect(clamped).toBeGreaterThan(0);
  });

  // The playhead a jumping deck paints, and the offset a cleared loop resumes at, both come off
  // this: it wraps on the burst's own span, which is the slot's only at a burst of one (P67).
  it("reads the position out of the burst it is looping, not the slot it started in", () => {
    const host = jumping({ burst: SLOT * 0.5 });
    const step = host.sources.find(
      (source) => (source.stopped[0] ?? 0) - (source.started[0]?.[0] ?? 0) > SLOT * 1.4,
    );
    if (step === undefined) throw new Error("the pattern armed no step of more than two bursts");
    const from = step.started[0]?.[1] ?? 0;
    // Three quarters of a slot in is one and a half bursts: half a burst into the second of them.
    host.now((step.started[0]?.[0] ?? 0) + SLOT * 0.75);
    const out = emptyDeckPeek();
    host.voice.peek(out);
    expect(out.position).toBeCloseTo(from + SLOT * 0.25, 6);
  });

  // The steps a move may cancel are exactly the ones `arm` can put back where they were. Dropping
  // one that starts inside the lookahead defers its replacement instead of replacing it, and a
  // drag doing that repeatedly walks the pattern away from the clock and silences the deck.
  it("cancels no step it could not replace at the same instant", () => {
    const host = jumping();
    const second = host.sources[1];
    if (second === undefined) throw new Error("the pattern armed fewer than two steps");
    const begins = second.started[0]?.[0] ?? 0;
    host.now(begins - 0.02);
    host.voice.setPlayer({ ...PLAYER, gate: 0.5 });
    expect(second.stopped).not.toContain(undefined);
  });

  /**
   * The step the whole shared clock exists for: two yards under one of them begin their jumps on
   * the same instants while each sounds its own burst, and neither pattern is a function of the
   * other's — each deck walks exactly the sequence its own seed draws (0097).
   *
   * The second yard is started well after the first, on a tick of nothing: the clock is counted
   * from the context's own zero, so where the two happened to be pressed cannot move it.
   */
  it("begins every jump on one shared clock, and keeps each yard's own burst", () => {
    const graph = fakeContext();
    /** Three slots — longer than either yard's window, so both of them reach every tick. */
    const SYNC = 3 * SLOT;
    const bursts = [SLOT, SLOT * 0.5];
    // One repeat, no rest and no vary: a window is the burst itself, so what is read below is the
    // clock rather than a drawn length that happened to land on it.
    const hosts = bursts.map((burst) => {
      const host = deck(graph);
      host.voice.setLoop(0, SPAN);
      host.voice.setPlayer({ ...PLAYER, repeats: 1, burst });
      host.voice.setSync(SYNC);
      return host;
    });
    hosts[0]?.voice.play();
    const between = graph.sources.length;
    // A time that is no tick of the clock at all, so a grid anchored on this press would miss.
    graph.now(SYNC / 3);
    hosts[1]?.voice.play();
    const stepsOf = (index: number) =>
      index === 0 ? graph.sources.slice(0, between) : graph.sources.slice(between);
    const jumps = [0, 1].map((index) => startsOf(stepsOf(index)).slice(1));
    const [early, late] = jumps;
    if (early === undefined || late === undefined) throw new Error("two yards, or no claim");
    expect(Math.min(early.length, late.length)).toBeGreaterThan(3);
    // Every jump of both yards is a whole number of periods from the context's own zero.
    for (const at of [...early, ...late]) expect(at / SYNC).toBeCloseTo(Math.round(at / SYNC), 9);
    // And they are the same instants: the yard pressed late lands on the ticks the yard pressed
    // early is already landing on, rather than on a grid of its own.
    const shared = early.filter((at) => at >= (late[0] ?? 0) - 1e-9).slice(0, late.length);
    expect(shared.map((at) => exact(at))).toEqual(late.map((at) => exact(at)));
    for (const [index, burst] of bursts.entries()) {
      const steps = stepsOf(index);
      // Landing together and sounding nothing alike: each yard reads the burst its own spec asks
      // for, which is the thing the clock may not touch.
      for (const source of steps) {
        expect(source.loopEnd - source.loopStart).toBeCloseTo(burst, 9);
      }
      // Nor is either pattern a function of the other's, or of the clock's: the slots are exactly
      // the ones this yard's own seed draws (0097).
      const drawn = playerSequence({ ...PLAYER, repeats: 1, burst }, steps.length);
      expect(steps.map((source) => exact(source.started[0]?.[1] ?? 0))).toEqual(
        drawn.map((step) => exact(step.slot * SLOT)),
      );
    }
  });

  /**
   * A moved clock is heard where it is turned, which a clock turned *down* or off is the test of:
   * the steps still standing were armed to wait for the old clock's tick, and a tail that kept
   * waiting for it would be a yard silent for as long as the old period was long (0097, 0096).
   */
  it("lays the tail down on the clock held now, not the one the steps were armed under", () => {
    const host = jumping({ repeats: 1 });
    // The longest clock the module accepts, against a window of one slot: a step waits most of a
    // period for the next, so the gap the old tick would leave is unmissable.
    host.voice.setSync(SYNC_MAX_SECS);
    const armed = host.sources.length;
    const tick = startsOf(host.sources).at(-1) ?? Number.NaN;
    expect(tick).toBeCloseTo(SYNC_MAX_SECS, 6);
    // The clock's own step is the one sounding now, so what survives the re-arm below is a step
    // that was armed waiting for a tick of a clock nobody holds any more.
    host.now(tick);
    host.voice.setSync(null);
    const replaced = startsOf(host.sources.slice(armed));
    expect(replaced.length).toBeGreaterThan(0);
    // It butts up against the step still sounding, rather than at the tick that clock was
    // aiming for — a whole period later, which is a yard reading as playing and silent.
    expect(replaced[0] ?? Number.NaN).toBeLessThan(tick + SLOT + LOOKAHEAD_SECS + PLAYER_FADE_SECS);
  });

  it("goes with the loop when a new source is loaded", () => {
    const host = jumping();
    // oxlint-disable-next-line no-unsafe-type-assertion -- the fake never reads a buffer's samples
    host.voice.load({ duration: 4 } as AudioBuffer);
    host.voice.setLoop(0, SPAN);
    const before = host.sources.length;
    host.voice.play();
    // One ordinary source, not a pattern: the deck no longer holds one.
    expect(host.sources).toHaveLength(before + 1);
    expect(host.sources[before]?.loopEnd).toBe(SPAN);
  });
});
