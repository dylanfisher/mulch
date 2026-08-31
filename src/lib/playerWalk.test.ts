/**
 * @role What a song does to the walk: each part walked under the numbers it was captured with,
 *   the same ones every time it comes round, and the whole of it still a pure function of the seed
 *   and the step count — which is the one promise a pattern may not cost (0089, 0176). And the same
 *   again for a song the walk draws for itself rather than being handed (0158). And what one jump
 *   is: how far it may go, which way it leans, when it takes the whole distance and when it comes
 *   home instead (0162).
 * @instead What a step is, and every number one is drawn from → src/lib/player.test.ts, which is
 *   the walk's own suite and reads a pattern that holds no song.
 */
// Over the soft line cap, and everything over it is one more claim the walk makes: this suite grows
// by a case whenever the module grows a field, so its length is the size of that vocabulary rather
// than a judgement of its own. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// And over the dependency cap by one, which is the cast: this suite reads a bound out of every
// module the spec's numbers are declared in, so the count is how many families the walk has rather
// than a judgement of its own. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { describe, expect, it } from "vitest";

import { partVoice, type PartVoice, type PlayerSpec } from "./player.ts";
import { playerProjection } from "./playerWire.ts";
import { PLAYER_REPEATS_MAX } from "./playerRepeats.ts";
import { PLAYER_CAST_MIN, withCharacter, type PlayerCharacter } from "./playerCast.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import { drawCharacter, PLAYER_CHARACTER_REGIONS, PLAYER_DEFAULTS } from "./playerCharacter.ts";
import {
  PLAYER_PART_DEFAULTS,
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  type SongPart,
} from "./playerSong.ts";
import {
  PLAYER_BIAS_MAX,
  PLAYER_BIAS_MIN,
  PLAYER_HOME_MAX,
  PLAYER_STRIDE_MAX,
  travelReach,
} from "./playerTravel.ts";
import { mulberry32 } from "./random.ts";
import { restPattern } from "./playerRest.ts";
import {
  PLAYER_CLIMB_MAX,
  PLAYER_CLIMB_MIN,
  PLAYER_RATE_UNITY,
  PLAYER_RATES,
  PLAYER_SPREAD_MAX,
} from "./playerRungs.ts";
import { PLAYER_SPARK_LEVEL_MAX, PLAYER_SPARK_MAX } from "./playerSpark.ts";
import { playerSequence, playerWalk, type PlayerStep } from "./playerWalk.ts";
import { albumsParts, oneAlbum } from "./playerAlbum.ts";

const spec = (song: readonly SongPart[], seed = 11): PlayerSpec => ({
  seed,
  ...PLAYER_DEFAULTS,
  albums: oneAlbum(song),
});

/** Every jump the first part of a two-part song was walked under. */
const first = (steps: readonly { repeats: number }[]) =>
  steps.filter((_, at) => at % 2 === 0).map((step) => step.repeats);

/**
 * A part, with the id every one carries — opaque here, because nothing in a walk reads one: it is
 * what the surfaces point at, and the walk only hands it on (0157) — and the spec a hand would
 * have captured after pressing that character's name on the card, which is what a part carries
 * now (0176). Drawn off a generator of this file's own, because it is a gesture's draw and not the
 * walk's: nothing about a written part touches the stream a seed reproduces.
 */
let minted = 0;
const part = (
  character: PlayerCharacter,
  length: number,
  /** What the hand turned after pressing that name, if anything: a part is filled from a character
   *  and then edited dial by dial, which is the whole of what a captured spec is for (0176). */
  over: Partial<PartVoice> = {},
): SongPart => {
  minted++;
  return {
    id: `part-${minted}`,
    name: `part-${minted}`,
    skip: false,
    voice: { ...partVoice(drawCharacter(character, mulberry32(minted))), ...over },
    length,
    steps: [],
  };
};

