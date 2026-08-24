/**
 * @role The curved rows' tile shop. A picture-sized tile is the one loop over a picture's pixels in
 *   the instrument (0142), and this is what keeps that loop off the frame the hand is on: asked for
 *   a tile it answers with the one it already holds — the one asked for, or the one that row was
 *   last drawn with — takes at most one bake a painting on the main thread, and hands the bake to a
 *   worker where the browser has one. A tile that is late or dropped costs the previous tile, never
 *   an empty picture (0144).
 * @instead The pixel loop itself → src/lib/moireGeometry.ts, which Node tests without a canvas. The
 *   worker shell → src/workers/drift.ts. Drawing the tiles this hands back, and everything a
 *   straight row is drawn with → src/ui/moireCanvas.ts. The cadence a picture is asked at →
 *   DRIFT_PAINT_MS in src/lib/moire.ts, spent through `paced` in src/ui/frame.ts.
 */
import { useEffect } from "react";

import { DRIFT_PAINT_MS, type DriftGeometry, type DriftProfile } from "@/lib/moire";
import { curvedField, type DriftPlace } from "@/lib/moireGeometry";
import { useCanvasSurface, type CanvasSurface } from "@/ui/canvasSurface";
import { driftOffThread, driftWorkerPort, type DriftPort } from "@/app/drift";

/** What a curved row is drawn with: a canvas this thread baked, or a bitmap the worker sent back. */
export type DriftTileImage = HTMLCanvasElement | ImageBitmap;

/**
 * What the shop is asked for. One object refilled by the painter rather than one per row per
 * painting — a per-frame paint allocates nothing (0070) — so nothing here is kept by reference: the
 * shop copies the place it is handed at the moment it decides to bake or to stand it.
 */
export type DriftOrder = {
  /** What the tile is *of*: everything a bake reads, stepped, and the picture's own size. */
  key: string;
  /** Which row is asking, so a row that has been drawn before has something to draw meanwhile. */
  slot: string;
  geometry: DriftGeometry;
  profile: DriftProfile;
  width: number;
  height: number;
  ref: number;
  place: DriftPlace;
};

/**
 * A tile and the place it was baked at — which is the row's place now, or the one it had a moment
 * ago. Held by the shop and handed back by reference, so a painting that draws every row allocates
 * nothing at all (0070).
 */
export type Standing = { tile: DriftTileImage; place: DriftPlace };

/**
 * How many tiles are kept. A curved row's is a whole picture, so this is the smaller of the
 * painter's two caps, and the reasoning is the same: a cap under the rows one painting actually asks
 * for would miss on every lookup of every painting, so a tile this painting has already touched is
 * never the one evicted.
 */
const CURVED_CACHE = 8;

/**
 * How many tiles one painting may bake on the thread the hand is on. **This is the whole of the
 * stall.** A bake asked for is not a bake taken: a drag that asks for forty costs the number of
 * paintings it lasted, and the paintings themselves are budgeted at the drift's own cadence
 * (DRIFT_PAINT_MS), so the knob and the yard under it keep the frame loop's rate whatever the
 * picture is doing (0144).
 */
const BAKES_PER_PAINTING = 1;

/** Null is a tile this engine would not bake — remembered, so it is not attempted every painting. */
const curved = new Map<string, DriftTileImage | null>();
/** Which painting each tile was last cut with, and which painting is going on. */
const curvedAt = new Map<string, number>();
/** The last tile each row was actually drawn with, and where it stood — its fallback. */
const standing = new Map<string, Standing>();
/** And which painting each row's fallback was last wanted in, so a cap cannot take a live one. */
const standingAt = new Map<string, number>();
/** Keys a worker is baking now, so one row's drag asks for each tile once and not once a painting. */
const flying = new Set<string>();

let painting = 0;
let baked = 0;
/** Whether this painting left a tile it wanted and could not take — the reason to paint again. */
let owing = false;

/** Told whenever a tile arrives, or a painting ends still owing one: the surfaces that draw them. */
const listeners = new Set<() => void>();
let telling = false;

/**
 * The oldest goes once the cache is over its cap, unless it is one this painting is still drawing
 * with — a tile is cheap to rebuild and dear to hold, and a tile rebuilt every painting is neither.
 * `used` answers whether a key is this painting's; a cache without one evicts by age alone.
 */
export function hold<Value>(
  cache: Map<string, Value>,
  key: string,
  value: Value,
  cap: number,
  used?: (key: string) => boolean,
): Value {
  cache.set(key, value);
  for (const oldest of cache.keys()) {
    if (cache.size <= cap) break;
    if (used?.(oldest) === true) continue;
    cache.delete(oldest);
  }
  return value;
}

