/**
 * The drift bench's own half of the naming rule (0252): thirteen directions of one picture, each on
 * a canvas under its own dial, each naming what the dial stands at and the inks it is drawn in,
 * and each saying where in the painter it would land — at a file that exists. Out of
 * `SketchPage.test.tsx` in the shape `SketchGrounds.test.tsx` took: that file mounts the bench and
 * checks the list is the bench, this one checks what the list draws. Plural in the name for the
 * ground file's reason: a `SketchDrift.test.tsx` beside `sketchDrift.ts` differs only in case.
 */
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SCENE_NAMES } from "@/lib/moireScene";
import { INKING_STOPS } from "@/ui/sketch/SketchDriftStage";
import { STILL_NAMES, STILL_STOPS } from "@/ui/sketch/sketchStill";
import { SKETCH_DRIFTS } from "@/ui/sketch/sketchEntries";
import { SketchPage } from "@/ui/sketch/SketchPage";

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

/** The inks a stage names, in the order its own legend draws them. */
function chipsOf(stage: string): string[] {
  return [...stage.matchAll(/data-chip="([^"]+)"/gu)].map((found) => found[1] ?? "");
}

/** One list of stops as the names a legend would draw, so two inkings compare as one string. */
const namesOf = (stops: readonly { name: string }[]): string =>
  stops.map((stop) => stop.name).join();

/**
 * Every inking a picture on this bench may be drawn through: the two shared ones, and one per still.
 * Held as the names in their order and not as a count — four stills at five stops each and the
 * reference ramp at five would all pass a count, and what is being checked is which five.
 */
const DECLARED = [...Object.values(INKING_STOPS), ...Object.values(STILL_STOPS)].map((stops) =>
  namesOf(stops),
);

describe("SketchPage draws where the picture goes, thirteen ways", () => {
  it("puts every direction on a canvas under a dial, with its readout and its inks named", () => {
    expect(SKETCH_DRIFTS).toHaveLength(5 + SCENE_NAMES.length + STILL_NAMES.length);
    for (const [index, entry] of SKETCH_DRIFTS.entries()) {
      const stage = stageOf(entry.id, SKETCH_DRIFTS[index + 1]?.id);
      expect(stage, `${entry.id} draws no canvas`).toContain("<canvas");
      expect(stage, `${entry.id} has no dial`).toContain('data-slot="slider"');
      // The readout names the amount the picture is drawn at, and never a bare number.
      expect(stage, `${entry.id} says nothing of its dial`).toMatch(
        new RegExp(`data-said="${entry.id}"[^>]*>[^<]*[a-z]`, "u"),
      );
      // Every ink the stage paints with is a chip a hand can see, and there are no others.
      const drawn = chipsOf(stage).join();
      expect(DECLARED, `${entry.id} names inks nothing declared: ${drawn}`).toContain(drawn);
    }
  });
});

describe("the bench spends colour on a scene, and on nothing else", () => {
  /**
   * **Amended for the stills.** The rule was that exactly one picture spent a second colour, which
   * was right for a bench arguing about one move at a time on a one-hue instrument (0247). The four
   * stills are the answer to the shipped scenes reading as too quiet, and colour at full strength is
   * the thing they are for — so the rule is now two: the reference ramp of five is still read by the
   * Ramp and by nothing else, and a picture drawn along stops of its own holds those stops alone.
   *
   * The second half is walked over **every entry** and not over the four names, which is what keeps
   * it as strong as the rule it replaces: "no picture but the Ramp draws five chips" banned a
   * fourteenth entry from borrowing a still's palette, and a loop over `STILL_NAMES` would have let
   * one through the moment it was added under any other id (0331).
   */
  it("reads one picture through the reference ramp and every other palette once", () => {
    const reference = namesOf(INKING_STOPS.ramp);
    const drawn = SKETCH_DRIFTS.map((entry) => entry.id);
    const seen = new Map<string, string>();
    for (const [index, entry] of SKETCH_DRIFTS.entries()) {
      const chips = chipsOf(stageOf(entry.id, SKETCH_DRIFTS[index + 1]?.id)).join();
      // A picture may share the two-stop inking every geometry direction is drawn in; anything
      // wider than that is a palette, and a palette belongs to one picture.
      if (chips === namesOf(INKING_STOPS.ink)) continue;
      const held = seen.get(chips);
      expect(held, `${entry.id} draws the palette ${chips}, which ${held ?? "nothing"} holds`).toBe(
        undefined,
      );
      seen.set(chips, entry.id);
    }
    expect(seen.get(reference), "the reference ramp is not the Ramp's").toBe("ramp");

    for (const name of STILL_NAMES) {
      expect(drawn, `${name} is not on the bench`).toContain(name);
      const stops = namesOf(STILL_STOPS[name]);
      const chips = chipsOf(stageOf(name, SKETCH_DRIFTS[drawn.indexOf(name) + 1]?.id)).join();
      expect(chips, `${name} is not read along its own stops`).toBe(stops);
    }
  });
});

describe("the bench draws every scene", () => {
  /**
   * A scene that lands in the painter without standing on this bench beside the other three is a
   * field nobody argued about at 1:1 (0247, 0329) — so the bench draws one stage per name in the
   * contract, under the one term of the reading a hand can move: the wind's own lean.
   */
  it("puts one stage on the bench for every name in the contract", () => {
    const drawn = SKETCH_DRIFTS.map((entry) => entry.id);
    for (const name of SCENE_NAMES) {
      expect(drawn, `${name} is not on the bench`).toContain(name);
      const stage = stageOf(name, SKETCH_DRIFTS[drawn.indexOf(name) + 1]?.id);
      expect(stage, `${name} draws no canvas`).toContain("<canvas");
      expect(stage, `${name} says nothing of its lean`).toMatch(
        new RegExp(`data-said="${name}"[^>]*>[^<]*lean`, "u"),
      );
    }
  });
});

describe("each of the thirteen says where it would land", () => {
  /**
   * A build note is the point of this bench: the thirteen are a plan's worth of parts, so each one
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
