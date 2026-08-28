/**
 * @role What a jumping pattern sounds like, as something a hand can ask for by name: the values a
 *   switch press leaves, the characters a pattern may be drawn as — each a *region* of the spec
 *   rather than one point in it — and the amount saying how far from plain a draw is taken (0152).
 *   Pure maths: no clock, no React, and no PRNG of its own, because the draw is a gesture's and
 *   the caller is the one holding it.
 * @instead What any one of these numbers means, and the range each is declared inside →
 *   src/lib/player.ts, which is the module a character is a setting of. The menu that presses one
 *   → src/ui/PlayerCharacter.tsx. Nothing here knows what a step is: a character is a spec and
 *   never a sound.
 */
// Over the 400-line soft cap, and what is over it is the regions: one named character per block,
// each with the paragraph saying what it is meant to sound like and why the knobs it leaves alone
// are left alone — which is the argument 0152 asks for in writing and exists nowhere else.
// Splitting the table off from the draw that reads it would put a character in one file and what a
// character *is* in another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import {
  PLAYER_KNOBS,
  PLAYER_PART_KNOBS,
  type PartVoice,
  type PlayerDefaults,
  type PlayerKnob,
  type PlayerPartKnob,
  type PlayerVoice,
} from "./player.ts";
import { PLAYER_CAST_MAX, type PlayerCharacter } from "./playerCast.ts";
import { isWholeKnob, PLAYER_KNOB_DIALS, PLAYER_SONG_KNOBS } from "./playerKnobs.ts";
import { PLAYER_RATE_RUNGS } from "./playerRungs.ts";
import { fromIds } from "./records.ts";

/**
 * How much of a character a draw takes, 0…1. Zero is plain — the draw is made and then blended
 * all the way back, so the amount is a dial over one drawn character rather than a second draw —
 * and one is the character as its region drew it.
 *
 * Here, beside the regions it is a fraction of, which is what this file's own `@role` has said it
 * holds since 0152. It sat in src/lib/player.ts while every range of the module did; that file is
 * the spec's own numbers, and this is not one of them — nothing durable carries it. The menu that
 * presses a name keeps how far in it went in view state, and what reaches the session is the
 * numbers that came out (0152, 0176).
 */
export const PLAYER_AMOUNT_MIN = 0;
export const PLAYER_AMOUNT_MAX = 1;

/**
 * The finest a hand may set that. A hundredth, which is finer than any single knob's move across
 * its own range at this width and coarse enough that an arrow key is heard.
 */
export const PLAYER_AMOUNT_STEP = 0.01;

/**
 * What pressing the switch holds: the middle of every range, walking both ways, with nothing
 * cutting a repeat. A performer turns the module on to hear jumps; a stutter is the next gesture.
 *
 * The player's own clock starts switched off in the same sense — a burst about as long as a slot
 * of the loop these defaults were written against, nothing varying it, no rest between jumps and
 * one held rate — so the module still sounds like plain jumps until a knob asks for something
 * else (P67).
 *
 * Here rather than on the card that presses it, because it is no longer only what a switch leaves:
 * it is the point every character below is a distance from, and the spec an amount of zero blends
 * back to. Two gestures now set a whole spec at once and they read one declaration (principle 1).
 */
