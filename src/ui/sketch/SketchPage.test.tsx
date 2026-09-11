import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INSTRUMENT_ROUTE, routeOf, SKETCH_ROUTE } from "@/ui/routes";
import { SKETCH_DRIFTS, SKETCH_GROUNDS } from "@/ui/sketch/sketchEntries";
import { SketchPage } from "@/ui/sketch/SketchPage";

/**
 * The bench is a list of arguments drawn out of the same primitives the instrument is, so rendering
 * it is the cheapest check that none of them has gone stale against a token, a type utility or a
 * shadcn regeneration. Static markup, so it needs no DOM.
 */
const markup = renderToStaticMarkup(<SketchPage />);

/** The bench as one list, since every rule about an entry is a rule about all of them. */
const BENCH = [...SKETCH_GROUNDS, ...SKETCH_DRIFTS];

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
   * Off the list and never off a list written out here: an entry's id is its identity (0247), so a
   * sketch added without an entry — or an entry that renders no section — has to fail rather than
   * pass because the count in a test still matches (0254).
   */
  it("mounts every entry of the bench", () => {
    expect(SKETCH_GROUNDS).not.toHaveLength(0);
    expect(SKETCH_DRIFTS).not.toHaveLength(0);
    for (const entry of BENCH) {
      expect(markup, `${entry.id} has an entry and no section`).toContain(`id="${entry.id}"`);
      expect(markup, `${entry.id} has an entry and no nav link`).toContain(
        `data-section="${entry.id}"`,
      );
    }
    // One id apiece: the nav scrolls to `getElementById`, so a repeat would silently take a hand
    // to the first of the two.
    const ids = BENCH.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * A bench entry is an argument or it is wallpaper. Both sentences are written beside the drawing
   * they belong to, so an entry that cannot say what it gives up is the one to cut before it is
   * drawn — and an empty one would render a frame with a blank line under the heading.
   */
  it("carries a thesis and a trade for every entry, and draws both", () => {
    for (const entry of BENCH) {
      expect(entry.thesis.length, `${entry.id} argues nothing`).toBeGreaterThan(40);
      expect(entry.trades.length, `${entry.id} gives nothing up`).toBeGreaterThan(20);
      // Through the escaping the renderer does, so a thesis with an apostrophe in it is compared
      // against what the page actually holds rather than against the source string.
      expect(markup, `${entry.id} draws no thesis`).toContain(
        entry.thesis.slice(0, 40).replaceAll("'", "&#x27;"),
      );
    }
  });
});

describe("SketchPage is cleared of what it argued before", () => {
  /**
   * The thirteen that were here argued the whole card or one fold of it, the eight after them
   * argued how a song is played, the six after those argued how the ground moves, and three of
   * the drift's eight argued where the picture goes; all have been read and decided — the
   * arguments are in 0257–0259, the grid won and is the card's own section (0275), the
   * switchboard won and is the fold's own rows of words (0277), and the lattice, the warp and the
   * fold are the picture's own (0278) — and a
   * bench nobody clears stops being a bench (principle 6). Named here so a re-mount of one has to
   * say so.
   *
   * The last nine are the two benches that closed with the lattice block: the drift's own tenth
   * and eleventh, which argued a dial apiece and landed as one (0339, 0345), and the marks
   * bench's eight, whose route, page and directory went with the last of them (0247). The marks
   * bench's `bloom` is not here because the drift bench mounts a `bloom` of its own — the shipped
   * scene at entry 07 — and the case below is what holds that one down.
   */
  it("mounts none of the thirty-eight the bench was cleared of", () => {
    const cleared = [
      "cast",
      "score",
      "stack",
      "terrain",
      "rolls",
      "chipper",
      "chips",
      "part-walk",
      "part-ground",
      "part-arrange",
      "part-songs",
      "part-sound",
      "track",
      "hand",
      "wheel",
      "grid",
      "route",
      "spend",
      "spindle",
      "strip",
      "leash",
      "pad",
      "fence",
      "sentence",
      "switchboard",
      "tide",
      "lattice",
      "warp",
      "fold",
      "film",
      "glyph",
      "ground",
      "beat",
      "echoes",
      "decay",
      "part",
      "scatter",
      "rows",
    ];
    for (const gone of cleared) {
      expect(markup, `${gone} is still on the bench`).not.toContain(`id="${gone}"`);
      expect(markup, `${gone} is still in the nav`).not.toContain(`data-section="${gone}"`);
    }
  });

  /**
   * And the marks bench is gone whole, not cleared in place: its eight entries landed in the
   * painter one at a time and the last of them took the directory, the page, the route and the
   * menu item with it (0247). The ids cannot all be checked against this page's markup — `bloom`
   * is the drift bench's own entry 07 — so what is checked is that nothing of the bench is left
   * to mount: no file, and no hash that resolves anywhere but the instrument.
   */
  it("keeps no marks bench, no file for one and no route to one", () => {
    for (const file of [
      "src/ui/sketch/MarksPage.tsx",
      "src/ui/sketch/MarksPage.test.tsx",
      "src/ui/sketch/marks/sketchMarks.ts",
      "src/ui/sketch/drift/SketchDriftFilm.tsx",
      "src/ui/sketch/drift/SketchDriftGlyph.tsx",
    ]) {
      expect(existsSync(file), `${file} outlived the bench it was for`).toBe(false);
    }
    expect(routeOf("#/marks"), "the marks route still resolves").toBe("instrument");
  });
});

describe("SketchPage reads nothing it must not", () => {
  /**
   * The one thing a sketch must not do. `src/ui/sketch` reads no store and sends no command, so
   * nothing on the bench can be showing a real deck's numbers — which is checked here by the
   * import list rather than the markup, since a store read leaves no trace in static HTML.
   *
   * The switch this case also looked for went with the two sketches that drew one; the control the
   * bench still has is the throw's, and which picture it belongs to is checked where that picture
   * is (SketchGrounds.test.tsx).
   */
  it("is drawn out of the instrument's own controls", () => {
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
