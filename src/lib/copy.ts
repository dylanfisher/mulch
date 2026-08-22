/**
 * @role The words the interface says for the instrument's own nouns, and the pools a yard and an
 *   effect instance are named from — declared once here so no surface types the noun itself
 *   (plan P28).
 * @instead A command name, a state field or a durable key → those stay `deck`: this file is what
 *   the user reads, not what the code is called.
 */

// Over the soft cap, and every line over it is a word the interface says: the jumps card's seven
// captions and their sentences (P74) are copy, not structure, and splitting the instrument's
// vocabulary across two files is how a noun ends up declared twice (principle 1). Read and
// judged, far under the hard cap docs/map.md sets — see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

import type { PlayerKnob, PlayerVariation } from "@/lib/player";

/**
 * What a deck is called on screen. Every label, title and heading builds from this one word, and
 * it is Titlecase because every label in the instrument is (P29).
 */
export const YARD = "Yard";

/**
 * What the control that picks a yard's generator is called on screen — the menu's own name, and
 * the word it wears while nothing is loaded. It names what the entries are rather than the slot
 * they sit in: every one of them makes a sound from nothing (0110). Titlecase per (0059).
 */
export const GENERATOR_LABEL = "Generator";

/** What the gesture that writes the session archive is called on screen, Titlecase per (0059). */
export const EXPORT_SESSION = "Export Session";

/**
 * One yard, named the way a label names it: the noun and the id, in the case a reader sees. The
 * pattern lives here rather than at the twenty call sites that used to write `${YARD} ${deck}`,
 * so "Yard A" is one string built one way — a deck id is opaque and lower case is not part of it
 * (0029).
 */
export function yardLabel(deck: string): string {
  return `${YARD} ${deck.toUpperCase()}`;
}

/**
 * The pool a yard's emoji is drawn from when it is added: fixed, house-and-garden, and small
 * enough that repeats across many yards are expected. The emoji names a yard, it does not
 * identify it — the id does that (0029).
 */
export const YARD_EMOJI = ["🏡", "🌴", "🌵", "🌻", "🌳", "🪴", "🍅", "🐝", "🦋", "🌷"] as const;

/** The emoji the one deck a fresh session boots with carries — the pool's first, not a draw. */
export const INITIAL_YARD_EMOJI = YARD_EMOJI[0];

/**
 * The two halves a yard's name is drawn from: an adjective and a plant, joined with a space and
 * already Titlecase because every label in the instrument is (0059). Small pools, so repeats are
 * expected — the name names a yard, the id identifies it (0029).
 */
export const YARD_ADJECTIVES = [
  "Quiet",
  "North",
  "Low",
  "Bright",
  "Slow",
  "Wild",
  "Deep",
  "Warm",
  "Far",
  "Still",
] as const;

/** The other half. House-and-garden, like the emoji pool it is drawn beside. */
export const YARD_PLANTS = [
  "Fern",
  "Thicket",
  "Clover",
  "Willow",
  "Bramble",
  "Rush",
  "Sorrel",
  "Cedar",
  "Nettle",
  "Moss",
] as const;

/**
 * One draw from one fixed pool — the whole of the randomness a yard's decorations involve. The
 * pool is a non-empty tuple, so the entry the index lands on is the first one or a real member
 * and never undefined.
 */
const pick = <T>(pool: readonly [T, ...T[]]): T =>
  pool[Math.floor(Math.random() * pool.length)] ?? pool[0];

/**
 * How the two halves of a name are joined — once, so a fresh boot, a yard's draw and an effect
 * instance's draw agree forever on what a name built from two pools looks like.
 */
const twoPartName = (adjective: string, noun: string): string => `${adjective} ${noun}`;

/**
 * Draw one yard's emoji and one yard's name. Both are called from the call site that mints the
 * id (`src/ui/App.tsx`) and travel in `deck.add`, because a reducer that drew its own would make
 * replay, restore and the fingerprint non-deterministic (0057). What is declared here is the
 * pools and the shape of the result; when to draw stays the caller's.
 */
