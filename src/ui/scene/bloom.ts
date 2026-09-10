/**
 * @role The bloom: a poppy field — soft scarlet heads at the hot end of its ramp over fine green
 *   stems at the other, small and dense toward the top of the tile and large and few at its foot,
 *   which is the field a yard named for a flower stands in. The first scene read along its own five
 *   stops per pixel rather than dimmed toward one (0332), so a head is scarlet and the ground
 *   between two heads is green inside one tile, at full strength.
 * @instead The other three grounds → the files beside this one. What a scene is →
 *   src/lib/moireScene.ts. Which names read as this one → src/lib/yardScene.ts. The hash the heads
 *   are scattered by → src/lib/moireNoise.ts. The still this was argued at 1:1 as →
 *   the drift bench's entry 10 until this landed (0331), whose field left with it.
 */
import { wrap } from "@/lib/moire";
import { hash2 } from "@/lib/moireNoise";
import { type Scene, sceneAxis, sceneCells, sceneRepeat, sceneSlope } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";
import { clamp } from "@/lib/range";

/**
 * How far apart the heads stand at the top of the tile and at its foot, in device pixels. **The
 * perspective is the mark's own period and not a scale on the picture**: it grows down the tile and
 * the row coordinate is the integral of one over it, so rows are spaced by their own period and the
 * field recedes. One tile deep and round again at its foot (`sceneRepeat`), which is the constraint
 * every ground is under (0329): a field seen in stripes a tile tall, each receding.
 */
const FAR = tunable("bloom.far", 4.5, { min: 2, max: 20, step: 0.5 });
const NEAR = tunable("bloom.near", 15, { min: 4, max: 60, step: 0.5 });

/** How wide a head is, as a share of its own cell. Widest at the foot, where the cells are widest. */
const HEAD = tunable("bloom.head", 0.55, { min: 0.2, max: 1.2, step: 0.05 });

/** And how far apart the stems the heads stand in run, across the tile in the same pixels. */
const STROKE = tunable("bloom.stroke", 3.4, { min: 1.5, max: 10, step: 0.1 });

/**
 * How far a head is knocked off its own place, how much of it is flat colour before it falls away,
 * and how far the stems lean at the wildest wind. Constants and not dials: what a hand argues about
 * on this field is how big the heads are and how far off they stand, and three more sliders under
 * that is three ways to say the same thing.
 */
const JITTER = 0.5;
const SOFT = 0.9;
const SLANT = 0.22;

/**
 * How far up the ramp a head is read, and how far the ground between two of them is: the stems
 * reach a little past a fifth of the ramp where they are lit and the shade between them sits just
 * off its floor, so the whole ground is stems and shade and the heads are the only thing warm.
 */
const SHADE = 0.02;
const STEM = 0.23;
const HOT = 0.66;
const HOTTER = 0.26;

/**
 * The nearest head to a point of the field, over the nine cells that could hold one: how much of it
 * stands there, and how far up the ramp that head is read. **Refilled in place and handed back**,
 * the way the tile's own matrices are: this is called once per device pixel of a rebuild, and a
 * build allocates a ramp and no more (0129, 0070). A caller that keeps it copies it.
 *
 * **Nine and not one.** A head that had to fit inside its own cell could not touch its neighbour,
 * and a field of heads that never touch is a polka dot. Reading the neighbours instead lets a head
 * be wider than its cell, lets one be nearly absent and the one beside it huge, and lets two
 * overlap, all of which a poppy field does.
 */
const nearest = { stands: 0, top: 0 };

function nearestHead(
  u: number,
  v: number,
  cols: number,
  rows: number,
): { stands: number; top: number } {
  let stands = 0;
  let top = 0;
  for (let ou = -1; ou <= 1; ou += 1) {
    for (let ov = -1; ov <= 1; ov += 1) {
      const hu = Math.round(u) + ou;
      const hv = Math.round(v) + ov;
      // Which head this is stands on the wrapped index and where it stands on the plain one: the
      // tile is laid as a pattern, so the head a column past its right edge has to be the head at
      // its left edge — the same constraint `sceneRepeat` is written under, one step further on,
      // because a hash is what places these rather than a cosine.
      const su = wrap(hu, cols);
      const sv = wrap(hv, rows);
      const du = u - hu - JITTER * (hash2(su, sv) - 0.5);
      const dv = v - hv - JITTER * (hash2(su + 71, sv) - 0.5);
      // Each head its own width, some of them barely there: a field's are every size at once.
      const wide = HEAD.value * HEAD.value * (0.12 + 1.0 * hash2(su + 19, sv + 41));
      const at = clamp((wide - (du * du + dv * dv)) / (wide * SOFT), 0, 1);
      if (at > stands) {
        stands = at;
        top = HOT + HOTTER * hash2(su + 7, sv + 3);
      }
    }
  }
  nearest.stands = stands;
  nearest.top = top;
  return nearest;
}

export const bloom: Scene = {
  ramp: [
    "--scene-canopy-dark",
    "--screen-green",
    "--drift-hot",
    "--screen-red",
    "--scene-canopy-lit",
  ],
  ground: (x, y, terms) => {
    // The foot of one tile is the top of the next, so the perspective is one tile deep and comes
    // round: `down` is where in *this* tile the point is, and never how far down the picture it is.
    const down = terms.height > 0 ? wrap(y, terms.height) / terms.height : 0;
    // A near spacing at least a little wider than the far one, whichever way a hand turned the two
    // dials: a field that did not recede has no perspective to state, and the logarithm below has
    // no answer for one that recedes backwards.
    const near = Math.max(FAR.value + FAR.step, NEAR.value);
    const spread = near - FAR.value;
    const period = FAR.value + spread * down;
    // Snapped across the tile, so a whole number of heads span it and the column a tile's width
    // along is the column it began at (`sceneRepeat`).
    const across = sceneRepeat(terms.width, period);
    const cols = sceneCells(terms.width, period);
    const u = (x - terms.width / 2) / across;
    // The rows, spaced by their own period: the integral of one over a period that grows linearly
    // down the tile, which is a logarithm, and the whole of the perspective. Stretched onto a whole
    // number of rows for the same reason the columns are snapped.
    const foot = (terms.height / spread) * Math.log(near / FAR.value);
    const rows = Math.max(1, Math.round(foot));
    const v = foot > 0 ? ((terms.height / spread) * Math.log(period / FAR.value) * rows) / foot : 0;
    const head = nearestHead(u, v, cols, rows);
    // The ground the heads stand in: fine stems leaning as one, dark between them and green along.
    // Both the pitch and the lean snapped onto the tile, or the stems step sideways at every join.
    const stroke = sceneRepeat(terms.width, STROKE.value);
    const leaning = sceneSlope(terms.height, stroke, terms.lean * SLANT);
    const stem = sceneAxis((x + leaning * y) / stroke);
    const base = SHADE + STEM * stem * stem;
    return clamp(base + head.stands * (head.top - base), 0, 1);
  },
};
