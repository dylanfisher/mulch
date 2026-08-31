/**
 * @role The one painter of drift: a canvas kept sized to its element and to the display, holding
 *   one *grating* per row it is handed — a lane, an instance in the rack, the loop — each at its
 *   own angle, its own pitch, its own depth, its own phase, the profile its effect declared and the
 *   coordinate that effect cuts it along: a straight comb, or a family of rings, spokes or spirals
 *   about a point of the picture the row is anchored at. All of them across the whole canvas rather
 *   than inside a band of it, and a row that asked for more than one scale at every octave of its
 *   own pitch at once. The picture is what they make
 *   together: every pair of gratings beats into a family of fringes, so a yard's items are not
 *   drawn one beside another but read off each other, and the frame before this one is laid back
 *   into it at a bounded share where a row asks for that. One painter serves the strip and the
 *   overlay across the one window both ask for.
 *
 *   Every grating is cut out of ink already laid down — `destination-out` multiplies what is under
 *   it, which is what makes the field the rows' product rather than their sum — and that ink is
 *   the screen a camera would have been pointed at (P90, P92), which this file asks for and does
 *   not draw. A curved or swept row is baked into a tile of its own first — the one loop over a
 *   picture's pixels, which runs on a rebuild and never on a frame (0142), and which this file asks
 *   the tile shop for rather than taking where it stands (0144).
 * @instead The screen itself — its lattice, its three channels and the motions its parameters own
 *   → src/ui/moireScreen.ts, this file's only reach outside itself while painting. What a row is,
 *   the depth and bend one turns into → src/lib/moire.ts, the angle and spacing it is drawn at →
 *   src/lib/moireGrating.ts, and
 *   the axis it is cut along, the sweep, the anchor and the lens → src/lib/moireGeometry.ts — both
 *   of them maths Node can test without a canvas. The canvas this paints on — its size, its density,
 *   its colour and its frame loop → src/ui/canvasSurface.ts, which every surface that draws itself
 *   moving shares, and the cadence the drift asks it at → DRIFT_PAINT_MS in src/lib/moire.ts. The
 *   curved rows' tiles, when each one is baked and what is drawn until it exists →
 *   src/ui/driftTiles.ts. The finished field laid back into itself at a scale, once per run of
 *   effects an automator is growing → src/ui/moireFold.ts, whose arithmetic is
 *   src/lib/moireFractal.ts. Peaks → src/ui/peakCanvas.ts, which is this file's sibling and not its
 *   source.
 */
// Past the soft cap by the swept rows' tiles, which are a picture wide and are cut with the same
// pitch, angle, phase and depth the straight path already holds: lifting them out would put half of
// one row's drawing in another file. The curved rows' tiles have left — when each one is baked is a
// question about the hand and not about the picture, so the shop that answers it is its own file
// (src/ui/driftTiles.ts, 0144), and the cache helper both of them share is imported from there.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// One import over the cap, and it is the fold: where the picture is laid back into itself is its
// own file (src/ui/moireFold.ts) and the shape it is handed is that file's arithmetic
// (src/lib/moireFractal.ts), so reaching it costs two names rather than one.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import {
  cosTurn,
  DRIFT_CENTRE_REACH,
  DRIFT_CHIRP_REACH,
  DRIFT_REST,
  feedbackAlpha,
  LINEAR_GEOMETRY,
  octavesOf,
  TAU,
  turnedScale,
  turnsOf,
  type MoireRow,
} from "@/lib/moire";
import { gratingFloor, gratingDepth, gratingPitch, gratingTurns } from "@/lib/moireGrating";
import { clamp } from "@/lib/range";
import { PLAIN_PROFILE, profileBlock, type DriftProfile } from "@/lib/moireProfiles";
import { washedDepth } from "@/lib/moireSound";
import {
  centreAcross,
  chirpTurns,
  geometryCover,
  geometryRef,
  geometrySlideX,
  geometrySlideY,
  geometryZoom,
  gratingRings,
  gratingSpokes,
  LENS_SLICES,
  lensSlide,
  steppedRings,
  type DriftPlace,
} from "@/lib/moireGeometry";
import { viewOf } from "@/ui/canvasSurface";
import { foldField } from "@/ui/moireFold";
import {
  curvedTileFor,
  endPainting,
  heldStraight,
  startPainting,
  type DriftOrder,
} from "@/ui/driftTiles";
import { boldestRow, inkThrough, stepped } from "@/ui/moireScreen";
import type { FractalFold } from "@/lib/moireFractal";
// oxlint-enable import/max-dependencies

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
 * How many straight tiles are kept. A straight row's is sixty-four pixels and a swept one is a
 * picture wide; the curved ones are a whole picture each and are held by their own shop
 * (src/ui/driftTiles.ts), rather than in one cache the cheap ones would evict the dear ones out of.
 *
 * **This number may not put a tile back on the frame path.** A cap under the rows one painting
 * actually asks for would not degrade — it would miss on every lookup of every frame, because the
 * rows are walked in the same order each time and the oldest entry is always the one asked for
 * next. So this is what a resting instrument holds rather than a promise about the worst case: a
 * rack of reverbs across two surfaces goes over it for as long as it is up and shrinks back after.
 */
