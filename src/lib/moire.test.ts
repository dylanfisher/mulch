/**
 * @role Tests what a row of the picture is: the window the rows are drawn across, the period an
 *   instance folds to, the dimensions an effect's values reach, and the wave each profile is cut
 *   to — including the one built out of octaves of itself, and the frame feedback's own bound.
 */
import { describe, expect, it } from "vitest";

import { fold } from "./copy";
import {
  BEND_SAMPLES,
  bendAt,
  bendSwing,
  cosTurn,
  DRIFT_DEPTH_FLOOR,
  DRIFT_DIMENSIONS,
  DRIFT_DISPERSE_REACH,
  DRIFT_FEEDBACK_CEILING,
  DRIFT_FRINGE_REACH,
  DRIFT_CENTRE_PUNCH,
  DRIFT_CENTRE_REACH,
  DRIFT_CENTRE_SWING,
  DRIFT_OCTAVES_REACH,
  DRIFT_PITCH_REACH,
  DRIFT_REST,
  DRIFT_SCALES_BUDGET,
  DRIFT_STEPS,
  driftedCentre,
  driftReached,
  EFFECT_ROW_PERIOD_SECS,
  effectRowCentre,
  effectRowPeriod,
  feedbackAlpha,
  feedbackSettles,
  FLAT_BEND,
  turnsOf,
  LINEAR_GEOMETRY,
  restingCentre,
  shareOctaves,
  type DriftGeometry,
  laneBend,
  MIN_ROW_CYCLES,
  moireWindowSecs,
  MOIRE_CYCLES,
  TAU,
  type MoireRow,
} from "./moire";
import {
  gratingDepth,
  gratingKeep,
  gratingPitch,
  gratingTurns,
  PICTURE_FLOOR,
} from "./moireGrating";
import { DRIFT_PROFILES, PLAIN_PROFILE, profileBlock } from "./moireProfiles";

import { moireRow as row } from "./moireRow";

/**
 * What a whole field of `pitches` leaves standing, sampled across `span` device pixels: every
 * grating multiplied, which is what `destination-out` does to the ink under it. The painter's
 * arithmetic, in one line, so the cases below can read the picture without a canvas.
 */
const fieldAcross = (pitches: readonly number[], span: number, depth: number): number[] =>
  Array.from({ length: span }, (_, x) =>
    pitches.reduce((kept, pitch) => kept * gratingKeep(x, pitch, depth), 1),
  );

/**
 * How many fringes a field holds, with the gratings that make them averaged out: one box filter
 * per grating, each exactly its own pitch wide, because a whole cycle of a cosine averages to
 * nothing. What survives every one of them is the beat between them, which is the fringe. Read
 * round, since the field repeats over the span the pitches come back into step across.
 */
function fringes(field: readonly number[], pitches: readonly number[]): number {
  const at = (index: number): number =>
    field[((index % field.length) + field.length) % field.length] ?? 0;
  let smooth = field.map((_, index) => at(index));
  for (const pitch of pitches) {
    const span = Math.round(pitch);
    const from = smooth;
    const read = (index: number): number =>
      from[((index % from.length) + from.length) % from.length] ?? 0;
    smooth = from.map((_, index) => {
      let sum = 0;
      for (let step = 0; step < span; step++) sum += read(index + step - (span >> 1));
      return sum / span;
    });
  }
  // Counted as upward crossings of the field's own mean rather than as maxima. A crest that lands
  // between two samples is a two-sample plateau, and comparing a plateau with its neighbours drops
  // one fringe in three; a crossing has no such tie. A field flatter than the arithmetic's own
  // noise has no fringes at all, which is what one grating on its own has to report.
  const high = Math.max(...smooth);
  const low = Math.min(...smooth);
  if (high - low < 1e-9) return 0;
  const mean = (high + low) / 2;
  const above = (index: number): boolean =>
    (smooth[((index % smooth.length) + smooth.length) % smooth.length] ?? 0) > mean;
  return smooth.filter((_, index) => above(index) && !above(index - 1)).length;
}

/** Every copy past the first, added up across a set: what `DRIFT_SCALES_BUDGET` is a budget on. */
const extra = (rows: readonly MoireRow[]): number =>
  rows.reduce((sum, { octaves }) => sum + octaves - 1, 0);

/** A set of rows that differ in nothing but how many scales each of them is asking to be drawn at. */
const scaleSet = (wants: readonly number[]): MoireRow[] => wants.map((octaves) => row({ octaves }));

