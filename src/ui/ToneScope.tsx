/**
 * @role A tone drawing itself: the wave `src/lib/waveform.ts` renders, evaluated across the
 *   canvas at the phase the deck has actually reached, on the one frame loop. It is the ink
 *   inside the waveform's own box and nothing else — the box, its gestures, its playhead and its
 *   meter are the waveform's, so a tone is a source that draws itself differently rather than a
 *   second waveform (P70).
 * @instead A recorded source's picture → src/ui/peakCanvas.ts, which this leaves untouched. The
 *   wave's own shape → toneSample in src/lib/waveform.ts; there is one of it, and this evaluates
 *   that one rather than keeping a second idea of what a tone looks like. The canvas's size,
 *   colour and frame loop → src/ui/canvasSurface.ts.
 */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { toneSample, TONE_REF_HZ } from "@/lib/waveform";
import type { DeckId } from "@/state/store";
import { useCanvasSurface } from "@/ui/canvasSurface";

/**
 * How many cycles of the tone the view holds. Few enough that the shape of one cycle is legible
 * at any pitch — the point of drawing the wave rather than its peaks — and enough that the wave
 * reads as a wave rather than as one hump.
 */
export const TONE_VIEW_CYCLES = 3;

/** How many device pixels one sample of the wave covers, the way a drift row is sampled. */
const SAMPLE_PX = 2;

/**
 * How long a window of the buffer the view holds, in seconds. Always the reference's cycles, not
 * the pitch's: the buffer holds TONE_REF_HZ and the pitch is the rate it is read at (0110), so
 * what a lower pitch changes is how slowly the window scrolls, not how many humps are in it.
 */
export const toneWindowSecs = (): number => TONE_VIEW_CYCLES / TONE_REF_HZ;

/**
 * The wave `at` seconds into the buffer, from -1 at a trough to 1 at a crest — the generator's own
 * sample at the phase that second carries, so the picture cannot drift from the sound.
 */
export const toneAt = (at: number): number => toneSample(2 * Math.PI * TONE_REF_HZ * at);

/**
 * Draw the window starting `at` seconds into the source, in `color` — a token the caller resolved.
 * The wave is drawn at its own amplitude against a full-scale canvas, exactly as peaks are, so a
 * generator that peaks at half scale fills half the box either way it is drawn.
 */
export function paintTone(canvas: HTMLCanvasElement, color: string, at: number): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  const windowSecs = toneWindowSecs();
  if (windowSecs <= 0 || width < 1) return;
  const middle = height / 2;
  const samples = Math.max(2, Math.ceil(width / SAMPLE_PX));
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, devicePixelRatio);
  context.beginPath();
  for (let sample = 0; sample <= samples; sample++) {
    const across = sample / samples;
    const y = middle - toneAt(at + across * windowSecs) * middle;
    if (sample === 0) context.moveTo(0, y);
    else context.lineTo(across * width, y);
  }
  context.stroke();
}

/**
 * Where the picture is drawn from while nothing is moving it: the position the yard is halted at,
 * and the top of the loop once it is stopped rather than held. Null while it is playing, because
 * then the frame loop owns the phase and this would be a value going stale sixty times a second.
 * It is a discrete store fact, so it is both what a halted picture is drawn from and what tells the
 * commit to repaint: a seek or a stop on a halted yard moves where the deck reads from without a
 * frame ever running, and a picture keyed only on the pitch would go on showing the phase it was
 * left at. The playhead beside it has carried the same guard since 0038.
 */
export const restingAt = (playing: boolean, paused: number | null): number | null =>
  playing ? null : (paused ?? 0);

/**
 * The tone's live view. While it plays, the position is peeked inside the paint rather than held
 * anywhere, because where the deck is reading from is then a per-frame fact and nothing per-frame
 * goes through React state (0070). While it does not, there is no frame to read on and the store's
 * own hold is the reading — which is `restingAt` above, and why it is a dependency.
 */
export function ToneScope({
  instrument,
  deck,
  playing,
  paused,
}: {
  instrument: Instrument;
  deck: DeckId;
  playing: boolean;
  /** Where a yard that is not playing is holding its playhead, or null for stopped (0038). */
  paused: number | null;
}) {
  const resting = restingAt(playing, paused);
  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      // Two readings of one number, and which one is asked depends on what is moving it. Playing,
      // it is the per-frame read and never anything else (0070). Halted, no frame runs at all, so
      // the store's own hold is both what to draw and — being a dependency — what tells the commit
      // that a seek or a stop has moved it.
      paintTone(canvas, color, resting ?? instrument.peek(deck).position);
    },
    [instrument, deck, resting],
  );
  const { rootRef, canvasRef } = useCanvasSurface(paint, playing);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 text-primary">
      <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
    </div>
  );
}
