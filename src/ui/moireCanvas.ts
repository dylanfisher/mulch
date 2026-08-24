/**
 * @role The one painter of drift: a canvas kept sized to its element and to the display, holding
 *   one *grating* per row it is handed — a lane, an instance in the rack, the loop — each at its
 *   own angle, its own pitch, its own depth, its own phase, the profile its effect declared and the
 *   coordinate that effect cuts it along: a straight comb, or a family of rings, spokes or spirals
 *   about a point of the picture the row is anchored at. All of them across the whole canvas rather
 *   than inside a band of it. The picture is what they make
 *   together: every pair of gratings beats into a family of fringes, so a yard's items are not
 *   drawn one beside another but read off each other. One painter serves the strip and the overlay
 *   across the one window both ask for.
 *
 *   Every grating is cut out of ink already laid down — `destination-out` multiplies what is under
 *   it, which is what makes the field the rows' product rather than their sum — and that ink is
 *   the screen a camera would have been pointed at (P90, P92), which this file asks for and does
 *   not draw. A curved or swept row is baked into a tile of its own first — the one loop over a
 *   picture's pixels here, and it runs on a rebuild and never on a frame (0142).
 * @instead The screen itself — its lattice, its three channels and the motions its parameters own
 *   → src/ui/moireScreen.ts, this file's only reach outside itself while painting. What a row is,
 *   and the angle, pitch, depth and bend one turns into → src/lib/moire.ts, and
 *   the axis it is cut along, the sweep, the anchor and the lens → src/lib/moireGeometry.ts — both
 *   of them maths Node can test without a canvas. The canvas this paints on — its size, its density,
 *   its colour and its frame loop → src/ui/canvasSurface.ts, which every surface that draws itself
 *   moving shares. Peaks → src/ui/peakCanvas.ts, which is this file's sibling and not its source.
 */
// Past the soft cap by the tiles a row that is not a straight grating is baked into: a curved one's
// is the picture's own size and a swept one's is a picture wide, and both are cut with the same
// pitch, angle, phase and depth the straight path already holds. Lifting them out would put half of
// one row's drawing in another file and hand it this one's caches to reach through.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import {
  DRIFT_CENTRE_REACH,
  DRIFT_CHIRP_REACH,
  DRIFT_REST,
  gratingFloor,
  gratingBend,
  gratingDepth,
  gratingPitch,
  gratingTurns,
  LINEAR_GEOMETRY,
  profileBlock,
  TAU,
  turnsOf,
  type DriftProfile,
  type MoireRow,
} from "@/lib/moire";
import {
  centreAcross,
  chirpTurns,
  geometryCover,
  geometryRef,
  geometrySlideX,
  geometrySlideY,
  geometryTurns,
  geometryZoom,
  gratingRings,
  gratingSpokes,
  LENS_SLICES,
  lensSlide,
} from "@/lib/moireGeometry";
import { viewOf } from "@/ui/canvasSurface";
import { boldestRow, inkThrough, stepped } from "@/ui/moireScreen";

/**
 * How wide a grating tile is, in its own pixels: one whole cycle of the profile across it, constant
 * down its single row. Wide enough that the cycle is smooth under the filtering a rotated pattern
 * gets, and no wider, because every row's pitch is a *scale* on this rather than a tile of its own.
 */
export const TILE_PX = 64;

/**
 * The straight rows' tiles, by what they are of rather than by who asked. A straight, unswept row's
 * is one cycle of its profile across `TILE_PX`: its pitch arrives as a scale on the pattern's
 * matrix, its angle as a rotation and its phase and anchor as a translate, so an arbitrary pitch is
 * exact and seamless — which a tile cut to a whole number of device pixels is not — and one tile per
 * profile serves every row of that kind rather than one being built per row per frame. A swept row
 * needs a tile as wide as the picture, because a sweep is a different spacing at every point of it
 * and no matrix does that (0142); it is still one row of pixels and still a repeat.
 *
 * Only their alpha is ever read. The picture is cut out of ink already laid down, and
 * `destination-out` leaves `under × (1 - alpha)` and discards the colour entirely: so these tiles
 * name no colour, and what the picture is drawn in stays the token its caller resolved
 * (docs/boundaries.md).
 */
const tiles = new Map<string, HTMLCanvasElement | null>();

