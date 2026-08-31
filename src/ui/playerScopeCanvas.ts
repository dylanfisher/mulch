/**
 * @role What a scope painting is made of, in device pixels: the blocks, the split marks, the
 *   thread between them and the playhead. No React, no clock — handed a geometry and a context.
 * @instead The geometry itself, which is pure maths and tested without a canvas →
 *   src/lib/playerScope.ts. The surface that sizes this canvas, keeps the window fed and asks for
 *   the paintings → src/ui/PlayerScope.tsx. The drift's own painter, which draws how fast the
 *   module is going and never where it goes → src/ui/moireCanvas.ts.
 */
import type { ScopeBlock, ScopeEdge, ScopeGeometry } from "@/lib/playerScope";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
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

/** The ghost a spark draws, against the landing that threw it: quieter, and never invisible. */
const SPARK_FADE = 0.5;

/** How opaque the landing `index` of the sheet is drawn, the clock being inside `at`. */
const inkOf = (index: number, at: number): number => (index === at ? 1 : SHEET_FADE);

/** Where one slot's band sits, top-down: slot 0 at the bottom, the way the loop is read up. */
const bandOf = (slot: number, height: number): { top: number; deep: number } => {
  const deep = height / PLAYER_SLOTS;
  return { top: height - (slot + 1) * deep, deep };
};

/**
 * One landing: a run of repeats along its own slot's band, each cut where the gate closes. A hole
 * is hollow — the outline and nothing inside it, which is exactly what the transport does with one
 * (P118) — and a reversed landing is mirrored, so its gate eats the far end of each repeat rather
 * than the near one, which is the end its read head actually leaves silent (P121).
 */
function paintBlock(
  context: CanvasRenderingContext2D,
  block: ScopeBlock,
  size: { width: number; height: number },
  hairline: number,
): void {
  const { top, deep } = bandOf(block.slot, size.height);
  const y = top + hairline;
  const tall = Math.max(hairline, deep - 2 * hairline);
  let began = block.from;
  for (const split of block.splits) {
    const left = began * size.width;
    const wide = Math.max(hairline, (split - began) * size.width);
    const sounds = Math.max(hairline, wide * block.gate);
    if (block.dropped) {
      context.strokeRect(left + hairline / 2, y + hairline / 2, wide - hairline, tall - hairline);
    } else {
      context.fillRect(block.reversed ? left + wide - sounds : left, y, sounds, tall);
    }
    began = split;
  }
}

/**
 * The wait after a landing, drawn as the landing's own floor carrying on across it: a hairline at
 * the foot of its band, from where the sounding stops to where the next landing starts. Its own
 * mark rather than the gap it already is, because the gap between two landings that follow each
 * other immediately looks exactly the same and a hand cannot tell one from a wait (P156).
 *
 * On the block's own band and at the block's own ink, so a wait is read as belonging to the
 * landing that takes it rather than as something between two of them — which is the thread's job
 * and the reason the two marks sit at different heights in the band.
 */
function paintWait(
  context: CanvasRenderingContext2D,
  block: ScopeBlock,
  size: { width: number; height: number },
  hairline: number,
): void {
  if (block.wait === null) return;
  const { top, deep } = bandOf(block.slot, size.height);
  const left = block.wait.from * size.width;
  const wide = Math.max(hairline, (block.wait.to - block.wait.from) * size.width);
  context.fillRect(left, top + deep - hairline, wide, hairline);
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
 * The thread from one landing to the next: a hairline between the end of one block and the start
 * of the next, on the slot each of them reads. Where the pattern rests, that is the gap the thread
 * runs across — the rest is the length of the link and nothing else has to draw it.
 */
function paintThread(
  context: CanvasRenderingContext2D,
  block: ScopeBlock,
  next: ScopeBlock,
  size: { width: number; height: number },
): void {
  const from = bandOf(block.slot, size.height);
  const to = bandOf(next.slot, size.height);
  context.beginPath();
  // Dashed where the ground changed between the two, so a glance sees that the loop moved as well
  // as where the pattern went. The break is on the thread rather than on either block, because a
  // bed change happens *between* two landings and neither of them is the thing that changed
  // (0183). Set and cleared here so nothing else in the picture inherits it.
  if (next.moved) context.setLineDash([context.lineWidth * 3, context.lineWidth * 3]);
  context.moveTo(block.to * size.width, from.top + from.deep / 2);
  context.lineTo(next.from * size.width, to.top + to.deep / 2);
  context.stroke();
  context.setLineDash([]);
}

/**
 * One painting of the scope. `head` is where the clock is across the sheet, 0…1 — the playhead,
 * and the one thing here that moves between two landings.
 *
 * `color` is the token the canvas resolved, never a literal (docs/boundaries.md): the whole
 * picture is that one ink at the alphas above.
 */
export function paintScope(
  canvas: HTMLCanvasElement,
  geometry: ScopeGeometry,
  head: number,
  color: string,
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
  // Under everything: the rules say what the run is arranged in, which is the ground the landings
  // are laid on rather than anything standing on it.
  context.globalAlpha = SHEET_FADE;
  for (const block of blocks) paintEdge(context, block, size, hairline);
  for (const [index, block] of blocks.entries()) {
    context.globalAlpha = inkOf(index, geometry.at);
    paintBlock(context, block, size, hairline);
    paintWait(context, block, size, hairline);
    const next = blocks[index + 1];
    if (next !== undefined) paintThread(context, block, next, size);
    if (block.spark !== null) {
      const band = bandOf(block.spark.slot, size.height);
      context.globalAlpha = inkOf(index, geometry.at) * block.spark.level * SPARK_FADE;
      context.fillRect(
        block.spark.at * size.width,
        band.top + hairline,
        Math.max(hairline, 2 * hairline),
        Math.max(hairline, band.deep - 2 * hairline),
      );
    }
  }
  // Last and at full strength, over whatever it crosses: where the clock is, is the one thing in
  // this picture a glance has to find.
  context.globalAlpha = 1;
  context.fillRect(Math.min(head, 1) * size.width, 0, hairline, size.height);
}
