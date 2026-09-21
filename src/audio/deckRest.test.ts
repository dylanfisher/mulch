/**
 * @role The rest on one deck's transport: a stop scheduled on the source and reported at its own
 *   instant, a release laid ahead from where the hold left the playhead, and every hand on the
 *   transport taking the rest with it (0371, 0372).
 * @instead The transport's other roads — play, pause, stop, seek, loop moves → ./deck.test.ts,
 *   whose harness this drives.
 */
import { describe, expect, it } from "vitest";

import { PLAYER_FADE_SECS, type PlayerSpec } from "@/lib/player";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { playerSequence } from "@/lib/playerWalk";
import type { PlayPlan } from "@/lib/timeline";
import { deck } from "./deckHarness";
import { emptyDeckPeek } from "./deckPeek";
import { AUTOMATION_REARM_SECS, LOOKAHEAD_SECS } from "./transport";

type Harness = ReturnType<typeof deck>;
type Posted = PlayPlan & { id: number; until?: number; resume: boolean };

/** The last plan the transport posted — never the null a halt posts. */
const lastPlan = (plans: readonly unknown[]): Posted => {
  let last: unknown = null;
  for (const plan of plans) if (plan !== null) last = plan;
  if (last === null) throw new Error("no plan was posted");
  // oxlint-disable-next-line no-unsafe-type-assertion -- the transport posts exactly this shape
  return last as Posted;
};

/** Play, confirmed by the reporter, so there is a sounding pass to rest. */
const play = ({ voice, report, plans }: Harness): void => {
  voice.play();
  report({ ...lastPlan(plans), t: "started", at: LOOKAHEAD_SECS, offset: 0 });
};

const positionOf = ({ voice }: Harness): number => {
  const out = emptyDeckPeek();
  voice.peek(out);
  return out.position;
};

