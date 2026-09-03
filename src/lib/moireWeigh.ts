/**
 * @role The one share every look that lays part of a picture over another lays it at: how present
 *   the look has travelled to, times the share its own terms state, times the most of the picture
 *   that look ever takes. A file of its own and not a helper inside the contract file, because the
 *   looks declared in files of their own may take only *types* from that file — the contract
 *   imports their declarations, and a value read back across that cycle is `undefined` at the
 *   moment `LOOKS` is built (0288). This module reaches every one of them and imports none; it left the
 *   contract file at the shape's third hand-copy (0289).
 * @instead What a look is, and the passes that weigh a share this way → src/lib/moireLook.ts. The
 *   looks that weigh their own → src/lib/moireSquash.ts and src/lib/moireDouble.ts. How present an
 *   instance has travelled to at all → src/ui/moireLooks.ts.
 */
import { clamp } from "@/lib/range";

/**
 * A share of the picture one pass lays down, under that pass's own ceiling. Both ends closed,
 * because each is read off a number the picture eases toward and a travel is asked for its value
 * before it has arrived.
 *
 * **Five passes weigh a share this way, which is what makes it a declaration and not a copy**
 * (principle 3): the bloom's amount, the echoes' first rung, the sharpen's amount, the squash's
 * floor and the double's amount. The ceiling stays each look's own number and is never shared —
 * what a halo may take of the picture is not what a ladder of ghosts may (0280, 0282, 0288, 0289).
 */
export const weighed = (presence: number, share: number, ceiling: number): number =>
  clamp(presence, 0, 1) * clamp(share, 0, 1) * ceiling;
