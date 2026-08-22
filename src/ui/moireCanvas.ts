/**
 * @role The one painter of drift: a canvas kept sized to its element and to the display, holding
 *   one horizontal band per row it is handed — a lane, an instance in the rack, the loop — each a
 *   continuous wave: a phase field sampled across the window, never a run of ticks laid down one
 *   at a time. The rows are wider than their own band, so they
 *   overlap, beat against each other, and the fringes are the picture. One painter serves the
 *   strip and the overlay, across the one window both ask for: the large picture is the small one
 *   at size, never a second set of drawing rules.
 *
 *   The rows are not inked flat but through the screen a camera would have been pointed at (P90):
 *   one repeating tile carrying the three terms the reference shows — the unlit gap between the
 *   screen's columns, the scan line crossing them, one broad rolling band. Built when the colour,
 *   the height or the density moves and shifted on a frame, so all three cost one `fillStyle`.
 * @instead The periods, how long they take to line up, and a lane's own bend → src/lib/moire.ts.
 *   The canvas this paints on — its size, its density, its colour and its frame loop →
 *   src/ui/canvasSurface.ts, which every surface that draws itself moving shares.
 *   Peaks → src/ui/peakCanvas.ts, which is this file's sibling and not its source: both sample a
 *   field across the canvas's columns, but peaks reduce recorded audio and this evaluates a closed
 *   form, so there is nothing of one to borrow for the other.
 */
/**
 * One row: how long its cycle is in real seconds, how far into that cycle it has reached, the fold
 * it is drawn from — its parameter's, or its instance's own id — which picks both the waveform and
 * where in its cycle it starts — the lane's own gesture across that cycle,
 * and whether it is the reference the others are read against. Allocated once per set of rows and
 * refilled in place, because `phase` is a per-frame read (0070) — and `shape` and `bend` are the
 * row's identity rather than its motion, so neither of them changes between frames.
 */
export type MoireRow = {
  period: number;
  phase: number;
  reference: boolean;
  shape: number;
  bend: readonly number[];
};

/** How much of the ink the reference row gets: present, and plainly underneath (no literal). */
const REFERENCE_ALPHA = 0.35;

/**
 * How much of the ink a lane's row gets. Under one on purpose: overlapping rows are what make a
 * fringe, and a fringe is where two translucent crests land on the same pixel.
 */
const ROW_ALPHA = 0.55;

/**
 * How far a row's crest reaches from the middle of its own band, as a fraction of that band. Past
 * a half, so neighbouring rows overlap and interfere rather than sitting in stripes; the top and
 * bottom rows spill off the canvas at a crest, which is a wave running past the edge and not a
 * clipped rectangle.
 */
const ROW_SPREAD = 0.9;

/**
 * The band, in CSS pixels, the three proportions above were chosen at. Every one of them is read
 * against the band a row actually gets rather than left fixed, because a crest wider than the band
 * it beats against is a blob: at a fixed pitch a folded-down strip loses its fringes instead of
 * tightening them (P69). CSS pixels and not the canvas's own: how wide a crest is against its band
 * is a proportion, and a proportion that moved with the display would draw one yard three ways on
 * three screens and re-pitch itself under a browser zoom.
 */
const REFERENCE_BAND_PX = 48;

/** How much denser than that band the picture is ever drawn, before the pixels get a say. */
const MAX_DENSITY = 8;

/**
 * The narrowest a cycle of any row may be drawn, in device pixels. The pixels have the last word on
 * the density: the field is sampled every `SAMPLE_PX`, and a cycle narrower than a few of those is
 * aliasing rather than interference. How narrow a cycle a density buys depends on the window and
 * the fastest row in it, so the bound is taken there and not on the ratio.
 */
const MIN_CYCLE_PX = 8;

/**
 * The most of its own band a crest may reach: its neighbour, and its neighbour's neighbour, and no
 * further — past that every row covers the whole picture and the fringes wash out, which is the
 * blob again by the other road. And the most ink a row may spend over what it spends at the
 * reference band. The ink is a gain on each row rather than a ceiling both share, so the reference
 * stays underneath at every density instead of catching up with the rows at the top.
 */
const MAX_ROW_SPREAD = 1.8;
const MAX_INK_GAIN = 1.5;

/**
 * How many times its own pitch a row is drawn at, given the band of `bandPx` CSS pixels it has to
 * beat inside. One at the band the proportions were chosen at and more below it, so a minimised
 * strip is a denser moiré and not a coarser one; never under one, because a taller canvas is a
 * bigger picture of the same thing rather than a slower one. A band of no pixels is the densest
 * the picture goes rather than a division by zero.
 */