// One transport's whole rest contract, each case a few lines. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("a rest on the transport", () => {
  it("schedules the stop on the source and holds the playhead where the reporter says", () => {
    const held = deck();
    play(held);
    held.now(1);

    expect(held.voice.holdAt(3)).toBe(true);
    // The stop is the source's own, at the instant asked; the plan is re-posted carrying it.
    expect(held.sources[0]?.stopped).toEqual([3]);
    expect(lastPlan(held.plans).until).toBe(3);
    expect(lastPlan(held.plans).resume).toBe(true);
    // Nothing is held until the audio thread says the stop happened.
    expect(held.stops).toEqual([]);

    held.now(3.01);
    held.report({ t: "held", id: lastPlan(held.plans).id, at: 3 });
    expect(held.stops).toEqual([{ reason: "paused", held: 3 - LOOKAHEAD_SECS }]);
    expect(positionOf(held)).toBeCloseTo(3 - LOOKAHEAD_SECS, 9);
    expect(held.voice.planned()).toBe(false);
  });

  it("lays the release ahead from the held position, kept in the loop", () => {
    const held = deck();
    held.voice.setLoop(1, 3);
    play(held);
    held.now(1);
    held.voice.holdAt(2.5);
    // The loop began at 1 and has run 2.45s of a 2s cycle: held at 1.45.
    const at = 1 + ((2.5 - LOOKAHEAD_SECS) % 2);

    expect(held.voice.releaseAt(4)).toBe(true);
    expect(held.sources).toHaveLength(2);
    expect(held.sources[1]?.started[0]?.[0]).toBe(4);
    expect(held.sources[1]?.started[0]?.[1]).toBeCloseTo(at, 9);
    // Posted under its own id and not as a resume, so the reporter queues it behind the rest.
    const release = lastPlan(held.plans);
    expect(release.startTime).toBe(4);
    expect(release.resume).toBe(false);
    expect(release.until).toBeUndefined();
    // A second release is refused: the rest already has its end.
    expect(held.voice.releaseAt(5)).toBe(false);

    held.now(2.6);
    held.report({ t: "held", id: release.id - 1, at: 2.5 });
    expect(held.stops[0]?.held).toBeCloseTo(at, 9);
    // The release is the transport now: playing again, from the plan the release laid.
    expect(held.voice.planned()).toBe(true);
    held.now(4.1);
    held.report({ ...release, t: "started", at: 4, offset: at });
    expect(held.stops).toHaveLength(1);
  });

  it("is taken with a hand's play, which restarts from where the hold left the playhead", () => {
    const held = deck();
    play(held);
    held.now(1);
    held.voice.holdAt(3);
    held.voice.releaseAt(5);
    held.now(3.5);
    held.report({ t: "held", id: lastPlan(held.plans).id - 1, at: 3 });

    held.voice.play();
    // The release laid ahead is stopped before its instant and let go of.
    expect(held.sources[1]?.stopped).toEqual([undefined]);
    expect(held.sources).toHaveLength(3);
    expect(held.sources[2]?.started[0]?.[1]).toBeCloseTo(3 - LOOKAHEAD_SECS, 9);
    // A rest already held is a pause the hand resumed: no second stop is reported for it.
    expect(held.stops).toHaveLength(1);
  });

  it("is never let go of after a hand's pause, and a hand's stop rewinds it", () => {
    const paused = deck();
    play(paused);
    paused.now(1);
    paused.voice.holdAt(3);
    paused.now(3.5);
    paused.report({ t: "held", id: lastPlan(paused.plans).id, at: 3 });
    paused.voice.pause();
    expect(paused.voice.releaseAt(5)).toBe(false);
    expect(paused.sources).toHaveLength(1);
    expect(positionOf(paused)).toBeCloseTo(3 - LOOKAHEAD_SECS, 9);

    const stopped = deck();
    play(stopped);
    stopped.now(1);
    stopped.voice.holdAt(3);
    stopped.voice.releaseAt(5);
    stopped.voice.stop();
    expect(stopped.sources[1]?.stopped).toEqual([undefined]);
    expect(stopped.voice.releaseAt(6)).toBe(false);
    expect(positionOf(stopped)).toBe(0);
  });

  it("refuses a hold with nothing playing, over a rest, and a release with none standing", () => {
    const idle = deck();
    expect(idle.voice.holdAt(1)).toBe(false);
    expect(idle.voice.releaseAt(2)).toBe(false);
    play(idle);
    idle.now(1);
    expect(idle.voice.holdAt(3)).toBe(true);
    expect(idle.voice.holdAt(4)).toBe(false);
    expect(idle.sources[0]?.stopped).toEqual([3]);
  });

  it("lays a second rest from the same tick on the release before it", () => {
    const held = deck();
    held.voice.setLoop(1, 3);
    play(held);
    held.now(1);
    expect(held.voice.holdAt(3)).toBe(true);
    // Over a rest with no release yet, a second hold is nothing.
    expect(held.voice.holdAt(5)).toBe(false);
    expect(held.voice.releaseAt(5)).toBe(true);
    // The next rest stops the release, at its instant, and tells the reporter on that plan.
    expect(held.voice.holdAt(7)).toBe(true);
    expect(held.sources[1]?.stopped).toEqual([7]);
    const release = lastPlan(held.plans);
    expect(release).toMatchObject({ startTime: 5, until: 7, resume: false });
    // And the release after that resumes from where the second rest held the playhead: two
    // seconds of a two-second loop past where the first release began.
    expect(held.voice.releaseAt(9)).toBe(true);
    const from = 1 + ((3 - LOOKAHEAD_SECS) % 2);
    expect(held.sources[2]?.started[0]?.[0]).toBe(9);
    expect(held.sources[2]?.started[0]?.[1]).toBeCloseTo(from, 9);

    // Each held in turn, on its own plan; a hand's play then takes every rest and release with it.
    held.now(3.5);
    held.report({ t: "held", id: release.id - 1, at: 3 });
    expect(held.stops).toHaveLength(1);
    expect(held.voice.planned()).toBe(true);
    held.now(5.1);
    held.report({ ...release, t: "started", at: 5, offset: from });
    held.now(7.5);
    held.report({ t: "held", id: release.id, at: 7 });
    expect(held.stops).toHaveLength(2);
    expect(held.stops[1]?.held).toBeCloseTo(from, 9);
    held.voice.play();
    expect(held.sources[2]?.stopped).toEqual([undefined]);
    expect(held.sources).toHaveLength(4);
  });

  it("restarts in place when asked to let go of a hold still laid ahead", () => {
    const held = deck();
    play(held);
    held.now(1);
    held.voice.holdAt(3);
    held.voice.releaseAt(5);

    held.voice.releaseNow();
    // The old source goes at once — its scheduled stop cannot be taken back — and so does the
    // release laid ahead; a fresh pass starts at the lookahead from where the deck was reading.
    expect(held.sources[0]?.stopped).toEqual([3, undefined]);
    expect(held.sources[1]?.stopped).toEqual([undefined]);
    expect(held.sources[2]?.started[0]?.[0]).toBeCloseTo(1 + LOOKAHEAD_SECS, 9);
    expect(held.sources[2]?.started[0]?.[1]).toBeCloseTo(1, 9);
    expect(lastPlan(held.plans).until).toBeUndefined();
    // And nothing to let go of is nothing done.
    const before = held.sources.length;
    held.voice.releaseNow();
    expect(held.sources).toHaveLength(before);
  });

  it("lets a standing rest go in place at the lookahead when asked to now", () => {
    const held = deck();
    play(held);
    held.now(1);
    held.voice.holdAt(3);
    held.now(3.5);
    held.report({ t: "held", id: lastPlan(held.plans).id, at: 3 });

    held.voice.releaseNow();
    expect(held.sources[1]?.started[0]?.[0]).toBeCloseTo(3.5 + LOOKAHEAD_SECS, 9);
    expect(held.sources[1]?.started[0]?.[1]).toBeCloseTo(3 - LOOKAHEAD_SECS, 9);
    expect(held.voice.planned()).toBe(true);
  });
});

