/**
 * @role What the sound itself puts into the drift picture, as pure maths: the cut a decoded source
 *   makes of the reference row every other row is read against, how the stretch of it actually
 *   sounding right now recuts that row (0196), how the ground it is being read on turns that row
 *   and the wash laid over it, and what a running effect's own meter does to the depth of its row. Neither is a parameter and neither is durable — a picture
 *   may rest on analysis and on a reading precisely because nothing about it is stored
 *   ([0145](../../docs/decisions/0145-a-picture-may-rest-on-analysis.md),
 *   [0128](../../docs/decisions/0128-every-motion-in-the-screen-belongs-to-a-parameter.md)).
 * @instead What a row is made of, and every dimension an effect's *values* reach → src/lib/moire.ts.
 *   Measuring a source at all → src/lib/analysis.ts. Reading the meter off the graph → the rack's
 *   own `meters` in src/audio/effects/rack.ts. Filling these onto a yard's rows → src/ui/moireRows.ts.
 */
import { MAX_ONSETS, type BeatAnalysis } from "./analysis.ts";
import { fold } from "./copy.ts";
import { DRIFT_DEPTH_FLOOR, DRIFT_PITCH_REACH, DRIFT_REST, type MoireRow } from "./moire.ts";
import { PLAIN_PROFILE, STRIKE_PROFILE, type DriftProfile } from "./moireProfiles.ts";
import { clamp, denormalize } from "./range.ts";

/**
 * How far above its own mean an envelope's peak has to stand before the source is read as a thing
 * with transients in it rather than a sustained one. Measured against the analyser's own hop
 * (`ANALYSIS_HOP`, src/lib/analysis.ts): a continuous tone reads at 1, a loop of struck sounds
 * with room between them reads in the tens, and three is comfortably clear of the first without
 * asking a source to be nearly silent to qualify.
 */
export const SOURCE_STRIKE_CREST = 3;

/**
 * The onset density, in onsets a second, the reference row is drawn at its finest at. Eight is
 * semiquavers at 120: a source denser than that is drawn at the same finest spacing rather than
 * off the end of the band, which is what `DRIFT_PITCH_REACH` is doing on the other side.
 */
export const SOURCE_DENSITY_REACH = 8;

/**
 * How the source a yard is playing cuts the reference row every other row is read against: the
 * wave it is drawn with, and how fine it is drawn, as a ratio on the pitch its period sets — the
 * same ratio, over the same reach, an effect's own `pitch` claim is spent as (0139, 0145).
 */
export type SourceCut = { profile: DriftProfile; pitch: number };

/** The cut a yard with nothing measured draws: the plain grating at the pitch its period sets. */
export const PLAIN_CUT: SourceCut = { profile: PLAIN_PROFILE, pitch: DRIFT_REST.pitch };

/**
 * What this source makes of the reference row. The envelope's crest chooses the wave — a strike
 * and its decay for a source with transients in it, the plain cosine for one that holds a level —
 * and the onset density sets the pitch, so a busy file is drawn finer than a sparse one of the
 * same length and two files are two pictures.
 *
 * A source nothing has measured yet, one with no length to count against, and one the analyser
 * found nothing in all draw what the reference row drew before there was a source in the picture.
 * That is the answer and not a fallback: there is nothing to say yet, and a picture held back
 * until the worker replies would be the drift waiting on analysis (0145). The third of those is
 * `crest: 0`, which is the analyser's own way of saying it measured nothing — the same sentinel
 * `bpm: 0` is, and not a ratio a real envelope can produce (src/lib/analysis.ts).
 */
