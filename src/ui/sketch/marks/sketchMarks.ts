/**
 * @role The eight fields the marks bench draws — one per direction the lattice of marks could be
 *   pushed in past 0346: a cell's read pushed toward the ends of its ramp, a second lattice at a
 *   held ratio, the delay's echoes and the reverb's bloom written in marks rather than in the
 *   field, a landing's push decaying down the loop, an alphabet per character, a scatter of big
 *   marks over the fine ones, and the sound's rows as a lattice of their own — and the one dial
 *   each is drawn under. Every field answers whether a point of the picture is inked, nought or
 *   one, in one ink on the page (0346): the real marks over the shipped bloom under the shipped
 *   film, no canvas, no clock, no context, so each is provable here and painted there.
 * @instead The marks and the wrap onto them, which these read and never restate →
 *   src/lib/moireGlyph.ts. The three alphabets the part swaps between → src/ui/sketch/marks/sketchMarksAlphabet.ts. The scene, the film and the bench's own display → src/ui/sketch/sketchDrift.ts.
 *   The walk that is the clock and the song here → src/ui/sketch/sketchWalk.ts. The page these
 *   are mounted on → src/ui/sketch/MarksPage.tsx. The tile these argue about →
 *   src/ui/moireScreenTile.ts, which this never reads.
 */
import { GLYPH_COUNT, GLYPH_PHASE, markAt, markCoverage } from "@/lib/moireGlyph";
import { ECHO_CAP, echoSpacing } from "@/lib/moireEchoes";
import { sceneCells } from "@/lib/moireScene";
import type { PlayerCharacter } from "@/lib/playerCast";
import { clamp } from "@/lib/range";
import { FILM_SHARE, filmStand, gridPitchPx } from "@/ui/moireScreenTile";
import {
  BENCH_DPR,
  filmKeep,
  SCENE_BENCH_PX,
  SCENE_DIAL,
  sceneField,
  type SketchDial,
  type SketchDriftField,
} from "@/ui/sketch/sketchDrift";
import {
  ALPHABETS,
  alphabetCoverage,
  type AlphabetName,
} from "@/ui/sketch/marks/sketchMarksAlphabet";
import { FIELD_ASPECT, lit, weave } from "@/ui/sketch/sketchField";
import {
  fixtureAt,
  SKETCH_STANDING,
  SKETCH_WALK,
  type SketchLanding,
} from "@/ui/sketch/sketchWalk";

/**
 * How many cells stand in the picture's height: the screen's own column pitch at the bench's
 * display over one scene's ground, which is the cell the tile writes its marks in (0346), and how
 * many stand across at that size. The cell is stated as a share of the height so every field here
 * reads picture units the way the drift bench's do.
 */
export const ROWS = sceneCells(SCENE_BENCH_PX, gridPitchPx(BENCH_DPR));
export const CELL = 1 / ROWS;
export const COLS = Math.ceil(FIELD_ASPECT * ROWS);

/** One cell of one lattice, as a key: a row of cells is never this wide. */
const KEY_STRIDE = 1024;
const keyOf = (col: number, row: number): number => row * KEY_STRIDE + col;

/**
 * A value held per cell per setting, because the stage asks a pixel at a time and a cell is many
 * of them: a mark chosen once per cell is a lattice, and a mark chosen per pixel is the scene run
 * a hundred times over per paint (entry 11's reason, src/ui/sketch/sketchDrift.ts).
 */
function held(
  cache: Map<number, Map<number, number>>,
  setting: number,
  col: number,
  row: number,
  make: () => number,
): number {
  let cells = cache.get(setting);
  if (cells === undefined) {
    cells = new Map();
    cache.set(setting, cells);
  }
  const key = keyOf(col, row);
  const kept = cells.get(key);
  if (kept !== undefined) return kept;
  const made = make();
  cells.set(key, made);
  return made;
}

/** How many points a side one cell is read at, for its mean. */
const SAMPLES = 4;

const bloom = sceneField("bloom");

/**
 * Where one cell of the lattice stands on the bloom's ramp: the film's shade over the scene's own
 * read, averaged over the cell, which is how the tile reads a cell (0345). Held per cell size,
 * because the beat reads a second lattice at another size.
 */
