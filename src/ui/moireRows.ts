/**
 * @role What a yard's drift is made of before anything draws it: one row per lane it is running,
 *   one per instance its rack is playing and one per effect those instances have grown, one per
 *   tier of the arrangement its jumps module is walking and one for its loop — and, for
 *   an instance, how the values it is set to reach that row through the dimensions its registry
 *   entry declared, the three that are colour following the lane where one is riding the knob that
 *   claims them (0150), for the module where in the three tiers the walk is standing right
 *   now, and for the loop and the wash over it the ground the yard is reading on. Pure of React
 *   and of the canvas, so the rows a yard makes are read without rendering one.
 * @instead The picture itself, its two sizes and the frame loop → src/ui/MoireStrip.tsx. What a row
 *   means, and the window the rows are drawn across → src/lib/moire.ts; the estimate of when they
 *   all line up → src/lib/recurrence.ts. Drawing them → src/ui/moireCanvas.ts.
 */
// Two imports over the cap. One is the per-frame read this file now performs: the shape `peek()`
// fills, which is where a lane's phase and an instance's meter both arrive (P105). The other is the
// word for a tier of an arrangement, which a row of one is keyed by and which is named once (P161).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import {
  DECK_AUTOMATION_PARAM_IDS,
  effectAutomationParamIds,
  paramIn,
  PARAMS,
  paramKey,
} from "@/audio/params";
import { drawnParamIds } from "@/audio/effects/automator";
import { effectById, isEffectId, isGrowable, type EffectId } from "@/audio/effects/registry";
import { automationValueAt, laneSpan, type AutomationPoint } from "@/lib/automation";
import { fold } from "@/lib/copy";
import {
  colourReached,
  COLOUR_REACH,
  DRIFT_BROADEST_PITCH,
  driftReached,
  DRIFT_REST,
  FLAT_BEND,
  laneBend,
  LINEAR_GEOMETRY,
  MIN_ROW_CYCLES,
  MOIRE_CYCLES,
  moireWindowSecs,
  wrap,
  type ColourDimension,
  type DriftDimension,
  type DriftGeometry,
  type DriftReach,
  type MoireRow,
} from "@/lib/moire";
import { PLAIN_PROFILE, type DriftProfile } from "@/lib/moireProfiles";
import {
  heardPitch,
  heardPulse,
  heardShape,
  meterPulse,
  PLAIN_CUT,
  washAmount,
  type SourceCut,
} from "@/lib/moireSound";
import { playerRow, playerRowStand, playerTierInto, playerTierRow } from "@/lib/playerDrift";
import { recurrenceLength, type RecurrenceLength } from "@/lib/recurrence";
import { normalize } from "@/lib/range";
import type { EffectInstanceId, GrownEffect } from "@/audio/effects/contract";
import type { EffectParamId } from "@/audio/params";
import type { BeatAnalysis } from "@/lib/analysis";
import type { NamedTier } from "@/lib/copyNames";
import type { DeckPeek, PlayerPeek } from "@/audio/deckPeek";
import type { Loop } from "@/lib/timeline";
import type { SongPart } from "@/lib/playerSong";
import type { DeckState } from "@/state/store";
// oxlint-enable import/max-dependencies

/**
 * One lane as a row: the key `peek()` files its phase under, the period it repeats on, the
 * waveform its parameter draws it with, its own gesture across one cycle, and the profile the
 * effect it belongs to declared. The middle two are what keep two lanes of the same period on
 * different parameters from drawing the same row; the last is what says which kind of thing the
 * knob is on.
 */
export type MoireLane = {
  key: string;
  period: number;
  shape: number;
  bend: readonly number[];
  profile: DriftProfile;
  geometry: DriftGeometry;
};

/**
 * Every lane this deck is actually running — its own and every rack instance's — each with the
 * period `laneSpan` reports for it, which P53 made something a gesture edits (0079). A lane that
 * never moved has no period and is not a row: an unmoving line is not drift.
 */
