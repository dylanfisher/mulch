// The one thing the shape changes about the EQ's look: which draw it is (0322). What a band is
// otherwise — how deep, where down the field, which way its gain sends it — stays beside every
// other look's terms in src/lib/moireLook.test.ts.
import { describe, expect, it } from "vitest";

import { EQ_SHAPES } from "./biquad";
import { bandCentre, bandCut, bandLook, bandShape } from "./moireBand";

const WIDE = 64;
const DEEP = 96;

/** A field of a known size, which is every part of a canvas this pass reads. */
const field = (width: number, height: number): HTMLCanvasElement => {
  // oxlint-disable-next-line no-unsafe-type-assertion -- the pass reads width and height only
  return { width, height } as unknown as HTMLCanvasElement;
};

/** The band's own draw, narrowed off the union a look is: only a `pass` look carries one. */
const bandDraw = bandLook.at === "pass" ? bandLook.pass : undefined;

/** One draw of the field: where it was taken from, where it was put, and how it was composed. */
type Drew = { from: [number, number]; deep: number; over: string; alpha: number };

/**
 * A surface that records its draws and nothing else — the pass is `drawImage` of the field and no
 * fill and no pixel (0129, 0269), so a recorder is the whole of what a case here needs. The chain's
 * own double is src/ui/moireCanvasChain.test.ts's, and it lives there because it is about the chain.
 */
function recorder() {
  const drew: Drew[] = [];
  const into = {
    globalCompositeOperation: "source-over",
    globalAlpha: 1,
    drawImage: (_source: unknown, ...box: number[]) => {
      // The whole-field draw is two arguments; a slice is eight, of which the y and the height are
      // what a band is about.
      if (box.length < 8) return;
      drew.push({
        from: [box[1] ?? 0, (box[1] ?? 0) + (box[3] ?? 0)],
        deep: box[3] ?? 0,
        over: into.globalCompositeOperation,
        alpha: into.globalAlpha,
      });
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the pass calls drawImage and nothing else
  return { drew, into: into as unknown as CanvasRenderingContext2D };
}

/** The band drawn at one shape, off one gain, over a field of a known size. */
function drawnAt(shape: number, lift: number): Drew[] {
  const { drew, into } = recorder();
  bandDraw?.(
    into,
    field(WIDE, DEEP),
    1,
    { position: 0.5, lift, width: 1, shape: shape / (EQ_SHAPES.length - 1) },
    0,
    0,
    1,
  );
  return drew;
}

describe("the EQ band's shape", () => {
  it("reads the shape term back onto the same list the node's type is set from", () => {
    for (const [index, shape] of EQ_SHAPES.entries()) {
      expect(bandShape(index / (EQ_SHAPES.length - 1))).toBe(shape);
    }
    // A peaking band is not a pass, so it takes nothing out; each pass shape names the side of its
    // own edge that leaves, and the band-pass is the one whose cut is two pieces.
    expect(bandCut("peaking")).toEqual([]);
    expect(bandCut("lowpass")).toEqual(["above"]);
    expect(bandCut("highpass")).toEqual(["below"]);
    expect(bandCut("bandpass")).toEqual(["above", "below"]);
  });

  it("draws a peaking band at the frequency and a pass band past its own edge, off one gain", () => {
    const middle = bandCentre(0.5) * DEEP;
    // The peaking band: every draw straddles the frequency, and none of them reaches an edge of the
    // picture — which is what makes it a band rather than a shelf.
    const peaking = drawnAt(0, 1);
    expect(peaking.length).toBeGreaterThan(0);
    for (const { from } of peaking) {
      expect(from[0]).toBeLessThan(middle);
      expect(from[1]).toBeGreaterThan(middle);
      expect(from[0]).toBeGreaterThan(0);
      expect(from[1]).toBeLessThan(DEEP);
    }
    // A low-pass at the same gain: every draw starts at the top of the picture and stops at the
    // edge, so what leaves is everything above the band — the high end, which is the top of the
    // field because the picture draws low at the bottom.
    const low = drawnAt(1, 1);
    expect(low.length).toBeGreaterThan(0);
    for (const { from } of low) {
      expect(from[0]).toBe(0);
      expect(from[1]).toBeLessThanOrEqual(middle);
    }
    // And a high-pass is the same the other way, off the same gain: the direction the peaking band
    // reads out of `lift` is not in a pass shape's draw at all, because the node does not hear it.
    const high = drawnAt(2, 1);
    const cut = drawnAt(2, 0);
    expect(high.map(({ over }) => over)).toEqual(cut.map(({ over }) => over));
    expect(high.map(({ from }) => from)).toEqual(cut.map(({ from }) => from));
    for (const { from, over } of high) {
      expect(from[1]).toBe(DEEP);
      expect(from[0]).toBeGreaterThanOrEqual(middle);
      // Taken out of the picture, never laid back over it: the field is a hole mask, so closing it
      // is what quiets a piece of the picture (0287).
      expect(over).toBe("source-over");
    }
    // The band-pass takes both skirts, so it draws twice as many pieces as either one-sided shape.
    expect(drawnAt(3, 1)).toHaveLength(low.length + high.length);
  });

  it("is the field it came from at a gain of nothing, whichever shape it is standing in", () => {
    for (const index of EQ_SHAPES.keys()) {
      const { drew, into } = recorder();
      bandDraw?.(
        into,
        field(WIDE, DEEP),
        0,
        { position: 0.5, lift: 0.5, width: 1, shape: index / (EQ_SHAPES.length - 1) },
        0,
        0,
        1,
      );
      expect(drew).toEqual([]);
    }
  });
});
