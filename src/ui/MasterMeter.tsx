/**
 * @role The whole output at a glance: two thin bars, master left and right, and a clip indicator
 *   that latches until it is pressed.
 * @instead One yard's own level → the bar under its waveform in src/ui/Waveform.tsx, which reads
 *   that deck's mono meter off peek(). Nothing here sums decks: the bus has its own meter.
 */
import { type RefObject, useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import type { Instrument, MasterPeek } from "@/app/facade";
import { meterFraction } from "@/lib/range";
import { Button } from "@/ui/components/button";
import { onFrame } from "@/ui/frame";

/**
 * Full scale. The meter taps the bus input, before the limiter and the soft clip, so a level at
 * or above this is signal the output could not have carried unflattened — which is the whole of
 * what the indicator says.
 */
const CLIP_LEVEL = 1;

/** An empty bar, as the attribute the frame loop overwrites. Hoisted: a prop, not a new object. */
const EMPTY_BAR = { transform: "scaleX(0)" };

/**
 * Whether the clip indicator is lit after this frame. Latching is the whole behaviour: once a
 * peak has reached full scale the indicator stays on, however quiet the next frame is, because
 * the peak it is reporting is one nobody was watching for. Only a press puts it back.
 */
export function latchClip(latched: boolean, at: MasterPeek): boolean {
  return latched || at.left >= CLIP_LEVEL || at.right >= CLIP_LEVEL;
}

/**
 * How many silent frames the loop rides out before it lets go. The bus is not silent the instant
 * a transport stops — a delay's feedback keeps circulating and the limiter is still releasing —
 * so a meter gated on "some yard is playing" would blank itself over an audible output. Roughly
 * a tenth of a second at 60fps, after which an idle page is back to zero frames.
 */
const SETTLE_FRAMES = 8;

/**
 * The run of silent frames after this one. A playing yard never accumulates a run, anything still
 * audible resets it, and silence counts up; at `SETTLE_FRAMES` the loop stops.
 */
export function quietFrames(playing: boolean, fraction: number, quiet: number): number {
  if (playing || fraction > 0) return 0;
  return quiet + 1;
}

/** Paint one bar. Scale rather than width: a transform is the write that does not lay out. */
function fill(bar: HTMLSpanElement | null, fraction: number): void {
  if (bar !== null) bar.style.transform = `scaleX(${fraction})`;
}

/**
 * Whether anything is sounding — the one condition the frame loop runs under, so an idle page
 * runs zero frames. `playing` is written by the graph's own report, never on intent, so this
 * follows what is actually making noise.
 */
function useAnyDeckPlaying(instrument: Instrument): boolean {
  const read = useCallback(
    () => Object.values(instrument.state.getState().decks).some((deck) => deck.playing),
    [instrument],
  );
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

type Bars = {
  left: RefObject<HTMLSpanElement | null>;
  right: RefObject<HTMLSpanElement | null>;
  indicator: RefObject<HTMLSpanElement | null>;
};

/**
 * The whole per-frame side: three refs, one registration on the existing loop, and the writes it
 * makes straight into the DOM. Nothing here is React state and nothing here is a second RAF
 * (docs/plan.md §2).
 */
function useMasterPaint(instrument: Instrument, bars: Bars): () => void {
  const clipped = useRef(false);
  const playing = useAnyDeckPlaying(instrument);

  // The registration is written out rather than taken from `useOnFrame`, because the loop's own
  // last frame is what empties the bars: unregistering on `playing` alone and blanking them from
  // a layout effect races the tick still in flight, and leaves a bar standing over silence.
  useEffect(() => {
    let quiet = 0;
    let release = (): void => {};
    release = onFrame(() => {
      const at = instrument.masterPeek();
      const left = meterFraction(at.left);
      const right = meterFraction(at.right);
      fill(bars.left.current, left);
      fill(bars.right.current, right);
      if (!clipped.current && latchClip(false, at)) {
        clipped.current = true;
        if (bars.indicator.current !== null) bars.indicator.current.dataset.clipped = "true";
      }
      quiet = quietFrames(playing, Math.max(left, right), quiet);
      if (quiet >= SETTLE_FRAMES) release();
    });
    return () => {
      release();
    };
  }, [playing, instrument, bars]);

  // Clearing puts the ref back with the attribute: the latch is one fact in two places for one
  // frame at a time, and a press that reset only the paint would leave it permanently dark.
  return useCallback(() => {
    clipped.current = false;
    if (bars.indicator.current !== null) bars.indicator.current.dataset.clipped = "false";
  }, [bars]);
}

/**
 * One channel's track and the fill inside it. The fill is what the frame loop writes to. The
 * track runs left to right and the two of them stack, because a level is read the way it is
 * written — quiet at the start, full scale at the end (P51).
 */
function Bar({ channel, bar }: { channel: string; bar: RefObject<HTMLSpanElement | null> }) {
  return (
    <span className="relative block h-1 w-4 overflow-hidden rounded-xs bg-muted">
      <span
        ref={bar}
        data-slot="master-level"
        data-channel={channel}
        className="absolute inset-0 origin-left bg-primary"
        style={EMPTY_BAR}
      />
    </span>
  );
}

export function MasterMeter({ instrument }: { instrument: Instrument }) {
  const bars = useRef<Bars>({
    left: { current: null },
    right: { current: null },
    indicator: { current: null },
  }).current;
  const clear = useMasterPaint(instrument, bars);

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label="Master Level"
      title="Master level — press to clear the clip indicator"
      onClick={clear}
    >
      <span className="flex items-center gap-1">
        <span
          ref={bars.indicator}
          data-slot="master-clip"
          data-clipped="false"
          className="size-1.5 rounded-full bg-muted data-[clipped=true]:bg-destructive"
        />
        <span className="flex flex-col gap-0.5">
          <Bar channel="left" bar={bars.left} />
          <Bar channel="right" bar={bars.right} />
        </span>
      </span>
    </Button>
  );
}
