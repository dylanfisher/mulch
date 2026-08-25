/**
 * @role What a character promises: every draw of every one of them is a spec the one validator
 *   accepts, at every amount; a character moves the knobs it names and no others; and the amount
 *   travels from plain to the draw and back rather than drawing again (0152).
 */
import { describe, expect, it } from "vitest";

import {
  assertPlayer,
  PLAYER_AMOUNT_MAX,
  PLAYER_AMOUNT_MIN,
  PLAYER_CHARACTERS,
  PLAYER_KNOBS,
  type PlayerSpec,
  type PlayerVoice,
} from "./player.ts";
import { PLAYER_BIAS_MAX } from "./playerTravel.ts";
import {
  blendCharacter,
  drawCharacter,
  PLAYER_CHARACTER_REGIONS,
  PLAYER_DEFAULTS,
} from "./playerCharacter.ts";

/** The generator plain may not reach for: it names no knob, so it draws no number. */
const refuse = (): number => {
  throw new Error("plain drew a number");
};

/** A draw taken at one point of every span, so a case reads a value rather than a distribution. */
const at = (fraction: number) => () => fraction;

/** The amounts every character is put through: both ends, the walk's own step, and the middle. */
const AMOUNTS = [0, 0.25, 0.49, 0.5, 0.75, 1];

/** A spec is what a character draws plus the seed the card already had. */
const spec = (voice: PlayerVoice): PlayerSpec => ({ seed: 7, song: [], ...voice });

/**
 * The switch's own values as a *voice* — every field a character draws, which is the whole of
 * `PLAYER_DEFAULTS` but the song a draw may not touch (0153). What "back to plain" is compared
 * against, so the two assertions below say what a blend of none of it is and not what a spec is.
 */
const { song: _song, ...PLAIN } = PLAYER_DEFAULTS;

// One case per claim a character makes, so the file's length is how many claims there are. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a jumping character", () => {
  /**
   * The one validator is the judge of what a spec may be — the ranges, and which counts are whole
   * (src/lib/player.ts). Running every character's draw through it at every amount is what keeps
   * `PLAYER_WHOLE_KNOBS` and the region bounds honest without either being restated here.
   */
  it("draws a spec the one validator accepts, at every amount and either end of every span", () => {
    for (const character of PLAYER_CHARACTERS) {
      for (const edge of [0, 0.5, 1]) {
        const drawn = drawCharacter(character, at(edge));
        for (const amount of AMOUNTS) {
          const blended = spec(blendCharacter(drawn, amount));
          expect(() => assertPlayer(blended, character)).not.toThrow();
        }
      }
    }
  });

  // What a name means is read off the dials that moved, so a character that quietly moved one it
  // says nothing about would be a character teaching the wrong lesson.
  it("moves the knobs its region names and leaves every other one where the switch left it", () => {
    for (const character of PLAYER_CHARACTERS) {
      const drawn = drawCharacter(character, at(1));
      const moved = PLAYER_KNOBS.filter((knob) => drawn[knob] !== PLAYER_DEFAULTS[knob]);
      const named = new Set(
        PLAYER_KNOBS.filter((knob) =>
          Object.hasOwn(PLAYER_CHARACTER_REGIONS[character].knobs, knob),
        ),
      );
      expect(moved.filter((knob) => !named.has(knob))).toEqual([]);
    }
  });

  // The way back, and the reason the amount is a control rather than a die: none of a character
  // is the values the switch leaves, whichever character was drawn and however it was drawn.
  it("blends back to exactly the switch's own values at none of it", () => {
    for (const character of PLAYER_CHARACTERS) {
      const drawn = drawCharacter(character, at(0.5));
      expect(blendCharacter(drawn, PLAYER_AMOUNT_MIN)).toEqual({ ...PLAIN });
    }
  });

  it("gives back the draw itself at all of it", () => {
    for (const character of PLAYER_CHARACTERS) {
      const drawn = drawCharacter(character, at(0.75));
      expect(blendCharacter(drawn, PLAYER_AMOUNT_MAX)).toEqual(drawn);
    }
  });

  // Plain is the identity: it names no knob, so it is the one character whose draw takes nothing
  // from the generator and whose result is the same every press.
  it("draws plain as the switch's own values, without asking for a number", () => {
    expect(drawCharacter("plain", refuse)).toEqual({ ...PLAIN });
  });

  // Every span is inside its knob's own range, so the arithmetic never has to clamp — a bound that
  // had to be clipped to be legal is a bound whose author was guessing.
  it("declares every span inside the range the module allows that knob", () => {
    for (const character of PLAYER_CHARACTERS) {
      const low = spec(drawCharacter(character, at(0)));
      const high = spec(drawCharacter(character, at(1)));
      expect(() => assertPlayer(low, character)).not.toThrow();
      expect(() => assertPlayer(high, character)).not.toThrow();
    }
  });

  /**
   * A grain's length is heard and drawn on a log scale, so half way from a quarter of a second to
   * ten milliseconds is fifty milliseconds and not a hundred and thirty. It is the one knob the
   * blend travels geometrically, and the one where the arithmetic middle would read on the dial as
   * a knob that had barely moved.
   */
  it("takes a burst's middle by the ear rather than by the number line", () => {
    const drawn = drawCharacter("stutter", at(0));
    expect(drawn.burst).toBeCloseTo(0.01, 10);
    const half = blendCharacter(drawn, 0.5).burst;
    expect(half).toBeCloseTo(Math.sqrt(PLAYER_DEFAULTS.burst * 0.01), 10);
    expect(half).toBeLessThan((PLAYER_DEFAULTS.burst + 0.01) / 2);
  });

  // The walk's lean is an amount like every other field of a character now, so the blend travels
  // it rather than stepping over it at the middle of the sweep (0162).
  it("leans the walk a fraction of the way rather than stepping it over", () => {
    const drawn = drawCharacter("stutter", at(0.5));
    expect(drawn.bias).toBe(PLAYER_BIAS_MAX);
    expect(blendCharacter(drawn, 0.5).bias).toBeCloseTo(
      (PLAYER_DEFAULTS.bias + PLAYER_BIAS_MAX) / 2,
      10,
    );
    expect(blendCharacter(drawn, 0).bias).toBe(PLAYER_DEFAULTS.bias);
  });

  // Two presses of one name are two patterns of one kind: a character is a region, which is the
  // whole of what 0152 decided, and a name that landed on a point would be a preset instead.
  it("draws a different pattern of the same kind on a second press", () => {
    const one = drawCharacter("scatter", at(0.1));
    const two = drawCharacter("scatter", at(0.9));
    expect(one).not.toEqual(two);
    expect(one.bias).toBe(two.bias);
  });
});
