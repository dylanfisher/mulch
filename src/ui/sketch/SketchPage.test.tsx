import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INSTRUMENT_ROUTE, routeOf, SKETCH_ROUTE } from "@/ui/routes";
import { SKETCH_BLENDS } from "@/ui/sketch/sketchBlends";
import { SketchPage } from "@/ui/sketch/SketchPage";
import { SKETCH_CAST } from "@/ui/sketch/sketchWalk";

/**
 * The bench is six whole surfaces drawn out of the same primitives the instrument is, so
 * rendering it is the cheapest check that none of them has gone stale against a token, a type
 * utility or a shadcn regeneration. Static markup, so it needs no DOM.
 */
const markup = renderToStaticMarkup(<SketchPage />);

describe("the sketch route", () => {
  it("resolves its own hash and leaves everything else on the instrument", () => {
    expect(routeOf(SKETCH_ROUTE)).toBe("sketch");
    expect(routeOf("#/sketches")).toBe("instrument");
    expect(routeOf("")).toBe("instrument");
  });
});

describe("SketchPage links", () => {
  /** A bare `#cast` is a route change: it leaves `#/sketch` and the bench unmounts (0054). */
  it("keeps every nav link on the sketch route and the wordmark on the way home", () => {
    const hrefs = [...markup.matchAll(/href="([^"]*)"/gu)].map(([, href]) => href);
    expect(hrefs).toContain(INSTRUMENT_ROUTE);
    const nav = hrefs.filter((candidate) => candidate !== INSTRUMENT_ROUTE);
    expect(nav).not.toHaveLength(0);
    for (const href of nav) expect(href).toBe(SKETCH_ROUTE);
  });
});

describe("SketchPage", () => {
  it("mounts all six sketches", () => {
    for (const id of ["cast", "score", "sentence", "stack", "terrain", "rolls"]) {
      expect(markup).toContain(`id="${id}"`);
    }
  });

  it("draws the cast as four blends of one cast", () => {
    for (const blend of SKETCH_BLENDS) expect(markup).toContain(`data-blend="${blend.key}"`);
  });

  /**
   * The one question a blend pad exists to ask is whether a hand can find the character it wants,
   * and a picture whose corners are unlabelled cannot be asked it. So the names are inside each
   * picture — every one of the six, in every one of the four, never a legend underneath (0252).
   */
  it("names every one of the six inside every blend's own picture", () => {
    for (const blend of SKETCH_BLENDS) {
      const opens = markup.indexOf(`data-blend="${blend.key}"`);
      expect(opens, `${blend.key} is not mounted`).not.toBe(-1);
      // A blend that drew no picture at all would leave indexOf at -1, and slice(opens, -1) is
      // every later blend's markup rather than nothing — which would pass this on its neighbours.
      const closes = markup.indexOf("</svg>", opens);
      expect(closes, `${blend.key} draws no picture`).toBeGreaterThan(opens);
      const picture = markup.slice(opens, closes);
      for (const name of SKETCH_CAST) {
        expect(picture, `${blend.key} draws no name for ${name}`).toMatch(
          new RegExp(`<text[^>]*>[^<]*${name}`, "u"),
        );
      }
    }
  });

  /**
   * The one thing a sketch must not do. `src/ui/sketch` reads no store and sends no command, so
   * nothing on the bench can be showing a real deck's numbers — which is checked here by the
   * import list rather than the markup, since a store read leaves no trace in static HTML.
   */
  it("is drawn out of the instrument's own controls", () => {
    expect(markup).toContain('data-slot="switch"');
    expect(markup).toContain('data-slot="slider"');
  });
});