export function deckLanes(
  automation: DeckState["automation"],
  effects: DeckState["effects"],
): MoireLane[] {
  const lanes: MoireLane[] = [];
  for (const param of DECK_AUTOMATION_PARAM_IDS) {
    const lane = automation[param];
    if (lane === undefined || laneSpan(lane) <= 0) continue;
    lanes.push({
      key: paramKey(null, param),
      period: laneSpan(lane),
      // The parameter and not the key: a row's shape says which knob is drifting, so the same
      // knob on two rack instances reads as the same kind of row and their gestures separate them.
      shape: fold(param),
      bend: laneBend(lane),
      // A deck's own knob belongs to no effect, so it is cut to the plain grating the loop is,
      // along the straight axis every row was cut along before an effect could bend one.
      profile: PLAIN_PROFILE,
      geometry: LINEAR_GEOMETRY,
    });
  }
  for (const instance of effects) {
    // What the rack skips (src/audio/effects/rack.ts) is not in the signal path, so neither its
    // own row nor any lane riding it is in the picture: a bypassed instance is a sound nobody can
    // hear (0139). It leaves while the switch is off and comes back unchanged when it is on,
    // because nothing about a row is stored.
    if (instance.bypassed) continue;
    for (const param of effectAutomationParamIds(instance.effect)) {
      const lane = instance.automation[param];
      if (lane === undefined || laneSpan(lane) <= 0) continue;
      lanes.push({
        key: paramKey(instance.id, param),
        period: laneSpan(lane),
        shape: fold(param),
        bend: laneBend(lane),
        // A lane on an effect's knob is that effect doing something, so it is cut the way the
        // instance's own row below is: to the profile and coordinate the registry entry declares.
        ...driftCut(instance.effect),
      });
    }
  }
  return lanes;
}

/**
 * How a row belonging to one registry entry is cut: the shape of its wave and the coordinate that
 * wave runs down, both declared beside the entry's icon (0137, 0142). Three rows ask it — a lane on
 * one of that effect's knobs, the instance's own row, and a row the automator grew — and one
 * lookup answers, so a fourth kind of row cannot be cut to a fifth kind of thing (principle 3).
 */
const driftCut = (effect: EffectId): Pick<MoireRow, "profile" | "geometry"> => {
  const plugin = effectById(effect);
  return { profile: plugin.drift, geometry: plugin.geometry };
};

/**
 * Where each value an instance's registry entry declared a way into the picture for stands in its
 * own range, as a turn on 0..1 — what `driftReached` folds into the row. Read off the value the
 * session holds rather than off a lane: a knob at rest still says what its effect is doing, and a
 * lane on that knob goes on bending the row it already bends (0139). Where a lane rides a knob that
 * claims one of the three colour dimensions, `colourReads` below carries that one live (0150).
 */
export function effectReach(instance: DeckState["effects"][number]): DriftReach[] {
  return effectById(instance.effect).driftFrom.map(({ param, into }) => {
    const spec = PARAMS[param];
    return {
      into,
      turn: normalize(paramIn(instance.params, param), spec.min, spec.max, spec.curve),
    };
  });
}

/**
 * The same, for an effect an automator grew rather than one a hand added: where each value its
 * registry entry declared a way into the picture for stands, read off what the run drew it at.
 *
 * A grown effect holds no session entry to read a knob out of, so the turns come from the run
 * itself — `GrownEffect.values` is already each drawn knob as a fraction of its own range, in the
 * order `drawnParamIds` declares (src/audio/effects/automator.ts, 0208). A dimension whose
 * parameter the pool does not draw — one a rebuild or a hold keeps back — stands at the entry's own
 * default, which is exactly where that knob is on a place nobody has moved.
 */
export function grownReach(effect: EffectId, values: readonly number[]): DriftReach[] {
  const plugin = effectById(effect);
  const drawn = isGrowable(plugin) ? drawnParamIds(plugin) : [];
  return plugin.driftFrom.map(({ param, into }) => {
    const spec = PARAMS[param];
    const at = drawn.indexOf(param);
    const value = values[at];
    return {
      into,
      turn: value ?? normalize(spec.default, spec.min, spec.max, spec.curve),
    };
  });
}

/**
 * The colour dimensions of an instance's row that follow a lane rather than resting where the knob
 * is parked. Only the three: a lane's own row already says the gesture is there, and what a knob
 * under it is doing to the *shape* of the picture is what it is set to (0139). Colour is the one
 * thing a lane may carry, because the dial travels and the picture must travel with it (0150).
 *
 * A lane that never moved is not one: an unmoving line drives nothing, which is the same test
 * `deckLanes` opens with.
 */
/** Whether a dimension a registry entry claimed is one of the three that are colour (0141). */
const isColour = (into: DriftDimension): into is ColourDimension => into in COLOUR_REACH;

