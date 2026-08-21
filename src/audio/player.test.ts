/**
 * @role The player's transport contract: where a pass may read, that it reads the sequence its
 *   seed draws and no other, that every seam is a fade, and that a pattern is armed ahead of the
 *   clock the way a lane is (0089).
 */
import { describe, expect, it } from "vitest";

import { playerSequence, PLAYER_SLOTS, type PlayerSpec } from "@/lib/player";
import { createDeckVoice } from "./deck";
import { destination, fakeContext, type Call } from "./deckDouble";
import {
  AUTOMATION_REARM_SECS,
  LOOKAHEAD_SECS,
  PLAYER_FADE_SECS,
  PLAYER_MIN_SLOT_SECS,
} from "./transport";

/** One deck voice on a fake graph, plus the port the worklet would report over. */
export function deck() {
  const { context, gainCalls, gainLogs, now, sources } = fakeContext();
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
  const PLAYER: PlayerSpec = { seed: 7, variation: "wander", distance: 4, repeats: 4, gate: 0 };
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
    const out = { position: 0, meter: 0, automation: new Map<string, number>() };
    host.voice.peek(out);
    expect(out.position).toBeCloseTo((third.started[0]?.[1] ?? 0) + SLOT / 2, 6);
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

  // A step is a window measured in the seconds the rate makes of a slot, so the ones a speed
  // change has not reached yet are laid down again at the new one rather than played at it.
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
    // Half the wall length for the same slot: the shortest step at 2x is one slot of 0.1s.
    const shortest = Math.min(
      ...fresh.map((source) => (source.stopped[0] ?? 0) - (source.started[0]?.[0] ?? 0)),
    );
    expect(shortest).toBeLessThan(SLOT * 0.75);
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