export const mintYardEmoji = (): string => pick(YARD_EMOJI);
export const mintYardName = (): string => twoPartName(pick(YARD_ADJECTIVES), pick(YARD_PLANTS));

/**
 * The name the one deck a fresh session boots with carries: a draw like any other yard's, taken
 * once as this module loads so every store a boot creates agrees on it. The emoji beside it stays
 * the pool's first — the name is a draw, the house is not (P47).
 */
export const INITIAL_YARD_NAME = mintYardName();

/** The two pools one kind of effect names its instances from — an adjective and a noun. */
export type NamePools = {
  /** What that kind of effect does to the sound, said as a word: one half of every name. */
  adjectives: readonly [string, ...string[]];
  /** The garden thing it is likened to. Disjoint across effects, which is what makes a name say
   *  which kind of thing it names when it is read on its own. */
  nouns: readonly [string, ...string[]];
};

/**
 * The pools each effect type's instances are named from, keyed by the registry's own effect id.
 * Two pools multiplied rather than one flat list of pairs, the way a yard's name already is
 * (P55): a rack of five delays runs out of distinct readings from eight fixed pairs and does not
 * from six adjectives times six nouns. The adjectives say what that kind of effect does — a
 * delay's about distance and return, a filter's about narrowing, an eq's about shaping — and the
 * noun pools are disjoint by construction, so a delay and a filter can never draw the same name.
 *
 * Keyed by plain string because `EffectId` lives in `src/audio` and lib may not import it
 * (docs/map.md); that every registered effect has both pools is checked where both are reachable,
 * in `src/audio/effects/registry.test.ts`.
 */
export const EFFECT_NAMES: Record<string, NamePools> = {
  delay: {
    adjectives: ["Far", "Returning", "Echoing", "Trailing", "Distant", "Answering"],
    nouns: ["Well", "Barrel", "Steps", "Hollow", "Path", "Fence"],
  },
  filter: {
    adjectives: ["Narrow", "Close", "Shaded", "Sifted", "Woven", "Tight"],
    nouns: ["Hedge", "Trellis", "Sieve", "Gate", "Screen", "Lattice"],
  },
  eq: {
    adjectives: ["Tilted", "Raised", "Banked", "Carved", "Terraced", "Levelled"],
    nouns: ["Bed", "Spiral", "Trap", "Border", "Mound", "Verge"],
  },
  compressor: {
    adjectives: ["Pressed", "Packed", "Tamped", "Rolled", "Bound", "Held"],
    nouns: ["Bale", "Press", "Clamp", "Roller", "Sack", "Crate"],
  },
  reverb: {
    adjectives: ["Open", "Wide", "Vaulted", "Drifting", "Washed", "Carrying"],
    nouns: ["Barn", "Chamber", "Silo", "Grotto", "Cloister", "Meadow"],
  },
  tape: {
    adjectives: ["Worn", "Warped", "Wound", "Smudged", "Aged", "Slipping"],
    nouns: ["Reel", "Spool", "Ribbon", "Furrow", "Coil", "Loam"],
  },
};

/**
 * A string folded to a non-negative integer — FNV-1a, in the 32 bits `Math.imul` gives exactly.
 * It exists to index a pool — or a waveform (src/lib/moire.ts) — from an opaque id, so what it
 * needs is to be the same everywhere and to spread short ids that differ in one character; it is
 * not a checksum and nothing durable rests on it.
 */
