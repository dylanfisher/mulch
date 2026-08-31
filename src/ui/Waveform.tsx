/**
 * @role One deck's buffer, drawn: peaks on a canvas a gesture seeks in or sweeps a loop on, the
 *   loop's handle strip above them, and a playhead and meter moved from refs at frame rate. One
 *   rule and no modifier: the release decides, and a gesture that swept a loop sends `deck.loop`
 *   from the press to the release while every other one sends `deck.seek` where the press landed
 *   (0147) — the same `deck.seek`, `deck.loop` or `deck.load` a button and a JSONL line send, so
 *   ./scripts/drive reaches every one of them (docs/plan.md §4).
 * @instead The loop's own gestures → src/ui/LoopHandles.tsx. The per-frame values → peek() on
 *   src/app/facade.ts. Seconds-to-pixels maths → src/lib/timeline.ts. The frame loop itself →
 *   src/ui/frame.ts.
 */
// Over the soft cap and well under the hard one: the peaks, the handle strip over them and the
// per-frame playhead and meter share one canvas and one gesture, and the release is what decides
// between a seek and a sweep — one rule that has to be read in one place (0147). See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

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
import { deckRate } from "@/audio/params";
import { toneOf } from "@/lib/source";
import { snapLoop, SNAP_TOLERANCE_PX } from "@/lib/analysis";
import {
  MIN_DRAG_PX,
  offsetPx,
  pxSpanToSecs,
  pxToSecs,
  secsToPx,
  seekTarget,
  spanLoop,
} from "@/lib/timeline";
import type { DeckId, DeckState } from "@/state/store";
import { Toggle } from "@/ui/components/toggle";
import { ToneScope } from "@/ui/ToneScope";
import { useFileDrop } from "@/ui/fileDrop";
import { bedGround } from "@/lib/playerBed";
import { useOnFrame } from "@/ui/frame";
import { track, type Tracked, usePointerGesture } from "@/ui/gesture";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
import { LoopHandles } from "@/ui/LoopHandles";
import { pct, usePeakCanvas } from "@/ui/peakCanvas";
import type { Loop } from "@/lib/timeline";
// oxlint-enable import/max-dependencies

/** The sweep preview's resting state: drawn only while a gesture is drawing it. */
const HIDDEN: CSSProperties = { display: "none" };

/**
 * One gesture on the peaks. `downSecs` is where the press landed and `current` where the pointer
 * is now; the loop is the pair either way round, so a sweep leftwards is the same loop as a
 * sweep rightwards. A gesture that never asked for a loop seeks to `downSecs` instead.
 */
