/**
 * @role The player's pattern as pure maths — the durable spec a deck carries, every bound one of
 *   its numbers is declared inside, and the one validator both the command wire and storage come
 *   through. Same seed, same steps, on any machine and in any host: this is the file that says
 *   what a jumping performance *is* (0089, 0068).
 * @instead What a spec unfolds into, and the shape of one step of it → src/lib/playerWalk.ts,
 *   which is where the walk went and where a step belongs beside it (P111). Turning a step into sound — which source starts when, and the fades at its seams →
 *   src/audio/deck.ts, which is the transport and the only thing that may move a read position.
 *   A step is counted in slots, except its burst, which is the one length that is wall seconds
 *   because it is a grain and not a subdivision (0119).
 */
// Over the 400-line cap, and what is over it is this module's own numbers: every knob it declares
// carries the paragraph saying what its range means and why it is that range, which is the only
// place those arguments exist. Splitting them off would put a bound in one file and its reason in
// another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { assertDurableText, finite, objectAt } from "./guards.ts";
import {
  PLAYER_PHRASE_CHANCE_MAX,
  PLAYER_PHRASE_CHANCE_MIN,
  PLAYER_PHRASE_KEEP_MAX,
  PLAYER_PHRASE_KEEP_MIN,
  PLAYER_PHRASE_RETURN_MAX,
  PLAYER_PHRASE_RETURN_MIN,
  type FigureSpec,
} from "./playerFigure.ts";
import {
  PLAYER_BIAS_MAX,
  PLAYER_BIAS_MIN,
  PLAYER_HOME_MAX,
  PLAYER_HOME_MIN,
  PLAYER_STRIDE_MAX,
  PLAYER_STRIDE_MIN,
  type TravelSpec,
} from "./playerTravel.ts";
import { PLAYER_REVERSE_MAX, PLAYER_REVERSE_MIN, type ReverseSpec } from "./playerReverse.ts";
import {
  PLAYER_DISTANCE_MAX,
  PLAYER_DISTANCE_MIN,
  PLAYER_MASK_MAX,
  PLAYER_MASK_MIN,
  PLAYER_PHRASE_MAX,
  PLAYER_PHRASE_MIN,
  PLAYER_SLOTS,
} from "./playerSlots.ts";
import {
  PLAYER_REST_CHANCE_MAX,
  PLAYER_REST_CHANCE_MIN,
  PLAYER_REST_MAX,
  PLAYER_REST_MIN,
  PLAYER_REST_PULSES_MAX,
  PLAYER_REST_PULSES_MIN,
  PLAYER_REST_SPAN_MAX,
  PLAYER_REST_SPAN_MIN,
  PLAYER_REST_SPREAD_MAX,
  PLAYER_REST_SPREAD_MIN,
  type RestSpec,
} from "./playerRest.ts";
import {
  PLAYER_ARRANGE_CHANCE_MAX,
  PLAYER_ARRANGE_CHANCE_MIN,
  PLAYER_ARRANGE_KEEP_MAX,
  PLAYER_ARRANGE_KEEP_MIN,
  PLAYER_ARRANGE_MAX,
  PLAYER_ARRANGE_MIN,
  PLAYER_ARRANGE_RETURN_MAX,
  PLAYER_ARRANGE_RETURN_MIN,
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  PLAYER_SONG_MAX,
  type ArrangementSpec,
  type SongPart,
} from "./playerSong.ts";

/**
 * The characters a pattern may be asked to sound like, as a declared enum rather than a free
 * number (0089) — and here rather than beside the regions that say what each of
 * them means, because a song's parts name characters and a song is durable (0153). What a spec is
 * allowed to hold is this module's decision; what a name sounds like is
 * src/lib/playerCharacter.ts's.
 *
 * `plain` is first and is the identity: its region names no knob, so a part drawn as it is the
 * card's own dials and nothing else. Every other one is a direction away from that.
 */
export const PLAYER_CHARACTERS = [
  "plain",
  "stutter",
  "riff",
  "scatter",
  "breathe",
  "slide",
] as const;
export type PlayerCharacter = (typeof PLAYER_CHARACTERS)[number];

/**
 * How much of a character a draw takes, 0…1. Zero is plain — the draw is made and then blended
 * all the way back, so the amount is a dial over one drawn character rather than a second draw —
 * and one is the character as its region drew it.
 *
 * Here rather than with the regions since 0153: a part carries one durably, so it is a bound this
 * module's own validator has to read, and a range is declared where the thing that checks it is
 * (principle 1).
 */
export const PLAYER_AMOUNT_MIN = 0;
export const PLAYER_AMOUNT_MAX = 1;

/**
 * The finest a hand may set that. A hundredth, which is finer than any single knob's move across
 * its own range at this width and coarse enough that an arrow key is heard.
 */