export function colourReads(instance: DeckState["effects"][number]): ColourRead[] {
  const reads: ColourRead[] = [];
  const reach = effectById(instance.effect).driftFrom;
  for (const param of effectAutomationParamIds(instance.effect)) {
    const lane = instance.automation[param];
    if (lane === undefined || laneSpan(lane) <= 0) continue;
    const into = reach.find((each) => each.param === param)?.into;
    if (into === undefined || !isColour(into)) continue;
    reads.push({
      into,
      key: paramKey(instance.id, param),
      lane,
      base: paramIn(instance.params, param),
      spec: PARAMS[param],
    });
  }
  return reads;
}

/**
 * The identity of the row the whole yard's recurrence draws. Belongs to no parameter and to no
 * instance, so it is folded off its own name the way every other row is folded off something of its
 * own — its angle and where in its cycle it starts have to be nobody else's.
 */
const MACRO_SHAPE = fold("the whole yard coming round");

/**
 * How long the macro row runs, or nothing at all. It is the recurrence — when every period in the
 * picture next lines up (0080) — which is a length the yard already knows and no knob owns, so a
 * grating on it reorganises the whole composition on a period nothing else in it has.
 *
 * Nothing at all in four cases, each of them the row saying something untrue. A recurrence carried
 * as a magnitude rather than as seconds is longer than a length, and a picture cannot draw one; a
 * yard of one period recurs on that period, so the macro row would be a second copy of a row
 * already in the picture; and a picture with nothing going round has nothing to come round.
 *
 * And a recurrence that does not come round twice inside the window the picture is drawn across is
 * a line rather than a band, which is the one thing this picture must not read as (`MIN_ROW_CYCLES`)
 * — `gratingPitch` bands every spacing, so a recurrence of eighty seconds and one of a hundred
 * million draw the identical grating, and the second of them never moves. **The usual answer is on
 * the order of geological time** (src/lib/copy.ts), so this is the common case and not the corner:
 * a yard whose whole cycle is longer than the picture gets no macro row, because there is nothing
 * about it a picture could show.
 */
function macroPeriod(
  recurrence: RecurrenceLength,
  periods: readonly number[],
  windowSecs: number,
): number {
  if (!("secs" in recurrence)) return 0;
  const longest = Math.max(0, ...periods.filter((period) => Number.isFinite(period) && period > 0));
  if (recurrence.secs <= longest) return 0;
  return recurrence.secs * MIN_ROW_CYCLES <= windowSecs ? recurrence.secs : 0;
}

/**
 * The identity of the row the whole yard's wash is laid over. Belongs to no parameter and to no
 * instance either, so it is folded off its own name the way the macro row above is.
 */
const WASH_SHAPE = fold("the yard washed over");

/**
 * The two rows no effect and no lane owns: the loop, which is the reference the rest are read
 * against, and the macro row on the whole yard coming round. Both are the plainest grating there is
 * along the straight axis every row was cut along before an effect could bend one, both bend
 * nothing, and both rest in every dimension a value of an effect's would have reached — so what
 * separates them is a period, an identity and which of them is the reference.
 */
const plainRow = (
  period: number,
  shape: number,
  reference: boolean,
  cut: SourceCut = PLAIN_CUT,
): MoireRow => ({
  period,
  phase: 0,
  pulse: 0,
  reference,
  shape,
  bend: FLAT_BEND,
  geometry: LINEAR_GEOMETRY,
  ...DRIFT_REST,
  // Last, so what the source says about the reference row stands over the rest a plain row is:
  // the wave its envelope cuts and the spacing its onsets set (0145). The macro row and a yard
  // with nothing measured take the plain cut, which is what this row was before there was a
  // source in the picture.
  profile: cut.profile,
  pitch: cut.pitch,
});

/**
 * A colour dimension of one row that a lane is riding: which of the three it is, the key `peek()`
 * files that lane's phase under, the lane itself and the value the knob is parked at — everything
 * `automationValueAt` needs to say where the parameter actually stands this frame, and where in its
 * own range that lands (0150). Built once with the rows: a lane a gesture edits is a new set.
 */
type ColourRead = {
  into: ColourDimension;
  key: string;
  lane: readonly AutomationPoint[];
  base: number;
  spec: (typeof PARAMS)[EffectParamId];
};

/**
 * Where one row's per-frame numbers are read from: the lane's key `peek()` files its phase under,
 * the rack instance whose meter says how hard it is working, and the colour dimensions of it a lane
 * is carrying. The first two are null for a row that is neither — the loop's, the macro row's — and
 * never both set: a lane rides an instance, and what it draws is that gesture rather than that
 * effect's own reading (0128 amended).
 */