type Sweep = Tracked & {
  pointerId: number;
  downSecs: number;
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
  /** The spark's own read position: a second cursor on the same peaks, in the quieter ink, drawn
   *  only while the landing the clock is inside threw one. The same ref and the same frame, never
   *  a second loop (§2), and never a second playhead — the deck's read head is the landing's,
   *  which is why a spark rides that landing's entry at all (0166, 0175). */
  const sparkRef = useRef<HTMLDivElement>(null);
  /** Where the loop is actually being read, when the mulcher has moved it off the ground the
   *  handles are on: the same span at the same length, some number of the loop's own sixteenths
   *  along — a whole bed of them, or any part of one since the crawl (0183, 0185). A
   *  third thing written from the one frame and never a second loop — the durable loop keeps the
   *  overlay it has, and this says where that loop is standing right now
   *  ([0103](../../docs/decisions/0103-the-loop-overlay-has-one-writer.md) untouched, since the
   *  fact it is about is the loop and this one is about the pattern). */
  const bedRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  /** The sweep in flight, and the draft loop it draws — refs, never state (§2). */
  const previewRef = useRef<HTMLDivElement>(null);
  /**
   * A sweep the browser ended — the peaks detached or their capture taken, a button let go
   * outside the window — commits nothing, and the draft it was painting comes off the peaks:
   * nothing declarative can put it back (0114).
   */
  const hidePreview = useCallback(() => {
    if (previewRef.current !== null) previewRef.current.style.display = "none";
  }, []);
  const sweep = usePointerGesture<Sweep>(hidePreview);
  /**
   * Whether this deck's loop edges land on onset candidates. A view preference, not session
   * state: it is how this person is dragging right now, so it is no more durable than the
   * automation workspace's Option-hold arming (0025). Off until it is asked for: an edge pulled
   * up to `SNAP_TOLERANCE_PX` onto a candidate nothing on this page draws is a loop landing
   * where the analysis wanted rather than where the hand let go (0147).
   */
  const [snapping, setSnapping] = useState(false);
  /** Dropping a file here is the picker's load reached the other way — the same `deck.load`. */
  const drop = useFileDrop(onFile);
  const analysis = state.analysis;
  /**
   * The tempo as it is actually heard. Analysis measures the buffer, and the deck reads that
   * buffer at whatever speed and pitch ask for, so a source measured at 120 is 240 at 2× — the
   * number on screen is about what is playing, not about what was decoded (0031).
   */
  const bpm = analysis === null ? 0 : Math.round(analysis.bpm * deckRate(state.params));

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
    (active: Sweep, width: number): Loop => {
      const { in: lo, out: hi } = spanLoop(active.downSecs, active.current, state.duration);
      if (!snapping || analysis === null || analysis.onsets.length === 0)
        return { in: lo, out: hi };
      const tolerance = pxSpanToSecs(SNAP_TOLERANCE_PX, state.duration, width);
      return snapLoop(lo, hi, analysis.onsets, tolerance);
    },
    [snapping, analysis, state.duration],
  );

  /**
   * The loop this gesture is asking for, or null when it is asking for a seek instead. One
   * predicate, read by the draft and by the release alike, so what is painted while the button
   * is down is exactly what letting go commits (0147).
   *
   * Two things make it a loop and no modifier does: the pointer travelled far enough to be a
   * drag rather than a click, and the pair it drew is still a span after snapping — a drag out
   * and back, or one that ran off the same end of the buffer twice, has drawn no loop, and
   * `setLoop` reads a span of nothing as a clear that no drag ever meant. A tone has no
   * boundary to place, so its peaks ask for nothing but a seek (0110).
   */
  const asked = useCallback(
    (active: Sweep, width: number): Loop | null => {
      if (tone !== null || !active.moved) return null;
      const next = swept(active, width);
      return next.out - next.in < pxSpanToSecs(MIN_DRAG_PX, state.duration, width) ? null : next;
    },
    [tone, swept, state.duration],
  );

  /**
   * A press on the peaks commits nothing at all — it starts the one gesture the release then
   * reads. It used to send the seek here and read `event.shiftKey` here, which is why pressing
   * before the modifier and pressing after it were two different gestures with one look, one of
   * them destructive of the playhead (0147).
   */
  const onPress = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || state.duration === 0) return;
      const root = event.currentTarget;
      const at = axis(root, event.clientX);
      sweep.begin(root, event, {
        pointerId: event.pointerId,
        downClientX: event.clientX,
        downSecs: at,
        current: at,
        moved: false,
      });
    },
    [axis, sweep, state.duration],
  );

  const onSweepMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = sweep.matched(event);
      if (active === null) return;
      const root = event.currentTarget;
      track(active, event.clientX, axis(root, event.clientX));
      // The draft ahead of the store, exactly what a release would commit — the strip below
      // still shows the loop that is actually set until this gesture replaces it. A gesture
      // asking for a seek paints none, and one that stops asking takes its own back down, so
      // the surface says which of the two letting go now would be.
      const next = asked(active, root.clientWidth);
      if (next === null) {
        hidePreview();
        return;
      }
      const preview = previewRef.current;
      if (preview === null) return;
      preview.style.display = "";
      preview.style.left = pct(next.in, state.duration);
      preview.style.width = pct(next.out - next.in, state.duration);
    },
    [asked, axis, hidePreview, sweep, state.duration],
  );

  /** Ends the sweep; `send` says whether it commits (pointerup) or abandons (pointercancel). */
  const endSweep = useCallback(
    (event: PointerEvent<HTMLDivElement>, send: boolean) => {
      const active = sweep.ended(event);
      if (active === null) return;
      // Unconditionally: a preview left on screen would outlive the gesture that drew it.
      hidePreview();
      // A release nobody saw says where nothing landed, so it commits neither of the two (0114).
      if (!send) return;
      // The release's own position, into the record the moves wrote to: the last pixels of a
      // sweep reach the page in the `pointerup` alone whenever the browser coalesced the moves
      // of that frame, and a sweep read from the moves only ends where the pointer had been.
      const root = event.currentTarget;
      track(active, event.clientX, axis(root, event.clientX));
      // One command per gesture, on release, and always one of the two: the loop this gesture
      // drew, or — for every gesture that drew none — the seek the press asked for, which is
      // where the hand went down rather than where a click's own few pixels of travel ended. A
      // point the loop does not cover asks for the top of it (0041). The surface answers every
      // release it sees, so a gesture too short to be a loop is never a dead surface (0147).
      const next = asked(active, root.clientWidth);
      if (next !== null) {
        instrument.send({ t: "deck.loop", deck, in: next.in, out: next.out });
        return;
      }
      const target = seekTarget(active.downSecs, state.loop, state.duration);
      if (target !== null) instrument.send({ t: "deck.seek", deck, position: target });
    },
    [instrument, deck, asked, axis, hidePreview, sweep, state.duration, state.loop],
  );
  const onSweepUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endSweep(event, true);
    },
    [endSweep],
  );
  /** The browser saying the sweep never happened: nothing committed, and the draft comes off. */
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
    const cursor = sparkRef.current;
    const spark = at.player.sparkPosition;
    if (cursor !== null) {
      // Off the peaks entirely where there is none to show, rather than parked at zero: a cursor
      // standing still at the left edge is a spark the instrument is claiming to play.
      cursor.style.display = spark === null ? "none" : "";
      if (spark !== null) {
        cursor.style.transform = `translateX(${secsToPx(spark, state.duration, widthRef.current)}px)`;
      }
    }
    const ground = bedRef.current;
    if (ground !== null) {
      // Hidden on bed zero as well as on a deck with no loop or no pattern: bed zero *is* the
      // loop, and a second rectangle drawn exactly over the first says a move happened when none
      // did (the argument the spark's cursor is hidden on).
      const loop = state.loop;
      const bed = at.player.step?.bed;
      const span = loop === null ? 0 : loop.out - loop.in;
      // Resolved off the one function the two surfaces outside the transport share: this picture
      // and the plant on the jumps card read one arithmetic, so the rectangle cannot say a ground
      // the press would not write (principle 1, `bedGround`, src/lib/playerBed.ts). The transport
      // keeps its own, on a grid it folded once for the whole pass (`bedStart`, src/audio/player.ts).
      const stood =
        loop === null || bed === undefined ? null : bedGround(loop.in, span, state.duration, bed);
      ground.style.display = stood === null || stood.on === 0 ? "none" : "";
      if (stood !== null && stood.on !== 0) {
        ground.style.left = `${(100 * stood.in) / state.duration}%`;
        ground.style.width = `${(100 * span) / state.duration}%`;
      }
    }
    const meter = meterRef.current;
    if (meter !== null) meter.style.transform = `scaleX(${Math.min(1, at.meter)})`;
  }, [instrument, deck, state.duration, state.loop, widthRef]);

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
      {/* A tone is a wave with no beginning: it loads looped over the whole of its one second,
          and there is no boundary on it to place, so the strip that places one is not drawn and
          a drag on the peaks below is a seek like any other press (0110). */}
      {tone === null && (
        <LoopHandles instrument={instrument} deck={deck} state={state} snapping={snapping} />
      )}
      <div
        ref={rootRef}
        className="relative h-peaks w-full touch-none border border-border select-none data-[dropping=true]:border-primary data-[dropping=true]:bg-primary/10"
        onPointerDown={onPress}
        onPointerMove={onSweepMove}
        onPointerUp={onSweepUp}
        onPointerCancel={onSweepCancel}
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
            playing={state.playing}
            paused={state.paused}
          />
        )}
        {/* Under the sweep and under the playheads, because it is where a thing is rather than a
            thing a hand is doing: the loop's own ink at a quieter level, so it reads as the loop
            somewhere else and never as a second loop (0183). */}
        <div
          ref={bedRef}
          data-slot="loop-bed"
          className="pointer-events-none absolute inset-y-0 bg-loop/15"
          style={HIDDEN}
        />
        <div
          ref={previewRef}
          data-slot="loop-sweep"
          className="pointer-events-none absolute inset-y-0 bg-loop/25"
          style={HIDDEN}
        />
        {(state.playing || state.paused !== null) && (
          <>
            <div
              ref={playheadRef}
              data-slot="playhead"
              className="absolute inset-y-0 left-0 w-px bg-foreground"
            />
            {/* The quieter read drawn in the quieter ink: `muted-foreground` and not the
                playhead's own, so which of the two the pattern is standing on is legible at a
                glance rather than a matter of which one moved (0175). Hidden until a frame says
                where it is. */}
            <div
              ref={sparkRef}
              data-slot="spark-playhead"
              className="absolute inset-y-0 left-0 w-px bg-muted-foreground"
              style={HIDDEN}
            />
          </>
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
            advertises stands on its own: only the tempo half waits for analysis (0147). */}
        <span className="type-readout text-muted-foreground">
          {analysis === null
            ? "not analysed · drag to loop"
            : `${analysis.bpm > 0 ? `${bpm} bpm` : "no tempo"} · ${analysis.onsets.length} onsets · drag to loop`}
        </span>
      </div>
    </div>
  );
}
