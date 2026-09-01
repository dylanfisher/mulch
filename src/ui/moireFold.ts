/**
 * @role The one place the finished field is cut back into itself: a picture inside a picture, each
 *   pass cutting the field by itself a little smaller and a little turned. Its arithmetic is not
 *   here — this is the composite and the matrix that aims it.
 * @instead How deep the fold goes, what it is scaled and turned by and the share each pass bites at
 *   → src/lib/moireFractal.ts. The frame *before* this one laid back into it, which is the same
 *   composite one frame later rather than one scale smaller, and which fills where this cuts →
 *   `feedFrame` in src/ui/moireCanvas.ts.
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
 * Fold the field into itself, and leave `ink` exactly as it was found — cutting, at full alpha, on
 * the identity — so what runs after this cuts rather than fills.
 *
 * **Out of the field rather than onto it** (0243). The picture is the product of its gratings
 * (0131) and every layer before this one is a `destination-out` cut, so a level cut in beats against
 * the fringes it crosses and the picture is a moiré of a moiré. Laid *onto* the field — the
 * direction `feedFrame` lays a ghost in — the same level only ever raised alpha, filling its own
 * fringes in.
 *
 * **A blit and not a tiling.** Tiled with a `repeat` pattern the copy has no edge, which is worth
 * something — but a pattern takes a copy of its source when it is minted, so a tiled pass costs a
 * whole canvas of allocation *per pass, per painting*: at the zoomed picture's size that is tens of
 * megabytes a frame, which is a stutter for a difference measured at a third of a percentage point
 * of low-frequency contrast (0243). The edge is the cheaper problem.
 *
 * Each pass cuts by what is already there, so the levels double at every one: the field holds
 * `foldLevels(pass)` of them when pass `pass` is cut, and `foldPasses` blits buy `2 ** foldPasses`
 * levels.
 *
 * **One ladder for the whole picture and not one per run**: the passes are the cells of the
 * picture's own depth, and each is aimed with the spiral of whichever run is standing at that point
 * of it (`foldOwner`). So two runs a level apiece are two spirals composed into one stack, and a
 * rack of forty is still the bounded number of blits the reach allows.
 *
 * A yard growing nothing has no depth, draws no pass and pays nothing: the fold is the automator's
 * own mark and there is no picture-wide floor under it (0243).
 */
export function foldField(
  ink: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  fold: FractalFold,
): void {
  const { height, width } = field;
  let cut = false;
  // **A grating and not a picture of one.** Every pass shrinks the field, and a canvas smooths what
  // it shrinks — which averages away exactly the fringes the level is being cut in to beat against,
  // leaving a soft tonal mask where a moiré of a moiré should be. Sampled point-for-point the copy
  // keeps its own spacing, and two spacings a scale apart are what a moiré *is* (0131, 0243).
  ink.imageSmoothingEnabled = false;
  for (let pass = 0; pass < foldPasses(fold.depth); pass += 1) {
    const share = foldShare(fold.depth, pass, fold.bite);
    if (share < FOLD_FAINTEST) continue;
    const own = foldOwner(fold, pass);
    cut = true;
    ink.globalAlpha = share;
    aimFold(
      foldScale(fold.ratios[own] ?? 1, pass),
      foldTurned(fold.turns[own] ?? 0, pass),
      width,
      height,
    );
    ink.setTransform(aimed);
    // The ink is already cutting where `groundOf` left it, and this is the same cut every grating
    // before it made: `a_out = a_dst * (1 - a_src * share)`.
    ink.drawImage(field, 0, 0);
  }
  ink.imageSmoothingEnabled = true;
  if (!cut) return;
  ink.globalAlpha = 1;
}