/**
 * What a step sounds as, apart from which part drew it and where in the run it fell — identity
 * rather than sound: a song of one plain part is a part standing where no song stands in one at
 * all, and that difference is the whole point of the four fields the surfaces read (0157).
 */
const sounded = (steps: readonly PlayerStep[]) =>
  steps.map(({ part: _part, voice: _voice, song: _song, place: _place, ...sounds }) => sounds);

/** A pattern holding no song, so what moves in the jump's own cases below is the jump alone. */
const jumping = (fields: Partial<PlayerSpec>): PlayerSpec => ({
  seed: 11,
  ...PLAYER_DEFAULTS,
  ...fields,
});

/** Where each step read from, which is the only field any of those cases is about. */
const slots = (steps: readonly PlayerStep[]) => steps.map((step) => step.slot);

/**
 * What the walk lays down at the values a switch press leaves, captured off the build before the
 * three travel amounts existed. The one run every field added since has to leave exactly where it
 * found it — a field whose roll is not guarded at its own zero moves this, which is what makes it
 * the stream's own golden rather than a case about one knob (0089, 0096).
 */
const SWITCH_LEAVES = [
  0, 3, 4, 6, 3, 1, 4, 8, 6, 4, 7, 11, 12, 14, 11, 7, 8, 10, 9, 8, 12, 9, 10, 9,
];

/** One step with its spark's level taken off it, so two walks that differ only in that dial are
 *  compared by every other field — the spark's slot included (P123). */
const apartFromLevel = (steps: readonly PlayerStep[]) =>
  steps.map(({ sparked, ...step }) => ({ ...step, sparkSlot: sparked?.slot ?? null }));

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
  it("walks each part under the numbers it was captured with", () => {
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

  // A part is read once and then walked: every jump inside one is held at the count the part
  // carries, rather than at a number redrawn per step.
  it("holds one part's numbers for every jump of it", () => {
    const steps = playerSequence(spec([part("stutter", 4)]), 4);
    expect(new Set(steps.map((step) => step.repeats)).size).toBe(1);
  });

  /**
   * And it comes round exactly as it was captured. A part was a *plan* to draw a character, so a
   * riff part dealt a new riff every time its length was up and a chorus switch beside it said
   * which part did not (0153); a part is the dials it was captured from, so every round is that
   * part again and the switch has nothing left to be the exception to (0176). The whole reason for
   * the change is on the other side of it: this is what "this part, exactly as the card stands
   * right now" means once the pattern is playing.
   */
  it("plays the one part's own numbers every time its length is up", () => {
    const every = 4;
    const held = part("stutter", every);
    const steps = playerSequence(spec([held]), every * 3);
    const counts = steps.map((step) => step.repeats);
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBe(held.voice.repeats);
  });

  /**
   * Two parts alternating are two settings alternating, each unchanged at every round: 0153's
   * chorus said of every part at once, which is what a captured spec makes of it (0176).
   */
  it("comes back to the same numbers on every part, round after round", () => {
    const rounds = 6;
    const held = [part("stutter", 1), part("breathe", 1)];
    const steps = playerSequence(spec(held), rounds * 2);
    expect(new Set(first(steps)).size).toBe(1);
    expect(new Set(steps.map((step) => step.repeats)).size).toBe(2);
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
    const held = spec([part("stutter", 3), part("scatter", 2), part("breathe", 4)]);
    const whole = playerSequence(held, 24);
    const walk = playerWalk(held, 9);
    expect(Array.from({ length: 15 }, () => walk())).toEqual(whole.slice(9));
  });
});

/**
 * The parts a walk stood in, in order and without the repeats — the arrangement it played, read
 * off the steps the way every surface reads it: the part's own id and one number of the spec it
 * carries, because an id is minted off a counter that replays with the walk and the numbers are
 * what one seed draws differently from another (0157, 0158, 0176).
 */
