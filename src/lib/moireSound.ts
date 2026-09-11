/**
 * @role What the sound itself puts into the drift picture, as pure maths: the cut a decoded source
 *   makes of the reference row every other row is read against, how the stretch of it actually
 *   sounding right now recuts that row (0196), how the ground it is being read on turns that row
 *   and the wash laid over it, what a running effect's own meter does to the depth of its row, and
 *   what the whole output's own spectrum does to the spiral the picture is folded into (0240).
 *   None of it is a parameter and none of it is durable — a picture
 *   may rest on analysis and on a reading precisely because nothing about it is stored
 *   ([0145](../../docs/decisions/0145-a-picture-may-rest-on-analysis.md),
 *   [0128](../../docs/decisions/0128-every-motion-in-the-screen-belongs-to-a-parameter.md)).
 * @instead What a row is made of, and every dimension an effect's *values* reach → src/lib/moire.ts.
 *   Measuring a source at all → src/lib/analysis.ts. Reading the meter off the graph → the rack's
 *   own `meters` in src/audio/effects/rack.ts. Filling these onto a yard's rows → src/ui/moireRows.ts.
 */
// Over the soft line cap, read and judged: this is one list of readings of one sound — the source's
// cut, the window's wash, the output's own spectrum and now the rack's own tail — each of them a
// few lines of maths under the paragraph that says what it is a picture of, and each documented
// against the others. There is no seam to split it on that would not put two readings of the same
// window in two files. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { MAX_ONSETS, type BeatAnalysis } from "./analysis.ts";
import { fold } from "./copy.ts";
import { DRIFT_DEPTH_FLOOR, DRIFT_PITCH_REACH, DRIFT_REST, type MoireRow } from "./moire.ts";
import { FRACTAL_BITE } from "./moireFractal.ts";
import { isFieldGeometry } from "./moireLattice.ts";
import { PLAIN_PROFILE, STRIKE_PROFILE, type DriftProfile } from "./moireProfiles.ts";
import { clamp, denormalize, normalize } from "./range.ts";
import { SETTLE_FLOOR_SECS } from "./settle.ts";

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
 * And what the same output's two sides say about where its weight is: the gap between them, signed
 * toward the left and bounded to a whole one either way. The difference and never a ratio of the
 * two: a ratio is the same number for a whisper panned hard and a mix panned hard, and it is
 * undefined for silence — the gap says *how much* weight is on one side, so a quiet pan moves the
 * picture a little and a loud one moves it all the way. Twice each side's own level over the mean
 * of the pair, which is the one arithmetic there is between two channels.
 *
 * A peek reading hotter than one on either side is a peak measured where the decks land rather than
 * after the ceiling (`MasterPeek`, src/audio/context.ts), so the gap is clamped here rather than
 * trusted, and a bus reporting nothing at all is a picture with no side to lean to.
 */
export const heardSides = (left: number, right: number): number =>
  Number.isFinite(left) && Number.isFinite(right) ? clamp(left - right, -1, 1) : 0;

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
 * As much of one standing rack entry as the field's own tail reads: how long it goes on sounding
 * like what it was given, and how much of it is heard at all (`effectSettleSecs` and `effectHeard`,
 * src/audio/params.ts). Structural rather than the rack's own entry, because lib may import nothing
 * of the tiers above it (docs/map.md) — and it is the whole of what this needs, exactly as
 * `FractalRun` is for a run (src/lib/moireFractal.ts).
 */
export type RackHeard = { readonly settle: number; readonly presence: number };

/**
 * The longest tail one entry can declare and still fall silent, in seconds: `reverb.decay` at its
 * own ceiling (src/audio/effects/reverb.ts). A delay fed back near unity settles far past it and a
 * tape at unity never settles at all — both read at the top of the band below, because a picture
 * whose whole field is already blowing has nothing further to say.
 */
export const RACK_TAIL_LONGEST_SECS = 8;

/**
 * And the band a rack's tail is read across, **stated once**: the floor a whole rack's own settle is
 * never given less than (`SETTLE_FLOOR_SECS`, src/lib/settle.ts) to the longest one there is. A
 * single entry may declare a shorter memory than that and several do — what they are saying is that
 * they hold nothing worth waiting for, and this is the reading agreeing: they read dry. Both ends
 * of it are what
 * the reading below means by nought and by one. Logarithmic for the reason the flatness band is —
 * a tail is a length and what one length is against another is a ratio, so a second reads dry,
 * three seconds reads a little over half and six reads nearly the whole of it.
 */
export const RACK_TAIL_BAND: readonly [number, number] = [
  SETTLE_FLOOR_SECS,
  RACK_TAIL_LONGEST_SECS,
];

