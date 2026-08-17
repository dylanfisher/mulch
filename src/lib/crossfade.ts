/**
 * @role The equal-power crossfade law as pure maths — the pair of gains a dry/wet mix position
 *   splits into.
 * @instead The effect that fades with it → src/audio/effects/delay.ts, which samples this into a
 *   shaping curve. Nothing here touches a node or holds state: it is one function of one number.
 */

/**
 * Equal-power gains keep perceived level steadier than a linear crossfade: the two sides trace a
 * quarter of a circle, so their squares sum to one at every position rather than their sums.
 */
export function mixGains(mix: number): { dry: number; wet: number } {
  const angle = mix * (Math.PI / 2);
  return { dry: Math.cos(angle), wet: Math.sin(angle) };
}
