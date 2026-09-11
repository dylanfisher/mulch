/**
 * @role The compressor's look, whole: how far the picture's range is closed up, between what floor
 *   and what ceiling, and the two composites that close it — the field's own alpha put through one
 *   affine squeeze, so the ink thins and the windows dim toward each other. A whole look in a file
 *   of its own, for `bandLook`'s reason (0287): src/lib/moireLook.ts stood at the 800-line hard cap
 *   when this landed, so what moved is a whole look and never half of one.
 * @instead What a look is at all — the names, the terms, where each lands, and the seven passes
 *   that landed before this one → src/lib/moireLook.ts. How a term is read off the entry's own
 *   knob, and the travel every presence takes → src/ui/moireLooks.ts. The declaration itself →
 *   `look` and `lookFrom` on src/audio/effects/compressor.ts.
 */
import type { Look, LookPass } from "@/lib/moireLook";
import { weighed } from "@/lib/moireWeigh";
import { clamp, denormalize } from "@/lib/range";
import { tunable } from "@/lib/moireTuning";

/**
 * **Which end of the mask is which, because everything below turns on it.** The field is the ground
 * with every grating cut out of it and the screen is cut by the field `destination-out`
 * (`groundOf`, src/ui/moireCanvas.ts), so the picture's ink stands where the field has *none* and
 * the picture's windows stand where the field is covered. A floor laid under the field's own blank
 * is therefore ink taken off the picture's deepest ink, and a ceiling brought down over the field's
 * covered pixels is ink put into its windows. 0287 states the same fact from the band's side.
 *
 * The most of the field's own range the squash's floor ever comes up by. Named for what it bounds
 * and not `SQUASH_CEILING`, because the ceiling is this look's other term and one word may not mean
 * both. Well short of the ceiling's own shut end, because what a compressor says is that the
 * picture's loud and quiet are nearer together — never that they are the same thing: at the first
 * cut of this a floor of 0.4 against a ceiling of 0.5 left the strip at a swing of 0.008 against
 * `BASE`'s 0.032, which is a squash that has eaten what it squashed (0288).
 */
export const SQUASH_FLOOR = tunable("look.squashFloor", 0.2, { min: 0.05, max: 0.5, step: 0.01 });

/**
 * Where the field's coverage is closed up *to*, as a share of full coverage: the band the ceiling
 * term is stated across, **open end last**, because the term is the Threshold's own turn and a
 * threshold reads that way round — at the top of the knob nothing is over it and the field is at
 * the whole of itself, and at the bottom of it everything the picture has is over it. The soften's
 * band is the one this is shaped after (0286), and it closes at one for the same reason: a
 * threshold no signal reaches is a wire. Its shut end stands clear of `SQUASH_FLOOR`, which is what
 * keeps a range in the picture at every setting of the two knobs.
 */
export const SQUASH_TOP: readonly [number, number] = [0.7, 1];

/**
 * The bottom of the range the field is squashed into — the level laid under the mask's own blank,
 * which is where the picture's deepest ink stands: the floor its entry declared, weighed by how
 * present the picture has travelled the instance to (0279). **The Ratio is read twice and both
 * readings stand at nought in the same place**, which is the filter's answer and not the bloom's
 * (0286, 0202): the presence this entry declares is the Ratio's own distance from one to one, and
 * the term is that same knob's turn — so a compressor standing at one to one lays no floor
 * whichever of the two numbers is asked, and the term says so rather than leaving the presence to
 * say it.
 *
 * A presence times a share under a ceiling is what `weighed` states, taken **from
 * src/lib/moireWeigh.ts and never from the contract file**: a look declared in a file of its own may
 * take only _types_ from there, because the contract file imports this look's own declaration and a
 * value read back across that cycle is `undefined` at the moment `LOOKS` is built. This file spelt
 * the shape out by hand until the double made it a third copy, and 0289 moved the declaration to a
 * module every look reaches instead (principle 3).
 */
export const squashFloor = (presence: number, floor: number): number =>
  weighed(presence, floor, SQUASH_FLOOR.value);

/**
 * And the top of it — where the mask's covered pixels are brought down to, which is where the
 * picture's windows stand: the ceiling its entry declared, walked out from the field's own whole
 * range by the same presence. The blocks' walk and not the bloom's weighed share (0281, 0286),
 * because what travels here is where the range _ends_ and not how much of something is laid over
 * the picture; a compressor the picture has not travelled to yet is the field at the whole of
 * itself. Spelt out rather than shared with `blockSize` for the reason above, and
 * it is that walk's third site: folding the three together wants a module neither file's cycle
 * reaches, which is four passes' worth of change and not this step's.
 */
export const squashCeiling = (presence: number, ceiling: number): number =>
  1 + clamp(presence, 0, 1) * (denormalize(ceiling, ...SQUASH_TOP) - 1);

/**
 * How far the whole squashed range is pushed back up the field: the Makeup, which is the one knob
 * on this entry that puts back what the threshold took off, so in the picture it puts back what the
 * pass took out — the floor and the ceiling carried up together, and the floor alone once the
 * ceiling is at the field's whole range (0359). The most of the field's range it may carry them.
 *
 * **Bounded by the ceiling's own band and not by a number of its own**: the most room the ceiling
 * ever has is `1 - SQUASH_TOP[0]`, so a dial past that could only ever move the floor, and half of
 * its travel would be a slider the picture does not answer. Read off the band rather than spelt as
 * the same number twice (principle 1), so moving the ceiling's shut end moves this with it.
 */
