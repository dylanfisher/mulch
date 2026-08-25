/**
 * @role The words under a jumps dial: what each of the spec's numbers is called and what turning
 *   it does. Beside src/lib/playerKnobs.ts, which is the ranges the same list is keyed by, and out
 *   of src/lib/copy.ts because that file is at the hard cap and a step that adds a knob adds words
 *   here (0045, P123).
 * @instead Every other word the interface says → src/lib/copy.ts, which is the instrument's own
 *   vocabulary. The range, fineness and curve each of these captions sits under →
 *   src/lib/playerKnobs.ts. What the numbers themselves mean → src/lib/player.ts.
 */
import type { PlayerKnob } from "./player.ts";

/**
 * What each of the player's numbers is called under its dial: one word, the way every
 * caption is, and the sentence beside it is what says the unit. Total over `PLAYER_KNOBS`,
 * checked in `src/ui/tooltips.test.ts`.
 */
export const PLAYER_KNOB_LABELS: Record<PlayerKnob, string> = {
  distance: "Distance",
  bias: "Bias",
  stride: "Stride",
  home: "Home",
  phrase: "Phrase",
  // "Keep" a second time, and allowed where "Hold" was not: the rule 0135 wrote is about two dials
  // a person can see at once, and these two are each behind a different framed plus — one door is
  // open at a time, and inside it the word means what it means everywhere in this module.
  phraseKeep: "Keep",
  phraseChance: "Chance",
  phraseReturn: "Return",
  repeats: "Repeats",
  repeatsChance: "Chance",
  repeatsSpread: "Spread",
  // Not "Hold", which is the rate walk's dial on the row this menu opens over — and two dials on
  // screen at once under one word are two nothing can tell apart, which is the rule that made the
  // wait's spread read "Spread" rather than "Vary" (0124, 0135).
  repeatsHold: "Keep",
  ratchet: "Ratchet",
  gate: "Gate",
  drop: "Drop",
  reverse: "Reverse",
  spark: "Spark",
  sparkLevel: "Level",
  burst: "Burst",
  vary: "Vary",
  varyChance: "Chance",
  rest: "Rest",
  restPulses: "Pulses",
  restSpan: "Span",
  restChance: "Chance",
  restSpread: "Spread",
  hold: "Hold",
  chance: "Chance",
  spread: "Spread",
  drift: "Drift",
  arrange: "Arrange",
  // "Keep", "Chance" and "Return" a third time each, and allowed on the same terms the second time
  // was: these three are behind the Arrange dial's own framed plus, one door is open at a time, and
  // inside it each word means what it means everywhere in this module (0135).
  arrangeKeep: "Keep",
  arrangeChance: "Chance",
  arrangeReturn: "Return",
};

/**
 * What turning each of them does, and in what unit. A slot is a sixteenth of the loop
 * (`PLAYER_SLOTS`), which is the unit four of these are measured in and the one thing about this
 * module no caption can hold. Total over `PLAYER_KNOBS`, checked in `src/ui/tooltips.test.ts`.
 */
export const PLAYER_KNOB_TOOLTIPS: Record<PlayerKnob, string> = {
  distance: "How far one jump may travel, in sixteenths of the loop.",
  bias: "Which way the pattern leans. In the middle it is as likely to go back as on; at either end every jump goes the one way, wrapping at the edge of the loop.",
  stride:
    "The odds one jump travels the whole distance rather than a number drawn inside it. All the way makes every jump the same size; with the lean at one end too, the pattern stops walking the loop and starts rotating it.",
  home: "The odds one jump goes back to the top of the loop instead of travelling. Zero never comes home; anything more keeps returning to one place and leaving it again.",
  phrase:
    "How many jumps make one figure the pattern lays down and then plays back, in sixteenths of the loop. Zero keeps no figure, and every jump is drawn fresh.",
  phraseKeep:
    "How many times one figure plays before the pattern lets go of it. Zero keeps one figure forever.",
  phraseChance:
    "The odds one jump of the figure moves each time it comes round. Zero plays the figure exactly; anything more makes it evolve as it repeats.",
  phraseReturn:
    "The odds a figure the pattern let go of is the first one again rather than a new one. Zero always branches somewhere new; one always comes home.",
  repeats:
    "How many times one landing sounds before the next jump. One is a landing that plays once.",
  repeatsChance:
    "The odds a repeat count that is due to be redrawn actually is. One redraws every time the keep is up; anything less leaves the count where it was.",
  repeatsSpread:
    "How far a redrawn count may stray from this dial, in repeats either way. Zero plays exactly the number the dial says.",
  repeatsHold:
    "How many jumps keep one repeat count before another is drawn. Zero keeps this one forever.",
  ratchet:
    "How much shorter each repeat of one landing is than the one before it. Zero holds them all the same length; anything more runs the landing out into the next jump sooner, and with the gate up its stutter accelerates as it goes.",
  gate: "How hard each repeat is cut into a stutter, from not at all to all but a sliver of it.",
  drop: "The odds one landing is silent and keeps its place anyway, so the pattern plays a hole rather than a wait. Zero sounds every landing.",
  reverse:
    "The odds one landing reads its slot backwards. Zero plays every landing the way the sample runs; anything more turns some of them around without moving where or how long they land.",
  spark:
    "The odds one landing throws a second, quieter one at another slot, so two regions of the loop sound at once and in rhythm. Zero sounds one region at a time.",
  sparkLevel:
    "How loud a spark is against the landing that threw it. All the way is two equal reads at once; none of it silences the spark and leaves the landing alone.",
  burst:
    "How long one landing sounds, in seconds — a reading under one second is milliseconds. The one length here the loop does not set, so a grain keeps its own colour whatever is looping.",
  vary: "How far that length may stray either way, in seconds — the burst's own unit, so the two dials read against each other. A reading under one second is milliseconds.",
  varyChance:
    "The odds one landing's length is varied at all. One varies every landing; anything less leaves some of them exactly as long as the burst says.",
  rest: "How long this yard waits between jumps, in sixteenths of the loop.",
  restPulses:
    "How many jumps of the span take a wait, spread as evenly over it as whole numbers allow. Zero leaves where the waits fall to the chance below; anything more places them, and the same figure comes round every span.",
  restSpan: "How many jumps one turn of that placement is spread over.",
  restChance:
    "The odds a wait is actually taken. One waits before every jump; anything less makes the wait a maybe and the rhythm uneven.",
  restSpread: "How far a taken wait may stray either way, as a fraction of it.",
  hold: "How many jumps hold one read rate before another is drawn. Zero holds one forever.",
  chance:
    "The odds a rate change actually happens once the hold is up. One always changes; anything less makes the hold a maybe rather than a promise.",
  spread:
    "How far the read rate may stray from this yard's own, in steps of the rate ladder. Zero never leaves it; the whole of it reaches an octave either way.",
  drift:
    "How far one rate change may travel from the rate it is on, in steps of the ladder. One slides to a neighbouring rate; the whole of it may leap anywhere the spread allows.",
  arrange:
    "How many parts the pattern arranges for itself, drawn from the seed rather than typed. Zero plays the arrangement you wrote; anything more draws its own and plays that instead.",
  arrangeKeep:
    "How many times one drawn arrangement plays before the pattern lets go of it. Zero keeps one arrangement forever.",
  arrangeChance:
    "The odds one part of a drawn arrangement is redrawn each time it comes round. Zero plays it exactly; anything more makes it evolve as it repeats.",
  arrangeReturn:
    "The odds an arrangement the pattern let go of is the first one again rather than a new one. Zero always writes something new; one always comes home.",
};
