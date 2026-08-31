/**
 * @role The one place the finished field is laid back into itself: a picture inside a picture, once
 *   per run of effects an automator is growing, each pass compositing the field onto itself a
 *   little smaller and a little turned. Its arithmetic is not here — this is the composite and the
 *   matrix that aims it.
 * @instead How deep the fold goes, what it is scaled and turned by and the share each pass is laid
 *   at → src/lib/moireFractal.ts. The frame *before* this one laid back into it, which is the same
 *   composite one frame later rather than one scale smaller → `feedFrame` in src/ui/moireCanvas.ts.
 */
import { TAU, turnedScale, type Aim } from "@/lib/moire";
import {
  FOLD_FAINTEST,
  foldOwner,
  foldPasses,
  foldScale,
  foldShare,
  foldTurned,
  type FractalFold,
} from "@/lib/moireFractal";

/** The one matrix every pass is aimed with, refilled rather than minted (0070). */
const aimed: Aim = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Point one pass: scaled and turned about the picture's own centre, so the stack nests. */
function aimFold(scale: number, turns: number, width: number, height: number): void {
  turnedScale(aimed, scale, TAU * turns);
  aimed.e = width / 2 - (aimed.a * width) / 2 - (aimed.c * height) / 2;
  aimed.f = height / 2 - (aimed.b * width) / 2 - (aimed.d * height) / 2;
}

/**
 * Fold the field into itself, and leave `ink` exactly as it was found — cutting, at full alpha —
 * so what runs after this cuts rather than fills.
 *
 * **Onto the field rather than out of it**, the direction `feedFrame` lays a ghost in: the field is
 * what the gratings let through, so a level laid back into it fills its own fringes in and the
 * picture keeps a smaller copy of where they stood. Each pass composites what is already there, so
 * the levels double at every one — the field holds `foldLevels(pass)` of them when pass `pass` is
 * laid, and `foldPasses` blits buy `2 ** foldPasses` levels.
 *
 * **One ladder for the whole picture and not one per run**: the passes are the cells of the
 * picture's own depth, and each is aimed with the spiral of whichever run is standing at that point
 * of it (`foldOwner`). So two runs a level apiece are two spirals composed into one stack, and a
 * rack of forty is still the bounded number of blits the reach allows.
 *
 * A picture whose yard is growing nothing has no depth and no pass, and draws exactly what it drew
 * before there was a fold in it.
 */
export function foldField(
  ink: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  fold: FractalFold,
): void {
  const { height, width } = field;
  let laid = false;
  for (let pass = 0; pass < foldPasses(fold.depth); pass += 1) {
    const share = foldShare(fold.depth, pass);
    if (share < FOLD_FAINTEST) continue;
    const own = foldOwner(fold, pass);
    if (!laid) {
      ink.globalCompositeOperation = "source-over";
      laid = true;
    }
    ink.globalAlpha = share;
    aimFold(
      foldScale(fold.ratios[own] ?? 1, pass),
      foldTurned(fold.turns[own] ?? 0, pass),
      width,
      height,
    );
    ink.setTransform(aimed);
    ink.drawImage(field, 0, 0);
  }
  if (!laid) return;
  ink.setTransform(1, 0, 0, 1, 0, 0);
  ink.globalAlpha = 1;
  ink.globalCompositeOperation = "destination-out";
}
