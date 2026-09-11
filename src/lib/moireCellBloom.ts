/**
 * @role The reverb's cell pass: a cell's mark spread into the cells around it, one mark lighter per
 *   cell of distance, so a reverb standing in a rack is a halo of lighter marks around every dense
 *   one — the room said in marks, where the field pass behind it is the same room said in the cut
 *   (0349). Both are one declaration on one entry (`LOOKS.bloom`).
 * @instead The contract every pass is written to, and the runner → src/lib/moireCells.ts. The
 *   reverb's own look, its field pass and the blur that draws it → src/lib/moireLook.ts. The
 *   declaration itself → `look` and `lookFrom` on src/audio/effects/reverb.ts.
 */
import { cellAt, cellRaise, type CellPass } from "@/lib/moireCells";
import { clamp, denormalize } from "@/lib/range";

/**
 * How far a halo reaches, in whole cells, across the band the radius term is stated on — smallest
 * room first, exactly as `BLOOM_SCALE` reads. **In cells and not off `bloomScale`**, which is the
 * one number this cannot be read from: that is the working size a blur is *drawn* at, in shares of
 * the field, and turning it into cells needs the cell's own size in device pixels — which a cell
 * pass is not given and must not be, because a halo that changed with the display is what 0346
 * took out of this picture. So the reach is its own band, and §4 holds the cost.
 */
export const BLOOM_CELLS: readonly [number, number] = [1, 3];

/** How many cells one halo reaches, off the radius term its entry declared. */
export const bloomCells = (radius: number): number =>
  Math.max(1, Math.round(denormalize(radius, ...BLOOM_CELLS)));

/**
 * How far the halo actually reaches: its own band, taken by how much of the look the picture has
 * travelled to — whole, and stepped with that travel, for the ladder's reason (`echoRungs`). A
 * reverb arriving is its halo growing a cell at a time, and a rack holding none has no halo at all.
 *
 * **And never wider than the row less a cell.** The grid wraps and a tile is `pitch + 1` cells
 * across — six on a 1× display (0346) — so a halo of three reaches seven cells, which is more of
 * that row than there is: every cell would stand inside every other cell's halo and the row would
 * flatten to one mark. Bounded so that a row always keeps a cell of page in it, which on the
 * narrowest grid the pitch admits is no halo at all (the review's finding).
 */
export const bloomReach = (at: number, radius: number, cols: number): number =>
  Math.max(
    0,
    Math.min(Math.round(clamp(at, 0, 1) * bloomCells(radius)), Math.floor((cols - 2) / 2)),
  );

/**
 * The bloom, as marks: every cell written into the cells around it, one mark lighter per cell of
 * distance, and each cell left in the heaviest of what stands on it — so a dense cell gains a halo
 * and a cell already denser than what reaches it is untouched.
 *
 * **Distance is counted along the axes and not across the diagonal**, which makes a halo a diamond
 * rather than a square: a square halo puts its corner cell as bright as its edge cell, and a corner
 * that bright reads as a block of marks rather than as a room around one.
 */
export const cellBloom: CellPass = (marks, into, cols, rows, at, terms) => {
  const reach = bloomReach(at, terms.radius ?? 0, cols);
  if (reach <= 0) return;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const from = marks[y * cols + x] ?? 0;
      if (from > 1) halo(into, cols, rows, x, y, from, reach);
    }
  }
};

/** One cell's halo: every cell within `reach` of it raised to `from` less how far it stands away. */
const halo = (
  into: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  from: number,
  reach: number,
): void => {
  for (let down = -reach; down <= reach; down++) {
    const side = reach - Math.abs(down);
    for (let across = -side; across <= side; across++) {
      const mark = from - Math.abs(down) - Math.abs(across);
      if (mark > 0) cellRaise(into, cellAt(cols, rows, x + across, y + down), mark);
    }
  }
};
