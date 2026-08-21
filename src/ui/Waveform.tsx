/**
 * @role One deck's buffer, drawn: peaks on a canvas a press seeks in and a file drops onto, the
 *   loop's handle strip above them, and a playhead and meter moved from refs at frame rate. A
 *   plain press on the peaks is a seek and nothing else; Shift is the loop's own modifier, and a
 *   Shift-held drag sweeps a loop from the press to the release (0066) — and every gesture ends
 *   in the same `deck.seek`, `deck.loop` or `deck.load` a button and a JSONL line
 *   send, so ./scripts/drive reaches every one of them (docs/plan.md §4).
 * @instead The loop's own gestures → src/ui/LoopHandles.tsx. The per-frame values → peek() on
 *   src/app/facade.ts. Seconds-to-pixels maths → src/lib/timeline.ts. The frame loop itself →
 *   src/ui/frame.ts.
 */

// One import over the cap, and the one over it is the noun the labels below say (0057): the
// word is declared once and imported, never typed into a label.
// oxlint-disable import/max-dependencies
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { ACTION_TOOLTIPS, yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import { toneOf } from "@/lib/source";
import { snapLoop, SNAP_TOLERANCE_PX } from "@/lib/analysis";
import { clamp } from "@/lib/range";
import {
  isDrag,
  MIN_DRAG_PX,
  offsetPx,
  playbackRate,
  pxSpanToSecs,
  pxToSecs,
  secsToPx,
  seekTarget,
} from "@/lib/timeline";
import type { DeckId, DeckState } from "@/state/store";
import { Toggle } from "@/ui/components/toggle";
import { ToneScope } from "@/ui/ToneScope";
import { useFileDrop } from "@/ui/fileDrop";
import { useOnFrame } from "@/ui/frame";
import { usePointerGesture } from "@/ui/gesture";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
import { LoopHandles } from "@/ui/LoopHandles";
import { pct, usePeakCanvas } from "@/ui/peakCanvas";
// oxlint-enable import/max-dependencies

/** The sweep preview's resting state: drawn only while a gesture is drawing it. */
const HIDDEN: CSSProperties = { display: "none" };

/**
 * One Shift-held sweep of the peaks. `downSecs` is where the press landed and `current` where
 * the pointer is now; the loop is the pair either way round, so a sweep leftwards is the same
 * loop as a sweep rightwards.
 */
type Sweep = {
  pointerId: number;
  downClientX: number;
  downSecs: number;
  current: number;
  moved: boolean;
};

/**
 * Over the line cap by design: one surface's whole drawing set — the canvas it repaints, the
 * seek a press on it is, and the two refs the frame loop writes. The pieces share the element
 * refs; splitting them means threading those through hooks with one caller each. See
 * docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function Waveform({
  instrument,
  deck,
  state,
  onFile,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** The deck's session state, from the subscription Deck already holds — never a second one. */
  state: DeckState;
  /** What a dropped file is handed to — the deck's one ingest, refusal and error surface. */
  onFile: (file: File) => void;
}) {
  const playheadRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  /** The Shift-held sweep in flight, and the draft loop it draws — refs, never state (§2). */
  const sweep = usePointerGesture<Sweep>();
  const previewRef = useRef<HTMLDivElement>(null);
  /**
   * Whether this deck's loop edges land on onset candidates. A view preference, not session
   * state: it is how this person is dragging right now, so it is no more durable than the
   * automation workspace's Option-hold arming (0025).
   */
  const [snapping, setSnapping] = useState(true);
  /** Dropping a file here is the picker's load reached the other way — the same `deck.load`. */
  const drop = useFileDrop(onFile);
  const analysis = state.analysis;
  /**
   * The tempo as it is actually heard. Analysis measures the buffer, and the deck reads that
   * buffer at whatever speed and pitch ask for, so a source measured at 120 is 240 at 2× — the
   * number on screen is about what is playing, not about what was decoded (0031).
   */
  const bpm =
    analysis === null
      ? 0
      : Math.round(
          analysis.bpm * playbackRate(state.params["deck.speed"], state.params["deck.pitch"]),
        );

  /**
   * The tone this yard is holding, or null for anything else. A tone draws its own wave live, so
   * the peak painter below is handed nothing to draw and the box's ink comes from `ToneScope`
   * instead — the surface, its gestures, its playhead and its meter are the same either way.
   */
  const tone = toneOf(state.source);

  // Reading peaks during render is in step with the store by construction: a load writes
  // `source`, so the render this value changes on is a render that is already happening.
  // The canvas, its sizing and its repaints belong to the one painter a thumbnail shares.
  const { rootRef, canvasRef, widthRef } = usePeakCanvas(
    tone === null ? instrument.peaks(deck) : null,
  );

  // The toggle reports the state it is moving to, and snapping is this component's own view
  // preference, so the reported value is the whole update — nothing else can have changed it.
  const onSnap = useCallback((next: boolean) => {
    setSnapping(next);
  }, []);

  /**
   * The seconds a client x points at on the peaks, clamped into the buffer: a press is a point,
   * and a point outside the buffer is not one. The canvas and widthRef both resolve against the
   * padding box, which is why the reading is taken from there.
   */
  const axis = useCallback(
    (root: HTMLDivElement, clientX: number): number =>
      pxToSecs(offsetPx(root, clientX), state.duration, root.clientWidth),
    [state.duration],
  );

  /**
   * The loop a sweep is asking for: the press and the pointer either way round, clamped into
   * the buffer and snapped by the same toggle and the same tolerance a handle drag obeys
   * (0025). Both edges snap together or neither does; a pair that still comes back collapsed is
   * refused on release rather than committed, because `setLoop` reads `out <= in` as a clear.
   */
  const swept = useCallback(
    (active: Sweep, width: number): { in: number; out: number } => {
      const lo = clamp(Math.min(active.downSecs, active.current), 0, state.duration);
      const hi = clamp(Math.max(active.downSecs, active.current), 0, state.duration);
      if (!snapping || analysis === null || analysis.onsets.length === 0)
        return { in: lo, out: hi };
      const tolerance = pxSpanToSecs(SNAP_TOLERANCE_PX, state.duration, width);
      return snapLoop(lo, hi, analysis.onsets, tolerance);
    },
    [snapping, analysis, state.duration],
  );

  /**
   * A plain press on the peaks is a seek and only ever a seek — a point the loop does not cover
   * asks for nothing (0041). Shift is the loop's own modifier: it starts a sweep instead, which
   * takes both boundaries anywhere on the surface and creates the loop if there was none (0066).
   */
  const onPress = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || state.duration === 0) return;
      const root = event.currentTarget;
      const at = axis(root, event.clientX);
      if (event.shiftKey) {
        sweep.begin(root, {
          pointerId: event.pointerId,
          downClientX: event.clientX,
          downSecs: at,
          current: at,
          moved: false,
        });
        return;
      }
      const target = seekTarget(at, state.loop, state.duration);
      if (target !== null) instrument.send({ t: "deck.seek", deck, position: target });
    },
    [instrument, deck, axis, sweep, state.duration, state.loop],
  );

  const onSweepMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = sweep.matched(event);
      if (active === null) return;
      const root = event.currentTarget;
      active.current = axis(root, event.clientX);
      if (!active.moved && !isDrag(event.clientX - active.downClientX)) return;
      active.moved = true;
      const preview = previewRef.current;
      if (preview === null) return;
      // The draft ahead of the store, exactly what a release would commit — the strip below
      // still shows the loop that is actually set until this gesture replaces it.
      const next = swept(active, root.clientWidth);
      preview.style.display = "";
      preview.style.left = pct(next.in, state.duration);
      preview.style.width = pct(next.out - next.in, state.duration);
    },
    [axis, sweep, swept, state.duration],
  );

  /** Ends the sweep; `send` says whether it commits (pointerup) or abandons (pointercancel). */
  const endSweep = useCallback(
    (event: PointerEvent<HTMLDivElement>, send: boolean) => {
      const active = sweep.ended(event);
      if (active === null) return;
      // Unconditionally: a preview left on screen would outlive the gesture that drew it.
      if (previewRef.current !== null) previewRef.current.style.display = "none";
      // One command per gesture, on release — the same `deck.loop` the handles and a JSONL line
      // send. A press that travelled less than the threshold asked for no loop at all.
      if (!send || !active.moved) return;
      const width = event.currentTarget.clientWidth;
      const next = swept(active, width);
      // A sweep that travelled and came back — or one that ran off the same end of the buffer
      // twice — is asking for no loop, not for the loop cleared: `setLoop` reads a span of
      // nothing as a clear, and a durable clear is never what a returning drag meant.
      if (next.out - next.in < pxSpanToSecs(MIN_DRAG_PX, state.duration, width)) return;
      instrument.send({ t: "deck.loop", deck, in: next.in, out: next.out });
    },
    [instrument, deck, sweep, swept, state.duration],
  );
  const onSweepUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endSweep(event, true);
    },
    [endSweep],
  );
  /**
   * Cancel, and the capture lost without one — the peaks can be detached or have their capture
   * taken while the button is still down, and neither sends a pointercancel. A sweep left in the
   * ref would refuse every later Shift press and leave its draft painted over the peaks, because
   * nothing declarative can put that draft back: the same reason the knobs wire it (Knob.tsx).
   */
  const onSweepCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endSweep(event, false);
    },
    [endSweep],
  );

  const paintFrame = useCallback(() => {
    const at = instrument.peek(deck);
    const playhead = playheadRef.current;
    if (playhead !== null) {
      playhead.style.transform = `translateX(${secsToPx(at.position, state.duration, widthRef.current)}px)`;
    }
    const meter = meterRef.current;
    if (meter !== null) meter.style.transform = `scaleX(${Math.min(1, at.meter)})`;
  }, [instrument, deck, state.duration, widthRef]);

  useOnFrame(paintFrame, state.playing);

  // Before the commit paints, because the RAF tick runs after it: without this the playhead's
  // first painted frame sits at x=0 even when playback starts at a loop point. A pause paints
  // through here too and then stands still — the frame loop above runs only while something is
  // moving, and a held playhead is exactly what is not (0038). Stopping paints the meter to
  // silence — that is what a deck no longer sounding shows, held or not.
  useLayoutEffect(() => {
    if (state.playing || state.paused !== null) paintFrame();
    if (!state.playing && meterRef.current !== null) {
      meterRef.current.style.transform = "scaleX(0)";
    }
  }, [state.playing, state.paused, paintFrame]);

  return (
    <div className="flex flex-col gap-1">
      <LoopHandles instrument={instrument} deck={deck} state={state} snapping={snapping} />
      <div
        ref={rootRef}
        className="relative h-peaks w-full touch-none border border-border select-none data-[dropping=true]:border-primary data-[dropping=true]:bg-primary/10"
        onPointerDown={onPress}
        onPointerMove={onSweepMove}
        onPointerUp={onSweepUp}
        onPointerCancel={onSweepCancel}
        onLostPointerCapture={onSweepCancel}
        {...drop}
      >
        <canvas
          ref={canvasRef}
          className="size-full text-muted-foreground"
          aria-label={`${yardLabel(deck)} Waveform`}
        />
        {tone !== null && (
          <ToneScope
            instrument={instrument}
            deck={deck}
            source={tone}
            playing={state.playing}
            paused={state.paused}
          />
        )}
        <div
          ref={previewRef}
          data-slot="loop-sweep"
          className="pointer-events-none absolute inset-y-0 bg-loop/25"
          style={HIDDEN}
        />
        {(state.playing || state.paused !== null) && (
          <div
            ref={playheadRef}
            data-slot="playhead"
            className="absolute inset-y-0 left-0 w-px bg-foreground"
          />
        )}
      </div>
      <div className="h-1 w-full bg-muted">
        <div ref={meterRef} className="h-full w-full origin-left scale-x-0 bg-primary" />
      </div>
      <div className="flex items-center gap-2">
        {/* Snapping is a state the strip is in, not a thing that happens once, so it is a
            Toggle and reports it as `aria-pressed` (P25). */}
        <Says what={ACTION_TOOLTIPS.snap}>
          <Toggle
            size="sm"
            variant="outline"
            pressed={snapping}
            onPressedChange={onSnap}
            disabled={analysis === null}
            aria-label={`Snap ${yardLabel(deck)} Loops to Beats`}
          >
            <ACTION_ICONS.snap data-icon="inline-start" />
            Snap
          </Toggle>
        </Says>
        {/* The sweep is the same gesture whether or not a worker has answered, so the hint it
            advertises stands on its own: only the tempo half waits for analysis (0066). */}
        <span className="type-readout text-muted-foreground">
          {analysis === null
            ? "not analysed · shift drag to loop"
            : `${analysis.bpm > 0 ? `${bpm} bpm` : "no tempo"} · ${analysis.onsets.length} onsets · shift drag to loop`}
        </span>
      </div>
    </div>
  );
}
