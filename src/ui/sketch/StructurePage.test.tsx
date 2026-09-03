/**
 * The structure bench's own half of the naming rule (0252): seven ways to make the automator's
 * mark plain, each on a canvas under its own dial, each naming what the dial stands at and the
 * inks it is drawn in, and each saying where in the painter it would land — at a file that exists.
 * In the shape SketchPage.test.tsx and SketchDrifts.test.tsx took, because it is the same bench
 * on its own route (0295).
 */
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INSTRUMENT_ROUTE, routeOf, SKETCH_ROUTE, STRUCTURE_ROUTE } from "@/ui/routes";
import { INKING_STOPS } from "@/ui/sketch/SketchDriftStage";
import { SKETCH_STRUCTURES, StructurePage } from "@/ui/sketch/StructurePage";

/** The whole bench, rendered once: every case here reads one stage out of the one markup. */
const markup = renderToStaticMarkup(<StructurePage />);

/** One stage of the bench, bounded by the next entry's section so a neighbour cannot answer for it. */
function stageOf(id: string, next: string | undefined): string {
  const opens = markup.indexOf(`data-drift="${id}"`);
  expect(opens, `${id} is not mounted`).not.toBe(-1);
  const closes = next === undefined ? markup.length : markup.indexOf(`id="${next}"`, opens);
  expect(closes, `${id} is not followed by ${next}`).toBeGreaterThan(opens);
  return markup.slice(opens, closes);
}

describe("the structure route", () => {
  it("resolves its own hash and leaves the sketch bench and everything else where they were", () => {
    expect(routeOf(STRUCTURE_ROUTE)).toBe("structure");
    expect(routeOf(SKETCH_ROUTE)).toBe("sketch");
    expect(routeOf("#/structures")).toBe("instrument");
    expect(routeOf("")).toBe("instrument");
  });

  /** A bare `#bite` is a route change: it leaves `#/structure` and the bench unmounts (0054). */
  it("keeps every nav link on the structure route and the wordmark on the way home", () => {
    const hrefs = [...markup.matchAll(/href="([^"]*)"/gu)].map(([, href]) => href);
    expect(hrefs).toContain(INSTRUMENT_ROUTE);
    const nav = hrefs.filter((candidate) => candidate !== INSTRUMENT_ROUTE);
    expect(nav).not.toHaveLength(0);
    for (const href of nav) expect(href).toBe(STRUCTURE_ROUTE);
  });
});

describe("StructurePage mounts the bench", () => {
  /** At least six, which is what the bench was asked for, and every one off the list (0254). */
  it("mounts every entry, with one id apiece", () => {
    expect(SKETCH_STRUCTURES.length).toBeGreaterThanOrEqual(6);
    for (const entry of SKETCH_STRUCTURES) {
      expect(markup, `${entry.id} has an entry and no section`).toContain(`id="${entry.id}"`);
      expect(markup, `${entry.id} has an entry and no nav link`).toContain(
        `data-section="${entry.id}"`,
      );
    }
    const ids = SKETCH_STRUCTURES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries a thesis and a trade for every entry, and draws both", () => {
    for (const entry of SKETCH_STRUCTURES) {
      expect(entry.thesis.length, `${entry.id} argues nothing`).toBeGreaterThan(40);
      expect(entry.trades.length, `${entry.id} gives nothing up`).toBeGreaterThan(20);
      expect(markup, `${entry.id} draws no thesis`).toContain(
        entry.thesis.slice(0, 40).replaceAll("'", "&#x27;"),
      );
    }
  });

  it("puts every move on a canvas under a dial, with its readout and its inks named", () => {
    for (const [index, entry] of SKETCH_STRUCTURES.entries()) {
      const stage = stageOf(entry.id, SKETCH_STRUCTURES[index + 1]?.id);
      expect(stage, `${entry.id} draws no canvas`).toContain("<canvas");
      expect(stage, `${entry.id} has no dial`).toContain('data-slot="slider"');
      expect(stage, `${entry.id} says nothing of its dial`).toMatch(
        new RegExp(`data-said="${entry.id}"[^>]*>[^<]*[a-z]`, "u"),
      );
      const chips = [...stage.matchAll(/data-chip="/gu)].length;
      expect(
        Object.values(INKING_STOPS).some((stops) => stops.length === chips),
        `${entry.id} names ${chips} inks`,
      ).toBe(true);
    }
  });

  /** The one move that spends a second colour says so by reading through the five, and it alone. */
  it("reads exactly one picture through the ramp of five", () => {
    const ramped = SKETCH_STRUCTURES.filter((entry, index) => {
      const chips = [
        ...stageOf(entry.id, SKETCH_STRUCTURES[index + 1]?.id).matchAll(/data-chip="/gu),
      ];
      return chips.length === INKING_STOPS.ramp.length;
    });
    expect(ramped.map((entry) => entry.id)).toEqual(["colour"]);
  });
});

describe("each of the seven says where it would land", () => {
  it("names at least one real file of the painter in every build note, and draws the note", () => {
    for (const entry of SKETCH_STRUCTURES) {
      const named = [...entry.built.matchAll(/src\/[\w/.-]+\.tsx?/gu)].map((found) => found[0]);
      expect(named.length, `${entry.id} names no file`).toBeGreaterThan(0);
      for (const file of named) {
        expect(existsSync(file), `${entry.id} names ${file}, which is not there`).toBe(true);
      }
      expect(markup).toContain(entry.built.slice(0, 40).replaceAll("'", "&#x27;"));
    }
  });

  it("says whether it is a bake or a frame", () => {
    for (const entry of SKETCH_STRUCTURES) {
      expect(entry.built, entry.id).toMatch(/bake-side|frame-side/iu);
    }
  });
});
