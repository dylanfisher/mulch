/**
 * @role Tests the shade the thing a yard stands by casts: that every stand shades part of a tile
 *   and never the whole of it, that a far shade is narrower than a close one, that a flight of
 *   steps has as many treads as its term says, and that every shape comes round at both edges of
 *   the tile it is drawn on (0335).
 */
import { describe, expect, it, afterEach } from "vitest";

import { type SceneTerms, SCENE_REACH_TERMS, SCENE_STANDS, type SceneStand } from "./moireScene.ts";
import { standShade } from "./moireStand.ts";
import { resetTuning, setTuning } from "./moireTuning.ts";

afterEach(resetTuning);

/** One tile of the film at two device pixels to the CSS one, as `scenes.test.ts` reads a ground. */
const TERMS: SceneTerms = {
  width: 110,
  height: 210,
  // The whole tile shown, which is the yard's own drift window rather than the rack strip: a
  // stand's field is the tile when the surface is as tall as one (`standDown`, 0335).
  seen: 210,
  lean: 0.5,
  reach: SCENE_REACH_TERMS.middle,
  stand: "wall",
};

/** Every device pixel of one tile's shade, as a list: what each case below asks a question of. */
function shadeOf(stand: SceneStand, reach = SCENE_REACH_TERMS.middle): number[] {
  const terms = { ...TERMS, stand, reach };
  const read: number[] = [];
  for (let y = 0; y < TERMS.height; y += 1) {
    for (let x = 0; x < TERMS.width; x += 1) read.push(standShade(x, y, terms));
  }
  return read;
}

/** How much of a tile the shade takes, counting a pixel by how far into shade it is. */
const takenBy = (read: readonly number[]): number =>
  read.reduce((total, at) => total + at, 0) / read.length;

