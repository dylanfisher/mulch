/**
 * @role One wave per drift profile, and the whole of what a profile is: the shapes a row's grating
 *   is cut to, which of them no effect may claim, and the number a painter writes for one.
 * @instead A row's own geometry, pitch and bend → src/lib/moire.ts, which is where the rest of the
 *   picture's maths is and which this file was the tail of until it reached the hard cap (0045).
 */
import { clamp } from "./range.ts";
import { cosTurn, halfCosine, wrap } from "./moire.ts";

/**
 * The shapes a row's grating is cut to across one of its own cycles. **A row's pitch says how fast
 * something is running and its angle says which parameter it is; neither says what kind of thing
 * is doing it** — a filter and a delay were one more cosine each and read alike. A profile is the
 * dimension an effect impresses itself on: two gratings beat into the fringes their harmonics
 * share, so a crest with an echo behind it and a crest clipped flat cross into different families
 * of fringes at the same pitch and the same angle.
 *
 * `plain` and `strike` belong to no effect: they are what a deck's own lanes are cut to, and the
 * two the loop's reference row is cut to by the source it is playing (`RESERVED_PROFILES`, 0145).
 * Every other one is claimed by exactly one registry entry, beside its icon and its parameters,
 * and the registry throws at load for two that claim the same (0122) — so an effect added without
 * a look of its own fails rather than drawing as one that already exists.
 */
export const DRIFT_PROFILES = [
  "plain",
  "strike",
  "slope",
  "peak",
  "flat",
  "twin",
  "lobe",
  "split",
  "swarm",
] as const;

export type DriftProfile = (typeof DRIFT_PROFILES)[number];

/** The profile a row no effect owns is cut to: the plainest grating there is. */
export const PLAIN_PROFILE: DriftProfile = "plain";

/** The other one, and what a source with transients in it cuts the reference row to (0145). */
export const STRIKE_PROFILE: DriftProfile = "strike";

/**
 * The waves no registry entry may claim, because a row of the instrument's own already draws with
 * them: the loop's reference row and a deck's own lanes. Two of them since the source began
 * cutting its own reference row (0145) — an effect wearing either would make the picture say a
 * plugin was doing what the file is doing, which is the one thing 0137 exists to prevent. The
 * registry throws at load for an entry claiming one, exactly as it does for a duplicate.
 */
export const RESERVED_PROFILES: readonly DriftProfile[] = [PLAIN_PROFILE, STRIKE_PROFILE];

/**
 * How much of its own share the second or third harmonic carries when a profile is built out of
 * one. A quarter each, so the fundamental and the harmonic still swing the whole way between an
 * open slit and a shut one, and neither buries the other.
 */
const HARMONIC_SHARE = 0.25;

/**
 * How much of a cycle a `slope`'s fall takes, and how sharply a `flat`'s edges stand up. The fall
 * is a fraction rather than nothing because the tile is sampled at sixty-four points and drawn at
 * between three and sixteen: an instantaneous edge is the one thing that shimmers under that
 * filtering rather than beating. An eighth of a cycle is a third of a device pixel at the band's
 * finest pitch and two at its coarsest — a fall the eye reads as an edge and the filter does not.
 */
const SLOPE_FALL = 0.12;
const FLAT_EDGE = 3;

/**
 * The octaves a self-similar profile is built out of, and what the three of them come to together.
 * An octave stack rather than an arbitrary harmonic pair: each term is half the one below it at
 * twice its rate, so the wave carries the same shape at three scales and beats against every other
 * row at each of them — which is the whole of a moiré inside a moiré (0143).
 *
 * It stops at the fourth harmonic because the drawing does: `TILE_PX` samples one cycle sixty-four
 * times and `gratingPitch` draws it at between three and a half and fourteen device pixels, so a
 * harmonic past about the eighth is a spacing the pixels alias rather than beat. The share is what
 * makes the three of them swing exactly between an open slit and a shut one, so the wave still
 * averages a half and never leaves 0..1.
 */
const OCTAVE_DEPTHS = 1 + 1 / 2 + 1 / 4;
const OCTAVE_SHARE = 0.5 / OCTAVE_DEPTHS;

/**
 * A ramp that rises across the cycle and falls back over `fall` of it. Its mean is exactly a half
 * whatever `fall` is — a triangle of any skew averages its own ends — which is what lets `slope`
 * and `peak` be the same line twice.
 */
const rampBlock = (turn: number, fall: number): number => {
  const at = wrap(turn, 1);
  return at < 1 - fall ? at / (1 - fall) : (1 - at) / fall;
};

/**
 * One wave per profile, and the whole of what a profile is.
 *
 * **Every one of them averages exactly a half over a cycle**, which is not decoration:
 * `gratingDepth` solves for a depth on the assumption that one grating keeps `1 - depth / 2`, so a
 * profile with a mean of its own would make the picture's brightness say which effects a yard
 * holds rather than how deep its gratings are cut. Each is therefore written as a half plus a term
 * that integrates to nothing — a cosine and its harmonics, or a ramp, both zero-mean by
 * construction.
 */
const PROFILE_WAVES: Record<DriftProfile, (turn: number) => number> = {
  // The plain wave a row no effect owns is cut to: the loop's reference row, and a deck's own
  // knobs. One entry per profile and the record is total, so a profile added without a wave of its
  // own fails to compile rather than quietly drawing as this one.
  plain: (turn) => halfCosine(turn),
  // The other wave no effect may claim: a source with transients in it, drawn as one — up over an
  // eighth of the cycle and down across the rest of it, which is a strike and its decay. The same
  // ramp `slope` is and reversed, so its edge stands where the cycle begins: the reference row's
  // zero is the top of the loop, so that edge is the loop point drawn rather than inferred (0145).
  strike: (turn) => rampBlock(turn, 1 - SLOPE_FALL),
  // A slope: the spectrum falling away past a cutoff, cut off and begun again.
  slope: (turn) => rampBlock(turn, SLOPE_FALL),
  // One band lifted and its skirts either side of it — the same ramp, fallen symmetrically.
  peak: (turn) => rampBlock(turn, 0.5),
  // A crest clipped flat, which is what a compressor does to one.
  flat: (turn) => 0.5 - 0.5 * clamp(FLAT_EDGE * cosTurn(turn), -1, 1),
  // A crest with its echo behind it: the second harmonic in step, sharpening the crest.
  twin: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn) + cosTurn(turn, 2)),
  // A crest ringing out into side lobes at every scale: an octave stack, which is what a tail
  // sounds like — the same shape again half as loud and twice as often, twice over.
  lobe: (turn) =>
    0.5 - OCTAVE_SHARE * (cosTurn(turn) + cosTurn(turn, 2) / 2 + cosTurn(turn, 4) / 4),
  // A crest wandering into two — wow and flutter, the tape's own instability.
  split: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn) - cosTurn(turn, 2)),
  // A crest crowded by a third of itself: many things at once, none of them the whole of it, which
  // is what a rack somebody is not holding sounds like. The odd harmonic keeps it distinct from
  // `twin`'s second and `lobe`'s octaves at every pitch they are drawn at (0204).
  swarm: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn) + cosTurn(turn, 3) / 3),
};

/**
 * How much of the ink a grating cut to `profile` takes at `turn` of its own cycle — the tile a
 * painter writes, and the only place a profile is a number.
 */
export const profileBlock = (profile: DriftProfile, turn: number): number =>
  PROFILE_WAVES[profile](turn);