export function fold(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.codePointAt(index)!, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The name one effect instance wears: one adjective and one noun from its effect's two pools,
 * both indexed by the instance's own durable id (0076). The draw is a pure function of that id
 * rather than a `Math.random()` at the call site, so the name is the same after a drag, a reload
 * and an archive without a durable field to carry it, and replay stays deterministic (0057). An
 * effect with no pools is a registry entry this file was never told about, which is a missing
 * pool and not a nameless effect.
 *
 * The two indices come from one fold: the remainder picks the adjective and the quotient picks
 * the noun, so the halves move independently and the whole product of the pools is reachable.
 */
export function effectName(effect: string, instance: string): string {
  // Asked of the record itself, not of what it inherits: `EFFECT_NAMES.constructor` is a function
  // no pools declared, and drawing from it would read `undefined` as a name (principle 5).
  const pools = Object.hasOwn(EFFECT_NAMES, effect) ? EFFECT_NAMES[effect] : undefined;
  if (pools === undefined) throw new Error(`no name pool for effect ${effect}`);
  const hash = fold(instance);
  const { adjectives, nouns } = pools;
  const adjective = adjectives[hash % adjectives.length] ?? adjectives[0];
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length] ?? nouns[0];
  return twoPartName(adjective, noun);
}

/**
 * What the Export Audio dialog offers as a filename: the yard being exported, said the way the
 * interface says it, and the bytes it is playing. Derived every time the dialog opens and stored
 * nowhere — a filename is not session state (P40). A yard playing no blob is its name alone.
 */
export const exportAudioName = (yard: string, blobId: string | null): string =>
  blobId === null ? yard : `${yard} ${blobId}`;

/**
 * What each debug counter counts and in what unit, keyed by the name that counter is labelled
 * with in `src/ui/DebugConsole.tsx`. A four-letter label over a number says neither, and the two
 * counters a browser can decline to answer read as a dash, which is a reading nobody guesses
 * (0063) — so the sentence says that too. The words live here with the rest of the copy rather
 * than inline at the label, and that every counter has exactly one is checked in the console's
 * own test.
 */
export const COUNTER_TOOLTIPS: Record<string, string> = {
  frame: "How long the last frame's work took, in milliseconds. Measured only while this is open.",
  events: "Events stamped since the instrument booted.",
  dropped: "Events that have fallen out of the ring, and so out of an exported log.",
  queued: "Scheduled envelopes still waiting for a pump.",
  decoding: "Loads the browser is still decoding into audio.",
  analyzing: "Decoded buffers the analysis worker has not answered for yet.",
  context: "What the audio clock is doing, or none for a session running with no graph at all.",
  clock: "The audio clock every envelope is scheduled against, in seconds.",
  audio:
    "The audio thread's average load, as a percent. A dash means nothing is measuring it yet, or this browser will not report it.",
  heap: "The JavaScript heap in megabytes. A dash means this browser does not expose it.",
  buffers: "What the decode cache's buffers weigh, in megabytes. Zero here is a measured zero.",
};

/**
 * The units a recurrence is said in, smallest first, each with what one of it is worth in
 * seconds. The scale escalates past the point where a duration is a duration: a pattern of a few
 * lanes over one loop lines up again on the order of geological time, and the honest answer is
 * the comparative rather than a figure nobody can hold. It is said straight — one unit and one
 * figure, no breakdown, and no unit named twice. A light year is a distance; it is on the scale
 * because that is where this number has got to, and the last entry is what the estimate reads
 * once it has stopped being one (src/lib/moire.ts).
 */
export const DURATION_SCALE = [
  ["seconds", 1],
  ["minutes", 60],
  ["hours", 3600],
  ["days", 86_400],
  ["months", 2_629_746],
  ["years", 31_556_952],
  ["centuries", 3_155_695_200],
  ["millennia", 31_556_952_000],
  ["geological epochs", 157_784_760_000_000],
  ["light years", 9_460_730_472_580_800],
  ["the age of the universe", 435_130_167_840_000_000],
] as const satisfies readonly [DurationUnit, ...DurationUnit[]];

/** One rung of that scale: what it is called, and what one of it is worth in seconds. */
export type DurationUnit = readonly [unit: string, secs: number];

/**
 * What each parameter is and in what unit, keyed by the registry's own parameter id. An eyebrow
 * label is one word over a dial — it names the knob, it does not say what turning it does or what
 * the number under it is measured in, and that is the sentence a tooltip carries (P65).
 *
 * Keyed by plain string because `ParamId` lives in `src/audio` and lib may not import it
 * (docs/map.md), exactly as `EFFECT_NAMES` above is; that every registered parameter has one is
 * checked where both lists are reachable, in `src/ui/tooltips.test.ts`.
 */