export function rowDensity(bandPx: number): number {
  if (!(bandPx > 0)) return MAX_DENSITY;
  return Math.min(MAX_DENSITY, Math.max(1, REFERENCE_BAND_PX / bandPx));
}

/** How far a crest reaches at that density: a denser picture spends more of its band overlapping. */
export const rowSpread = (density: number): number =>
  Math.min(MAX_ROW_SPREAD, ROW_SPREAD * density);

/**
 * How much ink one row carries at that density. The root of it, not the whole: a fringe is two
 * translucent crests multiplied, so the pair carries the density and neither row carries it alone.
 */
export const rowAlpha = (reference: boolean, density: number): number =>
  (reference ? REFERENCE_ALPHA : ROW_ALPHA) * Math.min(MAX_INK_GAIN, Math.sqrt(density));

/** How far the lane's own value bends the wave, in turns: a crowding of fringes, not a redraw. */
const BEND_TURNS = 0.35;

/**
 * Where in its own cycle a row starts, in turns. There are more parameters than there are
 * waveforms, so the waveform alone cannot keep two of them apart: the fold picks the waveform by
 * its remainder and the whole of it turns the row, exactly as an effect's two pools are drawn from
 * one fold (src/lib/copy.ts). Two parameters draw the same row only if they fold to the same
 * number, which is what the fold exists not to do.
 */
const rowOffset = (shape: number): number => (shape % FOLD_TURNS) / FOLD_TURNS;

/** The width of the fold, so the whole of it is spread across one cycle rather than a corner. */
const FOLD_TURNS = 2 ** 32;

/** How many device pixels one sample of the phase field covers. */
const SAMPLE_PX = 2;

const TAU = 2 * Math.PI;

/**
 * `value` inside one span of `span`, never negative — a turn as a fraction of itself, a device
 * pixel as its place in a tile. Once, because this file wraps in five places (principle 3).
 */
const wrap = (value: number, span: number): number => ((value % span) + span) % span;

/**
 * How far apart the lit columns of the screen this picture is filmed off are, in CSS pixels — the
 * finest term a camera pointed at a monitor adds, and the one the others are measured against. CSS
 * pixels for the reason `REFERENCE_BAND_PX` is: how coarse the screen looks is a proportion, and
 * one that moved with the display would draw a different screen on every screen. Never under two
 * device pixels, because a pitch of one is a lit column with nowhere to put its gap.
 */
const GRID_PX = 3;

/** How many pitches apart the scan lines run: a camera crosses the grid rather than lying in it. */
const SCAN_PITCH = 3;

/**
 * How much of a row's ink survives the unlit gap between two columns, and under a scan line. Both
 * well over nothing: this is a texture over the picture and not a mask cut out of it, and a fringe
 * is two translucent crests multiplied, so anything the screen takes it takes twice.
 */
const COLUMN_KEEP = 0.5;
const SCAN_KEEP = 0.8;

/** How much of the ink the rolling band takes at its darkest. Shallow, for the reason above. */
const BAND_DEPTH = 0.25;

/** The screen's pitch in device pixels on a display of `dpr`: what a tile is measured in. */
export const gridPitchPx = (dpr: number): number => Math.max(2, Math.round(GRID_PX * dpr));

/** The ink kept at device column `x` of a tile of `pitch`: the last of every pitch is the gap. */
export const columnKeep = (x: number, pitch: number): number =>
  wrap(x, pitch) === pitch - 1 ? COLUMN_KEEP : 1;

/**
 * How tall the tile is for a canvas of `height` device pixels: the canvas rounded up to a whole
 * number of scan pitches, never under one. Both terms have to come round at the tile's end or the
 * tile does not repeat — the band is one cosine across whatever this returns, but the scan lines
 * are on a fixed pitch, and a canvas that is not a whole number of them leaves one long gap in the
 * grid. The tile is shifted rather than rebuilt, so that gap would be an edge riding down the
 * picture once a cycle: the artefact these terms are here instead of. Up rather than down, so a
 * strip shorter than one scan pitch still has a line in it — what spills past the bottom is a
 * screen larger than the window onto it, not a missing term.
 */
export const tilePx = (height: number, pitch: number): number => {
  const scan = pitch * SCAN_PITCH;
  return Math.max(1, Math.ceil(height / scan)) * scan;
};

/**
 * How much of the ink the screen keeps at device row `y` of a tile `height` tall: the scan line
 * every `SCAN_PITCH` pitches, under the rolling band — one whole cosine across the tile, so a tile
 * laid end to end comes back round rather than arriving as an edge, at the height `tilePx` gives.
 */
