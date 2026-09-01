import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INSTRUMENT_ROUTE, routeOf, SKETCH_ROUTE } from "@/ui/routes";
import { SKETCH_BLENDS } from "@/ui/sketch/sketchBlends";
import { SKETCH_PARTS_LIST, SKETCH_SURFACES, SketchPage } from "@/ui/sketch/SketchPage";
import { SKETCH_BEDS, SKETCH_CAST } from "@/ui/sketch/sketchWalk";

/**
 * The bench is two lists of arguments drawn out of the same primitives the instrument is, so
 * rendering it is the cheapest check that none of them has gone stale against a token, a type
 * utility or a shadcn regeneration. Static markup, so it needs no DOM.
 */
const markup = renderToStaticMarkup(<SketchPage />);

/**
 * One picture of the bench, bounded by its own close so a neighbour cannot answer for it. A
 * picture that drew nothing at all leaves `indexOf` at -1, and a slice from there is every later
 * sketch's markup rather than nothing — which is exactly how an unlabelled picture passes.
 */
function pictureOf(attribute: string): string {
  const opens = markup.indexOf(attribute);
  expect(opens, `${attribute} is not mounted`).not.toBe(-1);
  const closes = markup.indexOf("</svg>", opens);
  expect(closes, `${attribute} draws no picture`).toBeGreaterThan(opens);
  return markup.slice(opens, closes);
}

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
  /**
   * Off the two lists and never off a list written out here: an entry's id is its identity (0247),
   * so a sketch added without an entry — or an entry that renders no section — has to fail rather
   * than pass because the count in a test still matches (0254).
   */
  it("mounts every entry of both benches", () => {
    const entries = [...SKETCH_SURFACES, ...SKETCH_PARTS_LIST];
    expect(SKETCH_SURFACES).not.toHaveLength(0);
    expect(SKETCH_PARTS_LIST).not.toHaveLength(0);
    for (const entry of entries) {
      expect(markup, `${entry.id} has an entry and no section`).toContain(`id="${entry.id}"`);
      expect(markup, `${entry.id} has an entry and no nav link`).toContain(
        `data-section="${entry.id}"`,
      );
    }
    // One id apiece across both lists: the nav scrolls to `getElementById`, so a repeat would
    // silently take a hand to the first of the two.
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
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
      const picture = pictureOf(`data-blend="${blend.key}"`);
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
    const machine = pictureOf('data-machine="chipper"');
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
    const machine = pictureOf('data-machine="chipper"');
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

  /**
   * And the import list is where the store read would be. `scripts/arch` lets any `src/ui` file
   * import `src/state`, `src/app` and `src/audio` — which is right for the tier and wrong for this
   * one directory, where 0247 forbids a wire outright — so the narrower rule is stated here, over
   * the whole tree including the parts (0254).
   */
  it("imports no store, no command and no graph anywhere on the bench", () => {
    const root = import.meta.dirname;
    const files = readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) =>
      entry.isFile(),
    );
    expect(files.length, "the bench has no files to read").toBeGreaterThan(1);
    for (const file of files) {
      const held = join(file.parentPath, file.name);
      const source = readFileSync(held, "utf8");
      // Every specifier, resolved, rather than the three aliases spelled out: a relative wire out
      // of the bench and up into the store — a shape this repo writes elsewhere — reads nothing
      // like the alias and would walk straight past a check on the alias alone. (Written without
      // an example path, because this case reads its own source and would find one.)
      for (const found of source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/gu)) {
        const spec = found[1] ?? "";
        const path = spec.startsWith("@/")
          ? spec.slice(2)
          : spec.startsWith(".")
            ? relative(join(root, "../.."), resolve(dirname(held), spec))
            : "";
        for (const tier of ["state", "app", "audio"]) {
          expect(path.startsWith(`${tier}/`), `${file.name} imports ${spec}`).toBe(false);
        }
      }
    }
  });
});
