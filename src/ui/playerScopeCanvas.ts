/**
 * @role What a scope painting is made of, in device pixels: the rungs and the bars under it, the
 *   blocks standing on the floor as tall as their landing is struck often, the split marks inside
 *   them, and the playhead over the lot. No React, no clock — handed a geometry and a context.
 * @instead The geometry itself, which is pure maths and tested without a canvas →
 *   src/lib/playerScope.ts. The surface that sizes this canvas, keeps the window fed and asks for
 *   the paintings → src/ui/PlayerScope.tsx. The drift's own painter, which draws how fast the
 *   module is going and never where it goes → src/ui/moireCanvas.ts.
 */
import type { ScopeBlock, ScopeEdge, ScopeGeometry } from "@/lib/playerScope";
import { PLAYER_REPEATS_MAX, PLAYER_REPEATS_MIN } from "@/lib/playerRepeats";
import { hairlinePx } from "@/ui/canvasSurface";

/**
 * How faint the rest of the sheet is drawn against the landing sounding. The standing block is the
 * canvas's own ink at full strength and every other landing on the sheet — the ones that sounded
 * and the ones to come alike — is this (0187). One flat fade rather than a ramp away from the
 * clock: a sheet holds still while the clock crosses it, so a ramp measured from the standing
 * block would be the one thing on it that moved. One colour rather than a second token: the
 * picture's ink is the card's `--primary` and a fifth crossing of the colour boundary is not worth
 * spending here (docs/boundaries.md).
 */
const SHEET_FADE = 0.18;

/** The ghost a landing throws, against the landing that threw it: quieter, and never invisible. */
const SPARK_FADE = 0.5;

/** How opaque the landing `index` of the sheet is drawn, the clock being inside `at`. */
const inkOf = (index: number, at: number): number => (index === at ? 1 : SHEET_FADE);

/**
 * The counts the picture is ruled at: the repeat dial's floor, doubled to its ceiling. They are the
 * *counts themselves* rather than a made-up number of lanes, which is what lets a glance read a
 * height as "struck eight times" instead of "tallish".
 */
export const SCOPE_RUNGS = ((): number[] => {
  const rungs: number[] = [];
  for (let count = PLAYER_REPEATS_MIN; count <= PLAYER_REPEATS_MAX; count *= 2) rungs.push(count);
  return rungs;
})();

/**
 * How tall a landing struck `repeats` times stands, as a fraction of the picture: one rung per
 * doubling, counted off the rungs above so the scale and the rules it is read against are one fact
 * (principle 1). A landing struck once stands one rung and never at nothing — the floor of the
 * dial is a landing that happened, and a block of no height is a landing the picture did not draw
 * (principle 5); the ceiling is the dial's own, so `PLAYER_REPEATS_MAX` fills the picture.
 *
 * Logarithmic, because the count reaches sixty-four and the patterns a hand actually writes live
 * in the first handful: drawn linear, everything from one repeat to eight would be the bottom
 * eighth of the picture and the whole of the rest would be one landing in a hundred.
 *
 * Against the *dial's* own ceiling and never the sheet's tallest landing, so the same pattern is
 * the same picture on two sheets — which is the rule the sheet's own width is fixed by (0098).
 */
export const rungOf = (repeats: number): number =>
  Math.min(1, (1 + Math.log2(Math.max(PLAYER_REPEATS_MIN, repeats))) / SCOPE_RUNGS.length);

/** Where a block's top sits and how tall it stands, in device pixels, on a picture `height` deep. */
const standOf = (repeats: number, height: number): { top: number; tall: number } => {
  const tall = rungOf(repeats) * height;
  return { top: height - tall, tall };
};

/**
 * The rungs and the loop's own turnovers, under everything: the rules a height and a width are
 * read against. Both at the sheet's own fade — the structure a pattern is laid on may not shout
 * over the landing sounding.
 */
function paintRules(
  context: CanvasRenderingContext2D,
  geometry: ScopeGeometry,
  size: { width: number; height: number },
  hairline: number,
): void {
  for (const rung of SCOPE_RUNGS) {
    const { top } = standOf(rung, size.height);
    context.fillRect(0, top, size.width, hairline);
  }
  for (const bar of geometry.bars) {
    context.fillRect(bar * size.width - hairline / 2, 0, hairline, size.height);
  }
}

/**
 * One landing: a run of repeats along the loop, standing on the floor as tall as the count it is
 * struck, each repeat cut where the gate closes. A hole is hollow — the outline and nothing inside
 * it, which is exactly what the transport does with one (P118) — and a reversed landing is
 * mirrored, so its gate eats the far end of each repeat rather than the near one, which is the end
 * its read head actually leaves silent (P121).
 */
function paintBlock(
  context: CanvasRenderingContext2D,
  block: ScopeBlock,
  size: { width: number; height: number },
  hairline: number,
): void {
  // The count *is* the number of split marks: `repeatSpans` laid one per repeat, so a second field
  // for it would be the same fact written twice (principle 1).
  const { top, tall } = standOf(block.splits.length, size.height);
  const y = Math.min(top, size.height - hairline);
  const deep = Math.max(hairline, tall);
  let began = block.from;
  for (const split of block.splits) {
    const left = began * size.width;
    const wide = Math.max(hairline, (split - began) * size.width);
    const sounds = Math.max(hairline, wide * block.gate);
    if (block.dropped) {
      context.strokeRect(left + hairline / 2, y + hairline / 2, wide - hairline, deep - hairline);
    } else {
      context.fillRect(block.reversed ? left + wide - sounds : left, y, sounds, deep);
    }
    began = split;
  }
}

