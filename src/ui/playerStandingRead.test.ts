/**
 * @role The yard's once-a-frame read of what its pattern is standing at: that a card's forty-five
 *   dials cost one peek per frame rather than forty-five, that a new frame is a new read, and that
 *   two yards are never handed each other's voice (0218).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument, type Instrument } from "@/app/facade";
import { onFrame } from "@/ui/frame";
import { standingVoice } from "@/ui/playerStandingRead";

/** A frame the loop has asked for and nobody has run yet. */
let scheduled: FrameRequestCallback[] = [];
let offs: (() => void)[] = [];

/** One frame arriving, which is the only thing that moves the stamp the memo is keyed on. */
function raise(): void {
  const due = scheduled.shift();
  if (due === undefined) throw new Error("the loop asked for no frame.");
  due(0);
}

/** The loop, running: the memo is honest only for a caller on it, so a case has to be one. */
function running(): void {
  offs.push(onFrame(() => {}));
}

/**
 * A peek the case can count, standing at one number on the knob every case here reads.
 *
 * The reader touches `player.step.voice` of a peek and nothing else, so every case here stands in
 * with that much of one rather than building a whole `DeckPeek` of fields it does not read — which
 * is what each `no-unsafe-type-assertion` waiver below is for (0007).
 */
function counted(instrument: Instrument, distance: number) {
  // oxlint-disable-next-line no-unsafe-type-assertion
  return vi.spyOn(instrument, "peek").mockReturnValue({
    player: { step: { voice: { distance } } },
  } as unknown as ReturnType<Instrument["peek"]>);
}

beforeEach(() => {
  scheduled = [];
  offs = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    scheduled.push(callback);
    return scheduled.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  for (const off of offs) off();
  vi.restoreAllMocks();
});

// Five cases, each of which has to stand a loop up and mock a peek before it can ask anything —
// the setup is the memo's own contract and does not factor out.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("standingVoice", () => {
  it("peeks once a frame however many dials read it (0218)", () => {
    const instrument = createInstrument(manualClock());
    const peek = counted(instrument, 3);
    running();
    raise();
    const read = standingVoice(instrument, "a");
    expect(read("distance")).toBe(3);
    expect(read("distance")).toBe(3);
    expect(read("bias")).toBeNull();
    // A card the render rebuilt mid-frame finds the frame already read rather than taking it again.
    expect(standingVoice(instrument, "a")("distance")).toBe(3);
    expect(peek).toHaveBeenCalledTimes(1);
  });

  it("takes the read again on the next frame, so a dial is never a frame behind twice", () => {
    const instrument = createInstrument(manualClock());
    const peek = counted(instrument, 1);
    running();
    raise();
    const read = standingVoice(instrument, "a");
    expect(read("distance")).toBe(1);
    // oxlint-disable-next-line no-unsafe-type-assertion
    peek.mockReturnValue({
      player: { step: { voice: { distance: 9 } } },
    } as unknown as ReturnType<Instrument["peek"]>);
    expect(read("distance")).toBe(1);
    raise();
    expect(read("distance")).toBe(9);
    expect(peek).toHaveBeenCalledTimes(2);
  });

  it("keeps one answer per yard, because the read belongs to the deck and not to the asker", () => {
    const instrument = createInstrument(manualClock());
    vi.spyOn(instrument, "peek").mockImplementation(
      (deck) =>
        // oxlint-disable-next-line no-unsafe-type-assertion
        ({
          player: { step: { voice: { distance: deck === "a" ? 1 : 2 } } },
        }) as unknown as ReturnType<Instrument["peek"]>,
    );
    running();
    raise();
    expect(standingVoice(instrument, "a")("distance")).toBe(1);
    expect(standingVoice(instrument, "b")("distance")).toBe(2);
  });

  it("reads a yard standing in no part as null rather than as a number of its own", () => {
    const instrument = createInstrument(manualClock());
    // oxlint-disable-next-line no-unsafe-type-assertion
    vi.spyOn(instrument, "peek").mockReturnValue({
      player: { step: null },
    } as unknown as ReturnType<Instrument["peek"]>);
    running();
    raise();
    expect(standingVoice(instrument, "a")("distance")).toBeNull();
  });

  it("throws for a yard the session has removed rather than answering the frame before", () => {
    const instrument = createInstrument(manualClock());
    counted(instrument, 4);
    running();
    raise();
    expect(standingVoice(instrument, "a")("distance")).toBe(4);
    vi.spyOn(instrument, "peek").mockImplementation(() => {
      throw new Error("no such deck: a");
    });
    raise();
    // Marked read only after the peek returns: a read that had claimed the frame first would
    // answer the forty-four dials after it with a hole rather than with the error (principle 5).
    expect(() => standingVoice(instrument, "a")("distance")).toThrow(/no such deck/u);
    expect(() => standingVoice(instrument, "a")("distance")).toThrow(/no such deck/u);
  });
});