export type RowRead = {
  lane: string | null;
  instance: EffectInstanceId | null;
  colour: readonly ColourRead[];
  /**
   * Which of the arrangement's three tiers this row draws, or null on every row that is not one of
   * the jumps module's: the part standing, whose identity, spacing and tint are that part's rather
   * than anything a knob is parked at (0157, `src/lib/playerDrift.ts`), and the song and the album
   * over it, whose identities are their own tier's. A word and not a third id, because the module
   * is one per yard: there is nothing to key its rows by.
   */
  tier: NamedTier | null;
  /**
   * And the identity a row the ground *turns* rests at — the wash's own fold, and non-null on that
   * row alone. The resting value and not a flag, for the reason the `heard` pitch below is one: the
   * per-frame read has what a yard reading nowhere draws in hand and never recomputes it
   * (`heardShape`, src/lib/moireSound.ts). The reference row is anchored on the same ground and
   * carries none of this, because the axis the rest are fanned either side of is never fanned
   * itself (`gratingTurns`, src/lib/moire.ts) — an identity written onto it would move nothing in
   * the picture and cost it the zero that says it is the axis.
   */
  ground: number | null;
  /**
   * And the reference row's own: the spacing the whole source cuts it at, which is where it rests
   * wherever there is nothing sounding to say otherwise. Non-null on that row alone, because it is
   * the one row the sound itself cuts rather than a knob (0196) — the pitch and not a flag, so the
   * per-frame read has the resting answer in hand and never recomputes the source's own cut.
   */
  heard: number | null;
};

/** The colour nothing is carrying, shared: a per-frame read allocates nothing (0070). */
const NO_COLOUR: readonly ColourRead[] = [];

/** A row nothing is read for: its phase runs on the deck's own clock and it never pulses. */
const READS_NOTHING: RowRead = {
  lane: null,
  instance: null,
  colour: NO_COLOUR,
  tier: null,
  ground: null,
  heard: null,
};

/**
 * A row read for one lane and for nothing else, filed under the key `peek()` files that lane's
 * phase under. Written as the read nothing is plus its own field, and so are the other two below,
 * so what a `RowRead` holds is named once and a fourth kind of row is a field rather than four
 * literals to keep in step (principle 1).
 */
const laneRead = (lane: string): RowRead => ({ ...READS_NOTHING, lane });

/**
 * Which part of the song being walked is standing, as the part itself rather than as its badge.
 * The one thing the module's row is read off besides the session (0158): a drawn song is a run
 * nothing stores, so the arrangement in force is the cursor's to say and this reads it there rather
 * than deriving a second. A loop rather than `find`, because this is on the frame path and a
 * closure per row per frame is an allocation (0070); a song holds at most `PLAYER_SONG_MAX`.
 */
function standingPart(peek: Readonly<PlayerPeek>): SongPart | null {
  const step = peek.step;
  if (step === null) return null;
  const { part, song } = step;
  if (part === null || song === null) return null;
  for (const each of song) if (each.id === part) return each;
  return null;
}

/**
 * What one yard's picture is made of: its rows at their own zero, where each one's two per-frame
 * numbers are read from, the periods the yard is actually running and when they next line up.
 */
export type MoireRowSet = {
  rows: MoireRow[];
  reads: RowRead[];
  /**
   * How washed the yard sounded at the last per-frame read — the one number in the picture that
   * belongs to the field rather than to a row, written here by `refillRows` and read by the paint
   * (0213). Nought until a read has filled it, which is the picture drawn before there was an
   * output to hear.
   */
  wash: number;
  periods: number[];
  recurrence: RecurrenceLength;
  /** How wide a window the rows are drawn across, in real seconds — one number, at both sizes. */
  windowSecs: number;
};

