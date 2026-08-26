/**
 * @role What a scope painting is made of, in device pixels: the blocks, the split marks, the
 *   thread between them and the playhead. No React, no clock — handed a geometry and a context.
 * @instead The geometry itself, which is pure maths and tested without a canvas →
 *   src/lib/playerScope.ts. The surface that sizes this canvas, keeps the window fed and asks for
 *   the paintings → src/ui/PlayerScope.tsx. The drift's own painter, which draws how fast the
 *   module is going and never where it goes → src/ui/moireCanvas.ts.
 */
import type { ScopeBlock, ScopeGeometry } from "@/lib/playerScope";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { hairlinePx } from "@/ui/canvasSurface";

/**
 * How faint the last landing in the window is drawn against the one sounding. The standing block
 * is the canvas's own ink at full strength and every landing after it fades towards this — which
 * is the whole of "the future is fainter" (0180). One colour and one alpha ramp rather than a
 * second token: the picture's ink is the card's `--primary` and a fifth crossing of the colour
 * boundary is not worth spending here (docs/boundaries.md).
 */
const FUTURE_FADE = 0.18;

/** The ghost a spark draws, against the landing that threw it: quieter, and never invisible. */
const SPARK_FADE = 0.5;

/** How opaque the landing `index` steps into the window is drawn. */
const inkOf = (index: number, count: number): number =>
  index === 0 ? 1 : 1 - (1 - FUTURE_FADE) * (index / Math.max(1, count - 1));

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
  context.moveTo(block.to * size.width, from.top + from.deep / 2);
  context.lineTo(next.from * size.width, to.top + to.deep / 2);
  context.stroke();
}

/**
 * One painting of the scope. `head` is where the clock is across the window, 0…1 — the playhead,
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
  for (const [index, block] of blocks.entries()) {
    context.globalAlpha = inkOf(index, blocks.length);
    paintBlock(context, block, size, hairline);
    const next = blocks[index + 1];
    if (next !== undefined) paintThread(context, block, next, size);
    if (block.spark !== null) {
      const band = bandOf(block.spark.slot, size.height);
      context.globalAlpha = inkOf(index, blocks.length) * block.spark.level * SPARK_FADE;
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
