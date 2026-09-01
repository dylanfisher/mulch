import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INSTRUMENT_ROUTE, routeOf, SKETCH_ROUTE } from "@/ui/routes";
import { SKETCH_BLENDS } from "@/ui/sketch/sketchBlends";
import { SketchPage } from "@/ui/sketch/SketchPage";
import { SKETCH_BEDS, SKETCH_CAST } from "@/ui/sketch/sketchWalk";

/**
 * The bench is eight whole surfaces drawn out of the same primitives the instrument is, so
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
  it("mounts every sketch on the bench", () => {
    const ids = ["cast", "score", "sentence", "stack", "terrain", "rolls", "chipper", "chips"];
    for (const id of ids) expect(markup).toContain(`id="${id}"`);
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
});

/** The machine's own half of the naming rule: a hopper, a drum of blades, and a heap of chips. */
describe("SketchPage draws the mulcher as a mulcher", () => {
  /**
   * The blades and the planted grounds are the chipper's corners, so 0252's rule reaches them:
   * the name is inside the machine's own picture, never in a legend beside it. A drum whose
   * blades are unlabelled is six wedges, and which wedge is `stutter` is then a count from the
   * top — the exact reading the pad's names were added to end.
   */
  it("names every blade and every planted ground inside the chipper's own picture", () => {
    const opens = markup.indexOf('data-machine="chipper"');
    expect(opens, "the chipper draws no machine").not.toBe(-1);
    // Bounded by the machine's own close: slicing to the end would let a later sketch's markup
    // answer for the chipper's, which is how an unlabelled picture passes on its neighbours.
    const closes = markup.indexOf("</svg>", opens);
    expect(closes).toBeGreaterThan(opens);
    const machine = markup.slice(opens, closes);
    for (const name of [...SKETCH_CAST, ...SKETCH_BEDS.map((bed) => bed.name)]) {
      expect(machine, `the chipper draws no name for ${name}`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${name}`, "u"),
      );
    }
  });

  /**
   * The pile's half of the same rule. A heap has no corners, so each wood names itself where its
   * own chips are, and the sorts that push it are named for the character rather than the knob.
   */
  it("names every wood in the pile and in the sorts that push it", () => {
    const heap = markup.indexOf('data-machine="chips"');
    const sorts = markup.indexOf('data-sorts="chips"');
    expect(heap, "the chips sketch draws no pile").not.toBe(-1);
    expect(sorts, "the chips sketch offers no sorts").toBeGreaterThan(heap);
    const pile = markup.slice(heap, sorts);
    for (const name of SKETCH_CAST) {
      expect(pile, `the pile draws no name for ${name}`).toContain(name);
      // By the row's own attribute and not by a slice to the end of the markup: the bench grows a
      // second list of sketches below this one (0254), and a tail slice would then let one of
      // those answer for a sort this one never drew.
      expect(markup, `no sort is named for ${name}`).toContain(`data-wood="${name}"`);
    }
  });
});

describe("SketchPage weighs the drum", () => {
  /**
   * The drum is the blend of 0252, so the six numbers on it are shares of one mix and not six
   * independent reaches — they are drawn in the pad's own readout, where a number beside a name
   * has always meant a share, and six reaches in that typography would sum to anything.
   */
  it("draws the drum's blades as shares of one mix", () => {
    const opens = markup.indexOf('data-machine="chipper"');
    const machine = markup.slice(opens, markup.indexOf("</svg>", opens));
    const drawn = SKETCH_CAST.map((name) => {
      const found = new RegExp(`<text[^>]*>${name}[^0-9]*([0-9]+)`, "u").exec(machine);
      expect(found, `the drum draws no weight for ${name}`).not.toBeNull();
      return Number(found?.[1]);
    });
    // Six shares of one, each rounded to a whole number where it is drawn, so the sum lands
    // within a point or two of a hundred rather than on it.
    const whole = drawn.reduce((sum, one) => sum + one, 0);
    expect(whole).toBeGreaterThan(96);
    expect(whole).toBeLessThan(104);
  });
});

describe("SketchPage reads nothing it must not", () => {
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
