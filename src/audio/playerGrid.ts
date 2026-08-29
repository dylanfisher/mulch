/**
 * @role The grid a jumping pass is laid against: what a deck's loop divides into, whether it
 *   divides at all, and where one slot of it begins once the ground the pattern has walked to is
 *   folded onto the source (0183, 0185).
 * @instead The pass those slots are armed as sound, and everything that has a clock →
 *   src/audio/player.ts, which holds one grid for the length of a pass and reads it here. What a
 *   ground *is*, and the fold itself → src/lib/playerBed.ts. The pattern that says which slot →
 *   src/lib/playerWalk.ts. Split off when the transport reached the hard 800-line cap, where no
 *   waiver reaches (0045, 0190).
 */
import { PLAYER_MIN_SLOT_SECS } from "@/lib/player";
import { bedBounds, bedWrap } from "@/lib/playerBed";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import type { Loop } from "@/lib/timeline";

/** A range of buffer seconds — the deck's loop, or the one slot of it a step is repeating. */
export type Span = Loop;

/**
 * The grid a pattern jumps around: where it starts and how long one slot is, both in buffer
 * seconds, and how far through the source the loop may be moved, counted in those slots — the one
 * thing here the buffer answers for rather than the loop (0183, 0185).
 */
export type Grid = { in: number; slot: number; from: number; to: number };

/** The loop's own start, for the plan a jumping pass posts. Never called with a null loop. */
export const loopIn = (loop: Span | null): number => loop?.in ?? 0;

/** The whole grid's length: the loop, in the buffer seconds the reporter counts a cycle of. */
export const gridSpan = (grid: Grid): number => grid.slot * PLAYER_SLOTS;

/**
 * Where one slot of that grid begins, in buffer seconds. Its own name at the third caller — the
 * source that reads a slot and the two cursors that report one (principle 3) — and since 0183 the
 * one place a ground becomes a position: the walk carries an unbounded offset, this folds it onto
 * the ground the buffer actually holds and moves the slot by that many sixteenths of the loop
 * (0185). Every read of a *sounding* jumping deck comes through here, so the loop and the playhead
 * cannot disagree about which ground the yard is on. The picture has its own route to the same
 * answer, on bounds it folds per frame rather than once per pass (`bedGround`, src/lib/playerBed.ts).
 */
export const slotStart = (grid: Grid, slot: number, bed: number): number =>
  bedStart(grid, bed) + slot * grid.slot;

/**
 * The buffer second the bed the pattern is standing on begins at — the loop's own start, moved by
 * the walk's offset in the loop's own sixteenths. A slot of source and not a whole loop-length
 * since the crawl, so the bed a burst is clamped inside is still one loop long but need not begin
 * on a boundary of them (`PLAYER_BED_DISTANCE_MAX`, src/lib/playerBed.ts).
 */
export const bedStart = (grid: Grid, bed: number): number =>
  grid.in + bedWrap(bed, grid.from, grid.to) * grid.slot;

/**
 * Whether a loop of `secs` real seconds divides into slots long enough to carry a seam — the whole
 * of what makes a yard *holding* a pattern a yard that is actually jumping. Exported because the
 * drift asks the same question: a module this plays straight past draws no row
 * (docs/decisions/0159-a-song-is-the-pictures-one-stepped-row.md), and the rule said twice is a
 * picture that can disagree with the sound (principle 1).
 */
export const playerJumps = (secs: number): boolean => secs / PLAYER_SLOTS >= PLAYER_MIN_SLOT_SECS;

/**
 * The grid this loop divides into, or null when its slots are too short to carry a seam.
 *
 * `duration` is the buffer's, and is here for the ground alone: how many of the loop's own
 * sixteenths of source lie either side of it is a fact about the file, so it is answered once per
 * pass at the one place holding both (0183, 0185). A loop with no room for a single sixteenth
 * either side answers one ground and never leaves it — this module before the ground could move.
 * A loop with no room for a whole *bed* still crawls, which is the crawl's whole point.
 */
export function gridOf(loop: Span | null, rate: number, duration: number): Grid | null {
  if (loop === null || !playerJumps((loop.out - loop.in) / rate)) return null;
  const span = loop.out - loop.in;
  return { in: loop.in, slot: span / PLAYER_SLOTS, ...bedBounds(loop.in, span, duration) };
}
