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
 *   the six knobs that shape a run, and the hourglass beside them (0360) — its numbers, its maths
 *   and where it lands are all here, and `LOOKS` holds the name against it.
 * @instead What a look is at all → src/lib/moireLook.ts. The count the tear reads →
 *   `escapeTurns` in src/lib/moireFractal.ts, whose seed is the stops the painter already roams.
 *   How many automators stand, how far each has travelled in, how much each run holds and how long
 *   each is held still → `looksShards` and `looksHeldInto` in src/ui/moireLooks.ts. Where the table
 *   is filled once a painting and each layer spent on the slices → `cutField` in
 *   src/ui/moireCanvasField.ts. The declaration itself → `look` on
 *   src/audio/effects/automator.ts. The bench picture this came off, and the turn its own ramps
 *   still read the count at → src/ui/sketch/structure/sketchStructure.ts.
 */
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";
import { cosTurn, wrap } from "@/lib/moire";
import { escapeTurns, type FractalSeed, valleyAcross, valleyDown } from "@/lib/moireFractal";
import { LENS_SLICES } from "@/lib/moireGeometry";
import type { Look, LookTerms } from "@/lib/moireLook";
import { clamp, denormalize } from "@/lib/range";
import { tunable } from "@/lib/moireTuning";

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
export const SHARD_REACH = tunable("shards.reach", 0.15, { min: 0, max: 0.5, step: 0.005 });

/**
 * The depth the k-th standing automator reads the count at, as a scale over the first's: the beat's
 * own rest on the bench (`BEAT_DIAL`). Two cross-sections a ratio apart have contours that cross
 * everywhere rather than on the rungs their breaths happen to differ on, so the second tear is a
 * different tear and not the first one deeper.
 */
export const SHARD_RATIO = tunable("shards.ratio", 1.5, { min: 1, max: 3, step: 0.05 });

/**
 * And a quarter turn per automator on the throw's cosine. The zoom alone leaves the slow middle
 * slices, where the count barely climbs, in the same piece — two tears that agree where the plane is
 * open and differ only in the filigree read as one tear with a frayed edge.
 */
export const SHARD_PHASE = tunable("shards.phase", 0.25, { min: 0, max: 1, step: 0.01 });

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
export const SHARD_STEP = tunable("shards.step", 2, { min: 1, max: 8, step: 1 });

/**
 * How many times wider than the step a piece is for an automator holding one effect. The pieces
 * start big and splinter as the run fills, reaching the step itself at a full run
 * (`GROWTH_COUNT_MAX`), so a picture torn by a young run is a few large pieces and one torn by a
 * full run is twice as many (0298). Two, geometrically: four cycles a piece at one held is one or
 * two seams down an open column, which is torn and not merely slid, and a full run doubling that
 * is still pieces and not a texture.
 */
export const SHARD_WIDEST = tunable("shards.widest", 2, { min: 1, max: 4, step: 0.1 });

/**
 * How many cycles of the count one piece spans for an automator whose run holds `held` effects —
 * the presences its places stand at, summed, so a piece narrows as a place arrives rather than
 * snapping when it has. Widest at one held and never wider: a run holding nothing yet is torn as a
 * run holding one, because an automator standing is a tear (0296).
 */
export const shardWidth = (held: number): number =>
  SHARD_STEP.value *
  SHARD_WIDEST.value **
    ((GROWTH_COUNT_MAX - clamp(held, 1, GROWTH_COUNT_MAX)) / (GROWTH_COUNT_MAX - 1));

/**
 * And how much wider still a run being held is torn — the Wait, as a turn of its own range. A hold
 * is the one knob that says *nothing is laid at all*, so a picture of it is a picture that has
 * stopped splintering: the seams stand further apart the longer the hold a hand has asked for, and
 * a run nobody is holding is torn exactly as it was (0215, 0360). At the top of the band a piece is
 * this many times the width its run alone would give it.
 */
export const SHARD_HOLD = tunable("shards.hold", 4, { min: 1, max: 8, step: 0.1 });

/** One run's piece width: how young its run is, widened by how long a hand is holding it. */
export const shardSpacing = (held: number, spacing: number): number =>
  shardWidth(held) * denormalize(spacing, 1, SHARD_HOLD.value);

/**
 * How far into the structure a run's tear looks, as a scale over the depth its place in the rack
 * already gives it — the Least, as a turn of its own range. A run whose floor is high is never
 * empty, so its tear is read from *inside* the structure rather than across the open plane: the
 * same slices span less of it, so the count climbs through fewer cycles and the pieces are larger
 * and cut from the filigree of one place rather than from the sweep of the whole. A run that may
 * fall to nothing reads the plane it always did — at the floor of the band the depth is the one the
 * tear has had since 0296, so a term nobody stated changes nothing.
 *
 * **Larger pieces and not finer ones**, which is how it stays a different thing from the Wait: the
 * hold widens the piece a count of cycles is cut into and this changes how many cycles there are to
 * cut, so the two move the same way through two different numbers and a picture under both is not
 * the picture under either.
 */
export const SHARD_DEEPEST = tunable("shards.deepest", 4, { min: 1, max: 16, step: 0.1 });