const TILE_CACHE = 12;

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
 * What the shop is asked for, one object refilled per curved row for the same reason. Everything a
 * tile is baked from is stepped into `order.place` and read back out of it, so the key and the bake
 * cannot say two different things about one row.
 */
const order: DriftOrder = {
  key: "",
  slot: "",
  geometry: LINEAR_GEOMETRY,
  profile: PLAIN_PROFILE,
  width: 1,
  height: 1,
  ref: 1,
  place: { x: 0, y: 0, pitch: 1, cover: 1, rings: 1, spokes: 1 },
};

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
  if (ink === null) return heldStraight(tiles, key, null, TILE_CACHE);
  const field = ink.createImageData(span, 1);
  for (let x = 0; x < span; x++) {
    // What is cut away, which is what the profile blocks rather than what it lets past.
    field.data[x * 4 + 3] = Math.round(
      255 * profileBlock(profile, chirpTurns(x / span, cycles, chirp)),
    );
  }
  ink.putImageData(field, 0, 0);
  return heldStraight(tiles, key, made, TILE_CACHE);
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
  return heldStraight(held, key, pattern, TILE_CACHE);
}

/**
 * The frame before this one, per canvas: a copy of the field as it was left and the turn of the
 * asking row it was left at. Kept only while some row is asking for it and forgotten the moment
 * none is — or the moment the picture stops being drawn at all — so a picture nobody is feeding
 * back never pays for a copy and no picture ever lays a minutes-old frame of a source it has since
 * stopped playing back into itself.
 */
type Ghost = { held: HTMLCanvasElement; turns: number };
const lasts = new WeakMap<HTMLCanvasElement, Ghost>();

/** Forget it — what every path that draws no picture at all does on its way out. */
const forget = (canvas: HTMLCanvasElement): void => {
  lasts.delete(canvas);
};

/** How far a fed-back frame is scaled and turned before it is laid back into this one. */
const FEEDBACK_ZOOM = 0.03;
const FEEDBACK_TURNS = 0.006;

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
  turnedScale(aimed, (pitch * cycles) / span, angle);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const slide = x * cos + y * sin - turns * pitch;
  aimed.e = slide * cos;
  aimed.f = slide * sin;
  pattern.setTransform(aimed);
}

/**
 * Where a curved row stands, filled into the one order the shop is asked with — its key, the row it
 * belongs to, and the place its tile is baked at.
 */
function placeCurved(
  row: MoireRow,
  at: number,
  pitch: number,
  width: number,
  height: number,
  ref: number,
): void {
  const place = order.place;
  const centre = stepped(row.centre, DRIFT_CENTRE_REACH);
  place.rings = steppedRings(gratingRings(pitch, ref));
  place.pitch = ref / place.rings;
  place.spokes = gratingSpokes(place.pitch, ref);
  place.x = centreAcross(centre, width);
  place.y = centreAcross(centre, height);
  place.cover = geometryCover(row.geometry, place.pitch, width, height);
  order.geometry = row.geometry;
  order.profile = row.profile;
  order.width = width;
  order.height = height;
  order.ref = ref;
  order.key = `${row.geometry}|${row.profile}|${place.rings}|${centre}|${width}x${height}`;
  // Which row is asking, and not what it is asking for: the fallback is this row's own last tile,
  // so the slot has to survive every step of the knob that changes the key (0144). Where it stands
  // in the picture's own row order is part of that and not decoration — a row's shape is folded off
  // its *parameter*, so two lanes on the same knob of two instances of one effect are one shape,
  // one geometry and one profile, and would otherwise share a slot and hand each other's tiles
  // back (src/ui/moireRows.ts).
  order.slot = `${at}|${row.shape}|${row.geometry}|${row.profile}|${width}x${height}`;
}

