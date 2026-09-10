/**
 * The still fields, pinned the way the five beside them are (sketchDrift.test.ts): every one
 * answers inside nought and one at every end of its dial, and every one swings. And two claims the
 * five never made, because a still is a ramp position and not an amount of one ink — the picture
 * has to reach both ends of its own five stops, or the colour the still exists for is not on it;
 * and the dial has to move it, or the motion is a sentence under a static picture.
 */
import { describe, expect, it } from "vitest";

import { type SketchDial, type SketchDriftField } from "@/ui/sketch/sketchDrift";
import { FIELD_ASPECT } from "@/ui/sketch/sketchField";
import { printed, STILL_DIALS, STILL_NAMES, STILL_STOPS } from "@/ui/sketch/sketchStill";
import { glintField, seedheadsField, skylightField } from "@/ui/sketch/sketchStillField";

/** Every still with the dial it is drawn under, so a fourth cannot be left out. */
const STILLS: readonly { name: string; field: SketchDriftField; dial: SketchDial }[] = [
  { name: "glint", field: glintField, dial: STILL_DIALS.glint },
  { name: "seedheads", field: seedheadsField, dial: STILL_DIALS.seedheads },
  { name: "skylight", field: skylightField, dial: STILL_DIALS.skylight },
];

/** The picture sampled coarsely across the whole box, and how much of it lands past a stop. */
function readOf(
  field: SketchDriftField,
  amount: number,
): { least: number; most: number; hot: number; cool: number } {
  let least = Infinity;
  let most = -Infinity;
  let hot = 0;
  let cool = 0;
  let count = 0;
  for (let y = 0.005; y < 1; y += 0.01) {
    for (let x = 0.005; x < FIELD_ASPECT; x += 0.01) {
      const at = field(x, y, amount);
      expect(Number.isFinite(at), `${at} at ${x},${y}`).toBe(true);
      least = Math.min(least, at);
      most = Math.max(most, at);
      if (at > 0.6) hot += 1;
      if (at < 0.3) cool += 1;
      count += 1;
    }
  }
  return { least, most, hot: hot / count, cool: cool / count };
}

/**
 * What share of the box is read differently at two settings of the dial. Every sample of the walk
 * and not a stride through it: the walk is three hundred columns wide, so any stride that divides
 * three hundred reads a handful of columns at every row — and two of these four carry their gust
 * across x, which would be a handful of phases standing in for the whole picture.
 */
function movedShare(field: SketchDriftField, from: number, to: number): number {
  let moved = 0;
  let count = 0;
  for (let y = 0.005; y < 1; y += 0.01) {
    for (let x = 0.005; x < FIELD_ASPECT; x += 0.01) {
      if (Math.abs(field(x, y, from) - field(x, y, to)) > 0.02) moved += 1;
      count += 1;
    }
  }
  return moved / count;
}

