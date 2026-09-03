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
 *   → src/ui/moireScreen.ts. What a row is,
 *   the depth and bend one turns into → src/lib/moire.ts, the angle and spacing it is drawn at →
 *   src/lib/moireGrating.ts, and
 *   the axis it is cut along, the sweep, the anchor and the lens → src/lib/moireGeometry.ts — both
 *   of them maths Node can test without a canvas. The canvas this paints on — its size, its density,
 *   its colour and its frame loop → src/ui/canvasSurface.ts, which every surface that draws itself
 *   moving shares, and the cadence the drift asks it at → DRIFT_PAINT_MS in src/lib/moire.ts, which
 *   a chain of passes longer than the whole rate holds halves (`looksPaintMs`,
 *   src/ui/moireLooks.ts, 0284). The
 *   curved rows' tiles, when each one is baked and what is drawn until it exists →
 *   src/ui/driftTiles.ts. The two fractal coordinates one of those tiles may be cut along, and the
 *   seed a run of effects an automator is growing folds into → src/lib/moireFractal.ts. Peaks →
 *   src/ui/peakCanvas.ts, which is this file's sibling and not its source. Taking the finished field
 *   back out of the screen, whole or through the chain and the slices a lens bends and a shatter breaks it in →
 *   src/ui/moireCanvasField.ts, which this splits the painting's last pass into.
 */
// Past the soft cap by the swept rows' tiles, which are a picture wide and are cut with the same
// pitch, angle, phase and depth the straight path already holds: lifting them out would put half of
// one row's drawing in another file. The curved rows' tiles have left — when each one is baked is a
// question about the hand and not about the picture, so the shop that answers it is its own file
// (src/ui/driftTiles.ts, 0144), and the cache helper both of them share is imported from there.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// One import over the cap, and it is the picture's own structure: the two fractal coordinates a row
// may be cut along are maths of their own (src/lib/moireFractal.ts, 0246), and the painter reaches
// them to seed a tile and to key it.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import {
  cosTurn,
  DRIFT_CHIRP_REACH,
  DRIFT_REST,
  DRIFT_TRAVEL_CYCLES,
  feedbackAlpha,
  LINEAR_GEOMETRY,
  TAU,
  turnedScale,
  turnsOf,
  type MoireRow,
  type MoireWind,
  type ScreenInk,
} from "@/lib/moire";
import { octaveAlpha, octaveShare, octavesOf } from "@/lib/moireOctaves";
import {
  gratingFloor,
  gratingDepth,
  gratingPitch,
  gratingTurns,
  PICTURE_FLOOR,
} from "@/lib/moireGrating";
import {
  fractalFlight,
  fractalRoamInto,
  fractalStopsRest,
  fractalZoom,
  isFractalGeometry,
  type FractalStops,
} from "@/lib/moireFractal";
import { agedOpening } from "@/lib/moireAge";
import { arrived } from "@/lib/moireArrival";
import { clamp } from "@/lib/range";
import { profileBlock, type DriftProfile } from "@/lib/moireProfiles";
import { washedDepth } from "@/lib/moireSound";
import { centreAcross, chirpTurns, geometryRef } from "@/lib/moireGeometry";
import { isFieldGeometry, LATTICE_GEOMETRY } from "@/lib/moireLattice";
import { viewOf } from "@/ui/canvasSurface";
import { curvedTileFor, endPainting, heldStraight, startPainting } from "@/ui/driftTiles";
import { aimCurved, placeCurved } from "@/ui/moireCanvasCurved";
import { cutField } from "@/ui/moireCanvasField";
import { looksFolds, type MoireLook } from "@/ui/moireLooks";
import { cutLattice, gratingOf, TILE_CACHE } from "@/ui/moireCanvasPattern";
import { inkThrough } from "@/ui/moireScreen";
import { boldestRow, stepped } from "@/ui/moireScreenInk";
import type { MoireShape } from "@/ui/moireShape";
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
 * And where the picture stands once its roam is laid over that travel, resolved once a pass beside
 * the flight and for the flight's reason: the two fractal rows are one structure, and the roam is
 * the field's (`fractalRoamInto`, src/lib/moireFractal.ts, 0273). Allocated once (0070).
 */
const roamed: FractalStops = fractalStopsRest();

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
  const slide = x * cos + y * sin - turns * pitch * DRIFT_TRAVEL_CYCLES;
  aimed.e = slide * cos;
  aimed.f = slide * sin;
  pattern.setTransform(aimed);
}

