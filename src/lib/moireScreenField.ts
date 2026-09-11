/**
 * @role One tile of the screen the drift picture is filmed off, written a pixel at a time into a
 *   field of bytes: the scene's own body under the film's four terms, the lattice of marks that
 *   body is read into, the second lattice and the scatter over it, and the three channels the ink
 *   is split across. **The whole of the pixel loop, and nothing that needs a document** — every
 *   colour it spends arrives resolved and every number it reads is in its order — because since
 *   0354 this loop runs in a worker where the browser has one, and in bands under a per-frame
 *   budget where it does not. A bake is a `for` over `bands()` in one task or a band a frame; the
 *   two write the same bytes.
 * @instead The terms themselves — the gratings, the blobs, the channels, the band and the pitches
 *   → src/lib/moireScreenFilm.ts. The canvas this field is put onto, the theme it is resolved
 *   against and the cache of finished tiles → src/ui/moireScreenTile.ts; which tile is wanted, which
 *   is drawn meanwhile and where the bake runs → src/ui/moireScreenShop.ts. The worker shell →
 *   src/workers/screen.ts. Where a cell stands and which mark it is cut into → `cellGrid`,
 *   src/lib/moireScreenCells.ts. The grounds the scenes lay down → src/lib/scene/.
 */
// One tile, written a pixel at a time, and every grating, lattice, band and ground is a term of
// that one pass. Every reading it unions is a module of its own already — the cells, the two
// further lattices, the film's terms, the scene and the stand — so the count of them is what a
// pixel loop made of named readings costs, and folding two together to satisfy a cap would be the
// premature abstraction principle 3 forbids.
// oxlint-disable import/max-dependencies Splitting it further would hand a helper the pixel loop's whole state on a path
// that must not allocate (0129). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { type Ink, ramp } from "@/lib/moireColour";
import type { MoireCells } from "@/lib/moireCells";
import { runCellPasses, type RunningCells } from "@/lib/moireCells";
import { LOOKS } from "@/lib/moireLook";
import { ALPHABETS, type AlphabetName, markCoverage } from "@/lib/moireAlphabets";
import { markBlur } from "@/lib/moireGlyph";
import type { ScreenInk } from "@/lib/moire";
import {
  type Scene,
  type SceneTerms,
  SCENE_LIGHT_TERMS,
  SCENE_RAMP_STOPS,
  SCENE_REACH_TERMS,
  SCENE_WIND_TERMS,
  sceneCells,
  sceneRepeat,
} from "@/lib/moireScene";
import { beatBlocks, beatInk } from "@/lib/moireScreenBeat";
import { cellBlocks, cellRead, PER_PIXEL } from "@/lib/moireScreenCells";
import {
  bandKeep,
  beatPx,
  blobKeep,
  channelAt,
  channelFringe,
  columnKeep,
  FILM_SHARE,
  filmStand,
  FLAT_GAIN,
  GLYPH_FLAT,
  rowKeep,
} from "@/lib/moireScreenFilm";
import { scatterBlocks, scatterCut, scatterInk, scatterRead } from "@/lib/moireScreenScatter";
import { standShade, standSpeck } from "@/lib/moireStand";
import { subscribeTuning } from "@/lib/moireTuning";
import { hold } from "@/lib/hold";
import { sceneOf } from "@/lib/scene/scenes";
import type { YardScene } from "@/lib/yardScene";

/**
 * Everything one tile is baked out of, as plain data. **This is the whole of what crosses to the
 * worker** (0354): no canvas, no `CSSStyleDeclaration` and no function — a scene is its name, the
 * theme is the five stops and the three gains already resolved off it, and the numbers a hand has
 * moved ride along as the tuning snapshot the port carries beside this. What a tile is *of* is the
 * key, which is written where the painter asks (`screenOf`, src/ui/moireScreen.ts).
 */
export type ScreenBake = {
  key: string;
  width: number;
  height: number;
  /** How much of the tile the canvas shows, which is what a stand's shade is placed against (0335). */
  seen: number;
  pitch: number;
  rowPitch: number;
  cell: number;
  beat: number;
  /** The caller's own ink. Only its alpha reaches the tile: the scene names all five stops (0332). */
  own: Ink;
  /** The scene's five stops, resolved off the theme and mixed toward the yard's own air. */
  lift: readonly Ink[];
  /** What each of the three lit channels does to the row's ink, resolved off the same theme. */
  gains: readonly (readonly [number, number, number])[];
  tint: ScreenInk;
  yard: YardScene;
  cells: readonly MoireCells[];
  /**
   * Which of the three alphabets this tile's marks are written in, as the name and never the table:
   * a bake crosses to a worker by `postMessage`, so what names an alphabet here has to be plain data
   * (0354). Off the standing part of the song (`partAlphabet`, src/lib/moireAlphabets.ts), and on the
   * key, so a section changing is one rebake and never a cell moved.
   */
  alphabet: AlphabetName;
};

