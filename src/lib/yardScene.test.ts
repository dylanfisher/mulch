/**
 * @role Tests the reading of a yard's name into the picture it stands in: that every plant names a
 *   scene, every air a light and every adjective a wind, that the same name reads the same way
 *   twice, that a name with no air reads as day (0329), and that every place word reads a reach
 *   and every place noun the shape of the shade it casts (0335).
 */
import { describe, expect, it } from "vitest";

import {
  INITIAL_YARD_NAME,
  mintYardName,
  YARD_ADJECTIVES,
  YARD_ADJECTIVES_BY_WIND,
  YARD_AIR_NOUNS,
  YARD_AIR_NOUNS_BY_LIGHT,
  YARD_AIR_WORDS,
  YARD_PLACE_NOUNS,
  YARD_PLACE_NOUNS_BY_STAND,
  YARD_PLACE_WORDS,
  YARD_PLACE_WORDS_BY_REACH,
  YARD_PLANTS,
  YARD_PLANTS_BY_SCENE,
} from "@/lib/copyYard";
import {
  SCENE_LIGHTS,
  SCENE_NAMES,
  SCENE_REACHES,
  SCENE_STANDS,
  SCENE_WINDS,
} from "@/lib/moireScene";
import { yardScene, YARD_SCENE_REST } from "@/lib/yardScene";

describe("yardScene reads the whole of every bank it keys on", () => {
  it("reads every plant, air and adjective back to the group it was drawn from", () => {
    // The bank *is* the grouping (0329), so what is left to prove is the walk from a whole name
    // back to it: a reading that missed a word would answer with the rest, and the rest's own
    // group does not hold that word. Every entry of all three banks, through the public reading.
    for (const plant of YARD_PLANTS) {
      const { scene } = yardScene(`Quiet ${plant} by the Shed`);
      expect(YARD_PLANTS_BY_SCENE[scene], plant).toContain(plant);
    }
    for (const word of YARD_ADJECTIVES) {
      const { wind } = yardScene(`${word} Fern by the Shed`);
      expect(YARD_ADJECTIVES_BY_WIND[wind], word).toContain(word);
    }
    for (const noun of YARD_AIR_NOUNS) {
      const { light } = yardScene(`Quiet Fern by the Shed in ${noun}`);
      expect(YARD_AIR_NOUNS_BY_LIGHT[light], noun).toContain(noun);
    }
  });

  it("reads every place word back to its reach and every place noun back to its stand", () => {
    // The place is the third bank to read (0335), and both halves of it read: the joining word
    // says how close the frame stands and the noun what stands in the field. Every entry of both,
    // through the public reading, for the reason the three above are walked that way.
    for (const word of YARD_PLACE_WORDS) {
      const { reach } = yardScene(`Quiet Fern ${word} the Shed`);
      expect(YARD_PLACE_WORDS_BY_REACH[reach], word).toContain(word);
    }
    for (const noun of YARD_PLACE_NOUNS) {
      const { stand } = yardScene(`Quiet Fern by ${noun}`);
      expect(YARD_PLACE_NOUNS_BY_STAND[stand], noun).toContain(noun);
    }
    // And every reading is reached: a reach or a stand no noun names is a picture nobody can be
    // given, and a shadow shape with no words behind it is a shape nothing ever draws.
    expect(
      new Set(YARD_PLACE_WORDS.map((word) => yardScene(`Quiet Fern ${word} the Shed`).reach)),
    ).toEqual(new Set(SCENE_REACHES));
    expect(
      new Set(YARD_PLACE_NOUNS.map((noun) => yardScene(`Quiet Fern by ${noun}`).stand)),
    ).toEqual(new Set(SCENE_STANDS));
  });

  it("reads a noun's own adjective as part of the noun and never as the wind", () => {
    // "beside the Old Wall" carries an adjective and "by the Ivy Arch" a plant (`yardScene`), so
    // the first match is the mint's own order rather than a preference: the wind is the word the
    // name opens with, whatever the place says after it.
    expect(yardScene("Quiet Fern beside the Old Wall")).toMatchObject({
      wind: "quiet",
      reach: "close",
      stand: "wall",
    });
    expect(yardScene("Windy Fern by the Ivy Arch")).toMatchObject({
      scene: "meadow",
      wind: "windy",
      stand: "grille",
    });
    // The step's own reading, whole: an apple tree is a mass and past it is the middle distance.
    expect(yardScene("Quiet Fern past the Apple Tree")).toMatchObject({
      reach: "middle",
      stand: "mass",
    });
  });

  it("uses every scene, every wind and every light but the one no air names", () => {
    // The other direction: a reading nothing in the banks reaches is a picture nobody can be given.
    // The day is the exception and is the one the reading rests at — a name with no air.
    expect(
      new Set(YARD_PLANTS.map((plant) => yardScene(`Quiet ${plant} by the Shed`).scene)),
    ).toEqual(new Set(SCENE_NAMES));
    expect(
      new Set(YARD_ADJECTIVES.map((word) => yardScene(`${word} Fern by the Shed`).wind)),
    ).toEqual(new Set(SCENE_WINDS));
    expect(
      new Set(YARD_AIR_NOUNS.map((noun) => yardScene(`Quiet Fern by the Shed in ${noun}`).light)),
    ).toEqual(new Set(SCENE_LIGHTS.filter((light) => light !== "day")));
  });
});

describe("yardScene reads one name one way", () => {
  it("reads the same name the same way, however often it is asked", () => {
    // Nothing is stored, so the reading has to be the whole of the fact: two tabs on one session
    // draw the same scene because they read the same string (0145).
    const name = "Windy Reed past the Water Butt in Falling Dusk";
    expect(yardScene(name)).toEqual(yardScene(name));
    expect(yardScene(name)).toEqual({
      scene: "water",
      light: "dusk",
      wind: "windy",
      reach: "middle",
      stand: "mass",
    });
  });

  it("reads a name with no air as the day, and one the banks do not know as the rest", () => {
    expect(yardScene("Windy Reed past the Water Butt").light).toBe("day");
    // Durable text a session holds may be any string at all (0026), and the reading answers for
    // every one of them with a rest rather than a throw or a silent first entry.
    expect(yardScene("")).toEqual(YARD_SCENE_REST);
    expect(yardScene("nothing this instrument ever minted")).toEqual(YARD_SCENE_REST);
  });

  it("reads the air off the joined phrase and never off a noun standing on its own", () => {
    // The air is a word against a noun (0324), so a detail or a place that happened to spell a
    // noun cannot answer for one — and both joining words read.
    for (const word of YARD_AIR_WORDS) {
      expect(yardScene(`Quiet Fern by the Shed ${word} Moonlight`).light).toBe("moon");
    }
    expect(yardScene("Quiet Fern by the Shed with Moonlight").light).toBe("day");
  });

  it("reads every name the mint actually draws", () => {
    // The mint is the only writer of a name (0057), so what it draws is what the reading has to
    // answer for: forty names, and not one of them falling back to the rest for its plant.
    for (const name of [INITIAL_YARD_NAME, ...Array.from({ length: 40 }, () => mintYardName())]) {
      const read = yardScene(name);
      const [adjective = "", plant = ""] = name.split(" ");
      expect(read.scene, name).toBe(yardScene(`Quiet ${plant} by the Shed`).scene);
      expect(read.wind, name).toBe(yardScene(`${adjective} Fern by the Shed`).wind);
    }
  });
});
