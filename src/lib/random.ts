/**
 * @role The one seeded PRNG the app draws from — mulberry32, 32 bits of state, as a pure
 *   function of a seed. Reproducibility is the whole point: an offline render of the same
 *   session has to fingerprint the same twice (docs/plan.md §3), which `Math.random()` makes
 *   impossible.
 * @instead Indexing a pool from an opaque id → `fold` in src/lib/copy.ts, which is a hash and not
 *   a generator. The two worklet-side noise sources are xorshift32 and stay where they are:
 *   src/lib/impulse.ts and src/audio/worklets/tape.js already render golden samples, and swapping
 *   a generator under them would move every fingerprint that measures one.
 */

/**
 * A seeded generator of numbers in [0, 1). mulberry32 — uniform enough for a noise source and for
 * drawing a position out of a pattern, and nothing else: it is not a cryptographic anything.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
