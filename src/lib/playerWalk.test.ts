/**
 * @role What a song does to the walk: each part walked under the character it names, a chorus the
 *   same one every time it comes round, and the whole of it still a pure function of the seed and
 *   the step count — which is the one promise a pattern may not cost (0089, 0153). And the same
 *   again for a song the walk draws for itself rather than being handed (0158). And what one jump
 *   is: how far it may go, which way it leans, when it takes the whole distance and when it comes
 *   home instead (0162).
 * @instead What a step is, and every number one is drawn from → src/lib/player.test.ts, which is
 *   the walk's own suite and reads a pattern that holds no song.
 */
import { describe, expect, it } from "vitest";

import { PLAYER_SLOTS, playerProjection, type PlayerSpec } from "./player.ts";
import { PLAYER_CHARACTER_REGIONS, PLAYER_DEFAULTS } from "./playerCharacter.ts";
import type { SongPart } from "./playerSong.ts";
import {
  PLAYER_BIAS_MAX,
  PLAYER_BIAS_MIN,
  PLAYER_HOME_MAX,
  PLAYER_STRIDE_MAX,
} from "./playerTravel.ts";
import { restPattern } from "./playerRest.ts";
import { playerSequence, playerWalk, type PlayerStep } from "./playerWalk.ts";

const spec = (song: readonly SongPart[], seed = 11): PlayerSpec => ({
  seed,
  ...PLAYER_DEFAULTS,
  song,
});

/** Every jump the first part of a two-part song was walked under — the chorus's, below. */
const first = (steps: readonly { repeats: number }[]) =>
  steps.filter((_, at) => at % 2 === 0).map((step) => step.repeats);

/** A part, with the id every one carries: opaque here, because nothing in a walk reads one — it
 *  is what the surfaces point at, and the walk only hands it on (0157). */
let minted = 0;
const part = (character: SongPart["character"], length: number, chorus = false): SongPart => ({
  id: `part-${++minted}`,
  character,
  amount: 1,
  length,
  chorus,
});

/**
 * What a step sounds as, apart from which part drew it — identity rather than sound: a song of one
 * plain part is a part standing where no song stands in one at all, and that difference is the
 * whole point of the two fields the surfaces read (0157).
 */
const sounded = (steps: readonly PlayerStep[]) =>
  steps.map(({ part: _part, voice: _voice, song: _song, ...sounds }) => sounds);

/** A pattern holding no song, so what moves in the jump's own cases below is the jump alone. */
const jumping = (fields: Partial<PlayerSpec>): PlayerSpec => ({
  seed: 11,
  ...PLAYER_DEFAULTS,
  ...fields,
});

/** Where each step read from, which is the only field any of those cases is about. */
const slots = (steps: readonly PlayerStep[]) => steps.map((step) => step.slot);

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
    expect(sounded(playerSequence(spec([part("plain", 4)]), 16))).toEqual(
      sounded(playerSequence(spec([]), 16)),
    );
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

/**
 * The parts a walk stood in, in order and without the repeats — the arrangement it played, read
 * off the steps the way every surface reads it: the part's own id and the character it was drawn
 * as, because an id is minted off a counter that replays with the walk and the character is what
 * one seed draws differently from another (0157, 0158).
 */
const arrangement = (steps: readonly PlayerStep[]): string[] =>
  steps
    .filter((step, at) => step.part !== null && steps[at - 1]?.part !== step.part)
    .map((step) => {
      const stood = step.song?.find((entry) => entry.id === step.part);
      return `${step.part ?? ""} ${stood?.character ?? ""}`;
    });