const stoodCells = new Map<number, Map<number, number>>();
export function stood(col: number, row: number, cell = CELL): number {
  return held(stoodCells, cell, col, row, () => {
    let sum = 0;
    for (let j = 0; j < SAMPLES; j += 1) {
      for (let i = 0; i < SAMPLES; i += 1) {
        const x = (col + (i + 0.5) / SAMPLES) * cell;
        const y = (row + (j + 0.5) / SAMPLES) * cell;
        sum +=
          filmStand(filmKeep(x * SCENE_BENCH_PX, y * SCENE_BENCH_PX), FILM_SHARE.rest) *
          bloom(x, y, SCENE_DIAL.rest);
      }
    }
    return sum / (SAMPLES * SAMPLES);
  });
}

/** Which mark a cell at `col, row` is written in: the shipped read, the shipped wrap. */
export const plainMark = (col: number, row: number): number =>
  markAt(stood(col, row), GLYPH_COUNT, GLYPH_PHASE.rest);

/**
 * Whether the point `x, y` is under the ink of a lattice of `cell`-sized cells, each written in
 * the mark `markOf` chooses for it. Read hard rather than soft, for entry 11's reason: the bench
 * is read at its own pixels and a soft edge is the painter's business.
 */
export function latticeInk(
  x: number,
  y: number,
  cell: number,
  markOf: (col: number, row: number) => number,
): number {
  const col = Math.floor(x / cell);
  const row = Math.floor(y / cell);
  return markCoverage(markOf(col, row), x / cell - col, y / cell - row, 0);
}

/** The picture with nothing done to it: entry 11 of the drift bench, on the bloom, in one ink. */
export const plainField = (x: number, y: number): number => latticeInk(x, y, CELL, plainMark);

/**
 * 01 — a cell's read pushed toward the ends of its ramp before it is cut into marks, so most of a
 * field stands at a sparse mark and only a band of it wraps through the dense ones (docs/plan.md,
 * the marks block's fifth step). The dial is how hard the push is: at nought the read is the
 * scene's own, and the lattice reads denser than the reference it was drawn against (0346).
 */
export const GROUND_DIAL: SketchDial = { min: 0, max: 4, step: 0.25, rest: 1 };
export const pushRead = (value: number, push: number): number =>
  clamp(0.5 + (value - 0.5) * (1 + push), 0, 1);
export const groundField: SketchDriftField = (x, y, push) =>
  latticeInk(x, y, CELL, (col, row) =>
    markAt(pushRead(stood(col, row), push), GLYPH_COUNT, GLYPH_PHASE.rest),
  );

/**
 * 02 — a second lattice of marks at a cell a held ratio larger, laid over the first in the one
 * ink, so grid beats against grid the way the two gratings under the screen do. The dial is the
 * ratio; at one the two are the one lattice drawn twice.
 */
export const BEAT_DIAL: SketchDial = { min: 1, max: 2, step: 0.05, rest: 1.4 };
export const beatField: SketchDriftField = (x, y, ratio) => {
  const cell = CELL * ratio;
  return Math.max(
    plainField(x, y),
    latticeInk(x, y, cell, (col, row) =>
      markAt(stood(col, row, cell), GLYPH_COUNT, GLYPH_PHASE.rest),
    ),
  );
};

/**
 * How many cells apart the delay's repeats stand: the look's own spacing, a share of the field
 * (`echoSpacing`), in cells across it — and at least one, because half a ghost is not a draw.
 */
export const echoCells = (spacing: number): number =>
  Math.max(1, Math.round(echoSpacing(spacing) * COLS));

/**
 * 03 — the delay's echoes written in marks: a cell's mark repeated along its row, the cap's worth
 * of times, each copy one mark lighter than the last, and a cell written in the heaviest of what
 * stands on it. The dial is the look's own spacing term. Never absent — a delay with nothing fed
 * back still repeats once (`echoCount`, src/lib/moireEchoes.ts) — so at nought the repeats stand
 * one cell apart rather than not at all.
 */
