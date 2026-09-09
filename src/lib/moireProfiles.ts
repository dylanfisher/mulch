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
  "cross",
  "peak",
  "flat",
  "twin",
  "lobe",
  "split",
  "swarm",
  "swell",
  "grain",
  "stair",
  "sway",
  "fifth",
] as const;

export type DriftProfile = (typeof DRIFT_PROFILES)[number];

/** The profile a row no effect owns is cut to: the plainest grating there is. */
export const PLAIN_PROFILE: DriftProfile = "plain";

/** The other one, and what a source with transients in it cuts the reference row to (0145). */
export const STRIKE_PROFILE: DriftProfile = "strike";

/**
 * The waves no registry entry may claim, because a row of the instrument's own already draws with
 * them: the loop's reference row, a deck's own lanes, and the jumps module's row, which wears these
 * two and nothing wider for the same reason read from the other side (0212). Two of them since the
 * source began cutting its own reference row (0145) — an effect wearing either would make the
 * picture say a plugin was doing what the file is doing, which is the one thing 0137 exists to
 * prevent. The registry throws at load for an entry claiming one, as it does for a duplicate.
 */
export const RESERVED_PROFILES: readonly DriftProfile[] = [PLAIN_PROFILE, STRIKE_PROFILE];

/**
 * How much of its own share the second or third harmonic carries when a profile is built out of
 * one. A quarter each, so the fundamental and the harmonic still swing the whole way between an
 * open slit and a shut one, and neither buries the other.
 */
const HARMONIC_SHARE = 0.25;

/**
 * How much of a cycle a ramp's fall takes, and how sharply a `flat`'s edges stand up. It is the
 * `strike`'s alone, and it was the `slope`'s too until the filter that claimed that wave left the
 * registry with it (0322) — a wave no entry may draw is maths nothing can reach, which is what the
 * look beside it answered for. The fall
 * is a fraction rather than nothing because the tile is sampled at sixty-four points and drawn at
 * between three and sixteen: an instantaneous edge is the one thing that shimmers under that
 * filtering rather than beating. An eighth of a cycle is a third of a device pixel at the band's
 * finest pitch and two at its coarsest — a fall the eye reads as an edge and the filter does not.
 */
const RAMP_FALL = 0.12;
const FLAT_EDGE = 3;

/**
 * How many steps a `stair` takes either side of its own middle, and how much of the way to a
 * boundary the riser takes, on each side of it. Three steps is a staircase the eye counts rather
 * than a curve it reads as smooth, and the riser is a fraction of a step for the reason
 * `RAMP_FALL` is a fraction of a cycle: the tile is sampled at sixty-four points and drawn at
 * between three and sixteen, so an instantaneous riser shimmers under that filtering rather than
 * beating. Symmetrical about the boundary, so the wave stays odd about its own middle and its mean
 * stays exactly a half.
 */
const STAIR_STEPS = 3;
const STAIR_RISE = 0.12;

/**
 * How far a `sway`'s own crest wanders from where a plain one would stand, as a share of its cycle.
 * The wander is carried by the *second* harmonic and by no other, which is the whole of why this
 * wave still averages a half: a phase term that repeats twice a cycle is unchanged half a cycle
 * along, so the wave stays odd about its own middle exactly as every other one here is, and no
 * amount of it moves the mean off a half.
 *
 * Under `1 / (4π)`, and that bound is what keeps this a crest. The phase runs at
 * `1 - 4π·SWAY_WANDER·sin`, so a wander past that turns the phase back on itself and the crest
 * becomes two — which is a second family and not a deeper cut of this one.
 */
const SWAY_WANDER = 0.07;

/**
 * The two harmonics a `fifth` is built out of, at `HARMONIC_SHARE` each the way every other pair in
 * this file is. They stand a perfect fifth apart — three against two is the ratio itself — which is what makes this the one
 * profile whose shape is a frequency relationship rather than an envelope: it is a crest and the
 * same crest heard again a fixed ratio along, and nothing about it says how anything rises or
 * falls.
 *
 * It carries no fundamental at all, which no other wave here can say, so it is nothing else at any
 * depth: every other profile has a first harmonic and this one begins at the second. The two reach a
 * wholly open slit where their crests coincide and stop a little short of a shut one elsewhere — a shallower cut and not a second family, exactly as `grain` is, because
 * how deep a row is cut is `depth` and that is a dimension of the row. Both harmonics average
 * nothing over the cycle, so the mean is exactly a half by the same construction every wave above
 * it uses.
 */
const FIFTH_LOWER = 2;
const FIFTH_UPPER = 3;

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
 * whatever `fall` is — a triangle of any skew averages its own ends — which is what lets `strike`
 * and `peak` be the same line twice.
 */
const rampBlock = (turn: number, fall: number): number => {
  const at = wrap(turn, 1);
  return at < 1 - fall ? at / (1 - fall) : (1 - at) / fall;
};