/**
 * How many pixels of the tile one band of a bake covers. **The unit the paced fallback spends, and
 * nothing the worker reads** — off the thread the hand is on a bake runs every band in one task, and
 * on it the shop takes bands until its budget is gone (0354, src/ui/moireScreenShop.ts). Twenty
 * thousand is the width of a popped picture at two device pixels for four rows, which measured a
 * shade under a millisecond a band on the machine the checkpoint was run on: small enough that a
 * band cannot be the long task the whole loop was, and large enough that the `for` around it is not
 * what the bake costs.
 */
const BAND_PX = 20_000;

/** How many rows of `width` one band covers, never fewer than one. */
const bandRows = (width: number, deep: number): number =>
  Math.max(1, Math.floor(BAND_PX / Math.max(1, width * deep)));

/**
 * The scene's own body of a tile, baked once per what the *scene* is of and read by every tile of
 * it: where on its ramp each pixel stands, how far the shade over it and the film's four terms
 * pull that read back, and how bright a point stands there — three numbers a pixel, before the ink
 * has touched any of them. **This is the loop that costs**, the ground, the shade and the streaks,
 * and none of it moves with the ink: what walks while a yard sounds is the hue, the fringe, the
 * dispersion and the saturation (`inkTravelInto`, 0266, 0301), and every step of those was a whole
 * bake — measured at twenty to forty-six milliseconds apiece, three times a second, on the thread
 * the hand is on. Split so, a step re-reads this body and re-runs nothing of the scene.
 *
 * Room for both sizes of both yards a page shows with a little over: a body is three floats a
 * pixel and an overlay's is a megabyte, so this is the one cache here that is not kilobytes. **A
 * yard standing the second lattice wants two entries and not one** — the width is part of the key
 * and the fold moves it — and the grown one is as many times the megabyte as the tile is times as
 * wide (`screenTilePx`, 0351).
 */
const BODY_CACHE = 8;
const bodies = new Map<string, Float32Array>();

/**
 * And the three channels' lattices over one beat cell, baked once per how far the ink stands them
 * apart: the fringe repeats with the cell by construction (`channelKeep`), so a tile reads one cell
 * of it at `(x, y mod cell)` rather than running the three cosines at every pixel. A cell is
 * kilobytes.
 */
const FRINGE_CACHE = 16;
const fringes = new Map<string, Float32Array>();

// A number a tile is baked under moved, so every body and every fringe cell held under the old one
// is a picture of a ground the scene no longer draws (`moireTuning.ts` @instead). The tiles
// themselves are dropped where they are held (src/ui/moireScreenShop.ts).
subscribeTuning(() => {
  bodies.clear();
  fringes.clear();
});

/** Everything the field holds, forgotten. For tests: a module cache outlives one of them. */
export function forgetScreenField(): void {
  bodies.clear();
  fringes.clear();
}

/**
 * The standing passes an order names, with each look's own pass looked up. **The one place a name
 * becomes a function** — the order crosses to the worker as plain data and a function is the one
 * thing a `postMessage` cannot carry (0354) — and it is here rather than in src/lib/moireCells.ts
 * because a look's declaration reaches into that file, so a registry read from there closes a cycle.
 * A name whose look declares no pass runs nothing: a rack only ever holds the looks that declared
 * one (`rackCells`, src/ui/moireCells.ts), so that is a set from somewhere else and not a picture
 * to throw over.
 */
function cellPasses(cells: readonly MoireCells[]): RunningCells[] {
  const running: RunningCells[] = [];
  for (const cell of cells) {
    const pass = LOOKS[cell.look].cells;
    if (pass !== undefined) running.push({ ...cell, pass });
  }
  return running;
}

/** What the scene's maths is read against, for one order: the tile's own size and the yard's air. */
export function bakeTerms(order: ScreenBake): SceneTerms {
  return {
    width: order.width,
    height: order.height,
    seen: order.seen,
    lean: SCENE_WIND_TERMS[order.yard.wind].lean,
    reach: SCENE_REACH_TERMS[order.yard.reach],
    stand: order.yard.stand,
  };
}

