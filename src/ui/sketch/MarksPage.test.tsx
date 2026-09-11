/**
 * The marks bench's own half of the naming rule (0252): the ways left to push the lattice of marks,
 * each on a canvas under its own dial, each naming what the dial stands at and drawn in the one
 * ink, and each saying where in the tile it would land — at a file that exists. In the shape
 * StructurePage.test.tsx took, because it is the same bench on its own route (0295, 0347).
 */
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INSTRUMENT_ROUTE, MARKS_ROUTE, routeOf, STRUCTURE_ROUTE } from "@/ui/routes";
import { INKING_STOPS } from "@/ui/sketch/SketchDriftStage";
import { MarksPage, SKETCH_MARKS } from "@/ui/sketch/MarksPage";

/** The whole bench, rendered once: every case here reads one stage out of the one markup. */
const markup = renderToStaticMarkup(<MarksPage />);

/** One stage of the bench, bounded by the next entry's section so a neighbour cannot answer for it. */
function stageOf(id: string, next: string | undefined): string {
  const opens = markup.indexOf(`data-drift="${id}"`);
  expect(opens, `${id} is not mounted`).not.toBe(-1);
  const closes = next === undefined ? markup.length : markup.indexOf(`id="${next}"`, opens);
  expect(closes, `${id} is not followed by ${next}`).toBeGreaterThan(opens);
  return markup.slice(opens, closes);
}

describe("the marks route", () => {
  it("resolves its own hash and leaves the structure bench and everything else where they were", () => {
    expect(routeOf(MARKS_ROUTE)).toBe("marks");
    expect(routeOf(STRUCTURE_ROUTE)).toBe("structure");
    expect(routeOf("#/mark")).toBe("instrument");
    expect(routeOf("")).toBe("instrument");
  });

  /** A bare `#beat` is a route change: it leaves `#/marks` and the bench unmounts (0054). */
  it("keeps every nav link on the marks route and the wordmark on the way home", () => {
    const hrefs = [...markup.matchAll(/href="([^"]*)"/gu)].map(([, href]) => href);
    expect(hrefs).toContain(INSTRUMENT_ROUTE);
    const nav = hrefs.filter((candidate) => candidate !== INSTRUMENT_ROUTE);
    expect(nav).not.toHaveLength(0);
    for (const href of nav) expect(href).toBe(MARKS_ROUTE);
  });
});

describe("MarksPage mounts the bench", () => {
  /** What is left of the eight the bench was asked for, and every one off the list (0254): an
   * entry goes as its argument lands in the tile — the ground's with 0348, the echoes' and the
   * bloom's with 0349, the rows' with 0350, the beat's with 0351. */
  it("mounts every entry, with one id apiece", () => {
    expect(SKETCH_MARKS.length).toBe(3);
    const landed = ["ground", "echoes", "bloom", "rows", "beat"];
    for (const gone of landed) {
      expect(
        SKETCH_MARKS.map((entry) => entry.id),
        `${gone} has landed`,
      ).not.toContain(gone);
    }
    for (const entry of SKETCH_MARKS) {
      expect(markup, `${entry.id} has an entry and no section`).toContain(`id="${entry.id}"`);
      expect(markup, `${entry.id} has an entry and no nav link`).toContain(
        `data-section="${entry.id}"`,
      );
    }
    const ids = SKETCH_MARKS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries a thesis and a trade for every entry, and draws both", () => {
    for (const entry of SKETCH_MARKS) {
      expect(entry.thesis.length, `${entry.id} argues nothing`).toBeGreaterThan(40);
      expect(entry.trades.length, `${entry.id} gives nothing up`).toBeGreaterThan(20);
      expect(markup, `${entry.id} draws no thesis`).toContain(
        entry.thesis.slice(0, 40).replaceAll("'", "&#x27;"),
      );
    }
  });

  /** In the one ink, every one of them: the bench argues structure and motion, never colour (0346). */
  it("puts every move on a canvas under a dial, with its readout, in the one ink", () => {
    for (const [index, entry] of SKETCH_MARKS.entries()) {
      const stage = stageOf(entry.id, SKETCH_MARKS[index + 1]?.id);
      expect(stage, `${entry.id} draws no canvas`).toContain("<canvas");
      expect(stage, `${entry.id} has no dial`).toContain('data-slot="slider"');
      expect(stage, `${entry.id} says nothing of its dial`).toMatch(
        new RegExp(`data-said="${entry.id}"[^>]*>[^<]*[a-z]`, "u"),
      );
      const chips = [...stage.matchAll(/data-chip="/gu)].length;
      expect(chips, `${entry.id} names ${chips} inks`).toBe(INKING_STOPS.ink.length);
    }
  });
});

describe("each entry says where it would land", () => {
  it("names at least one real file of the painter in every build note, and draws the note", () => {
    for (const entry of SKETCH_MARKS) {
      const named = [...entry.built.matchAll(/src\/[\w/.-]+\.tsx?/gu)].map((found) => found[0]);
      expect(named.length, `${entry.id} names no file`).toBeGreaterThan(0);
      for (const file of named) {
        expect(existsSync(file), `${entry.id} names ${file}, which is not there`).toBe(true);
      }
      expect(markup).toContain(entry.built.slice(0, 40).replaceAll("'", "&#x27;"));
    }
  });

  it("says whether it is a bake or a frame", () => {
    for (const entry of SKETCH_MARKS) {
      expect(entry.built, entry.id).toMatch(/bake-side|frame-side/iu);
    }
  });
});
