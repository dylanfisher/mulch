/**
 * @role Tests the band every spacing in the picture is held inside: that a row's period orders its
 *   pitch, that the whole spread stays inside the band two gratings can beat in, that the pitch is
 *   the same on a strip and on a window twice as wide, and that nothing is ever drawn finer than
 *   the pixels can carry.
 * @instead Every other case the painter has → src/ui/moireCanvas.test.ts, which this split out of
 *   at the 800-line hard cap (0045). The band itself → src/lib/moireGrating.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { MOIRE_CYCLES } from "@/lib/moire";
import { gratingFloor, gratingPitch, PITCH_SPREAD } from "@/lib/moireGrating";
import { moireRow as row } from "@/lib/moireRow";
import { TILE_PX } from "@/ui/moireCanvas";
import { painterOn, pitchOf, WINDOW } from "@/ui/moireCanvasPainted";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of the band's cases, all painted through the one stand-in canvas (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireCanvas band", () => {
  it("orders the pitches by period, and keeps them all inside the band a lattice needs", () => {
    // Two gratings only beat into something slow when their pitches are close, so the window's own
    // spread — better than tenfold across a real yard — is pulled into a narrow band and clamped
    // there. What survives is the order: a row that comes round often is still drawn finer than a
    // slow one, and the ratio between them is now near enough one to be seen.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = [row({ period: 0.75 }), row({ period: 2.4 }), row({ period: 12 })];
    const { aims } = paintedOn(400, 128, rows);
    expect(aims).toHaveLength(3);
    const pitches = aims.map((aim) => pitchOf(aim) * TILE_PX);
    // Ordered, and every one of them the pitch the maths says.
    expect(pitches[0]).toBeLessThan(pitches[1] ?? 0);
    expect(pitches[1]).toBeLessThan(pitches[2] ?? 0);
    for (const [at, each] of rows.entries())
      expect(pitches[at]).toBeCloseTo(gratingPitch(each.period, WINDOW, 400, 2), 9);
    // And the whole spread inside a factor a lattice can carry: sixteenfold in periods comes out
    // under fourfold in pitches, which is the difference between a fringe and a second hatch.
    const spread = (pitches[2] ?? 0) / (pitches[0] ?? 1);
    expect(spread).toBeGreaterThan(1);
    expect(spread).toBeLessThan(4);
  });

  it("holds every pitch when the window grows, and off the band's ceiling", () => {
    // The popped-out picture is the strip's picture bigger and not coarser (0109, 0293): the row's
    // spread is read against one reference width, so a canvas nearly twice as wide draws the same
    // pitches rather than pushing the slow rows onto the ceiling, where they all stand at one
    // spacing and stop fringing against each other.
    const rows = [row({ period: 0.75 }), row({ period: 2.4 }), row({ period: 12 })];
    // A two-second loop's own window, which is what the picture is actually drawn across.
    const windowSecs = MOIRE_CYCLES * 2;
    const pitchesOn = (width: number, height: number): number[] => {
      vi.stubGlobal("devicePixelRatio", 2);
      return paintedOn(width, height, rows, 3, windowSecs).aims.map(
        (aim) => pitchOf(aim) * TILE_PX,
      );
    };
    // The popout at 720 by 480 and at 1280 by 1400, in device pixels at two per CSS pixel.
    const small = pitchesOn(1440, 960);
    const wide = pitchesOn(2560, 2800);
    expect(small).toHaveLength(3);
    expect(wide).toEqual(small);
    // And every one of them inside the band with room either side, so each still beats against the
    // next: the ceiling is where a fringe stops being a fringe.
    for (const pitch of wide) {
      expect(pitch).toBeGreaterThan(gratingFloor(2) + 0.1);
      expect(pitch).toBeLessThan(gratingFloor(2) * PITCH_SPREAD ** 2 - 0.1);
    }
    // The same fact under the maths: two widths, one pitch.
    expect(gratingPitch(2.4, windowSecs, 2560, 2)).toBeCloseTo(
      gratingPitch(2.4, windowSecs, 1440, 2),
      9,
    );
  });

  it("never draws a grating finer than the pixels can carry, at any window", () => {
    // A grating finer than a few device pixels is not a fine picture but a shimmering one — it
    // moves when nothing is moving. The band's own floor is what prevents it, so unlike the ribbon
    // this replaces there is no separate bound to decline a tightening (0098 amended): nothing can
    // ask for a pitch outside the band in the first place.
    vi.stubGlobal("devicePixelRatio", 2);
    const fast = [row({ period: 0.05 }), row({ period: 900 })];
    for (const windowSecs of [8, 60, 400, 4000]) {
      const { aims } = paintedOn(720, 128, fast, 2, windowSecs);
      const pitches = aims.map((aim) => pitchOf(aim) * TILE_PX);
      expect(Math.min(...pitches)).toBeGreaterThan(6.9);
      expect(Math.max(...pitches)).toBeLessThan(28.1);
    }
    // And a picture with nothing to scale by falls to the middle of the band rather than to zero.
    expect(gratingPitch(3, 0, 400, 2)).toBe(14);
    expect(gratingPitch(0, 20, 400, 2)).toBe(14);
  });
});
