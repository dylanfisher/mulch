import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Slider } from "@/ui/components/slider";

/**
 * The gallery covers the controlled cases; this covers the one it cannot mount, since a
 * specimen always passes a value. Base UI defaults an unset slider to the scalar `min`, so
 * the thumb count has to follow it — a second thumb would have no value behind it.
 */
const RANGE = [20, 80];

describe("Slider", () => {
  it("gives an uncontrolled slider one thumb", () => {
    const markup = renderToStaticMarkup(<Slider />);
    expect(markup.match(/data-slot="slider-thumb"/gu)).toHaveLength(1);
  });

  it("gives a range default two", () => {
    const markup = renderToStaticMarkup(<Slider defaultValue={RANGE} />);
    expect(markup.match(/data-slot="slider-thumb"/gu)).toHaveLength(2);
  });

  /**
   * The root is a `role="group"`; the control a pointer and a screen reader reach is the range
   * input inside the thumb, and a name on the group does not name it. Every thumb carries it, so a
   * range slider's two ends are one named control rather than two anonymous ones.
   */
  it("names the control inside the thumb, not only the group around it", () => {
    const markup = renderToStaticMarkup(<Slider defaultValue={RANGE} aria-label="Amount" />);
    expect(markup.match(/<input[^>]*aria-label="Amount"/gu)).toHaveLength(2);
  });
});
