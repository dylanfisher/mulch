/**
 * The drift bench's own half of the naming rule (0252): ten directions of one picture, each on
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
import { tunings } from "@/lib/moireTuning";
import { sceneOf } from "@/ui/scene/scenes";
import { INKING_STOPS } from "@/ui/sketch/SketchDriftStage";
import { FILM_STOPS } from "@/ui/sketch/drift/SketchDriftFilm";
import { SKETCH_DRIFTS } from "@/ui/sketch/sketchEntries";
import { SketchPage } from "@/ui/sketch/SketchPage";

/** The whole bench, rendered once: every case here reads one stage out of the one markup. */
const markup = renderToStaticMarkup(<SketchPage />);

/**
 * One stage of the bench, bounded by the next entry's section so a neighbour cannot answer for
 * it. A stage that drew nothing at all leaves `indexOf` at -1, and a slice from there is every
 * later sketch's markup rather than nothing — which is exactly how an unlabelled picture passes.
 */
function stageOf(id: string, next?: string): string {
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

/** One scene's own ramp as the names its legend draws, which is the token's own last word. */
const rampOf = (name: (typeof SCENE_NAMES)[number]): string =>
  sceneOf(name)
    .ramp.map((token) => token.split("-").at(-1) ?? token)
    .join();

/**
 * Every inking a picture on this bench may be drawn through: the two shared ones and one per scene
 * — the scenes read along their own five since 0332, exactly as the four stills did before every
 * one of them landed as the scene it argued for (0334). Held as the names in their order and not as
 * a count, because the four scenes and the reference ramp all hold five and what is being checked
 * is which five.
 */
const DECLARED = [
  ...Object.values(INKING_STOPS).map((stops) => namesOf(stops)),
  ...SCENE_NAMES.map((name) => rampOf(name)),
  // And one more: the film draws a scene's five from a fifth of the way along the page's own
  // ground, so the share is spent inside the scene's ramp the way the painter spends it (0340).
  namesOf(FILM_STOPS),
];

describe("SketchPage draws where the picture goes, ten ways", () => {
  it("puts every direction on a canvas under a dial, with its readout and its inks named", () => {
    expect(SKETCH_DRIFTS).toHaveLength(6 + SCENE_NAMES.length);
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
   * **Amended for the stills, and kept after them.** The rule was that exactly one picture spent a
   * second colour, which was right for a bench arguing about one move at a time on a one-hue
   * instrument (0247). The stills were the answer to the shipped scenes reading as too quiet, and
   * colour at full strength is what they were for — so the rule became two: the reference ramp of
   * five is still read by the Ramp and by nothing else, and a picture drawn along stops of its own
   * holds those stops alone. The stills have all landed as scenes (0334) and the second half holds
   * over what is left.
   *
   * It is walked over **every entry** and not over the four names, which is what keeps it as strong
   * as the rule it replaces: "no picture but the Ramp draws five chips" banned a further entry from
   * borrowing a palette, and a loop over the four scene names would let one through the moment it
   * was added under any other id (0331).
   */
  it("reads one picture through the reference ramp and every other palette once", () => {
    const reference = namesOf(INKING_STOPS.ramp);
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
  });
});

describe("the bench draws every scene", () => {
  /**
   * A scene that lands in the painter without standing on this bench beside the other three is a
   * field nobody argued about at 1:1 (0247, 0329) — so the bench draws one stage per name in the
   * contract, under the one term of the reading a hand can move: the wind's own lean.
   */
  it("puts one stage on the bench for every name in the contract, read through its own stops", () => {
    const drawn = SKETCH_DRIFTS.map((entry) => entry.id);
    for (const name of SCENE_NAMES) {
      expect(drawn, `${name} is not on the bench`).toContain(name);
      const stage = stageOf(name, SKETCH_DRIFTS[drawn.indexOf(name) + 1]?.id);
      expect(stage, `${name} draws no canvas`).toContain("<canvas");
      expect(stage, `${name} says nothing of its lean`).toMatch(
        new RegExp(`data-said="${name}"[^>]*>[^<]*lean`, "u"),
      );
      // And along the scene's own five stops rather than the two-stop inking every geometry
      // direction shares: entry 07 is the shipped bloom in the shipped colours, which is what makes
      // the bench a picture of what lands and not a drawing of it (0332).
      expect(chipsOf(stage).join(), `${name} is not read along its own stops`).toBe(rampOf(name));
    }
  });

  /**
   * And no still is left on the bench at all. A still was here to argue a field the painter did not
   * have; every one of the four has landed as the scene it argued for — the poppies as the bloom
   * (0332), the glint as the water (0333), the seed heads as the meadow and the canopy light as the
   * canopy (0334) — so the argument is over and the two files behind them are gone with it.
   */
  it("keeps no still, and no file for one", () => {
    const drawn = SKETCH_DRIFTS.map((entry) => entry.id);
    for (const gone of ["poppies", "glint", "seedheads", "skylight"]) {
      expect(drawn, `${gone} still stands on the bench`).not.toContain(gone);
    }
    for (const file of ["src/ui/sketch/sketchStill.ts", "src/ui/sketch/sketchStillField.ts"]) {
      expect(existsSync(file), `${file} outlived the still it was for`).toBe(false);
    }
    // And the bench's second introduction counts what it mounts: ten, not eleven.
    expect(markup, "the drift introduction miscounts the bench").toContain(
      "so the ten are a plan&#x27;s worth of parts",
    );
  });
});

describe("the bench keeps no picture a scene has taken", () => {
  /**
   * The water is the glint since 0333, so entry 08 is the shipped water read along the shipped
   * water's own stops — black first, which is the stop this instrument had no ink for until the
   * scene landed. The canopy is the skylight since 0334 and opens at a stop under the one that was
   * its darkest, which is the second ink a landing still has cost the theme.
   */
  it("draws the shipped water at 08 and the shipped canopy at 09, each on its own floor", () => {
    const drawn = SKETCH_DRIFTS.map((entry) => entry.id);
    expect(drawn.indexOf("water"), "the water is not entry 08").toBe(7);
    expect(drawn.indexOf("canopy"), "the canopy is not entry 09").toBe(8);
    expect(chipsOf(stageOf("water", drawn[8]))[0], "the water does not open at its black").toBe(
      "black",
    );
    expect(chipsOf(stageOf("canopy", drawn[9]))[0], "the canopy does not open at its shade").toBe(
      "shade",
    );
  });
});

describe("the bench argues the film's share under a dial", () => {
  /**
   * The block's first step: how much of the picture the film may spend is one number, and a number
   * in a file is not what a hand decides on — a picture with a dial is (0247, 0339). So the tenth
   * entry is the film, it names the tunable a hand will move in the app, and it is drawn over a
   * scene's own stops rather than the two-stop inking, with the page's ground beneath them as the
   * thing an opaque tile is composited over and never shows (0340).
   */
  it("stands the film tenth, under the dial the app declares", () => {
    const drawn = SKETCH_DRIFTS.map((entry) => entry.id);
    expect(drawn, "the bench does not hold ten entries").toHaveLength(10);
    expect(drawn.indexOf("film"), "the film is not entry 10").toBe(9);
    const entry = SKETCH_DRIFTS[9];
    expect(entry?.built, "the film names no tunable").toContain("film.share");
    expect(
      tunings().map((handle) => handle.id),
      "nothing declares film.share",
    ).toContain("film.share");
    const stage = stageOf("film");
    expect(stage, "the film says nothing of what it leaves standing").toMatch(
      /data-said="film"[^>]*>[^<]*lightness stands/u,
    );
    // Over the page's ground and then the bloom's own five: the picture behind the film is the
    // scene entry 07 draws, and the ground under it is where a spent pixel lands.
    expect(chipsOf(stage).join(), "the film is not the bloom over the ground").toBe(
      `ground,${rampOf("bloom")}`,
    );
  });
});

describe("each of the ten says where it would land", () => {
  /**
   * A build note is the point of this bench: the ten are a plan's worth of parts, so each one
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
