/**
 * @role One deck's buffer, drawn: peaks on a canvas a press seeks in and a file drops onto, the
 *   loop's handle strip above them, and a playhead and meter moved from refs at frame rate. A
 *   press on the peaks is a seek and nothing else — the loop is shaped by its handles (0053) —
 *   and every gesture ends in the same `deck.seek` or `deck.load` a button and a JSONL line
 *   send, so ./scripts/drive reaches every one of them (docs/plan.md §4).
 * @instead The loop's own gestures → src/ui/LoopHandles.tsx. The per-frame values → peek() on
 *   src/app/facade.ts. Seconds-to-pixels maths → src/lib/timeline.ts. The frame loop itself →
 *   src/ui/frame.ts.
 */

import { type PointerEvent, useCallback, useLayoutEffect, useRef, useState } from "react";

import type { Instrument } from "@/app/facade";
import { playbackRate, pxToSecs, secsToPx, seekTarget } from "@/lib/timeline";
import type { DeckId, DeckState } from "@/state/store";
import { Toggle } from "@/ui/components/toggle";
import { useFileDrop } from "@/ui/fileDrop";
import { useOnFrame } from "@/ui/frame";
import { ACTION_ICONS } from "@/ui/icons";
import { LoopHandles } from "@/ui/LoopHandles";
import { usePeakCanvas } from "@/ui/peakCanvas";

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

  // Reading peaks during render is in step with the store by construction: a load writes
  // `source`, so the render this value changes on is a render that is already happening.
  // The canvas, its sizing and its repaints belong to the one painter a thumbnail shares.
  const { rootRef, canvasRef, widthRef } = usePeakCanvas(instrument.peaks(deck));

  // The toggle reports the state it is moving to, and snapping is this component's own view
  // preference, so the reported value is the whole update — nothing else can have changed it.
  const onSnap = useCallback((next: boolean) => {
    setSnapping(next);
  }, []);

  /**
   * A press on the peaks is a seek and only ever a seek — travel changes nothing, because a
   * loop is created by the loop button and shaped by its handles (0053). A point the loop does
   * not cover asks for nothing (0041).
   */
  const onSeek = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || state.duration === 0) return;
      const root = event.currentTarget;
      // clientLeft/clientWidth, not the bounding rect: the canvas and widthRef resolve against
      // the padding box, and the pointer must agree with what is drawn.
      const px = event.clientX - root.getBoundingClientRect().left - root.clientLeft;
      const at = seekTarget(
        pxToSecs(px, state.duration, root.clientWidth),
        state.loop,
        state.duration,
      );
      if (at !== null) instrument.send({ t: "deck.seek", deck, position: at });
    },
    [instrument, deck, state.duration, state.loop],
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
        className="relative h-24 w-full touch-none border border-border select-none data-[dropping=true]:border-primary data-[dropping=true]:bg-primary/10"
        onPointerDown={onSeek}
        {...drop}
      >
        <canvas
          ref={canvasRef}
          className="size-full text-muted-foreground"
          aria-label={`Deck ${deck} waveform`}
        />
        {(state.playing || state.paused !== null) && (
          <div ref={playheadRef} className="absolute inset-y-0 left-0 w-px bg-foreground" />
        )}
      </div>
      <div className="h-1 w-full bg-muted">
        <div ref={meterRef} className="h-full w-full origin-left scale-x-0 bg-primary" />
      </div>
      <div className="flex items-center gap-2">
        {/* Snapping is a state the strip is in, not a thing that happens once, so it is a
            Toggle and reports it as `aria-pressed` (P25). */}
        <Toggle
          size="sm"
          variant="outline"
          pressed={snapping}
          onPressedChange={onSnap}
          disabled={analysis === null}
          aria-label={`Snap deck ${deck} loops to beats`}
        >
          <ACTION_ICONS.snap data-icon="inline-start" />
          snap
        </Toggle>
        <span className="type-readout text-muted-foreground">
          {analysis === null
            ? "not analysed"
            : `${analysis.bpm > 0 ? `${bpm} bpm` : "no tempo"} · ${analysis.onsets.length} onsets · shift drag to override`}
        </span>
      </div>
    </div>
  );
}
