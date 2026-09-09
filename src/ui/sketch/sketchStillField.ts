/**
 * @role The four still fields: a poppy field, rippled water, backlit seed heads and a canopy from
 *   under it. Each answers **where on its own five stops** a point of the picture is read — not how
 *   much ink is there — which is the one thing that separates these from the nine beside them: the
 *   ramp is read per pixel, so a head is red and the ground between two heads is green inside one
 *   tile. Pure maths on picture units, no canvas, no clock, no context.
 * @instead The stops, the dials, the scale and the print they share →
 *   src/ui/sketch/sketchStill.ts. The nine fields that answer an amount of one ink →
 *   src/ui/sketch/sketchDrift.ts, and the moves both are built out of →
 *   src/ui/sketch/sketchField.ts. The four grounds that ship at a fifteenth of a tile's alpha,
 *   which these argue past → src/ui/scene/ and `build` in src/ui/moireScreen.ts.
 */
import { TAU } from "@/lib/moire";
import { sceneAxis, sceneSharp } from "@/lib/moireScene";
import { clamp } from "@/lib/range";
import type { SketchDriftField } from "@/ui/sketch/sketchDrift";
import { hash2, printed, STILL_PX, STILL_WIDE } from "@/ui/sketch/sketchStill";

/**
 * The poppies: how far apart the heads stand at the top of the frame and at its foot, how far one
 * is knocked off its own place, how wide a head is and how much of it is flat colour, the stems
 * under them, how far a head bobs and how far the stems sway with it — all in the scale's pixels but
 * the two that are shares of one head.
 */
const POPPY = {
  far: 4.5,
  near: 15,
  jitter: 0.5,
  head: 0.55,
  soft: 0.9,
  stroke: 3.4,
  bob: 1.6,
  sway: 0.22,
};

/**
 * The nearest head to a point of the field, over the nine cells that could hold one: how much of it
 * stands there, and how far up the ramp that head is read.
 *
 * **Nine and not one.** A head that had to fit inside its own cell could not touch its neighbour,
 * and a field of heads that never touch is a polka dot — which is what the first shot of this
 * picture was. Reading the neighbours instead lets a head be wider than its cell, lets one be
 * nearly absent and the one beside it huge, and lets two overlap, all of which the still does.
 */
function nearestHead(
  u: number,
  v: number,
  period: number,
  amount: number,
): { stands: number; top: number } {
  let stands = 0;
  let top = 0;
  for (let ou = -1; ou <= 1; ou += 1) {
    for (let ov = -1; ov <= 1; ov += 1) {
      const hu = Math.round(u) + ou;
      const hv = Math.round(v) + ov;
      const bob = (POPPY.bob * Math.sin(TAU * (amount + hash2(hu, hv + 13)))) / period;
      const du = u - hu - POPPY.jitter * (hash2(hu, hv) - 0.5) + bob;
      const dv = v - hv - POPPY.jitter * (hash2(hu + 71, hv) - 0.5);
      // Each head its own width, some of them barely there: the still's are every size at once.
      const wide = POPPY.head * POPPY.head * (0.12 + 1.0 * hash2(hu + 19, hv + 41));
      const at = clamp((wide - (du * du + dv * dv)) / (wide * POPPY.soft), 0, 1);
      if (at > stands) {
        stands = at;
        top = 0.66 + 0.26 * hash2(hu + 7, hv + 3);
      }
    }
  }
  return { stands, top };
}

/**
 * A poppy field: soft round heads at the hot end of the ramp over stems at the green end, small and
 * dense toward the top and large and few at the foot. The perspective is in the mark's own period —
 * it grows down the picture, and the row coordinate is the integral of one over it, so rows are
 * spaced by their own period rather than by a constant and the field recedes instead of being
 * scaled. The dial is the bob, and every head takes its phase from where it stands, so the field
 * moves the way a hundred stems on a hundred springs do rather than as one sheet.
 */
