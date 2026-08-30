/**
 * @role What a scope painting is made of, in device pixels: the blocks, the split marks, the
 *   thread between them, the playhead, and the crosshair a hand drags the two numbers behind the
 *   shape by (0198). No React, no clock — handed a geometry and a context.
 * @instead The geometry itself, which is pure maths and tested without a canvas →
 *   src/lib/playerScope.ts. The surface that sizes this canvas, keeps the window fed and asks for
 *   the paintings → src/ui/PlayerScope.tsx. The drift's own painter, which draws how fast the
 *   module is going and never where it goes → src/ui/moireCanvas.ts.
 */
import type { ScopeAim, ScopeBlock, ScopeGeometry } from "@/lib/playerScope";
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
 * How faint the crosshair's two guides are drawn. Fainter than the sheet behind them, because they
 * are lines across a picture rather than anything in it: what they are for is to say which point on
 * the picture the handle is at, and a guide a glance reads before it reads a landing would be the
 * picture being crossed out.
 */
const AIM_FADE = 0.28;

/** How wide the handle at their crossing is, in hairlines. Big enough for a pointer to land on
 *  without hunting, and small enough that it never hides the landing under it. */
const AIM_HANDLE = 5;

/**
 * The crosshair: two guides across the whole picture and a square where they cross. The point is
 * `scopeMark`'s, which is the inverse of the drag's own reading, so the handle stands exactly where
 * a press on it would write (src/lib/playerScope.ts).
 *
 * Drawn last, over everything: it is a control laid on a readout, and a handle behind a landing is
 * one a hand cannot see to grab. Hollow rather than filled — the outline and a cleared middle — so
 * whatever it is standing on is still readable through it, which is what the hole a dropped landing
 * draws already does with the same trick (P118).
 */
function paintAim(
  context: CanvasRenderingContext2D,
  aim: ScopeAim,
  size: { width: number; height: number },
  hairline: number,
): void {
  const x = aim.across * size.width;
  // Up for more, because a landing stacks upward from the line the sheet is drawn on: the fraction
  // is measured from the bottom and this is the one place it becomes a y.
  const y = (1 - aim.up) * size.height;
  context.globalAlpha = AIM_FADE;
  context.fillRect(x - hairline / 2, 0, hairline, size.height);
  context.fillRect(0, y - hairline / 2, size.width, hairline);
  context.globalAlpha = 1;
  const wide = AIM_HANDLE * hairline;
  context.clearRect(x - wide / 2, y - wide / 2, wide, wide);
  context.strokeRect(x - wide / 2, y - wide / 2, wide, wide);
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
  aim: ScopeAim | null,
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
    context.globalAlpha = inkOf(index, geometry.at);
    paintBlock(context, block, size, hairline);
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
  // And the crosshair over even that: the playhead is where the picture *is*, and this is where the
  // hand is — null while the module holds no spec, because there is then nothing to grab (0121).
  if (aim !== null) paintAim(context, aim, size, hairline);
}
