/**
 * @role The three still fields left on the bench: rippled water, backlit seed heads and a canopy
 *   from under it. Each answers **where on its own five stops** a point of the picture is read — not
 *   how much ink is there — which is the one thing that separates these from the nine beside them.
 *   The fourth was a poppy field, and it left when it shipped as src/ui/scene/bloom.ts (0332). Pure
 *   maths on picture units, no canvas, no clock, no context.
 * @instead The stops, the dials, the scale and the print they share →
 *   src/ui/sketch/sketchStill.ts. The nine fields that answer an amount of one ink →
 *   src/ui/sketch/sketchDrift.ts, and the moves both are built out of →
 *   src/ui/sketch/sketchField.ts. The two noises two of these are made of →
 *   src/lib/moireNoise.ts. The four grounds that ship → src/ui/scene/ and `build` in
 *   src/ui/moireScreenTile.ts.
 */
import { TAU } from "@/lib/moire";
import { sceneAxis, sceneSharp } from "@/lib/moireScene";
import { clamp } from "@/lib/range";
import type { SketchDriftField } from "@/ui/sketch/sketchDrift";
import { hash2, streakAt } from "@/lib/moireNoise";
import { printed, STILL_PX } from "@/ui/sketch/sketchStill";

/**
 * The water: how far apart the ripples run, the pitch of the second lattice they beat against, how
 * long one glint is across, how wide the slow swell is and how far it carries a ripple, and how dark
 * the water is under all of it.
 */
const GLINT = {
  ripple: 2.7,
  beat: 3.2,
  dash: 5.5,
  swell: 34,
  bend: 2.4,
  deep: 0.02,
  band: 0.12,
  cut: 0.22,
  over: 0.3,
};

/**
 * The blades standing in the water, written by hand in the scale's own pixels: four clusters of two
 * to four, each a base, a lean and a height. Written rather than scattered for the fake walk's
 * reason — a picture argued about at 1:1 has to be the same picture twice (0247) — and clustered
 * because the still's are: reeds come up where the bottom is shallow and nowhere else.
 */
const BLADES: readonly { x: number; y: number; lean: number; tall: number; half: number }[] = [
  { x: 62, y: 74, lean: -0.1, tall: 46, half: 1.4 },
  { x: 66, y: 76, lean: 0.14, tall: 38, half: 1.2 },
  { x: 71, y: 75, lean: 0.3, tall: 30, half: 1.05 },
  { x: 148, y: 58, lean: 0.42, tall: 24, half: 1.05 },
  { x: 152, y: 59, lean: 0.2, tall: 18, half: 0.9 },
  { x: 232, y: 86, lean: -0.22, tall: 52, half: 1.4 },
  { x: 238, y: 88, lean: 0.05, tall: 44, half: 1.2 },
  { x: 244, y: 87, lean: 0.26, tall: 36, half: 1.2 },
  { x: 249, y: 89, lean: 0.44, tall: 27, half: 1.05 },
  { x: 300, y: 44, lean: -0.3, tall: 20, half: 0.9 },
];

