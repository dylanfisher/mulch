/**
 * @role What a cast is: the bits a set of names packs into, the presses that move one, and the
 *   draw it narrows — one number off the stream whichever names are in it (0174).
 */
import { describe, expect, it } from "vitest";

import {
  castCharacters,
  drawCast,
  inCast,
  PLAYER_CAST_MAX,
  PLAYER_CAST_MIN,
  PLAYER_CHARACTERS,
  withCharacter,
} from "./playerCast.ts";
import { mulberry32 } from "./random.ts";

describe("a cast of characters", () => {
  /** The whole cast is the identity: every declared name is in it and none is missing. */
  it("holds every character at its ceiling and one at its floor", () => {
    expect(castCharacters(PLAYER_CAST_MAX)).toEqual([...PLAYER_CHARACTERS]);
    expect(PLAYER_CAST_MAX).toBe(2 ** PLAYER_CHARACTERS.length - 1);
    // The floor is one name and not none: an arrangement that may draw nobody has no part to draw.
    expect(castCharacters(PLAYER_CAST_MIN)).toEqual(["plain"]);
  });

  /** A press moves one name and leaves every other where it was. */
  it("takes one name out and puts it back", () => {
    const without = withCharacter(PLAYER_CAST_MAX, "riff", false);
    expect(inCast(without, "riff")).toBe(false);
    expect(castCharacters(without)).toEqual(
      PLAYER_CHARACTERS.filter((character) => character !== "riff"),
    );
    expect(withCharacter(without, "riff", true)).toBe(PLAYER_CAST_MAX);
    // Idempotent both ways: a press of a name already in the cast is the cast it was.
    expect(withCharacter(PLAYER_CAST_MAX, "riff", true)).toBe(PLAYER_CAST_MAX);
  });

  /**
   * The whole of what narrowing does: every name a draw comes back with is one the cast permits,
   * and each draw costs exactly the one number an unnarrowed draw costs — so a cast changes which
   * name comes up and never how many draws a walk has spent (0174).
   */
  it("draws only names the cast holds, one number at a time", () => {
    const narrowed = withCharacter(PLAYER_CAST_MIN, "slide", true);
    const random = mulberry32(7);
    let taken = 0;
    const counted = (): number => {
      taken++;
      return random();
    };
    const drawn = Array.from({ length: 64 }, () => drawCast(narrowed, counted));
    expect(taken).toBe(64);
    expect(new Set(drawn)).toEqual(new Set(["plain", "slide"]));
  });

  /**
   * And an empty cast is a spec that came from somewhere other than the validator, so it is loud
   * rather than quietly falling back on a name nobody permitted (principle 5).
   */
  it("throws rather than drawing a name nobody permitted", () => {
    expect(() => drawCast(0, mulberry32(1))).toThrow(/permits no character/u);
  });
});