export const PLAYER_AMOUNT_STEP = 0.01;

// The grid itself — how many slots the loop has, how far a jump may travel over them, how long a
// figure of them may be and which of them a pattern may land on — is src/lib/playerSlots.ts's:
// each of those bounds is derived from the count, so they are one family and sit in one module
// beside what reads them, exactly as the travel's and the rest's do (0045, 0165).

/**
 * How many times a burst repeats before the next jump. Sixty-four, so a step at the burst
 * floor can hold a landing for a third of a second rather than a sixteenth of one: the shorter
 * the grain, the more of them one landing takes to be heard as a landing at all, and the count is
 * the only knob that says how long the pattern stays put.
 */
export const PLAYER_REPEATS_MIN = 1;
export const PLAYER_REPEATS_MAX = 64;

/**
 * The odds a repeat count that is due to be redrawn actually is, 0…1. One redraws on every count
 * the hold is up on; zero keeps the count the dial says forever, whatever the hold says. Rolled
 * on every jump the hold is due on, so a failed roll is the same odds again on the next jump and
 * never a redraw postponed — the rate walk's chance, said for the count instead (0134, 0135).
 */
export const PLAYER_REPEATS_CHANCE_MIN = 0;
export const PLAYER_REPEATS_CHANCE_MAX = 1;

/**
 * How far a redrawn count may stray from the dial, in repeats, either way. Zero is the dial's own
 * number every time, which is what 0134 made the count mean and what it still means until this is
 * turned up. The ceiling is the whole dial: the widest stray that can reach either end of the
 * range from anywhere on it, and no wider, since a window is clipped to `PLAYER_REPEATS_MIN…MAX`
 * rather than wrapped.
 */
export const PLAYER_REPEATS_SPREAD_MIN = 0;
export const PLAYER_REPEATS_SPREAD_MAX = PLAYER_REPEATS_MAX - PLAYER_REPEATS_MIN;

/**
 * How much shorter each repeat of one landing is than the repeat before it, as a fraction of it.
 * Zero stands them all equal, which is what a landing was before it could shrink; anything more
 * makes the count a geometric run, so a hold runs out into the jump after it sooner than the count
 * alone says and its gate cuts faster as it goes.
 *
 * What it moves is the windows a landing is cut and ended on, and not the grain inside them: one
 * looping source has one period, so the burst goes on repeating at its own length under a
 * ratcheted landing (0161, src/audio/player.ts).
 *
 * A half at the ceiling: at a half the fourth repeat is an eighth of the grain and the run has
 * reached the floor below within a handful of them, so a wider ratchet would buy no shape the
 * count could still be heard in. A repeat never shrinks past `PLAYER_MIN_SLOT_SECS` — the same
 * window every burst is floored at, which is what keeps a shrinking repeat able to carry its own
 * seams and keeps `MAX_PLAYER_STEPS` covering the arming cadence (src/audio/player.ts).
 */
export const PLAYER_RATCHET_MIN = 0;
export const PLAYER_RATCHET_MAX = 0.5;

/**
 * The odds one landing is a hole: silent, and standing exactly where it stood, 0…1. Zero is every
 * landing sounding, which is what the module did before a landing could be dropped; one is a
 * pattern that plays nothing at all and still keeps its place in the grid.
 *
 * It is neither of the two knobs that can already take sound away. A rest is a wait *between* two
 * landings, measured in slots, and it moves everything after it (0119); a gate cuts inside a
 * repeat and cannot reach silence, because `PLAYER_GATE_FLOOR` floors what a shut one leaves.
 * A hole is the one of the three that leaves the rhythm where it is, which is what lets a figure
 * be said with a gap in it — the same run of slots with one of them silent is 0151's memory heard
 * as syncopation rather than as repetition.
 */
export const PLAYER_DROP_MIN = 0;
export const PLAYER_DROP_MAX = 1;

// How many jumps keep one count is `PLAYER_HOLD_MIN…PLAYER_HOLD_MAX` below: a hold is counted in
// jumps whatever it is holding, so the two are one range and not two that happen to agree
// (principle 1). Zero keeps one count forever, which is the arithmetic 0134 asked for.

/**
 * The seam of a jump, in seconds. Every player source opens and closes along the equal-power
 * curve over exactly this, and an ungated step overlaps the next by it, so the pair crosses at
 * constant power rather than clicking (0089, src/lib/crossfade.ts). Short enough to be a seam and
 * not an envelope; long enough that a 48kHz edit has ~48 samples to get from one to the other.
 *
 * It is the seam that sets how short a burst can be heard — five of these is the floor below — so
 * the number is halved again to let the burst knob reach two hundred a second: 1ms is ~48 samples
 * at 48kHz to get from one step to the next, which is a seam a room hears as a seam and not as a
 * click (0120).
 *
 * It sits here rather than beside the other scheduling numbers in src/audio/transport.ts because
 * `PLAYER_BURST_MIN` below is now this floor exactly, and lib may not reach up a tier to say so
 * (0119, docs/map.md). Neither this nor the floor ever touched the graph.
 */
