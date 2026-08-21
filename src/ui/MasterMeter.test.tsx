/** @role Tests the header meter's clip hold, and the two empty bars it renders at rest. */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import type { MasterPeek } from "@/app/facade";
import {
  CLIP_HOLD_MS,
  createClipHold,
  MasterMeter,
  quietFrames,
  SETTLE_FRAMES,
} from "@/ui/MasterMeter";

const markup = () =>
  renderToStaticMarkup(<MasterMeter instrument={createInstrument(manualClock())} />);

describe("MasterMeter", () => {
  it("renders one bar per channel, both empty, before anything plays", () => {
    const rendered = markup();
    expect(rendered).toContain('data-channel="left"');
    expect(rendered).toContain('data-channel="right"');
    // Horizontal: a bar fills along x from its left edge, so an empty one is scaleX(0) (P51).
    expect(rendered.match(/scaleX\(0\)/gu)).toHaveLength(2);
    expect(rendered).toContain("origin-left");
  });

  it("renders the clip indicator unlatched", () => {
    expect(markup()).toContain('data-clipped="false"');
  });
});

const QUIET = { left: 0, right: 0 };
const FULL_SCALE = { left: 1, right: 0 };

/**
 * The loop's own settle, run frame by frame the way `useMasterPaint` runs it. The hold is not part
 * of it and that is the point of measuring: a clip must not buy the loop another frame of life,
 * because the promise over `SETTLE_FRAMES` is that an idle page runs zero frames. Returns how many
 * frames the loop ran, or `over` if it never let go — the failure this exists to catch.
 */
function framesUntilSettled(peaks: readonly MasterPeek[], over = 600): number {
  let quiet = 0;
  for (let frame = 0; frame < over; frame += 1) {
    const at = peaks[frame] ?? QUIET;
    quiet = quietFrames(false, Math.max(at.left, at.right), quiet);
    if (quiet >= SETTLE_FRAMES) return frame + 1;
  }
  return over;
}

/** What the indicator was told to show, in order, so an unchanged frame is visible as silence. */
function shown() {
  const writes: boolean[] = [];
  const hold = createClipHold((lit) => {
    writes.push(lit);
  });
  return { writes, hold };
}

/** A hold is a thing that waits, so every describe of one runs on a clock a test can move. */
function fakeClock(): void {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
}

describe("createClipHold", () => {
  fakeClock();

  it("stays dark below full scale, and schedules nothing", () => {
    const { writes, hold } = shown();
    hold.clip({ left: 0.99, right: 0.5 });
    expect(writes).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lights on either channel reaching full scale, and stays lit inside the window", () => {
    const { writes, hold } = shown();
    hold.clip({ left: 0, right: 1.4 });
    expect(writes).toEqual([true]);
    vi.advanceTimersByTime(CLIP_HOLD_MS - 1);
    expect(writes).toEqual([true]);
  });

  it("goes dark once the window has run out", () => {
    const { writes, hold } = shown();
    hold.clip(FULL_SCALE);
    vi.advanceTimersByTime(CLIP_HOLD_MS);
    expect(writes).toEqual([true, false]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is re-lit by a later peak, for a window measured from that peak", () => {
    const { writes, hold } = shown();
    hold.clip(FULL_SCALE);
    vi.advanceTimersByTime(CLIP_HOLD_MS);
    hold.clip(FULL_SCALE);
    expect(writes).toEqual([true, false, true]);
    vi.advanceTimersByTime(CLIP_HOLD_MS - 1);
    expect(writes).toEqual([true, false, true]);
    vi.advanceTimersByTime(1);
    expect(writes).toEqual([true, false, true, false]);
  });
});

describe("a clip hold under frames and under the press", () => {
  fakeClock();

  /**
   * Clipping frames arrive at frame rate. The attribute is written on the edge only, and the one
   * timeout is re-armed rather than joined by a second — the hold runs from the last peak.
   */
  it("writes once and holds one timeout however many frames clip in a row", () => {
    const { writes, hold } = shown();
    for (let frame = 0; frame < 30; frame += 1) {
      hold.clip(FULL_SCALE);
      vi.advanceTimersByTime(16);
    }
    expect(writes).toEqual([true]);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(CLIP_HOLD_MS);
    expect(writes).toEqual([true, false]);
  });

  it("clears on the press, and takes the pending darken with it", () => {
    const { writes, hold } = shown();
    hold.clip(FULL_SCALE);
    hold.clear();
    expect(writes).toEqual([true, false]);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(CLIP_HOLD_MS * 2);
    expect(writes).toEqual([true, false]);
  });

  it("writes nothing on a press over an indicator already dark", () => {
    const { writes, hold } = shown();
    hold.clear();
    expect(writes).toEqual([]);
  });
});

describe("quietFrames", () => {
  it("never accumulates a run while a yard is playing", () => {
    expect(quietFrames(true, 0, 7)).toBe(0);
  });

  it("resets the run whenever the bus is still audible", () => {
    expect(quietFrames(false, 0.01, 7)).toBe(0);
  });

  it("counts up once nothing is playing and nothing is left sounding", () => {
    expect(quietFrames(false, 0, 0)).toBe(1);
    expect(quietFrames(false, 0, 7)).toBe(8);
  });
});

describe("the loop the meter runs in", () => {
  it("settles on an idle page in the frames it always did", () => {
    expect(framesUntilSettled([])).toBe(SETTLE_FRAMES);
  });

  /**
   * The hold darkens itself on its own timeout, so it never needs a frame: a page that clipped
   * settles on the same frame as one that never did. A hold that kept the loop alive to reach its
   * own end would run the meter for a couple of seconds over a silent page instead.
   */
  it("settles no later for a page that clipped than for one that never did", () => {
    expect(framesUntilSettled([FULL_SCALE])).toBe(framesUntilSettled([]) + 1);
  });
});