// One flat list of the shade's cases, all read off the one tile above (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the shade a stand casts", () => {
  it("shades part of every tile and never the whole of one", () => {
    // A shadow that reached everywhere would be a scene drawn one stop lower rather than a thing
    // standing in it, and one that reached nowhere would be a noun the picture never said.
    for (const stand of SCENE_STANDS) {
      const read = shadeOf(stand);
      expect(Math.max(...read), `${stand} casts no shade`).toBeGreaterThan(0.2);
      expect(Math.min(...read), `${stand} shades the whole tile`).toBeLessThan(0.05);
      for (const at of read) {
        expect(at, stand).toBeGreaterThanOrEqual(0);
        expect(at, stand).toBeLessThanOrEqual(1);
      }
    }
  });

  it("draws a far shade narrower than a close one, whatever stands there", () => {
    // The reach scales the shade rather than its spacing (`standShade`): standing further off a
    // wall is a thinner band of shade across the same field, not the same band drawn smaller.
    for (const stand of SCENE_STANDS) {
      const close = takenBy(shadeOf(stand, SCENE_REACH_TERMS.close));
      const middle = takenBy(shadeOf(stand, SCENE_REACH_TERMS.middle));
      const far = takenBy(shadeOf(stand, SCENE_REACH_TERMS.far));
      expect(middle, `${stand} is no thinner at the middle than close up`).toBeLessThan(close);
      expect(far, `${stand} is no thinner far off than at the middle`).toBeLessThan(middle);
    }
  });

  it("cuts a flight of as many treads as the term says", () => {
    // The one stand with a count in it (sketch 03's terrace, landing here): the tile is cut into
    // that many bands of shade, each its own depth, read at the middle of every tread so the
    // softened risers between them are not counted as treads of their own.
    // At every reach, because the reach is what the flight falls by: a descent that ran past the
    // ramp would land its lowest treads on one clamped shade and read as one terrace where the
    // term says three, which is what a flight of nine close up did until it was floored.
    for (const flight of [2, 4, 5, 9]) {
      setTuning("stand.steps", flight);
      for (const reach of Object.values(SCENE_REACH_TERMS)) {
        const terms = { ...TERMS, stand: "steps" as const, reach };
        const read = new Set<string>();
        for (let tread = 0; tread < flight; tread += 1) {
          const y = ((tread + 0.5) / flight) * TERMS.height;
          read.add(standShade(0, y, terms).toFixed(6));
        }
        expect(read.size, `${flight} treads at ${reach}`).toBe(flight);
        // And the top tread is the one out of shade: a flight every step of which is shaded is a
        // field one stop lower rather than a thing standing in it.
        expect(standShade(0, TERMS.height / (2 * flight), terms)).toBe(0);
      }
    }
  });

  it("comes round at both edges of the tile", () => {
    // The tile is laid as a repeating pattern (`createPattern`, src/ui/moireScreen.ts), so a
    // shadow stated in absolute pixels would step at every join exactly as a ground would — the
    // ruled grid across the whole picture that `sceneRepeat` and `sceneNear` exist to prevent.
    for (const stand of SCENE_STANDS) {
      const terms = { ...TERMS, stand };
      for (const [x = 0, y = 0] of [
        [0, 0],
        [3, 5],
        [37, 101],
        [TERMS.width - 2, TERMS.height - 7],
      ]) {
        const at = standShade(x, y, terms);
        expect(standShade(x + TERMS.width, y, terms), `${stand} across ${x},${y}`).toBeCloseTo(
          at,
          10,
        );
        expect(standShade(x, y + TERMS.height, terms), `${stand} down ${x},${y}`).toBeCloseTo(
          at,
          10,
        );
      }
    }
  });

  it("stands its shade in what the surface shows of the tile, not in the whole of it", () => {
    // A tile is snapped **up** to a whole beat cell, so the rack strip — 64 device pixels tall — is
    // drawn from a tile 210 tall and shows its top third. A wall placed two thirds down that tile
    // is a wall nobody sees: the roll that could carry it into view is nought at rest
    // (`bandTurns`, src/ui/moireScreen.ts). So the field a stand is placed in is the tile snapped
    // to what is shown of it, and a whole number of them still span the tile.
    const strip = { ...TERMS, seen: 64 };
    for (const stand of ["wall", "steps"] as const) {
      let seen = 0;
      for (let y = 0; y < 64; y += 1) seen = Math.max(seen, standShade(0, y, { ...strip, stand }));
      expect(seen, `${stand} casts nothing on the strip`).toBeGreaterThan(0.2);
    }
    // And it still comes round at the tile's own edges, which is what snapping it was for.
    for (const stand of SCENE_STANDS) {
      const terms = { ...strip, stand };
      for (const y of [0, 17, 133]) {
        expect(standShade(3, y + TERMS.height, terms), `${stand} down ${y}`).toBeCloseTo(
          standShade(3, y, terms),
          10,
        );
      }
    }
  });

  it("refuses a stand the contract does not hold", () => {
    // The type says this cannot happen and a cast is one edit away from saying otherwise, which is
    // why the scene registry checks itself too (`sceneOf`, src/lib/scene/scenes.ts): a fifth stand
    // added to `SCENE_STANDS` and nowhere else would otherwise draw whichever shape is written
    // last, and a picture is the one place a mistake looks deliberate (principle 5).
    expect(() =>
      // oxlint-disable-next-line no-unsafe-type-assertion
      standShade(3, 5, { ...TERMS, stand: "hedge" as SceneStand }),
    ).toThrow(/No shade for a stand/u);
  });

  it("draws a different shade for every stand there is", () => {
    // Four shapes and not one dial: two yards differing only in their noun are two pictures, which
    // is what puts the noun in the tile's key at all (`screenOf`, src/ui/moireScreen.ts).
    const shapes = SCENE_STANDS.map((stand) => shadeOf(stand).join(","));
    expect(new Set(shapes).size).toBe(SCENE_STANDS.length);
  });
});
