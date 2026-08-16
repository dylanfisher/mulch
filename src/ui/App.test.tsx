import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { App } from "@/ui/App";
import { INSTRUMENT_ROUTE } from "@/ui/routes";

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
    expect(markup).toContain(">view<");
    expect(markup).toContain("add deck");
    expect(markup).toMatch(/data-active="true"[^>]*aria-label="Deck a \(active\)"/u);
    expect(markup).toMatch(/data-active="false"[^>]*aria-label="Deck b"/u);
  });

  /** The header's routes are a menu now, not two anchors sitting beside the wordmark. */
  it("puts the routes behind a menubar trigger", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup).toContain('data-slot="menubar-trigger"');
    expect(markup).not.toContain("primitives →");
  });

  /** Home is where it already is: on the instrument the wordmark links nowhere. */
  it("leaves the wordmark inert on the instrument", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup).not.toContain(`href="${INSTRUMENT_ROUTE}"`);
  });

  it("renders the affordance that adds the first deck when the session holds none", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.remove", deck: "a" });
    const markup = renderToStaticMarkup(<App instrument={instrument} />);
    expect(markup).not.toContain('aria-label="Deck a');
    expect(markup).toContain("add deck");
  });
});
