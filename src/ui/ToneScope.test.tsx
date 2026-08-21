/**
 * The tone's picture as maths: what window of the source it holds, and that what it draws is the
 * generator's own sample and not a second idea of the same wave. The paint itself is a canvas
 * context, which these tests have no DOM for — what it puts on that canvas is `toneAt`, and that
 * is what is asserted here.
 */
import { describe, expect, it } from "vitest";

import { toneSample } from "@/lib/waveform";
import { restingAt, toneAt, TONE_VIEW_CYCLES, toneWindowSecs } from "@/ui/ToneScope";

describe("the tone's live view", () => {
  it("holds the same few cycles of the wave whatever the pitch is", () => {
    expect(toneWindowSecs(440)).toBeCloseTo(TONE_VIEW_CYCLES / 440, 12);
    expect(toneWindowSecs(40) / toneWindowSecs(400)).toBeCloseTo(10, 12);
    // A source with no pitch — noise, silence, nothing loaded — draws no window rather than an
    // infinite one: the picture is the tone's, and there is no tone (principle 5).
    expect(toneWindowSecs(0)).toBe(0);
  });

  it("draws the generator's own sample at the phase that second carries", () => {
    const hz = 440.25;
    for (const at of [0, 0.0007, 0.25, 3.5]) {
      expect(toneAt(hz, at)).toBeCloseTo(toneSample(2 * Math.PI * hz * at), 12);
    }
  });

  /**
   * The whole point of a fraction of a hertz reaching the picture: a second into the source, a
   * quarter of a hertz is a quarter of a turn of phase, which is a visibly different wave. A
   * drawing that rounded the pitch would draw the same picture for both.
   */
  it("draws a pitch a quarter of a hertz apart as a different wave", () => {
    expect(Math.abs(toneAt(440.25, 1) - toneAt(440, 1))).toBeGreaterThan(0.1);
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
