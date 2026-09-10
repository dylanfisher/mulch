/**
 * @role Tests the band of the ramp washed across the picture: that it travels up with the output
 *   and the standing rack's saturation and never past its own strength, that it sweeps on the deck's
 *   seconds and stands still with them, that a halted yard washes nothing, and that the one fill it
 *   costs lands through the ink the cut left and hands the context back as it found it (0302).
 */
import { YARD_SCENE_REST } from "@/lib/yardScene";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DRIFT_DISPERSE_REACH } from "@/lib/moire";
import { moireRow as row } from "@/lib/moireRow";
import { painterOn } from "@/ui/moireCanvasPainted";
import { DRIFT_INK_SECS, screenInkRest } from "@/ui/moireScreenInk";
import {
  TINT_LEVEL,
  TINT_SPREAD,
  TINT_STRENGTH,
  TINT_SWEEP_SECS,
  tintRest,
  tintThrough,
  tintTravelInto,
} from "@/ui/moireTint";

const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of what the band is and how it moves (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the band washed across the picture", () => {
  it("swells with the output on the ink's own rate, and never past its own strength", () => {
    const tint = tintRest();
    expect(tint.strength).toBe(0);
    const ink = screenInkRest();
    // A quiet, sounding yard is washed at the floor the level leaves — and it travels there.
    tintTravelInto(tint, ink, 0, 10, 1 / 60, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(1 / (60 * DRIFT_INK_SECS.value), 10);
    tintTravelInto(tint, ink, 0, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    const quiet = tint.strength;
    expect(quiet).toBeCloseTo(TINT_STRENGTH.value * (1 - TINT_LEVEL.value), 10);
    // A loud one brings it up to the strength, and no louder than that.
    tintTravelInto(tint, ink, 1, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(TINT_STRENGTH.value, 10);
    tintTravelInto(tint, ink, 4, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(TINT_STRENGTH.value, 10);
    // And a standing rack's saturation brings a quiet yard up the same way (0283).
    const saturated = { ...screenInkRest(), saturate: 1 };
    tintTravelInto(tint, saturated, 0, 10, DRIFT_INK_SECS.value, DRIFT_INK_SECS.value);
    expect(tint.strength).toBeCloseTo(TINT_STRENGTH.value, 10);
  });

  it("sweeps on the deck's seconds of sounding, and comes round once a sweep", () => {
    const tint = tintRest();
    const ink = screenInkRest();
    tintTravelInto(tint, ink, 1, TINT_SWEEP_SECS.value / 4, 1, DRIFT_INK_SECS.value);
    expect(tint.phase).toBeCloseTo(0.25, 10);
    tintTravelInto(tint, ink, 1, TINT_SWEEP_SECS.value * 2.25, 1, DRIFT_INK_SECS.value);
    expect(tint.phase).toBeCloseTo(0.25, 10);
    // Wider on a dispersed yard, so a washed picture holds more of one stop at once.
    expect(tint.spread).toBeCloseTo(TINT_SPREAD.value, 10);
    tintTravelInto(
      tint,
      { ...screenInkRest(), disperse: DRIFT_DISPERSE_REACH },
      1,
      1,
      1,
      DRIFT_INK_SECS.value,
    );
    expect(tint.spread).toBeCloseTo(2 * TINT_SPREAD.value, 10);
  });

  it("washes nothing over a halted yard, and stands the band where it stopped", () => {
    const tint = tintRest();
    const ink = screenInkRest();
    tintTravelInto(
      tint,
      ink,
      1,
      TINT_SWEEP_SECS.value / 2,
      DRIFT_INK_SECS.value,
      DRIFT_INK_SECS.value,
    );
    expect(tint.strength).toBeGreaterThan(0);
    const phase = tint.phase;
    // The deck stops: no clock to travel against, so the strength arrives at nothing outright and
    // the phase is left exactly where the last frame put it (0144, 0266).
    tintTravelInto(tint, ink, 1, 0, 1 / 60, 0);
    expect(tint.strength).toBe(0);
    expect(tint.phase).toBe(phase);
  });

  it("lays one fill through the ink the cut left, and hands the context back as it found it", () => {
    const fills: { over: string; alpha: number; style: unknown }[] = [];
    const moves: { a: number; e: number }[] = [];
    const pattern = { setTransform: (m: { a: number; e: number }) => moves.push({ ...m }) };
    const wrote: number[] = [];
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: "",
          clearRect: () => {},
          fillRect: () => {},
          getImageData: () => ({ data: Uint8ClampedArray.from([200, 120, 40, 255]) }),
          createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
          putImageData: (field: { data: Uint8ClampedArray }) => wrote.push(field.data.length),
        }),
      }),
    });
    vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: (token: string) => token }));
    const context = {
      fillStyle: "" as unknown,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      createPattern: () => pattern,
      fillRect(): void {
        fills.push({
          over: this.globalCompositeOperation,
          alpha: this.globalAlpha,
          style: this.fillStyle,
        });
      },
    };
    // oxlint-disable-next-line no-unsafe-type-assertion
    const canvas = { width: 400, height: 32 } as unknown as HTMLCanvasElement;
    // oxlint-disable-next-line no-unsafe-type-assertion
    const ink = context as unknown as CanvasRenderingContext2D;
    // A band at nothing lays nothing and builds nothing, which is every halted yard.
    tintThrough(canvas, ink, "the token the wash was asked in", tintRest(), YARD_SCENE_REST);
    expect(fills).toEqual([]);
    expect(wrote).toEqual([]);
    // One fill, atop the ink, at the band's strength, and the context handed back.
    const tint = { strength: 0.3, spread: 0.5, phase: 0.25 };
    tintThrough(canvas, ink, "the token the wash was asked in", tint, YARD_SCENE_REST);
    expect(fills).toEqual([{ over: "source-atop", alpha: 0.3, style: pattern }]);
    expect(context.globalCompositeOperation).toBe("source-over");
    expect(context.globalAlpha).toBe(1);
    // The band is one tile written once a colour, scaled onto the spread and slid by the phase —
    // and a second frame moves the pattern and writes no tile (0129).
    expect(wrote.length).toBe(1);
    const [first] = moves;
    expect(first?.a).toBeCloseTo(((0.5 * 400) / (wrote[0] ?? 0)) * 4, 10);
    expect(first?.e).toBeCloseTo(-0.25 * 0.5 * 400, 10);
    tintThrough(
      canvas,
      ink,
      "the token the wash was asked in",
      { ...tint, phase: 0.5 },
      YARD_SCENE_REST,
    );
    expect(wrote.length).toBe(1);
    expect(moves.length).toBe(2);
    expect(moves[1]?.e).toBeCloseTo(-0.5 * 0.5 * 400, 10);
  });

  it("builds its own band for a light that falls through the field and one that washes it", () => {
    // The band is read off the tile's own five stops (`sceneStops`), and since 0336 those stops
    // depend on how the yard's air spreads: a wash mixes every one of them toward the light's token
    // and a fall mixes none. Two yards under one light in one colour therefore read two ramps — and
    // the band is held in a map shared by every canvas, so a key that could not tell them apart
    // would hand whichever painted second the first one's band and leave the band and the tile
    // under it disagreeing about what the ramp is.
    const wrote: string[] = [];
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: "" as unknown,
          clearRect: () => {},
          fillRect: () => {},
          getImageData: () => ({ data: Uint8ClampedArray.from([200, 120, 40, 255]) }),
          createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
          putImageData: (field: { data: Uint8ClampedArray }) => wrote.push(field.data.join(",")),
        }),
      }),
    });
    vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: (token: string) => token }));
    const context = {
      fillStyle: "" as unknown,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      createPattern: () => ({ setTransform: () => {} }),
      fillRect: () => {},
    };
    // oxlint-disable-next-line no-unsafe-type-assertion
    const ink = context as unknown as CanvasRenderingContext2D;
    const tint = { strength: 0.3, spread: 0.5, phase: 0.25 };
    const moon = { ...YARD_SCENE_REST, light: "moon" } as const;
    for (const spread of ["wash", "fall"] as const) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      const canvas = { width: 400, height: 32 } as unknown as HTMLCanvasElement;
      tintThrough(canvas, ink, "one colour for both", tint, { ...moon, spread });
    }
    // Two bands and not one: the second yard reads a ramp the first one's band was not written
    // from, so a band answered out of the map for it is a band of the wrong stops. Counted rather
    // than compared pixel for pixel, because the swatch every token is resolved through is one
    // canvas held for the life of the module (`inkOf`) and a stub cannot give two tokens two inks
    // once another case has built it.
    expect(wrote, "a fall is washed through the band a wash built").toHaveLength(2);
  });

  it("is laid by the painter after the cut, so it colours the picture and not the ground", () => {
    // Three patterns: the grating, the screen, and the band.
    const tinted = paintedOn(200, 64, [row({ period: 3 })], 3, undefined, {
      tinting: { strength: 0.4, spread: 0.6, phase: 0 },
    });
    // The screen, the product cut back out, and then the band atop what is left — in that order.
    const overs = tinted.laid.map((fill) => fill.over);
    expect(overs.at(-1)).toBe("source-atop");
    expect(overs.indexOf("destination-out")).toBeLessThan(overs.lastIndexOf("source-atop"));
    expect(tinted.left).toBe("source-over");
    // And none of it on a yard whose band stands at nothing.
    const plain = paintedOn(200, 64, [row({ period: 3 })]);
    expect(plain.laid.some((fill) => fill.over === "source-atop")).toBe(false);
  });
});