export function scanKeep(y: number, pitch: number, height: number): number {
  const scan = pitch * SCAN_PITCH;
  const line = wrap(y, scan) === scan - 1 ? SCAN_KEEP : 1;
  if (!(height > 0)) return line;
  return line * (1 - BAND_DEPTH * (0.5 + 0.5 * Math.cos(TAU * (y / height))));
}

/**
 * Where the tile has rolled to, in turns of its own height. The picture's own motion carries it and
 * never a clock of its own: a halted yard is painted and not animated (0040), so a band on a second
 * clock would travel across a frozen picture, and there is no second frame loop to run one. The
 * reference row is the deck's read position, so the band drifts while the deck plays and stops
 * where it stops. Exactly one traverse per reference cycle, the only rate at which a band riding a
 * phase that wraps arrives back where it left — what beats against it is every other row, each on
 * its own period, which is the picture's whole subject.
 */
export function bandTurns(rows: readonly MoireRow[]): number {
  for (const row of rows) {
    if (!row.reference || row.period <= 0) continue;
    return wrap(row.phase / row.period, 1);
  }
  return 0;
}

/**
 * The waveforms a row can be drawn with, picked by the parameter the lane belongs to, so two
 * lanes of the same period on different parameters never draw the same row. All continuous and
 * all bounded by ±1: what varies is where a cycle puts its ink, which is what a fringe is made of.
 */
export const ROW_SHAPES = [
  (turns: number) => Math.sin(TAU * turns),
  (turns: number) => 4 * Math.abs(wrap(turns, 1) - 0.5) - 1,
  (turns: number) => Math.sin(TAU * turns) ** 3,
  (turns: number) => 0.5 * (Math.sin(TAU * turns) + Math.sin(2 * TAU * turns)),
] as const satisfies readonly [(turns: number) => number, ...((turns: number) => number)[]];

/** How many samples of the phase field a canvas of `width` device pixels is drawn from. */
export const rowSamples = (width: number): number => Math.max(2, Math.ceil(width / SAMPLE_PX));

/**
 * The lane's normalized value a fraction `turns` of the way through its cycle, read out of the
 * table sampled when the row was built and interpolated, so what bends the wave is continuous
 * too. A table of one value is a lane that never moved and bends nothing.
 */
export function bendAt(bend: readonly number[], turns: number): number {
  const first = bend[0] ?? 0.5;
  if (bend.length < 2) return first;
  const at = wrap(turns, 1) * bend.length;
  const low = Math.floor(at);
  const lower = bend[low % bend.length] ?? first;
  const upper = bend[(low + 1) % bend.length] ?? first;
  return lower + (at - low) * (upper - lower);
}

/**
 * How much ink the row carries `at` seconds into the window, from 0 at a trough to 1 at a crest.
 * The period sets the pitch, the phase slides the whole field left as the deck plays, the lane's
 * own values bend it, and the parameter picks the waveform. `density` multiplies the pitch and
 * nothing else — every row of one picture is drawn at the same one, so what it tightens is the
 * whole field and never the ratio between two rows, which is where a fringe comes from. The row's
 * own offset is its identity rather than its pitch, so the density leaves it where it is.
 */
export function rowInk(row: MoireRow, at: number, density = 1): number {
  const turns = (density * (at + row.phase)) / row.period + rowOffset(row.shape);
  const shape = ROW_SHAPES[row.shape % ROW_SHAPES.length] ?? ROW_SHAPES[0];
  const bent = turns + BEND_TURNS * (bendAt(row.bend, turns) - 0.5);
  return Math.min(1, Math.max(0, 0.5 + 0.5 * shape(bent)));
}

/**
 * The densest the pixels will carry: the fastest row in the picture decides for all of them, since
 * one density is what keeps the ratios between rows intact. Never under one, so this bound only
 * ever declines the tightening a short band asked for — it can make the picture no coarser than
 * the pitch the rows already had.
 */
export function affordableDensity(
  rows: readonly MoireRow[],
  windowSecs: number,
  width: number,
): number {
  let shortest = Infinity;
  for (const row of rows) if (row.period > 0 && row.period < shortest) shortest = row.period;
  if (!Number.isFinite(shortest) || windowSecs <= 0) return MAX_DENSITY;
  return Math.max(1, (width * shortest) / (MIN_CYCLE_PX * windowSecs));
}

/** One row's field, grown when a bigger canvas asks and refilled after: 0070 allocates nothing. */
let field = new Float32Array(0);

/**
 * The screen each canvas is drawn through: one column of the grid, holding the gap, the scan lines
 * and the band at once. Per canvas rather than one slot, because the strip and the overlay are two
 * heights and a single slot would rebuild the tile twice a frame while both are up.
 */