export const PLAYER_FADE_SECS = 0.001;

/**
 * The shortest window the player will play, in wall seconds. Two fades have to fit inside a gated
 * repeat and one more has to overlap the seam, so anything below five of them cannot carry the
 * fades that keep it from clicking. Five milliseconds — two hundred bursts a second, with ~48
 * samples at 48kHz to get from one step to the next. A deck whose loop divides into slots shorter
 * than this plays its loop and does not jump (docs/plan.md §4).
 */
export const PLAYER_MIN_SLOT_SECS = PLAYER_FADE_SECS * 5;

/**
 * How long one burst sounds before the next one, **in wall seconds**. A duration and not a
 * fraction of the loop: the burst is the grain this module has to offer, so its length is what a
 * listener hears as timbre, and under ~50ms its own repetition is a pitch. Measured in slots that
 * pitch was the loop's length — moving an out point transposed every burst on the deck, which is
 * the one thing a grain length must not do (0119). Distance and rest stay in slots, because those
 * are rhythm, and rhythm is the loop's.
 *
 * The floor is the seam's own, `PLAYER_MIN_SLOT_SECS`: the wall-second window the transport
 * already refuses to go below, so the knob bottoms out exactly where the sound does rather than
 * above or below it depending on which loop it happened to be over. The ceiling is what four
 * slots of an eight-second loop used to buy.
 *
 * Still over two orders of magnitude, so the one dial that reads this is drawn on a log curve
 * (src/ui/PlayerCard.tsx).
 */
export const PLAYER_BURST_MIN = PLAYER_MIN_SLOT_SECS;
export const PLAYER_BURST_MAX = 2;

/**
 * The finest a hand may set the burst, and the reason it is not the floor itself: the dial that
 * reads it is drawn on a log curve, where an arrow key moves by a fraction of the whole sweep
 * rather than by a step — about 7% of the value over a sweep this wide. At the floor that is
 * under half a step, and a knob whose key press snaps back to where it started answers no key at
 * all. A slot's division, applied to the floor, clears half a step everywhere in the range
 * (0064, src/ui/Knob.tsx).
 */
export const PLAYER_BURST_STEP = PLAYER_BURST_MIN / PLAYER_SLOTS;

/**
 * How long each repeat of one landing sounds, in wall seconds: the burst, and then as much of the
 * repeat before it as the ratchet leaves. At a ratchet of zero every entry is the burst and the
 * run is the count standing equal, which is what a landing was before it could shrink.
 *
 * **The one place a repeat's length is computed.** The transport ends a landing at the sum of
 * these and cuts its gate on their boundaries (`windowOf` and `seam`, src/audio/player.ts), and
 * the picture runs the module's row at the same sum (`playerRowPeriod`, src/lib/playerDrift.ts) —
 * three readers of one arithmetic rather than three spellings of it (principle 1).
 *
 * Floored at `PLAYER_MIN_SLOT_SECS`, which is the same window a burst is floored at and is
 * load-bearing twice over: below it a repeat cannot carry the two fades that keep its gate from
 * clicking, and `MAX_PLAYER_STEPS` covers the re-arm cadence only while a repeat is at least that
 * long. A ratchet runs out into equal repeats at the floor rather than into a landing of no length.
 */
export function repeatSpans(burst: number, repeats: number, ratchet: number): number[] {
  const spans: number[] = [];
  let secs = Math.max(burst, PLAYER_MIN_SLOT_SECS);
  for (let repeat = 0; repeat < repeats; repeat++) {
    spans.push(secs);
    secs = Math.max(PLAYER_MIN_SLOT_SECS, secs * (1 - ratchet));
  }
  return spans;
}

/** How long the whole landing occupies: those spans summed, and never a count times one of them. */
export const landingSecs = (burst: number, repeats: number, ratchet: number): number =>
  repeatSpans(burst, repeats, ratchet).reduce((secs, span) => secs + span, 0);

/**
 * How much a burst's length is allowed to stray either way, **in wall seconds** — the burst's own
 * unit, on the burst's own range. Zero draws exactly the burst every time; the whole of it may
 * reach from the floor to a burst's length past the ceiling.
 *
 * Clamped at the burst floor and nowhere else, so a vary far larger than the burst it strays is
 * one-sided in practice: it lengthens freely and shortens only down to `PLAYER_BURST_MIN`.
 *
 * A fraction of the burst until P97, which made this the one dial on the card saying a number
 * nothing beside it was said in: a vary of 0.5 was half of whatever the burst happened to be, so
 * the two dials could not be read against each other and moving the burst moved what the vary
 * meant. Said in seconds, "vary" is this much either side of the burst and the pair compares by
 * eye (0135).
 *
 * Linear where the burst is logarithmic, because a log range cannot hold a zero
 * (`assertLogRange`, src/lib/range.ts) and this one's zero is the value that turns it off. Its
 * step is the burst's, `PLAYER_BURST_STEP`, so the finest stray a hand can set is the finest
 * burst it can set.
 */
