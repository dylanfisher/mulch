/**
 * @role The two noises a picture with no pitch in it is drawn from: a value in nought to one from
 *   two whole numbers, and the smooth streaked field four hashed corners of it make. Pure maths, no
 *   canvas, no clock — written rather than drawn from a generator so that two shots of one picture
 *   are the same picture (0247).
 * @instead The grain a look bakes over the whole picture, which is a tile and not a function →
 *   src/lib/moireGrain.ts. The cosine every mark with a pitch is cut with → `sceneAxis` in
 *   src/lib/moireScene.ts. The fields these are read into → src/ui/scene/ and
 *   src/ui/sketch/sketchStillField.ts.
 */

/**
 * A value in nought to one from two whole numbers — the stand-in for a seed, so a head bobs out of
 * phase with its neighbour and a seed catches the light where the one beside it does not. Written
 * rather than drawn from a generator for the fake walk's reason: two shots of one still have to be
 * the same picture (0247).
 */
export function hash2(a: number, b: number): number {
  const mixed = Math.sin(a * 127.1 + b * 311.7) * 43_758.545_3;
  return mixed - Math.floor(mixed);
}

/**
 * Smooth value noise, sampled anisotropically: one cell is `wide` of the scale's pixels across and
 * `tall` of them down, so a field of it reads as **fibres lying one way** rather than as blobs.
 * Four hashed corners with a smooth step between them — the cheapest thing that is soft everywhere,
 * has an edge nowhere, and repeats nowhere.
 *
 * **Two of the pictures need this and no product of gratings can give it.** A mass of grass and a
 * wall of leaf are textures with no spacing in them; two gratings crossed always have one, and what
 * comes out is a comb, a herringbone or a moiré. A ripple and a lattice of poppies do have a pitch,
 * and stay on gratings.
 */
export function streakAt(across: number, down: number, wide: number, tall: number): number {
  const gx = across / wide;
  const gy = down / tall;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
