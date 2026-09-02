/**
 * @role The arm's transport contract: a queued part lands on the next part boundary and not before
 *   it, stays armed on the read until it is heard, survives a re-arm before it lands, comes back
 *   out of the queue when let go, and is refused where the pass cannot land it. A file beside
 *   src/audio/player.test.ts because that one is at the cap, on its fixture.
 */
import { describe, expect, it } from "vitest";

import { partVoice, PLAYER_MIN_SLOT_SECS, type PlayerSpec } from "@/lib/player";
import { oneSong } from "@/lib/playerSongs";
import { playerSequence } from "@/lib/playerWalk";
import { emptyDeckPeek } from "./deckPeek";
import type { deck } from "./player.test";
import { CUED, jumping, PLAYER, SLOT } from "./player.test";

/**
 * Three parts of four jumps each, the third drawn to distinctive slots so a jump into it reads
 * off the sources: at this fixture's burst and count a jump is 0.8s, so the pass lays steps up to
 * its eight-second horizon — well past the first boundary, which is what makes the arm a re-arm.
 */
const SONG = [
  { ...CUED, id: "one", name: "One", voice: partVoice(PLAYER) },
  { ...CUED, id: "two", name: "Two", voice: partVoice(PLAYER) },
  { ...CUED, id: "three", name: "Three", voice: { ...partVoice(PLAYER), distance: 1, bias: 1 } },
];
const SPEC: PlayerSpec = { ...PLAYER, songs: oneSong(SONG) };
/** Where part three's first jump falls in the walk: after the four of one and the four of two. */
const ONSET = 8;
/** When the source at `index` was started on the clock. */
const beginsAt = (host: ReturnType<typeof deck>, index: number): number =>
  host.sources[index]?.started[0]?.[0] ?? Number.NaN;

/** The slot each source from `from` on was started at, to nine places. */
const starts = (host: ReturnType<typeof deck>, from: number): string[] =>
  host.sources.slice(from).map((s) => (s.started[0]?.[1] ?? Number.NaN).toFixed(9));
/** The slots the walk itself draws, from `from`, `n` of them. */
const reads = (spec: PlayerSpec, n: number, from = 0): string[] =>
  playerSequence(spec, from + n)
    .slice(from)
    .map((step) => (step.slot * SLOT).toFixed(9));
/** How many steps of the pass were left standing by a re-arm at `armed` sources. */
const standing = (host: ReturnType<typeof deck>, armed: number): number =>
  armed -
  host.sources.slice(0, armed).filter((source) => source.stopped.includes(undefined)).length;

// One case per promise the arm makes, read in order: the length is the count of them. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("arming a part", () => {
  /**
   * The press is the re-arm road: the steps past the lookahead are dropped and laid again, and
   * what replaces them is the rest of the part standing, then the armed part from its own first
   * jump — the boundary crossed into the part a hand asked for, and not a moment sooner.
   */
  it("lands on the next part boundary and not before it", () => {
    const host = jumping({ songs: SPEC.songs });
    const armed = host.sources.length;
    host.now(0.5);
    expect(host.voice.armPlayer("three")).toBe(true);
    const laid = standing(host, armed);
    expect(laid).toBeGreaterThan(0);
    expect(laid).toBeLessThan(4);
    const fresh = starts(host, armed);
    expect(fresh.length).toBeGreaterThan(4);
    expect(fresh).toEqual([
      ...reads(SPEC, 4 - laid, laid),
      ...reads(SPEC, fresh.length - (4 - laid), ONSET),
    ]);
    // And the read says so: armed until the boundary, and then standing in the part with the
    // ordinal the walk itself gives that jump.
    const out = emptyDeckPeek();
    host.voice.peek(out);
    expect(out.player.armed).toBe("three");
    expect(out.player.step?.part).toBe("one");
    const boundary = beginsAt(host, armed + 4 - laid);
    host.now(boundary - PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.armed).toBe("three");
    host.now(boundary + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.armed).toBeNull();
    expect(out.player.step?.part).toBe("three");
    expect(out.player.at).toBe(ONSET);
  });

  /** Letting go takes the drawn jump back out and lays the run in its own order again. */
  it("comes back out of the queue when let go, and the run keeps its own order", () => {
    const host = jumping({ songs: SPEC.songs });
    host.now(0.5);
    expect(host.voice.armPlayer("three")).toBe(true);
    const armed = host.sources.length;
    host.now(1);
    expect(host.voice.armPlayer(null)).toBe(true);
    const laid = standing(host, armed);
    const fresh = starts(host, armed);
    expect(fresh.length).toBeGreaterThan(4);
    expect(fresh).toEqual(reads(SPEC, fresh.length, laid));
    const out = emptyDeckPeek();
    host.voice.peek(out);
    expect(out.player.armed).toBeNull();
    host.now(beginsAt(host, armed + 4 - laid) + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.step?.part).toBe("two");
    expect(out.player.at).toBe(4);
  });

  /**
   * A knob moved between the press and the boundary drops the drawn jump with the tail; the jump
   * is queued again and lands on the same boundary, and the read never stops saying it is armed.
   */
  it("survives a re-arm before it lands", () => {
    const host = jumping({ songs: SPEC.songs });
    host.now(0.5);
    expect(host.voice.armPlayer("three")).toBe(true);
    const out = emptyDeckPeek();
    host.now(2.5);
    const armed = host.sources.length;
    const moved: PlayerSpec = { ...SPEC, gate: 0.3 };
    host.voice.setPlayer(moved);
    host.voice.peek(out);
    expect(out.player.armed).toBe("three");
    // The re-laid tail is the rest of the part standing and then the jump, exactly as the press
    // laid it: the boundary is the first re-laid source that reads part three's slots.
    const laid = standing(host, armed);
    const boundary = beginsAt(host, armed + 4 - laid);
    expect(starts(host, armed)).toEqual([
      ...reads(moved, 4 - laid, laid),
      ...reads(moved, host.sources.length - armed - (4 - laid), ONSET),
    ]);
    host.now(boundary + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.armed).toBeNull();
    expect(out.player.step?.part).toBe("three");
    expect(out.player.at).toBe(ONSET);
    // And a re-arm past the boundary — the jump heard, the tail after it moved — carries on in
    // the armed part rather than winding back to the boundary.
    const heard = host.sources.length;
    host.voice.setPlayer({ ...moved, gate: 0.5 });
    host.now(beginsAt(host, heard) + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.step?.part).toBe("three");
    expect(out.player.armed).toBeNull();
    expect(out.player.at).toBe(ONSET + 1);
  });

  /** The refusals it makes for itself, answered rather than thrown. */
  it("refuses a part the song does not stand in, an arm under a solo, and no pass at all", () => {
    const host = jumping({ songs: SPEC.songs });
    host.now(0.5);
    expect(host.voice.armPlayer("nine")).toBe(false);
    expect(host.voice.soloPlayer("two")).toBe(true);
    expect(host.voice.armPlayer("one")).toBe(false);
    expect(host.voice.soloPlayer(null)).toBe(true);
    // A pattern that no longer holds the part lets the queued jump go.
    expect(host.voice.armPlayer("three")).toBe(true);
    const out = emptyDeckPeek();
    host.voice.peek(out);
    expect(out.player.armed).toBe("three");
    host.voice.setPlayer({ ...SPEC, songs: oneSong(SONG.slice(0, 2)) });
    host.voice.peek(out);
    expect(out.player.armed).toBeNull();
    host.voice.stop();
    expect(host.voice.armPlayer("one")).toBe(false);
  });
});
