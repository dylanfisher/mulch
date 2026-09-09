// The stagger's own two terms: where the whole of it sits, and how far apart its bands stand — and
// the one property its draw has to keep, which is that the picture is still whole after it (0323).
import { describe, expect, it } from "vitest";

import {
  STAGGER_BANDS,
  STAGGER_PLACE,
  STAGGER_SHIFT,
  staggerAlong,
  staggerCentre,
  staggerLook,
  staggerSpread,
} from "./moirePanner";

const WIDE = 64;
const DEEP = 96;

/** One draw of the field: where it was put across the picture, and how tall a band it was. */
type Drew = { at: number; top: number; deep: number };

/** A surface that records its draws — the pass is `drawImage` of the field and nothing else. */
function recorder() {
  const drew: Drew[] = [];
  const into = {
    globalCompositeOperation: "source-over",
    globalAlpha: 1,
    drawImage: (_source: unknown, ...box: number[]) => {
      if (box.length < 8) return;
      drew.push({ at: box[4] ?? 0, top: box[5] ?? 0, deep: box[7] ?? 0 });
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the pass calls drawImage and nothing else
  return { drew, into: into as unknown as CanvasRenderingContext2D };
}

/** A field of a known size, which is every part of a canvas this pass reads. */
const field = (width: number, height: number): HTMLCanvasElement => {
  // oxlint-disable-next-line no-unsafe-type-assertion -- the pass reads width and height only
  return { width, height } as unknown as HTMLCanvasElement;
};

const staggerDraw = staggerLook.at === "pass" ? staggerLook.pass : undefined;

/** The stagger drawn at one position and one spread, at the whole of its presence. */
function drawnAt(position: number, spread: number): Drew[] {
  const { drew, into } = recorder();
  staggerDraw?.(into, field(WIDE, DEEP), 1, { position, spread }, 0, 0, 1);
  return drew;
}

describe("the panner's stagger", () => {
  it("walks the whole field a share of the picture, and never a multiple of it", () => {
    // The one thing that makes the position readable: the draw wraps, so a walk of a whole width
    // would put hard left, the middle and hard right in exactly the same place.
    expect(STAGGER_PLACE).toBeGreaterThan(0);
    expect(STAGGER_PLACE).toBeLessThan(0.5);
    expect(staggerCentre(0)).toBeCloseTo(-STAGGER_PLACE, 12);
    expect(staggerCentre(0.5)).toBeCloseTo(0, 12);
    expect(staggerCentre(1)).toBeCloseTo(STAGGER_PLACE, 12);
    // And it reads as three different pictures rather than one drawn three times.
    const [left, middle, right] = [drawnAt(0, 1), drawnAt(0.5, 1), drawnAt(1, 1)];
    expect(left.map(({ at }) => at)).not.toEqual(middle.map(({ at }) => at));
    expect(right.map(({ at }) => at)).not.toEqual(middle.map(({ at }) => at));
    expect(left.map(({ at }) => at)).not.toEqual(right.map(({ at }) => at));
  });

  it("leaves no column of any band undrawn, at either end of either term", () => {
    // The wrap covers the whole width for any slide inside one, so what has to hold is that no
    // slide ever leaves it — the position's walk and the spread's widest come to less than a width
    // between them, and the ends of both terms are where that is tightest.
    for (const position of [0, 0.5, 1]) {
      for (const spread of [0, 0.5, 1]) {
        const drew = drawnAt(position, spread);
        if (drew.length <= 1) continue;
        for (let band = 0; band < STAGGER_BANDS; band++) {
          const top = Math.floor((band * DEEP) / STAGGER_BANDS);
          const pieces = drew.filter((each) => each.top === top);
          expect({ position, spread, band, covered: covers(pieces) }).toEqual({
            position,
            spread,
            band,
            covered: true,
          });
        }
      }
    }
  });

  it("stands its bands symmetrically about the middle, by the spread and the presence", () => {
    // A spread of nothing leaves every band where it was, so the whole of the move is the position;
    // and the bands lean the opposite ways at the two ends of the field.
    expect(staggerAlong(0)).toBe(-1);
    expect(staggerAlong(STAGGER_BANDS - 1)).toBe(1);
    expect(staggerSpread(1, 0)).toBe(0);
    expect(staggerSpread(1, 1)).toBeCloseTo(STAGGER_SHIFT.value, 12);
    // The blocks' walk and not the bloom's weighed share: a presence the picture has not travelled
    // to is the field where it stands, and the pass says so with one draw of it.
    expect(staggerSpread(0, 1)).toBe(0);
    expect(drawnAt(1, 0)).toEqual([]);
    const { drew, into } = recorder();
    staggerDraw?.(into, field(WIDE, DEEP), 0, { position: 1, spread: 1 }, 0, 0, 1);
    expect(drew).toEqual([]);
  });
});

/** Whether the copies of one band, laid where they were laid, cover every column of the picture. */
function covers(pieces: readonly Drew[]): boolean {
  for (let column = 0; column < WIDE; column++) {
    if (!pieces.some(({ at }) => column >= at && column < at + WIDE)) return false;
  }
  return true;
}