/**
 * One value rounded onto `STAIR_STEPS` steps either side of nothing, held flat across the middle
 * of each step and rising over the last `STAIR_RISE` of the way to the boundary, so the edge is one
 * the filter draws rather than one it shimmers on. The levels are `n / STAIR_STEPS` and nothing is
 * one of them, which is what makes this the same rounding the effect it is claimed by does to a
 * sample (`quantise`, src/audio/worklets/crush.js) rather than a staircase half a step off it. Odd
 * about nothing and flat at ±1, which is what keeps `stair` inside the ink and its mean at a half.
 */
const stairStep = (value: number): number => {
  const scaled = value * STAIR_STEPS;
  const step = Math.round(scaled);
  const past = scaled - step;
  const riser = clamp((Math.abs(past) - (0.5 - STAIR_RISE)) / STAIR_RISE, 0, 1);
  return (step + Math.sign(past) * 0.5 * riser) / STAIR_STEPS;
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
  // eighth of the cycle and down across the rest of it, which is a strike and its decay. Its edge
  // stands where the cycle begins: the reference row's zero is the top of the loop, so that edge is
  // the loop point drawn rather than inferred (0145).
  strike: (turn) => rampBlock(turn, 1 - RAMP_FALL),
  // A crest that leans across its own cycle: the fundamental with the second harmonic a quarter of
  // that harmonic's own cycle along, so the wave is skewed one way at its crest and the other at its
  // trough — a thing moving across rather than a shape standing in place, which is what a panner is.
  // The pair to check is `twin` and `split`, which are this same pair of harmonics in step and in
  // antiphase: a quarter turn is neither, so the beat between the two terms falls where neither of
  // those puts it and no depth of either is this one (0122). It reaches a little short of both ends,
  // which is a shallower cut and not a second family, exactly as `fifth` and `grain` are.
  cross: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn) + cosTurn(turn + 0.125, 2)),
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
  // A crest pulled away from its own middle: the cosine squared about its own sign, which is the
  // expander's own curve drawn as a wave — what stood out stands further out and what did not is
  // pressed toward the middle. Odd about the half cycle, so it still averages a half, and it
  // reaches both ends because a unit cosine times its own magnitude still does. Squared rather
  // than cubed, and that is the whole of why it is a wave of its own: a cube is exactly `swarm`'s
  // deviation at one and a half times the size, and depth is a dimension of the row rather than of
  // the profile, so the two would beat into one family of fringes at a depth ratio (0122).
  swell: (turn) => 0.5 - 0.5 * cosTurn(turn) * Math.abs(cosTurn(turn)),
  // A crest heard again in pieces: the fourth harmonic, present only for the part of the cycle the
  // fundamental lets it through. A product rather than a sum, which is the whole of why it is a
  // family of its own — the two terms beat into sidebands at the third and fifth as well as the
  // fourth, so no depth of any other row is this one (0122). Its mean is exactly a half because
  // both a harmonic and a harmonic times another one average nothing over a cycle. It reaches a
  // wholly open slit where the two crests coincide and stops a little short of a shut one
  // elsewhere, which is a shallower cut and not a second family: how deep a row is cut is `depth`,
  // a dimension of the row.
  grain: (turn) => 0.5 - 0.5 * cosTurn(turn, 4) * (0.5 + 0.5 * cosTurn(turn)),
  // A crest climbed in steps: the plain cosine quantised onto a few levels, which is the crusher
  // drawn as itself. Stepped edges are a family nothing else in this list has — every other wave
  // is a sum of harmonics or a ramp, so all of them are smooth between their own turns and this
  // one is flat between its risers. It is not `plain` at a depth ratio for the same reason: a
  // quantiser is not a multiplier, so the two deviate by a different factor at every turn (0122).
  stair: (turn) => 0.5 - 0.5 * stairStep(cosTurn(turn)),
  // A crest whose own position wanders: the plain cosine read at a phase that runs fast and then
  // slow across the cycle, which is the modulation drawn as modulation — the crest stands off the
  // middle of its own cycle and the shoulder after it is long. Not `split` at another size, which
  // is the pair to check because a tape's wow is this same idea at a size a hand does not hear
  // (0122): `split` is a fundamental and a second harmonic, and this one carries no second harmonic
  // at all and every odd one instead, so no depth of either is the other.
  sway: (turn) => halfCosine(turn + SWAY_WANDER * cosTurn(turn, 2)),
  // A crest heard again a fixed ratio along: two harmonics a perfect fifth apart, which is the
  // transposition drawn as the interval itself rather than as anything happening over time. The
  // pair to check is `twin`, which is also two harmonics in step — but `twin`'s are the first and
  // the second, an octave, and these are the second and the third, so the beat between them falls
  // where neither of `twin`'s does and no depth of either is the other (0122).
  fifth: (turn) => 0.5 - HARMONIC_SHARE * (cosTurn(turn, FIFTH_LOWER) + cosTurn(turn, FIFTH_UPPER)),
};

/**
 * How much of the ink a grating cut to `profile` takes at `turn` of its own cycle — the tile a
 * painter writes, and the only place a profile is a number.
 */
export const profileBlock = (profile: DriftProfile, turn: number): number =>
  PROFILE_WAVES[profile](turn);