/**
 * How many gratings `rows` come to under a wash of `wash`: a row with no period of its own is not a
 * grating, and a row drawn at several scales is worth what its copies cut between them
 * (`octaveShare`). Counted rather than measured, because it is what `gratingDepth` solves the
 * picture's own depth from — and a copy is a *share* of a grating: counting each whole once the
 * scales spread across the whole picture lifted the field's mean well off the floor and washed the
 * structure out of it (0244).
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
 *
 * **A fractal row at nought depth counts nothing at all**, which is the reading `washedDepth` makes
 * of it (src/lib/moireSound.ts, 0249): a run holding its rows through a crossfade is standing no
 * population, so the picture's ink and the picture's weight both say the structure is not there.
 */
export const drawnGratings = (rows: readonly MoireRow[], wash: number): number =>
  rows.reduce((count, row) => {
    if (row.period <= 0) return count;
    if (row.depth <= 0 && isFieldGeometry(row.geometry)) return count;
    if (!arrived(row.arrival)) return count;
    const scales =
      row.geometry === LINEAR_GEOMETRY ? octaveShare(octavesOf(row)) : DRIFT_REST.octaves;
    const reading = Math.max(clamp(wash, 0, 1), clamp(row.pulse, 0, 1));
    // And its own share of the picture over all of it, for the reason a row with no depth of its
    // own counts as the fraction it is: a row joining the picture or leaving it takes its weight
    // with it either way, and a whole one counted the frame it arrived is the flash this exists to
    // remove (`carryArrivals`, src/ui/moireCarry.ts).
    const share = clamp(row.arrival, 0, 1);
    return count + share * (row.depth > 0 ? scales : scales * reading);
  }, 0);

/**
 * Cut every row into the ink already laid on `field`, and say whether the engine let it. Each is
 * cut to its own profile: only the shape of the wave says what kind of thing is running, where the
 * pitch says how fast and the angle says which parameter (0137). How deep it cuts and how fine it
 * is drawn are its own share of both, which is what its effect is set to (0139).
 */
