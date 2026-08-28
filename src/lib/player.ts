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
// And over the dependency cap, which is the same fact said the other way: every family of this
// spec's numbers is declared in a module beside what reads it, and the one validator has to import
// all of them. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// oxlint-disable max-lines
import { assertDurableText, finite, objectAt } from "./guards.ts";
import { fromIds } from "./records.ts";
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
import {
  PLAYER_BED_BIAS_MAX,
  PLAYER_BED_BIAS_MIN,
  PLAYER_BED_DISTANCE_MAX,
  PLAYER_BED_DISTANCE_MIN,
  PLAYER_BED_EVERY_MAX,
  PLAYER_BED_EVERY_MIN,
  PLAYER_BED_HOME_MAX,
  PLAYER_BED_HOME_MIN,
  PLAYER_BED_MAX,
  PLAYER_BED_MIN,
  type BedSpec,
} from "./playerBed.ts";
import {
  PLAYER_RATCHET_MAX,
  PLAYER_RATCHET_MIN,
  PLAYER_REPEATS_CHANCE_MAX,
  PLAYER_REPEATS_CHANCE_MIN,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  PLAYER_REPEATS_SPREAD_MAX,
  PLAYER_REPEATS_SPREAD_MIN,
  type RepeatsSpec,
} from "./playerRepeats.ts";
import { PLAYER_REVERSE_MAX, PLAYER_REVERSE_MIN, type ReverseSpec } from "./playerReverse.ts";
import { PLAYER_CAST_MAX, PLAYER_CAST_MIN, type CastSpec } from "./playerCast.ts";
import { SYNC_MAX_SECS, SYNC_MIN_SECS } from "./playerClock.ts";
import {
  PLAYER_SPARK_DELAY_MAX,
  PLAYER_SPARK_DELAY_MIN,
  PLAYER_SPARK_LEVEL_MAX,
  PLAYER_SPARK_LEVEL_MIN,
  PLAYER_SPARK_MAX,
  PLAYER_SPARK_MIN,
  type SparkSpec,
} from "./playerSpark.ts";
import {
  PLAYER_DISTANCE_MAX,
  PLAYER_DISTANCE_MIN,
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
  PLAYER_CHANCE_MAX,
  PLAYER_CHANCE_MIN,
  PLAYER_CLIMB_MAX,
  PLAYER_CLIMB_MIN,
  PLAYER_DRIFT_MAX,
  PLAYER_DRIFT_MIN,
  PLAYER_HOLD_MAX,
  PLAYER_HOLD_MIN,
  PLAYER_SPREAD_MAX,
  PLAYER_SPREAD_MIN,
  type RateSpec,
} from "./playerRungs.ts";
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

// How much of a character a draw takes — `PLAYER_AMOUNT_MIN…MAX` and the step a hand sets it by —
// is src/lib/playerCharacter.ts's, which is where the characters it is a fraction of are and what
// that file's own @role already says it holds. Nothing durable carries it (0152, 0176).

// The grid itself — how many slots the loop has, how far a jump may travel over them and how long
// a figure of them may be — is src/lib/playerSlots.ts's: each of those bounds is derived from the
// count, so they are one family and sit in one module beside what reads them, exactly as the
// travel's and the rest's do (0045, 0165).

// How long one landing stays put — the count, its chance, its spread and the ratchet that shrinks
// it — is src/lib/playerRepeats.ts's, beside src/ui/PlayerRepeats.tsx which turns them: one family
// of this spec's numbers in a module of its own, the way the travel's and the rest's are (0045).

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
 * What a deck durably holds when its player is on. Null on the deck is the whole of "off" — the
 * same shape `loop` has, and for the same reason: there is no second field that could disagree
 * with it.
 */