export const PLAYER_VARY_MIN = 0;
export const PLAYER_VARY_MAX = PLAYER_BURST_MAX;

/**
 * The odds one landing's length is varied at all, 0…1. One varies every landing, which is the
 * whole of what `vary` did before it had a chance behind it; zero leaves every landing at the
 * length the dial says, which is what a vary of zero also gives and by a different road. The roll
 * is taken per landing, so a failed one is not a variation deferred.
 *
 * It is the chance the rate walk has, said for the burst instead: the `+` marker on the Vary dial
 * holds this one alone, because Vary *is* the spread of a burst and a drift is a property of a
 * walk, which a burst length is not — it is drawn fresh at every landing (P87).
 */
export const PLAYER_VARY_CHANCE_MIN = 0;
export const PLAYER_VARY_CHANCE_MAX = 1;

/**
 * How many jumps hold one read rate before a new one is drawn. Zero holds one rate forever — the
 * deck's own is then the only one the pattern reads at — and anything else is what makes a
 * pattern evolve rather than repeat.
 */
export const PLAYER_HOLD_MIN = 0;
export const PLAYER_HOLD_MAX = 16;

/**
 * The read rates a hold lets go of, as ratios of the deck's own — a ladder rather than a set, and
 * walked in rungs exactly as the loop is walked in slots (0118). Symmetric about unity at the
 * centre, so a rung is a signed distance from the deck's own rate and the two directions are the
 * same size.
 *
 * Still closed rather than a continuous range: what a rate may *be* is the module's decision and
 * these nine are musical intervals, while how far it strays, how far one change leaps and whether
 * it fires at all are the performer's, which is what `spread`, `drift` and `chance` are.
 */