export const SQUASH_LIFT = tunable("look.squashLift", 0.2, {
  min: 0,
  max: 1 - SQUASH_TOP[0],
  step: 0.01,
});

/**
 * How many doublings of the makeup gain are the whole of that lift. Read off the gain's own value
 * and not its turn, because unity is the one setting that means *unchanged* and a knob's middle is
 * not it: a makeup at one puts nothing back and lifts nothing, whatever range the declaration gives
 * it. Two doublings — the gain at four times — is the whole of the lift, which is what this look
 * has to say about a makeup; past that a gain is a level and not a threshold put back.
 */
const SQUASH_LIFT_DOUBLINGS = 2;

export const squashLift = (presence: number, makeup: number): number =>
  weighed(presence, Math.log2(Math.max(makeup, 1)) / SQUASH_LIFT_DOUBLINGS, SQUASH_LIFT.value);

/**
 * The squash, drawn: the field at a share of itself, and one flat alpha laid `destination-over`
 * under it. With the field covering `c` that leaves `floor + (top - floor)·c` — the whole of the
 * mask's range mapped onto the shorter one between the two, which is the one affine squeeze this
 * pass is. The draw carries `(top - floor) / (1 - floor)`, which is the share that lands the top of
 * the range exactly where the ceiling says once the floor is under it, and the fill carries the
 * floor itself. Two draws, no pixel touched and no surface made (0129).
 *
 * **The floor is the one fill in the chain, and it can be nothing else** (0288). Every pass before
 * this draws the field, because 0269 refuses a rectangle that lands its own flat edge wherever the
 * mask was blank as well as where it was covered. That flat edge is exactly what a floor _is_: the
 * mask's blank is the picture's deepest ink, and every composite of the field with itself leaves
 * nought at nought, so a squash made only of draws cannot thin an ink line at all. The shot says
 * the same — the floor drawn as the field over itself left the strip's whole block swing standing
 * and moved only its mean, which is a brightener and not a squash.
 *
 * **The ceiling half needs no fill and so is not given one**, which is where the plan's stated pair
 * is narrowed: a `destination-in` at the ceiling and the field drawn at the ceiling's own share are
 * the same arithmetic on a cleared surface, and the second is a draw of the field. So the exception
 * this pass takes out of 0269 is one composite wide and not two.
 */
const squashPass: LookPass = (into, source, presence, terms) => {
  const ceiling = squashCeiling(presence, terms.ceiling ?? 1);
  // The makeup carries the pair up together — the ceiling as far as there is room under the field's
  // whole range, and **the floor by the whole of the lift whether there was room or not**: a
  // threshold at the top of its own knob leaves the ceiling nowhere to go, and a makeup that moved
  // nothing there would be a knob the picture does not answer at all. What it does instead is what
  // a level put back past the ceiling does to a sound: it pushes the deepest ink up into the
  // windows. The floor stays under the ceiling and under one at every setting, because the lift is
  // bounded by the ceiling's own band and the floor by `SQUASH_FLOOR`.
  const lift = squashLift(presence, terms.lift ?? 1);
  const top = ceiling + Math.min(lift, 1 - ceiling);
  const floor = squashFloor(presence, terms.floor ?? 0) + lift;
  // A compressor at one to one, and one the picture has not travelled to yet, are both the field it
  // came from — and one draw of it at the whole of itself is what says so.
  if (floor <= 0 && top >= 1) {
    into.drawImage(source, 0, 0);
    return;
  }
  const { width, height } = source;
  // The floor is well under one — `SQUASH_FLOOR`'s own ceiling and the lift's together come to less
  // than four fifths — so the share is a share and the divide is safe.
  into.globalAlpha = (top - floor) / (1 - floor);
  into.drawImage(source, 0, 0);
  // No `fillStyle`, and none is wanted: the field is a mask and only its alpha ever reaches the
  // screen (docs/boundaries.md, `groundOf` in src/ui/moireCanvas.ts), so what colour a surface
  // fills with is not a fact the picture has — and writing one here would be the one colour
  // literal outside the tokens, for a channel nothing reads.
  into.globalCompositeOperation = "destination-over";
  into.globalAlpha = floor;
  into.fillRect(0, 0, width, height);
};

/**
 * Compressor's, and the eighth look to take a slot in the chain: the picture's whole range closed
 * up toward its own middle, so the ink thins and the windows dim and what is left is flatter than
 * what the rows drew. How far the floor comes up under the picture's ink is the Ratio — the knob
 * this entry's presence is already read off, standing at nought with it at one to one (0202) — and
 * how far the ceiling comes down into its windows is the Threshold, on its own range. **And how far
 * the pair is carried back up is the Makeup** (0359), read as the gain itself rather than as a turn:
 * what a makeup does to a sound is put the level back after the threshold took it off, and this is
 * that said of the picture's own range.
 */
export const squashLook: Look = {
  at: "pass",
  terms: { floor: "turn", ceiling: "turn", lift: "value" },
  pass: squashPass,
};
