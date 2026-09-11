/**
 * @role Tests the screen tile shop: that a painting whose tile is not yet baked draws the last
 *   complete tile and asks once, that the bake goes to the worker port where one is given and to
 *   the paced slices where none is, that a slice is bounded by its budget and writes the bytes the
 *   whole loop would have written, and that a rung of one travelling term is one tile and not a
 *   picture rebuilt (0354).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScreenBakeRequest, ScreenPort } from "@/app/screen";
import { forgetScreenField, screenField, type ScreenBake } from "@/lib/moireScreenField";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { YARD_SCENE_REST } from "@/lib/yardScene";
import { forgetScreenTiles, screenTileFor } from "@/ui/moireScreenShop";

/** A tile small enough to bake in a test and wide enough to take more than one band. */
const WIDE = 200;
const DEEP = 400;

/** One order, at `hue` — the rung of the one travelling term every case here moves. */
const orderAt = (hue: number, wide = WIDE): ScreenBake => ({
  key: `tile|${hue}|${wide}`,
  width: wide,
  height: DEEP,
  seen: DEEP,
  pitch: 10,
  rowPitch: 14,
  cell: 10,
  beat: 0,
  own: [200, 120, 40, 255],
  lift: [
    [10, 10, 10, 255],
    [60, 40, 20, 255],
    [120, 90, 40, 255],
    [190, 150, 85, 255],
    [235, 225, 200, 255],
  ],
  gains: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  tint: { fringe: 0, disperse: 0, hue, saturate: 0 },
  yard: { ...YARD_SCENE_REST },
  cells: [],
  alphabet: "marks",
});

/** The worker, standing in: every bake asked for is kept, and answered only when a case says so. */
function heldPort(): { port: ScreenPort; asked: ScreenBakeRequest[]; answer: () => void } {
  const asked: ScreenBakeRequest[] = [];
  let reply: ((result: { t: "baked"; key: string; tile: ImageBitmap }) => void) | null = null;
  return {
    asked,
    port: {
      bake: (request) => {
        asked.push(request);
      },
      listen: (onResult) => {
        reply = onResult;
      },
      listenFailure: () => {},
    },
    answer: () => {
      const next = asked.shift();
      if (next === undefined) return;
      reply?.({ t: "baked", key: next.order.key, tile: tileNamed(next.order.key) });
    },
  };
}

/** A tile the shop can hold and a case can tell from another: the key it was baked under. */
const named = new WeakMap<object, string>();
function tileNamed(key: string): ImageBitmap {
  const made = { width: 0, height: 0, close: () => {} };
  named.set(made, key);
  // A bitmap is whatever the shop hands a 2D context, and no case here draws one.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return made;
}

const nameOf = (tile: object | undefined): string =>
  tile === undefined ? "" : (named.get(tile) ?? "");

describe("the screen tile shop", () => {
  afterEach(() => {
    forgetScreenTiles();
    vi.unstubAllGlobals();
  });

  it("draws the last complete tile while the one it asked for is baked, and asks once", () => {
    const { answer, asked, port } = heldPort();
    forgetScreenTiles(() => port);
    // Nothing has ever been drawn here, so there is nothing to fall back to — the caller draws
    // flat ink, which is the picture it drew before there was a screen behind it.
    expect(screenTileFor(orderAt(0), "one")).toBeNull();
    expect(asked).toHaveLength(1);
    // And a second painting before the tile lands asks for nothing more.
    expect(screenTileFor(orderAt(0), "one")).toBeNull();
    expect(asked).toHaveLength(1);
    answer();
    const first = screenTileFor(orderAt(0), "one");
    expect(nameOf(first?.tile)).toBe("tile|0|200");
    expect(first?.width).toBe(WIDE);
    // A rung on: the tile asked for does not exist, so this painting draws the one it last stood
    // on and says so — the pattern its caller holds is cut against that key and not the new one.
    const standing = screenTileFor(orderAt(1, WIDE * 2), "one");
    expect(nameOf(standing?.tile)).toBe("tile|0|200");
    expect(standing?.key).toBe("tile|0|200");
    // **And its own size, not the size that was asked for.** What the painter moves the picture by
    // comes round on the tile it is drawing, so a standing answer that reported the asked width
    // would snap the whole picture back once a cycle for as long as the bake lasts (0354).
    expect(standing?.width).toBe(WIDE);
    expect(asked).toHaveLength(1);
  });

  it("rebakes one tile for a rung of one term, and holds both", () => {
    const { answer, asked, port } = heldPort();
    forgetScreenTiles(() => port);
    for (const hue of [0, 1, 2]) {
      screenTileFor(orderAt(hue), "one");
      answer();
    }
    expect(asked).toHaveLength(0);
    // Three rungs, three bakes, and every one of them still held: walking back down the ladder
    // costs nothing at all.
    for (const hue of [0, 1, 2]) {
      expect(nameOf(screenTileFor(orderAt(hue), "one")?.tile)).toBe(`tile|${hue}|200`);
    }
  });
});