/** The key a body is held under: everything the scene's maths reads, and nothing the ink moves. */
const bodyKey = (order: ScreenBake, terms: SceneTerms, share: number): string =>
  `${order.yard.scene}|${order.yard.wind}|${order.yard.reach}|${order.yard.stand}|${order.yard.specks}|${order.width}|${order.height}|${terms.seen}|${order.pitch}|${order.rowPitch}|${share}`;

/** One band of the body: the device rows `from` up to `to`, written into an array already made. */
function bodyRows(
  body: Float32Array,
  order: ScreenBake,
  terms: SceneTerms,
  scene: Scene,
  share: number,
  from: number,
  to: number,
): void {
  const { height, pitch, rowPitch, width } = order;
  const flock = order.yard.specks === "flock";
  const kept = order.yard.specks === "kept";
  for (let y = from; y < to; y++) {
    const down = rowKeep(y, rowPitch) * bandKeep(y, height);
    for (let x = 0; x < width; x++) {
      // How dark the film is here: the gratings, the lattice and the band, and nothing else — the
      // `screenKeep` product with its row half hoisted into `down` (0129). The scene spends none
      // of it: where the field stands is a colour and not an amount (0332).
      const keep = down * columnKeep(x, pitch) * blobKeep(x, y, pitch, rowPitch);
      const at = (y * width + x) * PER_PIXEL;
      // This pixel's own place on the scene's ramp, before the picture's hue has carried it.
      body[at] = scene.ground(x, y, terms);
      // And how far it is pulled toward the scene's own first stop, twice over: by whatever shade
      // the thing the yard stands by casts here, the wall, the steps, the grille or the mass, in
      // the field's own darkest ink and never as an object (0335); and then by the film's own
      // share of what its four terms take here, which is a shade over the field and no longer a
      // window cut in it (0340).
      body[at + 1] = (1 - standShade(x, y, terms)) * filmStand(keep, share);
      // And whatever bright points the name ends on — a flock of the scene's own or the one kept
      // thing at the foot of the shade.
      body[at + 2] = kept ? standSpeck(x, y, terms) : flock ? scene.specks(x, y, terms) : 0;
    }
  }
}

/** One beat cell of the three channels' lattices, at how far apart the ink stands them. */
function fringeOf(pitch: number, rowPitch: number, spread: number, disperse: number): Float32Array {
  const key = `${pitch}|${rowPitch}|${spread}|${disperse}`;
  const held = fringes.get(key);
  if (held !== undefined) return held;
  const wide = beatPx(pitch);
  const deep = beatPx(rowPitch);
  const cell = new Float32Array(wide * deep * PER_PIXEL);
  for (let y = 0; y < deep; y++) {
    for (let x = 0; x < wide; x++) {
      const lit = channelFringe(x, y, pitch, rowPitch, spread, disperse);
      const at = (y * wide + x) * PER_PIXEL;
      cell[at] = lit[0];
      cell[at + 1] = lit[1];
      cell[at + 2] = lit[2];
    }
  }
  return hold(fringes, key, cell, FRINGE_CACHE);
}

/**
 * The one ink a whole tile is read into: refilled by `ramp` at every cell and written straight out
 * into the field, because a build allocates a ramp and no more (0129, 0070).
 */
const read: Ink = [0, 0, 0, 0];

/**
 * One tile, written a pixel at a time — the one loop over the pixels there is, and since 0354 it
 * runs off the frame loop's own task in every browser that has a worker (0129 amended: never on a
 * frame becomes never in the frame's task). Every pixel is the scene's own ramp read **where that
 * pixel's ground stands on it**, pushed onto whichever of the three channels lights its third of
 * the cell, and shaded back by the gratings, the blob and the band crossing at that point.
 *
 * **The scene is the body of the picture and the screen is a shade over it** (0340, amending
 * 0332). What a yard's name says is which five stops the picture is read along and where on them
 * each pixel stands; the gratings, the beat they make and the rolling band pull that read toward
 * the field's own first stop by the film's share and take none of the alpha, so a canopy's grille
 * is dark leaf between lit leaf rather than a window onto the page, and a parameter that moved the
 * screen still moves the scene (0329). The three channels are a fringe on the colour and never
 * touched the alpha either (0130).
 *
 * Yielded between bands rather than run straight through: a band is `BAND_PX` pixels of whichever
 * reading is standing, and what decides how many of them a task takes is the caller — every one,
 * in the worker; as many as a per-frame budget allows, in the shop's fallback.
 */
