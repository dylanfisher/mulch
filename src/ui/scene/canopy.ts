/**
 * @role The canopy: a dense wall of leaf seen from under it — clumps at four scales with the
 *   coarsest reading as whole crowns light against dark, and a handful of pale specks of sky where
 *   the leaf has thinned. It is read low on its own ramp for the water's reason: what a canopy is,
 *   is the light it does not let past (0329, 0332). **Noise and not lattices** — lattices crossed
 *   leave their gaps on a grid however they are turned, and a canopy whose holes stand in rows is a
 *   net (0331).
 * @instead The other three grounds → the files beside this one. What a scene is →
 *   src/lib/moireScene.ts. The noise this is made of, and the wrapping that keeps it off a seam →
 *   src/lib/moireNoise.ts. Which names read as this one → src/lib/yardScene.ts.
 */
import { hash2, streakTiled } from "@/lib/moireNoise";
import { type Scene, sceneAxis, sceneCells } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";
import { clamp } from "@/lib/range";
import { wrap } from "@/lib/moire";

/** How wide one whole crown is, in device pixels: the coarsest of the four scales, and the shape. */
const CROWN = tunable("canopy.crown", 44, { min: 12, max: 140, step: 1 });

/** And how wide one leaf clump inside it is — the two finer scales are read as fractions of this. */
const LEAF = tunable("canopy.leaf", 15, { min: 4, max: 60, step: 0.5 });

/** How far up its own ramp the closed mass may reach. Low, or the picture is not a canopy. */
const MASS = tunable("canopy.mass", 0.15, { min: 0.05, max: 0.5, step: 0.01 });

/** How thin the leaf has to be before a speck of sky is let through it at all. */
const THIN = tunable("canopy.thin", 0.5, { min: 0.1, max: 0.9, step: 0.05 });

/** And how few of the places a speck could fall actually hold one: a break is rare or it is a net. */
const RARE = tunable("canopy.rare", 0.84, { min: 0.5, max: 0.99, step: 0.01 });

/**
 * The four scales of leaf, coarsest first: how wide a clump is as a share of its own dial, how much
 * of the mass it is, how far along it is read, and whether the wind reaches it. **The crown stands
 * and the leaf leans**: a whole canopy sliding as one is a curtain rather than a wind, so the
 * coarsest scale is the one term of this field the yard's adjective does nothing to.
 */
const SCALES: readonly {
  of: "crown" | "leaf";
  wide: number;
  share: number;
  at: number;
  leans: number;
}[] = [
  { of: "crown", wide: 1, share: 0.38, at: 0, leans: 0 },
  { of: "leaf", wide: 1, share: 0.28, at: 37, leans: 1 },
  { of: "leaf", wide: 1 / 3, share: 0.18, at: 91, leans: 1 },
  { of: "leaf", wide: 0.113, share: 0.16, at: 143, leans: 1 },
];

/** How far the boughs lean at the wildest wind, and how much taller a clump is than it is wide. */
const SLANT = 0.5;
const TALL = 0.8;

/** How far the mass falls back at the tile's middle, how wide a speck is, how sharply it ends, and
 * how far off its cell's centre it may fall. */
const FOOT = 0.16;
const SPECK = 7;
const WIDE = 0.1;
const EDGE = 0.05;
const JITTER = 0.3;

/** How far up the ramp a speck of sky is read, and the shade the closed mass never rises off. */
const SKY_TOP = 0.99;
const SHADE = 0.01;

export const canopy: Scene = {
  ramp: [
    "--scene-canopy-shade",
    "--scene-canopy-dark",
    "--screen-green",
    "--scene-canopy-lit",
    "--scene-water-lit",
  ],
  ground: (x, y, terms) => {
    let raw = 0;
    for (const scale of SCALES) {
      const wide = (scale.of === "crown" ? CROWN.value : LEAF.value) * scale.wide;
      raw +=
        scale.share *
        streakTiled(
          x + scale.at,
          y + scale.at * 0.5,
          terms.width,
          terms.height,
          wide,
          wide * TALL,
          terms.lean * SLANT * scale.leans,
        );
    }
    // Four noises summed sit near a half and reach neither end. Stretched, the coarsest scale reads
    // as whole crowns rather than as a wash, which is the one thing this field is unmistakably made
    // of — then stepped once, so a crown has an edge to it rather than being a cloud.
    const spread = clamp((raw - 0.34) / 0.36, 0, 1);
    const lit = spread * spread * (3 - 2 * spread);
    // How high the canopy is read: a band a tile deep, coming round at both its edges the way every
    // ground's perspective does (0329). The still this is drawn from fell away once down a picture
    // that never repeated, which on a tile is a bright line at every join.
    const high = sceneAxis(y / terms.height);
    const value = (SHADE + MASS.value * lit) * (FOOT + (1 - FOOT) * high);
    // A speck is a break in the leaf and not a mark on a grid, so where one falls is a hash — on
    // the cell's wrapped index, because the tile comes round and a hash does not.
    const cols = sceneCells(terms.width, SPECK);
    const rows = sceneCells(terms.height, SPECK);
    const gx = terms.width > 0 ? (x * cols) / terms.width : 0;
    const gy = terms.height > 0 ? (y * rows) / terms.height : 0;
    const ix = Math.round(gx);
    const iy = Math.round(gy);
    const cx = wrap(ix, cols);
    const cy = wrap(iy, rows);
    // Jittered off its cell's centre by less than the room it has: a disc of radius `sqrt(WIDE)`
    // offset further than half a cell less that radius overhangs a neighbour whose own hash almost
    // never lights it, and is chopped along the cell boundary — a straight edge across a mark whose
    // whole point is that it is not on a grid.
    const dx = gx - ix - JITTER * (hash2(cx, cy) - 0.5);
    const dy = gy - iy - JITTER * (hash2(cx + 9, cy + 3) - 0.5);
    // A gap opens or it does not: a speck let half through would be read at the stops between the
    // leaf and the sky, and sky seen through a leaf is not a colour of its own.
    const near = clamp((WIDE - (dx * dx + dy * dy)) / EDGE, 0, 1);
    const chosen = clamp((hash2(cx + 5, cy + 11) - RARE.value) / 0.03, 0, 1);
    const open = clamp((high - 0.5) / 0.2, 0, 1) * clamp((THIN.value - lit) / 0.1, 0, 1);
    // And the disc is stepped once more on its way out, so what little of it is neither leaf nor
    // sky is a pixel of edge rather than a ring of some third colour.
    const sky = clamp((near * chosen * open - 0.3) / 0.3, 0, 1);
    return clamp(value + sky * (SKY_TOP - value), 0, 1);
  },
};
