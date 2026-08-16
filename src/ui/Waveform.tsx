/**
 * @role One deck's buffer, drawn: peaks on a canvas, a loop you can sweep, slide or drag by
 *   either marker, a click that moves the playhead, and a playhead and meter moved from refs at
 *   frame rate. Every gesture ends in the same `deck.loop` or `deck.seek` command a button and a
 *   JSONL line send, so ./scripts/drive reaches every one of them (docs/plan.md §4).
 * @instead The per-frame values → peek() on src/app/facade.ts. Seconds-to-pixels maths →
 *   src/lib/timeline.ts. The frame loop itself → src/ui/frame.ts.
 */

// One surface, three coupled concerns — canvas drawing, the drag machine, the per-frame refs —
// that share the same element refs and drag state; the count tracks that coupling, not
// branching depth. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Instrument } from "@/app/facade";
import { snapLoop, snapSecs, SNAP_TOLERANCE_PX } from "@/lib/analysis";
import {
  hitTest,
  insideLoop,
  playbackRate,
  pxToSecs,
  secsToPx,
  seekTarget,
  translateLoop,
} from "@/lib/timeline";
import { deckIn, type DeckId, type DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { useOnFrame } from "@/ui/frame";
import { pct, usePeakCanvas } from "@/ui/peakCanvas";

/** How close, in pixels, a pointer must land to grab a loop marker. */
const GRAB_PX = 8;
/** Below this travel a drag is a click and sends nothing — a loop of 0px was not asked for. */
const MIN_DRAG_PX = 4;

const HIDDEN: CSSProperties = { display: "none" };

/**
 * One gesture on the surface. With `origin` set it slides that whole loop, and `fixed` is the
 * seconds the pointer went down at, so the pair moves by the travel since. With `origin` null
 * it is one edge moving against one staying put — a marker drag and a sweep-create are the same.
 */
type Drag = {
  pointerId: number;
  downPx: number;
  fixed: number;
  current: number;
  moved: boolean;
  origin: { in: number; out: number } | null;
};

/**
 * Over the line cap by design: one surface's whole gesture-and-drawing set — pointer capture,
 * the overlay it moves, the canvas it repaints and the two refs the frame loop writes. The
 * pieces share the drag and element refs; splitting them means threading those through hooks
 * with one caller each. See docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function Waveform({
  instrument,
  deck,
  state,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** The deck's session state, from the subscription Deck already holds — never a second one. */
  state: DeckState;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  /**
   * Whether this deck's loop edges land on onset candidates. A view preference, not session
   * state: it is how this person is dragging right now, so it is no more durable than the
   * automation workspace's Option-hold arming (0025).
   */
  const [snapping, setSnapping] = useState(true);
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

  // Reading peaks during render is in step with the store by construction: a load writes
  // `source`, so the render this value changes on is a render that is already happening.
  // The canvas, its sizing and its repaints belong to the one painter a thumbnail shares.
  const { rootRef, canvasRef, widthRef } = usePeakCanvas(instrument.peaks(deck));

  /** The overlay under a live drag: candidate positions written straight to the elements. */
  const applyOverlay = useCallback(
    (lo: number, hi: number) => {
      const region = regionRef.current;
      const markIn = inRef.current;
      const markOut = outRef.current;
      if (region === null || markIn === null || markOut === null) return;
      region.style.display = "";
      markIn.style.display = "";
      markOut.style.display = "";
      region.style.left = pct(lo, state.duration);
      region.style.width = pct(hi - lo, state.duration);
      markIn.style.left = pct(lo, state.duration);
      markOut.style.left = pct(hi, state.duration);
    },
    [state.duration],
  );

  /**
   * The overlay back on the session's truth, straight after a drag ends — send() is synchronous,
   * so the store already holds whatever the voice actually applied, clamped or cleared.
   */
  const syncOverlay = useCallback(() => {
    const { loop } = deckIn(instrument.state.getState().decks, deck);
    if (loop === null) {
      for (const ref of [regionRef, inRef, outRef]) {
        if (ref.current !== null) ref.current.style.display = "none";
      }
      return;
    }
    applyOverlay(loop.in, loop.out);
  }, [instrument, deck, applyOverlay]);

  /**
   * The gesture's two edges, snapped onto onset candidates — unless this deck's snap is off,
   * the gesture is holding the bypass modifier, or nothing has been analysed yet. The tolerance
   * is pixels converted to seconds, so it feels the same at any source length (0025).
   *
   * A slide snaps its in edge alone and keeps its length: snapping both independently would
   * change the length as the segment moves, which is the one thing a slide must not do.
   */
  const edges = useCallback(
    (active: Drag, width: number, bypass: boolean): { in: number; out: number } => {
      const onsets =
        bypass || !snapping || analysis === null || analysis.onsets.length === 0
          ? null
          : analysis.onsets;
      const tolerance = pxToSecs(SNAP_TOLERANCE_PX, state.duration, width);
      if (active.origin !== null) {
        const wanted = active.origin.in + (active.current - active.fixed);
        const to = onsets === null ? wanted : snapSecs(wanted, onsets, tolerance);
        return translateLoop(active.origin, to - active.origin.in, state.duration);
      }
      const lo = Math.min(active.fixed, active.current);
      const hi = Math.max(active.fixed, active.current);
      if (onsets === null) return { in: lo, out: hi };
      return snapLoop(lo, hi, onsets, tolerance);
    },
    [snapping, analysis, state.duration],
  );

  const onSnap = useCallback(() => {
    setSnapping((on) => !on);
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // One drag at a time: a second pointer landing mid-drag must not steal the gesture, or
      // the first pointer's overlay writes are orphaned with nobody left to sync them away.
      if (drag.current !== null || event.button !== 0 || state.duration === 0) return;
      const root = event.currentTarget;
      // clientLeft/clientWidth, not the bounding rect: the overlay's percentages and widthRef
      // resolve against the padding box, and the pointer must agree with what is drawn.
      const px = event.clientX - root.getBoundingClientRect().left - root.clientLeft;
      const secs = pxToSecs(px, state.duration, root.clientWidth);
      // The same hitTest discriminates the whole gesture set, in this order: a grabbed marker
      // drags that edge against the other, Shift sweeps a new loop out from here whatever is
      // already there, and a press inside the loop away from both markers slides the segment
      // whole. Outside it, unmodified, a press still means nothing — a slip of the mouse must
      // not silently move a loop someone is playing.
      let fixed = secs;
      let origin: { in: number; out: number } | null = null;
      if (state.loop !== null) {
        const grabbed = hitTest(px, state.loop, state.duration, root.clientWidth, GRAB_PX);
        if (grabbed !== "none") {
          fixed = grabbed === "in" ? state.loop.out : state.loop.in;
        } else if (!event.shiftKey) {
          if (!insideLoop(secs, state.loop)) return;
          origin = state.loop;
        }
      }
      root.setPointerCapture(event.pointerId);
      drag.current = {
        pointerId: event.pointerId,
        downPx: px,
        fixed,
        current: secs,
        moved: false,
        origin,
      };
    },
    [state.duration, state.loop],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      const root = event.currentTarget;
      const px = event.clientX - root.getBoundingClientRect().left - root.clientLeft;
      active.current = pxToSecs(px, state.duration, root.clientWidth);
      if (!active.moved && Math.abs(px - active.downPx) < MIN_DRAG_PX) return;
      active.moved = true;
      // Read live, so the overlay always shows exactly what a release would commit.
      const next = edges(active, root.clientWidth, event.shiftKey);
      applyOverlay(next.in, next.out);
    },
    [applyOverlay, edges, state.duration],
  );

  /** Ends the drag; `send` says whether it commits (pointerup) or abandons (pointercancel). */
  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>, send: boolean) => {
      const active = drag.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (send && active.moved) {
        // One command per gesture, on release — the same one the loop button and a JSONL line
        // send, snapped or not. Snapping changes the numbers and never the path (0025).
        // Per-move sends would restart playback on every pixel: setLoop restarts by design.
        const next = edges(active, event.currentTarget.clientWidth, event.shiftKey);
        instrument.send({ t: "deck.loop", deck, in: next.in, out: next.out });
      } else if (send) {
        // Nothing travelled, so this was a click: the playhead goes where it landed. Distance is
        // the whole discrimination — the same press is a seek until it has moved MIN_DRAG_PX, and
        // a drag from then on (0041). A point the loop does not cover asks for nothing.
        const at = seekTarget(
          pxToSecs(active.downPx, state.duration, event.currentTarget.clientWidth),
          state.loop,
          state.duration,
        );
        if (at !== null) instrument.send({ t: "deck.seek", deck, position: at });
      }
      // Unconditionally: "the DOM equals the store after every gesture" must not depend on
      // whether this particular gesture happened to move.
      syncOverlay();
    },
    [instrument, deck, edges, syncOverlay, state.duration, state.loop],
  );
  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endDrag(event, true);
    },
    [endDrag],
  );
  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endDrag(event, false);
    },
    [endDrag],
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

  const overlay = useMemo(() => {
    if (state.loop === null || state.duration === 0) {
      return { region: HIDDEN, markIn: HIDDEN, markOut: HIDDEN };
    }
    return {
      region: {
        left: pct(state.loop.in, state.duration),
        width: pct(state.loop.out - state.loop.in, state.duration),
      },
      markIn: { left: pct(state.loop.in, state.duration) },
      markOut: { left: pct(state.loop.out, state.duration) },
    };
  }, [state.loop, state.duration]);

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={rootRef}
        className="relative h-24 w-full touch-none border border-border select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <canvas
          ref={canvasRef}
          className="size-full text-muted-foreground"
          aria-label={`Deck ${deck} waveform`}
        />
        <div
          ref={regionRef}
          className="absolute inset-y-0 cursor-grab bg-primary/15"
          style={overlay.region}
        />
        <div
          ref={inRef}
          className="absolute inset-y-0 w-0.5 cursor-ew-resize bg-primary"
          style={overlay.markIn}
        />
        <div
          ref={outRef}
          className="absolute inset-y-0 w-0.5 cursor-ew-resize bg-primary"
          style={overlay.markOut}
        />
        {(state.playing || state.paused !== null) && (
          <div ref={playheadRef} className="absolute inset-y-0 left-0 w-px bg-foreground" />
        )}
      </div>
      <div className="h-1 w-full bg-muted">
        <div ref={meterRef} className="h-full w-full origin-left scale-x-0 bg-primary" />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="xs"
          variant={snapping ? "default" : "outline"}
          onClick={onSnap}
          disabled={analysis === null}
          aria-pressed={snapping}
          aria-label={`Snap deck ${deck} loops to beats`}
        >
          snap
        </Button>
        <span className="type-readout text-muted-foreground">
          {analysis === null
            ? "not analysed"
            : `${analysis.bpm > 0 ? `${bpm} bpm` : "no tempo"} · ${analysis.onsets.length} onsets · shift drag to override`}
        </span>
      </div>
    </div>
  );
}