/**
 * The picture's rows at their own zero, and beside them where each one's two per-frame numbers are
 * read from. Only `phase` and `pulse` move after this.
 *
 * Every lane carries its own identity, the waveform its parameter draws and its own bend. Every
 * instance the rack is playing carries a row too, whether or not anything is automating it: its
 * identity is folded out of its own id the way its name already is (0076), and the rest of it —
 * how long it runs, how deep it cuts, how fine it is drawn, how far it breathes — is what the
 * effect is set to, through the dimensions its registry entry declared (0139). A bypassed instance
 * carries none: what nobody can hear is not in the picture. And every effect an instance has *grown*
 * carries one too, out of the per-frame read rather than out of the session, because that is the
 * only place a run exists at all (`grownInto`, 0204). The loop belongs to no parameter, so
 * bends nothing: it is the reference the others are read against, not another gesture. What it is
 * cut to and how fine it is drawn are the source's, out of the clip's own analysis — so a yard
 * playing one file and a yard playing another draw two pictures through one rack (0145).
 *
 * The jumps module carries one too wherever the yard is actually jumping, because the thing that
 * moves where the deck reads from is not something the picture may be silent about. Its period is
 * the landing its dials say and its identity, its spacing, its tint, its wave and the coordinate it
 * is cut along are the part of its song
 * standing right now — the one row in the picture that moves in steps, which is what a song is
 * (`src/lib/playerDrift.ts`, 0157).
 *
 * Last of all, and only where the yard has one the picture can show, the macro row: a grating on
 * the recurrence of every other row, which is the one period in the picture no knob owns (0143). It
 * is returned beside the periods it was built from, the recurrence it was built out of and the
 * window it has to come round inside, so the estimate beside the picture and the window the picture
 * is drawn across are read off the yard rather than off a row the picture added to itself.
 */
// One pass over the four kinds of row a picture holds — lanes, rack instances, the jumps module
// and the loop — each a push and its read. Splitting it hands `rows` and `reads` between helpers
// that must stay index-for-index. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function moireRows(
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
  cut: SourceCut,
  playerPeriod: number | null,
  grown: GrownRun,
): MoireRowSet {
  const rows: MoireRow[] = lanes.map(({ period, shape, bend, profile, geometry }) => ({
    period,
    phase: 0,
    pulse: 0,
    reference: false,
    shape,
    bend,
    profile,
    geometry,
    ...DRIFT_REST,
  }));
  const reads: RowRead[] = lanes.map(({ key }) => laneRead(key));
  for (const instance of effects) {
    if (instance.bypassed) continue;
    // The fold is still the row's identity — its angle and where in its cycle it starts — and what
    // the effect is set to is the rest of it, through the dimensions its registry entry declared.
    const seed = fold(instance.id);
    rows.push({
      ...driftReached(seed, effectReach(instance)),
      phase: 0,
      pulse: 0,
      reference: false,
      shape: seed,
      ...driftCut(instance.effect),
    });
    // Its own row is the one thing an instance's meter may move, so this is where the id is kept.
    // A lane riding the same instance keeps none: what a lane draws is the gesture (0128).
    reads.push({ ...READS_NOTHING, instance: instance.id, colour: colourReads(instance) });
    grownInto(rows, reads, grown.get(instance.id));
  }
  playerInto(rows, reads, playerPeriod);
  if (loopPeriod > 0) {
    // The reference is the axis the others are fanned either side of, so its identity is the zero
    // no fold produces rather than one of its own (`gratingTurns`, src/lib/moire.ts).
    rows.push(plainRow(loopPeriod, 0, true, cut));
    // The one row with a resting pitch to come back to: what the whole source cuts it at, which
    // the per-frame read spends wherever the stretch actually sounding says nothing (0196).
    reads.push({ ...READS_NOTHING, heard: cut.pitch });
  }
  // Nothing in the picture lines up again where something in the yard is drawing from a stream
  // rather than repeating: a grown run, and a jumping pattern by the same argument — its steps are
  // drawn from a seed and its row's period is how often it *steps*, never when it comes back
  // (0080, 0089, 0208).
  const unbounded =
    playerPeriod !== null ||
    effects.some((instance) => !instance.bypassed && effectById(instance.effect).grows === true);
  const macro = macroInto(rows, reads, loopPeriod, unbounded);
  washInto(rows, reads, loopPeriod);
  return { rows, reads, wash: 0, ...macro };
}

/**
 * The field's own row onto a picture with a loop to lay it over: one broad grating on the loop's own
 * period, cut by nothing until the yard is washed and by half a picture when it fully is
 * (`washedDepth`). It carries no read of its own — its depth is the field's reading, which the paint
 * spends over every row at once (0213) — so it runs on the deck's clock the way the macro row does.
 *
 * At its own zero depth rather than at rest, because a dry yard must draw exactly the picture it
 * drew before there was a wash in it; and after the macro row, so the periods, the recurrence and
 * the window are all read off the yard rather than off a row the picture added to itself. It is a
 * grating like any other once it is there, so it counts among them and the picture's ink is shared
 * out over it — the wash blends the picture rather than adding a thing to it.
 */
