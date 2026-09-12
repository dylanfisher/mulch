/**
 * @role Tests the ground the screen films: that a scene's own five stops are read per pixel and the
 *   travel slides the whole field along that ramp rather than replacing it, that a claim carries by
 *   one stop and no further, that two places of one tile are read in two inks for no alpha at all,
 *   that the water is drawn darker than the bloom in its own black, and that the picture is filmed
 *   through the ink the travel has reached and not the one the rows claim.
 * @instead What the tile itself is, and the three channels in it → src/ui/moireScreen.test.ts,
 *   which this was split out of at the 800-line hard cap (0045). The ramp itself →
 *   src/lib/moireScreenCells.ts. The scene a yard's name reads as → src/lib/yardScene.ts. The
 *   recorder these paint through → src/ui/moireScreenPainted.ts.
 */
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRIFT_REST, type ScreenInk } from "@/lib/moire";
import { SCENE_NAMES, SCENE_RAMP_STOPS } from "@/lib/moireScene";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { type YardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { sceneHue } from "@/lib/moireScreenCells";
import { screenInkRest, inkTravelInto, DRIFT_INK_SECS } from "@/ui/moireScreenInk";
import { moireRow as row } from "@/lib/moireRow";
import { nextColor, screenPainterOn } from "@/ui/moireScreenPainted";
/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireScreenPainted.ts). */
const paintedOn = screenPainterOn((name, value) => {
  vi.stubGlobal(name, value);
});

// The stand-in document and display live for exactly the one test that asks for them.
afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});