// One flat list of the cases about what a row is (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moire", () => {
  it("samples a lane's own gesture onto 0..1, and flattens one that never moved", () => {
    // The bend is what makes two lanes of the same period different rows: the period sets the
    // pitch and the gesture decides where the fringes crowd.
    const bend = laneBend([
      { at: 0, value: 0.25 },
      { at: 2, value: 0.75 },
    ]);
    expect(bend).toHaveLength(BEND_SAMPLES);
    expect(Math.min(...bend)).toBe(0);
    expect(Math.max(...bend)).toBe(1);
    // Rising through the cycle, because that is the gesture that was recorded.
    expect(bend.every((value, index) => index === 0 || value >= (bend[index - 1] ?? 0))).toBe(true);
    // A lane that holds one value bends nothing, and neither does one with no span at all.
    expect(
      laneBend([
        { at: 0, value: 0.5 },
        { at: 2, value: 0.5 },
      ]),
    ).toBe(FLAT_BEND);
    expect(laneBend([{ at: 0, value: 0.5 }])).toBe(FLAT_BEND);
  });

  it("draws a window a few of the loop's own periods wide", () => {
    // The loop is what a listener counts in, so it is the window's base — not whichever row
    // happens to be slowest, which would zoom a fast loop out until it was a band.
    expect(moireWindowSecs(2, [0.5, 1, 2], MOIRE_CYCLES)).toBe(2 * MOIRE_CYCLES);
    expect(moireWindowSecs(0, [], MOIRE_CYCLES)).toBe(0);
    expect(moireWindowSecs(0, [0, -3], MOIRE_CYCLES)).toBe(0);
    // A deck with no loop has no reference and falls back to its slowest row.
    expect(moireWindowSecs(0, [1, 3], MOIRE_CYCLES)).toBe(3 * MOIRE_CYCLES);
  });

  it("draws an instance's own period from a grid coarse enough for two of them to beat", () => {
    // Every instance in the rack is a row whether or not a lane bends it, and its period is folded
    // out of its own id (0076, 0098). What matters about the grid it lands on is that two rows off
    // it are either the same period or a real ratio apart: a pair a fraction of a percent apart
    // beats once every few thousand seconds, which is no fringe in any window the strip draws.
    const drawn = Array.from({ length: 400 }, (_, index) => effectRowPeriod(fold(`fx${index}`)));
    const [shortest, longest] = EFFECT_ROW_PERIOD_SECS;
    for (const period of drawn) {
      expect(period).toBeGreaterThanOrEqual(shortest);
      expect(period).toBeLessThanOrEqual(longest);
    }
    const periods = [...new Set(drawn)];
    expect(periods.length).toBeGreaterThan(1);
    for (const [index, period] of periods.entries()) {
      for (const other of periods.slice(index + 1)) {
        expect(Math.max(period, other) / Math.min(period, other)).toBeGreaterThan(1.05);
      }
    }
    // And it is the same period every time, because the id is durable and the fold is a function
    // of it alone: the same rack draws the same picture after a reload.
    expect(effectRowPeriod(fold("fx1"))).toBe(drawn[1]);
  });

  it("pulls back until the slowest row comes round, however short the loop is", () => {
    // A 30s lane over a 1s loop: four loop periods would show that lane as one flat line, so the
    // window opens far enough for it to repeat instead.
    expect(moireWindowSecs(1, [30, 1], MOIRE_CYCLES)).toBe(30 * MIN_ROW_CYCLES);
    // And it never pulls back further than it has to: a loop that already covers the slowest row
    // keeps its own scale.
    expect(moireWindowSecs(10, [3, 10], MOIRE_CYCLES)).toBe(10 * MOIRE_CYCLES);
    // Many periods and not a few, at either size (P76: at close zoom the pattern reads as
    // static, and four cycles across a strip's height is a blob rather than interference).
    expect(MOIRE_CYCLES).toBeGreaterThan(MIN_ROW_CYCLES);
  });

  it("beats two gratings into fringes far slower than either of them", () => {
    // The claim the whole picture rests on: two gratings a little apart, multiplied, leave a term
    // neither of them has. Ten and eleven pixels come back into step over a hundred and ten, so a
    // span of three hundred and thirty holds exactly three fringes — and each grating on its own
    // holds none, because a single grating has nothing to beat against.
    const depth = gratingDepth(2);
    expect(fringes(fieldAcross([10, 11], 330, depth), [10, 11])).toBe(3);
    expect(fringes(fieldAcross([10], 330, depth), [10])).toBe(0);
    // The fringe is far slower than the gratings that make it — the same field left unsmoothed
    // holds crests by the dozen inside those three fringes. That ratio is the difference between a
    // lattice and a hatch, and it is the whole reason a beat can be seen at all.
    const raw = fringes(fieldAcross([10, 11], 330, depth), []);
    expect(raw).toBeGreaterThan(8 * fringes(fieldAcross([10, 11], 330, depth), [10, 11]));
    // And where the two agree the field is brightest, where they oppose it is darkest.
    const field = fieldAcross([10, 11], 330, depth);
    expect(field[0]).toBeGreaterThan(field[55] ?? 0);
    expect(field[110]).toBeCloseTo(field[0] ?? 0, 6);
  });

  it("holds one brightness however many rows a yard has", () => {
    // Without this the picture's brightness would say how many items a yard holds: five gratings
    // at full depth leave 3% of the ink standing and eight leave 0.4%, measured in a browser. So
    // the depth is solved for the floor, and the floor is what every count comes back to.
    for (const count of [2, 3, 5, 8, 12]) {
      const depth = gratingDepth(count);
      expect((1 - depth / 2) ** count).toBeCloseTo(PICTURE_FLOOR, 9);
      // A field of that many really does average to it, and not merely in the mean of one cosine.
      const pitches = Array.from({ length: count }, (_, at) => 9 + at);
      const field = fieldAcross(pitches, 5040, depth);
      const mean = field.reduce((sum, keep) => sum + keep, 0) / field.length;
      expect(mean).toBeCloseTo(PICTURE_FLOOR, 1);
    }
    // Never past one: a grating cannot cut deeper than its own trough, so one row is lighter than
    // the floor — which is right, because one grating has no beat in it to see.
    expect(gratingDepth(1)).toBe(1);
    expect(gratingDepth(0)).toBe(1);
    // And the beat does not fade as rows are added, which is the objection that kept it out of the
    // screen (0129) and which lifts once the gratings are the picture rather than a wash over one.
    const swing = (count: number): number => {
      const pitches = Array.from({ length: count }, (_, at) => 9 + at);
      const field = fieldAcross(pitches, 5040, gratingDepth(count));
      const mean = field.reduce((sum, keep) => sum + keep, 0) / field.length;
      return (Math.max(...field) - Math.min(...field)) / mean;
    };
    expect(swing(8)).toBeGreaterThan(swing(2) / 2);
  });

  it("orders the pitches by period and holds them in the band a lattice needs", () => {
    // Order first: a row that comes round often is drawn finer than a slow one, always.
    expect(gratingPitch(2, 20, 400, 2)).toBeLessThan(gratingPitch(6, 20, 400, 2));
    // And the band, which is the whole reason this is not the window's own arithmetic. Sixteenfold
    // in periods comes out twofold in pitches, because two gratings sixteen apart do not beat —
    // they lay a fine comb over a coarse one and leave no fringe anywhere (measured in the app).
    const wide = [0.05, 0.75, 2.4, 12, 900].map((period) => gratingPitch(period, 20, 400, 2));
    expect(Math.max(...wide) / Math.min(...wide)).toBeLessThan(4);
    // Clamped at both ends whatever it is asked for, and never finer than the pixels carry.
    for (const dpr of [1, 2, 3]) {
      for (const period of [1e-6, 1, 1e6]) {
        const pitch = gratingPitch(period, 20, 400, dpr);
        expect(pitch).toBeGreaterThanOrEqual(7 * dpr * 0.5 - 1e-9);
        expect(pitch).toBeLessThanOrEqual(7 * dpr * 2 + 1e-9);
      }
    }
    // A picture with nothing to scale by sits in the middle of the band rather than at zero.
    expect(gratingPitch(3, 0, 400, 2)).toBe(14);
    expect(gratingPitch(3, 20, 0, 2)).toBe(14);
  });

  it("fans a row to its parameter's own angle and leaves the reference on the axis", () => {
    // The reference is the axis the others are read against, which is the whole of what being the
    // reference means now that no row is drawn on top of another.
    expect(gratingTurns(row({ reference: true }))).toBe(0);
    expect(gratingTurns(row({ reference: true, shape: 2 ** 30 }))).toBe(0);
    // The fold spreads the rest across a fan, to both sides, and near enough the axis that they
    // cross rather than lie across each other.
    const turns = [0, 2 ** 28, 2 ** 30, 2 ** 31, 3 * 2 ** 30].map((shape) =>
      gratingTurns(row({ shape })),
    );
    expect(new Set(turns).size).toBe(turns.length);
    expect(Math.min(...turns)).toBeLessThan(0);
    expect(Math.max(...turns)).toBeGreaterThan(0);
    expect(Math.max(...turns.map(Math.abs))).toBeLessThan(0.05);
    // Half the fold is half a turn round the fan, which is what makes two parameters land apart.
    expect(gratingTurns(row({ shape: 2 ** 31 }))).toBeCloseTo(0, 10);
  });

  it("surges and stalls a row by its own gesture, and turns a flat lane evenly", () => {
    // P105: a row's own gesture is spent on where it stands rather than on how fine it is drawn,
    // so the fringe families reorganise in bursts rather than sliding at one rate (0146). A row no
    // lane drives reads the middle of its table everywhere and turns exactly with its playhead.
    const straight = [0, 1, 2, 3].map((phase) => turnsOf(row({ period: 4, phase })));
    expect(straight).toEqual([0, 0.25, 0.5, 0.75]);
    const gesture = [0, 0.25, 0.75, 1];
    const swept = [0, 1, 2, 3].map((phase) => turnsOf(row({ period: 4, phase, bend: gesture })));
    // Every one of them is somewhere else than the even turn it would have been, and the row is
    // ahead of its playhead in one half of the cycle and behind it in the other.
    expect(swept.every((turn, at) => turn !== straight[at])).toBe(true);
    expect(swept[0]).toBeGreaterThan(0.5);
    expect(swept[3]).toBeGreaterThan(straight[3] ?? 0);
    expect(swept[1]).toBeLessThan(straight[1] ?? 0);
    // And it never reverses, on the worst table there is: a lane that falls its whole range
    // between two of the sixteen points the row was sampled at, which is the steepest slope
    // `bendAt` can produce. The bound is derived from that count and not chosen (0146).
    const cliff = Array.from({ length: BEND_SAMPLES }, (_, at) => (at === 1 ? 1 : 0));
    const steps = 256;
    let wraps = 0;
    let last = 0;
    for (let step = 0; step < steps; step++) {
      const turn = turnsOf(row({ period: 1, phase: step / steps, bend: cliff }));
      // A drop of most of a cycle is the wrap; anything smaller is the row going backwards, which
      // is what this asserts cannot happen.
      if (last - (turn + wraps) > 0.5) wraps += 1;
      expect(turn + wraps).toBeGreaterThanOrEqual(last);
      last = turn + wraps;
    }
    expect(wraps).toBe(1);
    // And the bend is continuous and read round its own table, never off the end of it.
    expect(bendAt(FLAT_BEND, 0.7)).toBe(0.5);
    expect(bendAt([0, 1], 0.25)).toBeCloseTo(0.5, 9);
    expect(bendAt([0, 1], 1.25)).toBeCloseTo(bendAt([0, 1], 0.25), 9);
  });

  it("gives a dimension no value reaches what a row has always had", () => {
    // The fold still picks the period, every row is cut at the one depth, its period sets its
    // pitch and it does not breathe. An effect declaring nothing draws the row P93 drew (0139).
    const seed = fold("fx1");
    expect(driftReached(seed, [], LINEAR_GEOMETRY)).toEqual({
      period: effectRowPeriod(seed),
      bend: FLAT_BEND,
      ...DRIFT_REST,
    });
  });

  it("rests a curved row where its own fold puts it, and leaves a claimed anchor alone", () => {
    // A rack of curved rows all resting at the middle of the picture is one rosette where nobody
    // turned a knob. The rest is a third independent read of the same fold the row's shape and its
    // period already are (0076, 0229), so two instances stand two axes in two places.
    const radial: DriftGeometry = "radial";
    const one = fold("fx1");
    const two = fold("fx2");
    expect(driftReached(one, [], radial).centre).toBe(effectRowCentre(one));
    expect(driftReached(one, [], radial).centre).not.toBe(driftReached(two, [], radial).centre);
    // And it is a spread rather than two of the same: a rack of six stands on several anchors, in
    // ones and twos, which is what makes a crossing happen where two rows cross.
    const rack = ["fx1", "fx2", "fx3", "fx4", "fx5", "fx6"];
    expect(new Set(rack.map((id) => effectRowCentre(fold(id))))).not.toHaveLength(1);
    // And no rest the fold can produce sits against the end of the picture: a row resting on the
    // clamp would stand still for half of every period, which is the standing anchor this exists
    // to remove kept for a share of the rack.
    for (let index = 0; index < 700; index++) {
      const rest = effectRowCentre(fold(`fx${index}`));
      expect(rest).toBeGreaterThanOrEqual(DRIFT_CENTRE_SWING);
      expect(rest).toBeLessThanOrEqual(DRIFT_CENTRE_REACH - DRIFT_CENTRE_SWING);
    }
    // A straight row is anchored where it always was: its anchor is only where its own comb is
    // measured from, and moves nothing its phase does not already move.
    expect(driftReached(one, [], LINEAR_GEOMETRY).centre).toBe(DRIFT_REST.centre);
    expect(restingCentre(one, LINEAR_GEOMETRY, [])).toBeNull();
    // And a row whose effect claims the dimension stands where its knob puts it — this is the rest
    // value and not an override (0139).
    const claim = [{ into: "centre" as const, turn: 1 }];
    expect(driftReached(one, claim, radial).centre).toBe(DRIFT_CENTRE_REACH);
    expect(restingCentre(one, radial, claim)).toBeNull();
  });

  it("carries a drifting anchor no further than the ladder its tile is keyed on allows", () => {
    // The whole affordability of a moving anchor: a curved row's tile is a picture-sized bake keyed
    // by the *stepped* anchor (0142), so the travel is stated in steps of that same ladder. A swing
    // and a punch at full stretch reach a step and a half either way, which is four stops of the
    // ladder across a whole cycle and not a bake a frame (0229).
    const rest = 0.5;
    const swung = [0, 0.25, 0.5, 0.75].map((turns) => driftedCentre(rest, turns, 0));
    expect(swung).toEqual([rest + DRIFT_CENTRE_SWING, rest, rest - DRIFT_CENTRE_SWING, rest]);
    // A transient takes the same travel harder rather than crossing it with a second motion.
    expect(driftedCentre(rest, 0, 1)).toBe(rest + DRIFT_CENTRE_SWING + DRIFT_CENTRE_PUNCH);
    expect(driftedCentre(rest, 0.25, 1)).toBe(rest);
    expect(DRIFT_CENTRE_SWING + DRIFT_CENTRE_PUNCH).toBeLessThanOrEqual(1.5 / DRIFT_STEPS);
    // And it never leaves the picture, wherever the fold rested it and however hard the punch.
    expect(driftedCentre(0, 0.5, 1)).toBe(0);
    expect(driftedCentre(DRIFT_CENTRE_REACH, 0, 1)).toBe(DRIFT_CENTRE_REACH);
  });

  it("takes the picture's colour from near-monochrome to strongly chromatic and back", () => {
    // Colour is something an effect turns (0141): the three dimensions that are colour rather
    // than shape each read their whole reach off one knob's travel, and rest where they rested
    // when the picture was one ink with a fixed fringe over it.
    const seed = fold("fx1");
    const at = (into: "fringe" | "disperse" | "hue", turn: number) =>
      driftReached(seed, [{ into, turn }], LINEAR_GEOMETRY);
    // Nothing at one end — three channel lattices on top of each other, which is one flat hue —
    // and twice the resting lag at the other, which is a third of a beat cell each.
    expect(at("fringe", 0).fringe).toBe(0);
    expect(at("fringe", 1).fringe).toBe(DRIFT_FRINGE_REACH);
    expect(at("fringe", 0.5).fringe).toBe(DRIFT_REST.fringe);
    // The same lattice for all three at one end, three of their own at the other.
    expect(at("disperse", 0).disperse).toBe(DRIFT_REST.disperse);
    expect(at("disperse", 1).disperse).toBe(DRIFT_DISPERSE_REACH);
    // And the travel between the two inks, whose middle is the ink the caller resolved.
    expect(at("hue", 0).hue).toBe(0);
    expect(at("hue", 1).hue).toBe(1);
    expect(at("hue", 0.5).hue).toBe(DRIFT_REST.hue);
    // A row an effect says nothing to about colour is the picture at rest, whatever else it says.
    const shape = driftReached(seed, [{ into: "pitch", turn: 1 }], LINEAR_GEOMETRY);
    expect(shape.fringe).toBe(DRIFT_REST.fringe);
    expect(shape.disperse).toBe(DRIFT_REST.disperse);
    expect(shape.hue).toBe(DRIFT_REST.hue);
  });

  it("reaches every dimension from a value, and each of them alone", () => {
    // What an effect is set to is the row, so each dimension moves with its own turn and with no
    // other — and none of them with the fold, which is the identity underneath (0139).
    const seed = fold("fx1");
    for (const into of DRIFT_DIMENSIONS) {
      const low = driftReached(seed, [{ into, turn: 0 }], LINEAR_GEOMETRY);
      const high = driftReached(seed, [{ into, turn: 1 }], LINEAR_GEOMETRY);
      expect(low).not.toEqual(high);
      for (const other of DRIFT_DIMENSIONS) {
        if (other === into) continue;
        expect(low[other]).toEqual(high[other]);
      }
    }
    // Two instances set alike reach alike whatever their ids are; two set differently do not.
    const reach = [{ into: "period" as const, turn: 0.4 }];
    expect(driftReached(fold("fx1"), reach, LINEAR_GEOMETRY)).toEqual(
      driftReached(fold("fx2"), reach, LINEAR_GEOMETRY),
    );
    expect(driftReached(seed, reach, LINEAR_GEOMETRY)).not.toEqual(
      driftReached(seed, [{ into: "period", turn: 0.6 }], LINEAR_GEOMETRY),
    );
  });

  it("keeps every dimension a value reaches inside the band the picture is drawn in", () => {
    const [shortest, longest] = EFFECT_ROW_PERIOD_SECS;
    for (const turn of [0, 0.1, 0.5, 0.9, 1]) {
      const reached = driftReached(
        0,
        DRIFT_DIMENSIONS.map((into) => ({ into, turn })),
        LINEAR_GEOMETRY,
      );
      expect(reached.period).toBeGreaterThanOrEqual(shortest);
      expect(reached.period).toBeLessThanOrEqual(longest);
      // Never to nothing: an effect turned all the way down is still in the signal path, and a row
      // that vanished at one end of a knob would be the bypass switch saying it.
      expect(reached.depth).toBeGreaterThanOrEqual(DRIFT_DEPTH_FLOOR);
      expect(reached.depth).toBeLessThanOrEqual(1);
      expect(reached.pitch).toBeGreaterThanOrEqual(1 / DRIFT_PITCH_REACH - 1e-12);
      expect(reached.pitch).toBeLessThanOrEqual(DRIFT_PITCH_REACH);
    }
    // And the pitch a value asks for moves the row inside the band, never out of it: the one
    // owner of the floor that keeps a grating off the pixel grid is still `gratingPitch` (0098).
    for (const ratio of [1 / DRIFT_PITCH_REACH, 1, DRIFT_PITCH_REACH]) {
      for (const period of [0.05, 1, 900]) {
        const pitch = gratingPitch(period, 20, 720, 2, ratio);
        expect(pitch).toBeGreaterThanOrEqual(7);
        expect(pitch).toBeLessThanOrEqual(28);
      }
    }
  });

  it("fills a declared bend with a swing the row breathes across its own cycle", () => {
    // The same table `laneBend` samples a gesture into, filled from one value instead — so a row
    // an effect bends crowds and opens its fringes as it turns, where a declared pitch holds them.
    expect(bendSwing(0)).toBe(FLAT_BEND);
    const swung = bendSwing(1);
    expect(swung).toHaveLength(BEND_SAMPLES);
    expect(Math.min(...swung)).toBeCloseTo(0, 9);
    expect(Math.max(...swung)).toBeCloseTo(1, 9);
    // Half the amount is half the swing, around the middle a flat table sits at.
    const half = bendSwing(0.5);
    expect(Math.max(...half) - Math.min(...half)).toBeCloseTo(0.5, 9);
    expect(half.reduce((sum, value) => sum + value, 0) / half.length).toBeCloseTo(0.5, 9);
  });

  // P99: a row's pitch says how fast something is running and its angle says which parameter it
  // is. The profile is the only dimension left for what *kind* of thing is doing it, and it can
  // only be that if it costs the picture none of its brightness.
  it("takes exactly half the ink whichever profile a row is cut to", () => {
    const samples = 4096;
    for (const profile of DRIFT_PROFILES) {
      const taken = Array.from({ length: samples }, (_, at) => profileBlock(profile, at / samples));
      // Half over the cycle, or `gratingDepth` would be solving for a depth on a mean that is not
      // there and the picture's brightness would say which effects a yard holds.
      expect(taken.reduce((sum, value) => sum + value, 0) / samples).toBeCloseTo(0.5, 6);
      // And a grating cannot take more than all of the ink or less than none of it.
      expect(Math.min(...taken)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...taken)).toBeLessThanOrEqual(1);
    }
  });

  // P104: a moiré inside a moiré. A profile is any zero-mean wave at mean a half, so one built out
  // of octaves of itself beats against every other row at each of them — and the tile and the
  // pattern path it goes through are the ones every other profile already uses (0143).
  it("carries one profile at three scales at once, and still takes half the ink", () => {
    const samples = 4096;
    // How much of the wave stands at each harmonic: the size of its own bin, which is what a second
    // grating actually beats against.
    const bin = (harmonic: number): number => {
      let real = 0;
      let imaginary = 0;
      for (let at = 0; at < samples; at++) {
        const turn = at / samples;
        real += profileBlock("lobe", turn) * cosTurn(turn, harmonic);
        imaginary += profileBlock("lobe", turn) * Math.sin(TAU * harmonic * turn);
      }
      return (2 * Math.hypot(real, imaginary)) / samples;
    };
    // The octaves themselves: each half the one below it, which is what makes the wave the same
    // shape at three scales rather than a fundamental with two decorations.
    expect(bin(2)).toBeCloseTo(bin(1) / 2, 6);
    expect(bin(4)).toBeCloseTo(bin(1) / 4, 6);
    expect(bin(1)).toBeGreaterThan(0.1);
    // And it stops where the picture stops carrying it: `gratingPitch` draws a row at a few device
    // pixels a cycle, so a harmonic past the eighth is a spacing the pixels alias rather than beat.
    for (const harmonic of [8, 9, 16, 32]) expect(bin(harmonic)).toBeCloseTo(0, 9);
    // That it is still a row — half the ink over the cycle, and never more of it than there is —
    // is the case below, which holds it over every profile there is and this one among them.
  });

  // P104: the frame before this one is laid back into this one's field, which is the one thing in
  // the picture that compounds — every frame carries what the last one carried (0143).

  it("shares the fills a whole set of rows asks for out to one budget, evenly", () => {
    // A set inside the budget is left exactly as it asked. Six rows at every scale the reach
    // allows is the deepest rack the picture already carried, and it is not touched.
    const deep = scaleSet(Array.from({ length: 6 }, () => DRIFT_OCTAVES_REACH));
    shareOctaves(deep);
    expect(deep.map(({ octaves }) => octaves)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(extra(deep)).toBe(DRIFT_SCALES_BUDGET);
    // Past it the counts fall back toward one *evenly*: every row is held to one ceiling rather
    // than the deepest being cut to nothing, and what the ceiling leaves over is handed out a copy
    // at a time so the budget is spent rather than rounded away.
    const ten = scaleSet(Array.from({ length: 10 }, () => DRIFT_OCTAVES_REACH));
    shareOctaves(ten);
    expect(ten.map(({ octaves }) => octaves)).toEqual([3, 3, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(extra(ten)).toBe(DRIFT_SCALES_BUDGET);
    // Four automators holding six apiece: twenty-four rows asking for three is four times what one
    // of them asks, and the picture draws fewer scales rather than turning into a slideshow.
    const four = scaleSet(Array.from({ length: 24 }, () => DRIFT_OCTAVES_REACH));
    shareOctaves(four);
    expect(extra(four)).toBe(DRIFT_SCALES_BUDGET);
    expect(Math.max(...four.map(({ octaves }) => octaves))).toBe(2);
    expect(Math.min(...four.map(({ octaves }) => octaves))).toBe(1);
    // And across every set an oversized rack can actually be, whatever depths it mixes: never past
    // the budget, never deeper than a row asked, never fewer than the one copy that is the row
    // itself, and never two rows that asked alike left more than a copy apart.
    for (let count = 1; count <= 40; count++) {
      for (const shape of [0, 1, 2]) {
        const wants = Array.from({ length: count }, (_, at) =>
          shape === 0 ? DRIFT_OCTAVES_REACH : shape === 1 ? 1 + (at % DRIFT_OCTAVES_REACH) : 1,
        );
        const rows = scaleSet(wants);
        shareOctaves(rows);
        const held = rows.map(({ octaves }) => octaves);
        expect(extra(rows)).toBeLessThanOrEqual(DRIFT_SCALES_BUDGET);
        expect(held.every((octaves, at) => octaves >= 1 && octaves <= (wants[at] ?? 1))).toBe(true);
        for (const want of wants) {
          const alike = held.filter((_, at) => wants[at] === want);
          expect(Math.max(...alike) - Math.min(...alike)).toBeLessThanOrEqual(1);
        }
        // A budget the set fits inside spends nothing: what a row asked for is what it draws.
        if (extra(scaleSet(wants)) <= DRIFT_SCALES_BUDGET) {
          expect(held).toEqual(wants);
        }
      }
    }
  });

  it("settles a field fed back into itself, however many frames it runs for", () => {
    // The whole of a knob's travel, which is the most any row can ask for.
    const alpha = feedbackAlpha(1);
    expect(alpha).toBe(DRIFT_FEEDBACK_CEILING);
    expect(alpha).toBeLessThan(1);
    // A share is never more than the ceiling, whatever it is handed — a value past the end of the
    // travel, or one that is not on it at all.
    for (const amount of [-1, 0, 0.5, 1, 4]) {
      expect(feedbackAlpha(amount)).toBeLessThanOrEqual(DRIFT_FEEDBACK_CEILING);
      expect(feedbackAlpha(amount)).toBeGreaterThanOrEqual(0);
    }
    // What a thousand frames actually come to: this frame keeps what its own gratings let through,
    // and takes `alpha` of what the last frame came to into the rest of it. A field that reached
    // one is a picture with nothing left in it — the whiteout the ceiling exists to refuse.
    for (const keep of [0.05, 0.3, 0.62]) {
      let field = keep;
      for (let frame = 0; frame < 1000; frame++) field = keep + alpha * field * (1 - keep);
      expect(field).toBeCloseTo(feedbackSettles(keep, alpha), 9);
      expect(field).toBeLessThanOrEqual(keep / (1 - alpha));
      expect(field).toBeLessThan(1);
    }
    // And it is the ceiling being under one that bounds it: at a share of the whole field the fixed
    // point is the field gone entirely, which is the same picture at every depth.
    expect(feedbackSettles(0.3, 1)).toBeCloseTo(1, 12);
  });

  it("cuts a different wave for every profile, and the plain one is the cosine", () => {
    // The plain profile is what `gratingKeep` blocks at full depth: one wave in this app, not a
    // painter's private copy of it (principle 1).
    for (const turn of [0, 0.1, 0.37, 0.5, 0.9]) {
      expect(profileBlock(PLAIN_PROFILE, turn)).toBeCloseTo(1 - gratingKeep(turn, 1, 1), 12);
    }
    // No two profiles are the same wave read twice: an effect that shared one would draw as the
    // effect that already had it.
    const drawn = DRIFT_PROFILES.map((profile) =>
      Array.from({ length: 64 }, (_, at) => profileBlock(profile, at / 64).toFixed(6)).join(","),
    );
    expect(new Set(drawn).size).toBe(DRIFT_PROFILES.length);
    // And not the same wave at another size either, which the strings above cannot see: how deep a
    // row is cut is `depth`, a dimension of the row, so two profiles that differ only by a factor
    // beat into one family of fringes at whatever depth ratio makes them equal (0122). Every pair
    // is checked for a constant ratio between their deviations from a half.
    const deviations = DRIFT_PROFILES.map((profile) =>
      Array.from({ length: 256 }, (_, at) => profileBlock(profile, at / 256) - 0.5),
    );
    for (let one = 0; one < deviations.length; one++) {
      for (let two = one + 1; two < deviations.length; two++) {
        const ratios = (deviations[one] ?? []).flatMap((value, at) => {
          const against = deviations[two]?.[at] ?? 0;
          return Math.abs(against) > 1e-3 ? [value / against] : [];
        });
        const first = ratios[0] ?? 0;
        const scaled = ratios.every((ratio) => Math.abs(ratio - first) < 1e-9);
        expect(
          scaled,
          `${DRIFT_PROFILES[one]} is ${DRIFT_PROFILES[two]} at ${first} times the depth`,
        ).toBe(false);
      }
    }
  });
});