export const PLAYER_RATES = [0.25, 0.375, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

/** Where 1 sits on that ladder: the rung a walk starts on and measures its distance from. */
export const PLAYER_RATE_UNITY = 4;

/** How many rungs either way. The bound on `spread`, and the ceiling on `drift`. */
export const PLAYER_RATE_RUNGS = 4;

/**
 * The odds a change that is due actually happens, 0…1. One is a hold that always lets go on its
 * count, which is the whole of what the module did before it could roll; zero holds the rate it
 * is on forever whatever the count says. The roll is taken every jump the hold is due on, so a
 * failed one is not a change deferred — it is the same odds again on the next jump.
 */
export const PLAYER_CHANCE_MIN = 0;
export const PLAYER_CHANCE_MAX = 1;

/**
 * How far from the deck's own rate a drawn rate may sit, in rungs. Zero never leaves it — the
 * pattern is then jumps at one speed, which `hold: 0` also gives and by a different road. Two is
 * the ladder this module had before it had a knob for it, 0.5…2; the whole of it is an octave
 * either way.
 */
export const PLAYER_SPREAD_MIN = 0;
export const PLAYER_SPREAD_MAX = PLAYER_RATE_RUNGS;

/**
 * The most rungs one change may travel from the rate it is on. One steps to a neighbouring rate
 * and never further, so a pattern slides; the whole ladder may leap anywhere inside the spread,
 * which is what the uniform draw this replaced always did. It is `distance` a rung down, and it
 * is bounded by the spread rather than by itself.
 */
export const PLAYER_DRIFT_MIN = 1;
export const PLAYER_DRIFT_MAX = PLAYER_RATE_RUNGS;

/**
 * How hard the gate stutters, as the fraction of each repeat it may cut. Zero leaves every repeat
 * whole — the player is then jumps and nothing else — and one may cut a repeat down to
 * `PLAYER_GATE_FLOOR` of itself.
 */
export const PLAYER_GATE_MIN = 0;
export const PLAYER_GATE_MAX = 1;

/** The shortest a gated repeat may be drawn, as a fraction of the slot. Below this it is a click. */
export const PLAYER_GATE_FLOOR = 0.05;

/** The seed's range: the 32 bits `mulberry32` has state for, as a whole number. */
export const PLAYER_SEED_MAX = 0xff_ff_ff_ff;

/**
 * The shared jump clock, in seconds: how often any jumping yard's next step may begin. Wall
 * seconds rather than slots, because seconds are the one thing yards with different loops can
 * share — a slot is a sixteenth of whatever loop its own deck holds, and no two decks need hold
 * the same one (P68, 0097).
 *
 * An eighth of a second at the short end, where a clock is faster than the bursts it is gathering
 * and gathers nothing; eight seconds at the long end, past which two yards landing together is no
 * longer something a listener hears as together.
 */
export const SYNC_MIN_SECS = 0.125;
export const SYNC_MAX_SECS = 8;

/** A tick is a multiple of the period, so a step already on one must not be pushed to the next. */
const SYNC_TOLERANCE = 1e-9;

/**
 * What a deck durably holds when its player is on. Null on the deck is the whole of "off" — the
 * same shape `loop` has, and for the same reason: there is no second field that could disagree
 * with it.
 */
export type PlayerSpec = FigureSpec &
  ArrangementSpec &
  RestSpec &
  ReverseSpec &
  TravelSpec & {
    /** The one field that makes a performance reproducible (0089). A whole number, 0…2³²−1. */
    seed: number;
    /**
     * Which of the grid's slots this pattern may land on, as the whole number those bits pack
     * into — `PLAYER_MASK_MIN…PLAYER_MASK_MAX`, and never zero. Durable numbers a hand can see and
     * turn off, written once by a gesture that read a source's onsets, and read by nothing at walk
     * time but the snap (0165, src/lib/playerSlots.ts).
     */
    slots: number;
    /** How many repeats one step holds, 1…PLAYER_REPEATS_MAX. Whole. */
    repeats: number;
    /** The odds a count that is due to be redrawn is, 0…1. */
    repeatsChance: number;
    /** How far a redrawn count may stray from that, in repeats, 0…PLAYER_REPEATS_SPREAD_MAX. */
    repeatsSpread: number;
    /** How many jumps keep one count, PLAYER_HOLD_MIN…PLAYER_HOLD_MAX. Whole; zero keeps it. */
    repeatsHold: number;
    /** How much each repeat shrinks against the one before it, 0…PLAYER_RATCHET_MAX. */
    ratchet: number;
    /** How hard the gate stutters, 0…1. */
    gate: number;
    /** The odds one landing is silent while keeping its place, 0…1. */
    drop: number;
    /** How long one burst sounds, in wall seconds, PLAYER_BURST_MIN…PLAYER_BURST_MAX. */
    burst: number;
    /** How far that length may vary either way, as a fraction of it, 0…1. */
    vary: number;
    /** The odds one landing's length is varied at all, 0…1. */
    varyChance: number;
    /** How many jumps hold one read rate before a new one is drawn. Whole; zero holds one forever. */
    hold: number;
    /** The odds a due change fires, 0…1. */
    chance: number;
    /** How far from the deck's own rate a rate may sit, in rungs, 0…PLAYER_RATE_RUNGS. Whole. */
    spread: number;
    /** The most rungs one change may travel, 1…PLAYER_RATE_RUNGS. Whole. */
    drift: number;
    /**
     * How the pattern is arranged by hand: the parts it walks in turn, or none at all, which is
     * every jump drawn under the numbers above (0153). A list rather than a count, because the
     * order is the arrangement. Held whatever `arrange` says and walked only while `arrange` is
     * zero: which author is live is a rule and not a second field, so a hand's list survives a
     * spell of drawing untouched (0158).
     */
    song: readonly SongPart[];
  };

/**
 * Every field a switch press leaves at a value: the whole spec but the seed, which is drawn at
 * the gesture rather than defaulted (0089). Named here so the card that declares those values and
 * the seven menus that snap a dial back to one are keyed against the same list (principle 1).
 */
export type PlayerDefaults = Omit<PlayerSpec, "seed">;

/**
 * Every field a character draws, and no others: the whole spec but the three a draw may not touch.
 * The mask is out because it is a fact about the material rather than about the walk — a character
 * says what a pattern is like, and where a sample has its transients is not something a name
 * pressed on the card could know (0165). The seed is out for the reason 0152 gave — a character changes what the pattern is *like* and
 * reseed changes which performance of it you are hearing — and the song is out for the same
 * reason said one tier up: a character is what a part sounds like, so a draw that could rewrite
 * the arrangement it is a part of would be a part editing its own song (0153).
 *
 * It is also exactly what a step is drawn from, which is why the walk carries one of these rather
 * than a spec: a part hands over a voice, and every draw in src/lib/playerWalk.ts reads it.
 */
export type PlayerVoice = Omit<PlayerDefaults, "song" | "slots">;

/**
 * Every number of that spec a hand turns, in the order the card draws them. The three fields no
 * dial reaches are out: the seed, which is minted at a gesture, the song, which is a list and not a
 * number, and the mask, which is sixteen presses and one action rather than a range a hand travels
 * (0165) — the same three `PLAYER_FIELDS` below names before splicing this list in.
 * The list is what the words in `src/lib/copy.ts` are keyed by, so a field with no caption and no
 * sentence is a hole one test finds (P65, P74).
 */
export const PLAYER_KNOBS = [
  "distance",
  "bias",
  "stride",
  "home",
  "phrase",
  "phraseKeep",
  "phraseChance",
  "phraseReturn",
  "repeats",
  "repeatsChance",
  "repeatsSpread",
  "repeatsHold",
  "ratchet",
  "gate",
  "drop",
  "reverse",
  "burst",
  "vary",
  "varyChance",
  "rest",
  "restPulses",
  "restSpan",
  "restChance",
  "restSpread",
  "hold",
  "chance",
  "spread",
  "drift",
  "arrange",
  "arrangeKeep",
  "arrangeChance",
  "arrangeReturn",
] as const satisfies readonly (keyof PlayerSpec)[];
export type PlayerKnob = (typeof PLAYER_KNOBS)[number];

/**
 * The durable fields, in the order they are declared. The one list a stored spec is keyed against
 * — the three no dial reaches, then every one a hand turns, which are named once in
 * `PLAYER_KNOBS` above rather than spelled out a second time here (principle 1).
 */
const PLAYER_FIELDS = ["seed", "song", "slots", ...PLAYER_KNOBS] as const;

/** The fields one part of a song is keyed against, read exactly as `PLAYER_FIELDS` is. */
const PART_FIELDS = ["id", "character", "amount", "length", "chorus"] as const;

/** Whether an outside string is one of the declared characters. A narrowing, not an assertion:
 *  a part's character is the one field of this spec whose value is a name out of a closed list. */
const isCharacter = (value: unknown): value is PlayerCharacter =>
  PLAYER_CHARACTERS.some((declared) => declared === value);

/** A finite number in `[min, max]`, or a loud no. The check every continuous field shares. */
function within(value: unknown, min: number, max: number, at: string): number {
  const number = finite(value, at);
  if (number < min || number > max)
    throw new RangeError(`${at} is outside ${min}…${max}: ${number}`);
  return number;
}

/** The same, and whole with it. The check every counted field shares. */
function whole(value: unknown, min: number, max: number, at: string): number {
  const number = within(value, min, max, at);
  if (!Number.isInteger(number)) throw new RangeError(`${at} is not whole: ${number}`);
  return number;
}

/**
 * A song off the wire or out of storage, checked. An empty list is the whole of "no song" and is
 * the ordinary case, so it is not an error — a spec that holds none is the pattern this module was
 * before it could be arranged (0153).
 *
 * Loud about everything else, for the reason every field above is: a part is durable, it is
 * carried by a command, and a song quietly playing a character nobody named is exactly the failure
 * principle 5 refuses. Keyed like the spec itself — no extra fields and none missing — so a part
 * from another build is a part from another build and not a part.
 */
function songOf(value: unknown, at: string): readonly SongPart[] {
  if (!Array.isArray(value)) throw new TypeError(`${at} is not an array`);
  if (value.length > PLAYER_SONG_MAX) {
    throw new RangeError(`${at} has ${value.length} parts, over ${PLAYER_SONG_MAX}`);
  }
  const seen = new Set<string>();
  return value.map((raw: unknown, index: number): SongPart => {
    const where = `${at}[${index}]`;
    const part = objectAt(raw, where);
    const keys = Object.keys(part);
    if (keys.length !== PART_FIELDS.length || PART_FIELDS.some((f) => !Object.hasOwn(part, f))) {
      throw new TypeError(`${where} has ${keys.join(", ")}, expected ${PART_FIELDS.join(", ")}`);
    }
    const character: unknown = part["character"];
    if (!isCharacter(character)) {
      throw new TypeError(`${where} character is not one declared: ${String(character)}`);
    }
    const chorus: unknown = part["chorus"];
    if (typeof chorus !== "boolean") {
      throw new TypeError(`${where} chorus is not a boolean: ${String(chorus)}`);
    }
    const id: unknown = part["id"];
    // The same guard every other durable id goes through: opaque text of a bounded length, and
    // nothing about what it means — a part id is identity and this file never reads one (0157).
    assertDurableText(id, `${where} id`);
    // And one part per id, the way every other list of opaque durable ids in the session is
    // checked (src/state/session.ts): a badge names a part, and two parts under one name would
    // light together, drag as one and be two things nothing could tell apart (principle 5, 0157).
    if (seen.has(id)) throw new TypeError(`${where} repeats the id ${id}`);
    seen.add(id);
    return {
      id,
      character,
      amount: within(part["amount"], PLAYER_AMOUNT_MIN, PLAYER_AMOUNT_MAX, `${where} amount`),
      length: whole(part["length"], PLAYER_PART_MIN, PLAYER_PART_MAX, `${where} length`),
      chorus,
    };
  });
}

/**
 * A player off the wire or out of storage, checked, with null passed through as the whole of
 * "off". Loud rather than clamped: every field is durable and carried by a command, and a player
 * quietly running a pattern nobody asked for is exactly the failure this refuses (principle 5).
 *
 * The one validator: the command wire and the stored session both come through here, so there is
 * no second copy of what a spec is allowed to be.
 */
// One check per durable field, so the length is how many fields the spec declares rather than how
// much this function decides — and every one of them is here because there is exactly one
// validator. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function assertPlayer(value: unknown, at: string): PlayerSpec | null {
  if (value === null) return null;
  const raw = objectAt(value, at);
  // Exactly these keys — no extras and none missing, the way a stored deck is keyed
  // (src/state/session.ts): a field nobody declared is a spec from another build, not a spec.
  const keys = Object.keys(raw);
  if (keys.length !== PLAYER_FIELDS.length || PLAYER_FIELDS.some((f) => !Object.hasOwn(raw, f))) {
    throw new TypeError(`${at} has ${keys.join(", ")}, expected ${PLAYER_FIELDS.join(", ")}`);
  }
  return {
    seed: whole(raw["seed"], 0, PLAYER_SEED_MAX, `${at} seed`),
    song: songOf(raw["song"], `${at} song`),
    // Never zero: a pattern that may land nowhere has no next slot to draw (0165).
    slots: whole(raw["slots"], PLAYER_MASK_MIN, PLAYER_MASK_MAX, `${at} slots`),
    distance: whole(raw["distance"], PLAYER_DISTANCE_MIN, PLAYER_DISTANCE_MAX, `${at} distance`),
    bias: within(raw["bias"], PLAYER_BIAS_MIN, PLAYER_BIAS_MAX, `${at} bias`),
    stride: within(raw["stride"], PLAYER_STRIDE_MIN, PLAYER_STRIDE_MAX, `${at} stride`),
    home: within(raw["home"], PLAYER_HOME_MIN, PLAYER_HOME_MAX, `${at} home`),
    phrase: whole(raw["phrase"], PLAYER_PHRASE_MIN, PLAYER_PHRASE_MAX, `${at} phrase`),
    phraseKeep: whole(
      raw["phraseKeep"],
      PLAYER_PHRASE_KEEP_MIN,
      PLAYER_PHRASE_KEEP_MAX,
      `${at} phraseKeep`,
    ),
    phraseChance: within(
      raw["phraseChance"],
      PLAYER_PHRASE_CHANCE_MIN,
      PLAYER_PHRASE_CHANCE_MAX,
      `${at} phraseChance`,
    ),
    phraseReturn: within(
      raw["phraseReturn"],
      PLAYER_PHRASE_RETURN_MIN,
      PLAYER_PHRASE_RETURN_MAX,
      `${at} phraseReturn`,
    ),
    arrange: whole(raw["arrange"], PLAYER_ARRANGE_MIN, PLAYER_ARRANGE_MAX, `${at} arrange`),
    arrangeKeep: whole(
      raw["arrangeKeep"],
      PLAYER_ARRANGE_KEEP_MIN,
      PLAYER_ARRANGE_KEEP_MAX,
      `${at} arrangeKeep`,
    ),
    arrangeChance: within(
      raw["arrangeChance"],
      PLAYER_ARRANGE_CHANCE_MIN,
      PLAYER_ARRANGE_CHANCE_MAX,
      `${at} arrangeChance`,
    ),
    arrangeReturn: within(
      raw["arrangeReturn"],
      PLAYER_ARRANGE_RETURN_MIN,
      PLAYER_ARRANGE_RETURN_MAX,
      `${at} arrangeReturn`,
    ),
    repeats: whole(raw["repeats"], PLAYER_REPEATS_MIN, PLAYER_REPEATS_MAX, `${at} repeats`),
    repeatsChance: within(
      raw["repeatsChance"],
      PLAYER_REPEATS_CHANCE_MIN,
      PLAYER_REPEATS_CHANCE_MAX,
      `${at} repeatsChance`,
    ),
    repeatsSpread: whole(
      raw["repeatsSpread"],
      PLAYER_REPEATS_SPREAD_MIN,
      PLAYER_REPEATS_SPREAD_MAX,
      `${at} repeatsSpread`,
    ),
    repeatsHold: whole(raw["repeatsHold"], PLAYER_HOLD_MIN, PLAYER_HOLD_MAX, `${at} repeatsHold`),
    ratchet: within(raw["ratchet"], PLAYER_RATCHET_MIN, PLAYER_RATCHET_MAX, `${at} ratchet`),
    gate: within(raw["gate"], PLAYER_GATE_MIN, PLAYER_GATE_MAX, `${at} gate`),
    drop: within(raw["drop"], PLAYER_DROP_MIN, PLAYER_DROP_MAX, `${at} drop`),
    reverse: within(raw["reverse"], PLAYER_REVERSE_MIN, PLAYER_REVERSE_MAX, `${at} reverse`),
    burst: within(raw["burst"], PLAYER_BURST_MIN, PLAYER_BURST_MAX, `${at} burst`),
    vary: within(raw["vary"], PLAYER_VARY_MIN, PLAYER_VARY_MAX, `${at} vary`),
    varyChance: within(
      raw["varyChance"],
      PLAYER_VARY_CHANCE_MIN,
      PLAYER_VARY_CHANCE_MAX,
      `${at} varyChance`,
    ),
    rest: within(raw["rest"], PLAYER_REST_MIN, PLAYER_REST_MAX, `${at} rest`),
    restPulses: whole(
      raw["restPulses"],
      PLAYER_REST_PULSES_MIN,
      PLAYER_REST_PULSES_MAX,
      `${at} restPulses`,
    ),
    restSpan: whole(raw["restSpan"], PLAYER_REST_SPAN_MIN, PLAYER_REST_SPAN_MAX, `${at} restSpan`),
    restChance: within(
      raw["restChance"],
      PLAYER_REST_CHANCE_MIN,
      PLAYER_REST_CHANCE_MAX,
      `${at} restChance`,
    ),
    restSpread: within(
      raw["restSpread"],
      PLAYER_REST_SPREAD_MIN,
      PLAYER_REST_SPREAD_MAX,
      `${at} restSpread`,
    ),
    hold: whole(raw["hold"], PLAYER_HOLD_MIN, PLAYER_HOLD_MAX, `${at} hold`),
    chance: within(raw["chance"], PLAYER_CHANCE_MIN, PLAYER_CHANCE_MAX, `${at} chance`),
    spread: whole(raw["spread"], PLAYER_SPREAD_MIN, PLAYER_SPREAD_MAX, `${at} spread`),
    drift: whole(raw["drift"], PLAYER_DRIFT_MIN, PLAYER_DRIFT_MAX, `${at} drift`),
  };
}