// One flat list of the ground's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the ground the screen films", () => {
  it("reads the scene's own five stops per pixel, and slides the whole field with the travel", () => {
    // Read in the scene's own stops: the picture rests part of the way toward one ink since 0366 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    // The fourth crossing of the colour boundary (0141), read along the scene's own ramp (0301,
    // 0329) — and since 0332 read **per pixel**, so one tile holds both ends of that ramp at once
    // and the travel is an offset on where the ground already put each pixel.
    // Through an ink standing at `hue` and not through a claim of it: a claim is spent against the
    // age and the orbit (`agedHue`), and this case is about where on the ramp a hue is read.
    const meanOf = (hue: number, channel: number): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 64, [row({ period: 3, hue })], {
        ...screenInkRest(),
        hue,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      let total = 0;
      for (let at = channel; at < pixels.length; at += 4) total += pixels[at] ?? 0;
      return total / (pixels.length / 4);
    };
    // The travel slides the field along its ramp, low end to high: the meadow's is the dark of a
    // leaf, a hot shadow, its own tan, a straw and a pale sky, in that order (0334), so the one
    // channel the ramp climbs end to end is the blue the sky stop brings.
    expect(meanOf(1, 2)).toBeGreaterThan(meanOf(DRIFT_REST.hue, 2));
    expect(meanOf(DRIFT_REST.hue, 2)).toBeGreaterThan(meanOf(0, 2));
    expect(meanOf(0.75, 1)).toBeGreaterThan(meanOf(0.25, 1));
    // And it slides the field and never replaces it. A claim is worth one stop of five (`sceneHue`)
    // and this ramp is warm for four of them, so the picture is a warm mass at either end of the
    // travel — the red channel moves a fraction of what the blue does, which is what "the yard's
    // name is the colour and the claim is an offset on it" comes to when it is measured.
    const spread = (channel: number): number => Math.abs(meanOf(1, channel) - meanOf(0, channel));
    expect(spread(0), "the travel repaints the field rather than sliding it").toBeLessThan(
      spread(2) / 4,
    );
    expect(meanOf(0, 0), "the meadow is not warm at the foot of its ramp").toBeGreaterThan(150);
  });

  it("carries a claim by one stop of the ramp and no further", () => {
    // A field that is already two hues at full strength has one stop of travel to spend and not
    // four: the read was the picture's only colour when a scene was read once a tile, and it is an
    // offset on the ground now (0332). One stop is a quarter of a ramp of five.
    const stop = 1 / (SCENE_RAMP_STOPS - 1);
    expect(sceneHue(0.5, 1) - sceneHue(0.5, DRIFT_REST.hue)).toBeCloseTo(stop, 12);
    expect(sceneHue(0.5, DRIFT_REST.hue) - sceneHue(0.5, 0)).toBeCloseTo(stop, 12);
    // And where the ground put the pixel is where a picture nobody has claimed a colour for reads.
    expect(sceneHue(0.2, DRIFT_REST.hue)).toBe(0.2);
    // Off either end it holds rather than wrapping: a claim past the ramp is the ramp's last stop.
    expect(sceneHue(0.95, 1)).toBe(1);
    expect(sceneHue(0.05, 0)).toBe(0);
  });

  it("reads two places of one tile in two inks, and spends none of the alpha doing it", () => {
    // Read in the scene's own stops: the picture rests part of the way toward one ink since 0366 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    // The whole of 0332 in one case: a head is scarlet and the ground between two heads is green,
    // inside one tile, and the tile's alpha is the film's alone — so a bloom takes exactly as much
    // of the picture's ink as a meadow does, and `SCREEN_FLOOR` holds for every scene there is.
    vi.stubGlobal("devicePixelRatio", 2);
    const readings = SCENE_NAMES.map((scene) => {
      const { written } = paintedOn(200, 640, [row({ period: 3 })], undefined, 0, nextColor(), {
        ...YARD_SCENE_REST,
        scene,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      const inks = new Set<string>();
      for (let at = 0; at < pixels.length; at += 4) {
        inks.add(`${pixels[at]},${pixels[at + 1]},${pixels[at + 2]}`);
      }
      let keep = 0;
      for (let at = 3; at < pixels.length; at += 4) keep = Math.max(keep, pixels[at] ?? 0);
      return { scene, inks: inks.size, keep };
    });
    const meadow = readings[0]?.keep ?? 0;
    for (const { scene, inks, keep } of readings) {
      // Two pixels of one tile in different places on the ground are read in different inks.
      expect(inks, `${scene} is one ink`).toBeGreaterThan(1);
      // And every scene stands its marks at the ink the meadow does: the ground reaches the alpha
      // only as which mark a cell gets (0345), so the top of every scene's alpha is the caller's.
      expect(keep, `${scene} takes a different share of the ink`).toBeCloseTo(meadow, 12);
    }
  });

  it("draws the water darker than the bloom, in its own black and not in the film's alpha", () => {
    // Read in the scene's own stops: the picture rests part of the way toward one ink since 0366 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    // A darker water is one token (0333): the deepest stop this instrument held was
    // `--scene-water-deep` at a lightness of 0.42 and the water the glints stand in is near black,
    // so the ramp got a floor under its old one. Read as the median pixel of a whole tile, because
    // a mean is carried by the glints and the blades and what is being said here is what the water
    // between them is. The RGB is the ramp's alone — the alpha is the film's (0332).
    const medianOf = (scene: YardScene["scene"]): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 640, [row({ period: 3 })], undefined, 0, nextColor(), {
        ...YARD_SCENE_REST,
        scene,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      const lit: number[] = [];
      for (let at = 0; at < pixels.length; at += 4) {
        lit.push((pixels[at] ?? 0) + (pixels[at + 1] ?? 0) + (pixels[at + 2] ?? 0));
      }
      lit.sort((one, two) => one - two);
      return lit[Math.floor(lit.length / 2)] ?? 0;
    };
    expect(medianOf("water"), "the water is not darker than the bloom").toBeLessThan(
      medianOf("bloom"),
    );
  });

  it("films the picture through the ink the travel has reached and not the one the rows claim", () => {
    // Read in the scene's own stops: the picture rests part of the way toward one ink since 0366 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    const meanOf = (ink: Readonly<ScreenInk> | undefined, channel: number): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 64, [row({ period: 3, hue: 1 })], ink);
      const pixels = written?.data ?? new Uint8ClampedArray();
      let total = 0;
      for (let at = channel; at < pixels.length; at += 4) total += pixels[at] ?? 0;
      return total / (pixels.length / 4);
    };
    // The hot ink is the redder of the two, so how far the picture has travelled toward it is how
    // much red the tile carries. Held at rest, a row claiming it draws the picture it drew before
    // it claimed anything — the claim is where the travel is *going*, and the tile is keyed by
    // where it has got to.
    const partway = screenInkRest();
    inkTravelInto(
      partway,
      [row({ period: 3, hue: 1 })],
      0,
      0,
      0,
      0,
      DRIFT_INK_SECS.value / 8,
      DRIFT_INK_SECS.value,
    );
    const held = meanOf(screenInkRest(), 0);
    const onTheWay = meanOf(partway, 0);
    const arrived = meanOf(undefined, 0);
    expect(onTheWay).toBeGreaterThan(held);
    expect(arrived).toBeGreaterThan(onTheWay);
  });
});
