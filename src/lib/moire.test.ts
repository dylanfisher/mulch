/** @role Tests the recurrence estimate at both ends, and the loop period the rate divides. */
import { describe, expect, it } from "vitest";

import { DURATION_SCALE } from "./copy";
import { fold } from "./copy";
import {
  BEND_SAMPLES,
  bendAt,
  BEYOND_MEASURE,
  describeRecurrence,
  DRIFT_PROFILES,
  EFFECT_ROW_PERIOD_SECS,
  effectRowPeriod,
  FLAT_BEND,
  gratingBend,
  gratingDepth,
  gratingKeep,
  gratingPitch,
  gratingTurns,
  laneBend,
  loopPeriodSecs,
  MAX_RECURRENCE_TICKS,
  MIN_ROW_CYCLES,
  moireWindowSecs,
  MOIRE_CYCLES,
  PICTURE_FLOOR,
  PLAIN_PROFILE,
  profileBlock,
  recurrenceLabel,
  recurrenceLength,
  type MoireRow,
} from "./moire";

/** The estimate as it is actually read: the one line the strip puts beside the picture. */
const said = (periods: readonly number[]) =>
  recurrenceLabel(describeRecurrence(recurrenceLength(periods)));

/** One length said the way the strip says it. */
const label = (secs: number) => recurrenceLabel(describeRecurrence({ secs }));

/** The exact seconds, or the failure of the case that asked for them. */
const exactly = (periods: readonly number[]): number => {
  const length = recurrenceLength(periods);
  if (!("secs" in length)) throw new Error(`expected an exact length, got 10**${length.log10Secs}`);
  return length.secs;
};

/** A row of the picture, with only what a case actually varies spelled out. */
const row = (over: Partial<MoireRow> = {}): MoireRow => ({
  period: 1,
  phase: 0,
  reference: false,
  shape: 0,
  bend: FLAT_BEND,
  profile: PLAIN_PROFILE,
  ...over,
});

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