const arrangement = (steps: readonly PlayerStep[]): string[] =>
  steps
    .filter((step, at) => step.part !== null && steps[at - 1]?.part !== step.part)
    .map((step) => {
      const stood = step.song?.find((entry) => entry.id === step.part);
      return `${step.part ?? ""} ${stood?.voice.repeats ?? ""}`;
    });

/**
 * Which character drew each part of a run, read back off the spec the part carries — which is not
 * a field a part has any more (0176): `plain` names no knob, so its draw is the card's own numbers
 * exactly, and `slide` is the one region that names `drift` (0174).
 */
const names = (held: PlayerSpec): Set<string> =>
  new Set(
    playerSequence(held, 192)
      .flatMap((step) => step.song?.filter((entry) => entry.id === step.part) ?? [])
      .map((stood) =>
        JSON.stringify(stood.voice) === JSON.stringify(partVoice(held))
          ? "plain"
          : stood.voice.drift === PLAYER_DEFAULTS.drift
            ? "someone else"
            : "slide",
      ),
  );

/**
 * Each part a run laid, in the order it was laid, as which character drew it — keyed by the id so a
 * part handed over on every one of its jumps is counted once and the order is the order of the run
 * (0158). `plain` names no knob, so a part drawn as it is the card's own dials exactly, which is
 * the whole of how a name is read back off a part that no longer carries one (0176, `names`).
 */
const laidNames = (held: PlayerSpec): string[] => {
  const seen = new Map<string, string>();
  for (const step of playerSequence(held, 192)) {
    for (const entry of step.song ?? []) {
      seen.set(
        entry.id,
        JSON.stringify(entry.voice) === JSON.stringify(partVoice(held)) ? "plain" : "drawn",
      );
    }
  }
  return [...seen.values()];
};