/**
 * Whether a key was wanted this painting or the one before it — which is what the caps must never
 * evict. **This painting alone is not enough.** The painter stamps each row as it walks it, and
 * with one bake a painting a tile now lands *mid-walk*, when every row after the one being baked
 * still carries the last painting's stamp. Guarded by this painting alone, that bake evicts the
 * tiles of rows the same painting is about to draw with, they miss next painting and evict others
 * in turn, and a rack over the cap sits in a rolling eviction that never converges — which is the
 * "miss on every lookup of every painting" this cap exists not to be.
 */
const wantedLately = (when: Map<string, number>, key: string): boolean =>
  (when.get(key) ?? -1) >= painting - 1;

const curvedLately = (key: string): boolean => wantedLately(curvedAt, key);
const standingLately = (key: string): boolean => wantedLately(standingAt, key);

/** A tile into the cache, and the generations of everything the cap has just dropped out of it. */
function holdCurved(key: string, tile: DriftTileImage | null): DriftTileImage | null {
  curvedAt.set(key, painting);
  hold(curved, key, tile, CURVED_CACHE, curvedLately);
  // A key still being baked has no tile to keep and must keep its stamp: dropped here, it would
  // arrive unprotected and be the first thing the next insert throws away.
  for (const gone of curvedAt.keys()) {
    if (!curved.has(gone) && !flying.has(gone)) curvedAt.delete(gone);
  }
  return tile;
}

/**
 * Tell whoever is drawing that there is something new to draw, or something still owed — never
 * from inside the painting that noticed it. A listener is a surface's own paced repaint, and one
 * called where it stands would re-enter the paint it was called from.
 */
function tell(): void {
  if (telling || listeners.size === 0) return;
  telling = true;
  queueMicrotask(() => {
    telling = false;
    for (const listener of listeners) listener();
  });
}