// oxlint-disable-next-line max-lines-per-function
export function* bands(order: ScreenBake, pixels: Uint8ClampedArray): Generator<void, void, void> {
  const { beat, cell, height, pitch, rowPitch, tint, width } = order;
  const scene = sceneOf(order.yard.scene);
  const passes = cellPasses(order.cells);
  const terms = bakeTerms(order);
  // Read once a tile and not once a pixel: the share is baked into the body's key, `tuneStamp()`
  // keys the tile, and a handle read in the pixel loop would be a property read three hundred
  // thousand times (0070).
  const share = FILM_SHARE.value;
  // How far a light that falls through the field slides the read up the scene's own ramp, and
  // nought where the air is a wash or the name says no air at all.
  const falling = order.yard.spread === "fall" ? SCENE_LIGHT_TERMS[order.yard.light].amount : 0;
  // The scene's body, held across every tile of the same scene: what the loop below does per pixel
  // is read the ink along the ramp and split it, and nothing heavier.
  const key = bodyKey(order, terms, share);
  let body = bodies.get(key);
  if (body === undefined) {
    const made = new Float32Array(width * height * PER_PIXEL);
    const step = bandRows(width, 1);
    for (let y = 0; y < height; y += step) {
      bodyRows(made, order, terms, scene, share, y, Math.min(height, y + step));
      yield;
    }
    body = hold(bodies, key, made, BODY_CACHE);
  }
  const lattices = fringeOf(pitch, rowPitch, tint.fringe, tint.disperse);
  const deep = beatPx(rowPitch);
  // The lattice of marks (0345): a cell snapped on each axis so a whole number of them span the
  // tile and the pattern comes round (`sceneRepeat`), and the mark's four soft reads a quarter of
  // a device pixel apart. Where every cell stands and which mark it is written in — the box read,
  // the cut, and the standing rack's own passes over the marks that follow — is the grid baked
  // beside this file (`cellRead`, src/lib/moireScreenCells.ts, 0348, 0349). So one colour and one
  // mark from edge to edge, the colour refilled once a cell row and not once a pixel.
  const across = sceneRepeat(width, cell);
  const downCell = sceneRepeat(height, cell);
  const cols = sceneCells(width, cell);
  const rows = sceneCells(height, cell);
  const grid = cellBlocks(cols, rows);
  const gridStep = bandRows(width, downCell);
  for (let row = 0; row < rows; row += gridStep) {
    const to = Math.min(rows, row + gridStep);
    cellRead(grid, body, width, height, across, downCell, cols, tint.hue, falling, row, to);
    yield;
  }
  runCellPasses(grid.marks, cols, rows, passes);
  // And the second lattice, on the row pitch's own cell where that one is on the column pitch's —
  // seven device pixels against five — brought in by how full the rack is and absent entirely at
  // nought, which is the tile 0350 shipped (`beatBlocks`, src/lib/moireScreenBeat.ts).
  const second = beat > 0 ? beatBlocks(width, height, rowPitch, beat) : null;
  if (second !== null) {
    const step = bandRows(width, rowPitch);
    for (let row = 0; row < second.rows; row += step) {
      const to = Math.min(second.rows, row + step);
      cellRead(
        second.grid,
        body,
        width,
        height,
        rowPitch,
        rowPitch,
        second.cols,
        tint.hue,
        falling,
        row,
        to,
      );
      yield;
    }
    runCellPasses(second.grid.marks, second.cols, second.rows, passes);
  }
  // And the scatter: the body's own bright points, read three cells at a time and laid as one big
  // mark over both (`scatterRead`, src/lib/moireScreenScatter.ts). Only where the yard's detail
  // put points there at all — a scene read for its own specks stands them at nought in the body,
  // so the grid would be a grid of the blank mark and a bake nobody sees.
  const scatter =
    order.yard.specks === "own" ? null : scatterBlocks(width, height, across, downCell);
  if (scatter !== null) {
    const step = bandRows(width, scatter.down);
    for (let row = 0; row < scatter.rows; row += step) {
      scatterRead(scatter, body, width, height, row, Math.min(scatter.rows, row + step));
      yield;
    }
    scatterCut(scatter);
  }
  const blur = markBlur(across);
  // The one alphabet every lattice of this tile is written in, looked up once a bake: the fine
  // lattice, the rack's second one and the specks' scatter are one picture in one hand (0351, 0352).
  const alphabet = ALPHABETS[order.alphabet];
  const flat = GLYPH_FLAT.value;
  const lift = order.lift;
  const mid = lift[Math.floor(SCENE_RAMP_STOPS / 2)] ?? [0, 0, 0, 0];
  const colOf = Int32Array.from({ length: width }, (_, x) =>
    Math.min(cols - 1, Math.floor(x / across)),
  );
  const uAt = Float32Array.from({ length: width }, (_, x) => (x % across) / across);
  const cellInk = new Float32Array(cols * PER_PIXEL);
  let filled = -1;
  // Which channel lights each column, resolved once a column rather than once a pixel.
  const gainAt = Array.from(
    { length: width },
    (_, x) => order.gains[channelAt(x, pitch)] ?? FLAT_GAIN,
  );
  // And where in the three channels' own cell each column reads: **on that cell's stride and never
  // on the tile's**, because since 0351 a tile standing a second lattice is several of those cells
  // wide and a column past the first would otherwise walk into the wrong row of the fringe. Once a
  // column rather than once a pixel, for the reason every other read in this loop is (0070).
  const wide = beatPx(pitch);
  const fringeAt = Int32Array.from({ length: width }, (_, x) => (x % wide) * PER_PIXEL);
  const alpha = order.own[3];
  const pixelStep = bandRows(width, 1);
  for (let band = 0; band < height; band += pixelStep) {
    const stop = Math.min(height, band + pixelStep);
    for (let y = band; y < stop; y++) {
      const cellRow = Math.floor(y / downCell);
      if (cellRow !== filled) {
        filled = cellRow;
        for (let c = 0; c < cols; c++) {
          // The ink this cell is written in: the ramp read at the cell's own stand, pulled toward
          // the ramp's middle stop by however flat the picture is asked to be. **At its stand and
          // never at its mark** — the push and every pass over the cells move which mark a cell is
          // written in and not one stop of the colour underneath it (0348, 0349).
          const inked = ramp(lift, grid.stood[cellRow * cols + c] ?? 0, read);
          const at = c * PER_PIXEL;
          cellInk[at] = inked[0] + (mid[0] - inked[0]) * flat;
          cellInk[at + 1] = inked[1] + (mid[1] - inked[1]) * flat;
          cellInk[at + 2] = inked[2] + (mid[2] - inked[2]) * flat;
        }
      }
      const v = (y - cellRow * downCell) / downCell;
      const lattice = (y % deep) * wide * PER_PIXEL;
      for (let x = 0; x < width; x++) {
        const col = colOf[x] ?? 0;
        const inked = col * PER_PIXEL;
        // Which colour its flanks are: three lattices a lag apart, each carrying its own channel of
        // the ink read above and never more of it than that ink had — one cell of them, repeated.
        const lit = lattice + (fringeAt[x] ?? 0);
        const gain = gainAt[x] ?? FLAT_GAIN;
        const at = (y * width + x) * 4;
        pixels[at] = (cellInk[inked] ?? 0) * gain[0] * (lattices[lit] ?? 1);
        pixels[at + 1] = (cellInk[inked + 1] ?? 0) * gain[1] * (lattices[lit + 1] ?? 1);
        pixels[at + 2] = (cellInk[inked + 2] ?? 0) * gain[2] * (lattices[lit + 2] ?? 1);
        // The alpha is the mark's coverage of the caller's whole (0345, amending 0340): how solid
        // the picture is still belongs to the surface it is on (0141), and what a mark leaves
        // uncovered is the page, which is the ground this lattice is written on. The screen's own
        // four terms still reach none of it: what they spend, they spend as darkness up on the
        // read (0340).
        const mark = grid.marks[cellRow * cols + col] ?? 0;
        let cover = markCoverage(alphabet, mark, uAt[x] ?? 0, v, blur);
        // Unioned with the second lattice's, where the rack stands one, and with the scatter's,
        // where the yard's detail stands one: the solidest of the marks and never their sum,
        // because every lattice here is one picture in one ink and a cell under two of them is no
        // more solid than the solider (0345).
        if (second !== null) cover = Math.max(cover, beatInk(second, x, y, alphabet));
        if (scatter !== null) cover = Math.max(cover, scatterInk(scatter, x, y, alphabet));
        pixels[at + 3] = alpha * cover;
      }
    }
    yield;
  }
}

/** Every band of one bake, in one task: what a worker does, and what a Node test reads back. */
export function screenField(order: ScreenBake, pixels: Uint8ClampedArray): void {
  const steps = bands(order, pixels);
  while (steps.next().done !== true) continue;
}
