/**
 * @role The water: black water under a lattice of short glints, with a slow diagonal swell in
 *   bands across it and a few tall blades standing in it, each with its reflection broken under it
 *   — the field a yard named for a reed, a rush or a sedge stands in. It rests at the first stop of
 *   its own ramp, so the water is near black and only its crests are lit (0329, 0332, 0333).
 * @instead The other three grounds → the files beside this one. What a scene is →
 *   src/lib/moireScene.ts. Which names read as this one → src/lib/yardScene.ts. The hash the
 *   dashes are cut at → src/lib/moireNoise.ts. The still this was argued at 1:1 as →
 *   the drift bench's entry 10 until this landed (0331), whose field left with it.
 */
import { wrap } from "@/lib/moire";
import { hash2 } from "@/lib/moireNoise";
import { type Scene, sceneAxis, sceneCells, sceneRepeat, sceneSharp } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";
import { clamp } from "@/lib/range";

/**
 * The two pitches the glints are the beat of, in device pixels. **Both of them, and not one of them
 * slid**: a beat is two lattices a fraction apart, so the second pitch is the whole of the effect —
 * held close, because two gratings only beat when they are close (the two rests below stand ~17
 * device pixels apart, which is how far apart the lit rows come out; how long one glint is across is
 * `DASH`). Each is snapped onto the tile separately, so a hand can drag them onto one number, or
 * onto two that snap to one period, and have a grating and no beat — which is the one state this
 * ground has nothing to say at, and the reason the second pitch names no wild end for the group's
 * own push to drive it to (src/lib/copyDriftGroups.ts).
 */
const RIPPLE = tunable("water.ripple", 2.7, { min: 1.5, max: 12, step: 0.1 });
const BEAT = tunable("water.beat", 3.2, { min: 1.5, max: 12, step: 0.1 });

/** How long one glint is across the ripple it lies on, in the same pixels. */
const DASH = tunable("water.dash", 5.5, { min: 2, max: 24, step: 0.5 });

/** How wide the slow diagonal swell that bends the ripples and lights them in bands is. */
const SWELL = tunable("water.swell", 34, { min: 10, max: 120, step: 1 });

/** And how far up its own ramp the water reads under all of it: near the floor, or it is not black. */
const DEEP = tunable("water.deep", 0.02, { min: 0, max: 0.3, step: 0.01 });

/**
 * How far the swell carries one ripple, how much of the ramp its own banding is worth, how much of
 * a crest is dark before a glint lights at all and over how much of it that happens, and how steep
 * the dash lattice is cut across the ripple rows. Constants and not dials: what a hand argues about
 * on this field is the two pitches, the glint's length, the swell and how black the water is.
 */
const BEND = 2.4;
const BAND = 0.12;
const CUT = 0.22;
const OVER = 0.3;
const STEEP = 3;

/** How sharply a crest and a dash are drawn in toward their own middles. */
const CREST_SHARP = 3;
const DASH_SHARP = 2;

/**
 * The frame the blades below are written in, in device pixels: three tiles wide and one deep at the
 * display the bench is judged on, which is the still they were drawn in (0331). Snapped onto
 * whatever tile is being written by `sceneRepeat` and wrapped into, so the bed comes round at both
 * edges rather than running a seam down the picture — a tile narrower than the frame holds the
 * whole bed at once, which is what a reed bed seen from close is.
 */
const BLADE_FIELD = { wide: 330, high: 110 };

/**
 * The blades standing in the water, written by hand in the tile's own pixels: four clusters of two
 * to four, each a base, a lean and a height. Written rather than scattered because a picture argued
 * about at 1:1 has to be the same picture twice (0247), and clustered because reeds come up where
 * the bottom is shallow and nowhere else.
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

/** How far a blade is leant over at the wildest wind, on top of the lean it was written with. */
const SLANT = 0.35;

/** How far up its own ramp a blade is read, and its reflection: the fourth stop and just under it. */
const BLADE_TOP = 0.78;
const BLADE_FALL = 0.1;
const ECHO_TOP = 0.62;

/**
 * The shortest signed offset from a mark to a sample on an axis that comes round every `span`. The
 * tile is laid as a repeating pattern, so a blade at one edge of it has to reach across to the
 * other — the same constraint `sceneRepeat` is written under, one step further on, because a blade
 * is placed by hand rather than by a cosine.
 */