/**
 * How many tiles are kept, and how many of them may be a picture's own size. A straight row's tile
 * is sixty-four pixels and a swept one is a picture wide; a curved one is a whole picture, which is
 * why the two are held apart rather than in one cache the cheap ones would evict the dear ones out
 * of, and why the curved cap is the smaller.
 *
 * **Neither number may put a tile back on the frame path.** A cap under the rows one painting
 * actually asks for would not degrade — it would miss on every lookup of every frame, because the
 * rows are walked in the same order each time and the oldest entry is always the one asked for
 * next. So a tile this painting has already touched is never the one evicted, and these caps are
 * what a resting instrument holds rather than a promise about the worst case: a rack of reverbs
 * across two surfaces goes over them for as long as it is up and shrinks back after.
 */
const TILE_CACHE = 12;
const CURVED_CACHE = 8;

/** The curved tiles, held apart from the rest for the reason above and capped harder. */
const curved = new Map<string, HTMLCanvasElement | null>();

/**
 * Which painting each curved tile was last cut with, and which painting is going on — so eviction
 * can tell a tile nobody has wanted since the window was resized from one this very frame is
 * drawing with. A counter rather than a clock: all that is asked of it is whether a key is this
 * painting's or an older one's.
 */
const curvedAt = new Map<string, number>();
let painting = 0;

/**
 * The patterns each canvas cuts through, one per tile it has drawn — per canvas, because a pattern
 * belongs to a context.
 */
const gratings = new WeakMap<HTMLCanvasElement, Map<string, CanvasPattern>>();

/**
 * The surface the rows' product is built on, one per canvas drawn and kept at its size. The
 * picture is **one minus** that product — a stack of gratings blocks light and passes it only
 * where every one of their slits lines up, so the ink is dense and the fringes are the windows
 * through it. Built the other way up, the field spent most of itself near the floor and read as a
 * wash: measured in the app at a mean alpha of 0.111 first and 0.362 after the floors were
 * rebalanced, and flat both times, because a floor high enough to be seen leaves gratings too
 * shallow to beat. This inverts the distribution instead of fighting it, which is what a moiré on
 * a light ground actually looks like.
 *
 * A product cannot be inverted in place — `destination-out` needs it as a source — so it is built
 * here and cut out of the screen once. That is one more full-canvas fill per frame and still no
 * loop over any pixel.
 */
const fields = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

/** The grating's transform, one object refilled: a per-frame paint allocates nothing (0070). */
const aimed = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * Where one curved row sits, refilled per row for the same reason: its anchor in device pixels,
 * what its pitch comes to in rings and in spokes, the spacing those two round it onto, and how far
 * past the picture its tile has to reach for the row's own motion never to uncover a corner of it.
 * Every field of it is rounded onto a step, which is what makes it the whole of the tile's key too.
 */
type Placed = {
  x: number;
  y: number;
  pitch: number;
  cover: number;
  rings: number;
  spokes: number;
};
const placed: Placed = { x: 0, y: 0, pitch: 1, cover: 1, rings: 1, spokes: 1 };

/**
 * The oldest goes once a cache is over its cap, unless it is one this painting is still drawing
 * with — a tile is cheap to rebuild and dear to hold, and a tile rebuilt every frame is neither.
 * `used` answers whether a key is this painting's; a cache without one evicts by age alone.
 */
