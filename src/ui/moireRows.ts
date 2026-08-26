/**
 * @role What a yard's drift is made of before anything draws it: one row per lane it is running,
 *   one per instance its rack is playing, one for its jumps module and one for its loop — and, for
 *   an instance, how the values it is set to reach that row through the dimensions its registry
 *   entry declared, the three that are colour following the lane where one is riding the knob that
 *   claims them (0150), and for the module the part of its song standing right now. Pure of React
 *   and of the canvas, so the rows a yard makes are read without rendering one.
 * @instead The picture itself, its two sizes and the frame loop → src/ui/MoireStrip.tsx. What a row
 *   means, and the window the rows are drawn across → src/lib/moire.ts; the estimate of when they
 *   all line up → src/lib/recurrence.ts. Drawing them → src/ui/moireCanvas.ts.
 */
// One import over the cap, and the one over it is the per-frame read this file now performs: the
// shape `peek()` fills, which is where a lane's phase and an instance's meter both arrive (P105).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import {
  DECK_AUTOMATION_PARAM_IDS,
  effectAutomationParamIds,
  paramIn,
  PARAMS,
  paramKey,
} from "@/audio/params";
import { effectById } from "@/audio/effects/registry";
import { automationValueAt, laneSpan, type AutomationPoint } from "@/lib/automation";
import { fold } from "@/lib/copy";
import {
  colourReached,
  COLOUR_REACH,
  driftReached,
  DRIFT_REST,
  FLAT_BEND,
  laneBend,
  LINEAR_GEOMETRY,
  MIN_ROW_CYCLES,
  MOIRE_CYCLES,
  moireWindowSecs,
  PLAIN_PROFILE,
  wrap,
  type ColourDimension,
  type DriftDimension,
  type DriftGeometry,
  type DriftProfile,
  type DriftReach,
  type MoireRow,
} from "@/lib/moire";
import { meterPulse, PLAIN_CUT, type SourceCut } from "@/lib/moireSound";
import { playerRow, playerRowHue, playerRowPitch, playerRowShape } from "@/lib/playerDrift";
import { recurrenceLength, type RecurrenceLength } from "@/lib/recurrence";
import { normalize } from "@/lib/range";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectParamId } from "@/audio/params";
import type { DeckPeek, PlayerPeek } from "@/audio/deckPeek";
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
        // A lane on an effect's knob is that effect doing something, so it is cut to the profile
        // the registry entry declares, exactly as the instance's own row below is.
        profile: effectById(instance.effect).drift,
        geometry: effectById(instance.effect).geometry,
      });
    }
  }
  return lanes;
}

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
   * Whether this is the jumps module's row, whose identity, spacing and tint are the standing
   * part's rather than anything a knob is parked at (0157, `src/lib/playerDrift.ts`). Its own flag
   * and not a third id, because the module is one per yard: there is nothing to key it by.
   */
  song: boolean;
};

/** The colour nothing is carrying, shared: a per-frame read allocates nothing (0070). */
const NO_COLOUR: readonly ColourRead[] = [];

/** A row nothing is read for: its phase runs on the deck's own clock and it never pulses. */
const READS_NOTHING: RowRead = { lane: null, instance: null, colour: NO_COLOUR, song: false };

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
 * carries none: what nobody can hear is not in the picture. The loop belongs to no parameter, so
 * bends nothing: it is the reference the others are read against, not another gesture. What it is
 * cut to and how fine it is drawn are the source's, out of the clip's own analysis — so a yard
 * playing one file and a yard playing another draw two pictures through one rack (0145).
 *
 * The jumps module carries one too wherever the yard is actually jumping, because the thing that
 * moves where the deck reads from is not something the picture may be silent about. Its period is
 * the landing its dials say and its identity, its spacing and its tint are the part of its song
 * standing right now — the one row in the picture that moves in steps, which is what a song is
 * (`src/lib/playerDrift.ts`, 0157).
 *
 * Last of all, and only where the yard has one the picture can show, the macro row: a grating on
 * the recurrence of every other row, which is the one period in the picture no knob owns (0143). It
 * is returned beside the periods it was built from, the recurrence it was built out of and the
 * window it has to come round inside, so the estimate beside the picture and the window the picture
 * is drawn across are read off the yard rather than off a row the picture added to itself.
 */
