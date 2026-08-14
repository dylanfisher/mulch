// One surface, three coupled concerns — canvas drawing, the drag machine, the per-frame refs —
// that share the same element refs and drag state; the count tracks that coupling, not
// branching depth. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

/**
 * @role One deck's buffer, drawn: peaks on a canvas, loop markers you can drag, and a playhead
 *   and meter moved from refs at frame rate. A drag ends in the same `deck.loop` command the
 *   loop button sends, so ./scripts/drive reaches every gesture here (docs/plan.md §4).
 * @instead The per-frame values → peek() on src/app/facade.ts. Seconds-to-pixels maths →
 *   src/lib/timeline.ts. The frame loop itself → src/ui/frame.ts.
 */
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import type { Instrument } from "@/app/facade";
import { columnRange, hitTest, pxToSecs, secsToPx } from "@/lib/timeline";
import type { DeckId, DeckState } from "@/state/store";
import { useOnFrame } from "@/ui/frame";
import { useTheme } from "@/ui/theme";

/** How close, in pixels, a pointer must land to grab a loop marker. */
const GRAB_PX = 8;
/** Below this travel a drag is a click and sends nothing — a loop of 0px was not asked for. */
const MIN_DRAG_PX = 4;

/** A CSS position on the buffer, so the overlay tracks the element and not a cached width. */
const pct = (secs: number, duration: number): string => `${secsToPx(secs, duration, 100)}%`;

const HIDDEN: CSSProperties = { display: "none" };

/** One edge moving against one staying put — a marker drag and a sweep-create are the same. */
type Drag = { pointerId: number; downPx: number; fixed: number; current: number; moved: boolean };

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
  const theme = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  /** The root's CSS width, kept for the frame callback — layout is not read per frame. */
  const widthRef = useRef(0);
  const drag = useRef<Drag | null>(null);

  // Reading peaks during render is in step with the store by construction: a load writes
  // `source`, so the render this value changes on is a render that is already happening.
  const loadedPeaks = instrument.peaks(deck);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (loadedPeaks === null) return;
    // The canvas carries `text-muted-foreground`, so the computed colour is the token resolved
    // for the theme in force — never a literal (docs/decisions/0004-theme-via-color-scheme.md).
    context.fillStyle = getComputedStyle(canvas).color;
    const middle = height / 2;
    const columns = loadedPeaks.min.length;
    for (let x = 0; x < width; x++) {
      // Min/max over every column this pixel covers — sampling one would let a transient
      // vanish whenever the canvas is narrower than the peaks (src/lib/timeline.ts).
      const [from, to] = columnRange(x, width, columns);
      let low = 0;
      let high = 0;
      for (let column = from; column < to; column++) {
        const min = loadedPeaks.min[column] ?? 0;
        const max = loadedPeaks.max[column] ?? 0;
        if (min < low) low = min;
        if (max > high) high = max;
      }
      const top = middle - high * middle;
      const bottom = middle - low * middle;
      // At least a pixel, so silence still draws a centre line.
      context.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
  }, [loadedPeaks]);

  /** Size the backing store to the element and the display, then repaint. */
  const rebake = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (root === null || canvas === null) return;
    widthRef.current = root.clientWidth;
    canvas.width = Math.max(1, Math.round(root.clientWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(root.clientHeight * devicePixelRatio));
    draw();
  }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver(rebake);
    if (rootRef.current !== null) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
    };
  }, [rebake]);

  // Zoom and a move to a different-density display change devicePixelRatio with no resize, so
  // the observer above never fires and the backing store goes blurry. The query names the
  // current density exactly, so it must be rebuilt after each flip to watch for the next one.
  useEffect(() => {
    let query: MediaQueryList | null = null;
    function onFlip(): void {
      rebake();
      listen();
    }
    function listen(): void {
      query?.removeEventListener("change", onFlip);
      query = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      query.addEventListener("change", onFlip);
    }
    listen();
    return () => query?.removeEventListener("change", onFlip);
  }, [rebake]);

  // An explicit theme choice reaches `theme`; following the system does not — the token flips
  // with the OS and no React signal, so the media query is the redraw trigger for that half.
  useEffect(() => {
    draw();
  }, [draw, theme]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onFlip = () => {
      draw();
    };
    media.addEventListener("change", onFlip);
    return () => {
      media.removeEventListener("change", onFlip);
    };
  }, [draw]);

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
    const { loop } = instrument.state.getState().decks[deck];
    if (loop === null) {
      for (const ref of [regionRef, inRef, outRef]) {
        if (ref.current !== null) ref.current.style.display = "none";
      }
      return;
    }
    applyOverlay(loop.in, loop.out);
  }, [instrument, deck, applyOverlay]);

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
      // A grabbed marker drags that edge against the other; empty space with no loop sweeps a
      // new one out. Inside an existing loop, away from both markers, a press means nothing —
      // a slip of the mouse must not silently move a loop someone is playing.
      let fixed = secs;
      if (state.loop !== null) {
        const grabbed = hitTest(px, state.loop, state.duration, root.clientWidth, GRAB_PX);
        if (grabbed === "none") return;
        fixed = grabbed === "in" ? state.loop.out : state.loop.in;
      }
      root.setPointerCapture(event.pointerId);
      drag.current = { pointerId: event.pointerId, downPx: px, fixed, current: secs, moved: false };
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
      applyOverlay(Math.min(active.fixed, active.current), Math.max(active.fixed, active.current));
    },
    [applyOverlay, state.duration],
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
        // send. Per-move sends would restart playback on every pixel: setLoop restarts by design.
        instrument.send({
          t: "deck.loop",
          deck,
          in: Math.min(active.fixed, active.current),
          out: Math.max(active.fixed, active.current),
        });
      }
      // Unconditionally: "the DOM equals the store after every gesture" must not depend on
      // whether this particular gesture happened to move.
      syncOverlay();
    },
    [instrument, deck, syncOverlay],
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
  }, [instrument, deck, state.duration]);

  useOnFrame(paintFrame, state.playing);

  // Before the commit paints, because the RAF tick runs after it: without this the playhead's
  // first painted frame sits at x=0 even when playback starts at a loop point. Stopping paints
  // the meter to silence — that is what a stopped deck shows.
  useLayoutEffect(() => {
    if (state.playing) {
      paintFrame();
      return;
    }
    if (meterRef.current !== null) meterRef.current.style.transform = "scaleX(0)";
  }, [state.playing, paintFrame]);

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
        className="relative h-24 w-full touch-none border border-border"
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
        <div ref={regionRef} className="absolute inset-y-0 bg-primary/15" style={overlay.region} />
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
        {state.playing && (
          <div ref={playheadRef} className="absolute inset-y-0 left-0 w-px bg-foreground" />
        )}
      </div>
      <div className="h-1 w-full bg-muted">
        <div ref={meterRef} className="h-full w-full origin-left scale-x-0 bg-primary" />
      </div>
    </div>
  );
}
