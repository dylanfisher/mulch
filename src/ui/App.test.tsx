import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { App } from "@/ui/App";

/**
 * Both of the root's stores are read during render, and `useSyncExternalStore` throws
 * outright when a server snapshot is missing — so rendering the root without a DOM is the
 * cheapest check that neither the theme nor the route reads `window` on the way in.
 */
describe("App", () => {
  it("renders without a DOM", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup).toContain("primitives");
    expect(markup).toMatch(/data-active="true"[^>]*aria-label="Deck a \(active\)"/u);
    expect(markup).toMatch(/data-active="false"[^>]*aria-label="Deck b"/u);
  });
});