/**
 * The wait after a landing, drawn as the landing's own floor carrying on across it: a hairline at
 * the foot of the picture, from where the sounding stops to where the next landing starts. Its own
 * mark rather than the gap it already is, because the gap between two landings that follow each
 * other immediately looks exactly the same and a hand cannot tell one from a wait (P156).
 */
function paintWait(
  context: CanvasRenderingContext2D,
  block: ScopeBlock,
  size: { width: number; height: number },
  hairline: number,
): void {
  if (block.wait === null) return;
  const left = block.wait.from * size.width;
  const wide = Math.max(hairline, (block.wait.to - block.wait.from) * size.width);
  context.fillRect(left, size.height - hairline, wide, hairline);
}

/**
 * The ground moving under a landing, drawn as a dashed hairline standing where it moved. It was a
 * break in the thread between two slot bands while the picture had one; the score has no such
 * thread, and the fact is still the one a glance needs — that the window the slots are cut from is
 * not the one before it (0183).
 */
function paintMoved(
  context: CanvasRenderingContext2D,
  block: ScopeBlock,
  size: { width: number; height: number },
  hairline: number,
): void {
  if (!block.moved) return;
  const x = block.from * size.width;
  context.setLineDash([hairline * 3, hairline * 3]);
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, size.height);
  context.stroke();
  context.setLineDash([]);
}

/**
 * How tall a tier's boundary rule stands, as a fraction of the picture: a tick at a part and the
 * whole of it at a song round's end.
 *
 * Height is the whole ladder, and every rule is one hairline wide in the one ink — never a second
 * colour, because the picture's ink is the card's `--primary` and a fifth crossing of the colour
 * boundary is not worth spending on a rule (docs/boundaries.md, and `SHEET_FADE` above for the
 * same call). A part's rule is the shorter of the two and no shorter than that: a mark a
 * hairline tall is a dot, indistinguishable from the grain of a sheet of twenty-four landings, and
 * a boundary a glance cannot find is a boundary the picture did not draw.
 */
const EDGE_TALL: Record<Exclude<ScopeEdge, null>, number> = { part: 0.1, song: 1 };

/**
 * One boundary: a hairline standing up from the foot of the picture at the seam after the landing
 * that ends the round — the end of its wait where it takes one, so the rule falls exactly where the
 * next landing begins.
 *
 * At the sheet's own fade rather than the standing block's: a rule is the shape the run is arranged
 * in, and a boundary drawn brighter than the landing sounding would be the picture's structure
 * shouting over its clock.
 */
function paintEdge(
  context: CanvasRenderingContext2D,
  block: ScopeBlock,
  size: { width: number; height: number },
  hairline: number,
): void {
  if (block.edge === null) return;
  const tall = EDGE_TALL[block.edge] * size.height;
  const x = (block.wait?.to ?? block.to) * size.width;
  context.fillRect(x - hairline / 2, size.height - tall, hairline, tall);
}

/**
 * One painting of the scope. `head` is where the clock is across the sheet, 0…1 — the playhead,
 * and the one thing here that moves between two landings. `picked` is the landing a hand pressed,
 * outlined so the readout beside the picture is about a block a glance can find, or null where
 * nothing is picked.
 *
 * `color` is the token the canvas resolved, never a literal (docs/boundaries.md): the whole
 * picture is that one ink at the alphas above.
 */
// One pass over the sheet and one call per thing a landing draws — the rules under it, the block,
// its wait, the ground moving, the ghost it threw, and the pick over the lot. Splitting the pass
// means walking the blocks twice a painting, which is the cost 0070 is about. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function paintScope(
  canvas: HTMLCanvasElement,
  geometry: ScopeGeometry,
  head: number,
  color: string,
  picked: number | null = null,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const size = { width: canvas.width, height: canvas.height };
  context.clearRect(0, 0, size.width, size.height);
  const hairline = hairlinePx();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = hairline;
  const { blocks } = geometry;
  // Under everything: the rungs a height is read against, the loop's own turnovers, and the rules
  // saying what the run is arranged in — the ground the landings are laid on rather than anything
  // standing on it.
  context.globalAlpha = SHEET_FADE;
  paintRules(context, geometry, size, hairline);
  for (const block of blocks) paintEdge(context, block, size, hairline);
  for (const [index, block] of blocks.entries()) {
    context.globalAlpha = inkOf(index, geometry.at);
    paintBlock(context, block, size, hairline);
    paintWait(context, block, size, hairline);
    paintMoved(context, block, size, hairline);
    for (const spark of block.sparks) {
      // A ghost has no rung of its own: it is the landing sounding once more, so each stands one
      // rung tall at the level it was thrown at, under the block that threw it (P123).
      const { top, tall } = standOf(PLAYER_REPEATS_MIN, size.height);
      context.globalAlpha = inkOf(index, geometry.at) * spark.level * SPARK_FADE;
      context.fillRect(
        spark.at * size.width,
        top,
        Math.max(hairline, 2 * hairline),
        Math.max(hairline, tall),
      );
    }
  }
  // The landing a hand pressed, outlined whole: the readout beside the picture says numbers, and
  // this is the one thing that says which block they are about.
  const held = picked === null ? undefined : blocks[picked];
  if (held !== undefined) {
    const { top, tall } = standOf(held.splits.length, size.height);
    context.globalAlpha = 1;
    context.strokeRect(
      held.from * size.width + hairline / 2,
      Math.min(top, size.height - hairline) + hairline / 2,
      Math.max(hairline, (held.to - held.from) * size.width) - hairline,
      Math.max(hairline, tall) - hairline,
    );
  }
  // Last and at full strength, over whatever it crosses: where the clock is, is the one thing in
  // this picture a glance has to find.
  context.globalAlpha = 1;
  context.fillRect(Math.min(head, 1) * size.width, 0, hairline, size.height);
}