export const ECHOES_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.4 };
const echoedCells = new Map<number, Map<number, number>>();
export function echoedMark(col: number, row: number, spacing: number): number {
  return held(echoedCells, spacing, col, row, () => {
    const apart = echoCells(spacing);
    let mark = plainMark(col, row);
    for (let copy = 1; copy <= ECHO_CAP.value; copy += 1) {
      const from = col - copy * apart;
      if (from < 0) break;
      mark = Math.max(mark, plainMark(from, row) - copy);
    }
    return mark;
  });
}
export const echoesField: SketchDriftField = (x, y, spacing) =>
  latticeInk(x, y, CELL, (col, row) => echoedMark(col, row, spacing));

/**
 * 04 — the reverb's bloom written in marks: every cell's mark spread into the cells around it,
 * one mark lighter for every cell of distance, and a cell written in the heaviest of what reaches
 * it — a dense mark grows a halo of lighter ones, and a field that is smooth already is moved only
 * where it climbs. The dial is the reach, in cells; at nought nothing reaches and the picture is
 * the plain lattice.
 */
export const BLOOM_DIAL: SketchDial = { min: 0, max: 4, step: 0.5, rest: 2 };
const bloomedCells = new Map<number, Map<number, number>>();
export function bloomedMark(col: number, row: number, reach: number): number {
  return held(bloomedCells, reach, col, row, () => {
    let mark = plainMark(col, row);
    const span = Math.ceil(reach);
    for (let dr = -span; dr <= span; dr += 1) {
      for (let dc = -span; dc <= span; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const distance = Math.hypot(dc, dr);
        if (distance > reach) continue;
        const near = col + dc;
        const far = row + dr;
        if (near < 0 || near >= COLS || far < 0 || far >= ROWS) continue;
        mark = Math.max(mark, plainMark(near, far) - Math.round(distance));
      }
    }
    return mark;
  });
}
export const bloomField: SketchDriftField = (x, y, reach) =>
  latticeInk(x, y, CELL, (col, row) => bloomedMark(col, row, reach));

/** How many marks denser a landing at full level pushes its row the moment it lands. */
export const DECAY_STEPS = 4;

/** How much of the loop a push takes to fall to a third of itself. */
export const DECAY_SPAN = 0.12;

/** Which row of the lattice a landing of the walk pushes: the landings dealt round the rows. */
export const landingRow = (index: number): number => index % ROWS;

/** How hard one landing is still pushing at `at` of the loop: its level, decayed since it landed. */
export function pushAt(at: number, landing: SketchLanding): number {
  const age = at - landing.at;
  if (age < 0) return 0;
  return landing.level * Math.exp(-age / DECAY_SPAN);
}

/**
 * 05 — the marks moved by the clock: each landing of the walk pushes every cell of its row that
 * many marks denser at its level, and the push decays back down the loop, so what a hand sees is
 * a row flare and settle rather than a lattice that never moves. The dial is where in the loop the
 * bench is standing; at the top nothing has landed and the picture is the plain lattice.
 */
export const DECAY_DIAL: SketchDial = {
  min: 0,
  max: 1,
  step: 0.01,
  rest: fixtureAt(SKETCH_WALK, SKETCH_STANDING, "landing").at + 0.02,
};
const decayedCells = new Map<number, Map<number, number>>();
export function decayedMark(col: number, row: number, at: number): number {
  return held(decayedCells, at, col, row, () => {
    let push = 0;
    for (const [index, landing] of SKETCH_WALK.entries()) {
      if (landingRow(index) === row) push += pushAt(at, landing);
    }
    return Math.min(GLYPH_COUNT - 1, plainMark(col, row) + Math.round(push * DECAY_STEPS));
  });
}
export const decayField: SketchDriftField = (x, y, at) =>
  latticeInk(x, y, CELL, (col, row) => decayedMark(col, row, at));

/**
 * Which alphabet each character is written in: the plain and the riff in the marks the picture
 * ships, the stutter and the scatter in strokes, the breathe and the slide in rings — a part's
 * character being the one fact about a section of the song the walk carries.
 */
export const CHARACTER_ALPHABET: Record<PlayerCharacter, AlphabetName> = {
  plain: "marks",
  riff: "marks",
  stutter: "strokes",
  scatter: "strokes",
  breathe: "rings",
  slide: "rings",
};

/**
 * 06 — the alphabet swapped whole with the part: every cell keeps the mark the field chose for
 * it and is written in the alphabet its landing's character names. The dial is which landing of
 * the walk is standing; at the one the bench opens on the alphabet is the shipped marks.
 */