describe("the shop's own slices", () => {
  afterEach(() => {
    forgetScreenTiles();
    vi.unstubAllGlobals();
  });

  it("bakes in slices under a per-frame budget where no worker is given", () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const wrote: { width: number; height: number; pixels: Uint8ClampedArray }[] = [];
    vi.stubGlobal("document", { createElement: () => canvasStub(wrote) });
    // No port at all: the browser has no worker, so the shop slices on this thread.
    forgetScreenTiles(null);
    expect(screenTileFor(orderAt(0), "one")).toBeNull();
    // Nothing is written in the task that asked: a bake that finished here would be the long task
    // the whole loop was.
    expect(wrote).toHaveLength(0);
    // The slices run on frames, and the bake spans more than one of them.
    const ticks = drain(frames, () => wrote.length > 0);
    expect(ticks).toBeGreaterThan(1);
    expect(wrote).toHaveLength(1);
    // And the bytes are the bytes the whole loop writes in one task, to the byte. The body the
    // sliced run left behind goes first, or the reference run would read the very bands this case
    // is here to check and an off-by-one in them would pass.
    forgetScreenField();
    const whole = new Uint8ClampedArray(WIDE * DEEP * 4);
    screenField(orderAt(0), whole);
    expect([...(wrote[0]?.pixels ?? [])]).toEqual([...whole]);
  });
});

/**
 * Frames, until `done` — with real milliseconds between them, because the budget a slice holds to
 * is wall clock and a loop that ticked with no time passing would be one slice doing the whole bake.
 * Answers how many frames it took.
 */
function drain(frames: (() => void)[], done: () => boolean): number {
  let ticks = 0;
  while (!done() && ticks < 400) {
    const due = frames.shift();
    if (due === undefined) break;
    const spin = performance.now() + 6;
    while (performance.now() < spin) continue;
    due();
    ticks += 1;
  }
  return ticks;
}

/** A canvas the slice can put its field onto, keeping the bytes for the case to read. */
function canvasStub(
  wrote: { width: number; height: number; pixels: Uint8ClampedArray }[],
): unknown {
  const element = {
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: (field: { data: Uint8ClampedArray }) => {
        wrote.push({ width: element.width, height: element.height, pixels: field.data });
      },
    }),
  };
  return element;
}

describe("the shop's slices", () => {
  beforeEach(() => {
    forgetScreenTiles();
  });
  afterEach(() => {
    forgetScreenTiles();
    vi.unstubAllGlobals();
  });

  it("gives the slot to a canvas with nothing to fall back on", () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const wrote: { width: number; height: number; pixels: Uint8ClampedArray }[] = [];
    vi.stubGlobal("document", { createElement: () => canvasStub(wrote) });
    forgetScreenTiles(null);
    // One canvas takes the slot and finishes, so it has something to draw.
    screenTileFor(orderAt(0), "one");
    drain(frames, () => wrote.length > 0);
    expect(wrote).toHaveLength(1);
    // It draws that tile once, the way a painting does, so it has something to stand on.
    expect(screenTileFor(orderAt(0), "one")).not.toBeNull();
    // It then asks for a rung it has not got, taking the one slot — and a second canvas that has
    // never drawn anything asks beside it. The slot is the second one's: a stale tile is what 0144
    // allows, and flat ink for the life of the page is not.
    screenTileFor(orderAt(1), "one");
    screenTileFor(orderAt(2), "two");
    drain(frames, () => wrote.length > 1);
    expect(wrote).toHaveLength(2);
    expect(nameOf(screenTileFor(orderAt(2), "two")?.tile)).toBe("");
    expect(screenTileFor(orderAt(2), "two")?.key).toBe("tile|2|200");
  });
});

describe("a sliced bake under a moving number", () => {
  afterEach(() => {
    forgetScreenTiles();
    vi.unstubAllGlobals();
  });

  it("drops a sliced bake when a number it is baked under moves", () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const wrote: { width: number; height: number; pixels: Uint8ClampedArray }[] = [];
    vi.stubGlobal("document", { createElement: () => canvasStub(wrote) });
    forgetScreenTiles(null);
    screenTileFor(orderAt(0), "one");
    // The bake is standing and not finished, so its bands would read the number on either side of
    // the move and what it held at the end would be a body neither of them asked for.
    setTuning("film.share", 0.5);
    drain(frames, () => wrote.length > 0);
    expect(wrote).toHaveLength(0);
    resetTuning();
  });

  it("asks the worker and never the slices where a port is given", () => {
    const { asked, port } = heldPort();
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      frames.push(callback);
      return frames.length;
    });
    forgetScreenTiles(() => port);
    screenTileFor(orderAt(0), "one");
    expect(asked).toHaveLength(1);
    // Not one frame was asked for: the whole of the bake is on the other thread.
    expect(frames).toHaveLength(0);
  });
});
