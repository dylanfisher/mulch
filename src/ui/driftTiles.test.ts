/**
 * @role What the tile shop promises the hand: a burst of stepped changes inside one frame costs one
 *   bake and not one each, a bake that is late or dropped leaves the row drawn with the tile it
 *   already had rather than with nothing, and a browser with a worker never runs the picture's pixel
 *   loop on the thread the hand is on (0144).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { DRIFT_PAINT_MS } from "@/lib/moire";
import type { DriftPort, DriftBakeRequest, DriftBakeResult } from "@/app/drift";
import { curvedTileFor, endPainting, forgetDriftTiles, startPainting } from "@/ui/driftTiles";
import { paced } from "@/ui/frame";
import type { DriftOrder } from "@/ui/driftTiles";

/** The picture every case here is drawn at, in device pixels. Small: these count bakes, not pixels. */
const WIDE = 16;
const DEEP = 8;

/** Every canvas the shop minted on this thread — one per bake it took here. */
let minted: { width: number; height: number }[] = [];

/** A document that hands back a canvas whose only job is to be written into and counted. */
function stubDocument(): void {
  vi.stubGlobal("document", {
    createElement: () => {
      const made = {
        width: 0,
        height: 0,
        getContext: () => ({
          createImageData: (w: number, h: number) => ({
            width: w,
            height: h,
            data: new Uint8ClampedArray(w * h * 4),
          }),
          putImageData: () => {},
        }),
      };
      minted.push(made);
      return made;
    },
  });
}

/** One curved row's order, at the anchor a knob has carried it to. */
const orderAt = (rings: number, slot = "the one radial row"): DriftOrder => ({
  key: `radial|lobe|${rings}|the anchor|${WIDE}x${DEEP}`,
  slot,
  geometry: "radial",
  profile: "lobe",
  width: WIDE,
  height: DEEP,
  ref: 4,
  place: { x: 4, y: 2, pitch: 3, cover: 1.05, rings, spokes: 8 },
});

/** One painting, as the painter makes one: a row asked for, and whatever it was handed back. */
function paintOne(order: DriftOrder): ReturnType<typeof curvedTileFor> {
  startPainting();
  const held = curvedTileFor(order);
  endPainting();
  return held;
}

/** A worker that records what it was asked for and answers only when a case says so. */
function standInPort(): {
  make: () => DriftPort;
  asked: DriftBakeRequest[];
  reply: (result: DriftBakeResult) => void;
} {
  const asked: DriftBakeRequest[] = [];
  let heard: ((result: DriftBakeResult) => void) | null = null;
  return {
    asked,
    reply: (result) => heard?.(result),
    make: () => ({
      bake: (request) => {
        asked.push(request);
      },
      listen: (onResult) => {
        heard = onResult;
      },
      listenFailure: () => {},
    }),
  };
}

/** Something to stand in for a baked tile the worker sent back. */
const bitmap = (name: string): ImageBitmap =>
  // oxlint-disable-next-line no-unsafe-type-assertion -- only ever compared by identity here
  ({ name }) as unknown as ImageBitmap;