export type PlayerSpec = BedSpec &
  FigureSpec &
  ArrangementSpec &
  CastSpec &
  RepeatsSpec &
  RestSpec &
  RateSpec &
  ReverseSpec &
  SparkSpec &
  TravelSpec & {
    /** The one field that makes a performance reproducible (0089). A whole number, 0…2³²−1. */
    seed: number;
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
 * Every field a character draws, and no others: the whole spec but the three a draw may not
 * touch. The seed is out for the reason 0152 gave — a character changes what the pattern is *like*
 * and reseed changes which performance of it you are hearing — and the song is out for the same
 * reason said one tier up: a character is what a part sounds like, so a draw that could rewrite
 * the arrangement it is a part of would be a part editing its own song (0153).
 *
 * The cast is out on the song's own terms, said one step further along: it is the list a drawn
 * arrangement's parts are drawn from, so a character that could rewrite it would be a part
 * deciding which characters the song after it may be (0174).
 *
 * It is also exactly what a step is drawn from, which is why the walk carries one of these rather
 * than a spec: a part hands over a voice, and every draw in src/lib/playerWalk.ts reads it.
 */
export type PlayerVoice = Omit<PlayerDefaults, "song" | "cast">;

/**
 * Every number of that spec a hand turns which a part of a song may carry its own value of, in the
 * order the card draws them. The three fields no dial reaches are out: the seed, which is minted
 * at a gesture, the song, which is a list and not a number, and the cast, which is a number but a
 * set of presses rather than a range — the same three `PLAYER_FIELDS` below names before splicing
 * `PLAYER_KNOBS` in. So are the five the ground is walked by, which are the song's (0184).
 *
 * The whole list is what the words in `src/lib/copyKnobs.ts` are keyed by, so a field with no
 * caption and no sentence is a hole one test finds (P65, P74).
 */
export const PLAYER_PART_KNOBS = [
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
  "spark",
  "sparkLevel",
  "sparkDelay",
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
  "climb",
] as const satisfies readonly (keyof PlayerSpec)[];
/** One of the numbers a part carries a value of its own for (0176). */
export type PlayerPartKnob = (typeof PLAYER_PART_KNOBS)[number];

/**
 * And the nine the song itself carries, which are the card's own and never a part's. Four of them
 * are what the song is *drawn* by: a part that could turn one would be an arrangement rewriting
 * the arrangement it is inside — the claim 0153 refused for a character and 0176 refuses for a
 * captured spec (0158, 0174). The five beside them are the ground the whole song is read on, out
 * of a part's hands for the reason 0184 gives — the loop walks the source once, under every part
 * in turn, so a part carrying a bed of its own would be nine parts disagreeing about where the
 * one loop is.
 *
 * The split is here rather than beside the dials because it is what a part *is*, and
 * `PLAYER_SONG_KNOBS` in src/lib/playerKnobs.ts throws at load if the two lists ever stop
 * partitioning this one (principle 1, 0122).
 */
export const PLAYER_KNOBS = [
  ...PLAYER_PART_KNOBS,
  "arrange",
  "arrangeKeep",
  "arrangeChance",
  "arrangeReturn",
  "bed",
  "bedEvery",
  "bedDistance",
  "bedBias",
  "bedHome",
] as const satisfies readonly (keyof PlayerSpec)[];
export type PlayerKnob = (typeof PLAYER_KNOBS)[number];

/**
 * What one part of a song holds instead of a character: every number a hand turns but the four the
 * song is drawn by — the dials as they stood at the gesture that captured them (0176). A part is
 * this and a length, which is the whole of what a part is.
 */
export type PartVoice = Pick<PlayerDefaults, PlayerPartKnob>;

/** One of those, read off anything carrying the whole set — a spec, a voice, or the defaults. */
export const partVoice = (from: Readonly<Record<PlayerPartKnob, number>>): PartVoice =>
  fromIds(PLAYER_PART_KNOBS, (knob) => from[knob]);

/**
 * The same, said for the whole voice a step is drawn from: a part's own numbers over the song's
 * four, which is what the walk hands its draws (src/lib/playerWalk.ts). Both are built off the one
 * list rather than spread from a spec, so a field a spec carries and a voice does not — the seed,
 * the song, the cast — can never ride along.
 */
export const playerVoice = (from: Readonly<Record<PlayerKnob, number>>): PlayerVoice =>
  fromIds(PLAYER_KNOBS, (knob) => from[knob]);

/**
 * The durable fields, in the order they are declared. The one list a stored spec is keyed against
 * — the three no dial reaches, then every one a hand turns, which are named once in
 * `PLAYER_KNOBS` above rather than spelled out a second time here (principle 1).
 */
const PLAYER_FIELDS = ["seed", "song", "cast", ...PLAYER_KNOBS] as const;

/** The fields one part of a song is keyed against, read exactly as `PLAYER_FIELDS` is. */
const PART_FIELDS = ["id", "name", "skip", "voice", "length"] as const;

/**
 * What a part's captured spec is checked as: a whole player, with the fields a part does not carry
 * filled in at a legal value of their own — the four the song is drawn by and the five the ground
 * is walked by at their floors, the cast at its whole, which is the one of them whose floor is not
 * the identity — and thrown away again. There is exactly one validator for what a number of this
 * module may be, and a part's numbers are that module's numbers — a second copy of thirty-two
 * bounds here is the one thing principle 1 refuses, and it is the copy that would drift the first
 * time a range moved.
 */
const PART_VOICE_FILLER = {
  seed: 0,
  song: [],
  cast: PLAYER_CAST_MAX,
  arrange: PLAYER_ARRANGE_MIN,
  arrangeKeep: PLAYER_ARRANGE_KEEP_MIN,
  arrangeChance: PLAYER_ARRANGE_CHANCE_MIN,
  arrangeReturn: PLAYER_ARRANGE_RETURN_MIN,
  // The bed's own floor is −64 and its identity is zero, so it is filled at zero the way the cast
  // is filled at its whole: a filler is a legal value and never a meaningful one, and zero is the
  // loop itself (0184).
  bed: 0,
  bedEvery: PLAYER_BED_EVERY_MIN,
  bedDistance: PLAYER_BED_DISTANCE_MIN,
  bedBias: 0,
  bedHome: PLAYER_BED_HOME_MIN,
} as const;

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
 * One part's captured spec off the wire or out of storage, checked through the one validator: the
 * numbers a part carries are the module's own numbers, so they are checked by the thing that says
 * what those numbers may be, and this function's whole job is to hand it a spec and take the part
 * knobs back off the answer (0176, principle 1).
 *
 * Keyed exactly, like everything else durable: a voice missing a knob or carrying one it may not —
 * the seed, the song, or one of the four the song itself is drawn by — is refused before the fill
 * below could quietly overwrite it.
 */
function voiceOf(value: unknown, at: string): PartVoice {
  const raw = objectAt(value, at);
  const keys = Object.keys(raw);
  if (keys.length !== PLAYER_PART_KNOBS.length || PLAYER_PART_KNOBS.some((k) => !(k in raw))) {
    throw new TypeError(`${at} has ${keys.join(", ")}, expected ${PLAYER_PART_KNOBS.join(", ")}`);
  }
  const spec = assertPlayer({ ...PART_VOICE_FILLER, ...raw }, at);
  if (spec === null) throw new TypeError(`${at} is null`);
  return partVoice(spec);
}

/**
 * A song off the wire or out of storage, checked. An empty list is the whole of "no song" and is
 * the ordinary case, so it is not an error — a spec that holds none is the pattern this module was
 * before it could be arranged (0153).
 *
 * Loud about everything else, for the reason every field above is: a part is durable, it is
 * carried by a command, and a song quietly playing numbers nobody set is exactly the failure
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
    const id: unknown = part["id"];
    // The same guard every other durable id goes through: opaque text of a bounded length, and
    // nothing about what it means — a part id is identity and this file never reads one (0157).
    assertDurableText(id, `${where} id`);
    // And one part per id, the way every other list of opaque durable ids in the session is
    // checked (src/state/session.ts): a badge names a part, and two parts under one name would
    // light together, drag as one and be two things nothing could tell apart (principle 5, 0157).
    if (seen.has(id)) throw new TypeError(`${where} repeats the id ${id}`);
    seen.add(id);
    // The same guard again, because a name is durable text like an id is (src/lib/guards.ts), and
    // it refuses the empty string: there is no un-named part, only one still called its own badge.
    const name: unknown = part["name"];
    assertDurableText(name, `${where} name`);
    const skip: unknown = part["skip"];
    if (typeof skip !== "boolean") throw new TypeError(`${where} skip is not a boolean`);
    return {
      id,
      name,
      skip,
      voice: voiceOf(part["voice"], `${where} voice`),
      length: whole(part["length"], PLAYER_PART_MIN, PLAYER_PART_MAX, `${where} length`),
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
    // Refused empty by its own floor: a cast permitting nobody is an arrangement with no part to
    // draw, so the bound is the whole of that refusal rather than a clause beside it (0174).
    cast: whole(raw["cast"], PLAYER_CAST_MIN, PLAYER_CAST_MAX, `${at} cast`),
    bed: whole(raw["bed"], PLAYER_BED_MIN, PLAYER_BED_MAX, `${at} bed`),
    bedEvery: whole(raw["bedEvery"], PLAYER_BED_EVERY_MIN, PLAYER_BED_EVERY_MAX, `${at} bedEvery`),
    bedDistance: whole(
      raw["bedDistance"],
      PLAYER_BED_DISTANCE_MIN,
      PLAYER_BED_DISTANCE_MAX,
      `${at} bedDistance`,
    ),
    bedBias: within(raw["bedBias"], PLAYER_BED_BIAS_MIN, PLAYER_BED_BIAS_MAX, `${at} bedBias`),
    bedHome: within(raw["bedHome"], PLAYER_BED_HOME_MIN, PLAYER_BED_HOME_MAX, `${at} bedHome`),
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
    spark: within(raw["spark"], PLAYER_SPARK_MIN, PLAYER_SPARK_MAX, `${at} spark`),
    sparkLevel: within(
      raw["sparkLevel"],
      PLAYER_SPARK_LEVEL_MIN,
      PLAYER_SPARK_LEVEL_MAX,
      `${at} sparkLevel`,
    ),
    sparkDelay: within(
      raw["sparkDelay"],
      PLAYER_SPARK_DELAY_MIN,
      PLAYER_SPARK_DELAY_MAX,
      `${at} sparkDelay`,
    ),
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
    climb: whole(raw["climb"], PLAYER_CLIMB_MIN, PLAYER_CLIMB_MAX, `${at} climb`),
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
 * One player rebuilt in its declared field order, or null. The projection the durable session
 * takes: history compares two sessions as JSON text, so one pattern has to have exactly one
 * spelling however the command that set it happened to be keyed (0021).
 */
// One line per durable field and nothing else, so its length is the size of the spec rather than a
// judgement of its own — and a spelling half of which lived in another function would be two
// spellings (0021). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export const playerProjection = (player: PlayerSpec | null): PlayerSpec | null =>
  player === null
    ? null
    : {
        seed: player.seed,
        // Each part rebuilt in its own declared order too, for the reason the spec is: two
        // sessions are compared as JSON text, so one song has exactly one spelling (0021).
        song: player.song.map((part) => ({
          id: part.id,
          name: part.name,
          skip: part.skip,
          // The captured spec rebuilt off `PLAYER_PART_KNOBS` for the same reason: the list is the
          // order, so a voice has one spelling however the gesture that wrote it was keyed.
          voice: partVoice(part.voice),
          length: part.length,
        })),
        cast: player.cast,
        bed: player.bed,
        bedEvery: player.bedEvery,
        bedDistance: player.bedDistance,
        bedBias: player.bedBias,
        bedHome: player.bedHome,
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
        spark: player.spark,
        sparkLevel: player.sparkLevel,
        sparkDelay: player.sparkDelay,
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
        climb: player.climb,
        arrange: player.arrange,
        arrangeKeep: player.arrangeKeep,
        arrangeChance: player.arrangeChance,
        arrangeReturn: player.arrangeReturn,
      };