export const poppiesField: SketchDriftField = (x, y, amount) => {
  const px = x * STILL_PX;
  const py = y * STILL_PX;
  const period = POPPY.far + (POPPY.near - POPPY.far) * y;
  const u = (px - STILL_WIDE / 2) / period;
  const v = (STILL_PX / (POPPY.near - POPPY.far)) * Math.log(period / POPPY.far);
  const head = nearestHead(u, v, period, amount);
  // The ground the heads stand in: fine stems leaning as one, dark between them and green along.
  const lean = POPPY.sway * Math.sin(TAU * amount);
  // Up to the green stop where a stem is lit and down to the shade between them: at a tenth of
  // the ramp the whole ground sat inside the print's own grain and read as speckle, not as stems.
  const stem = sceneAxis((px + lean * py) / POPPY.stroke);
  const base = 0.02 + 0.23 * stem * stem;
  return printed(x, y, base + head.stands * (head.top - base));
};

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
 * The seed heads: how far apart the stalks stand, the tufts they clump into, how far apart the awns
 * tick along one, how far a stalk lies over at the crest of the gust, and how wide the gust itself
 * is — one wavelength across most of the picture, or it reads as a ripple rather than as weather.
 */
const SEED = {
  stroke: 2.4,
  wide: 0.36,
  tuft: 26,
  awn: 4.2,
  soft: 7,
  reach: 34,
  cut: 0.24,
  over: 0.12,
  lean: 0.35,
  gusted: 0.12,
  gust: 150,
};

/**
 * Backlit wild grass: a hundred and more feathery strokes, dark olive at the root and amber at
 * the tip, with a seed here and there catching the light outright. **Every stroke carries its own
 * crown** —
 * where its seed head begins and how far down it runs, both off the stroke's own hash — so the heads
 * stand at every height at once the way the still's do, and the picture is a mass of individual
 * marks rather than a texture laid over the whole box.
 *
 * The dial is the **gust travelling across the picture as a wave**: the lean is a function of where
 * a stroke stands and of the phase, not one lean for the whole field. The travelling half of it is a
 * third of the standing half, and that is not timidity — a lean that varies fast across x sweeps the
 * stroke coordinate through whole periods within a pixel, and what that draws is two gratings
 * beating, which is the one picture this bench already has nine of.
 */
export const seedheadsField: SketchDriftField = (x, y, amount) => {
  const px = x * STILL_PX;
  const py = y * STILL_PX;
  const gust = Math.sin(TAU * (px / SEED.gust - amount));
  const lean = SEED.lean + SEED.gusted * gust;
  const u = (px + lean * (STILL_PX - py) * 0.6) / SEED.stroke;
  const stalk = Math.round(u);
  const line = clamp(1 - Math.abs(u - stalk) / SEED.wide, 0, 1);
  const crown = (0.01 + 0.55 * hash2(stalk, 1)) * STILL_PX;
  const foot = crown + (0.25 + 0.3 * hash2(stalk, 2)) * STILL_PX;
  const held = clamp((py - crown) / SEED.soft, 0, 1) * clamp((foot - py) / SEED.soft, 0, 1);
  // The awns tick along the head, each stroke starting its own — along the stroke and never across
  // the picture, which is the difference between a feather and a second grating.
  const tick = sceneAxis((py - crown) / SEED.awn + hash2(stalk, 3));
  const feather = line * (0.16 + 0.84 * held * (0.22 + 0.78 * tick));
  // How near the crown of its own head this point stands — one at the tip, nought by the root.
  const risen = clamp(1 - (py - crown) / Math.max(foot - crown, 1), 0, 1);
  const litness = clamp(0.1 + 0.45 * hash2(stalk, 0) + 0.5 * held * risen, 0, 1);
  const ground = 0.02 + 0.05 * sceneAxis(px / SEED.tuft + 0.2 * y);
  // A lit awn lands past the middle stop or it does not land at all. A stroke allowed to fade evenly
  // through the ramp would spend the whole picture on the stop between the root and the awn, which
  // is the colour of neither — the still is dark olive with amber marks on it, never a wash of the
  // average of the two.
  const glow = clamp((feather - SEED.cut) / SEED.over, 0, 1);
  // A mark reads from its own root to its own tip and not at one height: the still is amber where
  // the sun catches a crown and dark red-olive a finger below it, on the one stroke.
  const value = ground + glow * (0.44 + 0.3 * risen + 0.24 * litness - ground);
  // And the stalk under a head is drawn, dark, or the heads float over nothing. Below the crown
  // only, and it never reaches the awn stop.
  const stem = line * clamp((py - foot) / SEED.soft, 0, 1) * (1 - glow);
  const spark = clamp((hash2(stalk, Math.round(py / SEED.awn)) - 0.94) / 0.06, 0, 1) * held * line;
  return printed(x, y, Math.max(value, ground + stem * (0.2 - ground)) + spark * (1 - value));
};