export const PLAYER_DEFAULTS = {
  distance: 4,
  // A walk with no lean, taking no stride and never coming home: the wandering, uniformly drawn
  // jump this module made before it could do any of the three, so a switch pressed today sounds
  // like a switch pressed before 0162 and all three are things a hand reaches for. No region below
  // names the stride or the home, and that is the written answer 0152 asks for rather than an
  // omission: both are heard only on the jumps they fire on — a stride is indistinguishable from
  // an ordinary jump until it has fired several times over, and a homing jump is one landing in
  // sixteen — so a name pressed at half an amount would be a character a listener could not hear
  // as one, which is the same argument the ratchet and the drop were left out on (P118). The lean
  // is named by three of them, because which way a pattern goes is audible in one jump.
  bias: 0,
  stride: 0,
  home: 0,
  // No figure, which is the memoryless walk the module was before it could keep one — so a switch
  // pressed today sounds like a switch pressed before 0151, and the Phrase dial is a thing a hand
  // reaches for. Its keep is four because that is the number of times a run has to come round to
  // be heard as a run at all; its chance and its return are amounts and start at their own zero,
  // so the first figure a person hears is one that repeats exactly and then moves on.
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  repeats: 4,
  // The count exactly as the dial says it, which is what 0134 made it: nothing keeps a drawn
  // count, so nothing is drawn, and the three amounts behind the marker are things a hand reaches
  // for rather than things it has to undo before the Repeats dial means what it says (0135).
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  // Repeats that stand equal, which is what a landing was before it could shrink, and no landing
  // dropped. No region below names either, and that is the written answer 0152 asks for rather
  // than an omission: every knob a character names is true of every landing it draws — how far,
  // how long, how hard cut — while a ratchet is heard only across a long count and a hole only on
  // the landings it fires on, so a name pressed at half an amount would be a character a listener
  // could not hear as one. Both stand where the switch left them (P118).
  ratchet: 0,
  gate: 0,
  drop: 0,
  // And nothing read backwards, which is what a landing did before it could turn around. No region
  // below names it either, and that is the written answer 0152 asks for rather than an omission:
  // every knob a character names is true of the pattern whatever it is playing — how far, how
  // long, how hard cut — while whether a slot read backwards is worth hearing is a fact about the
  // material rather than about the walk, and a name pressed at half an amount would promise
  // something about a sample it cannot know. It stands where the switch left it (P121, P118).
  reverse: 0,
  // And no landing throwing a second one, which is what a landing did before it could throw one:
  // one region of the loop sounds at a time, and the level below is what a spark *would* be at —
  // half the landing that threw it, so the first one a person hears is a shadow under it rather
  // than a second voice beside it. No region below names either, and that is the written answer
  // 0152 asks for rather than an omission: it is the argument the drop and the reverse were left
  // out on. Whether a second region of the loop is worth hearing at once is a fact about the
  // material rather than about the walk — two dense regions sounding together is mud on one sample
  // and the whole point on another — so a name pressed at half an amount would promise something
  // about a sample it cannot know. Both stand where the switch left them (P123, P121, P118).
  spark: 0,
  sparkLevel: 0.5,
  // And the spark sounding with the landing that threw it, which is what a spark did before it
  // could be held back: a delay of none is the two beginning together (0175). No region below
  // names it, and that is the written answer 0152 asks for rather than an omission — it is the
  // level's own argument said one step further along. Whether a second region of the loop is
  // better heard under its landing or a beat behind it is a fact about the material rather than
  // about the walk, and a name pressed at half an amount would promise something about a sample it
  // cannot know. It stands where the switch left it (P132, P123, P118).
  sparkDelay: 0,
  // A quarter of a second: the old default of one slot, on the four-second loop that default was
  // written against. A duration now, so it is that length on every loop (0119).
  burst: 0.25,
  vary: 0,
  // Every landing varied, once anything is varying at all: the chance is a maybe a hand reaches
  // for rather than something it has to undo before the Vary dial does anything (P87).
  varyChance: 1,
  rest: 0,
  // The roll is the author of the wait where the switch leaves it: no pulses placed, over the span
  // a bar of eight jumps is. So a switch pressed today lays down exactly the steps it laid before
  // a rest could be placed, and the pattern is a thing a hand reaches for (0163).
  //
  // No region below names either, and that is the written answer 0152 asks for rather than an
  // omission: a placed pattern is heard only once it has come round — a span of eight is eight
  // jumps before the figure repeats, and at half an amount a drawn one would be a different figure
  // again — so a name pressed on it would be a character a listener could not hear as one. It is
  // the argument the stride and the home were left out on. What the characters do say about a wait
  // is how long it is and how often it is taken, which is audible in one jump.
  restPulses: 0,
  restSpan: 8,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  // The rate walk, set to what the module did before it had one: every due change fires, over the
  // five rates the ladder used to be, leaping anywhere among them. So a switch pressed today
  // sounds like a switch pressed before 0118, and the three amounts behind the Hold dial are
  // things a hand reaches for rather than things it has to undo first.
  chance: 1,
  spread: 2,
  drift: PLAYER_RATE_RUNGS,
  // And no landing climbing its ladder, which is what a landing did before the rate could move
  // inside one: every repeat reads at the rung the jump let go onto, so a switch pressed today
  // sounds like a switch pressed before 0167. No region below names it, and that is the written
  // answer 0152 asks for rather than an omission: it is the ratchet's own argument, which is the
  // other amount that shapes what happens *inside* a landing rather than between two. Every knob a
  // character names is true of the pattern whatever it is playing — how far, how long, how hard
  // cut — while a climb is heard only across a landing's repeats and only where the spread is
  // open, so a name pressed at half an amount would be a character a listener could not hear as
  // one on the patterns that land once and move on. `slide` is deliberately still about the walk
  // between landings and not the ladder inside one (P118, P124).
  climb: 0,
  // No song, drawn or written: a switch press is one pattern and not an arrangement of them, and
  // an empty list is the whole of that where a hand types one, an `arrange` of zero where the
  // pattern would draw one (0153, 0158). Its keep is four for the reason the figure's is — the
  // number of times a run has to come round to be heard as a run — and its chance and its return
  // start at their own zero, so the first arrangement a person hears repeats exactly and then
  // moves on.
  //
  // The song is the one field here no character draws, which is why the two functions below take a
  // `PlayerVoice` and not these values entire; the four amounts beside it are drawn by no
  // character either, and deliberately — a part that could redraw the arrangement it is a part of
  // is the thing 0153 refused, so no region below names one (0158).
  song: [],
  // And every character in the cast, which is the identity: a drawn arrangement narrowed to
  // nobody is refused and one narrowed to somebody is a thing a hand asks for, so a switch press
  // leaves the field where it was before there was one to narrow (0174).
  cast: PLAYER_CAST_MAX,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  // And the loop where the hand put it. `bedEvery: 0` is the whole of "the ground never moves",
  // which is the module as it was before it could move at all, so a switch pressed today sounds
  // like a switch pressed before 0183 (0134's rule, said for the ground). The four beside it are
  // the walk one move would take if the period were opened — the middle of a bed's own ranges, the
  // way every other family's defaults are — so opening it alone is already a walk and not a
  // no-op needing three more dials first.
  //
  // Here for the reason the arrangement's four are: these are what a *double-click* snaps a dial
  // back to. A character press does not write them — all five are song knobs since 0184, and
  // `PLAYER_SONG_KNOBS` is what the press holds untouched (src/ui/PlayerCharacter.tsx), so
  // pressing a name leaves the ground where the hand put it rather than moving the loop under it.
  bed: 0,
  bedEvery: 0,
  bedDistance: 2,
  bedBias: 0,
  bedHome: 0,
} as const satisfies PlayerDefaults;