/** The same, read for how long each of those parts lasts (`arrangeSpan`, 0199). */
const laidLengths = (held: PlayerSpec): number[] => {
  const seen = new Map<string, number>();
  for (const step of playerSequence(held, 192)) {
    for (const entry of step.song ?? []) seen.set(entry.id, entry.length);
  }
  return [...seen.values()];
};

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

  /**
   * 0199's guardrail, and the whole of what it is for: a run left to evolve draws its parts
   * wherever their regions reach, and pulled back it draws them nearer the dials a hand has
   * already settled on. At nothing every drawn part *is* those dials, which is a run of one sound
   * moving only where the walk moves it — and that is the readable end of the claim, because
   * `plain`'s own region names no knob (`laidNames`).
   */
  it("draws every part nearer the card's own dials as the amount comes down", () => {
    const held = { ...spec([]), arrange: 4, arrangeKeep: 0 };
    expect(new Set(laidNames({ ...held, arrangeAmount: 0 }))).toEqual(new Set(["plain"]));
    // And at the full amount they are not, or the amount would be bounding nothing: the cast holds
    // five names beside `plain`, so four parts drawn from it are not four plains.
    expect(laidNames({ ...held, arrangeAmount: 1 })).toContain("drawn");
  });

  /**
   * The second guardrail, and the one about the run rather than about a part: an arrangement whose
   * parts came up alike is a song with one section in it. Read over a cast of exactly two names,
   * so "different from the one before it" is an alternation and nothing subtler (0199).
   */
  it("refuses a drawn part the character the part before it took", () => {
    const cast = withCharacter(withCharacter(0, "plain", true), "slide", true);
    const held = { ...spec([]), arrange: 8, cast, arrangeKeep: 0, arrangeApart: 1 };
    const laid = laidNames(held);
    expect(laid).toHaveLength(held.arrange);
    for (const [at, name] of laid.entries()) if (at > 0) expect(name).not.toBe(laid[at - 1]);
  });

  /**
   * And it has no answer where the cast permits one name — that name is every part whatever the
   * odds say. The draw is taken either way, so the two spend the same stream and the walks are the
   * same walk, which is the rule every draw in this module keeps (0089, 0174).
   */
  it("leaves a cast of one name alone, and spends the same stream either way", () => {
    const held = { ...spec([]), arrange: 4, cast: withCharacter(0, "slide", true) };
    const turned = playerSequence({ ...held, arrangeApart: 1 }, 96);
    const flat = playerSequence({ ...held, arrangeApart: 0 }, 96);
    // Everything a step is but the amounts themselves, which is how the off case beside this one
    // reads the same claim: a voice is the spec as the standing part reads it, so the field being
    // moved is in it and differs by definition.
    expect(sounded(turned)).toEqual(sounded(flat));
    expect(arrangement(turned)).toEqual(arrangement(flat));
  });

  /**
   * And how long each of them lasts: the same eight jumps until a span is opened, and then the
   * eight doubled and halved — so an arrangement has long stretches and short ones rather than
   * equal blocks (0199, `songLength`).
   */
  it("draws every part the same length until a span is opened", () => {
    const held = { ...spec([]), arrange: 6, arrangeKeep: 0 };
    expect(laidLengths({ ...held, arrangeSpan: 0 })).toEqual(
      Array.from({ length: 6 }, () => PLAYER_PART_DEFAULTS.length),
    );
    const wide = laidLengths({ ...held, arrangeSpan: 3 });
    expect(new Set(wide).size).toBeGreaterThan(1);
    for (const length of wide) {
      expect(length).toBeGreaterThanOrEqual(PLAYER_PART_MIN);
      expect(length).toBeLessThanOrEqual(PLAYER_PART_MAX);
    }
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
    expect(albumsParts(held.albums)).toEqual(written);
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

  /**
   * Which characters it may be, and no others. The cast narrows the list a part is drawn from, so
   * every name in a run laid under a narrowed one is a name that cast holds — and the whole cast,
   * which is where the switch leaves it, goes on drawing every character there is (0174).
   */
  it("draws its parts out of the cast and nowhere else", () => {
    const open = { ...spec([]), arrange: 4, arrangeKeep: 1, arrangeChance: 1 };
    const narrowed = names({ ...open, cast: withCharacter(PLAYER_CAST_MIN, "slide", true) });
    expect(narrowed).toEqual(new Set(["plain", "slide"]));
    // And the two are a narrowing rather than the only two a drawn run ever holds.
    expect(names(open)).toContain("someone else");
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
    expect(slots(playerSequence(jumping({}), SWITCH_LEAVES.length))).toEqual(SWITCH_LEAVES);
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
   * The fan and the draw are one arithmetic said two ways, so the odds it reads out have to be the
   * frequencies the walk actually lands at. Walked rather than reasoned about: every jump of a
   * long run, counted as the signed move it made, against `travelReach` on the same four amounts
   * (0180). A picture that disagrees with the pattern is the one thing 0159 names as worse than no
   * picture at all, and this is the seam where that could happen quietly.
   */
  it("reads out the odds the walk actually jumps at", () => {
    // No home: coming home lands on slot 0, and a leg that reaches slot 0 from where the walk
    // happens to be standing lands there too — so the two authors are told apart by asking each of
    // them on a spec where only it is live (P87).
    const wandering = jumping({ distance: 4, bias: 0.5, stride: 0.3, home: 0 });
    const walked = slots(playerSequence(wandering, 8000));
    const counted = new Map<number, number>();
    for (const [index, slot] of walked.entries()) {
      if (index === 0) continue;
      const from = walked[index - 1] ?? 0;
      // The move the walk made, signed: the grid wraps, so the shorter way round is the one it
      // took. The same fold `travelReach` puts its own legs through, which is what makes the two
      // comparable at any distance — the case below is that fold at the widest one.
      const move =
        ((((slot - from + PLAYER_SLOTS) % PLAYER_SLOTS) + PLAYER_SLOTS / 2) % PLAYER_SLOTS) -
        PLAYER_SLOTS / 2;
      counted.set(move, (counted.get(move) ?? 0) + 1);
    }
    const jumps = walked.length - 1;
    const { home, legs } = travelReach(wandering);
    expect(home).toBe(0);
    for (const leg of legs) {
      expect((counted.get(leg.offset) ?? 0) / jumps).toBeCloseTo(leg.weight, 1);
    }
    // And the odds are odds: every leg and the home together are one whole jump.
    expect(legs.reduce((odds, leg) => odds + leg.weight, 0) + home).toBeCloseTo(1, 10);

    // The home half, asked where it is the only thing that can put the walk on slot 0 from far
    // away: a distance of one can never reach it except from its neighbours.
    const homing = jumping({ distance: 1, home: 0.4 });
    const homed = slots(playerSequence(homing, 8000)).filter((slot) => slot === 0).length;
    expect(homed / 8000).toBeGreaterThan(travelReach(homing).home);
  });

  /**
   * The distance reaches the whole grid — `PLAYER_DISTANCE_MAX` is `PLAYER_SLOTS` — and the draw
   * wraps, so a move of the whole grid is a move of nothing and a move back of nine lands where a
   * move on of seven does. Two legs the ear cannot tell apart are one leg, or the fan would draw a
   * branch for a jump that goes nowhere and read it out as the likeliest (0159, 0180).
   */
  it("folds the legs that land on one slot into one, at the widest distance", () => {
    const { legs } = travelReach({
      distance: PLAYER_SLOTS,
      bias: 0,
      stride: PLAYER_STRIDE_MAX,
      home: 0,
    });
    for (const leg of legs) expect(Math.abs(leg.offset)).toBeLessThanOrEqual(PLAYER_SLOTS / 2);
    // No two legs name one landing, and the odds are still odds.
    expect(new Set(legs.map((leg) => leg.offset)).size).toBe(legs.length);
    expect(legs.reduce((odds, leg) => odds + leg.weight, 0)).toBeCloseTo(1, 10);
    // A full stride at the whole grid never moves, which is the one leg it draws.
    const stays = legs.find((leg) => leg.offset === 0);
    expect(stays?.weight).toBeCloseTo(1, 10);
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
    // The waits are the part's own, because a part carries the dials it was captured from: a spec
    // set after the capture reaches the jumps no part is standing in and no others (0176).
    const placed = { rest: 2, restPulses: 1, restSpan: 4 };
    const song = [part("plain", 3, placed), part("plain", 3, placed)];
    const walked = rests(playerSequence({ ...spec(song), ...placed }, 6));
    expect(walked).toEqual([2, 0, 0, 2, 0, 0]);
  });
});

// Three cases over one knob, where the blocks above run to five: a spark is what a landing throws
// rather than a number it holds, so what it is has to be said as the stream it does not move, the
// slot it lands on and the level it carries. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a landing that throws a spark", () => {
  /**
   * The whole of what a spark costs a pattern that never throws one: nothing. The roll is guarded
   * at the dial's own zero, so a spec that sparks nothing takes neither the roll nor the jump the
   * spark would land on — and the stream it lays is the golden one every other field of a step has
   * had to leave alone (P123, 0096).
   */
  it("draws nothing at all, and lays the stream it laid before, while it is off", () => {
    const off = playerSequence(jumping({}), SWITCH_LEAVES.length);
    expect(off.every((step) => step.sparked === null)).toBe(true);
    expect(slots(off)).toEqual(SWITCH_LEAVES);
  });

  /**
   * And the level is carried rather than drawn: asked where the branch it lives in actually runs,
   * which is a pattern that sparks at every landing. Two walks that differ only in the dial lay the
   * same slots, the same counts and the same waits, and differ in exactly one number per landing —
   * so the level moves what a spark sounds like and never which performance it is (0089).
   */
  it("carries the level rather than drawing it, on a pattern that sparks", () => {
    const quiet = playerSequence(jumping({ spark: PLAYER_SPARK_MAX, sparkLevel: 0 }), 64);
    const loud = playerSequence(
      jumping({ spark: PLAYER_SPARK_MAX, sparkLevel: PLAYER_SPARK_LEVEL_MAX }),
      64,
    );
    expect(apartFromLevel(loud)).toEqual(apartFromLevel(quiet));
    expect(loud.every((step) => step.sparked?.level === PLAYER_SPARK_LEVEL_MAX)).toBe(true);
    expect(quiet.every((step) => step.sparked?.level === 0)).toBe(true);
  });

  /**
   * And what it is when it fires: a slot and a level, one ordinary jump from the landing that threw
   * it. The jump comes off this walk's own generator — `travelFrom`, the same move the pattern
   * makes between two landings — so a spark obeys the distance the pattern is walking under and the
   * stream moves where a landing sparks, which is what "never from a second generator" means.
   */
  it("throws one at another slot, on the odds its dial says", () => {
    const every = playerSequence(jumping({ spark: PLAYER_SPARK_MAX, sparkLevel: 0.25 }), 64);
    expect(every.every((step) => step.sparked !== null)).toBe(true);
    expect(every.every((step) => step.sparked?.level === 0.25)).toBe(true);
    // Inside the grid, and somewhere the landing is not: a spark is a second region of the loop.
    expect(
      every.every((step) => {
        const slot = step.sparked?.slot ?? -1;
        return Number.isInteger(slot) && slot >= 0 && slot < PLAYER_SLOTS;
      }),
    ).toBe(true);
    // Somewhere else, nearly always: the jump may wrap or come home onto the landing's own slot,
    // which is the jump answering and not a case the walk draws again for (P123).
    expect(every.filter((step) => step.sparked?.slot !== step.slot).length).toBeGreaterThan(32);
    // The jump it lands on is drawn from the one stream the pattern is a function of, so a pattern
    // that sparks walks somewhere a pattern that does not never reaches.
    expect(slots(every)).not.toEqual(slots(playerSequence(jumping({}), 64)));
  });
});

