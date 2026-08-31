/**
 * @role The two rows in a yard's drift that belong to the whole field rather than to any one thing
 *   on it: the reference row every other row is fanned either side of, and the wash laid over all
 *   of them. What the source cuts the reference row to, how the stretch actually sounding recuts it
 *   (0196), how washed an output window reads, and how the ground the yard is reading turns and
 *   anchors both of them (P161).
 * @instead The rows a lane, a rack instance, a grown run and the macro row make →
 *   src/ui/moireRows.test.ts, which this was the tail of until it reached the hard cap (0045). The
 *   jumps module's own three → src/ui/moireRowsSong.test.ts. The maths on its own →
 *   src/lib/moireSound.ts. Drawing any of it → src/ui/moireCanvas.test.ts.
 */
// One import per thing the field is measured against — the picture's own rests and bands, the
// analyser and the generator that make a source to measure, the walk that stands a ground, and the
// screen the wash reaches. The count tracks what the field says, exactly as it does in the file
// this was the tail of (0007).
// oxlint-disable import/max-dependencies
// And over the soft cap by the same measure: the two rows here are each measured against a
// rendered source rather than a fixture, so a case is the file it needs plus the reading it
// makes of it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";
import { foldNothing, FOLD_KEEP } from "@/lib/moireFractal";

import { emptyDeckPeek } from "@/audio/deckPeek";
import { analyzeBeats } from "@/lib/analysis";
import { fold } from "@/lib/copy";
import {
  DRIFT_DEPTH_FLOOR,
  DRIFT_DISPERSE_REACH,
  DRIFT_REST,
  FLAT_BEND,
  turnsOf,
  LINEAR_GEOMETRY,
  type MoireRow,
} from "@/lib/moire";
import { DRIFT_BROADEST_PITCH, gratingTurns } from "@/lib/moireGrating";
import { PLAIN_PROFILE } from "@/lib/moireProfiles";
import {
  DRIFT_HEARD_SHARE,
  DRIFT_WASH_SHARE,
  FOLD_TIGHT_FLOOR,
  heardHard,
  heardPitch,
  heardTilt,
  PLAIN_CUT,
  pulsedDepth,
  sourceCut,
  washAmount,
  washedDepth,
  WASH_CREST_SMEARED,
  WASH_CREST_STRUCK,
} from "@/lib/moireSound";
import { crestFactor, peakMagnitude } from "@/lib/peaks";
import { oneSong } from "@/lib/playerSongs";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { playerGroundSecs, playerRowPeriod, playerRowStand } from "@/lib/playerDrift";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import type { PlayerSpec } from "@/lib/player";
import { renderGen } from "@/lib/waveform";
import {
  carryGround,
  moireRows,
  NO_GROWN,
  refillRows as filledRows,
  type MoireLane,
} from "@/ui/moireRows";
import { emptyMasterPeek } from "@/audio/context";
import type { MasterPeek } from "@/app/facade";
import { bandTurns, screenDisperse } from "@/ui/moireScreen";
import type { Loop } from "@/lib/timeline";
import type { BeatAnalysis } from "@/lib/analysis";
import type { DeckPeek } from "@/audio/deckPeek";
import type { RowRead } from "@/ui/moireRowsField";
// oxlint-enable import/max-dependencies

// The builder and the read are called with every argument named, where the two files either side of
// this one each wrap them in defaults. A case here is about the source, the output and the ground,
// so the cut, the analysis, the loop and the length are the subject of every one of them and there
// is nothing left to default — and a third wrapper is the one that would have to be lifted out
// (principle 3, src/ui/moireRowsSong.test.ts).

/**
 * One deck lane as a row: something in the picture with a depth of its own to rise beside the
 * field's, which is all a case here asks of a row that is neither the loop's nor the wash's.
 */
const lane: MoireLane = {
  key: "a lane of this yard's own",
  period: 2,
  shape: fold("a lane of this yard's own"),
  bend: FLAT_BEND,
  profile: PLAIN_PROFILE,
  geometry: LINEAR_GEOMETRY,
};

/** One row of a picture, or a loud no: an index the picture does not hold is a broken fixture. */
const rowAt = (rows: readonly MoireRow[], at: number): MoireRow => {
  const row = rows.at(at);
  if (row === undefined) throw new Error(`the picture has no row ${at}`);
  return row;
};

/** One meter window, `fill` written across it — the shape the deck's own analyser hands over. */
const windowOf = (fill: (at: number) => number): Float32Array =>
  Float32Array.from({ length: 1024 }, (_, at) => fill(at));

/**
 * One frame of the whole output, as `masterPeek` hands it over: the two the meter reads, and the
 * two the session's own row is drawn from. Named here because every case below that is not about
 * the session is about a yard, and a yard's rows must not move with the bus.
 */