function washInto(rows: MoireRow[], reads: RowRead[], loopPeriod: number): void {
  if (loopPeriod <= 0) return;
  rows.push({ ...plainRow(loopPeriod, WASH_SHAPE, false), depth: 0, pitch: DRIFT_BROADEST_PITCH });
  reads.push({ ...READS_NOTHING, ground: WASH_SHAPE });
}

/**
 * The per-frame read, and the whole of it: every row's phase, every row's pulse, the identity each
 * of the module's three rows takes from the tier of the arrangement it draws, the four other things
 * the part's own row takes from the part standing, and the identity and the anchor the reference
 * row and the wash over it take from the ground the pattern is reading on — all written into the
 * rows the set was built with. Enters no React
 * state and is called from the one frame loop through the drift's own cadence (plan §2, 0070,
 * 0144).
 *
 * The loop and the source's length are taken whole rather than as the loop's in-point alone,
 * because the ground is an offset in the loop's own sixteenths folded onto the room the file has
 * either side of it (0185): the anchor needs the span and the duration the fold is against, and so
 * does the ground the two rows the field is beaten against are folded off. The analysis comes in
 * for the reference row alone, which is cut by the stretch of source sounding
 * under the playhead rather than by the file as a whole (0196).
 *
 * **It allocates only where a standing pattern's ground is resolved and folded, and nowhere else.**
 * Every row, every read and every map here is written in place, which is why `standingPart` below is
 * a loop rather than a `find` — but `bedGround` answers a pair and a bound (src/lib/playerBed.ts),
 * so a yard with a pattern standing costs three object literals per painting — the bounds, the
 * ground and the pair both halves of it are answered in — plus the one short string the field's own
 * identity is folded over (`heardShape`, src/lib/moireSound.ts). Spelling the fold out here
 * to avoid them is the one thing 0185 forbids: two authors of the crawl is a picture that can
 * disagree with the loop a press writes. So 0070's rule is paid where it is cheap and this is what
 * it costs, at the drift's own cadence rather than at 60fps (0144) — the peaks already pay it on
 * their frame path for the same reason (`paintFrame`, src/ui/Waveform.tsx).
 *
 * **And the one number it answers rather than writes**: how washed the yard has become, off the
 * crest of the same window the meter is read from. It belongs to the field and to no row, so there
 * is nowhere among the rows to put it and it is returned instead — the paint spends it over every
 * row at once (0213).
 *
 * A lane the voice has not armed yet reports no phase and its row sits at its own zero rather than
 * vanishing, because the period is a fact about the lane either way. The loop's row and a rack
 * instance's are automated by nothing, so both run on the deck's own clock, wrapped — and a deck
 * sitting outside its loop still lands on the row. `into` is where the playhead is since the top of
 * the loop, in real seconds: buffer seconds divided by the rate they are read at (0035), and a deck
 * read at no rate at all is a deck holding still.
 */