/**
 * How long the standing rack takes to fall silent, on that band: nought where the rack is dry or
 * empty, one where it rings for the longest tail there is. Every entry already declares its own
 * `settle` over its own values, so there is no list of which effects are washy anywhere and there
 * may not be one — that fact is said once, by the plugin, and an entry added tomorrow is in this
 * reading the day it declares its own (principle 1).
 *
 * **The longest and never the sum**, which is the argument `rackSettleSecs` already makes
 * (src/lib/settle.ts): the stages run at once, so three reverbs of two seconds are settled when the
 * longest of them is and not six seconds later. **Weighted by what is heard**: a reverb at a wet of
 * nothing is a tail nobody can hear, and what nobody can hear is not in the picture — the same
 * thing `pulsedDepth` says about a row and `washAmount` says about a window under the floor.
 *
 * A rack with nothing standing in it reads nought, which is the picture a dry yard drew before
 * there was a tail in it — the answer and not a fallback, exactly as every reading above answers
 * silence (0145).
 */
export function rackTail(rack: Iterable<RackHeard>): number {
  let longest = 0;
  for (const { settle, presence } of rack) {
    // A loop at or over unity never falls silent at all (`feedbackSettleSecs`), which is the top of
    // the band and not a reason to skip it — and it is weighted like every other entry, because a
    // tail that runs for ever at a mix of nothing is still a tail nobody can hear. Infinity alone,
    // and never every number that is not finite: a settle that came back NaN read as the longest
    // tail there is would blow the whole field at full speed off a plugin's arithmetic bug, which
    // is the loudest way there is to say nothing (principle 5).
    const tail =
      settle === Number.POSITIVE_INFINITY
        ? RACK_TAIL_LONGEST_SECS
        : Number.isFinite(settle)
          ? Math.max(settle, 0)
          : 0;
    // And an entry nothing can say a presence for is not heard at all, which is the answer every
    // reading in this file gives a number that is not one (`heardLevel`, `meterPulse`).
    longest = Math.max(longest, tail * (Number.isFinite(presence) ? clamp(presence, 0, 1) : 0));
  }
  return normalize(longest, ...RACK_TAIL_BAND, "log");
}

/**
 * As much of one standing rack entry as the field's own shatter reads: how crowded its windows are
 * and how much of the signal they take at all — scatter's own Odds and its Gate, which is the same
 * `presence` the tail above weighs an entry by (`effectHeard`, src/audio/params.ts). Structural
 * rather than the rack's own entry for `RackHeard`'s reason: lib may import nothing of the tiers
 * above it (docs/map.md), and this is the whole of what the reading needs.
 */
export type RackShatter = { readonly chance: number; readonly presence: number };

/**
 * The band a rack's shatter is read across: one whole scatter to six of them. **One is nought and
 * not a little**, which is the reading saying what the picture says — a single instance replacing
 * everything it hears is one row's pitch and displaces nothing visible in a field of fourteen rows.
 * Six is the yard at its most broken, where the slices are wide enough to break every straight row
 * there is.
 *
 * Linear, where the tail's band is logarithmic, and for the reason that one is: a tail is a length
 * and what one length is against another is a ratio, where this is a count of how much of the yard
 * is doing the one thing — a fourth instance adds exactly what the third did.
 */
const RACK_SHATTER_ALONE = 1;
export const RACK_SHATTER_BROKEN = 6;
export const RACK_SHATTER_BAND: readonly [number, number] = [
  RACK_SHATTER_ALONE,
  RACK_SHATTER_BROKEN,
];

/**
 * How much of the standing yard is scatter, on that band: nought where nothing is scattering and
 * one where the whole rack is. **The sum and not the longest**, which is the opposite of the tail
 * above and is the whole difference between the two readings — stages that ring run at once and are
 * settled when the longest of them is, where stages that chop each chop what the one before it
 * already chopped, so a second instance is a picture broken twice.
 *
 * Each entry weighs itself by its own two declared values and never by a default: how crowded its
 * windows are, times how much of the signal they take at all. A rack with nothing scattering in it
 * reads nought, which is the picture drawn before there was a scatter in it — the answer and not a
 * fallback, exactly as every reading above answers silence (0145). And a value that is not a number
 * is not a share of anything: it weighs nothing, which is what `rackTail` does with a presence it
 * cannot read (principle 5).
 */
export function rackScatter(rack: Iterable<RackShatter>): number {
  let share = 0;
  for (const { chance, presence } of rack) {
    if (!Number.isFinite(chance) || !Number.isFinite(presence)) continue;
    share += clamp(chance, 0, 1) * clamp(presence, 0, 1);
  }
  return normalize(share, ...RACK_SHATTER_BAND);
}

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
 *
 * **The wash raises every row that is in the picture, and the field's own coordinates at nought
 * depth are the one thing it may not put there** (0249, amending 0213 and 0246; the lattice
 * with them, 0278). What an escape
 * field or a folded plane is a picture of is a population, and a field with nothing standing in it
 * has nothing to show: a run holding its rows through a crossfade sits them at `depth: 0`, and
 * washed toward a full cut they would each cut half a grating of a structure no automator is
 * standing. Nought here, and the same reading in `drawnGratings` (src/ui/moireCanvas.ts), so the
 * picture's weight and its ink agree.
 */
