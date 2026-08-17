/** @role Tests the header meter's clip latch, and the two empty bars it renders at rest. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { latchClip, MasterMeter, quietFrames } from "@/ui/MasterMeter";

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

describe("latchClip", () => {
  it("stays dark below full scale", () => {
    expect(latchClip(false, { left: 0.99, right: 0.5 })).toBe(false);
  });

  it("lights when either channel reaches full scale", () => {
    expect(latchClip(false, { left: 1, right: 0 })).toBe(true);
    expect(latchClip(false, { left: 0, right: 1.4 })).toBe(true);
  });

  it("stays lit once it has lit, however quiet the next frame is", () => {
    expect(latchClip(true, { left: 0, right: 0 })).toBe(true);
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