/** A loop the grid divides into 0.2s slots, the way ./player.test.ts cuts one. Spelled again
 *  rather than imported from there: importing a test module runs its cases a second time, which
 *  is the reason ./deckHarness.ts is a module of its own and not an export of ./deck.test.ts. */
const SPAN = 3.2;
const SLOT = SPAN / PLAYER_SLOTS;
/** The spec the cases below jump under: the module's own, on that loop, under one seed. */
const PATTERN: PlayerSpec = { ...PLAYER_DEFAULTS, seed: 7 };

/** One deck already walking a pattern, the way the rack finds it when a lull asks for a rest. */
const mulching = (): Harness => {
  const host = deck();
  host.voice.setLoop(0, SPAN);
  host.voice.setPlayer(PATTERN);
  host.voice.play();
  return host;
};

type Step = Harness["sources"][number];
/**
 * The window one step of a jumping pass actually sounds in, or null where it sounds not at all:
 * every armed step carries the stop its own window ends at, a bare stop after it is a step dropped
 * ahead of the clock, and a second stop at an instant is a rest taking it there.
 */
const sounds = (step: Step): [from: number, until: number] | null => {
  const until = step.stopped.at(-1);
  return until === undefined ? null : [step.started[0]?.[0] ?? Number.NaN, until];
};

/** The slots every step that sounds was started at, in order — the walk, as the graph played it. */
const walked = (host: Harness): string[] =>
  host.sources
    .filter((step) => sounds(step) !== null)
    .map((step) => ((step.started[0]?.[1] ?? Number.NaN) / SLOT).toFixed(6));

/** The slots the seed itself draws, `n` of them. */
const drawn = (n: number): string[] =>
  playerSequence(PATTERN, n).map((step) => step.slot.toFixed(6));