// The names themselves are declared in src/lib/playerCast.ts beside the cast their bits are the
// positions of (0174). What each name *means* is this file's, and that is the regions below.

// **No region names any of the five bed knobs, and since 0184 no region *may*:** they are song
// knobs, and the loop below throws at load on a region naming one, the way it does for `arrange`.
// The argument that put them there is the argument 0152 already asks for. A character says what a
// pattern is *like*; which bed of the source it is reading is a *where*, and two yards on two
// samples pressed under one name would be pointed at two unrelated places — so `bed` is out for the
// reason the seed is. And a period is not a texture: `bedEvery` at half an amount is a pattern that
// changes ground on a schedule nobody pressed a name for, which is the argument the ratchet and the
// climb are left out on. What the bed is for is one walk over the source that the whole song is
// read on, and that is what a hand writes rather than what a die draws (0158, 0184).

// Which knobs count rather than measure, and which one travels along a log curve, are read off
// `PLAYER_KNOB_DIALS` rather than kept here: they are the same two facts the dials that draw these
// knobs are built from, and a second list of them is a second answer nothing would report the
// divergence of (principle 1, 0153). `assertPlayer` in src/lib/player.ts is still the judge — it
// refuses a fractional count, and this file's suite puts every character's draw at every amount
// through it, so a knob whose step is wrong fails the gate rather than reaching a session as 3.7
// repeats.

/**
 * Where a knob sits a fraction of the way from one of its values to another — the one rule both
 * halves of this file move by, so drawing inside a region and blending back toward plain cannot
 * disagree about what "half way" means.
 *
 * Geometric along a log curve, arithmetic along a linear one — the curve the dial itself is drawn
 * on, read from `PLAYER_KNOB_DIALS`, so a knob's arithmetic and its dial cannot disagree. The
 * burst is the one knob that answers "log", because its range spans three orders of magnitude: half way from 250ms to
 * 10ms is 50ms by the ear and by the dial, where the arithmetic middle is 130ms — a knob that has
 * barely moved. Neither end can be zero, since the burst's own floor is `PLAYER_BURST_MIN`.
 */