export const washedDepth = (row: MoireRow, wash: number): number =>
  row.depth <= 0 && isFieldGeometry(row.geometry)
    ? 0
    : // How much of the row is in the picture at all, over the whole of the rest: a row still
      // arriving cuts its own share of what it will cut, and a wash raising every row at once may
      // not raise one the picture has not admitted (`arrivedInto`, src/lib/moireArrival.ts). Over
      // and not inside, so the share the count is solved for and the depth actually cut are the one
      // number (`drawnGratings`, src/ui/moireCanvas.ts).
      clamp(row.arrival, 0, 1) * washedToward(pulsedDepth(row), 1, wash);

/**
 * The flatness a resonance and a wash actually read at, which is not nought and one. A spectrum is
 * measured over the whole band an analyser covers, and nothing an instrument makes carries equal
 * power in every one of those bins: a ringing drone reads a thousandth, a smeared mix a hundredth
 * and a full-band hiss a third, so read straight against 0..1 every sound there is is a resonance.
 * **Read logarithmically**, because a flatness is a ratio of two means and the band it actually
 * occupies spans two and a half decades — the same reason `normalize` has a log curve at all
 * (src/lib/range.ts).
 */
export const FRACTAL_FLATNESS_BAND: readonly [number, number] = [0.001, 0.3];

/**
 * How far the support is beaten against its own next scale once the output has been heard, on
 * 0..1: nothing at all under a broad output, and the whole of it under a ringing one.
 * **Flatness is the reading and resonance is what is spent** — a narrow peak is a flatness at the
 * bottom of the band above and cuts the picture through two copies of its support at close scales,
 * which fringe against each other exactly as two gratings do (0131); a broad wash is one at the top
 * of it and leaves the support cut once and whole.
 *
 * **An alpha and never a map** (0245). The support is baked when the population turns over, and a
 * flatness never rests — spent on a map it would rebake the picture at every frame, where spent on
 * the share the second cut is made at it costs one blit that was already being aimed.
 *
 * A window nothing was measured in beats nothing. `flatness: 0` is the spectrum's own way of saying
 * it measured nothing — the same sentinel `crestFactor` and `spectralTilt` use (src/lib/peaks.ts) —
 * and read straight it is a perfect resonance, which would have a silent yard cutting the picture
 * through the tightest support there is. So silence is the picture drawn before there was a
 * reading, exactly as it is for the wash and for a source nothing has measured (0145).
 */
export const heardBeat = (flatness: number): number =>
  Number.isFinite(flatness) && flatness > 0
    ? 1 - normalize(flatness, ...FRACTAL_FLATNESS_BAND, "log")
    : 0;

/**
 * The deepest the fractal row is ever cut, as its share of the depth every row is cut at. **One**,
 * which is what every other row in the picture rests at (`DRIFT_REST.depth`): the row is one
 * grating among their product and `gratingDepth` already shares the picture's weight out over it
 * (0131, 0246), so a ceiling under one would be the picture's own structure drawn *fainter* than
 * every knob in the yard — which is what a first shot of it looked like.
 */
export const FRACTAL_BITE_CEILING = 1;

/**
 * And where a dull sound and a sharp one actually put their energy, on the band the centroid is
 * measured across. A mix's centroid sits low — a couple of kilohertz against a Nyquist of
 * twenty-four — so an edge of a half is a sound no instrument makes and reading straight against
 * 0..1 would spend a fiftieth of the travel below on everything there is. Logarithmic for the
 * reason the flatness band is: an octave is an octave wherever it sits.
 */
export const FRACTAL_EDGE_BAND: readonly [number, number] = [0.02, 0.3];

/**
 * How deep the fractal row cuts once the output has been heard: `FRACTAL_BITE` under a dull sound
 * and up to `FRACTAL_BITE_CEILING` under a sharp one, off where the output's energy actually sits
 * (`spectralEdge`, src/lib/peaks.ts) read across the band above. The row's own depth and never its
 * seed — what the picture is cut *along* is the population an automator is standing and nothing
 * else says it (0245 kept, 0246) — so what a sharp sound changes is how much ink the structure
 * takes, and never what the structure is.
 *
 * Silence answers `FRACTAL_BITE`, which is the depth the row is cut at before there is anything
 * to hear.
 */
export const heardBite = (edge: number): number =>
  Number.isFinite(edge) && edge > 0
    ? denormalize(normalize(edge, ...FRACTAL_EDGE_BAND, "log"), FRACTAL_BITE, FRACTAL_BITE_CEILING)
    : FRACTAL_BITE;
