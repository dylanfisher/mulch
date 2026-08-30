/**
 * @role The one gate a durable pattern comes through: what the command wire and storage are
 *   allowed to say a `PlayerSpec` is, and the single spelling a stored one is written back in.
 *   Every bound it checks against is the declaring module's own — this file names no number of its
 *   own, because a second copy of a range is the copy that drifts (principle 1, 0089).
 * @instead What a spec *is*, and where each bound is declared → src/lib/player.ts, which this is
 *   the validator of. What one unfolds into → src/lib/playerWalk.ts. It is its own file because
 *   src/lib/player.ts stood at the 800-line hard cap and the spec grew (0045, 0198): the ranges
 *   and their reasons are one subject and checking a value against them is another.
 */
// Over the dependency cap, which is the same fact src/lib/player.ts's own waiver says: every
// family of this spec's numbers is declared in a module beside what reads it, and the one
// validator has to import all of them. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the 400-line soft cap, for the reason src/lib/player.ts is over it: this is one keyed
// check per number the spec declares plus the one spelling it is stored in, so its length is the
// size of that vocabulary rather than a judgement of its own. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { assertDurableText, objectAt, whole, within } from "./guards.ts";
import { albumsOf } from "./playerAlbum.ts";
import { stripOf } from "./playerStrip.ts";
import {
  PLAYER_PHRASE_CHANCE_MAX,
  PLAYER_PHRASE_CHANCE_MIN,
  PLAYER_PHRASE_KEEP_MAX,
  PLAYER_PHRASE_KEEP_MIN,
  PLAYER_PHRASE_RETURN_MAX,
  PLAYER_PHRASE_RETURN_MIN,
} from "./playerFigure.ts";
import {
  PLAYER_BIAS_MAX,
  PLAYER_BIAS_MIN,
  PLAYER_HOME_MAX,
  PLAYER_HOME_MIN,
  PLAYER_STRIDE_MAX,
  PLAYER_STRIDE_MIN,
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
  PLAYER_BED_PER_JUMP,
  bedPerOf,
  bedsOf,
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
} from "./playerRepeats.ts";
import { PLAYER_DROP_MAX, PLAYER_DROP_MIN } from "./playerDrop.ts";
import { PLAYER_REVERSE_MAX, PLAYER_REVERSE_MIN } from "./playerReverse.ts";
import { PLAYER_CAST_MAX, PLAYER_CAST_MIN } from "./playerCast.ts";
import { SYNC_MAX_SECS, SYNC_MIN_SECS } from "./playerClock.ts";
import {
  PLAYER_SPARK_DELAY_MAX,
  PLAYER_SPARK_DELAY_MIN,
  PLAYER_SPARK_LEVEL_MAX,
  PLAYER_SPARK_LEVEL_MIN,
  PLAYER_SPARK_MAX,
  PLAYER_SPARK_MIN,
} from "./playerSpark.ts";
import {
  PLAYER_DISTANCE_MAX,
  PLAYER_DISTANCE_MIN,
  PLAYER_PHRASE_MAX,
  PLAYER_PHRASE_MIN,
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
} from "./playerRungs.ts";
import {
  PLAYER_ARRANGE_CHANCE_MAX,
  PLAYER_ARRANGE_CHANCE_MIN,
  PLAYER_ARRANGE_KEEP_MAX,
  PLAYER_ARRANGE_KEEP_MIN,
  PLAYER_ARRANGE_AMOUNT_MAX,
  PLAYER_ARRANGE_AMOUNT_MIN,
  PLAYER_ARRANGE_APART_MAX,
  PLAYER_ARRANGE_APART_MIN,
  PLAYER_ARRANGE_GROW_MAX,
  PLAYER_ARRANGE_GROW_MIN,
  PLAYER_ARRANGE_MAX,
  PLAYER_ARRANGE_MIN,
  PLAYER_ARRANGE_SPAN_MAX,
  PLAYER_ARRANGE_SPAN_MIN,
  PLAYER_ARRANGE_RETURN_MAX,
  PLAYER_ARRANGE_RETURN_MIN,
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  PLAYER_SONG_MAX,
  type SongPart,
} from "./playerSong.ts";
import {
  partVoice,
  PLAYER_BURST_MAX,
  PLAYER_BURST_MIN,
  PLAYER_GATE_MAX,
  PLAYER_GATE_MIN,
  PLAYER_KNOBS,
  PLAYER_PART_KNOBS,
  PLAYER_SEED_MAX,
  PLAYER_VARY_CHANCE_MAX,
  PLAYER_VARY_CHANCE_MIN,
  PLAYER_VARY_MAX,
  PLAYER_VARY_MIN,
  type PartVoice,
  type PlayerSpec,
} from "./player.ts";

/**
 * The durable fields, in the order they are declared. The one list a stored spec is keyed against
 * — the four no dial reaches, then every one a hand turns, which are named once in
 * `PLAYER_KNOBS` above rather than spelled out a second time here (principle 1).
 */
const PLAYER_FIELDS = ["seed", "albums", "cast", "bedPer", "beds", ...PLAYER_KNOBS] as const;

/** The fields one part of a song is keyed against, read exactly as `PLAYER_FIELDS` is. */
const PART_FIELDS = ["id", "name", "skip", "voice", "length", "steps"] as const;

/**
 * What a part's captured spec is checked as: a whole player, with the fields a part does not carry
 * filled in at a legal value of their own — the four the song is drawn by and the six the ground
 * is walked by at their floors, the cast at its whole, which is the one of them whose floor is not
 * the identity — and thrown away again. There is exactly one validator for what a number of this
 * module may be, and a part's numbers are that module's numbers — a second copy of thirty-two
 * bounds here is the one thing principle 1 refuses, and it is the copy that would drift the first
 * time a range moved.
 */
