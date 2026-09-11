/**
 * @role The screen tile shop. A screen tile is a loop over a picture's pixels, and this is what
 *   keeps that loop off the frame the hand is on (0354): asked for a tile it answers with the one it
 *   already holds, or with the one this canvas was last drawn with while the one it asked for is
 *   baked — off the thread where the browser has a worker, and in bands under a per-frame budget
 *   where it does not. A tile that is late costs the previous tile and never an empty picture
 *   (0144). The same shape src/ui/driftTiles.ts holds for the curved rows, for the same reason.
 * @instead The loop itself, and everything one tile is made of → src/lib/moireScreenField.ts, which
 *   Node tests without a canvas. The worker shell → src/workers/screen.ts, reached through
 *   src/app/screen.ts. The theme a tile's colours are resolved off and the order they are put into →
 *   src/ui/moireScreenTile.ts, this file's only caller. Where the tile is put and what moves it →
 *   src/ui/moireScreen.ts.
 */
import { screenOffThread, screenWorkerPort, type ScreenPort } from "@/app/screen";
import { hold } from "@/lib/hold";
import { bands, type ScreenBake } from "@/lib/moireScreenField";
import { subscribeTuning, tuningChanges } from "@/lib/moireTuning";
import { frameStamp, paced } from "@/ui/frame";

/** What a screen is filled through: a canvas this thread baked, or a bitmap the worker sent back. */
export type ScreenTileImage = HTMLCanvasElement | ImageBitmap;

/**
 * A finished tile, what it is of, and **its own size**. The size is here because the tile the shop
 * answers with is not always the tile that was asked for: the transforms the picture is moved by
 * come round on the tile's own width and height, and a crawl swept at the width the *asked* tile
 * would have had snaps the picture back once a cycle wherever the two differ — which is every rung
 * where the rack's fold first stands the second lattice, and every resize (0351, 0354).
 */
export type ScreenStanding = {
  tile: ScreenTileImage;
  key: string;
  width: number;
  height: number;
};

/** A finished tile and the size it was baked at, held together. */
type Baked = { tile: ScreenTileImage; width: number; height: number };

/**
 * How many finished tiles are kept. The number `TILE_CACHE` was, unmoved and for its own reasons:
 * room for most of one drag's steps beside the height the other surface draws at, doubled for what
 * moves a tint with no hand on it (0213, 0266), doubled again for the orbit (0301), and spent across
 * as many `(scene, light, wind)` triples as the page is showing (0329). What a miss costs is no
 * longer a bake on the frame's own task — it is this canvas drawing the tile it last stood on for
 * as long as the bake takes.
 */
const TILE_CACHE = 48;

/**
 * How long one slice of a bake may take on the thread the hand is on, and how soon the next may
 * follow. **This is the whole of the fallback's stall**, and it is spent only where the browser
 * has no worker: a slice takes bands of the bake until this many milliseconds are gone and then
 * stands down, so the longest task a tile can cost is one band over the budget rather than the
 * whole loop. Four milliseconds is the budget the block states for a whole bake (docs/plan.md §1),
 * which is what makes it the right size for a slice that must not be felt: at sixty frames a
 * second it is a quarter of the frame, and at a hundred and twenty it is half.
 */
const SLICE_MS = 4;

/** The tiles built so far, by what they are of rather than by who asked (0126). */
const tiles = new Map<string, Baked>();
/** The last tile each canvas was actually drawn with — its fallback while a bake is out. */
const standing = new Map<string, ScreenStanding>();
/** Keys a bake is out for, so one drag asks for each tile once and not once a painting. */
const flying = new Set<string>();

/** Told whenever a tile lands: the surfaces that draw them (`useDriftSurface`). */
const listeners = new Set<() => void>();
let telling = false;

/**
 * Tell whoever is drawing that there is something new to draw — never from inside the painting
 * that noticed it. A listener is a surface's own paced repaint, and one called where it stands
 * would re-enter the paint it was called from.
 */
function tell(): void {
  if (telling || listeners.size === 0) return;
  telling = true;
  queueMicrotask(() => {
    telling = false;
    for (const listener of listeners) listener();
  });
}

