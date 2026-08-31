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
import { describe, expect, it } from "vitest";

import { emptyDeckPeek } from "@/audio/deckPeek";
import { analyzeBeats } from "@/lib/analysis";
import { fold } from "@/lib/copy";
import {
  DRIFT_BROADEST_PITCH,
  DRIFT_DEPTH_FLOOR,
  DRIFT_DISPERSE_REACH,
  DRIFT_REST,
  FLAT_BEND,
  gratingTurns,
  LINEAR_GEOMETRY,
  type MoireRow,
} from "@/lib/moire";
import { PLAIN_PROFILE } from "@/lib/moireProfiles";
import {
  DRIFT_HEARD_SHARE,
  DRIFT_WASH_SHARE,
  heardPitch,
  PLAIN_CUT,
  pulsedDepth,
  sourceCut,
  washAmount,
  washedDepth,
  WASH_CREST_SMEARED,
  WASH_CREST_STRUCK,
} from "@/lib/moireSound";
import { crestFactor, peakMagnitude } from "@/lib/peaks";
import { oneAlbum } from "@/lib/playerAlbum";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { playerRowStand } from "@/lib/playerDrift";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { renderGen } from "@/lib/waveform";
import { moireRows, NO_GROWN, refillRows, type MoireLane } from "@/ui/moireRows";
import { screenDisperse } from "@/ui/moireScreen";
import type { Loop } from "@/lib/timeline";
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

/** How far apart the deepest and the shallowest of these cuts stand. */
const spread = (depths: readonly number[]): number => Math.max(...depths) - Math.min(...depths);

/**
 * A step of a yard's walk standing on the ground `bed` — off the walk itself rather than a fixture
 * of its own, so a case here reads what a yard reads (0180). Which part is standing is nothing to
 * the two rows here: a ground is not the song's (`playerRowStand`, src/lib/playerDrift.ts).
 */
const standingOn = (bed: number): PlayerStep => ({
  ...playerWalk({ seed: 7, ...PLAYER_DEFAULTS, albums: oneAlbum([]) })(),
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
    const one = moireRows([], [], 4, sourceCut(struck, 2), null, NO_GROWN);
    const other = moireRows([], [], 4, sourceCut(held, 2), null, NO_GROWN);
    // The reference row, and the field's own broad row over it (0213).
    expect(one.rows).toHaveLength(2);
    expect(one.rows[0]?.reference).toBe(true);
    expect(one.rows[0]?.profile).not.toBe(other.rows[0]?.profile);
    expect(one.rows[0]?.pitch).not.toBe(other.rows[0]?.pitch);
    expect(one.rows).not.toEqual(other.rows);
    // And the same source twice is the same picture: nothing here is stored, so this has to be a
    // function of the analysis and of nothing else.
    expect(one.rows).toEqual(moireRows([], [], 4, sourceCut(struck, 2), null, NO_GROWN).rows);
    // A yard with nothing measured draws what the reference row drew before there was a source.
    const bare = moireRows([], [], 4, sourceCut(null, 0), null, NO_GROWN).rows[0];
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
    const { rows, reads } = moireRows([], [], 4, cut, null, NO_GROWN);
    const reference = rows[0];
    if (reference === undefined) throw new Error("the picture has no reference row");
    const at = (position: number): number => {
      refillRows(rows, reads, { ...emptyDeckPeek(), position }, 1, null, secs, analysis);
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
    refillRows(rows, reads, { ...emptyDeckPeek(), meter: 1 }, 1, null, secs, analysis);
    expect(reference.pulse).toBe(0);
    expect(pulsedDepth(reference)).toBe(reference.depth);
    refillRows(rows, reads, { ...emptyDeckPeek(), meter: 0 }, 1, null, secs, analysis);
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
    const { rows, reads } = moireRows([], [], 4, sourceCut(analysis, secs), null, NO_GROWN);
    const reference = rowAt(rows, 0);
    const field = rowAt(rows, -1);
    const peek = emptyDeckPeek();
    const wash = field.shape;
    // A yard reading nowhere: no pattern is standing, so both rows rest exactly where they were
    // built — the reference row on the zero no fold produces, and the field on its own name.
    refillRows(rows, reads, peek, 1, loop, secs, analysis);
    expect(reference.shape).toBe(0);
    expect(field.shape).toBe(wash);
    expect(reference.centre).toBe(DRIFT_REST.centre);
    expect(field.centre).toBe(DRIFT_REST.centre);

    // A ground standing: the field is turned off the rest it was at, and the reference row is not.
    // The axis is the angle every other row is fanned either side of and is never fanned itself, so
    // it keeps the zero that says so and takes the anchor alone (`gratingTurns`, src/lib/moire.ts).
    peek.player.step = standingOn(3);
    refillRows(rows, reads, peek, 1, loop, secs, analysis);
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
    const { rows, reads } = moireRows([], [], 4, sourceCut(analysis, secs), null, NO_GROWN);
    const reference = rowAt(rows, 0);
    const field = rowAt(rows, -1);
    const peek = emptyDeckPeek();
    // One ground, and it is one field however long it is looked at: the playhead runs on and
    // nothing about either row moves with it.
    peek.player.step = standingOn(3);
    const held: string[] = [];
    for (const position of [0, 0.25, 0.75]) {
      peek.position = position;
      refillRows(rows, reads, peek, 1, loop, secs, analysis);
      held.push(`${reference.shape} ${reference.centre} ${field.shape} ${field.centre}`);
    }
    expect(new Set(held).size).toBe(1);

    // Another stretch of the same file is another field: another angle and another place it is
    // measured from, where before this it was the same field more finely cut.
    const was = held[0];
    peek.player.step = standingOn(11);
    peek.position = 0;
    refillRows(rows, reads, peek, 1, loop, secs, analysis);
    expect(`${reference.shape} ${reference.centre} ${field.shape} ${field.centre}`).not.toBe(was);
    expect(reference.centre).not.toBe(playerRowStand(3, loop, secs)?.centre);
    // Nothing of it is stored: the same ground reached again is the field it was.
    peek.player.step = standingOn(3);
    refillRows(rows, reads, peek, 1, loop, secs, analysis);
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
    const { rows, reads } = moireRows([lane], [], 4, PLAIN_CUT, null, NO_GROWN);
    const field = rowAt(rows, -1);
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
    expect(refillRows(rows, reads, peek, 1, null, 0, null)).toBe(0);
    peek.crest = WASH_CREST_SMEARED;
    const wash = refillRows(rows, reads, peek, 1, null, 0, null);
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
});
