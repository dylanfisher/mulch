/**
 * @role Tests the session's once-a-frame read of the master bus: that a frame asks the facade once
 *   however many surfaces want the answer, and that two sessions are never handed each other's.
 */
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { masterHeard } from "@/ui/masterHeard";

describe("masterHeard", () => {
  /**
   * P167: the meter has always read the bus once a frame; now every open drift does too, and two
   * yards side by side are two more askers — each one a pair of analyser fetches and three scans of
   * each window, for a question that cannot move inside one frame (0218).
   */
  it("asks the facade once a frame however many surfaces ask it", () => {
    const instrument = createInstrument(manualClock());
    const peek = vi.spyOn(instrument, "masterPeek");
    // The stamp does not move outside the loop's own tick, so these three are one frame's worth of
    // askers: the meter and two open pictures.
    const first = masterHeard(instrument);
    expect(masterHeard(instrument)).toBe(first);
    expect(masterHeard(instrument)).toBe(first);
    expect(peek).toHaveBeenCalledTimes(1);
    // And it is the facade's own object, handed straight back: the memo adds no allocation and no
    // copy — what it saves is the refill.
    expect(first).toBe(instrument.masterPeek());
  });

  it("never hands one session the other's window", () => {
    const one = createInstrument(manualClock());
    const other = createInstrument(manualClock());
    // A second instrument is a second output. Inside one frame each is still asked for its own,
    // because a picture of a session nobody is listening to is worse than a peek not saved.
    expect(masterHeard(one)).not.toBe(masterHeard(other));
    expect(masterHeard(one)).toBe(one.masterPeek());
  });
});