function hold<Value>(
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

/** Whether a curved tile is one this painting has already cut with. */
const drawnThisPainting = (key: string): boolean => curvedAt.get(key) === painting;

/**
 * How many steps of its own octave a curved row's spacing is rounded onto before it reaches a tile.
 * Its sweep and its anchor take `stepped`, which the screen's own tile is already keyed through and
 * which holds the same fact this does: these move on a knob where a size and a density move on a
 * resize, and a tile past the sixty-four pixels a straight row's is takes a loop over its own
 * pixels to build, so unstepped a drag would rebuild one on every pointer move (0129, 0141). The
 * spacing steps geometrically rather than evenly, a ratio being what one spacing does to another.
 */
const RING_STEPS = 4;

const steppedRings = (rings: number): number =>
  2 ** (Math.round(Math.log2(Math.max(1, rings)) * RING_STEPS) / RING_STEPS);

/**
 * One straight row's tile: `cycles` cycles of `profileBlock` across `span` pixels at full depth,
 * written as alpha, swept by `chirp` so the spacing opens at one edge and crowds at the other.
 * Through the same maths the screen's own gratings are drawn with, so there is one wave in this app
 * and not a painter's private copy of it. An unswept row is one cycle across `TILE_PX` and is the
 * tile every row in the instrument used to be drawn with.
 */
function straightTile(
  key: string,
  profile: DriftProfile,
  span: number,
  cycles: number,
  chirp: number,
): HTMLCanvasElement | null {
  const made = document.createElement("canvas");
  made.width = span;
  made.height = 1;
  const ink = made.getContext("2d");
  // The refusal is remembered too. This is asked per row per frame, and an engine that hands back
  // no context would otherwise mint a canvas every one of them — an allocation on the per-frame
  // path, which is the thing 0070 keeps out.
  if (ink === null) return hold(tiles, key, null, TILE_CACHE);
  const field = ink.createImageData(span, 1);
  for (let x = 0; x < span; x++) {
    // What is cut away, which is what the profile blocks rather than what it lets past.
    field.data[x * 4 + 3] = Math.round(
      255 * profileBlock(profile, chirpTurns(x / span, cycles, chirp)),
    );
  }
  ink.putImageData(field, 0, 0);
  return hold(tiles, key, made, TILE_CACHE);
}

/**
 * One curved row's tile: the picture's own size, one whole family of rings, spokes or spirals
 * written a pixel at a time about the row's own anchor. **This is the one loop over a picture's
 * pixels here, and it runs on a rebuild and never on a frame** (0129, 0142) — everything a frame
 * moves is a scale, a slide or a turn of what this laid down, which is why the ring family is cut
 * on the logarithm of the radius rather than on the radius itself.
 */
function curvedTile(
  key: string,
  row: MoireRow,
  place: Placed,
  width: number,
  height: number,
  ref: number,
): HTMLCanvasElement | null {
  const made = document.createElement("canvas");
  made.width = width;
  made.height = height;
  const ink = made.getContext("2d");
  if (ink === null) return hold(curved, key, null, CURVED_CACHE, drawnThisPainting);
  const field = ink.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const v = ((y - place.y) * place.cover) / ref;
    for (let x = 0; x < width; x++) {
      const u = ((x - place.x) * place.cover) / ref;
      const turns = geometryTurns(row.geometry, u, v, place.rings, place.spokes);
      field.data[(y * width + x) * 4 + 3] = Math.round(255 * profileBlock(row.profile, turns));
    }
  }
  ink.putImageData(field, 0, 0);
  return hold(curved, key, made, CURVED_CACHE, drawnThisPainting);
}

/**
 * The pattern `surface` cuts one tile's gratings through, built once per surface per tile and held
 * against the surface.
 */
function gratingOf(
  surface: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  key: string,
  tile: HTMLCanvasElement | null,
): CanvasPattern | null {
  const held = gratings.get(surface) ?? new Map<string, CanvasPattern>();
  gratings.set(surface, held);
  const already = held.get(key);
  if (already !== undefined) return already;
  if (tile === null) return null;
  const pattern = context.createPattern(tile, "repeat");
  if (pattern === null) return null;
  return hold(held, key, pattern, TILE_CACHE);
}

/** The surface `canvas` builds its product on, kept at the canvas's own size. */
function fieldFor(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const held = fields.get(canvas) ?? document.createElement("canvas");
  if (held.width !== canvas.width) held.width = canvas.width;
  if (held.height !== canvas.height) held.height = canvas.height;
  fields.set(canvas, held);
  return held;
}

/**
 * Point one straight grating: turned to its own angle, scaled so its tile's `cycles` cycles come to
 * its own pitch, and slid to where its phase and its anchor have carried it — along its own axis,
 * so a row travels across its fringes rather than sideways through them. Backwards, so the field
 * runs the way the rows' own crests used to.
 *
 * The anchor is a slide and nothing more while a row is straight and unswept: a comb measured from
 * one place and the same comb measured from another differ by where their crests fall. It is once
 * the row is swept or curved that where it is measured from is the picture (0142).
 */
function aim(
  pattern: CanvasPattern,
  row: MoireRow,
  turns: number,
  pitch: number,
  span: number,
  cycles: number,
  x: number,
  y: number,
): void {
  const angle = TAU * gratingTurns(row);
  const scale = (pitch * cycles) / span;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  aimed.a = scale * cos;
  aimed.b = scale * sin;
  aimed.c = -scale * sin;
  aimed.d = scale * cos;
  const slide = x * cos + y * sin - turns * pitch;
  aimed.e = slide * cos;
  aimed.f = slide * sin;
  pattern.setTransform(aimed);
}