describe("every still on the drift bench", () => {
  it("rests inside its own dial's band, on one of its own steps", () => {
    for (const { name, dial } of STILLS) {
      expect(dial.rest, name).toBeGreaterThanOrEqual(dial.min);
      expect(dial.rest, name).toBeLessThanOrEqual(dial.max);
      const steps = (dial.rest - dial.min) / dial.step;
      expect(Math.abs(steps - Math.round(steps)), name).toBeLessThan(1e-9);
    }
  });

  /**
   * Every field ends in `printed`, which clamps, so the bounds below cannot fail and are here as
   * the statement of what a field is. What this case actually catches is the `Number.isFinite`
   * inside `readOf`: a division by a period that reached nought, a `Math.log` of nought, or a hash
   * fed an infinity all arrive as `NaN`, which `clamp` passes straight through and which paints as
   * a transparent pixel rather than as an error (principle 5).
   */
  it("answers a finite number inside nought and one, at rest and at both ends of its dial", () => {
    for (const { name, field, dial } of STILLS) {
      for (const amount of [dial.min, dial.rest, dial.max]) {
        const { least, most } = readOf(field, amount);
        expect(least, `${name} at ${amount}`).toBeGreaterThanOrEqual(0);
        expect(most, `${name} at ${amount}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("what a still's own five stops are for", () => {
  /**
   * The whole point of a still: the ramp is read per pixel, so one picture holds both ends of its
   * own five stops at once. A field that never reached past the middle would be a ground at a
   * different dial, drawn in a nicer palette and saying nothing.
   */
  it("reaches both ends of its own five stops inside one picture", () => {
    for (const { name, field, dial } of STILLS) {
      const { least, most, hot, cool } = readOf(field, dial.rest);
      expect(least, `${name} never reaches its low stop`).toBeLessThan(0.15);
      // Past 0.8 is past the fourth of five stops — the sampling is a grid and the print's own
      // vignette dims whatever the grid happens to land on, so the claim is "reaches the fourth
      // stop", which is the one that says the picture is not all ground.
      expect(most, `${name} never reaches its high stop`).toBeGreaterThan(0.8);
      // **Both ends are used, and neither is capped.** This was a ceiling on the hot share — under a
      // half, "which is a wash" — and that was a claim about the wrong picture: the grass still is a
      // warm mass wall to wall, so its hot share is meant to be most of the box, and the ceiling was
      // what three scarlet drawings of it were tuned against. What the four actually owe is that
      // each end of the ramp is somewhere in the picture and not in a handful of pixels of it.
      expect(cool, `${name} has no shade at all`).toBeGreaterThan(0.01);
      // A five-hundredth, which is the canopy: its hot end is a couple of dozen specks of sky in a
      // wall of leaf, and a bar set where the other three sit would be a bar against that picture.
      expect(hot, `${name} has no marks at the hot end`).toBeGreaterThan(0.002);
    }
  });

  /**
   * And the dial moves the picture, since the motion is the only thing a phase can carry (0126).
   * Half a turn and not a whole one: every dial here is a phase over nought to one, so its two ends
   * are the same picture by construction and a case comparing them would pass on nothing.
   */
  it("is a different picture half a turn of its dial away", () => {
    for (const { name, field, dial } of STILLS) {
      const share = movedShare(field, dial.min, dial.min + (dial.max - dial.min) / 2);
      // A twenty-fifth of the box. The three measure 46%, 11% and 6% — the canopy moves least,
      // because what its gust moves is which specks of sky are open, and a speck is rare by design.
      // The poppies moved most of the four and are a scene now (0332).
      expect(share, `${name} moves ${Math.round(share * 100)}% of the box`).toBeGreaterThan(0.04);
    }
  });
});

describe("a still's own stops", () => {
  it("are five apiece, one list per name, and no two lists alike", () => {
    // The fixture above is written by hand, so it is the one place a fourth still could be left out
    // of every case in this file while passing every case in it.
    expect(STILLS.map((still) => still.name)).toEqual([...STILL_NAMES]);
    const seen = new Set<string>();
    for (const name of STILL_NAMES) {
      const stops = STILL_STOPS[name];
      expect(stops, name).toHaveLength(5);
      for (const stop of stops) {
        // A chip is a token, never a colour — the one boundary a picture may not cross
        // (docs/boundaries.md, 0236).
        expect(stop.chip, `${name}/${stop.name}`).toMatch(/^bg-\(--[a-z-]+\)$/u);
      }
      const list = stops.map((stop) => stop.name).join();
      expect(seen.has(list), `${name} shares its stops with another still`).toBe(false);
      seen.add(list);
    }
    expect(seen.size).toBe(STILL_NAMES.length);
  });
});

describe("the print", () => {
  it("darkens the corners more than the middle", () => {
    // A flat field printed: the middle keeps nearly all of its read and a corner keeps less.
    const middle = printed(FIELD_ASPECT / 2, 0.5, 0.8);
    const corner = printed(0.01, 0.01, 0.8);
    expect(corner).toBeLessThan(middle);
    expect(middle).toBeGreaterThan(0.7);
  });
});
