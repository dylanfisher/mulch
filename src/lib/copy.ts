/**
 * @role The words the interface says for the instrument's own nouns, and the pools a yard and an
 *   effect instance are named from — declared once here so no surface types the noun itself
 *   (plan P28).
 * @instead A command name, a state field or a durable key → those stay `deck`: this file is what
 *   the user reads, not what the code is called. The caption and the sentence under a jumps dial →
 *   src/lib/copyKnobs.ts, which is keyed by `PLAYER_KNOBS` and is where a new knob's words go. What
 *   a take is called → src/lib/exportName.ts, which assembles a filename rather than a sentence.
 */

// Over the soft cap, and every line over it is a word the interface says. The one thing that has
// been split off is the two records keyed by `PLAYER_KNOBS` — a caption and a sentence per dial,
// which is a list rather than a noun and which grows by two lines every time the jumps spec grows a
// field (src/lib/copyKnobs.ts, P123). What is left is the instrument's vocabulary, and it stays in
// one file because splitting *that* is how a noun ends up declared twice (principle 1). Read and
// judged, far under the hard cap docs/map.md sets — see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

import type { PlayerCharacter } from "@/lib/playerCast";
import { PLAYER_KNOB_LABELS } from "./copyKnobs.ts";
import { DURABLE_TEXT_MAX } from "./guards.ts";
import type { SongPart, SongPartId } from "@/lib/playerSong";

/**
 * What a deck is called on screen. Every label, title and heading builds from this one word, and
 * it is Titlecase because every label in the instrument is (P29).
 */
export const YARD = "Yard";

/**
 * What the group of generators is called inside the source menu — it names what those entries
 * are rather than the slot they sit in: every one of them makes a sound from nothing (0110).
 * Titlecase per (0059).
 */
export const GENERATOR_LABEL = "Generator";

/**
 * What the yard's one audio-source control is called on screen — the menu's own name, and the
 * word it wears while nothing is loaded. It is not the generators' word any more: the same menu
 * now carries the import that used to stand beside it, so it is named after the slot rather than
 * after half of what fills it (P98). Titlecase per (0059).
 */
export const SOURCE_LABEL = "Source";

/** What the gesture that reads a file into a yard is called on screen, Titlecase per (0059). */
export const IMPORT_AUDIO = "Import Audio";

/** What the gesture that writes the session archive is called on screen, Titlecase per (0059). */
export const EXPORT_SESSION = "Export Session";

/** What the gesture that renders the session to a .wav is called on screen, Titlecase per (0059). */
export const EXPORT_AUDIO = "Export Audio";

/**
 * The Export Audio dialog's one checkbox: whether the session archive leaves in the folder beside
 * the audio, so a take and the performance that made it are one thing to keep (P91). Titlecase
 * per (0059), and it says what lands rather than what is switched on.
 */
export const EXPORT_WITH_SESSION = "Include Session";

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
 * One pool, written as a line of words rather than a line per word. The pools are long enough now
 * (0149) that a literal array of each is most of this file, and the hard cap docs/map.md sets is
 * not a judgment call. Split once as the module loads and returned as the non-empty tuple the
 * draw indexes; a line with a gap in it is a pool with an empty reading in it, and says so.
 */
const words = (line: string): readonly [string, ...string[]] => {
  const [first, ...rest] = line.split(" ");
  if (first === undefined || first === "" || rest.includes("")) {
    throw new Error(`name pool has a gap in it: "${line}"`);
  }
  return [first, ...rest];
};

/**
 * The pool a yard's emoji is drawn from when it is added: fixed, house-and-garden, and widened
 * with the name pools it is drawn beside (0149) so a session's worth of yards does not wear the
 * same picture twice as soon as it used to. The emoji names a yard, it does not identify it —
 * the id does that (0029) — so a repeat far enough down a long session is still only a repeat.
 */
export const YARD_EMOJI = words(
  "🏡 🌴 🌵 🌻 🌳 🪴 🍅 🐝 🦋 🌷 🌲 🌿 🍄 🌾 🐌 🐞 🌼 🥕 🍐 🪵 🪺 🐛 🌸 🧺",
);

/** The emoji the one deck a fresh session boots with carries — the pool's first, not a draw. */
export const INITIAL_YARD_EMOJI = YARD_EMOJI[0];

