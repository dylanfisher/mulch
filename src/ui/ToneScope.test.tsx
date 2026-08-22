/**
 * The tone's picture as maths: what window of the source it holds, and that what it draws is the
 * generator's own sample and not a second idea of the same wave. The paint itself is a canvas
 * context, which these tests have no DOM for — what it puts on that canvas is `toneAt`, and that
 * is what is asserted here.
 */
import { describe, expect, it } from "vitest";

import { toneSample, TONE_REF_HZ } from "@/lib/waveform";
import { restingAt, toneAt, TONE_VIEW_CYCLES, toneWindowSecs } from "@/ui/ToneScope";

describe("the tone's live view", () => {
  it("holds the same few cycles of the reference, whatever rate it is read at", () => {
    // The buffer is TONE_REF_HZ and the pitch is the rate it is read at (0110), so the window is
    // the reference's cycles and what a lower pitch changes is how slowly it scrolls past.
    expect(toneWindowSecs()).toBeCloseTo(TONE_VIEW_CYCLES / TONE_REF_HZ, 12);
  });

  it("draws the generator's own sample at the phase that second carries", () => {
    for (const at of [0, 0.0007, 0.25, 3.5]) {
      expect(toneAt(at)).toBeCloseTo(toneSample(2 * Math.PI * TONE_REF_HZ * at), 12);
    }
  });

  /**
   * The picture moves with the read position and nothing else: two buffer seconds a fraction of a
   * cycle apart are visibly different waves, which is what makes a scrolling window a wave rather
   * than a still.
   */
  it("draws two phases a fraction of a cycle apart as different waves", () => {
    expect(Math.abs(toneAt(1 + 0.25 / TONE_REF_HZ) - toneAt(1))).toBeGreaterThan(0.1);
  });
});

/**
 * What repaints a picture nothing is animating. A yard that is not playing runs no frames, so the
 * only thing that can bring its wave back into step with where it is reading from is a commit —
 * and a commit repaints only when something it is keyed on has moved. A seek on a held yard moves
 * the read position and nothing else, which is exactly the input this exists for.
 */
describe("what a halted tone is drawn from", () => {
  it("moves when a held yard is seeked, and goes back to the top when it is stopped", () => {
    expect(restingAt(false, 1.25)).not.toBe(restingAt(false, 0.5));
    // Stopped is the top of the loop, not "wherever it was left": `deck.stop` clears the hold.
    expect(restingAt(false, null)).toBe(0);
    expect(restingAt(false, 1.25)).not.toBe(restingAt(false, null));
  });

  it("is nothing at all while it is playing, because then the frame loop owns the phase", () => {
    expect(restingAt(true, null)).toBeNull();
    // Including the one case a stale value would survive: paused is what it was before play.
    expect(restingAt(true, 1.25)).toBeNull();
  });
});
