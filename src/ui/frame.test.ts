/**
 * @role The one loop's own contract, which every surface above it mocks away: it starts with its
 *   first subscriber and stops with its last, it leaves exactly one frame scheduled however a
 *   callback rearranges the set from inside the tick it is running in, and it reads no clock at
 *   all while nothing is measuring.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { frameCostMs, measureFrameCost, onFrame } from "@/ui/frame";

/** A frame the loop has asked for and nobody has run yet, under the id it can cancel it by. */
type Scheduled = { id: number; run: FrameRequestCallback };

let scheduled: Scheduled[] = [];
let nextId = 0;
/** Every subscription a test took, so the module's own set is empty again before the next one. */
let offs: (() => void)[] = [];

/** `onFrame`, with the unsubscribe kept for the teardown rather than for the test to remember. */
function subscribe(callback: () => void): void {
  offs.push(onFrame(callback));
}

/** One frame arriving: the browser runs the oldest callback it was handed, and only that one. */
function raise(): void {
  const due = scheduled.shift();
  if (due === undefined) throw new Error("the loop asked for no frame.");
  due.run(0);
}

beforeEach(() => {
  scheduled = [];
  nextId = 0;
  offs = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    nextId += 1;
    scheduled.push({ id: nextId, run: callback });
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    scheduled = scheduled.filter((frame) => frame.id !== id);
  });
});

afterEach(() => {
  for (const off of offs) off();
  measureFrameCost(false);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// One case per claim the loop makes about itself; the length tracks how many of those there are.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the one frame loop", () => {
  it("runs on one frame for any number of subscribers, and stops with the last of them", () => {
    const first = vi.fn(() => {});
    const second = vi.fn(() => {});
    const offFirst = onFrame(first);
    const offSecond = onFrame(second);
    // One loop, not one per subscriber: the second registration rides the frame already asked for.
    expect(scheduled).toHaveLength(1);
    raise();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    // Something still to run, so the tick asked for the next frame itself.
    expect(scheduled).toHaveLength(1);

    offFirst();
    expect(scheduled).toHaveLength(1);
    offSecond();
    // An idle page runs zero frames: the frame nobody is left to use is given back.
    expect(scheduled).toEqual([]);
  });

  it("leaves one frame scheduled by a tick that resubscribed from inside itself", () => {
    const next = vi.fn(() => {});
    let own: (() => void) | null = null;
    own = onFrame(() => {
      own?.();
      subscribe(next);
    });
    raise();
    // The frame that has already fired is not a frame that is still scheduled. A tick that says
    // otherwise leaves the frame taken out inside it uncancellable and asks for a second one on
    // top, and from there every callback runs twice a frame for as long as the page is open.
    expect(scheduled).toHaveLength(1);
    raise();
    expect(scheduled).toHaveLength(1);
  });

  it("reads no clock at all while nothing is measuring", () => {
    const now = vi.spyOn(performance, "now");
    subscribe(() => {});
    raise();
    expect(now).not.toHaveBeenCalled();
    expect(frameCostMs()).toBe(0);
  });

  it("reports what the last measured frame cost, and clears it when measuring stops", () => {
    vi.spyOn(performance, "now").mockReturnValueOnce(5).mockReturnValueOnce(12);
    measureFrameCost(true);
    subscribe(() => {});
    raise();
    expect(frameCostMs()).toBe(7);
    // Stopped, the number goes away rather than sitting there as a stale reading of a loop
    // nobody is timing any more.
    measureFrameCost(false);
    expect(frameCostMs()).toBe(0);
  });
});
