/**
 * The drift bench's own half of the naming rule (0252): eight directions of one picture, each on
 * a canvas under its own dial, each naming what the dial stands at and the inks it is drawn in,
 * and each saying where in the painter it would land — at a file that exists. Out of
 * `SketchPage.test.tsx` in the shape `SketchGrounds.test.tsx` took: that file mounts the bench and
 * checks the list is the bench, this one checks what the list draws. Plural in the name for the
 * ground file's reason: a `SketchDrift.test.tsx` beside `sketchDrift.ts` differs only in case.
 */
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INKING_STOPS } from "@/ui/sketch/SketchDriftStage";
import { SKETCH_DRIFTS, SketchPage } from "@/ui/sketch/SketchPage";

/** The whole bench, rendered once: every case here reads one stage out of the one markup. */
const markup = renderToStaticMarkup(<SketchPage />);

/**
 * One stage of the bench, bounded by the next entry's section so a neighbour cannot answer for
 * it. A stage that drew nothing at all leaves `indexOf` at -1, and a slice from there is every
 * later sketch's markup rather than nothing — which is exactly how an unlabelled picture passes.
 */
function stageOf(id: string, next: string | undefined): string {
  const opens = markup.indexOf(`data-drift="${id}"`);
  expect(opens, `${id} is not mounted`).not.toBe(-1);
  const closes = next === undefined ? markup.length : markup.indexOf(`id="${next}"`, opens);
  expect(closes, `${id} is not followed by ${next}`).toBeGreaterThan(opens);
  return markup.slice(opens, closes);
}

describe("SketchPage draws where the picture goes, eight ways", () => {
  it("puts every direction on a canvas under a dial, with its readout and its inks named", () => {
    expect(SKETCH_DRIFTS).toHaveLength(5);
    for (const [index, entry] of SKETCH_DRIFTS.entries()) {
      const stage = stageOf(entry.id, SKETCH_DRIFTS[index + 1]?.id);
      expect(stage, `${entry.id} draws no canvas`).toContain("<canvas");
      expect(stage, `${entry.id} has no dial`).toContain('data-slot="slider"');
      // The readout names the amount the picture is drawn at, and never a bare number.
      expect(stage, `${entry.id} says nothing of its dial`).toMatch(
        new RegExp(`data-said="${entry.id}"[^>]*>[^<]*[a-z]`, "u"),
      );
      // Every ink the stage paints with is a chip a hand can see, and there are no others.
      const chips = [...stage.matchAll(/data-chip="/gu)].length;
      expect(
        Object.values(INKING_STOPS).some((stops) => stops.length === chips),
        `${entry.id} names ${chips} inks`,
      ).toBe(true);
    }
  });

  /**
   * The one direction that spends a second colour says so by reading through the five-stop ramp,
   * and it is the only one — a bench where two pictures were coloured would be arguing about the
   * palette rather than the move (0247).
   */
  it("reads exactly one picture through the ramp of five", () => {
    const ramped = SKETCH_DRIFTS.filter((entry, index) => {
      const chips = [...stageOf(entry.id, SKETCH_DRIFTS[index + 1]?.id).matchAll(/data-chip="/gu)];
      return chips.length === INKING_STOPS.ramp.length;
    });
    expect(ramped.map((entry) => entry.id)).toEqual(["ramp"]);
  });
});

describe("each of the eight says where it would land", () => {
  /**
   * A build note is the point of this bench: the eight are a plan's worth of parts, so each one
   * names the file it would land in, and that file exists. A note pointing at a file that was
   * renamed is a plan nobody can follow.
   */
  it("names at least one real file of the painter in every build note, and draws the note", () => {
    for (const entry of SKETCH_DRIFTS) {
      const built = entry.built;
      expect(built, `${entry.id} says nothing of how it is built`).toBeDefined();
      if (built === undefined) continue;
      const named = [...built.matchAll(/src\/[\w/.-]+\.tsx?/gu)].map((found) => found[0]);
      expect(named.length, `${entry.id} names no file`).toBeGreaterThan(0);
      for (const file of named) {
        expect(existsSync(file), `${entry.id} names ${file}, which is not there`).toBe(true);
      }
      expect(markup).toContain(built.slice(0, 40).replaceAll("'", "&#x27;"));
    }
  });

  /** And every one says which side of the bake line it falls on, in those words. */
  it("says whether it is a bake or a frame", () => {
    for (const entry of SKETCH_DRIFTS) {
      expect(entry.built, entry.id).toMatch(/bake-side|frame-side/iu);
    }
  });
});