const at = (knob: PlayerKnob, from: number, to: number, fraction: number): number => {
  // Both ends by name rather than by arithmetic. `from + (to - from) * 1` is not `to` in binary
  // floating point — 0.2 + (0.5 − 0.2) × 1 is 0.5000000000000001 — and the ends are the two values
  // this file promises exactly: all of a character is the character as it was drawn, and none of
  // it is `PLAYER_DEFAULTS`.
  if (fraction === PLAYER_AMOUNT_MIN) return from;
  if (fraction === PLAYER_AMOUNT_MAX) return to;
  const log = PLAYER_KNOB_DIALS[knob].curve === "log";
  const value = log ? from * (to / from) ** fraction : from + (to - from) * fraction;
  return isWholeKnob(knob) ? Math.round(value) : value;
};

/** One character: the span of every knob it has an opinion about, and nothing else. */
type Region = {
  /**
   * What the character is about, and nothing else: every knob it does not name is left at
   * `PLAYER_DEFAULTS`, so what moves on the card when a name is pressed is what the name means.
   * That is the whole of how this teaches — a person reads the character off the dials that
   * jumped, rather than off twenty tooltips.
   *
   * Each span is drawn inside rather than landed on, so pressing one name twice is two patterns
   * of one kind. A character is a region, which is what 0152 decided.
   */
  knobs: Partial<Record<PlayerKnob, readonly [low: number, high: number]>>;
};

/**
 * The regions themselves. Every bound is inside its knob's own declared range — the arithmetic
 * never clamps, because a character that had to be clipped to be legal would be a character whose
 * author was guessing.
 */
export const PLAYER_CHARACTER_REGIONS: Record<PlayerCharacter, Region> = {
  // Names no knob: the identity, and the way back.
  plain: { knobs: {} },
  // Stays where it is and hammers: the shortest bursts the ear still hears as timbre, held for
  // long counts, with the gate cutting most of each one.
  stutter: {
    knobs: {
      bias: [1, 1],
      distance: [1, 3],
      repeats: [8, 24],
      gate: [0.4, 0.9],
      burst: [0.01, 0.04],
    },
  },
  // The figure, doing what a figure is for: a short run kept for several passes, barely evolving,
  // and coming home more often than it branches (0151).
  riff: {
    knobs: {
      distance: [2, 6],
      phrase: [3, 6],
      phraseKeep: [3, 8],
      phraseChance: [0, 0.2],
      phraseReturn: [0.5, 1],
      repeats: [2, 6],
      burst: [0.1, 0.3],
    },
  },
  // Nowhere twice: the whole grid within reach, the rate let go of every few jumps, and a wait
  // that may or may not be taken so the rhythm never settles.
  scatter: {
    knobs: {
      distance: [12, 16],
      repeats: [1, 4],
      burst: [0.05, 0.25],
      vary: [0.05, 0.3],
      rest: [0, 2],
      restChance: [0.2, 0.5],
      hold: [1, 3],
      spread: [3, 4],
    },
  },
  // Long grains and the silence between them: few repeats, a wait most jumps take, and enough
  // stray in both that no two breaths are the same length.
  breathe: {
    knobs: {
      bias: [1, 1],
      distance: [2, 6],
      repeats: [1, 3],
      burst: [0.4, 1.2],
      vary: [0.1, 0.4],
      rest: [2, 4],
      restChance: [0.5, 1],
      restSpread: [0.2, 0.6],
    },
  },
  // The rate walk doing the work: a drift of one rung is the one setting that makes a pattern
  // slide between speeds rather than leap among them, held over several jumps at a time (0118).
  slide: {
    knobs: {
      bias: [1, 1],
      phrase: [0, 4],
      repeats: [4, 8],
      burst: [0.15, 0.4],
      hold: [2, 6],
      chance: [0.5, 1],
      spread: [3, 4],
      drift: [1, 1],
    },
  },
};

/**
 * The two things a region may not be about, answered at load rather than in prose (0122). A part
 * names a character, so a character that named one of the four amounts the song is drawn by would
 * be a part rewriting the song it is a part of — the claim 0153 refused for the written list, said for
 * the drawn one (0158) — and one that named a bed would be a part moving the loop the whole song is
 * read on (0184). Every other knob is fair game, the figure's four included: a figure is something
 * a part has, and an arrangement is the thing parts are in.
 */
for (const [character, region] of Object.entries(PLAYER_CHARACTER_REGIONS)) {
  const named = PLAYER_SONG_KNOBS.find((knob) => region.knobs[knob] !== undefined);
  if (named !== undefined) {
    throw new TypeError(
      `character ${character} names ${named}, which is the song's and not a part's`,
    );
  }
}