const masterAt = (level: number, tilt: number): MasterPeek => ({
  ...emptyMasterPeek(),
  left: level,
  level,
  tilt,
  // The session's own clock, which is what the row's phase runs on. A time no deck's playhead is
  // at, so a case cannot pass by reading the deck's by accident.
  at: 7.25,
});

/** An output with nothing in it: the picture drawn before there was anything to hear. */
const SILENT_MASTER = emptyMasterPeek();

/**
 * And a read with all the time in the world behind it, which is a ground move that has finished
 * travelling: every case here but the travel's own is about where the picture ends up rather than
 * about how it got there (`easedCentre`, src/lib/moire.ts).
 */
const ARRIVED = Number.POSITIVE_INFINITY;

/** The per-frame read, against a fold of its own — which it refills and no case here reads back. */
const refillRows = (
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  peek: Readonly<DeckPeek>,
  rate: number,
  loop: Loop | null,
  duration: number,
  analysis: BeatAnalysis | null,
  master: Readonly<MasterPeek>,
  elapsed: number,
): number =>
  filledRows(rows, reads, peek, rate, loop, duration, analysis, master, elapsed, foldNothing());

/** How far apart the deepest and the shallowest of these cuts stand. */
const spread = (depths: readonly number[]): number => Math.max(...depths) - Math.min(...depths);

/** A yard's pattern, arranged as nothing and otherwise exactly what a switch press leaves. */
const JUMPING: PlayerSpec = { seed: 7, ...PLAYER_DEFAULTS, songs: oneSong([]) };

/**
 * A step of that walk standing on the ground `bed` — off the walk itself rather than a fixture
 * of its own, so a case here reads what a yard reads (0180). Which part is standing is nothing to
 * the two rows here: a ground is not the song's (`playerRowStand`, src/lib/playerDrift.ts).
 */
const standingOn = (bed: number): PlayerStep => ({
  ...playerWalk(JUMPING)(),
  bed,
});

