/**
 * @role What the sound itself puts into the drift picture, as pure maths: the cut a decoded source
 *   makes of the reference row every other row is read against, how the stretch of it actually
 *   sounding right now recuts that row (0196), and what a running effect's own meter does to the
 *   depth of its row. Neither is a parameter and neither is durable — a picture
 *   may rest on analysis and on a reading precisely because nothing about it is stored
 *   ([0145](../../docs/decisions/0145-a-picture-may-rest-on-analysis.md),
 *   [0128](../../docs/decisions/0128-every-motion-in-the-screen-belongs-to-a-parameter.md)).
 * @instead What a row is made of, and every dimension an effect's *values* reach → src/lib/moire.ts.
 *   Measuring a source at all → src/lib/analysis.ts. Reading the meter off the graph → the rack's
 *   own `meters` in src/audio/effects/rack.ts. Filling these onto a yard's rows → src/ui/moireRows.ts.
 */
import { MAX_ONSETS, type BeatAnalysis } from "./analysis";
import { DRIFT_DEPTH_FLOOR, DRIFT_PITCH_REACH, DRIFT_REST, type MoireRow } from "./moire";
import { PLAIN_PROFILE, STRIKE_PROFILE, type DriftProfile } from "./moireProfiles";
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