const near = (delta: number, span: number): number => wrap(delta + span / 2, span) - span / 2;

/** How far along a segment from the origin the nearest point is, and how far off it the sample stands. */
function alongBlade(px: number, py: number, bx: number, by: number): { at: number; off: number } {
  const span = bx * bx + by * by;
  const at = span === 0 ? 0 : clamp((px * bx + py * by) / span, 0, 1);
  return { at, off: Math.hypot(px - at * bx, py - at * by) };
}

/** How much of a blade stands at a point, given how wide it is there and how far off the sample is. */
const blade = (off: number, half: number): number =>
  clamp((half - off) / Math.max(half, 0.001), 0, 1);

export const water: Scene = {
  ramp: [
    "--scene-water-black",
    "--scene-water-deep",
    "--screen-blue",
    "--screen-green",
    "--scene-water-lit",
  ],
  ground: (x, y, terms) => {
    // The swell runs diagonally and comes round on both axes, twice as wide across as it is deep.
    const swellAcross = sceneRepeat(terms.width, 2 * SWELL.value);
    const swellDown = sceneRepeat(terms.height, SWELL.value);
    const swell = sceneAxis(x / swellAcross + y / swellDown);
    // The two pitches the glints beat out of, each snapped onto the tile, and the swell bending
    // both of them together: a bend and never a third lattice.
    const rippleDown = sceneRepeat(terms.height, RIPPLE.value);
    const beatDown = sceneRepeat(terms.height, BEAT.value);
    const bent = y + BEND * swell;
    const crest = sceneSharp(
      sceneAxis(bent / rippleDown) * sceneAxis(bent / beatDown),
      CREST_SHARP,
    );
    // Cut across, so a crest is a short glint and never a ruled line down the picture — and cut at
    // a phase of the ripple row's own, or every dash lines up under the one above it and the water
    // reads as woven cloth. The row is read on its wrapped index, because the tile comes round and
    // a hash does not.
    const rows = sceneCells(terms.height, RIPPLE.value);
    const row = wrap(Math.round(bent / rippleDown), rows);
    const dashAcross = sceneRepeat(terms.width, DASH.value);
    const dashDown = sceneRepeat(terms.height, DASH.value / STEEP);
    const dash = sceneSharp(sceneAxis(x / dashAcross + y / dashDown + hash2(row, 5)), DASH_SHARP);
    // A glint is lit or it is not. A crest allowed to fade through the whole ramp would spend the
    // middle stops on its own edge, and the middle of this ramp is a reed.
    const lit = clamp((crest * dash - CUT) / OVER, 0, 1);
    const deep = DEEP.value + BAND * swell;
    let value = deep + lit * (0.4 + 0.6 * swell) * (0.99 - deep);
    // The bed, wrapped onto the tile: every blade is reached from wherever the sample stands, so
    // the four clusters come round at both edges at whatever size the tile is.
    const fieldAcross = sceneRepeat(terms.width, BLADE_FIELD.wide);
    const fieldDown = sceneRepeat(terms.height, BLADE_FIELD.high);
    for (const reed of BLADES) {
      const dx = near(x - reed.x, fieldAcross);
      const dy = near(y - reed.y, fieldDown);
      const lean = reed.lean + terms.lean * SLANT;
      const stood = alongBlade(dx, dy, lean * reed.tall, -reed.tall);
      const stands = blade(stood.off - reed.half * 0.5, reed.half * (1 - 0.6 * stood.at) * 0.5);
      value = Math.max(value, deep + stands * (BLADE_TOP - BLADE_FALL * stood.at - deep));
      if (dy <= 0) continue;
      // The reflection: the sample folded back over the waterline against a shorter blade, and only
      // as far as the ripple under it is up — which is what "broken" is.
      const back = alongBlade(dx, -dy, lean * reed.tall * 0.55, -reed.tall * 0.55);
      const echo = blade(back.off, reed.half * 1.6 * (1 - 0.5 * back.at)) * (0.15 + 0.85 * crest);
      value = Math.max(value, deep + echo * (ECHO_TOP - deep));
    }
    return clamp(value, 0, 1);
  },
};