export const PARAM_TOOLTIPS: Record<string, string> = {
  "deck.gain": "How loud this yard plays, as a multiplier. 1 is the sound as it was loaded.",
  "deck.pan": "Where the yard sits between the speakers, from -1 hard left to 1 hard right.",
  "deck.speed": "How fast the sample is read, as a multiplier. It moves the pitch with it.",
  "deck.pitch": "How far the sample is transposed, in semitones. It moves the speed with it.",
  "deck.tone": "The pitch a tone sounds at, in hertz — and the rate any other source is read at.",
  "filter.cutoff": "Where the low-pass filter starts cutting, in hertz.",
  "delay.time": "How long each repeat waits before it sounds, in seconds.",
  "delay.feedback": "How much of each repeat is fed back in, so how many repeats there are.",
  "delay.mix": "How much of the delayed sound is heard beside the dry one, from none to all.",
  "eq.frequency": "The frequency the band lifts or cuts around, in hertz.",
  "eq.gain": "How far that band is lifted or cut, in decibels.",
  "eq.q": "How narrow the band is. Higher is a tighter piece of the spectrum.",
  "comp.threshold": "The level above which the compressor starts pressing, in decibels.",
  "comp.ratio": "How hard it presses what is over the threshold, as a ratio to 1.",
  "comp.attack":
    "How long it takes to start pressing once a sound crosses the threshold, in seconds.",
  "comp.release": "How long it takes to stop pressing once the sound falls back, in seconds.",
  "comp.knee": "How gradually the pressing comes in around the threshold, in decibels.",
  "comp.output": "How much level is put back after the pressing, in decibels.",
  "reverb.decay": "How long the room takes to fall away, in seconds.",
  "reverb.tone": "Where the room's tail starts darkening, in hertz.",
  "reverb.predelay": "How long the room waits before it answers, in seconds.",
  "reverb.wet": "How much of the room is heard beside the dry sound, from none to all.",
  "tape.time": "How far the tape head is from the record head, as a delay in seconds.",
  "tape.feedback": "How much of the tape's output is wound back onto it, so how long it runs on.",
  "tape.tone": "Where each pass through the tape starts darkening, in hertz.",
  "tape.drive": "How hard the tape is hit, as a multiplier. Higher is more saturation.",
  "tape.wow": "How far the tape's speed wanders, as a fraction of the delay time.",
  "tape.hiss": "How much tape noise is printed under the sound, from none to all.",
  "tape.amount": "How much of the tape is heard beside the dry sound, from none to all.",
};

/**
 * What each action does, keyed by the same key its picture is filed under in
 * `src/ui/icons.ts` — one action, one icon, one sentence, so a control that borrows the picture
 * borrows the words with it and no surface writes a second explanation of the same action
 * (0055, P65). That every icon in the vocabulary has one is checked in `src/ui/tooltips.test.ts`.
 */
export const ACTION_TOOLTIPS = {
  play: "Start this yard from where its playhead is.",
  pause: "Hold the playhead where it is. Playing again carries on from there.",
  stop: "Send the playhead back to the top of the loop.",
  loop: "Repeat the stretch between the IN and OUT handles instead of playing through.",
  crop: "Make the loop the whole of this yard's sound. What is outside it is gone.",
  flatten:
    "Play this yard's loop once through everything it is going through, and keep that as its sound. The rack, the lanes and the speed come off, because they are in it now.",
  snap: "Pull a loop edge onto the nearest beat the analysis found.",
  reorder: "Drag to move this along its list, or use the arrow keys on it.",
  more: "Open the rest of this control's settings.",
  add: "Add another one.",
  remove: "Take this one away.",
  rename: "Change what this is called.",
  capture: "Keep this yard's whole setting as a clip you can put back later.",
  duplicate: "Make a second one with the same settings.",
  reseed:
    "Draw a new seed. The whole pattern unfolds from that one number, so this gives a different pattern and leaves every other setting where it is.",
  collapse: "Fold this section away, or open it again.",
  apply: "Put this clip's settings onto a yard.",
  goTo: "Scroll to this yard.",
  debugConsole: "Show what the audio thread, the event ring and the decode cache are doing.",
  undo: "Take back the last thing you did.",
  redo: "Do again what was just taken back.",
  exportSession: "Write the whole session out as a portable archive.",
  exportLog: "Write the event ring out as a JSONL log.",
  exportAudio: "Render what the session is playing to a .wav file.",
  openSession: "Load a session archive back in, replacing what is here.",
} as const satisfies Record<string, string>;