// One flat list of what the field is made of, each case a few lines (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the picture's own field", () => {
  // P105: the picture is of this sample. Two decoded sources cut the reference row two ways, and
  // the same source cuts it the same way twice — the whole of what "one file looks unlike another"
  // is, and the reason a picture may rest on analysis at all (0145).
  it("draws two sources two ways, and one source the same way twice", () => {
    const RATE = 48_000;
    const struck = analyzeBeats(
      [renderGen("click-train", { secs: 2, sampleRate: RATE, hz: 4 })],
      RATE,
    );
    const held = analyzeBeats([renderGen("sine", { secs: 2, sampleRate: RATE, hz: 220 })], RATE);
    // A struck source stands well above its own mean and a sustained one sits near it, which is
    // what chooses the wave; the onsets per second are what set the spacing.
    expect(struck.crest).toBeGreaterThan(held.crest);
    const one = moireRows([], [], 4, sourceCut(struck, 2), null, NO_GROWN, null);
    const other = moireRows([], [], 4, sourceCut(held, 2), null, NO_GROWN, null);
    // The reference row, the field's own broad row over it, and the session's (0213, P167).
    expect(one.rows).toHaveLength(3);
    expect(one.rows[0]?.reference).toBe(true);
    expect(one.rows[0]?.profile).not.toBe(other.rows[0]?.profile);
    expect(one.rows[0]?.pitch).not.toBe(other.rows[0]?.pitch);
    expect(one.rows).not.toEqual(other.rows);
    // And the same source twice is the same picture: nothing here is stored, so this has to be a
    // function of the analysis and of nothing else.
    expect(one.rows).toEqual(moireRows([], [], 4, sourceCut(struck, 2), null, NO_GROWN, null).rows);
    // A yard with nothing measured draws what the reference row drew before there was a source.
    const bare = moireRows([], [], 4, sourceCut(null, 0), null, NO_GROWN, null).rows[0];
    expect(bare?.profile).toBe(PLAIN_PROFILE);
    expect(bare?.pitch).toBe(DRIFT_REST.pitch);
  });

  /**
   * 0196: and the reference row is recut, once a painting, from the stretch of source actually
   * sounding — so a mulcher that has moved the loop to a busy passage of a file draws a finer row
   * than the same yard reading a sparse one, and two grounds in one file are two pictures. Before
   * this the row said the same thing wherever the ground had crawled to, which is exactly the
   * difference a bed is supposed to make (0185, 0191).
   */
  // One scenario, and most of its length is the source it has to build — a rendered file busy at
  // one end and sparse at the other, which is the only thing a bed move is visible against. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  it("recuts the reference row from the stretch of source the yard is reading", () => {
    const RATE = 48_000;
    // One file, busy at the top and sparse at the end: the same source at two grounds, which is
    // what a bed move is.
    const dense = renderGen("click-train", { secs: 6, sampleRate: RATE, hz: 8 });
    const sparse = renderGen("click-train", { secs: 6, sampleRate: RATE, hz: 1 });
    const whole = new Float32Array(dense.length + sparse.length);
    whole.set(dense, 0);
    whole.set(sparse, dense.length);
    const analysis = analyzeBeats([whole], RATE);
    const secs = 12;
    const cut = sourceCut(analysis, secs);
    const { rows, reads } = moireRows([], [], 4, cut, null, NO_GROWN, null);
    const reference = rows[0];
    if (reference === undefined) throw new Error("the picture has no reference row");
    const at = (position: number): number => {
      refillRows(
        rows,
        reads,
        { ...emptyDeckPeek(), position },
        1,
        null,
        secs,
        analysis,
        SILENT_MASTER,
        ARRIVED,
      );
      return reference.pitch;
    };
    // Busy is finer: a smaller spacing, which is the direction `sourceCut` reads a dense file in.
    expect(at(2)).toBeLessThan(at(10));
    // And both are the same answer the maths gives on its own, resting at the whole file's cut
    // where there is nothing to read instead.
    expect(at(2)).toBe(heardPitch(analysis, secs, 2, cut.pitch));
    expect(heardPitch(null, secs, 2, cut.pitch)).toBe(cut.pitch);
    expect(heardPitch(analysis, 0, 2, cut.pitch)).toBe(cut.pitch);
    // The deck's own level is the other half: silence draws the row at the shallowest the share
    // allows and full level draws it as deep as its rest, and nothing may drive it deeper (0128).
    refillRows(
      rows,
      reads,
      { ...emptyDeckPeek(), meter: 1 },
      1,
      null,
      secs,
      analysis,
      SILENT_MASTER,
      ARRIVED,
    );
    expect(reference.pulse).toBe(0);
    expect(pulsedDepth(reference)).toBe(reference.depth);
    refillRows(
      rows,
      reads,
      { ...emptyDeckPeek(), meter: 0 },
      1,
      null,
      secs,
      analysis,
      SILENT_MASTER,
      ARRIVED,
    );
    expect(reference.pulse).toBe(DRIFT_HEARD_SHARE);
    expect(pulsedDepth(reference)).toBeLessThan(reference.depth);
    expect(pulsedDepth(reference)).toBeGreaterThan(DRIFT_DEPTH_FLOOR);
  });

  /**
   * P161: and the ground moves the field the picture is beaten against, not only its spacing. The
   * reference row and the wash over it are anchored where in the source the yard is reading and
   * folded off the ground itself, so a jump to a new stretch of the file re-centres and rotates
   * every fringe in the picture rather than respacing the one row (0196, 0185).
   */
  it("turns and anchors the field on the ground the yard is reading", () => {
    const RATE = 48_000;
    const secs = 4;
    const analysis = analyzeBeats(
      [renderGen("click-train", { secs, sampleRate: RATE, hz: 4 })],
      RATE,
    );
    const loop: Loop = { in: 0, out: 1 };
    const { rows, reads } = moireRows([], [], 4, sourceCut(analysis, secs), null, NO_GROWN, null);
    const reference = rowAt(rows, 0);
    const field = rowAt(rows, -2);
    const peek = emptyDeckPeek();
    const wash = field.shape;
    // A yard reading nowhere: no pattern is standing, so both rows rest exactly where they were
    // built — the reference row on the zero no fold produces, and the field on its own name.
    refillRows(rows, reads, peek, 1, loop, secs, analysis, SILENT_MASTER, ARRIVED);
    expect(reference.shape).toBe(0);
    expect(field.shape).toBe(wash);
    expect(reference.centre).toBe(DRIFT_REST.centre);
    expect(field.centre).toBe(DRIFT_REST.centre);

    // A ground standing: the field is turned off the rest it was at, and the reference row is not.
    // The axis is the angle every other row is fanned either side of and is never fanned itself, so
    // it keeps the zero that says so and takes the anchor alone (`gratingTurns`, src/lib/moireGrating.ts).
    peek.player.step = standingOn(3);
    refillRows(rows, reads, peek, 1, loop, secs, analysis, SILENT_MASTER, ARRIVED);
    expect(field.shape).not.toBe(wash);
    expect(reference.shape).toBe(0);
    expect(gratingTurns(reference)).toBe(0);
    expect(gratingTurns(field)).not.toBe(gratingTurns({ ...field, shape: wash }));
    // And anchored where in the source the yard is actually reading, through the one function the
    // module's own row is anchored by (0185, principle 1).
    expect(reference.centre).toBe(playerRowStand(3, loop, secs)?.centre);
    expect(field.centre).toBe(reference.centre);
    expect(reference.centre).not.toBe(DRIFT_REST.centre);
  });

  /**
   * P174: a jump is a distance, and the picture is the one surface that could show it. 0224 was
   * right that a ground move re-centres and rotates the field and never said how it gets there, and
   * the answer it left by default was instantly — so a loop jumping to a new stretch of the file
   * teleported the field the whole picture is beaten against.
   */
  it("travels the field toward a moved ground across frames rather than arriving at it", () => {
    const RATE = 48_000;
    const secs = 4;
    const analysis = analyzeBeats(
      [renderGen("click-train", { secs, sampleRate: RATE, hz: 4 })],
      RATE,
    );
    const loop: Loop = { in: 0, out: 1 };
    // A jumping yard, because a yard that is not jumping has no landing to time a travel in.
    const period = playerRowPeriod(JUMPING);
    const { rows, reads } = moireRows([], [], 4, sourceCut(analysis, secs), period, NO_GROWN, null);
    const identity = [...rows];
    const [reference, field, module] = [rowAt(rows, -3), rowAt(rows, -2), rowAt(rows, 0)];
    expect([reads.at(-3)?.heard, reads.at(-2)?.ground, reads[0]?.tier]).not.toContain(null);
    const peek = emptyDeckPeek();
    // Standing on the loop itself, arrived: this is where the picture is jumped *from*.
    peek.player.step = standingOn(0);
    refillRows(rows, reads, peek, 1, loop, secs, analysis, SILENT_MASTER, ARRIVED);
    const from = playerRowStand(0, loop, secs)?.centre ?? -1;
    expect(reference.centre).toBe(from);

    // And a jump three quarters of the way across the file, read one frame at a time.
    const bed = 48;
    const to = playerRowStand(bed, loop, secs)?.centre ?? -1;
    expect(to).toBeGreaterThan(from);
    peek.player.step = standingOn(bed);
    const frame = 0.05;
    const read = (): number[] => {
      refillRows(rows, reads, peek, 1, loop, secs, analysis, SILENT_MASTER, frame);
      // In place, and nothing here allocates a row: the read refills the array it was handed, and
      // the travel keeps no state but the centres already on it (0070).
      expect(rows.every((row, at) => row === identity[at])).toBe(true);
      return [reference.centre, field.centre, module.centre];
    };
    // One frame moves the field a fraction of the way rather than the whole way, and moves every
    // row the ground moves by the same fraction: one ground is one field.
    const first = read();
    expect(first[0]).toBeGreaterThan(from);
    expect(first[0]).toBeLessThan(to);
    expect(new Set(first).size).toBe(1);

    // It keeps travelling and it arrives, having walked there: a move and not a drift away.
    const walked = [first[0] ?? -1];
    for (let at = 0; at < 20 && reference.centre !== to; at += 1) walked.push(read()[0] ?? -1);
    expect(reference.centre).toBe(to);
    expect(walked.every((at, index) => index === 0 || at > (walked[index - 1] ?? at))).toBe(true);
    // And it took the time the landing says and not a time of its own: a whole reach of travel is
    // `playerGroundSecs` long, so three quarters of one is three quarters of that.
    expect(walked.length * frame).toBeCloseTo(playerGroundSecs(period) * (to - from), 1);
  });

  /**
   * And the travel is the one accumulated number in the picture, so it is the one that has to
   * survive a set the picture rebuilt. A row set is rebuilt whenever anything durable moves and
   * whenever a run turns over, neither of which is a jump, and every fresh row stands in the middle
   * of the picture — so a knob touch mid-travel would sweep the whole field back from there.
   */
  it("carries a half-travelled ground onto the set that replaces it", () => {
    const loop: Loop = { in: 0, out: 1 };
    const secs = 4;
    const period = playerRowPeriod(JUMPING);
    const built = (): ReturnType<typeof moireRows> =>
      moireRows([], [], 4, PLAIN_CUT, period, NO_GROWN, null);
    const was = built();
    const peek = emptyDeckPeek();
    peek.player.step = standingOn(48);
    refillRows(was.rows, was.reads, peek, 1, loop, secs, null, SILENT_MASTER, 0.05);
    const halfway = rowAt(was.rows, -3).centre;
    expect(halfway).toBeGreaterThan(DRIFT_REST.centre - 1);
    expect(halfway).not.toBe(playerRowStand(48, loop, secs)?.centre);

    // The rebuilt set stands where the old one had got to, on every row the ground moves — and not
    // where a fresh row is built, which is the middle of the picture.
    const now = built();
    expect(rowAt(now.rows, -3).centre).toBe(DRIFT_REST.centre);
    carryGround(was, now);
    for (const at of [-3, -2, 0]) expect(rowAt(now.rows, at).centre).toBe(halfway);
  });

  /**
   * And the other half of it: which stretch is being read is the whole of what the two rows are
   * folded off, so one ground is one field however long it is looked at and two grounds a few
   * seconds apart in one file are two fields (0185, `heardShape`).
   */
  it("draws two grounds of one file as two fields, and one ground as one field", () => {
    const RATE = 48_000;
    const secs = 4;
    const analysis = analyzeBeats(
      [renderGen("click-train", { secs, sampleRate: RATE, hz: 4 })],
      RATE,
    );
    const loop: Loop = { in: 0, out: 1 };
    const { rows, reads } = moireRows([], [], 4, sourceCut(analysis, secs), null, NO_GROWN, null);
    const reference = rowAt(rows, 0);
    const field = rowAt(rows, -2);
    const peek = emptyDeckPeek();
    // One ground, and it is one field however long it is looked at: the playhead runs on and
    // nothing about either row moves with it.
    peek.player.step = standingOn(3);
    const held: string[] = [];
    for (const position of [0, 0.25, 0.75]) {
      peek.position = position;
      refillRows(rows, reads, peek, 1, loop, secs, analysis, SILENT_MASTER, ARRIVED);
      held.push(`${reference.shape} ${reference.centre} ${field.shape} ${field.centre}`);
    }
    expect(new Set(held).size).toBe(1);

    // Another stretch of the same file is another field: another angle and another place it is
    // measured from, where before this it was the same field more finely cut.
    const was = held[0];
    peek.player.step = standingOn(11);
    peek.position = 0;
    refillRows(rows, reads, peek, 1, loop, secs, analysis, SILENT_MASTER, ARRIVED);
    expect(`${reference.shape} ${reference.centre} ${field.shape} ${field.centre}`).not.toBe(was);
    expect(reference.centre).not.toBe(playerRowStand(3, loop, secs)?.centre);
    // Nothing of it is stored: the same ground reached again is the field it was.
    peek.player.step = standingOn(3);
    refillRows(rows, reads, peek, 1, loop, secs, analysis, SILENT_MASTER, ARRIVED);
    expect(`${reference.shape} ${reference.centre} ${field.shape} ${field.centre}`).toBe(was);
  });

  /**
   * P146: a yard that has been smeared looks much like one that has not, because every motion in
   * the picture is a knob position or one instance's own meter. What "washed" is, measurably, is
   * the crest of the output window — its peak over its RMS — which falls as reverb, delay and
   * saturation fill the gaps between the transients (0213).
   */
  it("reads a struck window as no wash and a smeared one as a wash, and silence as neither", () => {
    // A struck window: one hit with room either side of it, which is a peak far above the window's
    // own power and the picture drawn before there was a wash in it.
    const struck = windowOf((at) => (at < 4 ? 1 : 0));
    expect(crestFactor(struck)).toBeGreaterThan(WASH_CREST_STRUCK);
    expect(washAmount(crestFactor(struck), 1)).toBe(0);
    // A smeared one: a held tone has no gaps left to fill, so its peak stands √2 above its RMS and
    // the picture reads it as washed through.
    const smeared = windowOf((at) => Math.sin((at / 1024) * 64 * Math.PI));
    expect(crestFactor(smeared)).toBeLessThan(WASH_CREST_SMEARED);
    expect(washAmount(crestFactor(smeared), 1)).toBe(1);
    // And a tail between the two reads between the two: a sixteenth of the window standing at full
    // scale is a crest of four, which is neither struck nor smeared.
    const tail = windowOf((at) => (at % 16 === 0 ? 1 : 0));
    expect(crestFactor(tail)).toBeCloseTo(4, 6);
    const between = washAmount(crestFactor(tail), 1);
    expect(between).toBeGreaterThan(0);
    expect(between).toBeLessThan(1);
    // Silence is not a wash, and it is silence in both of the ways a window can be. A window with
    // nothing in it has no crest to report — the same sentinel the source's own analysis uses for
    // "measured nothing" — and it draws no wash at all rather than the deepest one (0145).
    expect(crestFactor(windowOf(() => 0))).toBe(0);
    expect(washAmount(0, 1)).toBe(0);
    // And a crest knows nothing about how loud its window was: a noise floor nobody can hear has
    // the crest of a held tone, so the level beside it is what says there is nothing to wash.
    const floor = windowOf((at) => 1e-6 * Math.sin((at / 1024) * 64 * Math.PI));
    expect(crestFactor(floor)).toBeLessThan(WASH_CREST_SMEARED);
    expect(washAmount(crestFactor(floor), peakMagnitude(floor))).toBe(0);
    expect(washAmount(crestFactor(smeared), peakMagnitude(smeared))).toBe(1);
    // Bounded at both ends, whatever a window hands over: a picture the reading could push past
    // either end would be a reading deciding what the knobs are allowed to say.
    for (const crest of [0.5, 1, 1.5, 3, 8, 40, 1e6, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(washAmount(crest, 1)).toBeGreaterThanOrEqual(0);
      expect(washAmount(crest, 1)).toBeLessThanOrEqual(1);
    }
  });

  /**
   * And what the wash does to the picture: the rows stop being separable. Depth and disperse rise
   * together across every row at once, and one broad slow row is laid over the whole field at the
   * loop's own period — a larger moiré over the small ones, which is a picture blending rather than
   * a picture with one more thing in it. The reading belongs to the field and to no row: an output
   * has no item to belong to, where every other reading the picture takes is one item's own meter
   * (0128, 0213).
   */
  it("lays the field's own row over the picture and rises every row with the wash", () => {
    const { rows, reads } = moireRows([lane], [], 4, PLAIN_CUT, null, NO_GROWN, null);
    const field = rowAt(rows, -2);
    // Last of all, on the loop's own period, at the coarse end of the band every row is drawn in —
    // so what it makes with the rest is a larger moiré and not a second hatch among them.
    expect(field.period).toBe(4);
    expect(field.pitch).toBe(DRIFT_BROADEST_PITCH);
    expect(field.reference).toBe(false);
    // And it cuts nothing at all until the yard is washed: a dry yard draws exactly the picture it
    // drew before there was a reading of its output.
    expect(field.depth).toBe(0);
    expect(washedDepth(rowAt(rows, 0), 0)).toBe(pulsedDepth(rowAt(rows, 0)));
    expect(washedDepth(field, 0)).toBe(0);

    // The reading arrives beside the meters on the one peek, in the unit it was measured in, and is
    // answered rather than written onto a row, because there is no row it belongs to.
    const peek = {
      ...emptyDeckPeek(),
      position: 1,
      meter: 1,
      crest: crestFactor(windowOf((at) => (at < 4 ? 1 : 0))),
    };
    expect(refillRows(rows, reads, peek, 1, null, 0, null, SILENT_MASTER, ARRIVED)).toBe(0);
    peek.crest = WASH_CREST_SMEARED;
    const wash = refillRows(rows, reads, peek, 1, null, 0, null, SILENT_MASTER, ARRIVED);
    expect(wash).toBe(1);
    // Every row rises by the same share of what it had left, so the deepest and the shallowest
    // close on each other: that is the field becoming less separable rather than one row moving.
    const dry = rows.map((row) => pulsedDepth(row));
    const wet = rows.map((row) => washedDepth(row, wash));
    expect(wet).toEqual(dry.map((depth) => depth + (1 - depth) * DRIFT_WASH_SHARE));
    expect(wet.every((depth, at) => depth >= (dry[at] ?? 0))).toBe(true);
    // The field's own row is the one that had everything left to rise: it cuts half a picture at a
    // full wash, and nothing at all without one.
    expect(washedDepth(field, wash)).toBe(DRIFT_WASH_SHARE);
    expect(spread(wet)).toBeLessThan(spread(dry));
    // And the screen's three lattices diverge with them, on the one number, so the picture blends
    // in colour exactly as far as it blends in depth.
    expect(screenDisperse(rows, wash)).toBeGreaterThan(screenDisperse(rows, 0));
    expect(screenDisperse(rows, wash)).toBeLessThanOrEqual(DRIFT_DISPERSE_REACH);
    // Nothing about the reading is stored: the read wrote no depth onto any row, so a wash of
    // nothing is the picture the set was built with, whatever it has just been drawn under.
    expect(rows.map((row) => washedDepth(row, 0))).toEqual(dry);
    expect(field.depth).toBe(0);
  });
  /**
   * P167: every other row in the picture is a picture of an input — a knob position, one instance's
   * meter, a clock — so the one thing nothing drew was what the instrument actually sounds like at
   * the end. 0213 gave a reading of the output to the field and refused it a row because a deck's
   * output has no item to belong to; the master bus has one, and every yard lands in it.
   */
  // One row asked every question that distinguishes it from a yard's — its period, its shape, its
  // place in the order — and the length is how many of those questions there are. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  it("lays one row for the whole session over every picture, on the session's own clock", () => {
    const loose = moireRows([lane], [], 4, PLAIN_CUT, null, NO_GROWN, null);
    const synced = moireRows([lane], [], 4, PLAIN_CUT, null, NO_GROWN, 1.5);
    const session = rowAt(loose.rows, -1);
    // Last of all, after the wash: what the yard is running decides the window and the recurrence,
    // and this row is not the yard's.
    expect(loose.rows).toHaveLength(4);
    expect(rowAt(loose.rows, -1)).not.toBe(rowAt(loose.rows, -2));
    // Its period is the session's clock where one is held, and the yard's loop where none is: a
    // period no deck owns is what keeps it from locking to a yard's rows (0097).
    expect(session.period).toBe(4);
    expect(rowAt(synced.rows, -1).period).toBe(1.5);
    // Folded off 0, which is the identity that says "the axis": it lies along the reference row and
    // beats against it rather than crossing it, and is never fanned (`gratingTurns`).
    expect(session.shape).toBe(0);
    expect(gratingTurns(session)).toBe(0);
    expect(session.reference).toBe(true);
    // And it is the same row in every picture: two yards open side by side are beaten against one
    // layer and drift together, which is what a picture of the session is and what a second
    // per-deck reading would not be.
    const other = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, 1.5);
    expect(rowAt(other.rows, -1)).toEqual(rowAt(synced.rows, -1));
    expect(session.geometry).toBe(LINEAR_GEOMETRY);
    expect(session.profile).toBe(PLAIN_PROFILE);
    expect(session.bend).toBe(FLAT_BEND);
    // But never the row the screen's band rolls on: what the band rides is this deck's read
    // position, and this row's phase is the session's clock. The loop's row is the picture's own
    // axis and is filled from the playhead, so the roll is off that one and off nothing else.
    const peek = { ...emptyDeckPeek(), position: 1.5 };
    refillRows(synced.rows, synced.reads, peek, 1, null, 0, null, masterAt(1, 0.5), ARRIVED);
    const loopRow = rowAt(synced.rows, 1);
    expect(loopRow.reference).toBe(true);
    expect(bandTurns(synced.rows)).toBe(turnsOf(loopRow));
    expect(bandTurns(synced.rows)).not.toBe(0);
    // Even where the yard has no loop at all, which is the one picture where this row is the only
    // axis in it: a band riding the session's clock is not the deck's read position.
    const loopless = moireRows([lane], [], 0, PLAIN_CUT, null, NO_GROWN, 0.75);
    refillRows(loopless.rows, loopless.reads, peek, 1, null, 0, null, masterAt(1, 0.5), ARRIVED);
    expect(rowAt(loopless.rows, -1).period).toBe(0.75);
    expect(bandTurns(loopless.rows)).toBe(0);
    // And nothing at all onto a picture that holds nothing of its own: one row of somebody else's
    // session is not this yard's picture arriving.
    expect(moireRows([], [], 0, PLAIN_CUT, null, NO_GROWN, 1.5).rows).toEqual([]);

    // The phase included — it runs on the session's own clock, so two yards reading two places in
    // two files still stand it in the same place.
    const master = masterAt(1, 0.5);
    const one = { ...emptyDeckPeek(), position: 0.2 };
    const two = { ...emptyDeckPeek(), position: 3.1 };
    refillRows(other.rows, other.reads, one, 1, null, 0, null, master, ARRIVED);
    refillRows(synced.rows, synced.reads, two, 1, null, 0, null, master, ARRIVED);
    expect(rowAt(other.rows, -1).phase).toBe(rowAt(synced.rows, -1).phase);
    expect(rowAt(other.rows, -1).phase).toBe(master.at % 1.5);
    // And it is the yard's own playhead that moves every other row, exactly as it always was: the
    // two pictures' own axes are in two places, and the layer over them is in one.
    expect(rowAt(other.rows, 0).phase).not.toBe(loopRow.phase);
  });

  /**
   * And what it draws: the level of the output cuts its depth and the brightness of the same window
   * sets its spacing — two allocation-free scans of a window the meter is already fetching, in the
   * time domain and never a spectrum (`rmsMagnitude`, `spectralTilt`, src/lib/peaks.ts).
   */
  it("cuts the session's row at nothing over silence and deeper as the output grows", () => {
    const { rows, reads } = moireRows([lane], [], 4, PLAIN_CUT, null, NO_GROWN, null);
    const session = rowAt(rows, -1);
    const yardRow = rowAt(rows, 0);
    // Built at no depth of its own, like the wash row: a session nobody can hear draws exactly the
    // picture the yard drew before there was an output to hear, and the screen skips a row with no
    // depth of its own the way it skips the reference row (0213, 0128).
    expect(session.depth).toBe(0);
    const peek = { ...emptyDeckPeek(), meter: 1 };
    refillRows(rows, reads, peek, 1, null, 0, null, SILENT_MASTER, ARRIVED);
    expect(session.pulse).toBe(0);
    expect(pulsedDepth(session)).toBe(0);
    expect(session.pitch).toBe(heardTilt(0));

    // A session with something in it: its level is the only depth the row has, so the row deepens
    // as the output grows and never the other way round.
    refillRows(rows, reads, peek, 1, null, 0, null, masterAt(0.5, 0.25), ARRIVED);
    const half = pulsedDepth(session);
    expect(session.pulse).toBe(0.5);
    expect(half).toBeGreaterThan(0);
    refillRows(rows, reads, peek, 1, null, 0, null, masterAt(1, 0.25), ARRIVED);
    expect(pulsedDepth(session)).toBeGreaterThan(half);
    // Bounded whatever the bus hands over, and nothing about the yard's own rows moves with it.
    refillRows(rows, reads, peek, 1, null, 0, null, masterAt(4, 0.25), ARRIVED);
    expect(session.pulse).toBe(1);
    refillRows(rows, reads, peek, 1, null, 0, null, masterAt(Number.NaN, Number.NaN), ARRIVED);
    expect(session.pulse).toBe(0);
    expect(yardRow.pulse).toBe(0);
    expect(yardRow.depth).toBe(DRIFT_REST.depth);

    // And the brightness is the spacing, through the one band every reading in the picture is spent
    // as a spacing through: a dark mix draws it coarse and a bright one fine (principle 1).
    refillRows(rows, reads, peek, 1, null, 0, null, masterAt(1, 0.1), ARRIVED);
    const dark = session.pitch;
    refillRows(rows, reads, peek, 1, null, 0, null, masterAt(1, 0.9), ARRIVED);
    expect(session.pitch).toBe(heardTilt(0.9));
    expect(session.pitch).toBeLessThan(dark);
    // Nothing of it is stored: the same reading twice is the same row.
    refillRows(rows, reads, peek, 1, null, 0, null, masterAt(1, 0.1), ARRIVED);
    expect(session.pitch).toBe(dark);
  });

  /**
   * P178: and the one thing the output cuts that is not a row. A wash and a resonance are the same
   * level and nearly the same tilt and are not the same picture — so what the bus reads of *how*
   * its energy is spread reaches the fold, which the rest of the output cannot say (0240).
   */
  it("tightens the fold a resonant output rings through and leaves a washed one loose", () => {
    // One automator holding one place, which is a picture with a fold in it at all.
    const grown = new Map([
      [
        "an automator of this yard's own",
        [
          {
            effect: "delay",
            instance: "a place standing",
            presence: 1,
            remain: 30,
            life: 30,
            values: [],
          },
        ],
      ],
    ]);
    const { rows, reads } = moireRows([lane], [], 4, PLAIN_CUT, null, grown, null);
    const peek = { ...emptyDeckPeek(), grown };

    // A broad wash: every reading of the fold is the one its holding instance's id drew.
    const washed = foldNothing();
    const wash: MasterPeek = { ...masterAt(0.5, 0.25), flatness: 0.3, edge: 0 };
    filledRows(rows, reads, peek, 1, null, 0, null, wash, ARRIVED, washed);
    const loose = washed.ratios[0] ?? Number.NaN;
    expect(washed.depth).toBe(1);
    expect(loose).toBeGreaterThan(FOLD_TIGHT_FLOOR);
    expect(washed.keep).toBe(FOLD_KEEP);

    // And a narrow resonance through the same run: the same spiral, drawn tighter, and the same
    // stack, laid harder by how sharp the output is. Neither of them is a depth — the population
    // standing is what says how deep the picture folds, and it has not moved.
    const rang = foldNothing();
    // Both readings are ones the instrument actually produces: a smeared mix reads a hundredth
    // flat, and a mix's own centroid sits a couple of kilohertz up rather than at half of Nyquist.
    const ring: MasterPeek = { ...masterAt(0.5, 0.25), flatness: 0.01, edge: 0.12 };
    filledRows(rows, reads, peek, 1, null, 0, null, ring, ARRIVED, rang);
    expect(rang.ratios[0] ?? Number.NaN).toBeLessThan(loose);
    expect(rang.keep).toBe(heardHard(0.12));
    expect(rang.keep).toBeGreaterThan(FOLD_KEEP);
    expect(rang.depth).toBe(washed.depth);
    // And nothing of it is stored: the wash's own reading again is the wash's own fold.
    const again = foldNothing();
    filledRows(rows, reads, peek, 1, null, 0, null, wash, ARRIVED, again);
    expect(again.ratios[0]).toBe(loose);
    expect(again.keep).toBe(FOLD_KEEP);
  });
});
