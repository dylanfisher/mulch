/**
 * @role What the sound itself puts into the drift picture, as pure maths: the cut a decoded source
 *   makes of the reference row every other row is read against, and what a running effect's own
 *   meter does to the depth of its row. Neither is a parameter and neither is durable — a picture
 *   may rest on analysis and on a reading precisely because nothing about it is stored
 *   ([0145](../../docs/decisions/0145-a-picture-may-rest-on-analysis.md),
 *   [0128](../../docs/decisions/0128-every-motion-in-the-screen-belongs-to-a-parameter.md)).
 * @instead What a row is made of, and every dimension an effect's *values* reach → src/lib/moire.ts.
 *   Measuring a source at all → src/lib/analysis.ts. Reading the meter off the graph → the rack's
 *   own `meters` in src/audio/effects/rack.ts. Filling these onto a yard's rows → src/ui/moireRows.ts.
 */
import { MAX_ONSETS, type BeatAnalysis } from "./analysis";
import {
  DRIFT_DEPTH_FLOOR,
  DRIFT_PITCH_REACH,
  DRIFT_REST,
  PLAIN_PROFILE,
  STRIKE_PROFILE,
  type DriftProfile,
  type MoireRow,
} from "./moire";
import { clamp, denormalize } from "./range";

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
    pitch: denormalize(
      clamp(density / SOURCE_DENSITY_REACH, 0, 1),
      DRIFT_PITCH_REACH,
      1 / DRIFT_PITCH_REACH,
      "log",
    ),
  };
}

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