/**
 * The three gestures the whole instrument's transport offers, in the order the header draws
 * them. Declared here rather than beside the icons because `src/lib` cannot read `src/ui`, and
 * the words below and the buttons above have to be keyed by one list (P66).
 */
export const TRANSPORT_ACTIONS = ["play", "pause", "stop"] as const;
export type TransportAction = (typeof TRANSPORT_ACTIONS)[number];

/**
 * What the header's three transport buttons are called. They carry an icon and no word — the bar
 * they sit on is a menubar, not a row of captions — so this is the accessible name and the one
 * place it is written, Titlecase like every other label (0059).
 */
export const TRANSPORT_ALL_LABELS: Record<TransportAction, string> = {
  play: `Play Every ${YARD}`,
  pause: `Pause Every ${YARD}`,
  stop: `Stop Every ${YARD}`,
};

/**
 * What the header's transport does, keyed by the same three actions the icon vocabulary files
 * their pictures under — the same words as a yard's own row would be wrong, because these move
 * every yard at once and that is the whole difference a person needs told (P66). Total over
 * `TRANSPORT_ACTIONS`, checked in `src/ui/tooltips.test.ts`.
 */
export const TRANSPORT_ALL_TOOLTIPS: Record<TransportAction, string> = {
  play: `Start every ${YARD.toLowerCase()} from where its playhead is. One already playing starts again, so they all line up.`,
  pause: `Hold every ${YARD.toLowerCase()} where it is. Playing again carries on from there.`,
  stop: `Send every ${YARD.toLowerCase()}'s playhead back to the top of its loop.`,
};

/**
 * What the module that moves where inside its loop a yard reads from is called on screen. Not
 * "Player": the word names no behaviour, and every other yard would then be a player too. What it
 * does is jump (0089), so that is the noun — plural, like the "Effects" heading beside it, and
 * Titlecase like every label (0059). Decided here so the card, its switch and its sentences all
 * say one word (P74).
 */
export const PLAYER_LABEL = "Jumps";

/**
 * The switch that holds or clears a yard's pattern, which is a state and so carries no icon of
 * its own (0055). It is the durable half of the card — folding the card is a view preference and
 * says nothing to the instrument — so the sentence has to say that switching it off takes the
 * pattern away rather than hiding it (P74).
 */
export const PLAYER_TOOLTIP = `On sets this ${YARD.toLowerCase()} reading from a new place inside its loop as it plays, on a pattern of its own. Off clears that pattern and the loop plays through as it was.`;

/**
 * What each of the player's seven numbers is called under its dial: one word, the way every
 * caption is, and the sentence beside it is what says the unit. Total over `PLAYER_KNOBS`,
 * checked in `src/ui/tooltips.test.ts`.
 */
export const PLAYER_KNOB_LABELS: Record<PlayerKnob, string> = {
  distance: "Distance",
  repeats: "Repeats",
  gate: "Gate",
  burst: "Burst",
  vary: "Vary",
  rest: "Rest",
  hold: "Hold",
  chance: "Chance",
  spread: "Spread",
  drift: "Drift",
};

/**
 * What turning each of them does, and in what unit. A slot is a sixteenth of the loop
 * (`PLAYER_SLOTS`), which is the unit four of these are measured in and the one thing about this
 * module no caption can hold. Total over `PLAYER_KNOBS`, checked in `src/ui/tooltips.test.ts`.
 */
