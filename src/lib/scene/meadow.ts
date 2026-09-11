/**
 * @role The meadow: backlit seed heads — an amber-tan mass of fibre filling the tile, dark stalks
 *   threading it and a seed here and there catching the light outright, which is the field a yard
 *   named for a grass, a fern or a thistle stands in. **Noise and not gratings**: a mass of grass
 *   has no pitch in it, and everything with a pitch drew a comb, a beaded string or a herringbone
 *   (0331). The lean is the yard's own wind, standing rather than travelling.
 * @instead The other three grounds → the files beside this one, and the registry that refuses a
 *   name none of them holds → src/lib/scene/scenes.ts. What a scene is → src/lib/moireScene.ts. The
 *   noise this is made of, and the wrapping that keeps it off a seam → src/lib/moireNoise.ts.
 *   Which names read as this one → src/lib/yardScene.ts. The tile this is written into, and the
 *   film of gratings, blobs and band over it → src/ui/moireScreenTile.ts.
 */
import { hash2, noiseCell, speckTiled, streakTiled } from "@/lib/moireNoise";
import { type Scene, sceneAxis, sceneCells, sceneFlockRare, sceneRepeat } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";
import { clamp } from "@/lib/range";

/**
 * How wide one fibre of the mass is across the stroke, in device pixels: under the film's own
 * pitch. Every cell this ground reads — this one, the awn, the stalk and the spark's — is
 * multiplied by how close the frame stands before it is snapped (`terms.reach`, 0335).
 */
const FIBRE = tunable("meadow.fibre", 0.85, { min: 0.4, max: 4, step: 0.05 });

/** And how long one is along it — an awn, several times its own width, which is what makes a fibre. */
const AWN = tunable("meadow.awn", 7, { min: 2, max: 30, step: 0.5 });

/** How wide the dark stalks rising through the mass stand, in the same pixels. */
const STALK = tunable("meadow.stalk", 2.8, { min: 1, max: 10, step: 0.1 });

/**
 * And where on its own ramp the mass rests. **At the tan stop and not between two of them.** The
 * still this is drawn from held its mass at two thirds of a ramp with no tan in it, because the
 * amber it wanted was the ember stop mixed with the straw stop — and every value on the way down
 * came out scarlet (0331). The ramp names a tan of its own now, so the mass rests on it.
 */
const MASS = tunable("meadow.mass", 0.52, { min: 0.3, max: 0.75, step: 0.01 });

/**
 * The four scales of streaked noise the mass is built from, finest first: how wide one cell is as a
 * share of the fibre and how long as a share of the awn, how much of the mass it is, and how far
 * along it is read — an offset, so no two scales share a cell boundary and the sum has no grid in
 * it. Four, because three summed read as cloth: the finest is the seed and the coarsest is the
 * sweep of a whole clump.
 */
const SCALES: readonly { wide: number; tall: number; share: number; at: number }[] = [
  { wide: 0.71, tall: 0.16, share: 0.14, at: 5 },
  { wide: 1, tall: 1, share: 0.42, at: 0 },
  { wide: 3.06, tall: 2.6, share: 0.28, at: 31 },
  { wide: 8.24, tall: 4.86, share: 0.16, at: 77 },
];

/**
 * How far the strokes lean off vertical at the wildest wind, and how far the standing gust bows
 * them on top of it, in device pixels. **A standing gust and not a travelling one**: the wave is
 * frozen at one phase, so the field is pushed over further here than there — a bake has no clock
 * (0126). The gust that travels is the screen's, a lean per vertical strip of the fill rather than
 * a displacement inside the tile (`inkThrough`, src/ui/moireScreen.ts, 0338); this one stands
 * because it is baked, and the two are the same reading spent in the two places it can be spent.
 *
 * **And the gust is a displacement, never a second lean.** A lean is snapped to a whole number of
 * the scale's own cells over the tile's depth (`sceneSlope`), which is a step function of what it
 * is handed: a lean that varied across the picture would tip that rounding column by column and cut
 * a hard vertical break through the field at every column where it tipped — the ruled grid the
 * snapping exists to prevent, moved off the tile join and into the middle of the picture, growing
 * with depth and standing in the same place in every tile. Measured at the wildest wind it crossed
 * a whole stop of the ramp. So the lean is one number for the tile and the gust is a smooth offset
 * on x, periodic across the tile both ways and continuous everywhere.
 */
const SLANT = 0.42;
const GUST_SWING = 7;