/**
 * The knobs one character has an opinion about, in the order the card draws them — which is the
 * set of dials that move when its name is pressed, and so the set a menu offers for shaping the
 * draw it just made (0153).
 *
 * Read off the region rather than listed beside it: what a character is about is the region's own
 * answer, and a second list of it would be a menu that went on offering a knob the character had
 * stopped naming (principle 1). `plain` names none, which is what makes it the identity — its menu
 * is empty because there is nothing about it to shape.
 */
export const characterKnobs = (character: PlayerCharacter): PlayerKnob[] => {
  const region = PLAYER_CHARACTER_REGIONS[character];
  return PLAYER_KNOBS.filter((knob) => region.knobs[knob] !== undefined);
};

/**
 * One draw from a character's region, at full strength — every knob it names taken from inside its
 * span, and every knob it does not left where the switch leaves it.
 *
 * `random` is the caller's for the reason `createFigure`'s is: this runs on a click and its result
 * travels in the command, so the session recorded is the session replayed (0089). Nothing on a
 * play-time or render path may call it.
 */
export function drawCharacter(
  character: PlayerCharacter,
  random: () => number,
  base: PlayerVoice = PLAYER_DEFAULTS,
): PlayerVoice {
  const region = PLAYER_CHARACTER_REGIONS[character];
  const knobs = fromIds(PLAYER_KNOBS, (knob) => {
    const span = region.knobs[knob];
    return span === undefined ? base[knob] : at(knob, span[0], span[1], random());
  });
  return knobs;
}

/**
 * The same draw, taken part of the way: every knob a fraction of the distance from plain to what
 * was drawn. The amount is applied to a drawn character rather than to a region, so dragging it
 * moves *this* pattern toward and away from plain instead of drawing a new one on every frame —
 * which is what makes it a control and not a die (0152).
 */
export function blendCharacter(
  target: PlayerVoice,
  amount: number,
  base: PlayerVoice = PLAYER_DEFAULTS,
): PlayerVoice {
  return fromIds(PLAYER_KNOBS, (knob) => at(knob, base[knob], target[knob], amount));
}

/**
 * How many knobs one signature names. Three, which is what a row can carry beside a name and a bar
 * without becoming a second list to read — and enough that two parts drawn from one character are
 * still told apart by where a hand took them afterwards.
 */
export const PLAYER_SIGNATURE_MAX = 3;

/**
 * Which of a part's own dials are furthest from plain, in that order: the honest answer to "which
 * part is which" for a part that carries a spec and no character (0176). A part could once say what
 * it was drawn as; it cannot now, and a label derived from the numbers would be an invention,
 * because a list of names has no nearest (0174). What the numbers *can* say is which of them a hand
 * moved most, which is a fact about the part and not a guess at one.
 *
 * Measured as a fraction of each knob's own declared range, because the ranges are nothing alike: a
 * burst is a second and a half at its widest and a distance is sixteen slots, so a raw difference
 * would say the same thing about every part whose distance was touched at all.
 *
 * A knob sitting exactly at plain is named by no signature, however few there are to name: what
 * this is *for* is the distance, so a part left at the switch's own values has no signature rather
 * than the first three knobs of the card reading as though they meant something (principle 5).
 *
 * Here rather than beside `SongPart` in src/lib/playerSong.ts, which is where a fact about parts
 * belongs: the ranges are in src/lib/playerKnobs.ts, which reads the arrangement's own bounds back
 * out of playerSong.ts, so a signature declared there would close a load-time import cycle. It sits
 * with `PLAYER_DEFAULTS` instead, which is the point it measures a distance from — the same
 * distance `blendCharacter` above travels.
 */
export function partSignature(voice: PartVoice): PlayerPartKnob[] {
  const away = new Map<PlayerPartKnob, number>();
  for (const knob of PLAYER_PART_KNOBS) {
    const dial = PLAYER_KNOB_DIALS[knob];
    const distance = Math.abs(voice[knob] - PLAYER_DEFAULTS[knob]) / (dial.max - dial.min);
    if (distance > 0) away.set(knob, distance);
  }
  // Three passes for the three furthest rather than a sort of all thirty-two: this runs on every
  // render of every row of a song, and a strict `>` is what keeps two knobs at one distance in the
  // order the card draws them.
  const named: PlayerPartKnob[] = [];
  while (named.length < PLAYER_SIGNATURE_MAX) {
    let furthest: PlayerPartKnob | null = null;
    for (const [knob, distance] of away) {
      if (furthest === null || distance > (away.get(furthest) ?? 0)) furthest = knob;
    }
    if (furthest === null) break;
    named.push(furthest);
    away.delete(furthest);
  }
  return named;
}
