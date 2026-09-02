/**
 * @role The noise tile a wobbling picture is grained with: the four numbers it is baked to, and the
 *   one tile itself, made the first time a picture wobbles and held for the life of the page. The
 *   per-pixel half of a look, which is a bake and never a frame's work (0129).
 * @instead How hard the grain bites, which is a term off the entry's own knob, and the draw that
 *   sweeps this tile over the field → `grainBite` and the wobble's pass in src/lib/moireLook.ts,
 *   which is where this split out of at the 800-line hard cap (0286). The other tile the picture
 *   bakes once → `latticeTile` in src/lib/moireLattice.ts, which this is written after.
 */
import { mulberry32 } from "@/lib/random";

/**
 * The noise tile: how wide it is baked, how wide one speck of it is, how much of it is left clear,
 * and how fast it is swept across the picture in its own pixels a second.
 *
 * **Big enough that the sweep is the motion and not the tiling.** A tile is drawn once per tile of
 * field it covers, so a small one is a dozen draws a frame and a repeat the eye can find; this is
 * three or four draws over an overlay and one over the strip. A speck of three device pixels stands
 * under the lattice's own cell, which is what makes it grain and not blocks (0281). And half the
 * tile is left clear on purpose: a noise laid over the whole picture is a wash that takes the same
 * ink out everywhere, where sparse specks read as grain and shift the picture's own mean by half as
 * much (0269's rule said of a mask).
 */
export const GRAIN_TILE = 512;
export const GRAIN_SPECK = 3;
export const GRAIN_FLOOR = 0.5;
export const GRAIN_SWEEP = 24;

/** The seed the specks are drawn from — one constant, so the grain is the same grain every run. */
const GRAIN_SEED = 0x5f_37_59_df;

/**
 * The tile's own alpha, written once into the bytes a caller hands in: one value per speck, sparse
 * by the floor, and nothing in the colour channels — what a grain does is take ink out, and the
 * composite that does it reads the alpha alone. The lattice's tile is written this way and for this
 * reason (`latticeTile`, src/lib/moireLattice.ts): the per-pixel work is a bake, and a bake is
 * priced once and never on a frame (0129, 0144).
 */
export function grainTile(alpha: Uint8ClampedArray, size: number, speck: number): void {
  if (!(speck > 0)) throw new Error(`A speck ${speck} wide grains nothing.`);
  const across = Math.ceil(size / speck);
  const random = mulberry32(GRAIN_SEED);
  const specks = new Float64Array(across * across);
  for (let at = 0; at < specks.length; at++) {
    specks[at] = Math.max(0, ((random() - GRAIN_FLOOR) / (1 - GRAIN_FLOOR)) * 255);
  }
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / speck) * across;
    for (let x = 0; x < size; x++) {
      alpha[(y * size + x) * 4 + 3] = Math.round(specks[row + Math.floor(x / speck)] ?? 0);
    }
  }
}

/**
 * The tile itself, baked the first time a picture wobbles and never again — one tile for the whole
 * app, because what is on it is noise and no picture's noise is another's (0142's key said of a
 * surface). Kept here rather than handed down the chain: a seventh argument every pass carried for
 * one look's sake would be the veer's mistake made twice (0282).
 */
let grain: HTMLCanvasElement | null | undefined;

export function grainOf(): HTMLCanvasElement | null {
  if (grain !== undefined) return grain;
  const made = document.createElement("canvas");
  made.width = GRAIN_TILE;
  made.height = GRAIN_TILE;
  const ink = made.getContext("2d");
  // An engine that will not hand back the tile's context draws the swim and no grain, which is
  // louder than a picture silently left ungrained and quieter than no picture at all — **and the
  // refusal is remembered**, exactly as a tile this engine would not bake is (`curvedTileFor`,
  // src/ui/driftTiles.ts): a refusal retried is a surface allocated and dropped every painting.
  if (ink === null) {
    grain = null;
    return null;
  }
  const field = ink.createImageData(GRAIN_TILE, GRAIN_TILE);
  grainTile(field.data, GRAIN_TILE, GRAIN_SPECK);
  ink.putImageData(field, 0, 0);
  grain = made;
  return grain;
}