export function sourceCut(analysis: BeatAnalysis | null, duration: number): SourceCut {
  if (analysis === null || !(duration > 0) || !(analysis.crest > 0)) return PLAIN_CUT;
  // A candidate list at its own bound is a floor rather than a count: `MAX_ONSETS` keeps the
  // strongest 1024 so that `probe()` stays bounded (src/lib/analysis.ts), and a long dense source
  // reaches it — read straight, two four-minute files at four and at sixteen onsets a second
  // would both report 1024 and be drawn identically, at a spacing neither of them earned. Read as
  // "at least this dense" instead, which is the end of the band the reach already saturates at.
  const density =
    analysis.onsets.length >= MAX_ONSETS ? SOURCE_DENSITY_REACH : analysis.onsets.length / duration;
  return {
    profile: analysis.crest >= SOURCE_STRIKE_CREST ? STRIKE_PROFILE : PLAIN_PROFILE,
    pitch: densityPitch(density),
  };
}

/**
 * What an onset density is as a spacing: the finer the sound, the finer the row, over the same
 * reach an effect's own `pitch` claim is spent across and saturating at both ends of it. Its own
 * function because the whole source and the stretch of it sounding right now are the same question
 * asked over two windows, and two answers to it would be a reference row that jumped when the
 * playhead crossed into a passage of the density the whole file already reads at (principle 1).
 */
export const densityPitch = (density: number): number =>
  denormalize(
    clamp(density / SOURCE_DENSITY_REACH, 0, 1),
    DRIFT_PITCH_REACH,
    1 / DRIFT_PITCH_REACH,
    "log",
  );

/**
 * How much of the source the reference row is cut from at the playhead, in seconds either side of
 * it. Two seconds is a bar and a half at 120 — long enough that a single missing onset does not
 * move the row, short enough that two beds a few seconds apart in one file are two spacings, which
 * is the whole point of reading it here rather than off the file (0196).
 */
export const SOURCE_HEARD_SECS = 2;

/**
 * How many of these onsets fall inside a window. A binary search on each edge rather than a scan,
 * because `BeatAnalysis.onsets` ascends and this is read once a painting for a list that reaches
 * `MAX_ONSETS` — and it allocates nothing, which is what a per-frame read owes (0070).
 */