// One flat list of the estimate's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moire", () => {
  it("divides a loop by the rate it is read at, and refuses a rate of none", () => {
    // Rate scales buffer time and not lane time, so half speed is twice as long a loop (0035).
    expect(loopPeriodSecs({ in: 1, out: 3 }, 0.5)).toBe(4);
    expect(loopPeriodSecs({ in: 1, out: 3 }, 2)).toBe(1);
    expect(loopPeriodSecs(null, 1)).toBe(0);
    expect(loopPeriodSecs({ in: 1, out: 3 }, 0)).toBe(0);
    // A loop of no length is no period, not a period of zero that the estimate then divides by.
    expect(loopPeriodSecs({ in: 2, out: 2 }, 1)).toBe(0);
  });

  it("returns nothing going round for no periods at all", () => {
    expect(exactly([])).toBe(0);
    expect(exactly([0, -1, Number.NaN, Number.POSITIVE_INFINITY])).toBe(0);
  });

  it("returns the one period a single row runs on", () => {
    expect(exactly([4])).toBeCloseTo(4, 6);
    expect(exactly([0.1])).toBeCloseTo(0.1, 6);
    expect(exactly([600])).toBeCloseTo(600, 6);
  });

  it("returns the longer of two periods that are exact multiples", () => {
    expect(exactly([2, 4])).toBeCloseTo(4, 6);
    expect(exactly([1, 2, 8])).toBeCloseTo(8, 6);
    // Identical periods line up on themselves, however many of them there are.
    expect(exactly([3, 3, 3])).toBeCloseTo(3, 6);
  });

  it("multiplies periods that share nothing", () => {
    // Quantized onto a grid of 3/16, so 3 and 5 stay 16 and 27 ticks: coprime, and their product
    // of 432 ticks is 81 seconds — the least common multiple of 3 and 5 twenty-seven times over
    // is not the honest answer, and the estimate never claimed to be one.
    expect(exactly([3, 5])).toBeGreaterThan(5);
  });

  it("keeps counting past the last unit, as an exponent rather than a flat answer", () => {
    // Twenty lanes whose tick counts share almost nothing: the multiple runs off the end of the
    // scale, and past the last unit the estimate keeps counting in multiples of it.
    const many = Array.from({ length: 20 }, (_, index) => 0.5 + index * 0.61);
    expect(said(many)).toMatch(/^10\^\d+ × the age of the universe$/u);
    expect(BEYOND_MEASURE[0]).toBe("the age of the universe");
    // The old flat answer is gone: the last unit is never the whole reading any more.
    expect(said(many)).not.toBe(BEYOND_MEASURE[0]);
  });

  it("no longer reaches the end of the scale for a deck it can still count", () => {
    // Eleven lanes on a full rack of ridden knobs: their multiple leaves the exact integers, and
    // that used to be the whole answer — the search stopped and the last unit swallowed it. It is
    // an ordinary duration, and the logarithms are what can still say so.
    const eleven = [0.5, 1.1, 1.7, 2.3, 2.9, 3.7, 4.3, 5.9, 6.7, 7.1, 8.3];
    expect("secs" in recurrenceLength(eleven)).toBe(false);
    expect(said(eleven)).toBe("2.2 geological epochs");
    expect(said(eleven.slice(0, 10))).toBe("566 millennia");
  });

  it("crosses from exact integers into logarithms at the cap, and agrees either side of it", () => {
    // A shortest period of 16 puts the grid at exactly one second, so a period is its own tick
    // count and the crossing can be stood on rather than approached.
    const under = exactly([16, MAX_RECURRENCE_TICKS]);
    expect(under).toBe(MAX_RECURRENCE_TICKS);
    expect(said([16, MAX_RECURRENCE_TICKS])).toBe("29 geological epochs");
    // Half as much again and the product is past the cap, where an integer stops being exact.
    const past = [16, 1.5 * MAX_RECURRENCE_TICKS];
    const over = recurrenceLength(past);
    if ("secs" in over) throw new Error("the cap did not cross");
    // The two sides meet: the log of the last exact answer, plus the factor that broke it.
    expect(over.log10Secs).toBeCloseTo(Math.log10(under) + Math.log10(1.5), 9);
    // And it is still an ordinary duration — leaving the integers is not reaching the end of the
    // scale, and the reading does not jump when the arithmetic does.
    expect(said(past)).toBe("43 geological epochs");
    expect(MAX_RECURRENCE_TICKS).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  it("takes no period as a factorisation it cannot finish, however long that period is", () => {
    // A tick count past the safe integers has no factors to divide out — a trial division of it
    // would never come back — so it joins the multiple as its own magnitude instead.
    const length = recurrenceLength([0.1, 1e307]);
    if ("secs" in length) throw new Error("1e307 seconds stayed exact");
    expect(length.log10Secs).toBeCloseTo(308, 6);
    expect(said([0.1, 1e307])).toMatch(/^10\^\d+ × the age of the universe$/u);
  });

  it("refuses a length that is longer than a number, however exact its tick count", () => {
    // Eight coprime tick counts on a grid this coarse: the multiple is a modest exact integer and
    // the seconds it stands for are past what a double holds. A length that is not a length is no
    // answer (principle 5), so the logs that were kept alongside it are what answers.
    const periods = [16, 17, 19, 23, 29, 31, 37, 41].map((step) => (1e300 * step) / 16);
    const length = recurrenceLength(periods);
    if ("secs" in length) throw new Error("an infinite length was reported as seconds");
    expect(Number.isFinite(length.log10Secs)).toBe(true);
    expect(said(periods)).toMatch(/^10\^\d+ × the age of the universe$/u);
  });

  it("never runs away on a period the exact integers cannot reach", () => {
    // Each period is coprime with the last on the grid the shortest sets, so this is the shape
    // that would loop forever or overflow if the multiple were carried as a product.
    const many = Array.from({ length: 64 }, (_, index) => 1 + index * 0.37);
    const length = recurrenceLength(many);
    if ("secs" in length) throw new Error("64 coprime periods stayed exact");
    expect(Number.isFinite(length.log10Secs)).toBe(true);
    expect(said(many)).toMatch(/^10\^\d+ × the age of the universe$/u);
  });

  it("says one unit and one figure, at both ends of the scale", () => {
    expect(label(4)).toBe("4.0 seconds");
    expect(label(90)).toBe("1.5 minutes");
    expect(label(7200)).toBe("2.0 hours");
    expect(label(86_400 * 40)).toBe("1.3 months");
    expect(label(31_556_952 * 4300)).toBe("4.3 millennia");
    expect(label(31_556_952 * 40_000_000)).toBe("8.0 geological epochs");
    expect(label(9_460_730_472_580_800 * 3)).toBe("3.0 light years");
    // Past the last unit the scale runs out of names and starts counting in the last one instead.
    expect(label(BEYOND_MEASURE[1] * 2.5)).toBe("2.5 × the age of the universe");
    // The two notations never both say ten: a figure that rounds to ten is already the exponent.
    expect(label(BEYOND_MEASURE[1] * 9.9)).toBe("9.9 × the age of the universe");
    expect(label(BEYOND_MEASURE[1] * 9.99)).toBe("10^1 × the age of the universe");
    // And past ten of those the figure is said as its own order of magnitude, deadpan.
    expect(label(BEYOND_MEASURE[1] * 1e30)).toBe("10^30 × the age of the universe");
    expect(recurrenceLabel(describeRecurrence({ log10Secs: 200 }))).toBe(
      "10^182 × the age of the universe",
    );
    // Under the smallest unit it is still said in that unit rather than in a smaller invented one.
    expect(label(0.25)).toBe("0.3 seconds");
    // A big figure loses its decimal: the unit is doing the work, not the precision.
    expect(label(3600 * 11.4)).toBe("11 hours");
  });

  it("names every unit once, ascending", () => {
    const units = DURATION_SCALE.map(([unit]) => unit);
    expect(new Set(units).size).toBe(units.length);
    // Ascending, strictly: a scale that doubled back would make a unit above the fold
    // unreachable, and one that repeated a length would pick between them by position.
    const secs = DURATION_SCALE.map(([, at]) => at);
    expect(secs.every((at, index) => index === 0 || at > (secs[index - 1] ?? 0))).toBe(true);
  });

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

  it("crowds a grating by the lane's value where it stands, and leaves a flat lane straight", () => {
    // A pattern holds one matrix and cannot vary its pitch across the canvas, so a gesture that
    // used to bend a wave along its row now crowds the whole grating at once — which is the
    // reading that moves, and the one a still picture could not have shown.
    expect(gratingBend(row({ bend: FLAT_BEND }))).toBe(1);
    const gesture = [0, 0.25, 0.75, 1];
    const swept = [0, 1, 2, 3].map((phase) =>
      gratingBend(row({ period: 4, phase, bend: gesture })),
    );
    expect(new Set(swept).size).toBe(swept.length);
    expect(Math.min(...swept)).toBeLessThan(1);
    expect(Math.max(...swept)).toBeGreaterThan(1);
    // And the bend is continuous and read round its own table, never off the end of it.
    expect(bendAt(FLAT_BEND, 0.7)).toBe(0.5);
    expect(bendAt([0, 1], 0.25)).toBeCloseTo(0.5, 9);
    expect(bendAt([0, 1], 1.25)).toBeCloseTo(bendAt([0, 1], 0.25), 9);
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
  });
});