const screens = new WeakMap<
  HTMLCanvasElement,
  { pattern: CanvasPattern; color: string; height: number; pitch: number }
>();

/** The tile's offset, one object refilled: a per-frame paint allocates nothing (0070). */
const rolled = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * The screen `canvas` is drawn through, built only when the colour, the height or the density it
 * was built at has moved. The gaps are taken back out of a full tile rather than laid onto an empty
 * one, so nothing here names a colour: what is removed is the row's own resolved ink
 * (docs/boundaries.md). A canvas whose engine hands back no tile context and no pattern is drawn in
 * flat ink, which is the picture this file drew before the screen was over it.
 */
function screenOf(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  color: string,
  pitch: number,
): CanvasPattern | null {
  const height = tilePx(canvas.height, pitch);
  const held = screens.get(canvas);
  if (held?.color === color && held.height === height && held.pitch === pitch) return held.pattern;
  const tile = document.createElement("canvas");
  tile.width = pitch;
  tile.height = height;
  const ink = tile.getContext("2d");
  if (ink === null) return null;
  ink.fillStyle = color;
  ink.fillRect(0, 0, pitch, height);
  ink.globalCompositeOperation = "destination-out";
  for (let y = 0; y < height; y++) {
    const gone = 1 - scanKeep(y, pitch, height);
    if (gone <= 0) continue;
    ink.globalAlpha = gone;
    ink.fillRect(0, y, pitch, 1);
  }
  // Through `columnKeep` and not around it: where the unlit column sits and how much it keeps is
  // one fact, and a painter that restated it could move the gap without a test noticing.
  for (let x = 0; x < pitch; x++) {
    const gone = 1 - columnKeep(x, pitch);
    if (gone <= 0) continue;
    ink.globalAlpha = gone;
    ink.fillRect(x, 0, 1, height);
  }
  const pattern = context.createPattern(tile, "repeat");
  if (pattern === null) return null;
  screens.set(canvas, { pattern, color, height, pitch });
  return pattern;
}

/**
 * Set the ink every row is filled with: the screen, shifted to where the band has rolled to, or the
 * flat colour where the engine would not build one. Whole device pixels, so the grid crawls with
 * the band rather than shimmering — a band this slow cannot tell, and the columns can.
 */
function inkThrough(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  rows: readonly MoireRow[],
  color: string,
): void {
  context.fillStyle = color;
  const pitch = gridPitchPx(devicePixelRatio);
  const pattern = screenOf(canvas, context, color, pitch);
  if (pattern === null) return;
  // Over the tile's own height and not the canvas's: the band is one cycle of the tile, so a turn
  // of it has to be a tile and the wrap has to land where the tile repeats.
  rolled.f = Math.round(bandTurns(rows) * tilePx(canvas.height, pitch));
  pattern.setTransform(rolled);
  context.fillStyle = pattern;
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
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  if (rows.length === 0 || windowSecs <= 0) return;
  inkThrough(canvas, context, rows, color);
  const samples = rowSamples(width);
  if (field.length < samples + 1) field = new Float32Array(samples + 1);
  const rowHeight = height / rows.length;
  // Everything the picture's proportions are is read off the band one row gets, here and once
  // (P69): the pitch it is drawn at, how far it reaches out of that band, and how hard it inks.
  // Back in CSS pixels, because the backing store is sized to the display and the proportion is
  // not — the same strip is the same picture on every screen.
  const density = Math.min(
    rowDensity(rowHeight / devicePixelRatio),
    affordableDensity(rows, windowSecs, width),
  );
  const spread = rowHeight * rowSpread(density);
  rows.forEach((row, index) => {
    if (row.period <= 0) return;
    const middle = (index + 0.5) * rowHeight;
    context.globalAlpha = rowAlpha(row.reference, density);
    for (let sample = 0; sample <= samples; sample++) {
      field[sample] = spread * rowInk(row, (sample / samples) * windowSecs, density);
    }
    // One ribbon rather than one rectangle per cycle: out along the crest and back along the
    // trough, so the row is a single filled path whose thickness is the wave itself.
    context.beginPath();
    context.moveTo(0, middle - (field[0] ?? 0));
    for (let sample = 1; sample <= samples; sample++) {
      context.lineTo((sample / samples) * width, middle - (field[sample] ?? 0));
    }
    for (let sample = samples; sample >= 0; sample--) {
      context.lineTo((sample / samples) * width, middle + (field[sample] ?? 0));
    }
    context.closePath();
    context.fill();
  });
  context.globalAlpha = 1;
}
