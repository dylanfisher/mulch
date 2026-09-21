/**
 * @role The ground under a yard the mulcher is not on: that a plain looping deck moves the window
 *   it reads when its period is up, that it waits the whole period first, that the loop the hand
 *   set comes back when the switch does, and that a yard on the session's ground crawls no ground
 *   of its own (0395).
 * @instead The transport's other roads — play, pause, seek, loop moves → ./deck.test.ts, whose
 *   harness this drives. The walk one move takes → src/lib/playerCrawl.test.ts.
 */
import { describe, expect, it } from "vitest";

import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { bedGround, bedMove } from "@/lib/playerBed";
import { crawlBedAt } from "@/lib/playerCrawl";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import type { PlayerSpec } from "@/lib/player";
import type { PlayPlan } from "@/lib/timeline";
import { deck } from "./deckHarness";
import { LOOKAHEAD_SECS } from "./transport";

type Harness = ReturnType<typeof deck>;
type Posted = PlayPlan & { id: number };

/** The loop the hand sets on the harness's four-second source, and the span every window keeps. */
const LOOP = { in: 0, out: 1 };

/** A yard holding a whole pattern with the switch standing off over it, and a ground that wanders
 *  a nudge either way on every round of the loop. */
const GROUND: PlayerSpec = { ...PLAYER_DEFAULTS, seed: 7, bypassed: true, bedEvery: 1 };

const lastPlan = (plans: readonly unknown[]): Posted => {
  let last: unknown = null;
  for (const plan of plans) if (plan !== null) last = plan;
  if (last === null) throw new Error("no plan was posted");
  // oxlint-disable-next-line no-unsafe-type-assertion -- the transport posts exactly this shape
  return last as Posted;
};

/** Where the window the transport is reading begins: the loop points it last wrote onto a source,
 *  which a move takes either by writing them again or by laying a new source at them (0091). */
const windowIn = ({ sources }: Harness): number => sources.at(-1)?.loopStart ?? -1;

/** A loaded, looping, sounding deck with the mulcher off over `spec`. */
const crawling = (spec: PlayerSpec | null): Harness => {
  const held = deck();
  held.voice.setLoop(LOOP.in, LOOP.out);
  held.voice.setCrawl(spec);
  held.voice.play();
  held.report({ ...lastPlan(held.plans), t: "started", at: LOOKAHEAD_SECS, offset: 0 });
  return held;
};

/** One round of the loop, gone by — the tick a yard with no pattern counts its period in. */
const round = (held: Harness, cycle: number): void => {
  held.report({ t: "looped", id: lastPlan(held.plans).id, at: cycle, cycle });
};

/** The offset the crawl's `tick`th move lands on, drawn the way the transport draws it — off a
 *  key of its own, which is the same walk because the walk is the seed's (`playerCrawl.test.ts`). */
const bedAt = (spec: PlayerSpec, tick: number): number =>
  crawlBedAt({}, { seed: spec.seed, home: spec.bed * PLAYER_SLOTS, lean: bedMove(spec) }, tick);

/** And where that offset begins on the harness's four-second source, from a given ground. */
const windowFrom = (homeIn: number, bed: number): number =>
  bedGround(homeIn, LOOP.out - LOOP.in, 4, bed, null).in;

// One case per thing the crawl answers to — a period gone by, a ground that never moves, the
// session's ground, the switch, a forget, a silent deck, a hand moving the loop. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the ground under a yard the mulcher is not on", () => {
  it("moves the window it reads after one period, and keeps the loop's own span", () => {
    const held = crawling(GROUND);
    expect(windowIn(held)).toBe(LOOP.in);
    round(held, 1);
    expect(windowIn(held)).toBe(windowFrom(LOOP.in, bedAt(GROUND, 1)));
    expect(windowIn(held)).not.toBe(LOOP.in);
    const source = held.sources.at(-1);
    expect((source?.loopEnd ?? 0) - (source?.loopStart ?? 0)).toBeCloseTo(LOOP.out - LOOP.in, 10);
  });

  it("waits the whole period out before it moves", () => {
    const every = { ...GROUND, bedEvery: 2 };
    const held = crawling(every);
    round(held, 1);
    expect(windowIn(held)).toBe(LOOP.in);
    round(held, 2);
    expect(windowIn(held)).toBe(windowFrom(LOOP.in, bedAt(every, 1)));
  });

  it("moves nothing for a yard whose ground never moves, or whose pattern is walking", () => {
    const still = crawling({ ...GROUND, bedEvery: 0 });
    round(still, 1);
    expect(windowIn(still)).toBe(LOOP.in);
    // What a yard with its pattern on is handed: `playerCrawling` answers null (src/lib/player.ts).
    const walking = crawling(null);
    round(walking, 1);
    expect(windowIn(walking)).toBe(LOOP.in);
  });

  it("crawls no ground of its own while the yard stands on the session's", () => {
    const held = crawling({ ...GROUND, bedTogether: true });
    round(held, 1);
    expect(windowIn(held)).toBe(LOOP.in);
  });

  it("gives the loop the hand set back when the switch comes on", () => {
    const held = crawling(GROUND);
    round(held, 1);
    expect(windowIn(held)).not.toBe(LOOP.in);
    held.voice.setCrawl(null);
    expect(windowIn(held)).toBe(LOOP.in);
  });

  /**
   * A load takes the pattern with the loop (src/audio/deck.ts), so it takes the ground under it
   * too: the words belong to a spec the session no longer holds, and a window still moving under a
   * yard that draws no pattern anywhere is the hidden mulcher this step refused.
   */
  it("forgets the ground with the source it was walking", () => {
    const held = crawling(GROUND);
    round(held, 1);
    // oxlint-disable-next-line no-unsafe-type-assertion -- the fake never reads a buffer's samples
    held.voice.load({ duration: 4 } as AudioBuffer);
    held.voice.setLoop(LOOP.in, LOOP.out);
    held.voice.play();
    held.report({ ...lastPlan(held.plans), t: "started", at: LOOKAHEAD_SECS, offset: 0 });
    round(held, 1);
    expect(windowIn(held)).toBe(LOOP.in);
  });

  /** A move is the two roads a hand's loop move takes and never a third: a halted deck is left
   *  where its next play begins, and a dial turned on it starts nothing. */
  it("starts nothing when the ground moves under a deck that is not sounding", () => {
    const held = crawling(GROUND);
    round(held, 1);
    held.voice.stop();
    const laid = held.sources.length;
    held.voice.setCrawl(null);
    expect(held.sources.length).toBe(laid);
    expect(held.voice.planned()).toBe(false);
  });

  it("walks on from the loop a hand moves it to, and not from where it had wandered", () => {
    const held = crawling(GROUND);
    round(held, 1);
    held.voice.setLoop(2, 3);
    round(held, 2);
    // The first move of a crawl replanted on the hand's new ground, counted from that ground.
    expect(windowIn(held)).toBe(windowFrom(2, bedAt(GROUND, 1)));
  });
});