/** The rungs one landing's repeats read at — the ladder, read back as signed distances. */
const rungs = (rates: readonly number[] = []) =>
  rates.map((rate) => (PLAYER_RATES as readonly number[]).indexOf(rate) - PLAYER_RATE_UNITY);

// Three cases over one knob: a climb is the first amount the module grew that moves a number
// *inside* a landing, so what it is has to be said as the ladder each repeat reads at, the fold
// that keeps it inside the spread, and the stream it does not move. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a landing that climbs", () => {
  /**
   * The whole of what a climb costs a pattern that never climbs: nothing. It is arithmetic on the
   * rung the walk is already standing on rather than a draw, so a spec at the switch's own zero
   * lays the golden stream every other field of a step has had to leave alone (0167, 0096) — and
   * every repeat of every landing reads at the one rate the hold let it go onto.
   */
  it("reads one rate for the whole landing, and lays the stream it laid before, while it is off", () => {
    const off = playerSequence(jumping({}), SWITCH_LEAVES.length);
    expect(slots(off)).toEqual(SWITCH_LEAVES);
    for (const step of off) {
      expect(step.rates.length).toBe(step.repeats);
      expect(new Set(step.rates).size).toBe(1);
    }
    // And a climbing pattern is the same performance with a ladder on it: the same slots, counts
    // and waits, differing in nothing but which rungs the repeats read at.
    const climbing = playerSequence(jumping({ climb: 2, spread: 2 }), SWITCH_LEAVES.length);
    expect(slots(climbing)).toEqual(SWITCH_LEAVES);
    expect(climbing.map((step) => step.repeats)).toEqual(off.map((step) => step.repeats));
  });

  /**
   * The ladder itself: `climb` rungs per repeat from the rung the jump let the landing go onto,
   * one rate per repeat and always exactly `repeats` of them. At a spread of one and a climb of
   * one that is the triangle −1, 0, 1, 0 — which is the arpeggio the dial promises, and it is what
   * `hold: 0` alone can be read against, since the walk then never leaves unity (0167).
   */
  it("carries one rung per repeat, at the distance the dial says", () => {
    const [step] = playerSequence(jumping({ climb: 1, spread: 1, repeats: 8 }), 1);
    expect(rungs(step?.rates)).toEqual([0, 1, 0, -1, 0, 1, 0, -1]);
    // And the other way round the same ladder, which is the whole of what the sign is for.
    const [down] = playerSequence(jumping({ climb: -1, spread: 1, repeats: 8 }), 1);
    expect(rungs(down?.rates)).toEqual([0, -1, 0, 1, 0, -1, 0, 1]);
  });

  /**
   * And it never leaves the spread, on any climb, any count and any spread the dials allow: the
   * fold is what keeps a landing's arpeggio on the same ladder its jumps let go onto, and a rung
   * off the end of `PLAYER_RATES` would be a landing reading at no rate at all.
   */
  it("turns round at the spread rather than running off the end of the ladder", () => {
    for (const spread of [0, 1, 2, PLAYER_SPREAD_MAX]) {
      for (const climb of [PLAYER_CLIMB_MIN, -1, 1, PLAYER_CLIMB_MAX]) {
        const walked = playerSequence(
          jumping({ climb, spread, repeats: PLAYER_REPEATS_MAX, hold: 1, seed: 5 }),
          32,
        );
        for (const step of walked) {
          expect(step.rates.length).toBe(step.repeats);
          for (const rung of rungs(step.rates)) expect(Math.abs(rung)).toBeLessThanOrEqual(spread);
        }
      }
    }
    // A spread of zero is the one setting that silences a climb, and it is the same answer the
    // draw gives: there is nowhere on the ladder to go.
    const pinned = playerSequence(jumping({ climb: PLAYER_CLIMB_MAX, spread: 0, repeats: 8 }), 4);
    for (const step of pinned) expect(new Set(step.rates)).toEqual(new Set([1]));
  });

  /**
   * And a spread of zero is the *only* setting that silences one. A ladder that turned round by
   * reflecting its position rather than its direction stands still wherever the climb is half the
   * window's own period — a climb of four inside a spread of two would be every repeat at unity,
   * which is the dial at its own maximum doing nothing and is exactly the dead spot a wrap was
   * refused for (0167). The pairing is not exotic: the switch leaves a spread of two, and at a hold
   * of zero the walk never leaves the rung it started on.
   */
  it("moves on every pairing of the two dials that is not a spread or a climb of zero", () => {
    for (let spread = 1; spread <= PLAYER_SPREAD_MAX; spread++) {
      for (let climb = PLAYER_CLIMB_MIN; climb <= PLAYER_CLIMB_MAX; climb++) {
        if (climb === 0) continue;
        const [step] = playerSequence(jumping({ climb, spread, repeats: 8, hold: 0 }), 1);
        // The pair is in the expectation rather than only the answer, so a failure names the two
        // dials it happened on instead of saying that some ladder somewhere stood still.
        expect([climb, spread, new Set(rungs(step?.rates)).size > 1]).toEqual([
          climb,
          spread,
          true,
        ]);
      }
    }
  });

  /**
   * And the ladder is as long as the count the landing actually holds, which on a written part is
   * the cell's ×n rather than the dial's (0188). One rung per repeat is structural — the transport
   * refuses a landing whose two lists disagree, and a frame may not throw (0167, 0070).
   */
  it("carries one rung per repeat of a written cell's own count", () => {
    const written = {
      ...part("stutter", 4),
      steps: [
        { slot: 2, repeats: 5, rest: 0 },
        { slot: 9, repeats: 1, rest: 1 },
      ],
    };
    for (const step of playerSequence({ ...spec([written]), climb: 1, spread: 1 }, 8)) {
      expect(step.rates.length).toBe(step.repeats);
    }
  });
});
