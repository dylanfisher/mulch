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
});
