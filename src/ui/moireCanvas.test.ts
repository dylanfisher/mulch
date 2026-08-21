/**
 * @role Tests that a row is a continuous wave rather than a run of ticks, and that a row's
 *   identity — its parameter's waveform and its lane's own bend — and not only its period is what
 *   decides the ink it lays down.
 */
import { describe, expect, it } from "vitest";

import { EFFECTS } from "@/audio/effects/registry";
import { DECK_AUTOMATION_PARAM_IDS, effectAutomationParamIds } from "@/audio/params";
import { fold } from "@/lib/copy";
import { FLAT_BEND } from "@/lib/moire";
import { bendAt, rowInk, rowSamples, ROW_SHAPES, type MoireRow } from "@/ui/moireCanvas";

const row = (over: Partial<MoireRow> = {}): MoireRow => ({
  period: 1,
  phase: 0,
  reference: false,
  shape: 0,
  bend: FLAT_BEND,
  ...over,
});

// One flat list of the painter's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireCanvas", () => {
  it("samples the canvas at least twice, and never more than it has pixels", () => {
    for (const width of [1, 3, 640, 3000]) {
      expect(rowSamples(width)).toBeGreaterThanOrEqual(2);
      expect(rowSamples(width)).toBeLessThanOrEqual(Math.max(2, width));
    }
  });

  it("draws a continuous field rather than ticks laid down one at a time", () => {
    // A tick pattern is ink or no ink. A wave is a field: neighbouring samples move by a little,
    // every value between the trough and the crest is reached, and it stays inside its bounds.
    const wave = row({ period: 4 });
    const window = 4;
    const samples = Array.from({ length: 200 }, (_, index) => rowInk(wave, (index / 200) * window));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    const steps = samples.map((ink, index) => Math.abs(ink - (samples[index - 1] ?? ink)));
    expect(Math.max(...steps)).toBeLessThan(0.1);
    // Neither flat nor two-valued: the middle of the range is where a fringe is made.
    expect(samples.filter((ink) => ink > 0.4 && ink < 0.6).length).toBeGreaterThan(10);
  });

  it("slides the whole field as the phase moves, without changing its pitch", () => {
    const still = row({ period: 4 });
    const moved = row({ period: 4, phase: 1 });
    expect(rowInk(moved, 0)).toBeCloseTo(rowInk(still, 1), 9);
    // A whole cycle on is the same picture again: the phase slides the field and nothing else.
    expect(rowInk(row({ period: 4, phase: 4 }), 0.7)).toBeCloseTo(rowInk(still, 0.7), 9);
  });

  it("draws two lanes of the same period on different parameters as different rows", () => {
    // The period sets the fringe pitch; the parameter picks the shape. Same pitch, different row.
    const first = row({ period: 3, shape: 0 });
    const second = row({ period: 3, shape: 1 });
    const at = Array.from({ length: 40 }, (_, index) => index / 10);
    expect(at.some((t) => Math.abs(rowInk(first, t) - rowInk(second, t)) > 0.05)).toBe(true);
    // Every waveform on the list is reachable, and no two of them draw the same row.
    expect(ROW_SHAPES.length).toBeGreaterThan(1);
    const inks = Array.from({ length: ROW_SHAPES.length }, (_, shape) =>
      at.map((t) => rowInk(row({ period: 3, shape }), t)),
    );
    for (let left = 0; left < inks.length; left++) {
      for (let right = left + 1; right < inks.length; right++) {
        const one = inks[left] ?? [];
        const other = inks[right] ?? [];
        expect(one.some((ink, index) => Math.abs(ink - (other[index] ?? ink)) > 0.05)).toBe(true);
      }
    }
    // And there are more parameters than waveforms, so the fold turns the row as well as picking
    // one: the whole of it is spread across a cycle, and half of it is half a cycle round.
    const half = row({ period: 3, shape: 2 ** 31 });
    expect(rowInk(half, 0)).toBeCloseTo(rowInk(row({ period: 3 }), 1.5), 9);
    expect(at.some((t) => Math.abs(rowInk(row({ period: 3 }), t) - rowInk(half, t)) > 0.05)).toBe(
      true,
    );
  });

  it("bends the wave by the lane's own values, and leaves a flat lane straight", () => {
    // The same period and the same shape, bent by a gesture that rises across its cycle.
    const straight = row({ period: 3 });
    const bent = row({ period: 3, bend: [0, 0.25, 0.75, 1] });
    const at = Array.from({ length: 40 }, (_, index) => index / 10);
    expect(at.some((t) => Math.abs(rowInk(straight, t) - rowInk(bent, t)) > 0.05)).toBe(true);
    // A lane holding one value bends nothing, wherever in its cycle it is read.
    expect(bendAt(FLAT_BEND, 0)).toBe(0.5);
    expect(bendAt(FLAT_BEND, 0.7)).toBe(0.5);
    // And the bend itself is continuous and wraps: a table is read round, not off its end.
    expect(bendAt([0, 1], 0)).toBe(0);
    expect(bendAt([0, 1], 0.25)).toBeCloseTo(0.5, 9);
    expect(bendAt([0, 1], 0.75)).toBeCloseTo(0.5, 9);
    expect(bendAt([0, 1], 1.25)).toBeCloseTo(bendAt([0, 1], 0.25), 9);
  });

  it("gives every automatable parameter a row of its own", () => {
    // The step's claim, against the real registry rather than two made-up numbers: two lanes of
    // the same period on different parameters never draw the same row. There are more parameters
    // than there are waveforms, so this is the fold's turn of the row doing the work.
    const params = [
      ...DECK_AUTOMATION_PARAM_IDS,
      ...EFFECTS.flatMap((effect) => effectAutomationParamIds(effect.id)),
    ];
    expect(params.length).toBeGreaterThan(ROW_SHAPES.length);
    const drawn = params.map((param) => ({
      param,
      // The same period and the same gesture on every one of them: only the parameter differs.
      ink: Array.from({ length: 60 }, (_, index) =>
        rowInk(row({ period: 3, shape: fold(param) }), index / 10),
      ),
    }));
    for (const [index, left] of drawn.entries()) {
      for (const right of drawn.slice(index + 1)) {
        const apart = left.ink.some((ink, at) => Math.abs(ink - (right.ink[at] ?? ink)) > 0.05);
        expect(apart, `${left.param} and ${right.param} draw the same row`).toBe(true);
      }
    }
  });
});