// One case per promise a drawn arrangement makes to the walk, and the list of them is what the
// step is: the length is how many such promises there are rather than how much this block decides.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a walk that draws its own song", () => {
  /**
   * The whole of what the step is for: an arrangement nothing stores is one the seed and the four
   * amounts have to reproduce, or a performance would not be the same performance twice (0089,
   * 0158).
   */
  it("draws one arrangement from one seed and one set of amounts, twice", () => {
    const held = { ...spec([]), arrange: 3, arrangeKeep: 2, arrangeChance: 1 };
    const played = arrangement(playerSequence(held, 60));
    expect(played.length).toBeGreaterThan(held.arrange);
    expect(playerSequence(held, 60)).toEqual(playerSequence(held, 60));
  });

  /** And a different seed is a different arrangement, or the four amounts would be the whole of
   *  it and the seed would not be reaching this at all. */
  it("draws a different arrangement from a different seed", () => {
    const held = { ...spec([], 11), arrange: 3 };
    expect(arrangement(playerSequence({ ...held, seed: 12 }, 60))).not.toEqual(
      arrangement(playerSequence(held, 60)),
    );
  });

  /**
   * `arrange` at zero is the whole of "not drawn", so a spec that draws no arrangement lays down
   * exactly the stream it laid before one could be drawn — the guard every amount in this module
   * carries, and the reason a switch pressed today sounds like a switch pressed yesterday (0134,
   * 0151, 0158).
   */
  it("draws nothing at all, and spends no draw, while it is off", () => {
    const written = [part("stutter", 3), part("breathe", 2)];
    const off = playerSequence(
      { ...spec(written), arrangeKeep: 1, arrangeChance: 1, arrangeReturn: 1 },
      24,
    );
    const before = playerSequence(spec(written), 24);
    // The stream and the arrangement, which is everything a step is but the amounts themselves —
    // a voice is the spec as the standing part reads it, so these four are in it and differ.
    expect(sounded(off)).toEqual(sounded(before));
    expect(off.map((step) => step.part)).toEqual(before.map((step) => step.part));
  });

  /** Which author is live is a rule and not a second field: an arrangement being drawn is the one
   *  walked, and the list a hand wrote is held and not played (0158). */
  it("walks the drawn arrangement rather than the written one", () => {
    const written = [part("stutter", 3)];
    const held = { ...spec(written), arrange: 2 };
    const steps = playerSequence(held, 24);
    expect(steps.map((step) => step.part)).not.toContain(written[0]?.id);
    expect(held.song).toEqual(written);
  });

  /**
   * A round kept is the same parts and a round let go is not — the two halves of what the keep
   * counts, read over one seed so the only thing between them is the amount itself.
   */
  it("plays a kept arrangement again and a let-go one afresh", () => {
    const held = { ...spec([]), arrange: 3 };
    const kept = arrangement(playerSequence({ ...held, arrangeKeep: 0 }, 96));
    expect(kept.slice(0, 3)).toEqual(kept.slice(3, 6));
    const gone = arrangement(playerSequence({ ...held, arrangeKeep: 1 }, 96));
    expect(gone.slice(0, 3)).not.toEqual(gone.slice(3, 6));
  });

  /**
   * And none of it reaches the session. A drawn arrangement is a function of the seed and the four
   * amounts at walk time, so what is stored is the four amounts — a durable list that rewrote
   * itself while it played would be a session changing without a command and a performance no seed
   * reproduces (0089, 0096, 0158).
   */
  it("leaves nothing of a drawn arrangement in the session", () => {
    const held = { ...spec([]), arrange: 3, arrangeKeep: 2, arrangeChance: 1 };
    const stored = JSON.stringify(playerProjection(held));
    const played = arrangement(playerSequence(held, 96));
    expect(played.length).toBeGreaterThan(held.arrange);
    // The projection is what a session holds, and it is the same text after a whole performance as
    // before one: no part of the run, and no cursor saying where the run had got to.
    expect(JSON.stringify(playerProjection(held))).toBe(stored);
    for (const stood of played) expect(stored).not.toContain(stood.split(" ")[0] ?? "");
  });

  /** And a let-go one comes home on the return's odds, which at one is the walk's first
   *  arrangement every time it is dropped (0151, 0158). */
  it("returns a let-go arrangement to the first one it laid", () => {
    const held = { ...spec([]), arrange: 3, arrangeKeep: 1, arrangeReturn: 1 };
    const home = arrangement(playerSequence(held, 96));
    expect(home.length).toBeGreaterThan(held.arrange);
    expect(home.slice(3, 6)).toEqual(home.slice(0, 3));
    // And a return of zero over the same seed does not come home, so what is read above is the
    // amount and not the arithmetic of a run that was never let go.
    expect(arrangement(playerSequence({ ...held, arrangeReturn: 0 }, 96)).slice(3, 6)).not.toEqual(
      home.slice(0, 3),
    );
  });
});

/**
 * The jump's own three amounts, which are the three the Distance dial's marker holds: a lean, a
 * stride and a return to the top of the loop (0162). Read here rather than in
 * src/lib/player.test.ts because each of them is a claim about where the *next* step reads from,
 * which is the one thing a sequence of steps shows and a single step cannot.
 */