export const shardLens = (lens: number): number => denormalize(lens, 1, SHARD_DEEPEST.value);

/**
 * How much of its own reach a run's tear still throws — the Fade, as a turn of its own range. A
 * fade is how long an arrival takes, so a run whose places take most of a phrase to come and go is
 * never wholly anywhere, and its seam is half open where a run that switches is torn the whole way.
 * The least it falls to; at no fade at all the throw is the one the tear has always had.
 */
export const SHARD_FADED = tunable("shards.faded", 0.4, { min: 0.1, max: 1, step: 0.01 });

export const shardFaded = (fade: number): number => denormalize(fade, 1, SHARD_FADED.value);

/**
 * How much of a turn the hourglass takes the whole layer round — the wait a run has *left*, read
 * against `SHARD_GLASS_SECS` and not against the knob's own ten minutes, which is a fact about the
 * moment and never a knob (`looksHeldInto`, 0215, 0360). Half a
 * turn at a hold of a passage or longer: every piece is thrown the way it was not, and as it empties
 * the pieces travel back through their own throws until, at nought, the tear stands where a run
 * nobody held always tore it. So a wait counting down is the tear closing.
 */
export const SHARD_WAIT = tunable("shards.wait", 0.5, { min: 0, max: 1, step: 0.01 });

/**
 * The turn each successive piece takes on the throw's cosine: the golden ratio's conjugate, so
 * consecutive pieces land on phases spread over the whole circle and no run of pieces climbs one
 * flank of the wave together. Neighbouring pieces are thrown by unrelated amounts, which is what a
 * seam is; a turn of a simple fraction would repeat every few pieces.
 */
export const SHARD_SCATTER = (Math.sqrt(5) - 1) / 2;

/**
 * How many times the golden turn one piece takes on from the last — the Wander, as a turn of its
 * own range. Wander is how alive a standing value is once it is drawn, and on the picture that is
 * how unlike its neighbour a piece is thrown: the turn stays an irrational share of the circle at
 * every setting, so no setting of this knob is the wave 0297 refused, but which pieces happen to
 * pair up moves with it. One at the floor, which is the scatter the tear has always taken.
 */
export const SHARD_STIR = tunable("shards.stir", 3, { min: 1, max: 6, step: 0.1 });

export const shardStir = (wander: number): number =>
  SHARD_SCATTER * denormalize(wander, 1, SHARD_STIR.value);

/**
 * The second read of a piece, independent of the one its throw is taken on: how much of the picture
 * is torn at all — the Odds, as a turn of its own range. A piece whose place along this read falls
 * outside the share stands exactly where it was, so a run that fills one tick in three tears a
 * third of the picture and leaves the rest of the field standing, which is what thinner odds are.
 * Its own irrational turn, because the throw's own scatter would make the share pick a side of the
 * wave and a thinned tear would be a tear one way only.
 */
export const SHARD_ODDS_TURN = Math.SQRT2 - 1;

/**
 * And how little of the picture the thinnest odds may leave torn. **Not nought**, because the run's
 * floor beats the odds — a tick that would leave fewer than Least standing lays whatever the roll
 * said (`effectGrowth.ts`) — so a run at no odds at all is still standing, still holding its floor
 * and still audible, and a picture that tore none of it would say no automator was there, which is
 * the one thing 0296 fixed. A quarter: thin enough that most of the field stands where it was, and
 * enough that the tear is still a tear.
 */
export const SHARD_LEAST_TORN = 0.25;

/**
 * How long a hold has to be to read as the whole hourglass, in seconds. **Its own band and never
 * the knob's**: a hand may ask for ten minutes (`WAIT_MAX`), and a hold read as a share of *that*
 * would move the picture by a fortieth of a turn for the half-minute hold somebody actually takes —
 * which is the hourglass invisible for every use of it but the lock. Half a minute, because a hold
 * is taken to keep what is standing for a passage, and a passage is about that long; anything
 * longer, the lock included, is the whole turn.
 */
export const SHARD_GLASS_SECS = 30;

/** The down throw's phase against the across: a quarter behind, as the bench threw it. */
export const SHARD_DOWN = tunable("shards.down", -0.25, { min: -1, max: 1, step: 0.05 });

/**
 * One run as the tear reads it: how present its automator is, how much its run holds, how much of
 * the hold a hand asked for is still to run (on 0..1) and the terms its knobs make of the look.
 * Filled in place by `looksShards` into a table the painter keeps, never built on a frame (0070).
 */
export type ShardRun = {
  presence: number;
  held: number;
  waited: number;
  terms: LookTerms;
};

/**
 * One automator's throw of one slice: its `reach` — presence, the look's reach and the fade its run
 * is drawn with — on a cosine of the piece the count read at the slice's middle falls in, `wide`
 * cycles a piece, scattered `stir` a piece and `phase` on for this layer and this direction. A piece
 * whose own independent read falls outside `share` is not thrown at all, which is what thinner odds
 * are. Nought at no presence, which is what a tear on its way in or out is a share of.
 */