/**
 * Point one curved row's tile: about that row's own anchor, zoomed by the fraction of a percent its
 * phase has reached — a ring family cut on a logarithm moves by being scaled — and, for the one
 * geometry a scale does nothing to, with its apex walked round a circle a pitch across instead.
 */
function aimCurved(row: MoireRow, turns: number, place: DriftPlace): void {
  const scale = place.cover * geometryZoom(row.geometry, turns, place.rings);
  aimed.a = scale;
  aimed.b = 0;
  aimed.c = 0;
  aimed.d = scale;
  aimed.e = place.x * (1 - scale) + geometrySlideX(row.geometry, turns, place.pitch);
  aimed.f = place.y * (1 - scale) + geometrySlideY(row.geometry, turns, place.pitch);
}

/**
 * How many gratings `rows` come to under a wash of `wash`: a row with no period of its own is not a
 * grating, and a row drawn at several scales is one grating per scale. Counted rather than measured,
 * because it is what `gratingDepth` solves the picture's own depth from — an octave copy cuts a
 * fraction of its row's depth, so counting each of them whole leaves the picture at or above the
 * floor rather than under it, which is the direction that error is allowed to run in.
 *
 * **A row with no depth of its own counts as the share of a grating the reading that draws it has
 * made of it.** The wash's row is nothing at all on a dry yard and the session's is nothing at all
 * over silence (0213, P167), and counting either there would take depth from every row that is
 * saying something to give it to a row that is not — the dry, silent picture has to weigh exactly
 * what it weighed before those rows existed. Counting one whole the moment its reading moved off
 * nought would do the same thing in one step, which the whole picture would flicker on, so each
 * arrives as the fraction it is; `gratingDepth` is continuous in its count.
 *
 * The boldest of the two readings and not their sum, for the same reason `boldestRow` takes one: a
 * row raised by the field's wash and cut by its own meter is one grating either way, and two
 * readings adding up could count it as more than the one it is.
 */
export const drawnGratings = (rows: readonly MoireRow[], wash: number): number =>
  rows.reduce((count, row) => {
    if (row.period <= 0) return count;
    const scales = row.geometry === LINEAR_GEOMETRY ? octavesOf(row) : DRIFT_REST.octaves;
    const reading = Math.max(clamp(wash, 0, 1), clamp(row.pulse, 0, 1));
    return count + (row.depth > 0 ? scales : scales * reading);
  }, 0);

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
  wash: number,
): boolean {
  const { height, width } = field;
  const depth = gratingDepth(count);
  const ref = geometryRef(width, height);
  let at = -1;
  for (const row of rows) {
    at += 1;
    if (row.period <= 0) continue;
    const straight = row.geometry === LINEAR_GEOMETRY;
    // One rule for both kinds of row: the spacing is what the period and the knobs say, and the
    // row's own gesture is spent on where it stands instead (`turnsOf`, 0146). A pitch that moved
    // with a lane would also rebuild a curved row's picture-sized tile several times a second,
    // which is the one thing such a tile must never do (0142).
    const pitch = gratingPitch(row.period, windowSecs, width, dpr, row.pitch);
    const turns = turnsOf(row);
    // What the knobs asked for, ducked by whatever this instance's own meter is reporting, and
    // raised with every other row by however washed the yard has become — the one reading in the
    // picture that belongs to the field rather than to a row (0128, 0213).
    const cut = depth * washedDepth(row, wash);
    // A row cutting nothing takes nothing out of the field, and a fill at no alpha is a fill of the
    // whole picture for nothing: the field's own row is here every painting and is that row on every
    // dry yard (0213). Nothing else can reach nought — a row's own depth has a floor (0139).
    if (cut <= 0) continue;
    if (straight) {
      if (!cutOctaves(field, ink, row, turns, pitch, cut)) return false;
      continue;
    }
    ink.globalAlpha = cut;
    placeCurved(row, at, pitch, width, height, ref);
    const held = curvedTileFor(order);
    // Nothing held for this row yet: its first tile is still being baked, so it draws nothing this
    // painting rather than holding the whole picture up for it (0144). Every other row goes on.
    if (held === null) continue;
    aimCurved(row, turns, held.place);
    ink.setTransform(aimed);
    ink.drawImage(held.tile, 0, 0);
    ink.setTransform(1, 0, 0, 1, 0, 0);
  }
  return true;
}