/**
 * The canopy: the three scales its leaves clump at, how much taller a clump is than it is wide, how
 * wide the gust that shimmers them is, how far up the ramp the closed mass may reach, how far a
 * speck of sky needs the mass to have thinned, how far apart the specks stand, how wide one is and
 * how sharply it ends, and how few of the places one could fall actually hold one.
 */
const SKY = {
  clump: 41,
  leaf: 13,
  fleck: 7.5,
  tall: 1.25,
  gust: 120,
  mass: 0.14,
  thin: 0.2,
  wide: 0.15,
  edge: 0.02,
  rare: 0.93,
  opens: 0.1,
};

/**
 * The three octaves, each turned off the one under it. **Turned and not just scaled**: three
 * lattices sharing an axis line up wherever their periods do, and where three troughs coincide on a
 * grid the picture grows a lattice of holes — which is exactly what a canopy is not. A third of a
 * turn apiece costs one cosine and one sine each and buys an irregular mass.
 */
const CANOPY_OCTAVES: readonly {
  period: number;
  turn: number;
  share: number;
  shivers: number;
}[] = [
  { period: SKY.clump, turn: 0.03, share: 0.42, shivers: 0 },
  { period: SKY.leaf, turn: 0.19, share: 0.34, shivers: 3.2 },
  { period: 4.3, turn: 0.41, share: 0.24, shivers: 6.5 },
];

/** One octave of leaf: a lattice drawn in toward its own crests, taller than it is wide and turned. */
function clumpAt(px: number, py: number, period: number, turn: number): number {
  const cos = Math.cos(TAU * turn);
  const sin = Math.sin(TAU * turn);
  return sceneSharp(
    sceneAxis((px * cos + py * sin) / period) *
      sceneAxis((py * cos - px * sin) / (period * SKY.tall)),
    2,
  );
}

/**
 * A dense green canopy: leaf clumps at three scales, very dark and darkest at the foot, with specks
 * of sky at the top stop breaking through where the mass has thinned. A speck is a fine mark of its
 * own gated by how much leaf stands over it and by how high up the frame it is, rather than the
 * hole three lattices leave between them, which is a hole on a grid.
 *
 * The dial is the gust: it shimmers the finest octave and opens and closes the gaps behind it.
 */
export const skylightField: SketchDriftField = (x, y, amount) => {
  const px = x * STILL_PX;
  const py = y * STILL_PX;
  const gust = 0.5 + 0.5 * Math.sin(TAU * (amount + px / SKY.gust));
  let mass = 0;
  for (const octave of CANOPY_OCTAVES) {
    // The coarse octave stands still and the fine ones shiver, by the share of a leaf's own width
    // each is: a whole canopy sliding as one is a curtain, not a wind.
    mass += octave.share * clumpAt(px + octave.shivers * gust, py, octave.period, octave.turn);
  }
  // The fall to the foot is on the whole read and not on the clump alone: over the base as well it
  // was a fiftieth of the ramp, which is under the grain laid on top of it.
  const value = (0.02 + SKY.mass * clamp(mass, 0, 1)) * (0.3 + 0.7 * (1 - y));
  // A speck is a break in the leaf and not a mark on a grid, so where one falls is a hash and not a
  // lattice: a lattice of holes is the one thing three octaves of lattice must not be seen to leave.
  const cx = Math.round(px / SKY.fleck);
  const cy = Math.round(py / SKY.fleck);
  const dx = px / SKY.fleck - cx - 0.5 * (hash2(cx, cy) - 0.5);
  const dy = py / SKY.fleck - cy - 0.5 * (hash2(cx + 9, cy + 3) - 0.5);
  // The gust decides **which** specks are open, never how bright an open one is: a speck let half
  // through would be read at the stops between the leaf and the sky, and sky seen through a leaf is
  // not a colour of its own. A gap opens and closes; it does not dim.
  const speck =
    clamp((SKY.wide - (dx * dx + dy * dy)) / SKY.edge, 0, 1) *
    clamp((hash2(cx + 5, cy + 11) - (SKY.rare - SKY.opens * gust)) / 0.04, 0, 1);
  const gate = clamp((SKY.thin - mass) / (SKY.thin * 0.5), 0, 1) * clamp((0.72 - y) / 0.15, 0, 1);
  const sky = speck * gate;
  return printed(x, y, value + sky * (0.99 - value));
};
