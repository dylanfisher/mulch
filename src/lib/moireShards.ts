/**
 * @role The automator's look, whole: the finished picture torn along the structure's own
 *   cross-section — every slice the cut already reads the field back in thrown across by a cosine
 *   of the escape count read down the centre column, and every column thrown down by the same read
 *   along the centre row a quarter turn off. One tear per automator standing, each read at its own
 *   depth into the structure and its own phase, summed and clamped, so two automators are two tears
 *   at different pitches crossing and never one tear twice as far (0296). Its terms — none — its
 *   numbers, its maths and where it lands are all here, and `LOOKS` holds the name against it.
 * @instead What a look is at all → src/lib/moireLook.ts. The count the tear reads →
 *   `escapeTurns` in src/lib/moireFractal.ts, whose seed is the stops the painter already roams.
 *   How many automators stand, and how far each has travelled in → `looksShards` in
 *   src/ui/moireLooks.ts. Where the table is filled once a painting and spent on the slices →
 *   `cutField` in src/ui/moireCanvasField.ts. The declaration itself → `look` on
 *   src/audio/effects/automator.ts. The bench picture this came off and the one ramp it still
 *   reads at this turn → src/ui/sketch/structure/sketchStructure.ts.
 */
import { cosTurn } from "@/lib/moire";
import { escapeTurns, type FractalSeed } from "@/lib/moireFractal";
import { LENS_SLICES } from "@/lib/moireGeometry";
import type { Look } from "@/lib/moireLook";
import { clamp } from "@/lib/range";

/**
 * How many tears the picture takes at most, whatever the rack holds — how much is torn being how
 * many automators stand, since the look has no terms and an automator no knob to turn it down by
 * (0202, 0279). Four, because every automator past it is a further cross-section thrown under a
 * ceiling the third already reaches, and a fifth is kernel reads for a tear nobody can see.
 */
export const SHARD_CAP = 4;

/**
 * How far one automator throws a slice, as a share of the **height**, both ways. The bench's own
 * rest (0295) — and the height and not the wobble's width, because the strip is thirty-two pixels
 * tall and thousands wide: a share of the width thrown down it would wrap the strip several times.
 */
export const SHARD_REACH = 0.08;

/**
 * The most any slice is thrown, summed over every automator standing: three whole reaches. Bounded
 * for 0250's reason, and not derived from the shatter's ceiling, which bounds how much of the
 * picture is drawn from elsewhere and not how far a piece of it moves. **A clamp and never a
 * normalisation**: a second automator adds to the first and only the peaks flatten, where a sum
 * scaled to the ceiling would shrink the first tear as the second arrives — the picture *less* torn
 * for a moment by more automators.
 */
export const SHARD_CEILING = 0.25;

/**
 * The depth the k-th standing automator reads the count at, as a scale over the first's: the beat's
 * own rest on the bench (`BEAT_DIAL`). Two cross-sections a ratio apart have contours that cross
 * everywhere rather than on the rungs their breaths happen to differ on, so the second tear is a
 * different tear and not the first one deeper.
 */
export const SHARD_RATIO = 1.5;

/**
 * And a quarter turn per automator on the throw's cosine. The zoom alone leaves the slow middle
 * slices, where the count barely climbs, nearly in step — two tears that agree where the plane is
 * open and differ only in the filigree read as one tear with a frayed edge.
 */
export const SHARD_PHASE = 0.25;

/**
 * How many cycles of the count one pass of the throw is worth. The count runs over a hundred cycles
 * across the picture and climbs fastest at the boundary, so one pass every sixteen is a handful of
 * slow waves over the open plane and a tear at the edge — moved here from the bench, which reads
 * the same turn for the ramps it still draws.
 */
export const SHARD_TURN = 16;

/** The down throw's phase against the across: a quarter behind, as the bench threw it. */
export const SHARD_DOWN = -0.25;

/**
 * One automator's throw of one slice: its presence times the reach, on a cosine of the count read at
 * the slice's middle, `k` quarter-turns on for the k-th automator and `phase` further for the down
 * throw. Nought at no presence, which is what a tear on its way in or out is a share of.
 */
const throwOf = (presence: number, count: number, k: number, phase: number): number =>
  presence * SHARD_REACH * cosTurn(count / SHARD_TURN + k * SHARD_PHASE + phase);

/**
 * The table the cut spends, into `out`: `out[0 ‥ LENS_SLICES)` is how far each slice is thrown
 * across and `out[LENS_SLICES ‥ 2·LENS_SLICES)` how far each column is thrown down, both as shares
 * of the height. Per automator of the `standing`, per slice, the count at the slice's middle on the
 * centre column — or the column's middle on the centre row — in reference radii, at the depth that
 * automator reads the structure at (`SHARD_RATIO`, over the seed's own zoom); summed over the
 * automators and clamped to the ceiling.
 *
 * **The seed is the one the picture already stands on**, at a fly of nought: the roam is continuous
 * and is the plane the picture is cut from, so the tear moving with it is the field moving under it
 * and no motion of its own (0126); the flight and the breath are stepped ladders on the tiles, and a
 * tear that stepped with them would snap where the rows crossfade (0261). At most `SHARD_CAP` times
 * twice `LENS_SLICES` kernel reads a painting, into a table the caller keeps: no allocation (0070)
 * and no read-back (0129).
 */
export function shardsInto(
  out: Float64Array,
  seed: Readonly<FractalSeed>,
  ref: number,
  width: number,
  height: number,
  presences: Readonly<Float64Array>,
  standing: number,
): void {
  if (out.length < 2 * LENS_SLICES) {
    throw new Error(`A throw table of ${out.length} holds no ${2 * LENS_SLICES} slices.`);
  }
  if (standing < 0 || standing > SHARD_CAP || standing > presences.length) {
    throw new Error(`${standing} automators is not a count the picture tears for.`);
  }
  out.fill(0, 0, 2 * LENS_SLICES);
  const { cx, cy, fly } = seed;
  for (let k = 0; k < standing; k++) {
    const presence = presences[k] ?? 0;
    if (presence <= 0) continue;
    const zoom = seed.zoom * SHARD_RATIO ** k;
    for (let slice = 0; slice < LENS_SLICES; slice++) {
      const middle = (slice + 0.5) / LENS_SLICES;
      const v = ((middle - 0.5) * height) / ref;
      const u = ((middle - 0.5) * width) / ref;
      out[slice] =
        (out[slice] ?? 0) + throwOf(presence, escapeTurns(0, v, cx, cy, zoom, fly), k, 0);
      out[LENS_SLICES + slice] =
        (out[LENS_SLICES + slice] ?? 0) +
        throwOf(presence, escapeTurns(u, 0, cx, cy, zoom, fly), k, SHARD_DOWN);
    }
  }
  for (let at = 0; at < 2 * LENS_SLICES; at++) {
    out[at] = clamp(out[at] ?? 0, -SHARD_CEILING, SHARD_CEILING);
  }
}

/**
 * The automator's, and the one look with no terms at all: how torn the picture is, is how many
 * automators are standing, which is a fact about the run each of them *is* and not about any value
 * one holds. Cut through the slices the lens already reads the field back in, so it takes no slot
 * in the chain and bakes nothing (0296).
 */
export const shardsLook: Look = { at: "cut", terms: {} };