const PART_VOICE_FILLER = {
  seed: 0,
  albums: [],
  beds: [],
  cast: PLAYER_CAST_MAX,
  arrange: PLAYER_ARRANGE_MIN,
  arrangeKeep: PLAYER_ARRANGE_KEEP_MIN,
  arrangeChance: PLAYER_ARRANGE_CHANCE_MIN,
  arrangeReturn: PLAYER_ARRANGE_RETURN_MIN,
  arrangeAmount: PLAYER_ARRANGE_AMOUNT_MIN,
  arrangeGrow: PLAYER_ARRANGE_GROW_MIN,
  arrangeSpan: PLAYER_ARRANGE_SPAN_MIN,
  arrangeApart: PLAYER_ARRANGE_APART_MIN,
  // The bed's own floor is −64 and its identity is zero, so it is filled at zero the way the cast
  // is filled at its whole: a filler is a legal value and never a meaningful one, and zero is the
  // loop itself (0184).
  bed: 0,
  bedPer: PLAYER_BED_PER_JUMP,
  bedEvery: PLAYER_BED_EVERY_MIN,
  bedDistance: PLAYER_BED_DISTANCE_MIN,
  bedBias: 0,
  bedHome: PLAYER_BED_HOME_MIN,
} as const;

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
 * One song's parts off the wire or out of storage, checked. An empty list is the whole of "no
 * song" and is the ordinary case, so it is not an error — a spec that holds none is the pattern
 * this module was before it could be arranged (0153).
 *
 * Loud about everything else, for the reason every field above is: a part is durable, it is
 * carried by a command, and a song quietly playing numbers nobody set is exactly the failure
 * principle 5 refuses. Keyed like the spec itself — no extra fields and none missing — so a part
 * from another build is a part from another build and not a part.
 */
function partsOf(value: unknown, at: string): readonly SongPart[] {
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
      // The cells a hand wrote it as, checked by the module that says what one may be — an empty
      // run is a part the dials draw, which is the ordinary case and not an error (0188).
      steps: stripOf(part["steps"], `${where} steps`),
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
    albums: albumsOf(raw["albums"], `${at} albums`, partsOf),
    // Refused empty by its own floor: a cast permitting nobody is an arrangement with no part to
    // draw, so the bound is the whole of that refusal rather than a clause beside it (0174).
    cast: whole(raw["cast"], PLAYER_CAST_MIN, PLAYER_CAST_MAX, `${at} cast`),
    // The one durable field of this spec that is not a number: three clocks are three clocks, and
    // the module that says what a ground is is what checks it (0192, src/lib/playerBed.ts).
    bedPer: bedPerOf(raw["bedPer"], `${at} bedPer`),
    // The grounds a hand planted, checked by the same module — a list and not a number, so it is
    // keyed and bounded there rather than clamped here (0184, src/lib/playerBed.ts).
    beds: bedsOf(raw["beds"], `${at} beds`),
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
    arrangeAmount: within(
      raw["arrangeAmount"],
      PLAYER_ARRANGE_AMOUNT_MIN,
      PLAYER_ARRANGE_AMOUNT_MAX,
      `${at} arrangeAmount`,
    ),
    arrangeGrow: whole(
      raw["arrangeGrow"],
      PLAYER_ARRANGE_GROW_MIN,
      PLAYER_ARRANGE_GROW_MAX,
      `${at} arrangeGrow`,
    ),
    arrangeSpan: whole(
      raw["arrangeSpan"],
      PLAYER_ARRANGE_SPAN_MIN,
      PLAYER_ARRANGE_SPAN_MAX,
      `${at} arrangeSpan`,
    ),
    arrangeApart: within(
      raw["arrangeApart"],
      PLAYER_ARRANGE_APART_MIN,
      PLAYER_ARRANGE_APART_MAX,
      `${at} arrangeApart`,
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
        // Each album, each song of it and each part of those rebuilt in their own declared order
        // too, for the reason the spec is: two sessions are compared as JSON text, so one
        // arrangement has exactly one spelling (0021, P147).
        albums: player.albums.map((album) => ({
          id: album.id,
          name: album.name,
          plays: album.plays,
          songs: album.songs.map((song) => ({
            id: song.id,
            name: song.name,
            plays: song.plays,
            parts: song.parts.map((part) => ({
              id: part.id,
              name: part.name,
              skip: part.skip,
              // The captured spec rebuilt off `PLAYER_PART_KNOBS` for the same reason: the list is
              // the order, so a voice has one spelling however the gesture that wrote it was keyed.
              voice: partVoice(part.voice),
              length: part.length,
              // And each cell in its own, one field at a time for the reason above it: a written
              // row is durable, so it has one spelling (0021, 0188).
              steps: part.steps.map((cell) => ({
                slot: cell.slot,
                repeats: cell.repeats,
                rest: cell.rest,
              })),
            })),
          })),
        })),
        cast: player.cast,
        bedPer: player.bedPer,
        // And each planted ground in its own declared order, for the reason a cell is: a list a
        // hand wrote is durable, so it has one spelling (0021).
        beds: player.beds.map((planted) => ({ bed: planted.bed, every: planted.every })),
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
        arrangeAmount: player.arrangeAmount,
        arrangeGrow: player.arrangeGrow,
        arrangeSpan: player.arrangeSpan,
        arrangeApart: player.arrangeApart,
      };
