/**
 * @role What a yard's drift is made of before anything draws it: one row per lane it is running,
 *   one per instance its rack is playing, one for its loop — and, for an instance, how the values
 *   it is set to reach that row through the dimensions its registry entry declared. Pure of React
 *   and of the canvas, so the rows a yard makes are read without rendering one.
 * @instead The picture itself, its two sizes and the frame loop → src/ui/MoireStrip.tsx. What a row
 *   means, and the window the rows are drawn across → src/lib/moire.ts; the estimate of when they
 *   all line up → src/lib/recurrence.ts. Drawing them → src/ui/moireCanvas.ts.
 */
import {
  DECK_AUTOMATION_PARAM_IDS,
  effectAutomationParamIds,
  paramIn,
  PARAMS,
  paramKey,
} from "@/audio/params";
import { effectById } from "@/audio/effects/registry";
import { laneSpan } from "@/lib/automation";
import { fold } from "@/lib/copy";
import {
  driftReached,
  DRIFT_REST,
  FLAT_BEND,
  laneBend,
  LINEAR_GEOMETRY,
  MIN_ROW_CYCLES,
  MOIRE_CYCLES,
  moireWindowSecs,
  PLAIN_PROFILE,
  type DriftGeometry,
  type DriftProfile,
  type DriftReach,
  type MoireRow,
} from "@/lib/moire";
import { recurrenceLength, type RecurrenceLength } from "@/lib/recurrence";
import { normalize } from "@/lib/range";
import type { DeckState } from "@/state/store";

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
 * session holds rather than off a lane: the value is what is read, not whether it is automated, so
 * a knob at rest still says what its effect is doing and a lane on that knob goes on bending the
 * row it already bends (0139).
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
const plainRow = (period: number, shape: number, reference: boolean): MoireRow => ({
  period,
  phase: 0,
  reference,
  shape,
  bend: FLAT_BEND,
  profile: PLAIN_PROFILE,
  geometry: LINEAR_GEOMETRY,
  ...DRIFT_REST,
});

/**
 * What one yard's picture is made of: its rows at their own zero, where each one's phase is read
 * from, the periods the yard is actually running and when they next line up.
 */
export type MoireRowSet = {
  rows: MoireRow[];
  keys: (string | null)[];
  periods: number[];
  recurrence: RecurrenceLength;
  /** How wide a window the rows are drawn across, in real seconds — one number, at both sizes. */
  windowSecs: number;
};

/**
 * The picture's rows at their own zero, and beside them where each one's phase is read from — a
 * lane's key, or null for a row no lane drives. Only `phase` moves after this.
 *
 * Every lane carries its own identity, the waveform its parameter draws and its own bend. Every
 * instance the rack is playing carries a row too, whether or not anything is automating it: its
 * identity is folded out of its own id the way its name already is (0076), and the rest of it —
 * how long it runs, how deep it cuts, how fine it is drawn, how far it breathes — is what the
 * effect is set to, through the dimensions its registry entry declared (0139). A bypassed instance
 * carries none: what nobody can hear is not in the picture. The loop belongs to no parameter, so
 * it draws the plainest row there is and bends nothing: it is the reference the others are read
 * against, not another gesture.
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
): MoireRowSet {
  const rows: MoireRow[] = lanes.map(({ period, shape, bend, profile, geometry }) => ({
    period,
    phase: 0,
    reference: false,
    shape,
    bend,
    profile,
    geometry,
    ...DRIFT_REST,
  }));
  const keys: (string | null)[] = lanes.map(({ key }) => key);
  for (const instance of effects) {
    if (instance.bypassed) continue;
    // The fold is still the row's identity — its angle and where in its cycle it starts — and what
    // the effect is set to is the rest of it, through the dimensions its registry entry declared.
    const seed = fold(instance.id);
    rows.push({
      ...driftReached(seed, effectReach(instance)),
      phase: 0,
      reference: false,
      shape: seed,
      profile: effectById(instance.effect).drift,
      geometry: effectById(instance.effect).geometry,
    });
    keys.push(null);
  }
  if (loopPeriod > 0) {
    // The reference is the axis the others are fanned either side of, so its identity is the zero
    // no fold produces rather than one of its own (`gratingTurns`, src/lib/moire.ts).
    rows.push(plainRow(loopPeriod, 0, true));
    keys.push(null);
  }
  return { rows, keys, ...macroInto(rows, keys, loopPeriod) };
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
  keys: (string | null)[],
  loopPeriod: number,
): Omit<MoireRowSet, "rows" | "keys"> {
  const periods = rows.map(({ period }) => period);
  const recurrence = recurrenceLength(periods);
  const windowSecs = moireWindowSecs(loopPeriod, periods, MOIRE_CYCLES);
  const macro = macroPeriod(recurrence, periods, windowSecs);
  if (macro > 0) {
    rows.push(plainRow(macro, MACRO_SHAPE, false));
    keys.push(null);
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
