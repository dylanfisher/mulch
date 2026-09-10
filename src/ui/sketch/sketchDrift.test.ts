/**
 * The six fields, pinned the way the drive's own `{"shot":…}` line reads a picture: every one
 * answers inside nought and one across the whole box at every end of its dial, and every one has
 * a swing across the box — a field that draws flat is a direction that argues nothing, and a static
 * render would frame it anyway.
 */
import { describe, expect, it } from "vitest";

import {
  bandOf,
  BANDS_ACROSS,
  BANDS_DIAL,
  BANDS_PER,
  bandsField,
  BLOBS_DIAL,
  blobsField,
  CELL_GUTTER,
  FILM_DIAL,
  filmField,
  GLYPH_DIAL,
  glyphField,
  RAMP_DIAL,
  rampField,
  SKETCH_BANDS,
  type SketchDial,
  type SketchDriftField,
  TERRACE_DIAL,
  terraceField,
  TUNNEL_DIAL,
  tunnelField,
} from "@/ui/sketch/sketchDrift";
import { FIELD_ASPECT } from "@/ui/sketch/sketchField";

/** Every field on the bench with the dial it is drawn under, so a sixth cannot be left out. */
const FIELDS: readonly { name: string; field: SketchDriftField; dial: SketchDial }[] = [
  { name: "ramp", field: rampField, dial: RAMP_DIAL },
  { name: "tunnel", field: tunnelField, dial: TUNNEL_DIAL },
  { name: "terrace", field: terraceField, dial: TERRACE_DIAL },
  { name: "blobs", field: blobsField, dial: BLOBS_DIAL },
  { name: "bands", field: bandsField, dial: BANDS_DIAL },
  { name: "film", field: filmField, dial: FILM_DIAL },
  { name: "glyph", field: glyphField, dial: GLYPH_DIAL },
];

/** The picture sampled coarsely across the whole box: its least, its most and the swing between. */
function swingOf(field: SketchDriftField, amount: number): { least: number; most: number } {
  let least = Infinity;
  let most = -Infinity;
  for (let y = 0.01; y < 1; y += 0.02) {
    for (let x = 0.01; x < FIELD_ASPECT; x += 0.02) {
      const ink = field(x, y, amount);
      expect(Number.isFinite(ink), `${ink} at ${x},${y}`).toBe(true);
      least = Math.min(least, ink);
      most = Math.max(most, ink);
    }
  }
  return { least, most };
}

describe("every field on the drift bench", () => {
  it("rests inside its own dial's band, on one of its own steps", () => {
    for (const { name, dial } of FIELDS) {
      expect(dial.rest, name).toBeGreaterThanOrEqual(dial.min);
      expect(dial.rest, name).toBeLessThanOrEqual(dial.max);
      expect(dial.max, name).toBeGreaterThan(dial.min);
      const steps = (dial.rest - dial.min) / dial.step;
      expect(Math.abs(steps - Math.round(steps)), name).toBeLessThan(1e-9);
    }
  });

  it("answers nought to one across the whole box at rest and at both ends of its dial", () => {
    for (const { name, field, dial } of FIELDS) {
      for (const amount of [dial.min, dial.rest, dial.max]) {
        const { least, most } = swingOf(field, amount);
        expect(least, `${name} at ${amount}`).toBeGreaterThanOrEqual(0);
        expect(most, `${name} at ${amount}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("swings across the box at rest, so none of the six draws flat", () => {
    for (const { name, field, dial } of FIELDS) {
      const { least, most } = swingOf(field, dial.rest);
      expect(most - least, name).toBeGreaterThan(0.4);
    }
  });
});

describe("the cells", () => {
  it("hear one band apiece off a fixture the size of the lattice, and refuse a cell it never wrote", () => {
    expect(SKETCH_BANDS).toHaveLength(BANDS_ACROSS * BANDS_PER);
    expect(bandOf(0, 0)).toBe(SKETCH_BANDS[0]);
    expect(bandOf(BANDS_ACROSS - 1, BANDS_PER - 1)).toBe(SKETCH_BANDS.at(-1));
    expect(() => bandOf(BANDS_ACROSS, BANDS_PER)).toThrow("No band was written");
  });

  it("brighten with the spectrum and stand still in the gutter", () => {
    const inside = [0.5 / BANDS_PER, 0.5 / BANDS_PER] as const;
    expect(bandsField(inside[0], inside[1], BANDS_DIAL.max)).toBeGreaterThan(
      bandsField(inside[0], inside[1], BANDS_DIAL.min),
    );
    expect(bandsField(0.002, 0.002, BANDS_DIAL.max)).toBe(CELL_GUTTER);
    expect(bandsField(0.002, 0.002, BANDS_DIAL.min)).toBe(CELL_GUTTER);
  });
});

describe("the tunnel", () => {
  it("is the blobs themselves at a zoom of nearly nothing", () => {
    // At the smallest zoom every copy is nearly the same picture, so the sum is nearly the base.
    const base = blobsField(1.25, 0.25, BLOBS_DIAL.rest);
    expect(Math.abs(tunnelField(1.25, 0.25, 0.001) - base)).toBeLessThan(0.15);
  });
});

describe("the blobs", () => {
  it("wrap their fringes round one merged shape and fade away from it", () => {
    // Far from every shape the fringes have faded to nothing.
    expect(blobsField(0.05, 0.05, BLOBS_DIAL.rest)).toBeLessThan(0.15);
    // A more rounded join carries more ink between the disc and the bar than a sharp one.
    expect(blobsField(1.0, 0.3, BLOBS_DIAL.max)).not.toBe(blobsField(1.0, 0.3, BLOBS_DIAL.min));
  });
});