/**
 * A session's jump clock off the wire or out of storage, checked, with null passed through as
 * the whole of "no clock" — every yard then keeps its own time, which is what the player did
 * before it had one to share. The one validator: the command wire and the stored session both
 * come through here (0097).
 */
export function assertSync(value: unknown, at: string): number | null {
  if (value === null) return null;
  return within(value, SYNC_MIN_SECS, SYNC_MAX_SECS, at);
}

/**
 * When the next step may begin: `at` itself with no clock, and otherwise the first tick at or
 * after it. Ticks are counted from the context's own zero and from nothing else — never from
 * whichever deck happened to start first — which is what keeps a synced render a function of the
 * session rather than of the order its yards were played (0097, 0068).
 */
export const syncedFrom = (at: number, sync: number | null): number =>
  sync === null ? at : Math.ceil(at / sync - SYNC_TOLERANCE) * sync;

/**
 * One player rebuilt in its declared field order, or null. The projection the durable session
 * takes: history compares two sessions as JSON text, so one pattern has to have exactly one
 * spelling however the command that set it happened to be keyed (0021).
 */
export const playerProjection = (player: PlayerSpec | null): PlayerSpec | null =>
  player === null
    ? null
    : {
        seed: player.seed,
        // Each part rebuilt in its own declared order too, for the reason the spec is: two
        // sessions are compared as JSON text, so one song has exactly one spelling (0021).
        song: player.song.map((part) => ({
          id: part.id,
          character: part.character,
          amount: part.amount,
          length: part.length,
          chorus: part.chorus,
        })),
        slots: player.slots,
        distance: player.distance,
        bias: player.bias,
        stride: player.stride,
        home: player.home,
        phrase: player.phrase,
        phraseKeep: player.phraseKeep,
        phraseChance: player.phraseChance,
        phraseReturn: player.phraseReturn,
        repeats: player.repeats,
        repeatsChance: player.repeatsChance,
        repeatsSpread: player.repeatsSpread,
        repeatsHold: player.repeatsHold,
        ratchet: player.ratchet,
        gate: player.gate,
        drop: player.drop,
        reverse: player.reverse,
        burst: player.burst,
        vary: player.vary,
        varyChance: player.varyChance,
        rest: player.rest,
        restPulses: player.restPulses,
        restSpan: player.restSpan,
        restChance: player.restChance,
        restSpread: player.restSpread,
        hold: player.hold,
        chance: player.chance,
        spread: player.spread,
        drift: player.drift,
        arrange: player.arrange,
        arrangeKeep: player.arrangeKeep,
        arrangeChance: player.arrangeChance,
        arrangeReturn: player.arrangeReturn,
      };