// One pass over the rows, and every line of it is one row's own reading: the spacing, the phase,
// the depth, and — for a curved row — the flight its period puts it on before it is placed. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function cutGratings(
  field: HTMLCanvasElement,
  ink: CanvasRenderingContext2D,
  rows: readonly MoireRow[],
  windowSecs: number,
  dpr: number,
  count: number,
  wash: number,
  seed: Readonly<FractalStops>,
  age: number,
  sounding: number,
  shape: Readonly<MoireShape>,
  folds: number,
  tint: Readonly<ScreenInk>,
): boolean {
  const { height, width } = field;
  // How far the picture has flown through its own structure, resolved once for the whole pass: the
  // flight is the picture's and no row's, exactly as the plane its structure stands on is (0248,
  // 0261).
  const flight = fractalFlight(sounding);
  // And where on its plane it has roamed to, off the same seconds, over the travel the read has
  // carried it through: the structure a stop is baked at is where the roam has got to, and the
  // stops the set carries are the population's own (0273).
  fractalRoamInto(roamed, seed, sounding);
  const depth = gratingDepth(count, PICTURE_FLOOR);
  const ref = geometryRef(width, height);
  let at = -1;
  // And where a fractal row stands among the structure's own rows, which is what that row's
  // fallback is slotted by instead of where it stands in the whole order: the picture's own
  // structure is the automators standing and not the places they are standing (`fractalKind`,
  // 0248), and a place arriving pushes a row of its own in ahead of it — so slotted by the order,
  // both fractal rows lose the tile they were last drawn with at every turnover, which is the
  // blink at the crossfade's edges 0249 left behind (0262). Counted over every fractal row in the
  // set and not over the ones drawn, so a row cut to nothing does not re-slot the other.
  let structure = -1;
  for (const row of rows) {
    at += 1;
    const fractal = isFractalGeometry(row.geometry);
    if (fractal) structure += 1;
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
    // The lattice over the whole of it: a pattern and not a place, so it is filled through the
    // straight rows' own cache rather than placed and drawn (`cutLattice`, 0278). **At its own
    // depth and never at the share the count solves for**: it is the field's gutter and not a
    // grating that beats, and a share of the picture's weight would draw it faintest exactly when
    // the rack is fullest — the moment it is tightest and has the most to show.
    if (row.geometry === LATTICE_GEOMETRY) {
      const gutter = washedDepth(row, wash);
      if (!cutLattice(field, ink, row, turns, gutter, shape, tint, dpr, aimed)) return false;
      continue;
    }
    if (straight) {
      if (!cutOctaves(field, ink, row, turns, pitch, cut)) return false;
      continue;
    }
    ink.globalAlpha = cut;
    // How far the picture has opened into its own structure: this row's breath, over the band the
    // performance behind it has earned (`agedOpening`, 0251) — and beside it, and no longer
    // multiplied into it, how far the same performance has flown through that structure. A scale
    // and a travel, which is the whole of 0268: the breath comes back and the travel never does.
    const order = placeCurved(
      row,
      fractal ? structure : at,
      pitch,
      width,
      height,
      ref,
      roamed,
      fractalZoom(turns, agedOpening(age)),
      flight,
      folds,
    );
    const held = curvedTileFor(order);
    // Nothing held for this row yet: its first tile is still being baked, so it draws nothing this
    // painting rather than holding the whole picture up for it (0144). Every other row goes on.
    if (held === null) continue;
    aimCurved(row, turns, held.place, aimed);
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
 *
 * What holds the picture's weight while the scales spread across it is `drawnGratings` counting
 * each copy as the share of a grating it actually cuts rather than as a whole one (`octaveShare`,
 * 0244) — the depth handed in here is already the answer to how much the picture weighs.
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
    ink.globalAlpha = octaveAlpha(depth, octave);
    if (!cutStraight(field, ink, row, turns, pitch * 2 ** octave)) return false;
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
 * And `age`, how old the performance behind it is on 0..1 (`driftAge`, src/lib/moireAge.ts), which
 * is the band the ink is carried across and the band the picture opens into its own structure over
 * (`agedOpening`, 0251). A picture with nothing sounding behind it is drawn at an
 * age of nought, which is the picture drawn before the instrument had been anywhere.
 *
 * And `seed`, where the picture's own structure has travelled to on its plane — the field's and no
 * row's, like the two above, and travelled there by the same read that filled them
 * (`fractalTravelInto`, 0248). A picture with no fractal row in it never reads it.
 *
 * And `sounding`, how long the deck behind it has sounded without a break in seconds — the number
 * `age` is resolved off (`DeckPeek.sounding`), handed in beside it because the flight through the
 * structure is spent in raw seconds where the age is spent on its own 0..1, and the paint is what
 * resolves it, once for the whole pass and for both fractal rows (`fractalFlight`, 0268).
 *
 * And `tint`, where the picture's colour has travelled to across its four dimensions — the field's
 * again, and travelled there by the same read that filled the rest (`inkTravelInto`,
 * src/ui/moireScreen.ts). What the rows claim is read off the boldest of them and is what the travel
 * is going toward; this is where it actually stands, and it is what the screen tile is keyed by.
 *
 * And `wind`, how far the standing rack's own tail has blown the whole field, in turns of one cell
 * of the screen's grid, and which way it is blowing — the field's again, and travelled there by the
 * same read (`windTravelInto`, src/ui/moireWind.ts, 0267). A picture with a dry rack behind it is
 * blown nowhere, which is the picture drawn before there was a tail in it. Handed in whole rather
 * than as the drift alone, because the direction is what a pass that displaces the field is offset
 * along (0282) and the two are one reading of one population (principle 1).
 *
 * And `looks`, every whole-field move the standing rack is making, in the rack's own order and each
 * at the presence the picture has travelled to (`rackLooks`, src/ui/moireLooks.ts, 0279). The chain
 * runs them where the field is taken back out of the screen; the ones that land elsewhere say so
 * at the declaration — how many times the plane is folded before every curved row is cut along it,
 * which reaches the tile's key; how far the finished field is bent, and how much of it is drawn back
 * through itself displaced, both spent in the slices the lens already reads it back in. A picture
 * with nothing standing behind it takes no pass at all, which is the picture drawn before there was
 * a rack in it.
 *
 * And `shape`, how that same rack shapes the whole field (`shapeTravelInto`, src/ui/moireShape.ts,
 * 0278): how tight a lattice stands over it, which is a pattern and costs a fill, and how far the
 * warp's wander has gone round, which the bend above is slid on.
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
  age: number,
  seed: Readonly<FractalStops>,
  sounding: number,
  tint: Readonly<ScreenInk>,
  wind: Readonly<MoireWind>,
  looks: readonly MoireLook[],
  shape: Readonly<MoireShape>,
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
  const dpr = viewOf(canvas).devicePixelRatio;
  const folds = looksFolds(looks);
  if (
    !cutGratings(
      field,
      ink,
      rows,
      windowSecs,
      dpr,
      count,
      wash,
      seed,
      age,
      sounding,
      shape,
      folds,
      tint,
    )
  ) {
    forget(canvas);
    endPainting();
    return;
  }
  feedFrame(canvas, field, ink, rows);
  // The screen, and then the product taken back out of it — so what is left is the ink everywhere
  // the gratings block and a window everywhere they agree, which is the picture.
  inkThrough(canvas, context, rows, color, tint, wind.drift);
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "destination-out";
  cutField(context, field, rows, looks, shape, wind.veer, sounding);
  context.globalCompositeOperation = "source-over";
  // A painting that wanted a tile it could not take asks to be drawn again: nothing else will,
  // because a halted yard is painted on a commit and not on a frame (0144).
  endPainting();
}

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
