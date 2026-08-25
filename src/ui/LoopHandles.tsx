/**
 * @role The loop's own strip above the peaks: two labelled handles, IN and OUT, the region
 *   between them and the strip under all three — the four things a pointer drags to change a
 *   loop, each drawing the boundary it holds down through the peaks below in the loop's own
 *   colour. Every gesture ends in one `deck.loop` on release, snapped by the same analysis the
 *   deck's snap toggle governs, so ./scripts/drive reaches it the way it reaches the loop
 *   button (0025, 0053).
 * @instead The peaks, the seek a press on them is and the loop a drag of them sweeps →
 *   src/ui/Waveform.tsx.
 *   Seconds-to-pixels maths → src/lib/timeline.ts. Snapping itself → src/lib/analysis.ts.
 */

import { type CSSProperties, type PointerEvent, useCallback, useLayoutEffect, useRef } from "react";

import { yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import { snapLoop, snapSecs, SNAP_TOLERANCE_PX } from "@/lib/analysis";
import { clamp } from "@/lib/range";
import { MIN_DRAG_PX, offsetPx, pxSpanToSecs, spanLoop, translateLoop } from "@/lib/timeline";
import { deckIn, type DeckId, type DeckState } from "@/state/store";
import { track, type Tracked, usePointerGesture } from "@/ui/gesture";
import { pct } from "@/ui/peakCanvas";
import type { Loop } from "@/lib/timeline";

/**
 * The boundary line each handle runs down through the peaks: the gap between the strip and the
 * canvas, plus the canvas's own height, both stated once in src/ui/tokens.css. Above the peaks
 * in paint order because neither box makes a stacking context of its own, and never a pointer
 * target — the peaks below it are still seeked in and swept on.
 */
const LINE =
  "pointer-events-none absolute top-full z-10 w-px h-[calc(var(--spacing-peaks)+var(--spacing))] bg-loop";

/**
 * The style every element of the overlay is rendered with, and the last one React ever writes to
 * it. One object, handed to all five: React skips a style prop whose value is the one it wrote
 * last, so after the first paint the positions below have exactly one writer — the gesture and
 * the layout effect that follows the store, both through `applyOverlay`. Rendered from `overlay`
 * as well, React re-stated the store's loop on any render whose memo recomputed and wiped the
 * positions the drag in flight was drawing
 * ([0103](../../docs/decisions/0103-the-loop-overlay-has-one-writer.md)).
 */
const HIDDEN: CSSProperties = { display: "none" };

/**
 * Which of the strip's four targets a gesture went down on. The target is the whole
 * discrimination — no pixel tolerance decides it, because each of them is an element a pointer
 * either hit or did not (0053). `sweep` is the strip itself, under the other three: a press that
 * hit none of them is a loop drawn from where it landed to where it is let go, which is the same
 * gesture the peaks below already are and is why no press here is answered with nothing (0147).
 */
type Grip = "in" | "out" | "region" | "sweep";

/**
 * One gesture on the strip. `origin` is the loop as it stood when the pointer went down: with
 * grip `region` the pair slides by the travel since, and with `in` or `out` that edge moves
 * against the one `origin` holds still. A `sweep` draws a span out of its own two ends and
 * moves no loop, so it is the one grip that begins with none — which is the state a freshly
 * loaded sample is in.
 */
type Drag = Tracked & {
  pointerId: number;
  grip: Grip;
  origin: Loop | null;
};

/**
 * Over the line cap by design: one strip's whole gesture-and-overlay set — the four grips, the
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
   * A gesture the browser ended — the grip detached, its capture taken, or the button let go
   * somewhere this page never hears about — commits nothing and puts the store's own positions
   * back, exactly as a `pointercancel` does (0114).
   */
  const drag = usePointerGesture<Drag>(syncOverlay);

  /**
   * The gesture's two edges, snapped onto onset candidates — unless this deck's snap is off or
   * nothing has been analysed yet. The toggle beside the peaks is the whole of that choice, and
   * it starts off: no modifier reaches this, and nothing corrects an edge that was not asked to
   * be corrected (0147). The tolerance is pixels converted to seconds, so it feels the same at
   * any source length (0025).
   *
   * A slide snaps its in edge alone and keeps its length: snapping both independently would
   * change the length as the segment moves, which is the one thing a slide must not do.
   */
  const edges = useCallback(
    (active: Drag, downSecs: number, width: number): Loop => {
      const onsets =
        !snapping || analysis === null || analysis.onsets.length === 0 ? null : analysis.onsets;
      const tolerance = pxSpanToSecs(SNAP_TOLERANCE_PX, state.duration, width);
      if (active.grip === "sweep") {
        // Both ends of the gesture, neither of them held: the loop the strip's own background
        // draws is the one the peaks draw from the same two seconds, so the two surfaces answer
        // one axis with one shape.
        const { in: lo, out: hi } = spanLoop(downSecs, active.current, state.duration);
        return onsets === null ? { in: lo, out: hi } : snapLoop(lo, hi, onsets, tolerance);
      }
      const origin = active.origin;
      // The other three grips move a loop that was already there, and `begin` is the only writer
      // of this record: it refuses them without one, so this cannot happen (principle 5).
      if (origin === null) throw new Error(`a ${active.grip} grip began with no loop to move`);
      if (active.grip === "region") {
        const wanted = origin.in + (active.current - downSecs);
        const to = onsets === null ? wanted : snapSecs(wanted, onsets, tolerance);
        return translateLoop(origin, to - origin.in, state.duration);
      }
      // The edge follows the travel since the press, not the pointer itself: a handle is a
      // target wide enough to grab away from its own edge, and an edge that jumped to wherever
      // inside it the press landed would move before the drag did.
      const held = active.grip === "in" ? origin.in : origin.out;
      const moving = clamp(held + (active.current - downSecs), 0, state.duration);
      const fixed = active.grip === "in" ? origin.out : origin.in;
      const lo = Math.min(fixed, moving);
      const hi = Math.max(fixed, moving);
      if (onsets === null) return { in: lo, out: hi };
      return snapLoop(lo, hi, onsets, tolerance);
    },
    [snapping, analysis, state.duration],
  );

  /**
   * A gesture starting on one of the four grips. Capture goes on the grip itself, so the
   * pointer keeps reaching it however far the drag leaves the strip, and the strip below still
   * sees the retargeted moves because the grip is its child.
   */
  const begin = useCallback(
    (event: PointerEvent<HTMLDivElement>, grip: Grip) => {
      if (event.button !== 0) return;
      // A sweep needs only a buffer to draw on; the other three need the loop they move. A
      // sample loads with no loop at all (src/app/execute.ts), so gating the sweep on one would
      // leave the strip silent in the state it is in most often.
      if (state.duration === 0) return;
      if (state.loop === null && grip !== "sweep") return;
      drag.begin(event.currentTarget, event, {
        pointerId: event.pointerId,
        downClientX: event.clientX,
        grip,
        origin: state.loop,
        // Overwritten by the first `track`, on a move or on the release, before anything reads
        // it: nothing commits until the gesture has travelled.
        current: state.loop?.in ?? 0,
        moved: false,
      });
    },
    [drag, state.duration, state.loop],
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
  const onDownSweep = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      begin(event, "sweep");
    },
    [begin],
  );

  /**
   * The strip's own geometry, which is what both the live pointer and the press are measured
   * against: the grips move under the drag, so measuring against one of them would move the
   * ruler with the thing being ruled. A span rather than a point, deliberately unclamped: a
   * handle grabbed to the left of a loop that starts at 0 reads a negative position, and the
   * travel from it is still real (0053).
   */
  const axis = useCallback(
    (root: HTMLDivElement, clientX: number): number =>
      pxSpanToSecs(offsetPx(root, clientX), state.duration, root.clientWidth),
    [state.duration],
  );

  /**
   * The loop this gesture is asking for, or null when it has drawn none — one predicate read by
   * the live overlay and by the release alike, so what the strip shows while the button is down
   * is exactly what letting go commits (0147). A sweep is the only grip that can draw nothing:
   * the other three start from a loop that already exists, while a sweep that ran out and back,
   * or off the same end twice, has drawn a span `setLoop` would read as a clear.
   */
  const asked = useCallback(
    (active: Drag, root: HTMLDivElement): Loop | null => {
      const width = root.clientWidth;
      const next = edges(active, axis(root, active.downClientX), width);
      if (active.grip !== "sweep") return next;
      return next.out - next.in < pxSpanToSecs(MIN_DRAG_PX, state.duration, width) ? null : next;
    },
    [axis, edges, state.duration],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.matched(event);
      if (active === null) return;
      const root = event.currentTarget;
      track(active, event.clientX, axis(root, event.clientX));
      if (!active.moved) return;
      // Read live, so the overlay always shows exactly what a release would commit — including
      // a sweep that has drawn nothing yet, which puts the loop that is still set back.
      const next = asked(active, root);
      if (next === null) syncOverlay();
      else applyOverlay(next.in, next.out);
    },
    [applyOverlay, asked, axis, drag, syncOverlay],
  );

  /** Ends the drag; `send` says whether it commits (pointerup) or abandons (pointercancel). */
  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>, send: boolean) => {
      const active = drag.ended(event);
      if (active === null) return;
      // The release is the pointer's last position, read into the same record every move wrote
      // to: a drag whose final pixels the browser only reported here has to land where the hand
      // let go, and one the page saw as a press and a release is still the drag it was.
      if (send) track(active, event.clientX, axis(event.currentTarget, event.clientX));
      // The store, not the press, says whether there is still a loop to move: capture outlives
      // the handles, so a gesture held while the loop button, a key or an undo clears the loop
      // must commit nothing — a hidden handle moves no loop, and resurrecting one would land a
      // durable edit on top of the undo that removed it.
      // A sweep draws its own loop and has nothing to resurrect, so it is not held to this: the
      // peaks a row below commit theirs whatever the store holds, and the two are one gesture.
      const held =
        active.grip === "sweep" || deckIn(instrument.state.getState().decks, deck).loop !== null;
      if (send && active.moved && held) {
        // One command per gesture, on release — the same one the loop button and a JSONL line
        // send, snapped or not. Snapping changes the numbers and never the path (0025).
        // Per-move sends would restart playback on every pixel: setLoop restarts by design.
        const next = asked(active, event.currentTarget);
        if (next !== null) instrument.send({ t: "deck.loop", deck, in: next.in, out: next.out });
      }
      // Unconditionally: "the DOM equals the store after every gesture" must not depend on
      // whether this particular gesture happened to move.
      syncOverlay();
    },
    [instrument, deck, drag, asked, axis, syncOverlay],
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

  /**
   * The overlay follows the store after every render that is not a gesture's. A drag owns the
   * five elements for as long as it is held — it is drawing candidate positions the store has
   * not been told about yet, and `endDrag` puts the store's own answer back the moment the hand
   * lets go. No dependency list: what this paints is read out of the store, so it has to run
   * whenever anything renders this strip, and it is five style writes.
   */
  useLayoutEffect(() => {
    if (drag.held() === null) syncOverlay();
  });

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
      {/* The strip itself, under everything else it draws: a press that hit no handle and no
          region used to begin no gesture at all, so most of a short loop's strip answered a
          drag with silence — the one thing 0147 took away from the peaks and left standing
          here. It sweeps a loop from the press to the release, exactly as the peaks a row
          below do. A press too short to be a drag still commits nothing, and that stays
          visible rather than silent: the overlay does not move either (0147). */}
      <div
        className="absolute inset-0"
        onPointerDown={onDownSweep}
        aria-label={`${yardLabel(deck)} Loop Strip`}
      />
      <div
        ref={regionRef}
        className="absolute inset-y-0 cursor-grab bg-loop/25"
        style={HIDDEN}
        onPointerDown={onDownRegion}
        aria-label={`${yardLabel(deck)} Loop Region`}
      />
      <div
        ref={inRef}
        className="absolute inset-y-0 flex w-8 -translate-x-full cursor-ew-resize items-center justify-center bg-loop type-eyebrow text-loop-foreground"
        style={HIDDEN}
        onPointerDown={onDownIn}
        aria-label={`${yardLabel(deck)} Loop In`}
      >
        In
      </div>
      <div
        ref={outRef}
        className="absolute inset-y-0 flex w-8 cursor-ew-resize items-center justify-center bg-loop type-eyebrow text-loop-foreground"
        style={HIDDEN}
        onPointerDown={onDownOut}
        aria-label={`${yardLabel(deck)} Loop Out`}
      >
        Out
      </div>
      {/* The two boundaries, drawn where they actually are: each line takes the same left the
          handle above it took, so the strip and the peaks state one position rather than two. */}
      <div ref={lineInRef} className={LINE} style={HIDDEN} data-slot="loop-line-in" />
      <div ref={lineOutRef} className={LINE} style={HIDDEN} data-slot="loop-line-out" />
    </div>
  );
}