afterEach(() => {
  forgetDriftTiles();
  minted = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// One flat list of the shop's four claims, each with its own stand-in port or document (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the curved rows' tile shop", () => {
  it("costs one bake for a burst of stepped changes inside one frame, not one each", () => {
    // The stall itself. A knob on a curved, tinted effect steps its row's key on every pointer
    // move, and a picture-sized bake taken where it was asked for is one of these per move on the
    // thread the hand is on. Coalesced onto the picture's own cadence, forty moves inside one
    // frame are one painting and one bake (0144).
    stubDocument();
    // The frame the burst happens inside: asked for once by the budget and never raised, because
    // the whole claim is about what the *same* frame costs.
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    let asked = orderAt(1);
    const pace = paced(DRIFT_PAINT_MS, () => {
      paintOne(asked);
    });
    for (let move = 0; move < 40; move++) {
      asked = orderAt(1 + move);
      pace.ask();
    }
    pace.stop();
    expect(minted).toHaveLength(1);
  });

  it("draws the tile the row already holds while the one it asked for does not exist yet", () => {
    // A bake that is late — a worker still working, or a painting whose budget is spent — leaves
    // the row drawn a beat behind, never undrawn. The place comes back with the tile, so the row
    // is placed where that tile was baked rather than where the knob has since moved it.
    const port = standInPort();
    forgetDriftTiles(port.make);
    expect(paintOne(orderAt(1))).toBeNull();
    const first = bitmap("the first tile");
    port.reply({ t: "baked", key: orderAt(1).key, tile: first });
    expect(paintOne(orderAt(1))?.tile).toBe(first);
    // The knob moves on. The tile for where it is now does not exist, so the row keeps the one it
    // was last drawn with, at the place that tile was baked at.
    const moved = paintOne(orderAt(9));
    expect(moved?.tile).toBe(first);
    expect(moved?.place.rings).toBe(1);
    // And once that one lands the row is drawn with it, at its own place.
    port.reply({ t: "baked", key: orderAt(9).key, tile: bitmap("the second tile") });
    expect(paintOne(orderAt(9))?.place.rings).toBe(9);
  });

  it("bakes off this thread where the browser has a worker, and asks for each tile once", () => {
    // The pixel loop leaves the main thread entirely: nothing is minted here, and a drag that
    // paints the same key ten times asks the worker for it once rather than ten times.
    stubDocument();
    const port = standInPort();
    forgetDriftTiles(port.make);
    for (let painting = 0; painting < 10; painting++) paintOne(orderAt(1));
    expect(port.asked).toHaveLength(1);
    expect(port.asked[0]?.place.rings).toBe(1);
    expect(minted).toHaveLength(0);
  });

  it("keeps every tile the picture is still using, however far over the cap it is", () => {
    // A cap under the rows one picture actually asks for must never degrade into a miss on every
    // lookup of every painting. With one bake a painting a tile lands *mid-walk*, so a guard that
    // protected only the rows walked so far would throw away the tiles of rows the same painting is
    // about to draw with — and a rack over the cap would sit in a rolling eviction that never
    // converges, baking a picture-sized tile every painting for as long as it is up.
    stubDocument();
    forgetDriftTiles();
    const many = Array.from({ length: 11 }, (_, at) => orderAt(at + 1, `the row at ${at}`));
    // One painting each: enough for every row to have had its one bake.
    for (let painting = 0; painting < many.length; painting++) {
      startPainting();
      for (const one of many) curvedTileFor(one);
      endPainting();
    }
    // Now a knob steps the first row in the walk. That bake is one the cap has to make room for,
    // and what it makes room out of is the whole question: the rows after it in the same walk are
    // being drawn with their tiles this very painting.
    many[0] = orderAt(99, "the row at 0");
    startPainting();
    for (const one of many) curvedTileFor(one);
    endPainting();
    const settled = minted.length;
    for (let painting = 0; painting < 3; painting++) {
      startPainting();
      const held = many.map((one) => curvedTileFor(one));
      endPainting();
      for (const one of held) expect(one).not.toBeNull();
    }
    expect(minted).toHaveLength(settled);
  });

  it("puts the worker down when it refuses a bake, and bakes here instead", () => {
    // A refusal that is not remembered is a picture that repaints at its own cadence forever for a
    // row that will never draw: the next painting asks the same worker for the same tile.
    stubDocument();
    const port = standInPort();
    forgetDriftTiles(port.make);
    paintOne(orderAt(1));
    expect(port.asked).toHaveLength(1);
    port.reply({ t: "failed", key: orderAt(1).key, detail: "no 2d context in the worker" });
    expect(paintOne(orderAt(1))?.place.rings).toBe(1);
    expect(minted).toHaveLength(1);
    expect(port.asked).toHaveLength(1);
  });

  it("bakes here when the browser refuses to build a worker at all", () => {
    // Both globals present and the construction still refused — a page whose policy forbids
    // workers. The throw must not leave the painting: it is taken on the one frame loop, and a
    // loop that dies inside a callback stops moving every playhead, meter and drag with it.
    stubDocument();
    forgetDriftTiles(() => {
      throw new Error("workers are not allowed on this page");
    });
    expect(paintOne(orderAt(1))?.place.rings).toBe(1);
    expect(minted).toHaveLength(1);
  });

  it("bakes on this thread where there is no worker at all", () => {
    // The path clause (c) falls back to, and the one every case above it rests on: a browser with
    // no OffscreenCanvas draws the same picture a beat later rather than a different one.
    stubDocument();
    forgetDriftTiles();
    expect(paintOne(orderAt(1))?.place.rings).toBe(1);
    expect(minted).toHaveLength(1);
    expect(minted[0]?.width).toBe(WIDE);
    expect(minted[0]?.height).toBe(DEEP);
  });
});