const throwOf = (
  reach: number,
  count: number,
  wide: number,
  stir: number,
  share: number,
  phase: number,
): number => {
  const piece = Math.floor(count / wide);
  return wrap(piece * SHARD_ODDS_TURN, 1) < share ? reach * cosTurn(piece * stir + phase) : 0;
};

/** How many doubles one automator's layer of the table is: every slice across, every column down. */
export const SHARD_LAYER = 2 * LENS_SLICES;

/**
 * The table the cut spends, into `out`, one layer per automator of the `standing` (0298): layer `k`
 * is `out[k·SHARD_LAYER ‥ k·SHARD_LAYER + LENS_SLICES)`, how far the k-th automator throws each
 * slice across, and the `LENS_SLICES` after it, how far it throws each column down, both as shares of
 * the height. Per automator, per slice, the count at the slice's middle on the centre column — or
 * the column's middle on the centre row — in reference radii, at the depth that automator reads the
 * structure at (`SHARD_RATIO`, over the seed's own zoom and its Least), cut into pieces as wide as
 * its run is young and as long as it is held (`shardSpacing`).
 *
 * **Layers and never a sum**: the cut throws the picture by layer 0, then throws what that left by
 * layer 1, and so on, so a second automator tears pieces of the first's pieces and the two are never
 * one table added up. Nothing is clamped, because one automator's throw is bounded by its reach and
 * no layer reads another's.
 *
 * **The seed is the one the picture already stands on**, at a fly of nought: the roam is continuous
 * and is the plane the picture is cut from, so the tear moving with it is the field moving under it
 * and no motion of its own (0126); the flight and the breath are stepped ladders on the tiles, and a
 * tear that stepped with them would snap where the rows crossfade (0261). **Displaced along the
 * valley by each run's own Seed** (0360): the roam still carries every layer together, and where a
 * layer stands along the notch is its own, so two automators on two seeds are two valleys and never
 * one plane read twice. At most `SHARD_CAP` times `SHARD_LAYER` kernel reads a painting, into a
 * table the caller keeps: no allocation (0070) and no read-back (0129).
 */
export function shardsInto(
  out: Float64Array,
  seed: Readonly<FractalSeed>,
  ref: number,
  width: number,
  height: number,
  runs: readonly Readonly<ShardRun>[],
  standing: number,
): void {
  if (out.length < SHARD_CAP * SHARD_LAYER) {
    throw new Error(
      `A throw table of ${out.length} holds no ${SHARD_CAP} layers of ${SHARD_LAYER}.`,
    );
  }
  if (standing < 0 || standing > SHARD_CAP || standing > runs.length) {
    throw new Error(`${standing} automators is not a count the picture tears for.`);
  }
  out.fill(0, 0, standing * SHARD_LAYER);
  const { fly } = seed;
  for (let k = 0; k < standing; k++) {
    const run = runs[k];
    if (run === undefined || run.presence <= 0) continue;
    const { terms } = run;
    // Every term absent is the tear exactly as 0296 and 0298 shipped it, which is what makes a
    // fixture that states none of them the picture the look has always drawn.
    const cx = seed.cx + valleyAcross(terms.seed ?? 0);
    const cy = seed.cy + valleyDown(terms.seed ?? 0);
    const zoom = seed.zoom * SHARD_RATIO.value ** k * shardLens(terms.lens ?? 0);
    const wide = shardSpacing(run.held, terms.spacing ?? 0);
    const reach = run.presence * SHARD_REACH.value * shardFaded(terms.fade ?? 0);
    const stir = shardStir(terms.wander ?? 0);
    const share = denormalize(terms.share ?? 1, SHARD_LEAST_TORN, 1);
    const phase = k * SHARD_PHASE.value + SHARD_WAIT.value * clamp(run.waited, 0, 1);
    const layer = k * SHARD_LAYER;
    for (let slice = 0; slice < LENS_SLICES; slice++) {
      const middle = (slice + 0.5) / LENS_SLICES;
      const v = ((middle - 0.5) * height) / ref;
      const u = ((middle - 0.5) * width) / ref;
      out[layer + slice] = throwOf(
        reach,
        escapeTurns(0, v, cx, cy, zoom, fly),
        wide,
        stir,
        share,
        phase,
      );
      out[layer + LENS_SLICES + slice] = throwOf(
        reach,
        escapeTurns(u, 0, cx, cy, zoom, fly),
        wide,
        stir,
        share,
        phase + SHARD_DOWN.value,
      );
    }
  }
}

/**
 * The automator's: how torn the picture is, is how many automators are standing and how much each
 * run holds, which are facts about the run each of them *is* — and beside them the six knobs that
 * shape a run, which are what one *is set to* and so are terms like any other look's (0359, 0360).
 * The Seed is read in its own units, because a seed is a place along the valley and not a turn of a
 * knob; the other five are turns of their own ranges. Cut through the slices the lens already reads
 * the field back in, so it takes no slot in the chain and bakes nothing (0296).
 */
export const shardsLook: Look = {
  at: "cut",
  terms: {
    seed: "value",
    lens: "turn",
    share: "turn",
    spacing: "turn",
    fade: "turn",
    wander: "turn",
  },
};