// Four cases, each with the paragraph saying what about a jump it pins down, which is the waiver
// every long suite in this repo carries. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the jump each step is drawn by", () => {
  /**
   * What the walk laid down at the values a switch press leaves, captured off the build before the
   * three amounts existed. The one case that says the stream did not move: all three are drawn
   * where they cost nothing — the lean reads the sign draw the wander already took, and neither
   * the stride nor the home rolls at zero — so a pattern nobody has touched is the pattern it was
   * (0089, 0096).
   */
  it("lays down the same steps at the values the switch leaves", () => {
    expect(slots(playerSequence(jumping({}), 24))).toEqual([
      0, 3, 4, 6, 3, 1, 4, 8, 6, 4, 7, 11, 12, 14, 11, 7, 8, 10, 9, 8, 12, 9, 10, 9,
    ]);
  });

  /**
   * A stride of one takes the whole distance every jump and a lean of one signs every one of them
   * forward, so the walk turns by exactly the distance each time: a rotation of the grid, which is
   * the rhythm no combination of the module's other numbers could ask for (0162).
   */
  it("closes into a rotating cycle at a full stride and a full lean", () => {
    const walked = slots(
      playerSequence(
        jumping({ distance: 3, stride: PLAYER_STRIDE_MAX, bias: PLAYER_BIAS_MAX }),
        PLAYER_SLOTS + 1,
      ),
    );
    for (const [index, slot] of walked.entries()) expect(slot).toBe((index * 3) % PLAYER_SLOTS);
    // And it comes round: the whole grid is one cycle of a stride that never divides it.
    expect(walked.at(-1)).toBe(walked[0]);
  });

  /**
   * One seed, two leans that are each other's negation: every jump takes the same distance and
   * the opposite sign, so the two walks are mirror images through slot 0. The distance draw and
   * the sign draw are one stream, which is what makes this a claim about the lean rather than
   * about two patterns that happen to look alike.
   */
  it("walks one seed in mirrored directions under a lean and its negation", () => {
    const on = slots(playerSequence(jumping({ bias: PLAYER_BIAS_MAX }), 64));
    const back = slots(playerSequence(jumping({ bias: PLAYER_BIAS_MIN }), 64));
    expect(back).toEqual(on.map((slot) => (PLAYER_SLOTS - slot) % PLAYER_SLOTS));
  });

  /**
   * A home of one reads the top of the loop and nothing else, and one in between lands there about
   * as often as it says — the odds are the dial's own, so the band is the sampling error of a few
   * hundred jumps rather than a tolerance anything is allowed to drift inside.
   */
  it("comes home at the odds its dial says", () => {
    expect(slots(playerSequence(jumping({ home: PLAYER_HOME_MAX }), 32))).toEqual(
      Array.from({ length: 32 }, () => 0),
    );
    // Every jump but the first, since a walk always begins at the top of the loop.
    const walked = slots(playerSequence(jumping({ home: 0.5 }), 801)).slice(1);
    const home = walked.filter((slot) => slot === 0).length;
    expect(home / walked.length).toBeGreaterThan(0.45);
    expect(home / walked.length).toBeLessThan(0.55);
  });
});

/** Where the waits fall, and which of the field's two authors put them there (0163). */
const rests = (steps: readonly PlayerStep[]) => steps.map((step) => step.rest);

describe("the wait each step is placed or rolled by", () => {
  /**
   * The whole of what placing them means: the same figure of waits every span, from the first jump
   * on, where a rolled wait is a fresh coin at every jump. Read against `restPattern` itself rather
   * than against a spelled-out run — the pattern is that module's claim, and this one is that the
   * walk lays it down and comes round on it.
   */
  it("places the same run of waits every span, over one seed", () => {
    const rest = 2;
    const placed = rests(playerSequence(jumping({ rest, restPulses: 3, restSpan: 8 }), 24));
    const figure = restPattern(3, 8).map((waits) => (waits ? rest : 0));
    expect(placed).toEqual([...figure, ...figure, ...figure]);
  });

  /**
   * And what the two rolled amounts read as while it is: nothing at all. They author the field or
   * the pattern does, and a placed pattern takes no draw — so a walk under either end of both
   * dials is the same walk, step for step, and not merely the same waits.
   */
  it("leaves the stream untouched at either end of the two rolled amounts", () => {
    const placed = (fields: Partial<PlayerSpec>) =>
      playerSequence(jumping({ rest: 2, restPulses: 3, restSpan: 8, ...fields }), 64);
    expect(placed({ restChance: 0, restSpread: 1 })).toEqual(placed({}));
    // And the roll is still the author where nothing is placing them, which is the same pair of
    // ends telling two patterns apart the moment the pulses come off (P87).
    const rolled = (fields: Partial<PlayerSpec>) =>
      playerSequence(jumping({ rest: 2, ...fields }), 64);
    expect(rolled({ restChance: 0 })).not.toEqual(rolled({}));
  });

  /**
   * A part is a new set of numbers and a new run of waits with them: the placement starts again at
   * every part boundary, the way every count the walk keeps does, so a part's own span comes round
   * inside the part rather than wherever the part before it left the figure.
   */
  it("starts the placement again at a part boundary", () => {
    // Three jumps a part against a span of four, so the two are out of step: the second part's
    // first jump waits only where the placement was laid again, and reads index 3 of the figure
    // where it was not. A part as long as the span would come round on its own and prove nothing.
    const song = [part("plain", 3), part("plain", 3)];
    const walked = rests(playerSequence({ ...spec(song), rest: 2, restPulses: 1, restSpan: 4 }, 6));
    expect(walked).toEqual([2, 0, 0, 2, 0, 0]);
  });
});