// A lull asks the transport for a rest and the mulcher drives that same transport: a jumping pass
// takes the ask as a gap in its own pattern rather than refusing it (0371, 0383).
// One contract, a case per promise. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a rest on a yard the mulcher is playing", () => {
  it("goes silent across the rest and lays nothing inside it", () => {
    const host = mulching();
    const armed = host.sources.length;
    expect(armed).toBeGreaterThan(1);
    host.now(0.5);

    expect(host.voice.holdAt(3)).toBe(true);
    // Nothing the pass had laid is still sounding a seam past the instant: the steps ahead of it
    // are dropped and the one it falls inside is stopped there.
    for (const step of host.sources) {
      expect(sounds(step)?.[1] ?? 0).toBeLessThanOrEqual(3 + PLAYER_FADE_SECS + 1e-9);
    }
    // And no tick inside the rest lays another one, however many of them run.
    host.now(0.5 + AUTOMATION_REARM_SECS);
    host.voice.armAutomation();
    host.now(0.5 + 2 * AUTOMATION_REARM_SECS);
    host.voice.armAutomation();
    expect(host.sources).toHaveLength(armed);
  });

  it("carries the walk on from where the rest found it, rather than drawing it again", () => {
    const host = mulching();
    const armed = host.sources.length;
    host.now(0.5);
    host.voice.holdAt(3);
    const standing = walked(host).length;

    expect(host.voice.releaseAt(6)).toBe(true);
    const laid = host.sources.slice(armed);
    expect(laid.length).toBeGreaterThan(0);
    // The steps the rest dropped are the ones it has to lay again: more than were left standing.
    expect(standing).toBeGreaterThan(0);
    expect(standing).toBeLessThan(armed);
    // Nothing sounds inside the rest: the first step laid begins at the release and not before it.
    for (const step of laid) expect(sounds(step)?.[0] ?? 0).toBeGreaterThanOrEqual(6);
    // And the pattern the graph played across the rest is the one the seed draws, unbroken — a
    // rest is a gap in the walk and never a second performance of its top.
    const slots = walked(host);
    expect(slots.length).toBeGreaterThan(standing);
    expect(slots).toEqual(drawn(slots.length));
  });

  it("parks the read head where it stopped the pattern, for as long as the rest stands", () => {
    const host = mulching();
    host.now(0.5);
    host.voice.holdAt(3);

    host.now(3.5);
    const head = positionOf(host);
    host.now(4.5);
    expect(positionOf(host)).toBe(head);
  });

  it("refuses a second rest, and a hand's play takes the one standing with it", () => {
    const host = mulching();
    host.now(0.5);
    expect(host.voice.holdAt(3)).toBe(true);
    expect(host.voice.holdAt(4)).toBe(false);
    const armed = host.sources.length;

    host.voice.play();
    // A fresh pass, drawn again from the top of the pattern and resting under nothing.
    expect(host.sources.length).toBeGreaterThan(armed);
    expect(host.voice.releaseAt(5)).toBe(false);
  });

  it("lets a standing rest go in place at the lookahead when asked to now", () => {
    const host = mulching();
    host.now(0.5);
    host.voice.holdAt(3);
    host.now(3.5);
    const armed = host.sources.length;

    host.voice.releaseNow();
    const laid = host.sources.slice(armed);
    expect(laid.length).toBeGreaterThan(0);
    expect(laid[0]?.started[0]?.[0]).toBeCloseTo(3.5 + LOOKAHEAD_SECS, 9);
  });

  // A rest is laid seconds ahead of the clock, so there is a long window in which one stands and
  // has not begun. A move inside that window re-arms the pass from the lookahead, and what it
  // drops has to be laid down again: the rest belongs where the lull drew it.
  it("lays the steps before a pending rest again when the pattern is re-armed inside one", () => {
    const host = mulching();
    host.now(0.5);
    expect(host.voice.holdAt(6)).toBe(true);
    const armed = host.sources.length;

    host.voice.setPlayer({ ...PATTERN, distance: 2 });
    const laid = host.sources.slice(armed);
    expect(laid.length).toBeGreaterThan(0);
    // Laid up to the rest and never past it, so the yard sounds right up to the instant asked for.
    for (const step of laid) {
      expect(sounds(step)?.[1] ?? 0).toBeLessThanOrEqual(6 + PLAYER_FADE_SECS + 1e-9);
    }
    expect(Math.max(...laid.map((step) => sounds(step)?.[1] ?? 0))).toBeCloseTo(6, 9);
  });

  // A redraw asks for a clear, and the fresh run's own edges are drawn in the same breath as it.
  // The ordinary pass survives that because its release restarts and the restart counts the rack
  // again; a pattern's release tears nothing down, so it has to count the rack itself (0371).
  it("counts the rack again when a redraw lets a pattern rest go", () => {
    const host = mulching();
    // At every chance, checked every five seconds and rested for five, the way 0371's cases do.
    host.voice.addEffect("l1", "lull", {
      "lull.chance": 1,
      "lull.rest": 5,
      "lull.every": 5,
      "lull.grid": 0,
      "lull.seed": 1,
    });
    host.now(0.5);
    host.voice.armAutomation();
    // The lull's first rest, five seconds into its run and taken by the pattern.
    expect(host.sources.map((step) => step.stopped.at(-1))).toContain(5);
    const armed = host.sources.length;

    // The seed rebuilds, so the run is redrawn and the rest it laid is nobody's.
    host.voice.setParam("l1", "lull.seed", 9);
    host.voice.endGesture();
    const laid = host.sources.slice(armed);
    // The walk carries on from where the rest held it...
    expect(laid[0]?.started[0]?.[0]).toBe(5);
    // ...and the fresh run's first rest is laid in the same breath as the clear, counted from the
    // lookahead the release stood at, rather than spent on a gather nobody applied.
    expect(laid.map((step) => step.stopped.at(-1))).toContain(0.5 + LOOKAHEAD_SECS + 5);
  });
});