/** How far along a segment the nearest point is, and how far off it the sample stands. */
function alongBlade(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { at: number; off: number } {
  const vx = bx - ax;
  const vy = by - ay;
  const span = vx * vx + vy * vy;
  const at = span === 0 ? 0 : clamp(((px - ax) * vx + (py - ay) * vy) / span, 0, 1);
  return { at, off: Math.hypot(px - ax - at * vx, py - ay - at * vy) };
}

/** How much of a blade stands at a point, given how wide it is there and how far off the sample is. */
const blade = (off: number, half: number): number =>
  clamp((half - off) / Math.max(half, 0.001), 0, 1);

/**
 * Rippled dark water: as near black as this ramp's first stop goes, under a dense lattice of
 * short horizontal glints, with a slow
 * diagonal swell darkening it in bands and a few sparse blades standing in it, each with its
 * reflection broken under it. The dial is the **phase of the flicker** — the glint is a second fine
 * lattice beating against the first, so a crest lit at one setting is dark at the next, which is the
 * instrument's own subject read at the scale of a ripple rather than of a row.
 */
export const glintField: SketchDriftField = (x, y, amount) => {
  const px = x * STILL_PX;
  const py = y * STILL_PX;
  const swell = sceneAxis((px * 0.5 + py) / GLINT.swell);
  const bent = py + GLINT.bend * swell;
  const crest = sceneSharp(
    sceneAxis(bent / GLINT.ripple + amount) * sceneAxis(bent / GLINT.beat),
    3,
  );
  // Cut across, so a crest is a short horizontal glint and never a ruled line down the picture —
  // and cut at a phase of the ripple row's own, or every dash in the picture lines up under the one
  // above it and the water reads as a woven cloth.
  const row = Math.round(bent / GLINT.ripple);
  const dash = sceneSharp(sceneAxis((px + 3 * py) / GLINT.dash + hash2(row, 5)), 2);
  // A glint is lit or it is not. A crest allowed to fade through the whole ramp would spend the
  // middle stops on its own edge, and the middle of this ramp is a reed.
  const lit = clamp((crest * dash - GLINT.cut) / GLINT.over, 0, 1);
  const water = GLINT.deep + GLINT.band * swell;
  let value = water + lit * (0.4 + 0.6 * swell) * (0.99 - water);
  for (const reed of BLADES) {
    const tipX = reed.x + reed.lean * reed.tall;
    const stood = alongBlade(px, py, reed.x, reed.y, tipX, reed.y - reed.tall);
    const stands = blade(stood.off - reed.half * 0.5, reed.half * (1 - 0.6 * stood.at) * 0.5);
    value = Math.max(value, water + stands * (0.78 - 0.1 * stood.at - water));
    if (py <= reed.y) continue;
    // The reflection: the sample folded back over the waterline against a shorter blade, and only
    // as far as the ripple under it is up — which is what "broken" is.
    const back = alongBlade(
      px,
      2 * reed.y - py,
      reed.x,
      reed.y,
      reed.x + reed.lean * reed.tall * 0.55,
      reed.y - reed.tall * 0.55,
    );
    const echo = blade(back.off, reed.half * 1.6 * (1 - 0.5 * back.at)) * (0.15 + 0.85 * crest);
    value = Math.max(value, water + echo * (0.62 - water));
  }
  return printed(x, y, value);
};

/**
 * The seed heads: the three scales of fibre the mass is built from — each stated as how wide a cell
 * is across the stroke and how long it is along it — how far apart the green stalks stand and how
 * long they run, how far a stroke lies over and how much of that lean the gust carries, how wide the
 * gust is, and how far the foot of the picture falls back.
 */
const SEED = {
  seed: 0.6,
  fibre: 0.85,
  awn: 7,
  tuft: 2.6,
  clump: 7,
  sweep: 34,
  stalk: 2.8,
  tall: 80,
  lean: 0.42,
  gusted: 0.1,
  gust: 150,
  foot: 0.5,
};

/**
 * Backlit wild grass: an amber-tan mass filling the frame, dark olive where it thins, with green
 * stalks rising through it and a seed here and there catching the light outright.
 *
 * **The mass is the middle of the ramp and not its floor.** It sits between the ember stop and the
 * straw stop, which is where these tokens make tan, so the picture is warm wall to wall and the dark
 * is the minority — which is the way round the still has it, and the way round the first two
 * drawings of this picture did not. The whole ramp is warm for the same reason: a value on its way
 * to tan has to pass through something, and whatever that is, the picture is mostly made of it.
 *
 * **And it is noise and not gratings.** Three scales of streaked value noise, each cell longer along
 * the stroke than across it, so the texture is fibrous and soft with no spacing anywhere in it. Two
 * earlier drawings of this field crossed gratings instead and read as a beaded comb and then as a
 * herringbone; a seed head has no pitch, so nothing with a pitch will draw one.
 *
 * The dial is the **gust travelling across the picture as a wave**: the lean is a function of where
 * a stroke stands and of the phase, not one lean for the whole field.
 */
export const seedheadsField: SketchDriftField = (x, y, amount) => {
  const px = x * STILL_PX;
  const py = y * STILL_PX;
  const gust = Math.sin(TAU * (px / SEED.gust - amount));
  const lean = SEED.lean + SEED.gusted * gust;
  // Across the strokes, with the lean anchored at the foot: what a gust bends is the standing grass.
  const across = px + lean * (STILL_PX - py) * 0.6;
  const mass =
    0.14 * streakAt(across + 5, py + 3, SEED.seed, SEED.seed * 1.9) +
    0.42 * streakAt(across, py, SEED.fibre, SEED.awn) +
    0.28 * streakAt(across + 31, py + 17, SEED.tuft, SEED.awn * 2.6) +
    0.16 * streakAt(across + 77, py + 53, SEED.clump, SEED.sweep);
  // Three noises summed sit near a half and reach neither end, so the sum is stretched — and
  // stretched off centre, because the mass of this still is warm and its dark is the exception.
  const lit = clamp((mass - 0.28) / 0.38, 0, 1);
  // **The mass does not span the ramp; it sits in a sixth of it.** The ember stop is the most
  // saturated ink the instrument holds, and a smooth field is continuous — so any mass reaching from
  // the dark end to the straw end spends a wide band of itself on that stop whatever curve it takes,
  // and three drawings of this picture came out scarlet before that was the lesson. The mass stays
  // between tan and pale straw, where the contrast it needs is the lightness between two warm inks;
  // the dark this still has is not in the mass at all, but in the stalks threading it.
  let value = 0.72 + 0.13 * lit;
  // The dark stalks rising through it: one very long, very narrow cell, read by pulling the mass
  // back toward the root stop rather than drawn over it, so they stand inside the grass.
  const stalk = clamp((streakAt(across + 13, py, SEED.stalk, SEED.tall) - 0.82) / 0.07, 0, 1);
  value += (0.12 - value) * stalk * 0.92;
  const spark =
    clamp(
      (hash2(Math.round(across / SEED.fibre), Math.round(py / SEED.tuft)) - 0.97) / 0.03,
      0,
      1,
    ) * lit;
  value += spark * (0.97 - value);
  // The foot falls back: nearer the tan and further from the straw, with less between its own light
  // and dark. Toward tan and not toward the dark, because on this ramp the way down is through the
  // ember stop and a scarlet foreground is not what a lens focused past something does.
  return printed(x, y, 0.6 + (value - 0.6) * (SEED.foot + (1 - SEED.foot) * (1 - y * y)));
};

/**
 * The canopy: the three scales its leaves clump at, how wide the gust that shimmers them is, how far
 * up the ramp the closed mass may reach, how far the foot falls under that, how thin the leaf has to
 * be before a speck of sky is let through, how far apart the places a speck could fall stand, how
 * wide one is and how sharply it ends, how few of those places hold one, and how many more the gust
 * opens at its crest.
 */
const SKY = {
  crown: 44,
  leaf: 15,
  fleck: 5,
  blade: 1.7,
  gust: 120,
  mass: 0.15,
  foot: 0.16,
  thin: 0.5,
  speck: 7,
  wide: 0.1,
  edge: 0.05,
  rare: 0.84,
  opens: 0.08,
};

/**
 * The four scales of leaf, coarsest first: how wide a clump is, how much of the mass it is, and how
 * far the gust slides it. **Streaked noise and not lattices.** Lattices crossed leave their
 * gaps on a grid however they are turned, and a canopy whose holes stand in rows is a net; three
 * scales of noise leave gaps where they happen to fall, which is what a wall of leaf does, and the
 * finest of the four is what makes the mass foliage rather than cloud. The
 * coarse scale stands still and the fine ones shiver, because a whole canopy sliding as one is a
 * curtain rather than a wind.
 */
const CANOPY_SCALES: readonly { wide: number; share: number; shivers: number; at: number }[] = [
  { wide: SKY.crown, share: 0.38, shivers: 0, at: 0 },
  { wide: SKY.leaf, share: 0.28, shivers: 1.1, at: 37 },
  { wide: SKY.fleck, share: 0.18, shivers: 2.8, at: 91 },
  { wide: SKY.blade, share: 0.16, shivers: 4.4, at: 143 },
];

/**
 * A dense green canopy: leaf clumps at four scales with the coarsest reading as whole crowns light
 * against dark, the mass falling to the floor of its own ramp at the foot, and a couple of dozen
 * pale specks of sky in the upper half where the leaf has thinned. The dial is the gust: it shivers
 * the three fine scales and decides which specks are open.
 *
 * **The picture cannot be as dark as the still and does not try.** The darkest ink the instrument
 * holds is `--scene-canopy-dark` at a lightness of 0.38, so what carries this one is the contrast
 * between a lit crown and the shade beside it, not how black the shade is — the whole mass lives in
 * the lower two stops and the foot sits on the first of them.
 */
export const skylightField: SketchDriftField = (x, y, amount) => {
  const px = x * STILL_PX;
  const py = y * STILL_PX;
  const gust = 0.5 + 0.5 * Math.sin(TAU * (amount + px / SKY.gust));
  let raw = 0;
  for (const scale of CANOPY_SCALES) {
    const slid = px + scale.at + scale.shivers * gust;
    raw += scale.share * streakAt(slid, py + scale.at * 0.5, scale.wide, scale.wide * 0.8);
  }
  // Three noises summed sit near a half and reach neither end. Stretched, the coarsest scale reads
  // as whole crowns rather than as a wash, which is the one thing the still is unmistakably made of.
  const spread = clamp((raw - 0.34) / 0.36, 0, 1);
  // Stepped once, so a crown reads as a shape with an edge to it rather than as a cloud: a canopy
  // seen from outside is a stack of separate masses, and what separates them is a sharp fall.
  const lit = spread * spread * (3 - 2 * spread);
  const value = (0.01 + SKY.mass * lit) * (SKY.foot + (1 - SKY.foot) * (1 - y * y));
  // A speck is a break in the leaf and not a mark on a grid, so where one falls is a hash.
  const cx = Math.round(px / SKY.speck);
  const cy = Math.round(py / SKY.speck);
  const dx = px / SKY.speck - cx - 0.5 * (hash2(cx, cy) - 0.5);
  const dy = py / SKY.speck - cy - 0.5 * (hash2(cx + 9, cy + 3) - 0.5);
  // The gust decides **which** specks are open, never how bright an open one is: a speck let half
  // through is read at the stops between the leaf and the sky, and sky seen through a leaf is not a
  // colour of its own. A gap opens and closes; it does not dim.
  const near = clamp((SKY.wide - (dx * dx + dy * dy)) / SKY.edge, 0, 1);
  const chosen = clamp((hash2(cx + 5, cy + 11) - (SKY.rare - SKY.opens * gust)) / 0.03, 0, 1);
  const open = clamp((0.46 - y) / 0.1, 0, 1) * clamp((SKY.thin - lit) / 0.1, 0, 1);
  // And the disc itself is stepped once more on its way out, so that what little of it is neither
  // leaf nor sky is a pixel of edge rather than a ring of some third colour.
  const sky = clamp((near * chosen * open - 0.3) / 0.3, 0, 1);
  return printed(x, y, value + sky * (0.99 - value));
};
