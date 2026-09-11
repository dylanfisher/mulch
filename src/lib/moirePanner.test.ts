// The stagger's own two terms: where the whole of it sits, and how far apart its bands stand — and
// the one property its draw has to keep, which is that the picture is still whole after it (0323).
import { describe, expect, it } from "vitest";

import type { LookTerms } from "@/lib/moireLook";

import {
  STAGGER_BANDS,
  STAGGER_LAG,
  STAGGER_PLACE,
  STAGGER_SHIFT,
  STAGGER_SLICE,
  STAGGER_SPLIT,
  staggerAlong,
  staggerBands,
  staggerCentre,
  staggerLag,
  staggerLook,
  staggerRead,
  staggerSpread,
  staggerTake,
} from "./moirePanner";

const WIDE = 64;
const DEEP = 96;

/**
 * One draw of the field: where it was read from and how wide a slice that was, and where it was put
 * across the picture and how tall a band it is.
 */
type Drew = { from: number; read: number; wide: number; at: number; top: number; deep: number };

/** A surface that records its draws — the pass is `drawImage` of the field and nothing else. */
function recorder() {
  const drew: Drew[] = [];
  const into = {
    globalCompositeOperation: "source-over",
    globalAlpha: 1,
    drawImage: (_source: unknown, ...box: number[]) => {
      if (box.length < 8) return;
      drew.push({
        from: box[0] ?? 0,
        read: box[1] ?? 0,
        wide: box[2] ?? 0,
        at: box[4] ?? 0,
        top: box[5] ?? 0,
        deep: box[7] ?? 0,
      });
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
  return drawnWith({ position, spread });
}

/** And the same drawn at whatever terms are handed it, the stages among them. */
function drawnWith(terms: LookTerms): Drew[] {
  const { drew, into } = recorder();
  staggerDraw?.(into, field(WIDE, DEEP), 1, terms, 0, 0, 1);
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
    // And it holds at either end of all five, because a stage moves where a band is read from and
    // the wrap is about where it is put (0359).
    for (const position of [0, 0.5, 1]) {
      for (const spread of [0, 0.5, 1]) {
        for (const stage of [0, 1]) {
          const drew = drawnWith({ position, spread, count: stage, spacing: stage, size: stage });
          if (drew.length <= 1) continue;
          const bands = staggerBands(stage);
          for (let band = 0; band < bands; band++) {
            const top = Math.floor((band * DEEP) / bands);
            const pieces = drew.filter((each) => each.top === top);
            expect({ position, spread, stage, band, covered: covers(pieces) }).toEqual({
              position,
              spread,
              stage,
              band,
              covered: true,
            });
          }
        }
      }
    }
  });

  it("stands its bands symmetrically about the middle, by the spread and the presence", () => {
    // A spread of nothing leaves every band where it was, so the whole of the move is the position;
    // and the bands lean the opposite ways at the two ends of the field.
    expect(staggerAlong(0, STAGGER_BANDS)).toBe(-1);
    expect(staggerAlong(STAGGER_BANDS - 1, STAGGER_BANDS)).toBe(1);
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

  // P356 step 9: the three stage toggles, which reach no dimension of a row because none of them is
  // an amount and every dimension of a row is one — so they land in the look, as the eq's shape
  // does, and each moves where a band is read from rather than how many times one is drawn (0359).
  it("takes the field apart by its three stages, at the same two draws a band", () => {
    const stood: LookTerms = { position: 0.5, spread: 1 };
    const plain = drawnWith(stood);
    // The Band split is how many pieces there are: the stage's own crossover is three ways, and a
    // standing one adds exactly those to the six the picture is taken in.
    expect(staggerBands(0)).toBe(STAGGER_BANDS);
    expect(staggerBands(1)).toBe(STAGGER_BANDS + STAGGER_SPLIT);
    const split = drawnWith({ ...stood, count: 1 });
    expect(new Set(plain.map(({ top }) => top)).size).toBe(STAGGER_BANDS);
    expect(new Set(split.map(({ top }) => top)).size).toBe(STAGGER_BANDS + STAGGER_SPLIT);
    // The Time offset is how far down the field a piece is read from, held inside the picture so
    // no band is read off the end of it; the Slice is how much of the width a piece is taken from,
    // and successive bands take opposite slices.
    expect(staggerLag(1, 0)).toBe(0);
    expect(staggerLag(1, 1)).toBeCloseTo(STAGGER_LAG.value, 12);
    expect(staggerTake(1, 0)).toBe(0);
    expect(staggerTake(1, 1)).toBeCloseTo(STAGGER_SLICE.value, 12);
    const lagged = drawnWith({ ...stood, spacing: 1 });
    const sliced = drawnWith({ ...stood, size: 1 });
    // **Every band is read from somewhere else, the two at the ends included.** The lag is a squeeze
    // toward the middle and not an offset down the field for exactly this reason: the top band has
    // nothing above it and the bottom band nothing below, so an offset would leave the two bands the
    // spread throws furthest standing where they were. The middle of the field is the one row the
    // squeeze holds still, and no band count here puts a band's top on it.
    for (const { read, top, deep } of lagged) {
      expect({ top, moved: read !== top }).toEqual({ top, moved: true });
      expect(read).toBeGreaterThanOrEqual(0);
      expect(read + deep).toBeLessThanOrEqual(DEEP);
    }
    // And the squeeze holds at the dial's own end, where an offset would have clamped hardest.
    expect(staggerRead(0, 16, 96, 0)).toBe(0);
    expect(staggerRead(0, 16, 96, 1)).toBe(40);
    expect(staggerRead(80, 16, 96, 1)).toBe(40);
    const wide = Math.round(WIDE * (1 - STAGGER_SLICE.value));
    expect(sliced.every((each) => each.wide === wide)).toBe(true);
    expect(new Set(sliced.map(({ from }) => from))).toEqual(new Set([0, WIDE - wide]));
    // Every one of the three is a different picture, and none of them is more draws: a stage moves
    // where a band is read from, so the count follows the band count and nothing else.
    for (const drew of [split, lagged, sliced]) {
      expect(drew).not.toEqual(plain);
      const bands = new Set(drew.map(({ top }) => top));
      expect(drew.length).toBeLessThanOrEqual(2 * bands.size);
      for (const top of bands) {
        expect(drew.filter((each) => each.top === top).length).toBeLessThanOrEqual(2);
      }
    }
  });
});

/** Whether the copies of one band, laid where they were laid, cover every column of the picture. */
function covers(pieces: readonly Drew[]): boolean {
  for (let column = 0; column < WIDE; column++) {
    if (!pieces.some(({ at }) => column >= at && column < at + WIDE)) return false;
  }
  return true;
}
