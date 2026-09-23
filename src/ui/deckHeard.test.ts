/**
 * @role Tests a yard's once-a-frame read of the deck: one refill a frame however many callbacks on
 *   the loop ask, a fresh one for every ask off it, and never one yard's or one session's answer
 *   handed to another.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { deckHeard } from "@/ui/deckHeard";
import { inFrame, onFrame } from "@/ui/frame";

/** The one frame the loop has asked for and nobody has run yet. */
let due: FrameRequestCallback | null = null;
let offs: (() => void)[] = [];

/** One frame arriving, running every callback the loop holds. */
function raise(): void {
  const run = due;
  if (run === null) throw new Error("the loop asked for no frame.");
  due = null;
  run(0);
}

beforeEach(() => {
  offs = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    due = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    due = null;
  });
});

afterEach(() => {
  for (const off of offs) off();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deckHeard", () => {
  /**
   * Every automated dial on a yard peeked for itself, and a peek refills the deck's whole read: a
   * playing rack paid for one refill per dial per frame for an answer that cannot move inside one
   * (0218). Three callbacks on one frame are the dials of one rack.
   */
  it("refills a yard's read once a frame however many callbacks ask for it", () => {
    const instrument = createInstrument(manualClock());
    const peek = vi.spyOn(instrument, "peek");
    const heard: unknown[] = [];
    for (let dial = 0; dial < 3; dial += 1) {
      offs.push(
        onFrame(() => {
          heard.push(deckHeard(instrument, "a"));
        }),
      );
    }
    raise();
    expect(peek).toHaveBeenCalledTimes(1);
    // The facade's own object, handed straight back: the memo adds no copy.
    expect(new Set(heard)).toEqual(new Set([instrument.peek("a")]));
    raise();
    expect(peek).toHaveBeenCalledTimes(3);
  });

  it("asks afresh off the loop, where the frame it would reuse is not this one", () => {
    const instrument = createInstrument(manualClock());
    const peek = vi.spyOn(instrument, "peek");
    expect(inFrame()).toBe(false);
    deckHeard(instrument, "a");
    deckHeard(instrument, "a");
    expect(peek).toHaveBeenCalledTimes(2);
  });

  it("never hands one yard, or one session, another's read", () => {
    const one = createInstrument(manualClock());
    const other = createInstrument(manualClock());
    one.send({ t: "deck.add", deck: "b", emoji: "🌱", name: "Second Yard" });
    const heard: unknown[] = [];
    offs.push(
      onFrame(() => {
        heard.push(deckHeard(one, "a"), deckHeard(one, "b"), deckHeard(other, "a"));
      }),
    );
    raise();
    expect(new Set(heard).size).toBe(3);
  });
});
