/**
 * @role The picture's own feedback: the frame before this one kept per canvas, and laid back into
 *   the field at a bounded share where a row asks for that — pointed about the picture's centre, a
 *   little larger and a little turned, so what it leaves behind is a spiral of its own fringes
 *   rather than a doubled copy of them. The stack deepens once per frame of the deck's own clock
 *   and never once per repaint (0126, 0143).
 * @instead The painting this is one pass of → src/ui/moireCanvas.ts, which holds the gratings and
 *   the ground they are cut out of. The share a row's ask is laid at → `feedbackAlpha` in
 *   src/lib/moire.ts. Taking the finished field back out of the screen →
 *   src/ui/moireCanvasField.ts.
 */
import {
  cosTurn,
  DRIFT_REST,
  feedbackAlpha,
  TAU,
  turnedScale,
  turnsOf,
  type MoireRow,
} from "@/lib/moire";
import { tunable } from "@/lib/moireTuning";
import { boldestRow } from "@/ui/moireScreenInk";

/** The ghost's transform, one object refilled: a per-frame paint allocates nothing (0070). */
const aimed = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * The frame before this one, per canvas: a copy of the field as it was left and the turn of the
 * asking row it was left at. Kept only while some row is asking for it and forgotten the moment
 * none is — or the moment the picture stops being drawn at all — so a picture nobody is feeding
 * back never pays for a copy and no picture ever lays a minutes-old frame of a source it has since
 * stopped playing back into itself.
 */
type Ghost = { held: HTMLCanvasElement; turns: number };
const lasts = new WeakMap<HTMLCanvasElement, Ghost>();

/** Forget it — what every path that draws no picture at all does on its way out. */
export const forget = (canvas: HTMLCanvasElement): void => {
  lasts.delete(canvas);
};

/** How far a fed-back frame is scaled and turned before it is laid back into this one. */
const FEEDBACK_ZOOM = tunable("feedback.zoom", 0.03, { min: 0, max: 0.2, step: 0.005 });
const FEEDBACK_TURNS = tunable("feedback.turns", 0.006, { min: 0, max: 0.05, step: 0.001 });
/** And how much of the frame before this one it asks to have laid back into it. */
const feedbackOf = (row: MoireRow): number => row.feedback;

/**
 * Point the frame before this one: about the picture's own centre, a little larger and a little
 * turned, so what it leaves behind is a spiral of its own fringes rather than a doubled copy of
 * them. The turn rides the asking row's own phase and never a count of frames — the picture has one
 * clock and it is the deck's (0126) — where the *depth* of the stack is what accumulates, which is
 * what the ceiling bounds (0143).
 */
function aimFeedback(row: MoireRow, width: number, height: number): void {
  turnedScale(
    aimed,
    1 + FEEDBACK_ZOOM.value * row.feedback,
    TAU * FEEDBACK_TURNS.value * cosTurn(turnsOf(row)),
  );
  aimed.e = width / 2 - (aimed.a * width) / 2 - (aimed.c * height) / 2;
  aimed.f = height / 2 - (aimed.b * width) / 2 - (aimed.d * height) / 2;
}

/**
 * The frame before this one, laid back into this one's field — **onto** it rather than cut out of
 * it: the field is what the gratings let through, so a fed-back frame fills its own fringes back in
 * and the picture keeps a ghost of where they stood. That is also the direction that runs away, a
 * field filled to opaque being a picture with nothing left in it, which is why the share it is laid
 * at is `feedbackAlpha` and never the row's own value (0143).
 *
 * Then this frame is kept for the next one, feedback and all, because a frame that kept only its
 * own gratings would ghost one frame back rather than compounding — and a picture no row is feeding
 * back keeps nothing at all.
 */
export function feedFrame(
  canvas: HTMLCanvasElement,
  field: HTMLCanvasElement,
  ink: CanvasRenderingContext2D,
  rows: readonly MoireRow[],
): void {
  const { height, width } = field;
  const bold = boldestRow(rows, feedbackOf, DRIFT_REST.feedback);
  if (bold === null || bold.feedback <= 0) {
    forget(canvas);
    return;
  }
  const turns = turnsOf(bold);
  const ghost = lasts.get(canvas);
  // **The stack deepens once per frame of the deck's own clock and never once per repaint.** A
  // canvas is painted on every commit as well as on every frame — a theme, a resize, a knob — and
  // a picture is drawn and not animated while its yard is halted (0040, src/ui/canvasSurface.ts),
  // so a stack that advanced on repaints would make a stopped yard's picture a function of how
  // often React committed. The row's own turn is what says a frame happened, which is the same
  // clock every other motion in the picture rides (0126).
  if (ghost !== undefined && ghost.turns === turns) return;
  const last = ghost?.held ?? document.createElement("canvas");
  const kept = last.getContext("2d");
  if (kept === null) return;
  if (ghost !== undefined && last.width === width && last.height === height) {
    ink.globalCompositeOperation = "source-over";
    ink.globalAlpha = feedbackAlpha(bold.feedback);
    aimFeedback(bold, width, height);
    ink.setTransform(aimed);
    ink.drawImage(last, 0, 0);
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.globalAlpha = 1;
    ink.globalCompositeOperation = "destination-out";
  }
  if (last.width !== width) last.width = width;
  if (last.height !== height) last.height = height;
  kept.clearRect(0, 0, width, height);
  kept.drawImage(field, 0, 0);
  lasts.set(canvas, { held: last, turns });
}