/**
 * Where a curved row stands, and the key its tile is held under. Everything a tile is baked from is
 * stepped here and read back out of `placed`, so the key and the bake cannot say two different
 * things about one row.
 */
function placeCurved(
  row: MoireRow,
  pitch: number,
  width: number,
  height: number,
  ref: number,
): string {
  const centre = stepped(row.centre, DRIFT_CENTRE_REACH);
  placed.rings = steppedRings(gratingRings(pitch, ref));
  placed.pitch = ref / placed.rings;
  placed.spokes = gratingSpokes(placed.pitch, ref);
  placed.x = centreAcross(centre, width);
  placed.y = centreAcross(centre, height);
  placed.cover = geometryCover(row.geometry, placed.pitch, width, height);
  return `${row.geometry}|${row.profile}|${placed.rings}|${centre}|${width}x${height}`;
}

/**
 * Point one curved row's tile: about that row's own anchor, zoomed by the fraction of a percent its
 * phase has reached — a ring family cut on a logarithm moves by being scaled — and, for the one
 * geometry a scale does nothing to, with its apex walked round a circle a pitch across instead.
 */
function aimCurved(row: MoireRow, turns: number): void {
  const scale = placed.cover * geometryZoom(row.geometry, turns, placed.rings);
  aimed.a = scale;
  aimed.b = 0;
  aimed.c = 0;
  aimed.d = scale;
  aimed.e = placed.x * (1 - scale) + geometrySlideX(row.geometry, turns, placed.pitch);
  aimed.f = placed.y * (1 - scale) + geometrySlideY(row.geometry, turns, placed.pitch);
}

/** How many of `rows` are actually drawn: a row with no period of its own is not a grating. */
export const drawnRows = (rows: readonly MoireRow[]): number =>
  rows.filter((row) => row.period > 0).length;

/**
 * Cut every row into the ink already laid on `field`, and say whether the engine let it. Each is
 * cut to its own profile: only the shape of the wave says what kind of thing is running, where the
 * pitch says how fast and the angle says which parameter (0137). How deep it cuts and how fine it
 * is drawn are its own share of both, which is what its effect is set to (0139).
 */
function cutGratings(
  field: HTMLCanvasElement,
  ink: CanvasRenderingContext2D,
  rows: readonly MoireRow[],
  windowSecs: number,
  dpr: number,
  count: number,
): boolean {
  const { height, width } = field;
  const depth = gratingDepth(count);
  const ref = geometryRef(width, height);
  for (const row of rows) {
    if (row.period <= 0) continue;
    const straight = row.geometry === LINEAR_GEOMETRY;
    const bend = gratingBend(row);
    // A curved row's spacing is baked into a tile it shares with every frame, so its own gesture
    // rides its phase instead: its rings breathe in and out where a straight row's fringes crowd
    // and open. A pitch that moved with a lane would rebuild that tile several times a second,
    // which is the one thing a picture-sized tile must never do (0142).
    const pitch =
      gratingPitch(row.period, windowSecs, width, dpr, row.pitch) * (straight ? bend : 1);
    const turns = turnsOf(row) + (straight ? 0 : bend - 1);
    ink.globalAlpha = depth * row.depth;
    if (straight) {
      if (!cutStraight(field, ink, row, turns, pitch)) return false;
      continue;
    }
    const key = placeCurved(row, pitch, width, height, ref);
    const already = curved.get(key);
    curvedAt.set(key, painting);
    const tile = already === undefined ? curvedTile(key, row, placed, width, height, ref) : already;
    if (tile === null) return false;
    aimCurved(row, turns);
    ink.setTransform(aimed);
    ink.drawImage(tile, 0, 0);
    ink.setTransform(1, 0, 0, 1, 0, 0);
  }
  return true;
}

/**
 * Cut one straight row, swept or not: an unswept one is the sixty-four-pixel tile every row in the
 * instrument used to be drawn with, and a swept one is a tile as wide as the picture, holding as
 * many cycles as its pitch comes to across it so the sweep closes on itself rather than seaming.
 */
