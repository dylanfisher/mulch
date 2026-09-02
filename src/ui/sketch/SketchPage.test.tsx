import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PLAYER_SONGS_LABEL } from "@/lib/copySongs";
import { INSTRUMENT_ROUTE, routeOf, SKETCH_ROUTE } from "@/ui/routes";
import { SKETCH_GROUNDS, SKETCH_PLAYS, SketchPage } from "@/ui/sketch/SketchPage";

/**
 * The bench is a list of arguments drawn out of the same primitives the instrument is, so rendering
 * it is the cheapest check that none of them has gone stale against a token, a type utility or a
 * shadcn regeneration. Static markup, so it needs no DOM.
 */
const markup = renderToStaticMarkup(<SketchPage />);

/** Both benches as one list, since every rule about an entry is a rule about all of them: a second
 *  section mounted from its own list is still one bench, and a case written over one of the two
 *  would go quiet on whichever half it was not written over. */
const BENCH = [...SKETCH_GROUNDS, ...SKETCH_PLAYS];

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
  it("mounts every entry of both benches", () => {
    expect(SKETCH_GROUNDS).not.toHaveLength(0);
    expect(SKETCH_PLAYS).not.toHaveLength(0);
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

describe("SketchPage asks two questions and not one", () => {
  /**
   * The second bench is a section of its own under a rule of its own, and not eight more drawings
   * on the end of the first: the two ask different questions, and a reader who cannot see where one
   * ends is reading one bench of sixteen.
   */
  it("draws the second bench under its own heading and its own rule", () => {
    expect(markup, "the two benches are not ruled apart").toContain("<hr");
    const grounds = markup.indexOf(`id="${firstOf(SKETCH_GROUNDS)}"`);
    const rule = markup.indexOf("<hr");
    const plays = markup.indexOf(`id="${firstOf(SKETCH_PLAYS)}"`);
    expect(rule, "the rule falls before the first bench").toBeGreaterThan(grounds);
    expect(plays, "the second bench is not under the rule").toBeGreaterThan(rule);
    // Its own heading, in the word the tier is called by rather than in a second copy of it
    // (`PLAYER_SONGS_LABEL`, src/lib/copySongs.ts): a heading asserted as a literal is a copy
    // string declared twice, and it would go on passing after the word itself changed.
    expect(markup, "the second bench is unheaded").toMatch(
      new RegExp(`<h2[^>]*>${PLAYER_SONGS_LABEL}[^<]*<`, "u"),
    );
  });
});

/** The first entry's id of a list, which is where a section of the page begins. */
function firstOf(entries: readonly { id: string }[]): string {
  const first = entries[0];
  if (first === undefined) throw new Error("A bench with no entries mounts no section.");
  return first.id;
}

describe("SketchPage is cleared of what it argued before", () => {
  /**
   * The thirteen that were here argued the whole card or one fold of it,
   * they have been read and decided against, and their arguments are in 0257–0259 — a bench nobody
   * clears stops being a bench (principle 6). Named here so a re-mount of one has to say so.
   */
  it("mounts none of the thirteen the bench was cleared of", () => {
    const cleared = [
      "cast",
      "score",
      "sentence",
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
    ];
    for (const gone of cleared) {
      expect(markup, `${gone} is still on the bench`).not.toContain(`id="${gone}"`);
      expect(markup, `${gone} is still in the nav`).not.toContain(`data-section="${gone}"`);
    }
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
