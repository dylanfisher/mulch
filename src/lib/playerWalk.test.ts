/**
 * @role What a song does to the walk: each part walked under the character it names, a chorus the
 *   same one every time it comes round, and the whole of it still a pure function of the seed and
 *   the step count — which is the one promise a pattern may not cost (0089, 0153).
 * @instead What a step is, and every number one is drawn from → src/lib/player.test.ts, which is
 *   the walk's own suite and reads a pattern that holds no song.
 */
import { describe, expect, it } from "vitest";

import type { PlayerSpec } from "./player.ts";
import { PLAYER_CHARACTER_REGIONS, PLAYER_DEFAULTS } from "./playerCharacter.ts";
import type { SongPart } from "./playerSong.ts";
import { playerSequence, playerWalk } from "./playerWalk.ts";

const spec = (song: readonly SongPart[], seed = 11): PlayerSpec => ({
  seed,
  ...PLAYER_DEFAULTS,
  song,
});

/** Every jump the first part of a two-part song was walked under — the chorus's, below. */
const first = (steps: readonly { repeats: number }[]) =>
  steps.filter((_, at) => at % 2 === 0).map((step) => step.repeats);

const part = (character: SongPart["character"], length: number, chorus = false): SongPart => ({
  character,
  amount: 1,
  length,
  chorus,
});

/** The two counts a part is read by below, from the regions themselves rather than restated: a
 *  case that spelled the numbers out would pass a region edited under it (principle 1). */
const STUTTER = PLAYER_CHARACTER_REGIONS.stutter.knobs.repeats ?? [0, 0];
const BREATHE = PLAYER_CHARACTER_REGIONS.breathe.knobs.repeats ?? [0, 0];

// Five cases, each with the paragraph saying what about a song it pins down: the length is how
// many promises a song makes rather than how much this block decides, which is the waiver every
// long suite in the repo carries. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a walk that holds a song", () => {
  /**
   * The whole of what a song does: it never touches a step, it changes what the walk is walking.
   * Read off the count each landing is held at, which is the one field a part sets and nothing
   * redraws inside it — the two characters' spans do not overlap, so which part a step belongs to
   * is legible from the step alone.
   */
  it("walks each part under the character its part names", () => {
    const steps = playerSequence(spec([part("stutter", 3), part("breathe", 3)]), 12);
    const counts = steps.map((step) => step.repeats);
    for (const at of [0, 1, 2, 6, 7, 8]) {
      expect(counts[at]).toBeGreaterThanOrEqual(STUTTER[0]);
      expect(counts[at]).toBeLessThanOrEqual(STUTTER[1]);
    }
    for (const at of [3, 4, 5, 9, 10, 11]) {
      expect(counts[at]).toBeGreaterThanOrEqual(BREATHE[0]);
      expect(counts[at]).toBeLessThanOrEqual(BREATHE[1]);
    }
  });

  // A part is drawn once and then walked: every jump inside one is held at the count its own draw
  // landed on, rather than at a number redrawn per step.
  it("holds one part's numbers for every jump of it", () => {
    const steps = playerSequence(spec([part("stutter", 4)]), 4);
    expect(new Set(steps.map((step) => step.repeats)).size).toBe(1);
  });

  /**
   * A song of one part is the shortest thing a song can be and the first thing a hand asks for: a
   * new one of that character every N jumps. The count is what the part's length says, so the
   * numbers change on the boundary and nowhere else.
   */
  it("draws another of the one part's character every time its length is up", () => {
    const every = 4;
    const steps = playerSequence(spec([part("stutter", every)]), every * 3);
    const counts = steps.map((step) => step.repeats);
    // One number inside a part, and a new draw at each boundary — three parts, three draws.
    expect(new Set(counts.slice(0, every)).size).toBe(1);
    const drawn = [0, every, every * 2].map((at) => counts[at]);
    expect(new Set(drawn).size).toBeGreaterThan(1);
  });

  /**
   * The shape the field was grown for: a chorus, something else, and the chorus itself coming
   * back — the same one, where the part beside it is a new draw every round. Both are read off
   * the same field, so the pair is one assertion about what `chorus` means and not two.
   */
  it("comes back to the same chorus, and draws every other part again", () => {
    const rounds = 6;
    const kept = playerSequence(spec([part("stutter", 1, true), part("breathe", 1)]), rounds * 2);
    const loose = playerSequence(spec([part("stutter", 1), part("breathe", 1)]), rounds * 2);
    expect(new Set(first(kept)).size).toBe(1);
    expect(new Set(first(loose)).size).toBeGreaterThan(1);
  });

  /**
   * `plain` names no knob and so draws no number: a song of one is the card's own dials, walked.
   * It is the identity at this tier as well as at the character menu's, which is what makes the
   * song something a pattern can hold without the pattern changing (0152).
   */
  it("walks a song of plain exactly as it walks no song at all", () => {
    expect(playerSequence(spec([part("plain", 4)]), 16)).toEqual(playerSequence(spec([]), 16));
  });

  /**
   * The one promise a song may not cost. A knob moved mid-pattern re-derives the tail by walking
   * the same seed forward over the steps already laid down, so a song whose draws did not sit in
   * that one stream would hand the tail a different arrangement than the one being heard
   * (0089, 0096, P67).
   */
  it("re-derives the same tail from a step count, song and all", () => {
    const held = spec([part("stutter", 3, true), part("scatter", 2), part("breathe", 4)]);
    const whole = playerSequence(held, 24);
    const walk = playerWalk(held, 9);
    expect(Array.from({ length: 15 }, () => walk())).toEqual(whole.slice(9));
  });
});