/** Draw again when a tile lands, or when a painting ended owing one. Returns the unsubscribe. */
export function onDriftBaked(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A canvas for one drift picture: the surface every drawing surface shares, held to the picture's
 * own cadence — declared in one place and slower than the frame rate, because the drift may lag and
 * the hand may not (0144) — and asked to draw again whenever a tile lands after the painting that
 * wanted it, which is every tile a worker baked and every one a painting could not afford.
 */
export function useDriftSurface(
  paint: (canvas: HTMLCanvasElement, color: string) => void,
  animate: boolean,
): CanvasSurface {
  const surface = useCanvasSurface(paint, animate, DRIFT_PAINT_MS);
  const { repaint } = surface;
  useEffect(() => onDriftBaked(repaint), [repaint]);
  return surface;
}

/**
 * The port, or nothing. Built on the first curved row and never before: a page whose yards run no
 * curved effect pays for no worker at all. `null` is a browser without the two things the shape
 * needs, or one whose worker would not load — both of which leave the main-thread bake of (a) as
 * the path, which is the whole reason that clause comes first (0144). `undefined` is one nobody
 * has asked for yet.
 */
let port: DriftPort | null | undefined;
/** How a port is made. A test hands its own through `forgetDriftTiles`; the page makes a worker. */
let makePort: (() => DriftPort) | null = null;
/** Whether the worker's failure has been said. Once a page, not once a painting. */
let said = false;

/**
 * The worker gave up, said once and never repeated. The picture goes on — the next painting bakes
 * on this thread, one tile at a time, which is the path a browser with no `OffscreenCanvas` has
 * always been on — but a picture quietly costing the hand a bake a painting is exactly the silent
 * fallback principle 5 forbids, so it reaches the log the way a theme that cannot be stored does
 * (src/ui/theme.ts). There is no event bus here to say it on: a tile is a picture and not session
 * state, and this file writes none (0144).
 */
function gaveUp(detail: string): void {
  port = null;
  flying.clear();
  if (!said) {
    said = true;
    console.error(`mulch: the drift worker ${detail} — baking the picture on this thread instead`);
  }
  tell();
}

function driftPort(): DriftPort | null {
  if (port !== undefined) return port;
  const make = makePort ?? (driftOffThread() ? driftWorkerPort : null);
  port = null;
  if (make === null) return null;
  // Both globals can be present and the construction still refused — a page whose policy forbids
  // workers throws here. `port` is already null, so this thread bakes from now on and the throw
  // never leaves the paint it was asked inside, which is on the one loop every hand-driven motion
  // in the instrument shares (0144).
  let made: DriftPort;
  try {
    made = make();
  } catch (error) {
    gaveUp(`could not be built: ${String(error)}`);
    return null;
  }
  made.listen((result) => {
    flying.delete(result.key);
    if (result.t === "baked") {
      holdCurved(result.key, result.tile);
      tell();
      return;
    }
    // A worker that could not bake one tile is refusing a surface and not a picture, so it will
    // refuse the next one too. Left up, the next painting asks the same worker for the same tile,
    // is refused again, and the picture repaints at its own cadence forever for a row that will
    // never draw.
    gaveUp(`refused a bake: ${result.detail}`);
  });
  // Every key in flight is now one no reply will carry.
  made.listenFailure((detail) => {
    gaveUp(detail);
  });
  port = made;
  return made;
}

/** Ask the worker for one tile. Answers whether it was asked — a browser without one says no. */
function askWorker(order: DriftOrder): boolean {
  const asked = driftPort();
  if (asked === null) return false;
  if (flying.has(order.key)) return true;
  flying.add(order.key);
  asked.bake({
    t: "bake",
    key: order.key,
    width: order.width,
    height: order.height,
    geometry: order.geometry,
    profile: order.profile,
    place: { ...order.place },
    ref: order.ref,
  });
  return true;
}

/** Bake one tile here and now, on the thread the hand is on. Null is an engine that refused. */
function bakeHere(order: DriftOrder): DriftTileImage | null {
  const made = document.createElement("canvas");
  made.width = order.width;
  made.height = order.height;
  const ink = made.getContext("2d");
  if (ink === null) return null;
  const field = ink.createImageData(order.width, order.height);
  curvedField(
    field.data,
    order.width,
    order.height,
    order.geometry,
    order.profile,
    order.place,
    order.ref,
  );
  ink.putImageData(field, 0, 0);
  return made;
}

/** What this row draws while the tile it asked for does not exist: the last one it was drawn with. */
function fallBack(order: DriftOrder): Standing | null {
  owing = true;
  standingAt.set(order.slot, painting);
  return standing.get(order.slot) ?? null;
}

/**
 * Remember what a row was last drawn with, so the next painting has something to fall back to. The
 * entry is refilled rather than replaced: it is what the painter is handed, and a painting of rows
 * it already holds tiles for must allocate nothing (0070).
 */
function stand(order: DriftOrder, tile: DriftTileImage): Standing {
  standingAt.set(order.slot, painting);
  const already = standing.get(order.slot);
  if (already === undefined) {
    const made = hold(
      standing,
      order.slot,
      { tile, place: { ...order.place } },
      CURVED_CACHE,
      standingLately,
    );
    for (const gone of standingAt.keys()) if (!standing.has(gone)) standingAt.delete(gone);
    return made;
  }
  already.tile = tile;
  // Assigned rather than restated field by field: `Object.assign` allocates nothing and leaves
  // `DriftPlace` the one place that says what a place is made of.
  Object.assign(already.place, order.place);
  return already;
}

/** A painting is starting: a new budget, and a new generation for the cache to hold against. */
export function startPainting(): void {
  painting += 1;
  baked = 0;
  owing = false;
}

/**
 * A painting has ended. If it owed a tile — the budget was spent, or a worker is still baking — it
 * asks to be drawn again, because nothing else will: a halted yard is painted on a commit and not
 * on a frame, so the tile it could not take would otherwise never arrive.
 */
export function endPainting(): void {
  if (owing) tell();
}

/**
 * The tile this row is drawn with in this painting, and where it stands — or nothing, for a row
 * this picture has never drawn and whose first tile is still being baked. The one it asked for
 * where the shop holds it; otherwise one bake, off the thread where the browser allows it and here
 * where it does not, at most `BAKES_PER_PAINTING` a painting.
 */
export function curvedTileFor(order: DriftOrder): Standing | null {
  curvedAt.set(order.key, painting);
  const already = curved.get(order.key);
  if (already !== undefined) return already === null ? fallBack(order) : stand(order, already);
  if (askWorker(order)) return fallBack(order);
  if (baked >= BAKES_PER_PAINTING) return fallBack(order);
  baked += 1;
  const made = holdCurved(order.key, bakeHere(order));
  return made === null ? fallBack(order) : stand(order, made);
}

/**
 * Everything the shop holds, forgotten, and where its port comes from named again. For tests: a
 * module cache outlives one of them, and a stand-in port is a worker without a browser.
 */
export function forgetDriftTiles(make: (() => DriftPort) | null = null): void {
  makePort = make;
  curved.clear();
  curvedAt.clear();
  standing.clear();
  standingAt.clear();
  flying.clear();
  listeners.clear();
  port = undefined;
  said = false;
  painting = 0;
  baked = 0;
  owing = false;
}