/**
 * Cut one straight row at every scale it asked for: the first at the pitch it claims and each
 * further one an octave coarser and half as deep, so one effect lays down a fine texture and a
 * coarse one (0143).
 *
 * A copy is deliberately drawn outside the band `gratingPitch` holds a row's own pitch inside,
 * because what a copy beats with is every other row's copy *at its own octave* — two rows an octave
 * up stand at the ratio they already stood at, which is the ratio near enough one to fringe.
 * Against a fine row it is a second hatch, which is what a coarse texture is.
 *
 * One extra fill each, through the tile and the matrix the first copy already used — except a swept
 * row, whose tile is keyed by the cycles its pitch comes to, so its copies bake a picture-wide row
 * of pixels each rather than sharing one.
 */
function cutOctaves(
  field: HTMLCanvasElement,
  ink: CanvasRenderingContext2D,
  row: MoireRow,
  turns: number,
  pitch: number,
  depth: number,
): boolean {
  const octaves = octavesOf(row);
  for (let octave = 0; octave < octaves; octave++) {
    const scale = 2 ** octave;
    ink.globalAlpha = depth / scale;
    if (!cutStraight(field, ink, row, turns, pitch * scale)) return false;
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
  // A hit is stamped as well as a miss: what makes the cap safe is that it holds every key *this*
  // painting has touched, and a row whose tile was already there has touched it (0144).
  const tile =
    already === undefined
      ? straightTile(key, row.profile, span, cycles, chirp)
      : heldStraight(tiles, key, already, TILE_CACHE);
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

/**
 * The ground the rows are cut out of: the field cleared and filled with the caller's own resolved
 * ink, and left cutting, so every grating after this takes ink away rather than adding it. Only its
 * alpha is ever read, it being the mask the picture is cut with (docs/boundaries.md).
 */
function groundOf(field: HTMLCanvasElement, color: string): CanvasRenderingContext2D | null {
  const ink = field.getContext("2d");
  if (ink === null) return null;
  const { height, width } = field;
  ink.setTransform(1, 0, 0, 1, 0, 0);
  ink.globalCompositeOperation = "source-over";
  ink.globalAlpha = 1;
  ink.clearRect(0, 0, width, height);
  ink.fillStyle = color;
  ink.fillRect(0, 0, width, height);
  ink.globalCompositeOperation = "destination-out";
  return ink;
}

/**
 * Draw `rows` across a window of `windowSecs`, in `color` — a token the caller resolved — under
 * `wash`, how washed the yard sounded at the read that filled them (`refillRows`, 0213). A picture
 * of rows and nothing sounding is drawn at a wash of nought, which is the picture drawn before
 * there was an output to hear.
 *
 * And `fold`, how far the picture is laid back into itself — one entry per run of effects an
 * automator is growing, filled by the same read (`foldInto`, src/lib/moireFractal.ts). A picture
 * whose yard grows nothing folds nothing.
 */
// One line over, and it is one pass over the rows: the fill, the wash and the per-row draw share
// the canvas state this sets up once. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function paintMoire(
  canvas: HTMLCanvasElement,
  rows: readonly MoireRow[],
  windowSecs: number,
  color: string,
  wash: number,
  fold: FractalFold,
): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    forget(canvas);
    return;
  }
  startPainting();
  const { height, width } = canvas;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.clearRect(0, 0, width, height);
  const count = drawnGratings(rows, wash);
  if (count === 0 || windowSecs <= 0) {
    forget(canvas);
    endPainting();
    return;
  }
  // An engine that will not build the product cannot draw this picture at all, and an empty canvas
  // says so where a filled rectangle would hide it — here, and at the pattern inside the loop
  // below, whose fills so far are all on the field's own unseen surface.
  const field = fieldFor(canvas);
  const ink = groundOf(field, color);
  if (ink === null) {
    forget(canvas);
    endPainting();
    return;
  }
  if (!cutGratings(field, ink, rows, windowSecs, viewOf(canvas).devicePixelRatio, count, wash)) {
    forget(canvas);
    endPainting();
    return;
  }
  // The picture laid back into itself, once per run of effects growing inside it — before the
  // frame before this one is fed back, so what is carried over already holds the stack rather than
  // the stack being drawn on top of a ghost of a shallower picture.
  foldField(ink, field, fold);
  feedFrame(canvas, field, ink, rows);
  // The screen, and then the product taken back out of it — so what is left is the ink everywhere
  // the gratings block and a window everywhere they agree, which is the picture.
  inkThrough(canvas, context, rows, color, wash);
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "destination-out";
  cutField(context, field, rows);
  context.globalCompositeOperation = "source-over";
  // A painting that wanted a tile it could not take asks to be drawn again: nothing else will,
  // because a halted yard is painted on a commit and not on a frame (0144).
  endPainting();
}

