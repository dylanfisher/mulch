import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEV_ROUTE } from "@/ui/App";
import { DevPage } from "@/ui/dev/DevPage";

/**
 * The gallery is the only place every primitive is mounted at once, which makes rendering
 * it the cheapest check that a shadcn regeneration or a Base UI upgrade has not broken one.
 * Static markup, so it needs no DOM and no testing library.
 */
describe("DevPage", () => {
  const markup = renderToStaticMarkup(<DevPage />);

  it("renders every section", () => {
    for (const id of ["buttons", "toggles", "inputs", "knobs", "surfaces", "overlays"]) {
      expect(markup).toContain(`id="${id}"`);
    }
  });

  /** A bare `#buttons` is a route change: it leaves `#/dev`, and the gallery unmounts. */
  it("keeps every nav link on the dev route", () => {
    const hrefs = [...markup.matchAll(/href="([^"]*)"/gu)].map(([, href]) => href);
    expect(hrefs).not.toHaveLength(0);
    for (const href of hrefs) expect(href).toBe(DEV_ROUTE);
  });

  it("mounts the knob with its slider semantics", () => {
    expect(markup).toContain('role="slider"');
    expect(markup).toContain('aria-valuetext="35%"');
  });

  /** One thumb per value: a scalar `value` used to fall through to `[min, max]`. */
  it("gives the single-value slider one thumb and the range slider two", () => {
    const thumbs = markup.match(/data-slot="slider-thumb"/gu) ?? [];
    expect(thumbs).toHaveLength(3);
  });

  it("names the slider through the label it is pointed at", () => {
    expect(markup).toContain('aria-labelledby="gain-label"');
    expect(markup).not.toContain('for="gain"');
  });

  it("offers all three themes, on system until something is chosen", () => {
    for (const theme of ["light", "system", "dark"]) {
      expect(markup).toContain(`aria-label="${theme}"`);
    }
    expect(markup).toMatch(/aria-pressed="true"[^>]*aria-label="system"/u);
  });

  it("mounts the controls that carry state", () => {
    expect(markup).toContain('data-slot="switch"');
    expect(markup).toContain('data-slot="checkbox"');
    expect(markup).toContain('data-slot="slider"');
    expect(markup).toContain('data-slot="select-trigger"');
    expect(markup).toContain('data-slot="async-button"');
  });
});