export const PLAYER_KNOB_TOOLTIPS: Record<PlayerKnob, string> = {
  distance: "How far one jump may travel, in sixteenths of the loop.",
  repeats:
    "The most times one landing sounds before the next jump. One is a landing that plays once.",
  gate: "How hard each repeat is cut into a stutter, from not at all to all but a sliver of it.",
  burst:
    "How long one landing sounds, in seconds — a reading under one second is milliseconds. The one length here the loop does not set, so a grain keeps its own colour whatever is looping.",
  vary: "How far that length may vary either way, as a fraction of it.",
  rest: "How long this yard waits between jumps, in sixteenths of the loop.",
  hold: "How many jumps hold one read rate before another is drawn. Zero holds one forever.",
  chance:
    "The odds a rate change actually happens once the hold is up. One always changes; anything less makes the hold a maybe rather than a promise.",
  spread:
    "How far the read rate may stray from this yard's own, in steps of the rate ladder. Zero never leaves it; the whole of it reaches an octave either way.",
  drift:
    "How far one rate change may travel from the rate it is on, in steps of the ladder. One slides to a neighbouring rate; the whole of it may leap anywhere the spread allows.",
};

/**
 * What the one gesture on the card that is neither a state nor a number is called. Its sentence
 * is in `ACTION_TOOLTIPS` above, under the key its picture is filed under: it borrowed the copy
 * icon and the copy sentence and so said something else entirely, and one action carries one
 * icon and one sentence or it carries neither (0055, P74).
 */
export const RESEED_LABEL = "Reseed";

/**
 * What the three amounts behind the Hold dial are called together — the popover's own title and
 * the name of the control that opens it (0118). Titlecase per (0059).
 */
export const PLAYER_RATE_LABEL = "Rate";

/**
 * What each of the player's two walks does. Neither carries an icon — a variation is a choice
 * between two named things, not an action (0055) — so the words are all there is, and the two
 * being told apart is the whole reason this control has a tooltip. Total over
 * `PLAYER_VARIATIONS`, checked in `src/ui/tooltips.test.ts`.
 */
export const PLAYER_VARIATION_TOOLTIPS: Record<PlayerVariation, string> = {
  forward: "Jump only forwards through the loop's sixteenths, wrapping at the end.",
  wander: "Jump either way from where the last one landed.",
};

/**
 * The rack switch, which is a state and so carries no icon of its own (0055): on is the effect
 * running, off is it bypassed, and the sentence is what says which way round that reads.
 */
export const BYPASS_TOOLTIP =
  "On is this effect running. Off bypasses it, and it keeps every value it is set to.";

/**
 * The moiré strip's estimate, which is a number in a unit nobody expects: it escalates past the
 * point where a duration is a duration, so the sentence has to say both that it is an estimate
 * and what the unit beside it means (0080).
 */
export const RECURRENCE_TOOLTIP =
  "An estimate of how long everything drawn beside it — every lane, every effect in the rack and the loop itself — takes to line up again. The unit escalates as far as it has to — past years into geological time — because a few rows over one loop rarely come back round inside a lifetime.";

/**
 * The shared jump clock: two controls on the header, and neither is a parameter or an action, so
 * their words live here beside the rack's switch rather than in either registry (0097, P65).
 * The switch is a state and carries no icon (0055); the dial says what its seconds buy.
 */
export const SYNC_LABEL = "Sync";
export const SYNC_PERIOD_LABEL = "Every";
export const SYNC_TOOLTIP =
  "On makes every jumping yard begin its next jump on one shared clock, so they land together while each keeps its own pattern. Off leaves each yard keeping its own time.";
export const SYNC_PERIOD_TOOLTIP =
  "How often that shared clock ticks, in seconds. A yard waits for the next tick after its burst is over, so a slower clock gathers more of them onto the same instant.";

/** What the moiré strip and the overlay it opens are called on screen, Titlecase per (0059). */
export const MOIRE_STRIP = "Drift";
export const MOIRE_OVERLAY = "Drift In Full";
