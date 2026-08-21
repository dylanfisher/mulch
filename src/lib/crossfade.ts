/**
 * @role The equal-power crossfade law as pure maths — the pair of gains a dry/wet mix position
 *   splits into, and the same law sampled as the shaping curve a graph fades with.
 * @instead The effects that fade with it → src/audio/effects/delay.ts and reverb.ts, which hand
 *   the curve below to a WaveShaper. Nothing here touches a node or holds state: it is one
 *   function of one number, and one array sampled from it.
 */

/**
 * Equal-power gains keep perceived level steadier than a linear crossfade: the two sides trace a
 * quarter of a circle, so their squares sum to one at every position rather than their sums.
 */
export function mixGains(mix: number): { dry: number; wet: number } {
  const angle = mix * (Math.PI / 2);
  return { dry: Math.cos(angle), wet: Math.sin(angle) };
}

/**
 * Odd, so `mix` at 0, 0.5 and 1 land exactly on a sample rather than between two of them: a
 * WaveShaper reads its curve over [-1, 1] and interpolates, and the mix range is the upper half.
 */
const MIX_CURVE_STEPS = 2_049;

/**
 * One side of the law as a shaping curve, sampled from `mixGains` rather than restated — the law
 * is one function, whether a test asks it for a number or a graph asks it for a curve. Inputs
 * below the parameter's own range hold the endpoint; nothing can send one, because the registry
 * range is what a value and a lane are both normalized to.
 */
export function mixCurve(side: "dry" | "wet"): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(MIX_CURVE_STEPS);
  for (let i = 0; i < MIX_CURVE_STEPS; i++) {
    const x = (i / (MIX_CURVE_STEPS - 1)) * 2 - 1;
    curve[i] = mixGains(Math.max(0, x))[side];
  }
  return curve;
}
