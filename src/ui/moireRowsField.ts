/**
 * @role The rows in a yard's picture that belong to no lane, no instance and no tier — the loop's
 *   own reference row, the macro row on the whole yard coming round, the wash laid over both, and
 *   the session's, which is a picture of what the instrument is actually putting out — and, with
 *   them, the shape of the per-frame read every row in the picture is filled through.
 * @instead The rows a lane, a rack instance and a grown run make, and the per-frame read itself →
 *   src/ui/moireRows.ts, which this was the tail of until it reached the hard cap (0045). The jumps
 *   module's own three → src/lib/playerDrift.ts. The maths any of them rests on →
 *   src/lib/moireSound.ts. Drawing them → src/ui/moireCanvas.ts.
 */
import { fold } from "@/lib/copy";
import {
  COLOUR_REACH,
  DRIFT_BROADEST_PITCH,
  DRIFT_REST,
  FLAT_BEND,
  LINEAR_GEOMETRY,
  MIN_ROW_CYCLES,
  MOIRE_CYCLES,
  moireWindowSecs,
  type ColourDimension,
  type DriftDimension,
  type MoireRow,
} from "@/lib/moire";
import { PLAIN_CUT, type SourceCut } from "@/lib/moireSound";
import { recurrenceLength, type RecurrenceLength } from "@/lib/recurrence";
import type { PARAMS, EffectParamId } from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { AutomationPoint } from "@/lib/automation";
import type { NamedTier } from "@/lib/copyNames";

/**
 * A colour dimension of one row that a lane is riding: which of the three it is, the key `peek()`
 * files that lane's phase under, the lane itself and the value the knob is parked at — everything
 * `automationValueAt` needs to say where the parameter actually stands this frame, and where in its
 * own range that lands (0150). Built once with the rows: a lane a gesture edits is a new set.
 */
export type ColourRead = {
  into: ColourDimension;
  key: string;
  lane: readonly AutomationPoint[];
  base: number;
  spec: (typeof PARAMS)[EffectParamId];
};

/** Whether a dimension a registry entry claimed is one of the three that are colour (0141). */
export const isColour = (into: DriftDimension): into is ColourDimension => into in COLOUR_REACH;

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
  /**
   * And the one row that is not this yard's at all: the session's, whose depth and spacing are what
   * the master bus is putting out (`sessionInto`). A flag and not a resting value, because it rests
   * at nothing — a session nobody can hear draws no row, which is the picture drawn before there
   * was an output to hear.
   */
  session: boolean;
};

/** The colour nothing is carrying, shared: a per-frame read allocates nothing (0070). */
export const NO_COLOUR: readonly ColourRead[] = [];

/** A row nothing is read for: its phase runs on the deck's own clock and it never pulses. */
export const READS_NOTHING: RowRead = {
  lane: null,
  instance: null,
  colour: NO_COLOUR,
  tier: null,
  ground: null,
  heard: null,
  session: false,
};

/**
 * A row read for one lane and for nothing else, filed under the key `peek()` files that lane's
 * phase under. Written as the read nothing is plus its own field, and so are the other three below,
 * so what a `RowRead` holds is named once and a fifth kind of row is a field rather than five
 * literals to keep in step (principle 1).
 */
export const laneRead = (lane: string): RowRead => ({ ...READS_NOTHING, lane });

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
 * The rows no effect and no lane owns: the loop, which is the reference the rest are read against,
 * the macro row on the whole yard coming round, the wash over them and the session's own. All are
 * the plainest grating there is along the straight axis every row was cut along before an effect
 * could bend one, all bend nothing, and all rest in every dimension a value of an effect's would
 * have reached — so what separates them is a period, an identity and which of them is the reference.
 */