/** How wide the gust is, how tall a stalk is, and how far the mass falls back at the tile's middle. */
const GUST = 150;
const TALL = 80;
const FOOT = 0.5;

/**
 * How tall a spark's own cell is, in device pixels. **A point and not a bar**: every pixel of one
 * cell takes the same hash, so a cell as long as an awn draws a seed as a one-pixel-wide scratch
 * the whole length of it, at the brightest stop the ramp has. A few pixels each way is a seed.
 */
const SPARK = 2.6;

/**
 * How few of the cells hold one, how wide a flock's own point is as a share of its cell, and how
 * far the hash a flock is placed by stands off the hash the seeds are: a bird over a meadow is a
 * seed's own kind of mark at a seed's own size, and never one standing on a seed.
 */
const SPARK_RARE = 0.97;
const WIDE = 0.12;
const APART = 61;

/** How far up the ramp a stalk is read, how far a spark is, and how much of the ramp the mass spans. */
const STALK_TOP = 0.12;
const SPARK_TOP = 0.97;
const SPAN = 0.16;

export const meadow: Scene = {
  ramp: [
    "--scene-canopy-dark",
    "--drift-hot",
    "--scene-meadow-tan",
    "--scene-canopy-lit",
    "--scene-water-lit",
  ],
  ground: (x, y, terms) => {
    const lean = terms.lean * SLANT;
    const fibre = FIBRE.value * terms.reach;
    const awn = AWN.value * terms.reach;
    // The gust: a standing wave across the tile, at its own width, pushing the field over most at
    // the tile's top and foot and least across its middle. Both terms come round on the tile, so
    // the offset is the same at either edge of every join.
    const gust =
      terms.lean *
      GUST_SWING *
      sceneAxis(x / sceneRepeat(terms.width, GUST * terms.reach)) *
      sceneAxis(y / terms.height);
    let mass = 0;
    for (const scale of SCALES) {
      mass +=
        scale.share *
        streakTiled(
          x + gust + scale.at,
          y + scale.at * 0.6,
          terms.width,
          terms.height,
          fibre * scale.wide,
          awn * scale.tall,
          lean,
        );
    }
    // Four noises summed sit near a half and reach neither end, so the sum is stretched — and
    // stretched off centre, because the mass of this field is warm and its dark is the exception.
    const lit = clamp((mass - 0.28) / 0.38, 0, 1);
    // **The mass does not span the ramp; it sits in a sixth of it.** A smooth field is continuous,
    // so any mass reaching from the dark end to the straw end spends a wide band of itself on
    // whatever stands between them, whatever curve it takes. The dark this field has is not in the
    // mass at all, but in the stalks threading it.
    let value = MASS.value + SPAN * lit;
    // The stalks: one very long, very narrow cell, read by pulling the mass back toward the root
    // stop rather than drawn over it, so they stand inside the grass and not on top of it.
    const wide = STALK.value * terms.reach;
    const tall = TALL * terms.reach;
    const thread = streakTiled(x + gust + 13, y, terms.width, terms.height, wide, tall, lean);
    const stalk = clamp((thread - 0.82) / 0.07, 0, 1);
    value += (STALK_TOP - value) * stalk * 0.92;
    // A seed catching the light outright: rare, hashed on the cell it stands in rather than placed,
    // and only where the mass is already lit — a spark in the shade is a dead pixel.
    const cols = sceneCells(terms.width, fibre);
    const rows = sceneCells(terms.height, SPARK * terms.reach);
    const seed = hash2(noiseCell(x, terms.width, cols), noiseCell(y, terms.height, rows));
    value += clamp((seed - SPARK_RARE) / 0.03, 0, 1) * lit * (SPARK_TOP - value);
    // And the field falls back at the tile's own middle: a band of shade a tile deep and coming
    // round at both its edges, which is the perspective every ground is under (0329) — the still
    // this is drawn from fell away once down a picture that never repeated.
    const band = FOOT + (1 - FOOT) * sceneAxis(y / terms.height);
    return clamp(MASS.value + (value - MASS.value) * band, 0, 1);
  },
  // The seeds again at `SCENE_FLOCK` times their count and hashed apart from them, and read on a
  // square cell rather than on the mass's own long one: what a flock is, is the field's own bright
  // points where they are not — and a point placed on the fibre's cell would stand exactly where a
  // seed already does.
  specks: (x, y, terms) =>
    speckTiled(
      x,
      y,
      terms.width,
      terms.height,
      SPARK * terms.reach,
      WIDE,
      sceneFlockRare(SPARK_RARE),
      APART,
    ),
};