/** Draw again when a screen tile lands. Returns the unsubscribe. */
export function onScreenBaked(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The port, or nothing. Built on the first screen tile and never before. `null` is a browser without
 * the two things the shape needs, or one whose worker would not load — both of which leave the
 * sliced bake below as the path. `undefined` is one nobody has asked for yet.
 */
let port: ScreenPort | null | undefined;
/** How a port is made. A test hands its own through `forgetScreenTiles`; the page makes a worker. */
let makePort: (() => ScreenPort) | null = null;
/** Whether the worker's failure has been said. Once a page, not once a painting. */
let said = false;

/**
 * The worker gave up, said once and never repeated. The picture goes on — the next painting bakes
 * in slices on this thread — but a picture quietly costing the hand a bake is exactly the silent
 * fallback principle 5 forbids, so it reaches the log the way a theme that cannot be stored does
 * (src/ui/theme.ts). There is no event bus here to say it on: a tile is a picture and not session
 * state, and this file writes none.
 */
function gaveUp(detail: string): void {
  port = null;
  flying.clear();
  if (!said) {
    said = true;
    console.error(`mulch: the screen worker ${detail} — baking the picture in slices instead`);
  }
  tell();
}

function screenPort(): ScreenPort | null {
  if (port !== undefined) return port;
  const make = makePort ?? (screenOffThread() ? screenWorkerPort : null);
  port = null;
  if (make === null) return null;
  // Both globals can be present and the construction still refused — a page whose policy forbids
  // workers throws here. `port` is already null, so this thread slices from now on and the throw
  // never leaves the paint it was asked inside.
  let made: ScreenPort;
  try {
    made = make();
  } catch (error) {
    gaveUp(`could not be built: ${String(error)}`);
    return null;
  }
  made.listen((result) => {
    flying.delete(result.key);
    if (result.t === "baked") {
      const size = sizes.get(result.key);
      sizes.delete(result.key);
      if (size !== undefined) {
        hold(tiles, result.key, { tile: result.tile, ...size }, TILE_CACHE);
        tell();
      }
      return;
    }
    // A worker that could not bake one tile is refusing a surface and not a picture, so it will
    // refuse the next one too.
    gaveUp(`refused a bake: ${result.detail}`);
  });
  // Every key in flight is now one no reply will carry.
  made.listenFailure((detail) => {
    gaveUp(detail);
  });
  port = made;
  return made;
}

/**
 * The size each key in flight was asked at, so the reply — which carries the key and the bytes and
 * nothing else — can be held beside the width and height its transforms come round on.
 */
const sizes = new Map<string, { width: number; height: number }>();
/** Ask the worker for one tile. Answers whether it was asked — a browser without one says no. */
function askWorker(order: ScreenBake): boolean {
  const asked = screenPort();
  if (asked === null) return false;
  sizes.set(order.key, { width: order.width, height: order.height });
  asked.bake({ t: "bake", order, tunings: tuningChanges() });
  return true;
}

/**
 * The bake standing on this thread, where there is no worker: the order, the bytes it is writing
 * and how far through it is. One at a time — a second bake started beside it would double the
 * budget the slice below is holding to.
 */
let slicing: {
  order: ScreenBake;
  slot: string;
  pixels: Uint8ClampedArray;
  steps: Iterator<void>;
  /** The frame this bake last took a slice on — the ask's own frame, to begin with. */
  at: number;
} | null = null;

/**
 * A number a tile is baked under moved, so a bake half-taken is half of two pictures. The bands
 * already written read the old number and the ones to come will read the new, and what the generator
 * would hold at its end is a body neither of them asked for, under a key the next bake writes
 * identically (`bodyKey`, src/lib/moireScreenField.ts). Dropped where it stands: the picture asks
 * again on the next painting and pays one bake, which is what a slider costs anyway.
 */
subscribeTuning(() => {
  if (slicing === null) return;
  flying.delete(slicing.order.key);
  slicing = null;
  slice.stop();
});

/**
 * One slice: bands of the standing bake until the budget is gone. Asked again when it is not
 * finished, which through `paced` is the next frame at the earliest and never this task.
 */
const slice = paced(
  () => SLICE_MS,
  () => {
    const job = slicing;
    if (job === null) return;
    // **One slice a frame, and never the frame that asked.** `paced` is due the first time it is
    // asked — its budget has never been spent — so without this the first band would run inside
    // the painting that wanted it; and a slice that spent its whole budget is due again the
    // instant it ends, so without this the second, third and every other band would run in that
    // same task and the loop would be whole again under a budget that only looked spent.
    if (frameStamp() === job.at) {
      slice.ask();
      return;
    }
    job.at = frameStamp();
    const until = performance.now() + SLICE_MS;
    let done = false;
    do done = job.steps.next().done === true;
    while (!done && performance.now() < until);
    if (!done) {
      slice.ask();
      return;
    }
    slicing = null;
    flying.delete(job.order.key);
    const tile = screenTileOf(job.order.width, job.order.height, job.pixels);
    if (tile !== null) {
      hold(
        tiles,
        job.order.key,
        { tile, width: job.order.width, height: job.order.height },
        TILE_CACHE,
      );
    }
    tell();
  },
);

/**
 * A field of bytes onto a canvas of its own. **The one statement of it** — the sliced bake ends
 * here, and so does the stand-in port a test hands the shop (src/ui/moireScreenHere.ts), which
 * would otherwise be a second way of turning a bake into something a pattern can be cut from.
 * Null is an engine that would give no context.
 */
export function screenTileOf(
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
): HTMLCanvasElement | null {
  const made = document.createElement("canvas");
  made.width = width;
  made.height = height;
  const ink = made.getContext("2d");
  if (ink === null) return null;
  const field = ink.createImageData(width, height);
  field.data.set(pixels);
  ink.putImageData(field, 0, 0);
  return made;
}

/**
 * Start the sliced bake of this order. Answers false where one is already standing — the budget is
 * one bake's and a second beside it would spend it twice — and the key goes back out of `flying` so
 * a later painting asks again rather than waiting for a bake nobody started.
 */
function askSlices(order: ScreenBake, slot: string): boolean {
  // **A canvas with nothing to fall back on takes the slot from one that has something.** The slot
  // is single and the paintings are in a fixed order, so a canvas whose key travels every painting
  // would otherwise hold it forever and a canvas behind it would draw flat ink for the life of the
  // page — which is worse than the stale tile 0144 allows, because it is no picture at all.
  if (slicing !== null) {
    if (standing.has(slot) || !standing.has(slicing.slot)) return false;
    flying.delete(slicing.order.key);
    slice.stop();
  }
  const pixels = new Uint8ClampedArray(order.width * order.height * 4);
  slicing = { order, slot, pixels, steps: bands(order, pixels), at: frameStamp() };
  slice.ask();
  return true;
}

/**
 * The tile `key` names where the shop already holds it, stood for this canvas — **and nothing else**.
 * The whole of a hit, asked before an order is built, because building one costs a
 * `getComputedStyle` and every rung of a travelling ink term walks a key the shop is holding
 * (0070: the style flush a frame may not pay for).
 */
export function screenStanding(key: string, slot: string): ScreenStanding | null {
  const already = tiles.get(key);
  if (already === undefined) return null;
  return stand(slot, key, already);
}

/** What this canvas last stood on, whatever it asked for — its fallback while a bake is out. */
export const screenStood = (slot: string): ScreenStanding | null => standing.get(slot) ?? null;

/** One slot's standing entry, refilled rather than replaced: a painting allocates nothing (0070). */
function stand(slot: string, key: string, baked: Baked): ScreenStanding {
  const held = standing.get(slot);
  if (held === undefined) {
    return hold(
      standing,
      slot,
      { key, tile: baked.tile, width: baked.width, height: baked.height },
      TILE_CACHE,
    );
  }
  held.tile = baked.tile;
  held.key = key;
  held.width = baked.width;
  held.height = baked.height;
  return held;
}

/**
 * The tile this canvas is drawn through in this painting, and what it is of — the one asked for
 * where the shop holds it; otherwise the one this canvas last stood on, with the bake put out to
 * the worker or to the slices. Null is a canvas that has never had a tile and whose first one is
 * still being baked: its caller draws flat ink, which is the picture it drew before there was a
 * screen behind it.
 */
export function screenTileFor(order: ScreenBake, slot: string): ScreenStanding | null {
  const held = screenStanding(order.key, slot);
  if (held !== null) return held;
  if (!flying.has(order.key)) {
    flying.add(order.key);
    if (!askWorker(order) && !askSlices(order, slot)) flying.delete(order.key);
    // A port that answered where it stands has already put the tile in. A real worker never does —
    // it answers on a message — and neither does a slice, which is a frame away at the soonest; a
    // stand-in port that bakes in the same task is how a test reads a whole tile out of one
    // painting without the shop pretending the bake was free.
    const landed = screenStanding(order.key, slot);
    if (landed !== null) return landed;
  }
  return standing.get(slot) ?? null;
}

/** Whether a bake is out for this key — the boolean the shop's own cases read. */
export const screenBaking = (key: string): boolean => flying.has(key);

/**
 * Everything the shop holds, forgotten, and where its port comes from named again. For tests: a
 * module cache outlives one of them, and a stand-in port is a worker without a browser.
 */
export function forgetScreenTiles(make: (() => ScreenPort) | null = null): void {
  makePort = make;
  tiles.clear();
  standing.clear();
  flying.clear();
  sizes.clear();
  listeners.clear();
  slice.stop();
  slicing = null;
  port = undefined;
  said = false;
}