export const plainRow = (
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
 * The reference row onto a picture whose yard has a loop: the axis every other row is fanned either
 * side of, so its identity is the zero no fold produces rather than one of its own (`gratingTurns`,
 * src/lib/moire.ts). What it is cut to and how fine it is drawn are the source's, out of the clip's
 * own analysis — so a yard playing one file and a yard playing another draw two pictures through
 * one rack (0145). Its read carries the one resting pitch in the picture: what the whole source
 * cuts it at, which the per-frame read spends wherever the stretch actually sounding says nothing
 * (0196). Before the macro row, so the periods that row is measured from are the yard's own.
 */
export function referenceInto(
  rows: MoireRow[],
  reads: RowRead[],
  loopPeriod: number,
  cut: SourceCut,
): void {
  if (loopPeriod <= 0) return;
  rows.push(plainRow(loopPeriod, 0, true, cut));
  reads.push({ ...READS_NOTHING, heard: cut.pitch });
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
 * The macro row onto the end of a picture that has one, and the two answers it was built out of.
 * The periods are read before it is added and are every period the yard is actually running: they
 * are the estimate's own answer, so feeding this row back into them would let a row the picture
 * added to itself decide how wide a window the picture is drawn across (`moireWindowSecs`) and how
 * long the whole thing takes to come round.
 */
export function macroInto(
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
 * The identity of the row the whole yard's wash is laid over. Belongs to no parameter and to no
 * instance either, so it is folded off its own name the way the macro row above is.
 */
const WASH_SHAPE = fold("the yard washed over");

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
export function washInto(rows: MoireRow[], reads: RowRead[], loopPeriod: number): void {
  if (loopPeriod <= 0) return;
  rows.push({ ...plainRow(loopPeriod, WASH_SHAPE, false), depth: 0, pitch: DRIFT_BROADEST_PITCH });
  reads.push({ ...READS_NOTHING, ground: WASH_SHAPE });
}

/**
 * And the one row in the picture that is nobody's yard: the session's own, laid over every picture
 * at once. Every other row is a picture of an *input* — a knob position, one instance's meter, a
 * clock — so until this the one thing nothing drew was what the instrument actually sounds like at
 * the end. 0213 gave a reading of the output to the field and refused it a row because a deck's
 * output has no item to belong to; the master bus has one, and it is the thing every yard lands in.
 *
 * **The same row in every picture**, so two yards open side by side are beaten against one layer
 * and drift together, which is what a picture of the session is and what a second per-deck reading
 * would not be. Its period is the session's own clock where one is held, and the yard's loop where
 * nothing is synced: a period no deck owns is what keeps this row from locking to a yard's rows
 * (`sync`, src/state/store.ts, 0097).
 *
 * Folded off 0 and carrying the reference flag, which together are what says "an axis": it is
 * never fanned, so it lies along the loop's own row and beats against it rather than crossing it
 * (`gratingTurns`, src/lib/moire.ts). The band never rolls on it, loop or no loop: what the band
 * rides is this deck's read position, and the roll skips a row with no depth of its own for exactly
 * that reason (`bandTurns`, src/ui/moireScreen.ts). At its own zero depth like the wash row, so a session nobody
 * can hear draws nothing and the screen's four motions stay with the parameters that own them
 * (0128, 0213) — what cuts it is the level, carried on `pulse`, which is the only depth a row with
 * none of its own has (`pulsedDepth`, src/lib/moireSound.ts). Last of all the rows, and after the
 * macro row, for the reason the wash is: what the yard is running decides the window and the
 * recurrence, and this row is not the yard's.
 */
export function sessionInto(
  rows: MoireRow[],
  reads: RowRead[],
  loopPeriod: number,
  sync: number | null,
): void {
  const period = sync ?? loopPeriod;
  if (!(period > 0)) return;
  // And nothing onto a picture that holds nothing of its own: a yard with no lane, no instance, no
  // module and no loop draws no drift at all (`MoireStrip`), and one row of somebody else's session
  // is not that yard's picture arriving.
  if (rows.length === 0) return;
  rows.push({ ...plainRow(period, 0, true), depth: 0 });
  reads.push({ ...READS_NOTHING, session: true });
}