// One pass over every row a picture holds, and a prologue that resolves the ground and the place
// the walk is standing in once for the five rows that rest on them. Splitting it would hand `rows`
// and `reads` to a helper that must stay index-for-index, which is the shape the builder above is
// waived for. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function refillRows(
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  peek: Readonly<DeckPeek>,
  rate: number,
  loop: Loop | null,
  duration: number,
  analysis: BeatAnalysis | null,
): number {
  const into = rate > 0 ? (peek.position - (loop?.in ?? 0)) / rate : 0;
  // The ground the yard is standing on, folded once for the five rows that rest on it — the
  // module's three and the two the field is beaten against — rather than once a row, and once for
  // both halves of it, because a second call for the other half is the same fold paid twice. Where
  // the walk is standing beside it, for the same reason: a tier row resolving the standing part for
  // itself would walk the arrangement three times a painting.
  const stand = playerRowStand(peek.player.step?.bed ?? null, loop, duration);
  const groundCentre = stand === null ? DRIFT_REST.centre : stand.centre;
  const groundOn = stand === null ? null : stand.ground;
  const place = peek.player.step?.place ?? null;
  const part = standingPart(peek.player);
  rows.forEach((row, index) => {
    const read = reads[index] ?? READS_NOTHING;
    // A reading and never a setting: an instance whose plugin meters nothing is absent from the
    // map, and its row rests where its knobs put it (0128 amended).
    const reading = read.instance === null ? undefined : peek.meters.get(read.instance);
    row.pulse = reading === undefined ? 0 : meterPulse(reading);
    // The reference row is the one row the sound itself cuts: how fine it is drawn is the onset
    // density of the stretch the yard is actually reading — which is what makes two grounds two
    // pictures — and how deep it cuts is the deck's own level, bounded so a silent yard still
    // draws its loop (0196, 0128 amended). Both are read off the peek and neither is stored.
    if (read.heard !== null) {
      row.pitch = heardPitch(analysis, duration, peek.position, read.heard);
      row.pulse = heardPulse(peek.meter);
      // And anchored where in the source the yard is reading, the way the module's row is: two
      // combs of one pitch measured from two places differ by where their crests fall, so a ground
      // move stands the axis somewhere new against every row fanned off it (P161, 0185).
      row.centre = groundCentre;
    }
    // What a lane is doing to the colour of the picture, where one is riding a knob that claims it.
    // A lane the voice has not armed yet reports no phase and the dimension stays where the knob is
    // parked, which is what it draws with no lane at all (0150).
    for (const colour of read.colour) {
      const at = peek.automation.get(colour.key);
      if (at === undefined) continue;
      const value = automationValueAt(colour.lane, at, colour.base);
      row[colour.into] = colourReached(
        colour.into,
        normalize(value, colour.spec.min, colour.spec.max, colour.spec.curve),
      );
    }
    // And the field's own row, the other one the ground moves: turned off its own resting identity
    // as well as anchored, so a jump to a new stretch re-centres and rotates the layer the whole
    // picture is beaten against rather than only respacing the axis under it (0196, 0213, P161).
    if (read.ground !== null) {
      row.shape = heardShape(groundOn, read.ground);
      row.centre = groundCentre;
    }
    if (read.tier !== null) playerTierInto(row, read.tier, place, part, groundCentre);
    if (read.lane !== null) {
      row.phase = peek.automation.get(read.lane) ?? 0;
      return;
    }
    row.phase = row.period > 0 ? wrap(into, row.period) : 0;
  });
  return washAmount(peek.crest, peek.meter);
}

/**
 * The jumps module's three rows onto a picture whose yard is jumping, and nothing at all onto one whose
 * yard is not: a yard that cannot jump has no module doing anything, exactly as a bypassed instance
 * has no effect doing anything (0139). *Holding* a pattern is not jumping — a loop with no grid to
 * jump around plays straight past the module (`playerJumps`, src/audio/playerGrid.ts) — so what says
 * whether there is a row is the period its caller has already resolved, or null.
 *
 * The rows in the picture that move in steps rather than continuously, which is what an
 * arrangement is — so each is built at its own rest here and what a tier boundary moves about it is
 * written by the per-frame read out of the place the walk is standing in at that frame
 * (`src/lib/playerDrift.ts`, 0157, 0221). One per tier, the part's first and each above it broader
 * than the one under it, so a part changing is a fine layer moving over a coarser one holding still
 * and a whole album coming round moves the picture wholesale. Before the loop's, so the reference
 * row stays the last one a picture holds.
 */
function playerInto(rows: MoireRow[], reads: RowRead[], playerPeriod: number | null): void {
  if (playerPeriod === null) return;
  rows.push(playerRow(playerPeriod));
  reads.push({ ...READS_NOTHING, tier: "part" });
  rows.push(playerTierRow(playerPeriod, "song"));
  reads.push({ ...READS_NOTHING, tier: "song" });
  rows.push(playerTierRow(playerPeriod, "album"));
  reads.push({ ...READS_NOTHING, tier: "album" });
}

/**
 * What each instance holding a run of its own is holding right now — `DeckPeek.grown`, and nothing
 * this file may narrow: the picture reads the run, it does not keep one.
 */
export type GrownRun = ReadonlyMap<EffectInstanceId, readonly GrownEffect[]>;

/** The run nothing is holding, shared, so a caller with no automator allocates no map. */
export const NO_GROWN: GrownRun = new Map();

/**
 * What a run looked like the last time a picture was built from it: every place standing, and every
 * knob each of them was drawn at. Two flat arrays rather than a copy of the read, because it is
 * compared on the frame path and a copy per frame is the allocation 0070 exists to refuse.
 */
export type GrownStanding = { ids: EffectInstanceId[]; draws: number[] };

/** A caller that has never looked at a run. */
export const grownNothing = (): GrownStanding => ({ ids: [], draws: [] });

