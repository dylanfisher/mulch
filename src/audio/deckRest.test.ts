/**
 * @role The rest on one deck's transport: a stop scheduled on the source and reported at its own
 *   instant, a release laid ahead from where the hold left the playhead, and every hand on the
 *   transport taking the rest with it (0371, 0372).
 * @instead The transport's other roads — play, pause, stop, seek, loop moves → ./deck.test.ts,
 *   whose harness this drives.
 */
import { describe, expect, it } from "vitest";

import type { PlayPlan } from "@/lib/timeline";
import { deck } from "./deckHarness";
import { emptyDeckPeek } from "./deckPeek";
import { LOOKAHEAD_SECS } from "./transport";

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

  it("lays the release ahead from the held position, moved by the jump and kept in the loop", () => {
    const held = deck();
    held.voice.setLoop(1, 3);
    play(held);
    held.now(1);
    held.voice.holdAt(2.5);
    // The loop began at 1 and has run 2.45s of a 2s cycle: held at 1.45.
    const at = 1 + ((2.5 - LOOKAHEAD_SECS) % 2);

    expect(held.voice.releaseAt(4, 0.3)).toBe(true);
    expect(held.sources).toHaveLength(2);
    expect(held.sources[1]?.started[0]?.[0]).toBe(4);
    expect(held.sources[1]?.started[0]?.[1]).toBeCloseTo(at + 0.3, 9);
    // Posted under its own id and not as a resume, so the reporter queues it behind the rest.
    const release = lastPlan(held.plans);
    expect(release.startTime).toBe(4);
    expect(release.resume).toBe(false);
    expect(release.until).toBeUndefined();
    // A second release is refused: the rest already has its end.
    expect(held.voice.releaseAt(5, 0)).toBe(false);

    held.now(2.6);
    held.report({ t: "held", id: release.id - 1, at: 2.5 });
    expect(held.stops[0]?.held).toBeCloseTo(at, 9);
    // The release is the transport now: playing again, from the plan the release laid.
    expect(held.voice.planned()).toBe(true);
    held.now(4.1);
    held.report({ ...release, t: "started", at: 4, offset: at + 0.3 });
    expect(held.stops).toHaveLength(1);

    // And a jump past the loop's end lands at the top of it, the way a seek does (0041).
    const far = deck();
    far.voice.setLoop(1, 3);
    play(far);
    far.now(1);
    far.voice.holdAt(2);
    far.voice.releaseAt(3, 5);
    expect(far.sources[1]?.started[0]?.[1]).toBe(1);
  });

  it("is taken with a hand's play, which restarts from where the hold left the playhead", () => {
    const held = deck();
    play(held);
    held.now(1);
    held.voice.holdAt(3);
    held.voice.releaseAt(5, 0);
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
    expect(paused.voice.releaseAt(5, 0)).toBe(false);
    expect(paused.sources).toHaveLength(1);
    expect(positionOf(paused)).toBeCloseTo(3 - LOOKAHEAD_SECS, 9);

    const stopped = deck();
    play(stopped);
    stopped.now(1);
    stopped.voice.holdAt(3);
    stopped.voice.releaseAt(5, 0);
    stopped.voice.stop();
    expect(stopped.sources[1]?.stopped).toEqual([undefined]);
    expect(stopped.voice.releaseAt(6, 0)).toBe(false);
    expect(positionOf(stopped)).toBe(0);
  });

  it("refuses a hold with nothing playing, over a rest, and a release with none standing", () => {
    const idle = deck();
    expect(idle.voice.holdAt(1)).toBe(false);
    expect(idle.voice.releaseAt(2, 0)).toBe(false);
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
    expect(held.voice.releaseAt(5, 0)).toBe(true);
    // The next rest stops the release, at its instant, and tells the reporter on that plan.
    expect(held.voice.holdAt(7)).toBe(true);
    expect(held.sources[1]?.stopped).toEqual([7]);
    const release = lastPlan(held.plans);
    expect(release).toMatchObject({ startTime: 5, until: 7, resume: false });
    // And the release after that resumes from where the second rest held the playhead: two
    // seconds of a two-second loop past where the first release began.
    expect(held.voice.releaseAt(9, 0)).toBe(true);
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
