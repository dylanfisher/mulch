/**
 * @role The loop's own strip above the peaks: two labelled handles, IN and OUT, and the region
 *   between them — the three things a pointer drags to change a loop, each drawing the boundary
 *   it holds down through the peaks below in the loop's own colour. Every gesture ends in
 *   one `deck.loop` on release, snapped by the same analysis the deck's snap toggle governs, so
 *   ./scripts/drive reaches it the way it reaches the loop button (0025, 0053).
 * @instead The peaks, the seek a press on them is and the loop a Shift-held sweep of them
 *   makes → src/ui/Waveform.tsx.
 *   Seconds-to-pixels maths → src/lib/timeline.ts. Snapping itself → src/lib/analysis.ts.
 */

import { type CSSProperties, type PointerEvent, useCallback, useMemo, useRef } from "react";

import { yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import { snapLoop, snapSecs, SNAP_TOLERANCE_PX } from "@/lib/analysis";
import { clamp } from "@/lib/range";
import { MIN_DRAG_PX, pxSpanToSecs, translateLoop } from "@/lib/timeline";
import { deckIn, type DeckId, type DeckState } from "@/state/store";
import { pct } from "@/ui/peakCanvas";

/**
 * The boundary line each handle runs down through the peaks: the gap between the strip and the
 * canvas, plus the canvas's own height, both stated once in src/ui/tokens.css. Above the peaks
 * in paint order because neither box makes a stacking context of its own, and never a pointer
 * target — the peaks below it are still seeked in and swept on.
 */
const LINE =
  "pointer-events-none absolute top-full z-10 w-px h-[calc(var(--spacing-peaks)+var(--spacing))] bg-loop";

const HIDDEN: CSSProperties = { display: "none" };

/**
 * Which of the strip's three targets a gesture went down on. The target is the whole
 * discrimination — no pixel tolerance decides it, because each of them is an element a pointer
 * either hit or did not (0053).
 */
type Grip = "in" | "out" | "region";

/**
 * One gesture on the strip. `origin` is the loop as it stood when the pointer went down: with
 * grip `region` the pair slides by the travel since, and with `in` or `out` that edge moves
 * against the one `origin` holds still.
 */
type Drag = {
  pointerId: number;
  downClientX: number;
  grip: Grip;
  origin: { in: number; out: number };
  current: number;
  moved: boolean;
};

/**
 * Over the line cap by design: one strip's whole gesture-and-overlay set — the three grips, the
 * pointer capture they take and the overlay they move ahead of the store. The pieces share the
 * drag and element refs; splitting them means threading those through hooks with one caller
 * each. See docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function LoopHandles({
  instrument,
  deck,
  state,
  snapping,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** The deck's session state, from the subscription Deck already holds — never a second one. */
  state: DeckState;
  /** The deck's snap preference, owned by the toggle beside the waveform and read here. */
  snapping: boolean;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const lineInRef = useRef<HTMLDivElement>(null);
  const lineOutRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const analysis = state.analysis;

  /** The overlay under a live drag: candidate positions written straight to the elements. */
  const applyOverlay = useCallback(
    (lo: number, hi: number) => {
      const region = regionRef.current;
      if (region === null) return;
      region.style.display = "";
      region.style.left = pct(lo, state.duration);
      region.style.width = pct(hi - lo, state.duration);
      // The line moves with the handle that owns it, from the one write: the strip and the
      // peaks agree about where an edge is because there is one position, not two (0066).
      for (const [ref, at] of [
        [inRef, lo],
        [lineInRef, lo],
        [outRef, hi],
        [lineOutRef, hi],
      ] as const) {
        const element = ref.current;
        if (element === null) continue;
        element.style.display = "";
        element.style.left = pct(at, state.duration);
      }
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
      for (const ref of [regionRef, inRef, outRef, lineInRef, lineOutRef]) {
        if (ref.current !== null) ref.current.style.display = "none";
      }
      return;
    }
    applyOverlay(loop.in, loop.out);
  }, [instrument, deck, applyOverlay]);

  /**
   * The gesture's two edges, snapped onto onset candidates — unless this deck's snap is off or
   * nothing has been analysed yet. The toggle beside the peaks is the whole of that choice:
   * Shift is the loop's own modifier on the peaks and overrides nothing here (0066). The
   * tolerance is pixels converted to seconds, so it feels the same at any source length (0025).
   *
   * A slide snaps its in edge alone and keeps its length: snapping both independently would
   * change the length as the segment moves, which is the one thing a slide must not do.
   */
  const edges = useCallback(
    (active: Drag, downSecs: number, width: number): { in: number; out: number } => {
      const onsets =
        !snapping || analysis === null || analysis.onsets.length === 0 ? null : analysis.onsets;
      const tolerance = pxSpanToSecs(SNAP_TOLERANCE_PX, state.duration, width);
      if (active.grip === "region") {
        const wanted = active.origin.in + (active.current - downSecs);
        const to = onsets === null ? wanted : snapSecs(wanted, onsets, tolerance);
        return translateLoop(active.origin, to - active.origin.in, state.duration);
      }
      // The edge follows the travel since the press, not the pointer itself: a handle is a
      // target wide enough to grab away from its own edge, and an edge that jumped to wherever
      // inside it the press landed would move before the drag did.
      const held = active.grip === "in" ? active.origin.in : active.origin.out;
      const moving = clamp(held + (active.current - downSecs), 0, state.duration);
      const fixed = active.grip === "in" ? active.origin.out : active.origin.in;
      const lo = Math.min(fixed, moving);
      const hi = Math.max(fixed, moving);
      if (onsets === null) return { in: lo, out: hi };
      return snapLoop(lo, hi, onsets, tolerance);
    },
    [snapping, analysis, state.duration],
  );

  /**
   * A gesture starting on one of the three grips. Capture goes on the grip itself, so the
   * pointer keeps reaching it however far the drag leaves the strip, and the strip below still
   * sees the retargeted moves because the grip is its child.
   */
  const begin = useCallback(
    (event: PointerEvent<HTMLDivElement>, grip: Grip) => {
      // One drag at a time: a second pointer landing mid-drag must not steal the gesture, or
      // the first pointer's overlay writes are orphaned with nobody left to sync them away.
      if (drag.current !== null || event.button !== 0) return;
      if (state.duration === 0 || state.loop === null) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        pointerId: event.pointerId,
        downClientX: event.clientX,
        grip,
        origin: state.loop,
        current: state.loop.in,
        moved: false,
      };
    },
    [state.duration, state.loop],
  );
  const onDownIn = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      begin(event, "in");
    },
    [begin],
  );
  const onDownOut = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      begin(event, "out");
    },
    [begin],
  );
  const onDownRegion = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      begin(event, "region");
    },
    [begin],
  );

  /**
   * The strip's own geometry, which is what both the live pointer and the press are measured
   * against: the grips move under the drag, so measuring against one of them would move the
   * ruler with the thing being ruled. clientLeft, not the bounding rect alone, because the
   * overlay's percentages resolve against the padding box.
   */
  const axis = useCallback(
    (root: HTMLDivElement, clientX: number): number =>
      pxSpanToSecs(
        clientX - root.getBoundingClientRect().left - root.clientLeft,
        state.duration,
        root.clientWidth,
      ),
    [state.duration],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      const root = event.currentTarget;
      active.current = axis(root, event.clientX);
      if (!active.moved && Math.abs(event.clientX - active.downClientX) < MIN_DRAG_PX) return;
      active.moved = true;
      // Read live, so the overlay always shows exactly what a release would commit.
      const next = edges(active, axis(root, active.downClientX), root.clientWidth);
      applyOverlay(next.in, next.out);
    },
    [applyOverlay, axis, edges],
  );

  /** Ends the drag; `send` says whether it commits (pointerup) or abandons (pointercancel). */
  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>, send: boolean) => {
      const active = drag.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      drag.current = null;
      // The store, not the press, says whether there is still a loop to move: capture outlives
      // the handles, so a gesture held while the loop button, a key or an undo clears the loop
      // must commit nothing — a hidden handle moves no loop, and resurrecting one would land a
      // durable edit on top of the undo that removed it.
      const held = deckIn(instrument.state.getState().decks, deck).loop !== null;
      if (send && active.moved && held) {
        // One command per gesture, on release — the same one the loop button and a JSONL line
        // send, snapped or not. Snapping changes the numbers and never the path (0025).
        // Per-move sends would restart playback on every pixel: setLoop restarts by design.
        const root = event.currentTarget;
        const next = edges(active, axis(root, active.downClientX), root.clientWidth);
        instrument.send({ t: "deck.loop", deck, in: next.in, out: next.out });
      }
      // Unconditionally: "the DOM equals the store after every gesture" must not depend on
      // whether this particular gesture happened to move.
      syncOverlay();
    },
    [instrument, deck, edges, axis, syncOverlay],
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

  // The strip's inner box is the peaks' padding box, which the overlay's percentages and the
  // pointer both resolve against: the margin matches the border the peaks below carry, so an
  // edge at 0s is the first sample rather than a pixel to the left of it.
  //
  // The two handles bracket the loop rather than straddling it — IN ends where the loop starts,
  // OUT begins where it ends — because a handle centred on its edge covers half its own width of
  // the region, and a loop drawn narrower than a handle would then have no region left to press
  // and no way to tell the two handles apart. Bracketed, all three grips stay hittable at any
  // loop length; the price is that an edge against the buffer's own end leans past the peaks.
  return (
    <div
      className="relative mx-px h-5 touch-none select-none"
      aria-label={`${yardLabel(deck)} Loop Handles`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        ref={regionRef}
        className="absolute inset-y-0 cursor-grab bg-loop/25"
        style={overlay.region}
        onPointerDown={onDownRegion}
        aria-label={`${yardLabel(deck)} Loop Region`}
      />
      <div
        ref={inRef}
        className="absolute inset-y-0 flex w-8 -translate-x-full cursor-ew-resize items-center justify-center bg-loop type-eyebrow text-loop-foreground"
        style={overlay.markIn}
        onPointerDown={onDownIn}
        aria-label={`${yardLabel(deck)} Loop In`}
      >
        In
      </div>
      <div
        ref={outRef}
        className="absolute inset-y-0 flex w-8 cursor-ew-resize items-center justify-center bg-loop type-eyebrow text-loop-foreground"
        style={overlay.markOut}
        onPointerDown={onDownOut}
        aria-label={`${yardLabel(deck)} Loop Out`}
      >
        Out
      </div>
      {/* The two boundaries, drawn where they actually are: each line takes the same left the
          handle above it took, so the strip and the peaks state one position rather than two. */}
      <div ref={lineInRef} className={LINE} style={overlay.markIn} data-slot="loop-line-in" />
      <div ref={lineOutRef} className={LINE} style={overlay.markOut} data-slot="loop-line-out" />
    </div>
  );
}
