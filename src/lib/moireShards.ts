/**
 * @role The automator's look, whole: the finished picture torn along the structure's own
 *   cross-section — every slice the cut already reads the field back in thrown across by the escape
 *   count read down the centre column, and every column thrown down by the same read along the
 *   centre row a quarter turn off. The count is cut into pieces a cycle wide and every piece is
 *   thrown by an amount unrelated to its neighbour's, so the picture is flat pieces with hard seams
 *   and never one slow bend (0297). The pieces are widest for an automator holding one effect
 *   and narrow to the step as its run fills, and every automator standing tears the picture the
 *   ones before it already tore, each in a layer of its own read at its own depth and phase — so
 *   two automators are pieces of pieces and never one tear twice as far (0296, 0298). Its terms —
 *   none — its numbers, its maths and where it lands are all here, and `LOOKS` holds the name
 *   against it.
 * @instead What a look is at all → src/lib/moireLook.ts. The count the tear reads →
 *   `escapeTurns` in src/lib/moireFractal.ts, whose seed is the stops the painter already roams.
 *   How many automators stand, how far each has travelled in and how much each run holds →
 *   `looksShards` and `looksHeldInto` in src/ui/moireLooks.ts. Where the table is filled once a
 *   painting and each layer spent on the slices → `cutField` in src/ui/moireCanvasField.ts. The declaration itself → `look` on
 *   src/audio/effects/automator.ts. The bench picture this came off, and the turn its own ramps
 *   still read the count at → src/ui/sketch/structure/sketchStructure.ts.
 */
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";
import { cosTurn } from "@/lib/moire";
import { escapeTurns, type FractalSeed } from "@/lib/moireFractal";
import { LENS_SLICES } from "@/lib/moireGeometry";
import type { Look } from "@/lib/moireLook";
import { clamp } from "@/lib/range";

/**
 * How many tears the picture takes at most, whatever the rack holds — how much is torn being how
 * many automators stand, since the look has no terms and an automator no knob to turn it down by
 * (0202, 0279). Four, because every layer is two more slice passes over the whole picture, and a
 * fifth tear through pieces four tears have already cut is passes for a change nobody can see.
 */
export const SHARD_CAP = 4;

/**
 * How far one automator throws a piece, as a share of the **height**, both ways. Two neighbouring
 * pieces can land a reach either side of where they were, so the seam between them is up to twice
 * this: near a third of the height, which is a break and not a bend — the bench's rest of 0.08 read
 * as one on the strip and as a wobble on the zoomed picture (0297). The height and not the wobble's
 * width, because the strip is thirty-two pixels tall and thousands wide: a share of the width thrown
 * down it would wrap the strip several times.
 */
export const SHARD_REACH = 0.15;

/**
 * The depth the k-th standing automator reads the count at, as a scale over the first's: the beat's
 * own rest on the bench (`BEAT_DIAL`). Two cross-sections a ratio apart have contours that cross
 * everywhere rather than on the rungs their breaths happen to differ on, so the second tear is a
 * different tear and not the first one deeper.
 */
export const SHARD_RATIO = 1.5;

/**
 * And a quarter turn per automator on the throw's cosine. The zoom alone leaves the slow middle
 * slices, where the count barely climbs, in the same piece — two tears that agree where the plane is
 * open and differ only in the filigree read as one tear with a frayed edge.
 */
export const SHARD_PHASE = 0.25;

/**
 * How many cycles of the count one piece spans at a full run, which is the narrowest a piece gets.
 * The count climbs a handful of cycles down the centre column where the plane is open and a hundred
 * at the boundary, so two cycles a piece is three to five pieces across an open picture and
 * splinters at the edge. Two and not one: a full run has grown six rows of its own, and against
 * that weave a piece a cycle wide read as texture and not as a tear (0298). **Cut into pieces and
 * not read as a wave** (0297): a cosine of the raw count moved every slice by nearly what its
 * neighbour moved wherever the count climbed slowly, which was the whole picture bent once by less
 * than a tenth — and a periodic weave bent smoothly is the same weave.
 */
export const SHARD_STEP = 2;

/**
 * How many times wider than the step a piece is for an automator holding one effect. The pieces
 * start big and splinter as the run fills, reaching the step itself at a full run
 * (`GROWTH_COUNT_MAX`), so a picture torn by a young run is a few large pieces and one torn by a
 * full run is twice as many (0298). Two, geometrically: four cycles a piece at one held is one or
 * two seams down an open column, which is torn and not merely slid, and a full run doubling that
 * is still pieces and not a texture.
 */
export const SHARD_WIDEST = 2;

/**
 * How many cycles of the count one piece spans for an automator whose run holds `held` effects —
 * the presences its places stand at, summed, so a piece narrows as a place arrives rather than
 * snapping when it has. Widest at one held and never wider: a run holding nothing yet is torn as a
 * run holding one, because an automator standing is a tear (0296).
 */