/**
 * Whether `was` already describes the run the read is holding — and, either way, it describes it
 * once this returns. **The one question a frame asks about the run**: which rows a picture has, and
 * what each is cut to, is a function of a population nothing stores and nothing renders (0204), so
 * the only way to notice one moving is to have looked at the last one.
 *
 * The ids and not the count: six places going and six arriving in one tick is a different picture
 * of the same length. And the draws beside them, because a place's knobs are rewritten in place
 * where a run wanders (`wander`, src/audio/effects/automator.ts) — a row reaches through the values
 * its plugin declared a way into the picture for, exactly as a rack instance's does, and a rack
 * instance's row is rebuilt the moment one of those values moves.
 *
 * Written into the caller's own arrays and answered without allocating, because every frame between
 * two of those moves must cost nothing (0070); a move is a tick of the run at most, which is a
 * second at its fastest (`TICK_MIN_SECS`). The read's own map is already free of a bypassed
 * instance's places (`growth`, src/audio/effects/rack.ts), so what it holds is what `moireRows`
 * draws.
 */
export function grownStanding(was: GrownStanding, grown: GrownRun): boolean {
  let at = 0;
  let drawn = 0;
  let same = true;
  for (const held of grown.values()) {
    for (const each of held) {
      if (was.ids[at] !== each.instance) {
        was.ids[at] = each.instance;
        same = false;
      }
      at++;
      for (const value of each.values) {
        if (was.draws[drawn] !== value) {
          was.draws[drawn] = value;
          same = false;
        }
        drawn++;
      }
    }
  }
  if (was.ids.length !== at) {
    was.ids.length = at;
    same = false;
  }
  if (was.draws.length !== drawn) {
    was.draws.length = drawn;
    same = false;
  }
  return same;
}

/**
 * Every effect one automator is holding, a row apiece, onto the picture its own instance's row was
 * just pushed onto. **The rows the session cannot see**: a grown effect is drawn from a seed and
 * never stored (0204), so without this a run of six turning over completely leaves the picture
 * exactly as it was — the automator's own knobs reached one row and the six they grew reached none.
 *
 * Each is cut the way a rack instance's is and by the same three things: its identity folded off
 * the id the run minted for it, which is the same word its row in the card carries (0076), and the
 * profile and geometry its own registry entry declares — so what the picture shows is which plugins
 * are standing, not that something is. What it is *set* to comes off the run rather than off the
 * session (`grownReach`), because there is no session entry to read.
 *
 * A place laid but not yet arrived is not among them: the read already withholds one, for the same
 * reason a bypassed instance carries no row — what nobody can hear is not in the picture (0139).
 * Nothing is read per frame for one: a grown row's phase runs on the deck's own clock, and its
 * fading in and out is the automator's row to tell.
 */
function grownInto(
  rows: MoireRow[],
  reads: RowRead[],
  grown: readonly GrownEffect[] | undefined,
): void {
  if (grown === undefined) return;
  for (const held of grown) {
    if (!isEffectId(held.effect)) continue;
    const seed = fold(held.instance);
    rows.push({
      ...driftReached(seed, grownReach(held.effect, held.values)),
      phase: 0,
      pulse: 0,
      reference: false,
      shape: seed,
      ...driftCut(held.effect),
    });
    reads.push(READS_NOTHING);
  }
}

/**
 * The macro row onto the end of a picture that has one, and the two answers it was built out of.
 * The periods are read before it is added and are every period the yard is actually running: they
 * are the estimate's own answer, so feeding this row back into them would let a row the picture
 * added to itself decide how wide a window the picture is drawn across (`moireWindowSecs`) and how
 * long the whole thing takes to come round.
 */
function macroInto(
  rows: MoireRow[],
  reads: RowRead[],
  loopPeriod: number,
  unbounded: boolean,
): Omit<MoireRowSet, "rows" | "reads" | "wash"> {
  const periods = rows.map(({ period }) => period);
  const recurrence = recurrenceLength(periods, unbounded);
  const windowSecs = moireWindowSecs(loopPeriod, periods, MOIRE_CYCLES);
  const macro = macroPeriod(recurrence, periods, windowSecs);
  if (macro > 0) {
    rows.push(plainRow(macro, MACRO_SHAPE, false));
    reads.push(READS_NOTHING);
  }
  return { periods, recurrence, windowSecs };
}

/**
 * Whether a surface holding these rows belongs on the frame loop. The one answer both sizes ask.
 * A halted yard is painted but not animated: `laneNow()` freezes on a halt and the playhead holds
 * where it stopped (0040), so every phase is the phase the last frame drew — an idle page runs
 * zero frames (src/ui/frame.ts), and a picture that is not moving is a commit, not a subscription.
 */
export const paintsPerFrame = (playing: boolean, rows: number): boolean => playing && rows > 0;
