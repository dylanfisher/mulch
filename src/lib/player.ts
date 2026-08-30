/**
 * @role The player's pattern as pure maths — the durable spec a deck carries, and every bound one
 *   of its numbers is declared inside. Same seed, same steps, on any machine and in any host: this
 *   is the file that says what a jumping performance *is* (0089, 0068).
 * @instead The one validator the command wire and storage come through, and the single spelling a
 *   stored spec is written back in → src/lib/playerWire.ts, which was this file's second half
 *   until the spec outgrew the hard cap (0045, 0198).
 *   What a spec unfolds into, and the shape of one step of it → src/lib/playerWalk.ts,
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
import { fromIds } from "./records.ts";
import type { FigureSpec } from "./playerFigure.ts";
import type { TravelSpec } from "./playerTravel.ts";
import type { BedSpec } from "./playerBed.ts";
import type { RepeatsSpec } from "./playerRepeats.ts";
import type { DropSpec } from "./playerDrop.ts";
import type { ReverseSpec } from "./playerReverse.ts";
import type { CastSpec } from "./playerCast.ts";
import type { SparkSpec } from "./playerSpark.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import type { RestSpec } from "./playerRest.ts";
import type { RateSpec } from "./playerRungs.ts";
import type { PlayerAlbum } from "./playerAlbum.ts";
import { type ArrangementSpec } from "./playerSong.ts";

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

// Whether a landing sounds at all — the odds it is a hole — is src/lib/playerDrop.ts's, beside
// the other odd a landing carries about itself: one family of this spec's numbers in a module of
// its own, the way the reverse's and the rest's are (0045).

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
  DropSpec &
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
    /** How long one burst sounds, in wall seconds, PLAYER_BURST_MIN…PLAYER_BURST_MAX. */
    burst: number;
    /** How far that length may vary either way, as a fraction of it, 0…1. */
    vary: number;
    /** The odds one landing's length is varied at all, 0…1. */
    varyChance: number;
    /**
     * How the pattern is arranged by hand: the albums it walks in turn, each a run of songs, each
     * of those a run of parts — or none at all, which is every jump drawn under the numbers above
     * (0153, P147). A list rather than a count, because the order is the arrangement. Held
     * whatever `arrange` says and walked only while `arrange` is zero: which author is live is a
     * rule and not a second field, so a hand's albums survive a spell of drawing untouched (0158).
     */
    albums: readonly PlayerAlbum[];
  };

/**
 * Every field a switch press leaves at a value: the whole spec but the seed, which is drawn at
 * the gesture rather than defaulted (0089). Named here so the card that declares those values and
 * the seven menus that snap a dial back to one are keyed against the same list (principle 1).
 */
export type PlayerDefaults = Omit<PlayerSpec, "seed">;

/**
 * Every field a character draws, and no others: the whole spec but the four a draw may not
 * touch. The seed is out for the reason 0152 gave — a character changes what the pattern is *like*
 * and reseed changes which performance of it you are hearing — and the song is out for the same
 * reason said one tier up: a character is what a part sounds like, so a draw that could rewrite
 * the arrangement it is a part of would be a part editing its own song (0153).
 *
 * The cast is out on the song's own terms, said one step further along: it is the list a drawn
 * arrangement's parts are drawn from, so a character that could rewrite it would be a part
 * deciding which characters the song after it may be (0174).
 *
 * The grounds a hand planted are out on the song's own terms too, and for the reason the song
 * itself is: a list of places a hand kept is not a number, and a character that could rewrite it
 * would be a part deciding where the loop the whole song reads on sits (0184).
 *
 * And the ground's own clock is out on those terms too, one field further along: it is the song's,
 * it is not a number any dial turns, and a voice is the numbers a step is drawn from — the walk
 * reads it off the spec, exactly where it reads the period it counts (0192).
 *
 * It is also exactly what a step is drawn from, which is why the walk carries one of these rather
 * than a spec: a part hands over a voice, and every draw in src/lib/playerWalk.ts reads it.
 */
export type PlayerVoice = Omit<PlayerDefaults, "albums" | "cast" | "bedPer" | "beds">;

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
 * And the thirteen the song itself carries, which are the card's own and never a part's. Eight of
 * them are what the song is *drawn* by: a part that could turn one would be an arrangement rewriting
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
  "arrangeAmount",
  "arrangeGrow",
  "arrangeSpan",
  "arrangeApart",
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