/** How far one row asks the finished field to be bent, read off the row that asks it loudest. */
const lensOf = (row: MoireRow): number => row.lens;

/** And how much of the frame before this one it asks to have laid back into it. */
const feedbackOf = (row: MoireRow): number => row.feedback;

/**
 * Point the frame before this one: about the picture's own centre, a little larger and a little
 * turned, so what it leaves behind is a spiral of its own fringes rather than a doubled copy of
 * them. The turn rides the asking row's own phase and never a count of frames — the picture has one
 * clock and it is the deck's (0126) — where the *depth* of the stack is what accumulates, which is
 * what the ceiling bounds (0143).
 */
function aimFeedback(row: MoireRow, width: number, height: number): void {
  turnedScale(
    aimed,
    1 + FEEDBACK_ZOOM * row.feedback,
    TAU * FEEDBACK_TURNS * cosTurn(turnsOf(row)),
  );
  aimed.e = width / 2 - (aimed.a * width) / 2 - (aimed.c * height) / 2;
  aimed.f = height / 2 - (aimed.b * width) / 2 - (aimed.d * height) / 2;
}

/**
 * The frame before this one, laid back into this one's field — **onto** it rather than cut out of
 * it: the field is what the gratings let through, so a fed-back frame fills its own fringes back in
 * and the picture keeps a ghost of where they stood. That is also the direction that runs away, a
 * field filled to opaque being a picture with nothing left in it, which is why the share it is laid
 * at is `feedbackAlpha` and never the row's own value (0143).
 *
 * Then this frame is kept for the next one, feedback and all, because a frame that kept only its
 * own gratings would ghost one frame back rather than compounding — and a picture no row is feeding
 * back keeps nothing at all.
 */
function feedFrame(
  canvas: HTMLCanvasElement,
  field: HTMLCanvasElement,
  ink: CanvasRenderingContext2D,
  rows: readonly MoireRow[],
): void {
  const { height, width } = field;
  const bold = boldestRow(rows, feedbackOf, DRIFT_REST.feedback);
  if (bold === null || bold.feedback <= 0) {
    forget(canvas);
    return;
  }
  const turns = turnsOf(bold);
  const ghost = lasts.get(canvas);
  // **The stack deepens once per frame of the deck's own clock and never once per repaint.** A
  // canvas is painted on every commit as well as on every frame — a theme, a resize, a knob — and
  // a picture is drawn and not animated while its yard is halted (0040, src/ui/canvasSurface.ts),
  // so a stack that advanced on repaints would make a stopped yard's picture a function of how
  // often React committed. The row's own turn is what says a frame happened, which is the same
  // clock every other motion in the picture rides (0126).
  if (ghost !== undefined && ghost.turns === turns) return;
  const last = ghost?.held ?? document.createElement("canvas");
  const kept = last.getContext("2d");
  if (kept === null) return;
  if (ghost !== undefined && last.width === width && last.height === height) {
    ink.globalCompositeOperation = "source-over";
    ink.globalAlpha = feedbackAlpha(bold.feedback);
    aimFeedback(bold, width, height);
    ink.setTransform(aimed);
    ink.drawImage(last, 0, 0);
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.globalAlpha = 1;
    ink.globalCompositeOperation = "destination-out";
  }
  if (last.width !== width) last.width = width;
  if (last.height !== height) last.height = height;
  kept.clearRect(0, 0, width, height);
  kept.drawImage(field, 0, 0);
  lasts.set(canvas, { held: last, turns });
}

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
