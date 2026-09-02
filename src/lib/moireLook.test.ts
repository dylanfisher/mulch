/**
 * @role Tests what a look is: that every name the picture has maths for is declared once, that the
 *   lattice is reserved and stands for the rack alone, and that each look's terms say how they are
 *   read and where the look lands — the declarations the registry refuses an entry against (0279).
 * @instead What each look's terms answer for a standing rack, and how they travel →
 *   src/ui/moireLooks.test.ts. What the registry refuses of an entry that declares one →
 *   src/audio/effects/registry.test.ts. The maths each look is drawn by → src/lib/moireWarp.test.ts,
 *   src/lib/moireFold.test.ts and src/lib/moireSound.test.ts.
 */
import { describe, expect, it } from "vitest";

import {
  BLOCK_HARDENINGS,
  BLOCK_PIXELS,
  blockHarden,
  blockSize,
  BLOOM_CEILING,
  BLOOM_SCALE,
  bloomAmount,
  bloomScale,
  ECHO_CAP,
  ECHO_CEILING,
  ECHO_FADE,
  ECHO_SPACING,
  echoAlpha,
  echoCount,
  echoFade,
  echoSpacing,
  isLookName,
  SHARPEN_CEILING,
  SHARPEN_SCALE,
  sharpenAmount,
  weighed,
  LOOK_NAMES,
  LOOK_TERMS,
  LOOKS,
  RESERVED_LOOKS,
} from "@/lib/moireLook";
import { normalize } from "@/lib/range";

