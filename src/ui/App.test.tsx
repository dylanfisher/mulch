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
    const instrument = createInstrument(manualClock());
    // A fresh session is one deck; the second is one a person adds, and the screen lists as
    // many as the session holds rather than a fixed pair (0029).
    instrument.send({ t: "deck.add", deck: "b" });
    const markup = renderToStaticMarkup(<App instrument={instrument} />);
    expect(markup).toContain("primitives");
    expect(markup).toContain("add deck");
    expect(markup).toMatch(/data-active="true"[^>]*aria-label="Deck a \(active\)"/u);
    expect(markup).toMatch(/data-active="false"[^>]*aria-label="Deck b"/u);
  });

  it("renders the affordance that adds the first deck when the session holds none", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.remove", deck: "a" });
    const markup = renderToStaticMarkup(<App instrument={instrument} />);
    expect(markup).not.toContain('aria-label="Deck a');
    expect(markup).toContain("add deck");
  });
});