/**
 * The two halves a yard's name is drawn from: an adjective and a plant, joined with a space and
 * already Titlecase because every label in the instrument is (0059). Twenty-four of each is 576
 * readings, so the first repeat is expected somewhere around the thirtieth yard rather than the
 * twelfth (0149) — past a session's worth of yards, which is all the pools are asked for. The
 * name names a yard, the id identifies it (0029).
 */
export const YARD_ADJECTIVES = words(
  "Quiet North Low Bright Slow Wild Deep Warm Far Still South High Soft Dim Green Damp Dry Old Near Cool Pale Sheltered Windy Hidden",
);

/** The other half. House-and-garden, like the emoji pool it is drawn beside. */
export const YARD_PLANTS = words(
  "Fern Thicket Clover Willow Bramble Rush Sorrel Cedar Nettle Moss Hedgerow Alder Bracken Heather Ivy Laurel Birch Foxglove Yarrow Thistle Reed Hawthorn Lichen Orchard",
);

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
 * from twelve adjectives times twelve nouns. The adjectives say what that kind of effect does — a
 * delay's about distance and return, a filter's about narrowing, an eq's about shaping — and the
 * noun pools are disjoint by construction, so a delay and a filter can never draw the same name.
 * Twelve of each is 144 readings per kind, so two instances of one kind reading alike is expected
 * somewhere past the twelfth rather than at the seventh (0149) — further than any rack goes.
 *
 * Keyed by plain string because `EffectId` lives in `src/audio` and lib may not import it
 * (docs/map.md); that every registered effect has both pools is checked where both are reachable,
 * in `src/audio/effects/registry.test.ts`.
 */