// One flat list of what the contract is, a case per question it answers (0007).
// oxlint-disable-next-line max-lines-per-function
describe("what a look is", () => {
  it("names each look once, and holds maths for exactly the names it declares", () => {
    expect(new Set(LOOK_NAMES).size).toBe(LOOK_NAMES.length);
    expect(new Set(Object.keys(LOOKS))).toEqual(new Set(LOOK_NAMES));
    expect(Object.keys(LOOKS)).toHaveLength(LOOK_NAMES.length);
    for (const name of LOOK_NAMES) expect(isLookName(name)).toBe(true);
    // A name the picture has no maths for is not a look, which is the whole of what the registry
    // asks this file (0122).
    expect(isLookName("glow")).toBe(false);
    expect(isLookName(7)).toBe(false);
  });

  it("reserves the lattice for the rack, and nothing else", () => {
    expect(RESERVED_LOOKS).toEqual(["lattice"]);
    for (const name of RESERVED_LOOKS) {
      expect(LOOKS[name].at).toBe("field");
      expect(LOOKS[name].terms).toEqual({});
    }
  });

  it("says of every term how it is read, and of every look where it lands", () => {
    for (const name of LOOK_NAMES) {
      const look = LOOKS[name];
      expect(["field", "bake", "cut", "pass"]).toContain(look.at);
      for (const [term, read] of Object.entries(look.terms)) {
        expect(LOOK_TERMS).toContain(term);
        expect(["turn", "value"]).toContain(read);
      }
    }
    // The three that stand: the warp bends on a turn of its own range and wanders in the parameter's
    // own units, the shatter takes a share on a turn, and the fold reads nothing at all — how many
    // times the plane is folded is how many automators are standing (0278).
    expect(LOOKS.warp.terms).toEqual({ bend: "turn", wander: "value" });
    expect(LOOKS.shatter.terms).toEqual({ share: "turn" });
    expect(LOOKS.fold.terms).toEqual({});
    expect(LOOKS.fold.at).toBe("bake");
    // And where a look lands and whether it carries a draw of its own are one fact: every look that
    // says `pass` has one, and no look that lands elsewhere does.
    for (const name of LOOK_NAMES) {
      expect("pass" in LOOKS[name]).toBe(LOOKS[name].at === "pass");
    }
  });

  // P280: reverb's, and the first look to take a slot in the chain.
  it("blooms wider the longer the tail and never lays the whole of itself back", () => {
    expect(LOOKS.bloom.at).toBe("pass");
    expect(LOOKS.bloom.terms).toEqual({ amount: "turn", radius: "turn" });
    // The radius is the working size the copy is drawn at, and a bigger room is a smaller copy: the
    // band runs one way down its whole length, and no turn leaves it at either end.
    expect(bloomScale(0)).toBe(BLOOM_SCALE[0]);
    expect(bloomScale(1)).toBeCloseTo(BLOOM_SCALE[1], 12);
    let last = Number.POSITIVE_INFINITY;
    for (let turn = 0; turn <= 1.0001; turn += 1 / 32) {
      const scale = bloomScale(turn);
      expect(scale).toBeLessThan(last);
      expect(scale).toBeLessThanOrEqual(BLOOM_SCALE[0]);
      expect(scale).toBeGreaterThanOrEqual(BLOOM_SCALE[1]);
      last = scale;
    }
    // A knob cannot leave its range, but a travelled presence and a term are both read off values
    // the picture eases, so the band is closed at both ends here rather than trusted.
    expect(bloomScale(-1)).toBe(BLOOM_SCALE[0]);
    expect(bloomScale(2)).toBeCloseTo(BLOOM_SCALE[1], 12);
    // And the amount is the wet twice over — once as presence, once as the term — under a ceiling
    // short of the whole picture, so the structure is never entirely lost under its own halo.
    expect(bloomAmount(0, 1)).toBe(0);
    expect(bloomAmount(1, 0)).toBe(0);
    expect(bloomAmount(1, 1)).toBe(BLOOM_CEILING);
    expect(BLOOM_CEILING).toBeLessThan(1);
    expect(bloomAmount(0.5, 0.5)).toBeCloseTo(0.25 * BLOOM_CEILING, 10);
    expect(bloomAmount(2, 2)).toBe(BLOOM_CEILING);
    expect(bloomAmount(-1, 1)).toBe(0);
    // At the defaults a room is present and readable and nothing like the whole picture. The two
    // numbers are reverb's own declared defaults and ranges (src/audio/effects/reverb.ts), spelt
    // out because a lib test may not import the parameter registry (docs/map.md, the tiers table);
    // the reading that does hold them off `PARAMS` is in src/ui/moireLooks.test.ts.
    const wet = normalize(0.3, 0, 1, "linear");
    const decay = normalize(1.8, 0.1, 8, "log");
    expect(bloomAmount(wet, wet)).toBeGreaterThan(0);
    expect(bloomAmount(wet, wet)).toBeLessThan(0.2);
    expect(bloomScale(decay)).toBeLessThan(BLOOM_SCALE[0]);
    expect(bloomScale(decay)).toBeGreaterThan(BLOOM_SCALE[1]);
  });

  // P281: crush's, and the second look to take a slot in the chain.
  it("blocks the field on whole pixels and hardens it once per lost bit", () => {
    expect(LOOKS.blocks.at).toBe("pass");
    expect(LOOKS.blocks.terms).toEqual({ block: "turn", levels: "turn" });
    // A block is a whole number of pixels at every turn of the range and at every presence between
    // absent and standing — a grid on a fraction of a pixel is a soft edge down every cell of it.
    for (let turn = 0; turn <= 1.0001; turn += 1 / 32) {
      for (const presence of [0, 0.17, 0.5, 0.83, 1]) {
        const size = blockSize(presence, turn);
        expect(Number.isInteger(size)).toBe(true);
        expect(size).toBeGreaterThanOrEqual(1);
        expect(size).toBeLessThanOrEqual(BLOCK_PIXELS[0]);
      }
    }
    // Coarsest at the bottom of the Rate and finest at the top, and the band closed at both ends
    // because a travelled presence and a term are both read off numbers the picture eases.
    expect(blockSize(1, 0)).toBe(BLOCK_PIXELS[0]);
    expect(blockSize(1, 1)).toBe(BLOCK_PIXELS[1]);
    expect(blockSize(1, -1)).toBe(BLOCK_PIXELS[0]);
    expect(blockSize(1, 2)).toBe(BLOCK_PIXELS[1]);
    expect(blockSize(1, 0)).toBeGreaterThan(blockSize(1, 0.5));
    expect(blockSize(1, 0.5)).toBeGreaterThan(blockSize(1, 1));
    // An absent crush is a block of one pixel, which is the field itself: a look on its way in or
    // out leaves the picture where it was at nought however coarse its knobs stand.
    expect(blockSize(0, 0)).toBe(1);
    expect(blockSize(-1, 0)).toBe(1);
    expect(blockSize(0.5, 0)).toBeGreaterThan(1);
    expect(blockSize(0.5, 0)).toBeLessThan(BLOCK_PIXELS[0]);
    // And the hardening is a whole count of composites, none at a whole depth and the cap at one
    // bit, weighted by the same presence.
    expect(blockHarden(1, 1)).toBe(0);
    expect(blockHarden(1, 0)).toBe(BLOCK_HARDENINGS);
    expect(blockHarden(0, 0)).toBe(0);
    expect(blockHarden(2, -1)).toBe(BLOCK_HARDENINGS);
    for (let turn = 0; turn <= 1.0001; turn += 1 / 32) {
      const hard = blockHarden(0.6, turn);
      expect(Number.isInteger(hard)).toBe(true);
      expect(hard).toBeGreaterThanOrEqual(0);
      expect(hard).toBeLessThanOrEqual(BLOCK_HARDENINGS);
    }
    // At crush's own declared defaults and ranges (src/audio/effects/crush.ts, spelt out here for
    // the reason the bloom's are) the picture is blocked and readable: cells the eye can see, and
    // some of the depth taken out rather than all of it.
    const rate = normalize(6000, 100, 24_000, "log");
    const bits = normalize(8, 1, 16, "linear");
    const mix = normalize(0.5, 0, 1, "linear");
    expect(blockSize(mix, rate)).toBeGreaterThan(1);
    expect(blockSize(mix, rate)).toBeLessThan(BLOCK_PIXELS[0]);
    expect(blockHarden(mix, bits)).toBeGreaterThan(0);
    expect(blockHarden(mix, bits)).toBeLessThan(BLOCK_HARDENINGS);
  });

  // P282: delay's, and the third look to take a slot in the chain.
  it("repeats the field on a whole count under the cap, spaced and fading by its own knobs", () => {
    expect(LOOKS.echoes.at).toBe("pass");
    expect(LOOKS.echoes.terms).toEqual({ spacing: "turn", count: "turn", fade: "turn" });
    // The count is whole and never past the cap at any turn of the feedback, and never under one:
    // a delay line with nothing fed back still repeats once, and a picture drawing no repeat at all
    // would say the effect was not standing.
    for (let turn = 0; turn <= 1.0001; turn += 1 / 32) {
      const count = echoCount(turn);
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(ECHO_CAP);
    }
    expect(echoCount(0)).toBe(1);
    expect(echoCount(1)).toBe(ECHO_CAP);
    // The band is closed at both ends, because a term is read off a number the picture eases.
    expect(echoCount(-1)).toBe(1);
    expect(echoCount(2)).toBe(ECHO_CAP);
    // The spacing runs one way down its whole length: a longer Time is a wider gap between repeats,
    // and a full ladder of them at the widest is still inside the field it is drawn from.
    expect(echoSpacing(0)).toBe(ECHO_SPACING[0]);
    expect(echoSpacing(1)).toBeCloseTo(ECHO_SPACING[1], 12);
    expect(echoSpacing(-1)).toBe(ECHO_SPACING[0]);
    expect(echoSpacing(2)).toBeCloseTo(ECHO_SPACING[1], 12);
    let last = 0;
    for (let turn = 0; turn <= 1.0001; turn += 1 / 32) {
      const step = echoSpacing(turn);
      expect(step).toBeGreaterThan(last);
      expect(step).toBeLessThanOrEqual(ECHO_SPACING[1]);
      last = step;
    }
    expect(ECHO_SPACING[1] * ECHO_CAP).toBeLessThan(1);
    // And the fade is how much of one repeat survives into the next: harder feedback is a longer
    // tail, and neither end of the band is a ladder of solid copies or no ladder at all.
    expect(echoFade(0)).toBe(ECHO_FADE[0]);
    expect(echoFade(1)).toBeCloseTo(ECHO_FADE[1], 12);
    expect(ECHO_FADE[0]).toBeGreaterThan(0);
    expect(ECHO_FADE[1]).toBeLessThan(1);
    expect(echoFade(0.5)).toBeGreaterThan(echoFade(0.25));
    // And the ladder starts under half the picture however present the delay is, because every
    // ghost behind the field takes more ink out of the screen and a ladder starting at the whole of
    // it would pale the picture away before its second rung — the bloom's reason (0280), at a
    // number of the echoes' own, because a halo may take most of the picture where three ghosts
    // may not.
    expect(ECHO_CEILING).toBeLessThan(0.5);
    expect(echoAlpha(1, 1)).toBe(ECHO_CEILING);
    expect(echoAlpha(0, 1)).toBe(0);
    expect(echoAlpha(0.5, 1)).toBeCloseTo(ECHO_CEILING / 2, 10);
    expect(echoAlpha(2, 1)).toBe(ECHO_CEILING);
    expect(echoAlpha(-1, 1)).toBe(0);
    // And the wind is in the alpha because it is in the spacing: a ladder gathered onto the field
    // it came from is three copies of a hole mask laid exactly over each other, which hazes every
    // window in the picture evenly instead of repeating it (0269). So a wind standing still draws
    // no ladder at all, a wind halfway round draws a faint one, and either direction draws the same.
    expect(echoAlpha(1, 0)).toBe(0);
    expect(echoAlpha(1, 0.5)).toBeCloseTo(ECHO_CEILING / 2, 10);
    expect(echoAlpha(1, -0.5)).toBeCloseTo(ECHO_CEILING / 2, 10);
    expect(echoAlpha(1, -1)).toBe(ECHO_CEILING);
    expect(echoAlpha(1, 2)).toBe(ECHO_CEILING);
    expect(echoAlpha(1, -2)).toBe(ECHO_CEILING);
    // At delay's own declared defaults and ranges (src/audio/effects/delay.ts, spelt out here for
    // the reason the bloom's are) the repeats are countable and the picture survives them: more
    // than the one every delay draws, fewer than the cap, and the last of the ladder well faded.
    const time = normalize(0.25, 0, 2, "linear");
    const feedback = normalize(0.35, 0, 0.9, "linear");
    expect(echoCount(feedback)).toBeGreaterThan(1);
    expect(echoCount(feedback)).toBeLessThan(ECHO_CAP);
    expect(echoSpacing(time)).toBeGreaterThan(ECHO_SPACING[0]);
    expect(echoSpacing(time)).toBeLessThan(ECHO_SPACING[1]);
    expect(echoFade(feedback) ** echoCount(feedback)).toBeLessThan(0.5);
  });

  it("sharpens on one amount under its ceiling, and saturates on a term no pass draws", () => {
    expect(LOOKS.sharpen.at).toBe("pass");
    expect(LOOKS.sharpen.terms).toEqual({ amount: "turn", saturation: "turn" });
    // One number for both halves of the draw, and both ends of it closed: the amount is read off a
    // presence the picture eases toward and is asked for its value before it has arrived.
    expect(sharpenAmount(1, 1)).toBe(SHARPEN_CEILING);
    expect(sharpenAmount(0, 1)).toBe(0);
    expect(sharpenAmount(1, 0)).toBe(0);
    expect(sharpenAmount(0.5, 1)).toBeCloseTo(SHARPEN_CEILING / 2, 10);
    expect(sharpenAmount(1, 0.5)).toBeCloseTo(SHARPEN_CEILING / 2, 10);
    expect(sharpenAmount(-1, 1)).toBe(0);
    expect(sharpenAmount(2, 2)).toBe(SHARPEN_CEILING);
    // Short of the whole of it, for the bloom's reason at a number of pop's own: what the mask adds
    // is what stands above its own local mean, and a mask driven at the whole of it reads as a
    // picture turned up rather than as one brought into focus.
    expect(SHARPEN_CEILING).toBeGreaterThan(0);
    expect(SHARPEN_CEILING).toBeLessThan(1);
    // And the copy is blurred at a working size well inside the bloom's own band and nearer its
    // wide end, because a mask blurred as far as a halo stops being a local mean (0280).
    expect(SHARPEN_SCALE).toBeLessThan(BLOOM_SCALE[0]);
    expect(SHARPEN_SCALE).toBeGreaterThan(BLOOM_SCALE[1]);
    // The three passes that weigh a share under a ceiling weigh it the same way, which is the one
    // helper they share and not three copies of it (principle 3). Each keeps its own ceiling.
    expect(weighed(0.5, 0.5, 1)).toBeCloseTo(0.25, 10);
    expect(bloomAmount(0.5, 0.5)).toBeCloseTo(weighed(0.5, 0.5, BLOOM_CEILING), 12);
    expect(echoAlpha(0.5, -0.5)).toBeCloseTo(weighed(0.5, 0.5, ECHO_CEILING), 12);
    expect(sharpenAmount(0.5, 0.5)).toBeCloseTo(weighed(0.5, 0.5, SHARPEN_CEILING), 12);
    // At pop's own declared defaults and ranges (src/audio/effects/pop.ts, spelt out here for the
    // reason the bloom's are) the mask bites and neither term is at an end of its band: a pop
    // standing at its defaults is a picture visibly sharper and one still a long way off the most
    // this pass can do.
    const mix = normalize(0.5, 0, 1, "linear");
    const sheen = normalize(0.2, 0, 1, "linear");
    expect(sharpenAmount(mix, mix)).toBeGreaterThan(0);
    expect(sharpenAmount(mix, mix)).toBeLessThan(SHARPEN_CEILING);
    expect(sheen).toBeGreaterThan(0);
    expect(sheen).toBeLessThan(1);
  });
});