export const PART_DIAL: SketchDial = {
  min: 0,
  max: SKETCH_WALK.length - 1,
  step: 1,
  rest: SKETCH_STANDING,
};
export const partAlphabet = (landing: number): AlphabetName =>
  CHARACTER_ALPHABET[fixtureAt(SKETCH_WALK, Math.round(landing), "landing").character];
export const partField: SketchDriftField = (x, y, landing) => {
  const alphabet = ALPHABETS[partAlphabet(landing)];
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  return alphabetCoverage(alphabet, plainMark(col, row), x / CELL - col, y / CELL - row);
};

/** How many cells a side one big mark of the scatter spans. */
export const SCATTER_SPAN = 3;

/** Where one big cell stands: the mean of the fine cells it covers, inside the picture. */
const scatterCells = new Map<number, Map<number, number>>();
export function scatterStood(col: number, row: number): number {
  return held(scatterCells, SCATTER_SPAN, col, row, () => {
    let sum = 0;
    let count = 0;
    for (let dr = 0; dr < SCATTER_SPAN; dr += 1) {
      for (let dc = 0; dc < SCATTER_SPAN; dc += 1) {
        const fine = col * SCATTER_SPAN + dc;
        const down = row * SCATTER_SPAN + dr;
        if (fine >= COLS || down >= ROWS) continue;
        sum += stood(fine, down);
        count += 1;
      }
    }
    return count === 0 ? 0 : sum / count;
  });
}

/**
 * The least and the most a big cell stands at over the whole picture, read once: the scatter's
 * threshold is said across the field's own range, because a bloom under its film stands in the
 * lower half of its ramp and a threshold said on the ramp would find no peak to draw.
 */
export const SCATTER_RANGE: readonly [number, number] = ((): [number, number] => {
  let least = Infinity;
  let most = -Infinity;
  for (let row = 0; row * SCATTER_SPAN < ROWS; row += 1) {
    for (let col = 0; col * SCATTER_SPAN < COLS; col += 1) {
      const value = scatterStood(col, row);
      least = Math.min(least, value);
      most = Math.max(most, value);
    }
  }
  return [least, most];
})();

/**
 * 07 — a layer above the marks: one big mark per three-by-three cells wherever the field stands
 * above a threshold of its own range, read off how far above without the wrap — so the peak is a
 * block and a shoulder a dot — over the fine lattice, in the one ink. The dial is the threshold;
 * at one nothing stands above it and the picture is the plain lattice.
 */
export const SCATTER_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.6 };
export const scatterField: SketchDriftField = (x, y, threshold) => {
  const fine = plainField(x, y);
  if (threshold >= 1) return fine;
  const big = CELL * SCATTER_SPAN;
  const col = Math.floor(x / big);
  const row = Math.floor(y / big);
  const [least, most] = SCATTER_RANGE;
  const floor = least + threshold * (most - least);
  const above = (scatterStood(col, row) - floor) / (most - floor);
  if (above <= 0) return fine;
  const mark = markAt(above, GLYPH_COUNT, 0);
  return Math.max(fine, markCoverage(mark, x / big - col, y / big - row, 0));
};

/**
 * What the sound's rows leave of the light at one cell, read at the cell's centre and not its
 * mean: the stand-in weave stands two cycles to a cell, so a cell's mean is the same everywhere
 * and its centre aliases the rows into the slow beat a lattice makes of a grating it cannot
 * resolve — which is the picture of a row a lattice of marks can give.
 */
export const rowsRead = (col: number, row: number): number =>
  lit(weave((col + 0.5) * CELL, (row + 0.5) * CELL));

/**
 * 08 — the sound's rows written as their own lattice of marks instead of cut out of the field:
 * a second lattice on the same cells, read off the rows alone and without the wrap so a quiet
 * row writes nothing, laid over the field's lattice in the one ink. The dial is the rows' depth;
 * at nought the rows write nothing and the picture is the plain lattice.
 */
export const ROWS_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.6 };
export const rowsField: SketchDriftField = (x, y, depth) =>
  Math.max(
    plainField(x, y),
    latticeInk(x, y, CELL, (col, row) => markAt(depth * rowsRead(col, row), GLYPH_COUNT, 0)),
  );