export function moireRows(
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
  cut: SourceCut,
  playerPeriod: number | null,
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
      profile: effectById(instance.effect).drift,
      geometry: effectById(instance.effect).geometry,
    });
    // Its own row is the one thing an instance's meter may move, so this is where the id is kept.
    // A lane riding the same instance keeps none: what a lane draws is the gesture (0128).
    reads.push({ ...READS_NOTHING, instance: instance.id, colour: colourReads(instance) });
  }
  playerInto(rows, reads, playerPeriod);
  if (loopPeriod > 0) {
    // The reference is the axis the others are fanned either side of, so its identity is the zero
    // no fold produces rather than one of its own (`gratingTurns`, src/lib/moire.ts).
    rows.push(plainRow(loopPeriod, 0, true, cut));
    reads.push(READS_NOTHING);
  }
  return { rows, reads, ...macroInto(rows, reads, loopPeriod) };
}

/**
 * The per-frame read, and the whole of it: every row's phase, every row's pulse and the three
 * things the jumps module's row takes from the part standing in its song, written into the rows
 * the set was built with. Allocates nothing, enters no React state and is called from the
 * one frame loop through the drift's own cadence (plan §2, 0070, 0144).
 *
 * A lane the voice has not armed yet reports no phase and its row sits at its own zero rather than
 * vanishing, because the period is a fact about the lane either way. The loop's row and a rack
 * instance's are automated by nothing, so both run on the deck's own clock, wrapped — and a deck
 * sitting outside its loop still lands on the row. `into` is where the playhead is since the top of
 * the loop, in real seconds: buffer seconds divided by the rate they are read at (0035), and a deck
 * read at no rate at all is a deck holding still.
 */
export function refillRows(
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  peek: Readonly<DeckPeek>,
  rate: number,
  loopIn: number,
): void {
  const into = rate > 0 ? (peek.position - loopIn) / rate : 0;
  rows.forEach((row, index) => {
    const read = reads[index] ?? READS_NOTHING;
    // A reading and never a setting: an instance whose plugin meters nothing is absent from the
    // map, and its row rests where its knobs put it (0128 amended).
    const reading = read.instance === null ? undefined : peek.meters.get(read.instance);
    row.pulse = reading === undefined ? 0 : meterPulse(reading);
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
    // What the jumps module's own row is: the part standing in its song, or nothing standing at
    // all. Three fields rather than a phase, because a song does not travel through its part — it
    // is in one until it is in the next, so what the picture shows is the boundary (0157).
    if (read.song) {
      const part = standingPart(peek.player);
      row.shape = playerRowShape(part);
      row.pitch = playerRowPitch(part);
      row.hue = playerRowHue(part);
    }
    if (read.lane !== null) {
      row.phase = peek.automation.get(read.lane) ?? 0;
      return;
    }
    row.phase = row.period > 0 ? wrap(into, row.period) : 0;
  });
}

/**
 * The jumps module's row onto a picture whose yard is jumping, and nothing at all onto one whose
 * yard is not: a yard that cannot jump has no module doing anything, exactly as a bypassed instance
 * has no effect doing anything (0139). *Holding* a pattern is not jumping — a loop with no grid to
 * jump around plays straight past the module (`playerJumps`, src/audio/player.ts) — so what says
 * whether there is a row is the period its caller has already resolved, or null.
 *
 * The one row in the picture that moves in steps rather than continuously, which is what a song is
 * — so it is built at its own rest here and its identity, its spacing and its tint are written by
 * the per-frame read out of the part standing at that frame (`src/lib/playerDrift.ts`, 0157).
 * Before the loop's, so the reference row stays the last one a picture holds.
 */
function playerInto(rows: MoireRow[], reads: RowRead[], playerPeriod: number | null): void {
  if (playerPeriod === null) return;
  rows.push(playerRow(playerPeriod));
  reads.push({ ...READS_NOTHING, song: true });
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
): Omit<MoireRowSet, "rows" | "reads"> {
  const periods = rows.map(({ period }) => period);
  const recurrence = recurrenceLength(periods);
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
