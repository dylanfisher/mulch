/**
 * @role The whole output at a glance: two thin bars, master left and right, and a clip indicator
 *   that holds for a couple of seconds after the peak that lit it, and clears on a press.
 * @instead One yard's own level → the bar under its waveform in src/ui/Waveform.tsx, which reads
 *   that deck's mono meter off peek(). Nothing here sums decks: the bus has its own meter.
 */
import { type RefObject, useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import type { Instrument, MasterPeek } from "@/app/facade";
import { meterFraction } from "@/lib/range";
import { Button } from "@/ui/components/button";
import { onFrame } from "@/ui/frame";
import { MASTER_METER_LABEL, MASTER_METER_TOOLTIP } from "@/lib/copy";
import { Says } from "@/ui/Says";

/**
 * Full scale. The meter taps the bus input, before the limiter and the soft clip, so a level at
 * or above this is signal the output could not have carried unflattened — which is the whole of
 * what the indicator says.
 */
const CLIP_LEVEL = 1;

/** An empty bar, as the attribute the frame loop overwrites. Hoisted: a prop, not a new object. */
const EMPTY_BAR = { transform: "scaleX(0)" };

/**
 * How long the indicator stays lit after the peak that lit it. A latch existed because nobody is
 * watching the meter at the instant a peak arrives; a hold this long is seen just as reliably and
 * never reports a peak from a minute ago as if it were happening now (P56).
 */
export const CLIP_HOLD_MS = 2000;

/** The hold, as the two calls the meter makes into it. */
export type ClipHold = {
  /** Every frame, with that frame's peak: one at or above full scale lights it and restarts it. */
  clip(at: MasterPeek): void;
  /** The press, and the unmount: dark now, and nothing left scheduled. */
  clear(): void;
};

/**
 * The clip indicator's hold. The peak that lights it arms the one timeout that darkens it, and a
 * later peak re-arms that timeout rather than adding another — so nothing is scheduled while the
 * bus is under full scale, and nothing at all is scheduled per frame.
 *
 * The decay is deliberately not the frame loop's work. The loop exists only while something is
 * sounding and lets go `SETTLE_FRAMES` after it stops, which is a tenth of a second — far short of
 * the hold — so a decay written from the loop would have to keep the loop alive over a silent page
 * to reach the end of its own hold. That is per-frame cost bought for a fact that changes twice,
 * and it is the promise above `SETTLE_FRAMES` — an idle page runs zero frames — spent on nothing.
 */
export function createClipHold(show: (lit: boolean) => void, holdMs = CLIP_HOLD_MS): ClipHold {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lit = false;
  const disarm = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return {
    clip: (at) => {
      if (at.left < CLIP_LEVEL && at.right < CLIP_LEVEL) return;
      disarm();
      // Written once on the edge, not on every clipping frame: a paint writes what moved (0070).
      if (!lit) {
        lit = true;
        show(true);
      }
      timer = setTimeout(() => {
        timer = null;
        lit = false;
        show(false);
      }, holdMs);
    },
    clear: () => {
      disarm();
      if (!lit) return;
      lit = false;
      show(false);
    },
  };
}

/**
 * How many silent frames the loop rides out before it lets go. The bus is not silent the instant
 * a transport stops — a delay's feedback keeps circulating and the limiter is still releasing —
 * so a meter gated on "some yard is playing" would blank itself over an audible output. Roughly
 * a tenth of a second at 60fps, after which an idle page is back to zero frames.
 */
export const SETTLE_FRAMES = 8;

/**
 * The run of silent frames after this one. A playing yard never accumulates a run, anything still
 * audible resets it, and silence counts up; at `SETTLE_FRAMES` the loop stops.
 *
 * A lit clip indicator is deliberately not one of the reasons to keep going: the hold outlives the
 * loop by design and darkens itself on its own timeout, so a page that clipped once settles on the
 * same frame as a page that never did (P56).
 */
export function quietFrames(playing: boolean, fraction: number, quiet: number): number {
  if (playing || fraction > 0) return 0;
  return quiet + 1;
}

/** Paint one bar. Scale rather than width: a transform is the write that does not lay out. */
function fill(bar: HTMLSpanElement | null, fraction: number): void {
  if (bar !== null) bar.style.transform = `scaleX(${fraction})`;
}

/** Show the indicator lit or dark. The attribute is the one place the hold is visible. */
function light(indicator: HTMLSpanElement | null, clipped: boolean): void {
  if (indicator !== null) indicator.dataset.clipped = clipped ? "true" : "false";
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
  // The hold, held across renders and outliving the loop: the frame that sees a peak hands it
  // over and goes back to painting bars, and no per-frame state is kept for it (0070).
  const hold = useRef<ClipHold>(
    createClipHold((clipped) => {
      light(bars.indicator.current, clipped);
    }),
  ).current;
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
      hold.clip(at);
      quiet = quietFrames(playing, Math.max(left, right), quiet);
      if (quiet >= SETTLE_FRAMES) release();
    });
    return () => {
      release();
    };
  }, [playing, instrument, bars, hold]);

  // The hold outlives the loop but not the meter: an unmount takes the pending darken with it,
  // rather than leaving a timeout to write an attribute on a node nobody is looking at.
  useEffect(
    () => () => {
      hold.clear();
    },
    [hold],
  );

  // The press stays: a hold ends on its own, but someone who has seen the peak can end it now.
  // It takes the pending darken with it, so the hold it cut short cannot write over a later peak.
  return useCallback(() => {
    hold.clear();
  }, [hold]);
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
    <Says what={MASTER_METER_TOOLTIP}>
      <Button size="icon-sm" variant="ghost" aria-label={MASTER_METER_LABEL} onClick={clear}>
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
    </Says>
  );
}