export function onsetsIn(onsets: readonly number[], from: number, to: number): number {
  const at = (edge: number): number => {
    let low = 0;
    let high = onsets.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((onsets[mid] ?? 0) < edge) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  return at(to) - at(from);
}

/**
 * The pitch the stretch of source actually sounding right now cuts the reference row at: the onset
 * density of the window around the playhead, read through the same band the whole file's own cut
 * is read through. **This is what makes two grounds two pictures** — a mulcher moves where in the
 * file the loop is read, and until this the reference row every other row is read against said the
 * same thing wherever it had been moved to (0196, 0185).
 *
 * The resting pitch — the whole source's — is the answer wherever there is nothing to say instead:
 * a source nothing has measured, one with no length to count against, one the analyser found
 * nothing in (`crest: 0`, src/lib/analysis.ts) and a playhead whose window falls outside the file.
 * That is the answer and not a fallback, exactly as `sourceCut`'s own is (0145).
 *
 * A long dense source saturates `MAX_ONSETS` before it reaches here, so its local counts are a
 * share of the strongest onsets rather than all of them — the same floor `sourceCut` reads as "at
 * least this dense", and it moves the row up or down together rather than picking a passage out.
 */
export function heardPitch(
  analysis: BeatAnalysis | null,
  duration: number,
  at: number,
  resting: number,
): number {
  if (analysis === null || !(duration > 0) || !(analysis.crest > 0)) return resting;
  const from = clamp(at - SOURCE_HEARD_SECS, 0, duration);
  const to = clamp(at + SOURCE_HEARD_SECS, 0, duration);
  const span = to - from;
  if (!(span > 0)) return resting;
  return densityPitch(onsetsIn(analysis.onsets, from, to) / span);
}

/**
 * The identity a row the whole field is beaten against takes while the yard is reading the ground
 * `on` — the wash laid over every other row, and any row the picture later lays over all of them the
 * same way. **The other half of what makes two grounds two pictures** — until this, a mulcher
 * moving where in the file the loop is read respaced the reference row (`heardPitch`) and left every
 * crest of the field exactly where it was, so a new stretch of the file was the same field more
 * finely cut. Folded off the ground itself, so the field rotates, where its caller anchors it on the
 * same ground so it re-centres too (`playerRowStand`, src/lib/playerDrift.ts).
 *
 * The row's own resting identity folded in beside the ground rather than the ground alone, so two
 * rows moved by one ground are moved to two angles: one number for both would draw them parallel,
 * which is two rows that beat into nothing. The reference row is not one of them — it is the axis
 * the rest are fanned either side of and is never fanned (`gratingTurns`, src/lib/moireGrating.ts), so the
 * ground anchors it and leaves the zero that says it is the axis alone.
 *
 * `on` is the ground as `bedGround` counts it, in the loop's own sixteenths (0185): one whole
 * number per stretch, so two grounds a few seconds apart in one file are two fields and one ground
 * is one field however long it is looked at. The resting identity is the answer wherever there is
 * no ground to read, which is every yard that is not jumping — the answer and not a fallback,
 * exactly as `heardPitch`'s own is (0145).
 */
export const heardShape = (on: number | null, resting: number): number =>
  on === null ? resting : fold(`${resting}:${on}`);

/**
 * What the level of the session's own output is as a depth: the whole of it, bounded — the row of
 * the whole session is built with no depth of its own, so its meter is the only depth it has and
 * `pulsedDepth` reads it as the fraction of a cut the output has earned (0228). Up rather than
 * down, which the wash's row is the precedent for and which is allowed a reading that belongs to
 * nothing on the yard (0213). A bus reporting nothing at all draws no row.
 */
export const heardLevel = (level: number): number =>
  Number.isFinite(level) ? clamp(level, 0, 1) : 0;

/**
 * What the brightness of the session's own output is as a spacing: the same band, read the same
 * way, as the onset density of a source and an effect's own `pitch` claim — a dark mix draws the
 * row of the whole session at the coarse end and a bright one at the fine end. A tilt already
 * stands on 0..1 (`spectralTilt`, src/lib/peaks.ts), so it is spent through `densityPitch` at the
 * reach that scale is counted against rather than through a second `denormalize` of its own: a
 * reading is spent as a spacing in one spelling (principle 1).
 *
 * Silence answers the coarse end and not a rest of its own, because it is not the pitch that says
 * a silent session has nothing to draw — its level does, and a row cut at nothing is not in the
 * picture at all (`sessionInto`, src/ui/moireRowsField.ts).
 */
export const heardTilt = (tilt: number): number =>
  Number.isFinite(tilt) ? densityPitch(clamp(tilt, 0, 1) * SOURCE_DENSITY_REACH) : DRIFT_REST.pitch;

/**
 * How much of the reference row's depth what is sounding may take from it: half, so a silent yard
 * still draws the loop rather than a line at the floor, and a yard at full level draws it as deep
 * as it has ever been drawn. Down and never up, which is the one direction a reading may move a
 * row (0128 amended).
 */
export const DRIFT_HEARD_SHARE = 0.5;

/**
 * What the deck's own level does to the reference row: the quieter the sound, the shallower the
 * row every other row is read against, bounded by the share above. A meter reads the loudest
 * sample in its window and may run past one where the gain does (`DeckChain.level`), so it is
 * clamped here rather than trusted — and a deck reading nothing is a picture at its shallowest
 * rather than one that has vanished.
 */
export const heardPulse = (level: number): number =>
  Number.isFinite(level) ? DRIFT_HEARD_SHARE * (1 - clamp(level, 0, 1)) : DRIFT_HEARD_SHARE;

/**
 * How much gain reduction, in dB, a meter has to be reporting before its row is pulled all the way
 * down to the floor. Twenty-four is a compressor working hard rather than the most one can do —
 * `comp.threshold` reaches -60 and `comp.ratio` reaches 20, so a squashed signal can read past
 * this and simply stays at the floor. Sized for the travel that is common rather than the one that
 * is possible: a span wide enough to cover the extreme would leave ordinary playing barely moving.
 */
export const DRIFT_PULSE_DB = 24;

/**
 * What a meter's reading is as a share of that: gain reduction arrives negative and in dB, and a
 * picture wants a fraction. A meter reporting nothing — no reduction, or an effect with no meter
 * at all — is a row at rest, which is the picture drawn before a meter reached it.
 */
export const meterPulse = (reduction: number): number =>
  Number.isFinite(reduction) ? clamp(-reduction / DRIFT_PULSE_DB, 0, 1) : 0;

/**
 * How deep a row actually cuts: what its knobs are set to, ducked toward the floor by however hard
 * its own effect is working this frame. Down rather than up, and never past the floor a
 * turned-down effect already sits at (`DRIFT_DEPTH_FLOOR`) — so a compressor pulling the sound down
 * pulls its own row down with it, and a reading that belongs to no parameter can never make a row
 * deeper than the knobs asked for (0128 amended, 0139).
 */
export const pulsedDepth = (row: MoireRow): number =>
  row.depth - (row.depth - DRIFT_DEPTH_FLOOR) * clamp(row.pulse, 0, 1);

/**
 * The crest a window with nothing left between its transients reads at: a held tone, whose peak
 * stands √2 above its own RMS, is the least peaky thing a real signal can be. At or under this the
 * field is as washed as the picture can say.
 */
export const WASH_CREST_SMEARED = 2;

/**
 * And the crest a struck dry window reads at: a hit with room either side of it stands far above
 * the window's mean power, and eight is comfortably clear of anything a tail or a pad produces
 * without asking for a window that is nearly silence. At or over this the field is not washed at
 * all, however loud it is.
 */
export const WASH_CREST_STRUCK = 8;

/**
 * The loudest a window may be and still be silence, as the meter beside the crest reads it: -60dB,
 * which is the floor every level readout in the instrument already rounds away. A crest is a ratio
 * and knows nothing about how loud its window was, so a noise floor has the crest of a held tone —
 * without this a yard nobody can hear draws a fully washed picture, which is the picture saying
 * something about a sound that is not there.
 */
export const WASH_HEARD_FLOOR = 0.001;

/**
 * How washed the output of a yard is, from the crest of its own window and the level of the same
 * window beside it: nought where the transients still stand out, one where reverb, delay and
 * saturation have filled the gaps between them, and bounded at both ends so no window can push the
 * picture past either. **Silence is not a wash** — neither a crest of nought, which is the analyser
 * saying it measured nothing (`crestFactor`, src/lib/peaks.ts), nor a window under the floor above,
 * which is a yard drawing the picture it drew before there was a reading, exactly as a source
 * nothing has measured does (0145).
 */
export const washAmount = (crest: number, level: number): number =>
  Number.isFinite(crest) && crest > 0 && level >= WASH_HEARD_FLOOR
    ? clamp((WASH_CREST_STRUCK - crest) / (WASH_CREST_STRUCK - WASH_CREST_SMEARED), 0, 1)
    : 0;

/**
 * How much of the way to its own ceiling a fully washed field carries a dimension: half, so a
 * washed yard blends rather than flattens — the rows still separate at their own settings, and the
 * picture arrives at a lattice nothing in it asked for rather than at a wall. The same share for
 * both dimensions the wash moves, because moving them together is the whole of what it says (0213).
 */
export const DRIFT_WASH_SHARE = 0.5;

/**
 * One dimension raised toward `ceiling` by the wash. Up rather than down, which is the opposite of
 * every other reading in the picture and is why the wash belongs to the field and to no row (0213):
 * a reading that may deepen one row would be a knob position nobody turned, and a reading that
 * deepens all of them at once is the field being less separable than it was.
 */
export const washedToward = (value: number, ceiling: number, wash: number): number =>
  value + (ceiling - value) * DRIFT_WASH_SHARE * clamp(wash, 0, 1);

/**
 * How deep a row cuts once the field's own wash is in it: what its knobs and its meter say, raised
 * toward a full cut by however washed the yard has become. Every row rises by the same share at the
 * same time, so a smeared yard is a picture whose rows stop being separable (0213).
 */
export const washedDepth = (row: MoireRow, wash: number): number =>
  washedToward(pulsedDepth(row), 1, wash);