function cutStraight(
  field: HTMLCanvasElement,
  ink: CanvasRenderingContext2D,
  row: MoireRow,
  turns: number,
  swept: number,
): boolean {
  const { height, width } = field;
  const chirp = stepped(row.chirp, DRIFT_CHIRP_REACH);
  const span = chirp > 0 ? width : TILE_PX;
  const cycles = chirp > 0 ? Math.max(1, Math.round(width / swept)) : 1;
  // A sweep opens and crowds its fringes either side of the pitch the row would have had, so the
  // crowded end is held off the pixel grid the same floor `gratingPitch` bands every row to holds
  // it off — a sweep is drawn coarser rather than finer than the pixels can carry (0098, 0142).
  const pitch =
    chirp > 0 ? Math.max(swept, gratingFloor(viewOf(field).devicePixelRatio) * (1 + chirp)) : swept;
  // An unswept row asks for its tile by a string it did not have to build: it is one cycle of its
  // own profile and nothing else, and a per-frame paint allocates nothing (0070).
  const key = chirp > 0 ? `${row.profile}|${span}|${cycles}|${chirp}` : row.profile;
  const already = tiles.get(key);
  const tile =
    already === undefined ? straightTile(key, row.profile, span, cycles, chirp) : already;
  const grating = gratingOf(field, ink, key, tile);
  if (grating === null) return false;
  aim(
    grating,
    row,
    turns,
    pitch,
    span,
    cycles,
    centreAcross(row.centre, width),
    centreAcross(row.centre, height),
  );
  ink.fillStyle = grating;
  ink.fillRect(0, 0, width, height);
  return true;
}

/** Draw `rows` across a window of `windowSecs`, in `color` — a token the caller resolved. */
export function paintMoire(
  canvas: HTMLCanvasElement,
  rows: readonly MoireRow[],
  windowSecs: number,
  color: string,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  painting += 1;
  const { height, width } = canvas;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.clearRect(0, 0, width, height);
  const count = drawnRows(rows);
  if (count === 0 || windowSecs <= 0) return;
  // An engine that will not build the product cannot draw this picture at all, and an empty canvas
  // says so where a filled rectangle would hide it — here, and at the pattern inside the loop
  // below, whose fills so far are all on the field's own unseen surface.
  const field = fieldFor(canvas);
  const ink = field.getContext("2d");
  if (ink === null) return;
  // The rows' product, on its own surface, in the caller's own resolved ink and never a colour of
  // this file's: only its alpha is read, it being the mask the picture is cut with (boundaries).
  ink.setTransform(1, 0, 0, 1, 0, 0);
  ink.globalCompositeOperation = "source-over";
  ink.globalAlpha = 1;
  ink.clearRect(0, 0, width, height);
  ink.fillStyle = color;
  ink.fillRect(0, 0, width, height);
  ink.globalCompositeOperation = "destination-out";
  if (!cutGratings(field, ink, rows, windowSecs, viewOf(canvas).devicePixelRatio, count)) return;
  // The screen, and then the product taken back out of it — so what is left is the ink everywhere
  // the gratings block and a window everywhere they agree, which is the picture.
  inkThrough(canvas, context, rows, color);
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "destination-out";
  cutField(context, field, rows);
  context.globalCompositeOperation = "source-over";
}

/** How far one row asks the finished field to be bent, read off the row that asks it loudest. */
const lensOf = (row: MoireRow): number => row.lens;

/**
 * Take the rows' product back out of the screen — in one go, or, where a row asks for a lens,
 * through slices of it slid one against the next on that row's own phase. The field is already
 * built when this runs, so a lens costs `LENS_SLICES` draws of what is already drawn and no second
 * pass over any row: it bends the picture whole rather than bending every grating in it.
 */
function cutField(
  context: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  rows: readonly MoireRow[],
): void {
  const { height, width } = field;
  const bold = boldestRow(rows, lensOf, DRIFT_REST.lens);
  if (bold === null || bold.lens <= 0) {
    context.drawImage(field, 0, 0);
    return;
  }
  const turns = turnsOf(bold);
  for (let slice = 0; slice < LENS_SLICES; slice++) {
    const top = Math.floor((slice * height) / LENS_SLICES);
    const deep = Math.floor(((slice + 1) * height) / LENS_SLICES) - top;
    if (deep <= 0) continue;
    const slid = lensSlide(bold.lens, turns, slice, LENS_SLICES) * width;
    context.drawImage(field, 0, top, width, deep, slid, top, width, deep);
    // The same slice again a picture over, so the column a slide left behind is cut by the far
    // edge of the field rather than left standing as a bar of uncut screen down the picture.
    if (slid !== 0) {
      const over = slid - Math.sign(slid) * width;
      context.drawImage(field, 0, top, width, deep, over, top, width, deep);
    }
  }
}