export const EFFECT_NAMES: Record<string, NamePools> = {
  delay: {
    adjectives: words(
      "Far Returning Echoing Trailing Distant Answering Repeating Lagging Ringing Bouncing Doubling Following",
    ),
    nouns: words(
      "Well Barrel Steps Hollow Path Fence Corridor Ravine Cistern Landing Alley Cavern",
    ),
  },
  filter: {
    adjectives: words(
      "Narrow Close Shaded Winnowed Woven Tight Combed Strained Pinched Cropped Slotted Threaded",
    ),
    nouns: words("Hedge Trellis Sieve Gate Screen Lattice Grille Mesh Weir Vent Louvre Riddle"),
  },
  eq: {
    adjectives: words(
      "Tilted Raised Banked Carved Terraced Levelled Leaning Graded Tiered Shaped Dished Stepped",
    ),
    nouns: words("Bed Spiral Trap Border Mound Verge Ridge Trough Plot Slope Swale Shelf"),
  },
  compressor: {
    adjectives: words(
      "Flattened Packed Tamped Crushed Cramped Held Squeezed Compact Weighted Cinched Firm Loaded",
    ),
    nouns: words("Bale Press Clamp Roller Sack Crate Vice Barrow Bundle Churn Mangle Kiln"),
  },
  reverb: {
    adjectives: words(
      "Open Wide Vaulted Drifting Washed Carrying Hollowed Spacious Cavernous Billowing Airy Lofted",
    ),
    nouns: words(
      "Barn Chamber Silo Grotto Cloister Meadow Hall Quarry Cellar Courtyard Basin Glasshouse",
    ),
  },
  tape: {
    adjectives: words(
      "Worn Warped Slackened Smudged Aged Slipping Faded Creased Wavering Sagging Dusted Grainy",
    ),
    nouns: words("Reel Spool Ribbon Furrow Coil Loam Groove Thread Winder Strand Bobbin Rut"),
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
 * once it has stopped being one (src/lib/recurrence.ts).
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
  add: "Add another one.",
  remove: "Take this one away.",
  rename: "Change what this is called.",
  skip: "Keep this in the list and pass over it. Press again to play it.",
  audition: "Hear this on its own, without playing the rest.",
  capture: "Keep this yard's whole setting as a clip you can put back later.",
  duplicate: "Make a second one with the same settings.",
  reseed:
    "Draw a new seed. The whole pattern unfolds from that one number, so this gives a different pattern and leaves every other setting where it is.",
  character:
    "Set every dial at once to something that sounds like a name you pick, and say how much of it to take. The seed stays where it is, so this changes what the pattern is like rather than which performance it is.",
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
 * "Player": the word names no behaviour, and every other yard would then be a player too.
 *
 * **P130:** and not "Jumps" either. A jump is the unit this module is *counted* in — a part lasts
 * so many of them, which is `PLAYER_PART_LENGTH_LABEL` below — so naming the module after it left
 * one word answering two questions on one card. The module chews a loop up and lays it back down,
 * so it is the Mulcher: the instrument's own noun, and the only heading on a yard that is not a
 * plural of what is under it. Titlecase like every label (0059). Decided here so the card's
 * heading, its switch and its sentences all say one word (P74, 0107).
 */
export const PLAYER_LABEL = "Mulcher";

/**
 * The eyebrow over each bordered group of that card's dials, in the order the card draws them.
 * Four questions rather than fourteen controls at one distance from each other: where a landing
 * goes, what it sounds like, how it is timed, how it is arranged. A dial added to the module joins
 * one of these — the card has no ungrouped row left to put it on (0173). The first key is
 * `landing` and not `travel`: `PLAYER_TRAVEL_KNOBS` (src/lib/playerKnobs.ts) is the three amounts
 * behind the Distance dial's own marker, and one word for two partitions of one module is the
 * drift this file exists to prevent.
 */
export const PLAYER_GROUP_LABELS = {
  landing: "Where It Lands",
  sound: "How It Sounds",
  timing: "How It Is Timed",
  arrange: "How It Is Arranged",
} as const;

/**
 * The picture of the walk at the top of that card, and the sentence saying how to read it. Not
 * "Map" and not "Pattern": what it draws is the run of landings the walk has already decided, so
 * it is that walk seen from the side — the one surface on the instrument that shows what the
 * module is about to do rather than what it is doing. Titlecase like every label (0059).
 */
export const PLAYER_SCOPE_LABEL = "The Walk";

/**
 * How to read it, in one sentence: what a block is, what its splits are, and the three states a
 * landing can be in that a shape rather than a colour says. The picture is fine enough that
 * nobody reads it right at a glance, which is exactly the case a sentence is for (0080, P65).
 */
export const PLAYER_SCOPE_TOOLTIP = `Each block is one landing, on the slot of the loop it reads: its width is how long it sounds, its splits are its repeats, a hollow one is a hole, a ghost is a spark and the line joining two of them is the wait between. The lit one is sounding; everything to the right of it is what the pattern has already decided to play next.`;

/**
 * The fan in the Where It Lands box, and what it is counting. Named for what it shows rather than
 * for the dials that shape it: `PLAYER_GROUP_LABELS.landing` already names the box, and a second
 * word for "travel" on one card is the drift this file exists to prevent.
 */
export const PLAYER_REACH_LABEL = "Reach";

/**
 * And the sentence: this is odds and not a reading, which is the one thing about it that could be
 * misread as the pattern's own state. It is what the four travel dials come to before any of them
 * is turned, which is the only thing on the card that says what the walk *might* do.
 */
export const PLAYER_REACH_TOOLTIP = `How far the next jump can go from wherever the pattern is standing, and how often it goes that far — the four amounts in this box read as odds rather than as a jump. The top leg is the likeliest.`;

/**
 * The two sections beside the jumps card, and the box a command is typed into. Each was written
 * twice at its own surface — once as the accessible name and once as the word on screen — which is
 * the drift `PLAYER_LABEL` above was declared to prevent. Titlecase like every label (0059).
 */
export const EFFECTS_LABEL = "Effects";
export const CLIPS_LABEL = "Clips";

/**
 * A fresh clip's name: the noun and its ordinal, minted where the yard's name is minted rather
 * than at the surface that sends the command. Lower case, because it is a value a person renames
 * rather than a label the interface says — the Titlecase noun above is the label (0059).
 */
export const mintClipName = (held: number): string =>
  `${CLIPS_LABEL.slice(0, -1).toLowerCase()} ${held + 1}`;
export const COMMAND_PALETTE_LABEL = "Command Palette";

/**
 * The switch that holds or clears a yard's pattern, which is a state and so carries no icon of
 * its own (0055). It is the durable half of the card — folding the card is a view preference and
 * says nothing to the instrument — so the sentence has to say that switching it off takes the
 * pattern away rather than hiding it (P74).
 */
export const PLAYER_TOOLTIP = `On sets this ${YARD.toLowerCase()} reading from a new place inside its loop as it plays, on a pattern of its own. Off clears that pattern and the loop plays through as it was.`;

/**
 * What the one gesture on the card that is neither a state nor a number is called. Its sentence
 * is in `ACTION_TOOLTIPS` above, under the key its picture is filed under: it borrowed the copy
 * icon and the copy sentence and so said something else entirely, and one action carries one
 * icon and one sentence or it carries neither (0055, P74).
 */
export const RESEED_LABEL = "Reseed";

/**
 * What the number a pattern unfolds from is called where the card reads it out. It stands beside
 * the heading in muted text rather than behind the fold, so the one number that makes a
 * performance reproducible is legible without opening anything (0089, P98). Titlecase per (0059).
 */
export const SEED_LABEL = "Seed";

/**
 * What the three amounts behind the Hold dial are called together — the popover's own title and
 * the name of the control that opens it (0118). Titlecase per (0059).
 */
export const PLAYER_RATE_LABEL = "Rate";

/**
 * What the menu of whole-pattern settings is called: the popover's title and the name of the
 * control in the card's corner that opens it (0152). Titlecase per (0059).
 */
export const PLAYER_CHARACTER_LABEL = "Character";

/**
 * What each character is called. One word each, because the word is the whole control — a
 * character carries no icon, and a press of it is read back off the dials that moved. Total over
 * `PLAYER_CHARACTERS`, checked in `src/ui/tooltips.test.ts`.
 */
export const PLAYER_CHARACTER_LABELS: Record<PlayerCharacter, string> = {
  plain: "Plain",
  stutter: "Stutter",
  riff: "Riff",
  scatter: "Scatter",
  breathe: "Breathe",
  slide: "Slide",
};

/**
 * What the set of presses behind the Compose dial is called: the eyebrow over them, and the name
 * of the thing they narrow (0174). One word, and the word a closed list of characters already has.
 */
export const PLAYER_CAST_LABEL = "Cast";

/**
 * What narrowing it does. Said as what the pattern will and will not draw rather than as which
 * bits move, and it has to say the refusal out loud: the last name on stays on, because a cast
 * that permitted nobody would be an arrangement with no part to draw (0174, principle 5).
 */
export const PLAYER_CAST_TOOLTIP =
  "Which characters the pattern may compose with. A name turned off is one no drawn part will be, and the last one left on stays on.";

/**
 * What each one does to the pattern, said as what it sounds like rather than as which dials it
 * moves: the dials say that themselves the moment the name is pressed, and this is the sentence
 * that tells a hand which name to press. Every one of them ends the same way — a press draws
 * inside the character rather than landing on it, so pressing twice is two patterns of one kind,
 * which is the thing about this control a person has to be told (0152). Total over
 * `PLAYER_CHARACTERS`, checked in `src/ui/tooltips.test.ts`.
 */
export const PLAYER_CHARACTER_TOOLTIPS: Record<PlayerCharacter, string> = {
  plain:
    "Put every setting back where switching the pattern on leaves it. The one character that draws nothing: it is the same pattern every time, and the way back from any of the others.",
  stutter:
    "Stay near where it is and hammer — the shortest grains the ear still hears as tone, held for long counts, with most of each one cut away. Draws a new one of its kind each press.",
  riff: "Lay down a short run of places, play it back several times over, and return to that run more often than it branches off it. Draws a new one of its kind each press.",
  scatter:
    "Land anywhere in the loop, at a speed that changes every few jumps, with a wait that may or may not be taken. Draws a new one of its kind each press.",
  breathe:
    "Long grains with silence between them: few repeats, a rest before most jumps, and no two of them quite the same length. Draws a new one of its kind each press.",
  slide:
    "Let the speed do the work — one step up or down the rates at a time, held for several jumps, so the pattern slides between speeds instead of leaping among them. Draws a new one of its kind each press.",
};

/**
 * What the button under a pressed character's own dials is called: one word, and the same gesture
 * the name itself is. It is an action, but it carries no icon — the names above it carry none
 * either, and a picture beside one word that is already a verb says nothing twice (0055, 0152).
 */
export const PLAYER_AGAIN_LABEL = "Again";

/**
 * What the arrangement is called: the section's own heading, which is the fold that opens it
 * (0153, 0157). Titlecase per (0059).
 */
export const PLAYER_SONG_LABEL = "Song";

/**
 * What a song is, on the heading that folds it. It was the sentence on the trigger in the card's
 * corner until that trigger became a section of the card itself, and it is the same sentence: what
 * moved is where the arrangement is edited, not what one is (0157).
 */
export const PLAYER_SONG_TOOLTIP =
  "Arrange this pattern as parts that follow one another: each is the dials as they stood when you added it and lasts as many jumps as you say. Select one and the dials above turn it instead of the pattern they were.";

/**
 * The badge one part wears: the tail of its own opaque id, in four characters a person can point
 * at and say aloud. Derived from the id and never from the place in the list, which is exactly
 * what a reorder moves — a part dragged up the arrangement keeps its badge, because the badge
 * names the part (0076, 0157).
 */
export const partBadge = (id: SongPartId): string => id.slice(-4).toUpperCase();

/**
 * What the card's header says about the part standing, beside the arrangement `songLabel` reads
 * out: the word, then what that part is called. One word rather than a sentence, because it is
 * drawn in the readout line the seed is in (P98, 0157) — and the name rather than the badge, which
 * is the same word the line beside it reads out: two vocabularies for one part on one line is one
 * too many (0178).
 */
export const PLAYER_STANDING_LABEL = "Playing";

/**
 * What a song with no parts says, where the parts would be. A popover that opened on an empty box
 * would be a control that says nothing about what it is for, and this is the one place the shape
 * of a song — parts in order, one of them coming back — can be said in a sentence (P65).
 */
export const PLAYER_SONG_EMPTY = `No parts: every jump is drawn from the dials as they stand. Add one and it keeps those dials as they are right now, so the pattern starts moving between settings — one for eight jumps, another for four, and back.`;

/**
 * What the section says over a song the pattern drew for itself, where the hand's own list would
 * be. The rows under it are what is playing; this is the one line saying where they came from and
 * how to have the written arrangement back, because a list nothing on screen can edit has to say
 * why (0158, P65).
 */
export const PLAYER_SONG_DRAWN = `Drawn from the seed: these are the parts the pattern arranged for itself. Turn ${PLAYER_KNOB_LABELS.arrange} back to zero to play the arrangement you wrote.`;

/**
 * What joins the readings of a one-line readout: a song's parts, a part's own dials. Declared once
 * because two such lines that punctuated differently would read as two kinds of list, which is
 * exactly the claim the part row makes about its signature (src/ui/PlayerPart.tsx).
 */
export const READOUT_JOIN = " · ";

/**
 * A song as the card reads it out beside the seed: its parts by the names they were given, in
 * order. Outside the fold and in muted text, for the reason the seed is — what a pattern is
 * arranged as is legible without opening anything, and the section under the dials is where it is
 * edited (P98, 0153). Names rather than badges, which is what a part having one is *for*: it was
 * badges while a part was a spec with no name but the one it was minted with, and an un-named part
 * still reads as its badge, because that is the name it is minted with (0157, 0176, P134).
 */
export const songLabel = (song: readonly SongPart[]): string =>
  song.map((part) => part.name).join(READOUT_JOIN);

/** What one part of a song is called, where a row of them needs a word. Titlecase per (0059). */
export const PLAYER_PART_LABEL = "Part";

/** What the dial saying how long a part lasts is called under it. One word, like every caption. */
export const PLAYER_PART_LENGTH_LABEL = "Jumps";

/**
 * What that dial does, and in what unit. Jumps rather than loops, and the sentence has to say so:
 * a landing sounds for as many bursts as the count says, so how much of the loop's own time a part
 * covers is a fact about the yard rather than about the song (0119, 0153).
 */
export const PLAYER_PART_LENGTH_TOOLTIP =
  "How many jumps this part lasts before the next one begins. Counted in jumps rather than in loops, because a landing holds for as long as its repeats and its burst say.";

/**
 * What the toggle that points the card's dials at one part is called. A state rather than an
 * action — the part is the one being turned or it is not — so it carries no icon and the badge
 * beside it is what the control says (0055, 0176).
 */
export const PLAYER_SELECT_LABEL = "Select";

/**
 * What it means, and what it costs: while a part is selected every dial on the card above reads
 * and writes that part rather than the pattern the card holds, which is exactly the thing 0157
 * used to refuse and 0176 decided (0152).
 */
export const PLAYER_SELECT_TOOLTIP =
  "Point this card's dials at this part: they read what it plays, and turning one writes into it rather than into the pattern. Press again to turn the pattern itself.";

/**
 * What the field holding a part's own name is called. A part carries a name a hand typed, minted
 * as its badge and never empty, because a part no longer stores which character it came from and a
 * label derived from its numbers would be an invention (0174, 0176).
 */
export const PLAYER_PART_NAME_LABEL = "Name";

/** What typing in it does, and the one thing it will not do: leave a part with no name at all. */
export const PLAYER_PART_NAME_TOOLTIP = `Call this part something you will recognise. Emptying it puts its badge back, because every part has a name.`;

/**
 * What the read-only line beside the name says. Not a character — a part is a spec now — so this
 * is what the numbers themselves can honestly say: which of the part's own dials are furthest from
 * what the switch leaves, measured against each dial's own range (0176).
 */
export const PLAYER_PART_SIGNATURE_TOOLTIP =
  "Which of this part's dials are furthest from plain, so two parts can be told apart by what they do rather than by where they sit.";

/**
 * The marker a copied part's name carries. Titlecase like every other word on screen (0059), and
 * a marker rather than a fresh mint because the point of copying a part is to keep what it was:
 * the copy's *identity* is the new id, and its name is the one it was taken from, said again.
 */
const COPY_MARKER = " Copy";

/**
 * A name said again for a copy of the thing it named. Cut to fit before the marker is added rather
 * than after, so the result always ends in the marker and always passes `assertDurableText` — a
 * name truncated mid-marker would read as a name someone typed (src/lib/guards.ts).
 */
export const copyName = (name: string): string =>
  `${name.slice(0, DURABLE_TEXT_MAX - COPY_MARKER.length)}${COPY_MARKER}`;

/**
 * What the slider under those names is called. Titlecase per (0059), and the same word the rack
 * has no claim on: it is a fraction of one thing rather than a parameter of anything.
 */
export const PLAYER_AMOUNT_LABEL = "Amount";

/**
 * What that slider does. It is the one control on this card that sends no value of its own — it
 * says how far along the drawn character every dial is set — so the sentence has to say what it
 * is a fraction *of*, which no caption of four characters can (0152).
 */
export const PLAYER_AMOUNT_TOOLTIP = `How much of the character to take. All the way is the character as it was drawn; none of it is ${PLAYER_CHARACTER_LABELS.plain.toLowerCase()}. Move it after pressing a name and every dial slides between the two.`;

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

/**
 * The whole output at a glance, on the header beside the history controls: neither a parameter nor
 * an action (0055), so its words live here beside the sync clock's. The sentence has to say the
 * press, because a meter that also clears a clip indicator says nothing about that by being a
 * meter — and the name was written twice on one element, in two casings, before it was declared.
 */
/**
 * How a surface says a thing did not go: what was being done, and the reason as it came back.
 * Four call sites wrote this template out, and the fourth had already drifted from the other
 * three — the words for one gesture, said one way wherever it is reported.
 */
export const failedMessage = (what: string, reason: unknown): string =>
  `${what} failed: ${String(reason)}`;

export const MASTER_METER_LABEL = "Master Level";
export const MASTER_METER_TOOLTIP =
  "Every yard's output together, left and right. The dot lights when the sound went over what the output can carry; press to clear it.";

/** What the moiré strip and the overlay it opens are called on screen, Titlecase per (0059). */
export const MOIRE_STRIP = "Drift";
export const MOIRE_OVERLAY = "Drift In Full";

/** What the zoomed picture's own button for a window of its own says (0139). */
export const MOIRE_POP_OUT = "Pop Out";

/**
 * What that button buys, and the one place the strip's hidden gesture is written down. The
 * sentence says what a second window is for — watching the drift while turning the knobs that make
 * it drift, which a picture over the instrument cannot offer (0138) — rather than naming the
 * browser feature, and the shortcut is said here because a gesture nothing says is a gesture
 * nobody finds.
 */
export const MOIRE_POP_OUT_TOOLTIP =
  "Hands this picture to a browser window of its own, so the instrument underneath stays reachable — put it on another screen and it keeps drawing there. Option-click the strip to send it straight out.";

/**
 * What the large picture is called wherever it is named — its own window's title, the label a
 * screen reader reads it by, and the heading it wears. One composition rather than three, because
 * a title that reads differently in the tab from in the header is two pictures (principle 1, P100).
 */
export const driftTitle = (deck: string): string => `${yardLabel(deck)} ${MOIRE_OVERLAY}`;