export const shardWidth = (held: number): number =>
  SHARD_STEP *
  SHARD_WIDEST ** ((GROWTH_COUNT_MAX - clamp(held, 1, GROWTH_COUNT_MAX)) / (GROWTH_COUNT_MAX - 1));

/**
 * The turn each successive piece takes on the throw's cosine: the golden ratio's conjugate, so
 * consecutive pieces land on phases spread over the whole circle and no run of pieces climbs one
 * flank of the wave together. Neighbouring pieces are thrown by unrelated amounts, which is what a
 * seam is; a turn of a simple fraction would repeat every few pieces.
 */
export const SHARD_SCATTER = (Math.sqrt(5) - 1) / 2;

/** The down throw's phase against the across: a quarter behind, as the bench threw it. */
export const SHARD_DOWN = -0.25;

/**
 * One automator's throw of one slice: its presence times the reach, on a cosine of the piece the
 * count read at the slice's middle falls in — `width` cycles a piece — scattered a golden turn a
 * piece, `k` quarter-turns on for the k-th automator and `phase` further for the down throw. Nought
 * at no presence, which is what a tear on its way in or out is a share of.
 */
const throwOf = (
  presence: number,
  count: number,
  width: number,
  k: number,
  phase: number,
): number =>
  presence *
  SHARD_REACH *
  cosTurn(Math.floor(count / width) * SHARD_SCATTER + k * SHARD_PHASE + phase);

/** How many doubles one automator's layer of the table is: every slice across, every column down. */
export const SHARD_LAYER = 2 * LENS_SLICES;

/**
 * The table the cut spends, into `out`, one layer per automator of the `standing` (0298): layer `k`
 * is `out[k·SHARD_LAYER ‥ k·SHARD_LAYER + LENS_SLICES)`, how far the k-th automator throws each
 * slice across, and the `LENS_SLICES` after it, how far it throws each column down, both as shares of
 * the height. Per automator, per slice, the count at the slice's middle on the centre column — or
 * the column's middle on the centre row — in reference radii, at the depth that automator reads the
 * structure at (`SHARD_RATIO`, over the seed's own zoom), cut into pieces as wide as its run is
 * young (`shardWidth` of `helds[k]`).
 *
 * **Layers and never a sum**: the cut throws the picture by layer 0, then throws what that left by
 * layer 1, and so on, so a second automator tears pieces of the first's pieces and the two are never
 * one table added up. Nothing is clamped, because one automator's throw is bounded by its reach and
 * no layer reads another's.
 *
 * **The seed is the one the picture already stands on**, at a fly of nought: the roam is continuous
 * and is the plane the picture is cut from, so the tear moving with it is the field moving under it
 * and no motion of its own (0126); the flight and the breath are stepped ladders on the tiles, and a
 * tear that stepped with them would snap where the rows crossfade (0261). At most `SHARD_CAP` times
 * `SHARD_LAYER` kernel reads a painting, into a table the caller keeps: no allocation (0070) and no
 * read-back (0129).
 */
export function shardsInto(
  out: Float64Array,
  seed: Readonly<FractalSeed>,
  ref: number,
  width: number,
  height: number,
  presences: Readonly<Float64Array>,
  helds: Readonly<Float64Array>,
  standing: number,
): void {
  if (out.length < SHARD_CAP * SHARD_LAYER) {
    throw new Error(
      `A throw table of ${out.length} holds no ${SHARD_CAP} layers of ${SHARD_LAYER}.`,
    );
  }
  if (
    standing < 0 ||
    standing > SHARD_CAP ||
    standing > presences.length ||
    standing > helds.length
  ) {
    throw new Error(`${standing} automators is not a count the picture tears for.`);
  }
  out.fill(0, 0, standing * SHARD_LAYER);
  const { cx, cy, fly } = seed;
  for (let k = 0; k < standing; k++) {
    const presence = presences[k] ?? 0;
    if (presence <= 0) continue;
    const zoom = seed.zoom * SHARD_RATIO ** k;
    const wide = shardWidth(helds[k] ?? 0);
    const layer = k * SHARD_LAYER;
    for (let slice = 0; slice < LENS_SLICES; slice++) {
      const middle = (slice + 0.5) / LENS_SLICES;
      const v = ((middle - 0.5) * height) / ref;
      const u = ((middle - 0.5) * width) / ref;
      out[layer + slice] = throwOf(presence, escapeTurns(0, v, cx, cy, zoom, fly), wide, k, 0);
      out[layer + LENS_SLICES + slice] = throwOf(
        presence,
        escapeTurns(u, 0, cx, cy, zoom, fly),
        wide,
        k,
        SHARD_DOWN,
      );
    }
  }
}

/**
 * The automator's, and the one look with no terms at all: how torn the picture is, is how many
 * automators are standing and how much each run holds, which are facts about the run each of them
 * *is* and not about any value one holds. Cut through the slices the lens already reads the field back in, so it takes no slot
 * in the chain and bakes nothing (0296).
 */
export const shardsLook: Look = { at: "cut", terms: {} };
