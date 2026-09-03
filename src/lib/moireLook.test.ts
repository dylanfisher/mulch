/**
 * @role Tests what a look is: that every name the picture has maths for is declared once, that the
 *   lattice is reserved and stands for the rack alone, and that each look's terms say how they are
 *   read and where the look lands — the declarations the registry refuses an entry against (0279).
 * @instead What each look's terms answer for a standing rack, and how they travel →
 *   src/ui/moireLooks.test.ts. What the registry refuses of an entry that declares one →
 *   src/audio/effects/registry.test.ts. The maths each look is drawn by → src/lib/moireWarp.test.ts,
 *   src/lib/moireFold.test.ts and src/lib/moireSound.test.ts.
 */
// Over the soft cap for the reason the file it tests is over it (src/lib/moireLook.ts): one case per
// look, each one the whole of what that look's maths promises, and a case split into a second file
// would be a look's contract asserted in two places. The looks land one a step, so the file grows by
// a case and never by a rewrite. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import {
  BAND_CEILING,
  BAND_DEPTH,
  BAND_EDGES,
  bandAlpha,
  bandCentre,
  bandDepth,
  bandLifts,
  bandTaper,
} from "@/lib/moireBand";
import { DOUBLE_CEILING, DOUBLE_ZOOM, doubleAmount, doubleZoom } from "@/lib/moireDouble";
import { weighed } from "@/lib/moireWeigh";
import { SQUASH_FLOOR, SQUASH_TOP, squashCeiling, squashFloor } from "@/lib/moireSquash";
import {
  ECHO_CAP,
  ECHO_CEILING,
  ECHO_FADE,
  ECHO_SPACING,
  ECHO_TIME_FADE,
  echoAlpha,
  echoCeiling,
  echoCount,
  echoFade,
  echoSpacing,
} from "@/lib/moireEchoes";
import {
  BLOCK_HARDENINGS,
  BLOCK_PIXELS,
  blockHarden,
  blockSize,
  BLOOM_CEILING,
  BLOOM_SCALE,
  bloomAmount,
  bloomScale,
  GRAIN_CEILING,
  grainBite,
  isLookName,
  SHARPEN_CEILING,
  SOFTEN_SCALE,
  softenScale,
  SHARPEN_SCALE,
  sharpenAmount,
  WOBBLE_CEILING,
  WOBBLE_HZ,
  WOBBLE_WAVES,
  wobbleSlide,
  wobbleSwim,
  LOOK_NAMES,
  LOOK_TERMS,
  LOOKS,
  RESERVED_LOOKS,
} from "@/lib/moireLook";
import { SHATTER_BANDS, shatterBands, SHATTER_CEILING, shatterPieces } from "@/lib/moireGeometry";
import { clamp, normalize } from "@/lib/range";

/**
 * How present a filter at one cutoff is heard to be, and where that cutoff stands on its own knob —
 * the entry's own declared silence and default spelt out here (src/audio/effects/filter.ts, 0202),
 * for the reason the bloom's defaults are: what this file tests is the maths, and the reading a rack
 * makes of an instance is src/ui/moireLooks.test.ts's own case.
 *
 * **All the way in is the knob's own default and not its minimum** (`presenceFull`,
 * src/audio/effects/contract.ts): the filter declares no `full`, so anything at or under a kilohertz
 * is heard as the whole of the effect and only the radius goes on moving below it.
 */
const heardAt = (cutoff: number): number => clamp((cutoff - 20_000) / (1_000 - 20_000), 0, 1);
// And where a frequency stands on the twenty-to-twenty-thousand log range both the filter's Cutoff
// and the EQ's Freq declare — one helper, because one changed declaration must not leave a second
// name quietly answering for the wrong knob (principle 1).
const turnAt = (frequency: number): number => normalize(frequency, 20, 20_000, "log");

/**
 * And the same three of an EQ, whose own declaration is the one that puts its silence in the middle
 * of a range (src/audio/effects/eq.ts, 0202): how present a band at one gain is heard to be —
 * whichever side of flat it stands — and where its gain, its frequency and its Q stand on their own
 * knobs.
 */
const gainHeard = (gain: number): number => clamp(Math.abs(gain) / 12, 0, 1);
const gainTurn = (gain: number): number => normalize(gain, -24, 24, "linear");
const bandTurn = (q: number): number => normalize(q, 0.1, 18, "log");

/**
 * And a compressor's two, whose own declaration reads its presence off the very knob one of its
 * terms is (src/audio/effects/compressor.ts, 0202): how present a ratio is heard to be — all the
 * way in at the entry's own default, which declares no `full` — and where a ratio and a threshold
 * stand on their own knobs.
 */
const ratioHeard = (ratio: number): number => clamp((ratio - 1) / (4 - 1), 0, 1);
/**
 * And a shift's two, whose own declaration reads its presence off the very knob one of its terms is
 * (src/audio/effects/shift.ts, 0202): how present a mix is heard to be — all the way in at the
 * entry's own default of a half, which declares no `full` — and where that mix stands on its knob.
 * The interval is a `value` and so has no turn at all: what the picture reads is its own semitones.
 */
const mixHeard = (mix: number): number => clamp(mix / 0.5, 0, 1);
const mixTurn = (mix: number): number => normalize(mix, 0, 1, "linear");
const ratioTurn = (ratio: number): number => normalize(ratio, 1, 20, "linear");
const thresholdTurn = (db: number): number => normalize(db, -60, 0, "linear");

/**
 * And a scatter's one: where a window's length stands on the log range the entry declares it over
 * (src/audio/effects/scatter.ts). The share has no helper here — how present a scatter is heard to
 * be is `rackScatter`'s band and not one instance's knob, which is src/ui/moireLooks.test.ts's own
 * case (0269).
 */
const spanTurn = (span: number): number => normalize(span, 0.01, 1, "log");

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
    // own units, the shatter takes a share and a piece size on two turns, and the fold reads nothing
    // at all — how many times the plane is folded is how many automators are standing (0278).
    expect(LOOKS.warp.terms).toEqual({ bend: "turn", wander: "value" });
    expect(LOOKS.shatter.terms).toEqual({ share: "turn", size: "turn" });
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
    expect(echoFade(0, 0)).toBe(ECHO_FADE[0]);
    expect(echoFade(1, 0)).toBeCloseTo(ECHO_FADE[1], 12);
    expect(ECHO_FADE[0]).toBeGreaterThan(0);
    expect(ECHO_FADE[1]).toBeLessThan(1);
    expect(echoFade(0.5, 0)).toBeGreaterThan(echoFade(0.25, 0));
    // And a long delay is slower repeats as well as wider ones: the spacing lengthens the tail by
    // half the band on its own, so a second of delay stands its ghosts further apart *and* holds
    // them longer, which is what the ear hears. Still the one band, whatever the two terms are.
    expect(echoFade(0, 1)).toBeCloseTo(
      ECHO_FADE[0] + (ECHO_FADE[1] - ECHO_FADE[0]) * ECHO_TIME_FADE,
      12,
    );
    expect(echoFade(0.5, 1)).toBeGreaterThan(echoFade(0.5, 0));
    expect(ECHO_TIME_FADE).toBeGreaterThan(0);
    expect(ECHO_TIME_FADE).toBeLessThan(1);
    for (let turn = 0; turn <= 1.0001; turn += 1 / 32) {
      expect(echoFade(turn, 1)).toBeGreaterThanOrEqual(ECHO_FADE[0]);
      expect(echoFade(turn, 1)).toBeLessThanOrEqual(ECHO_FADE[1]);
    }
    // And the ladder starts under half the picture however present the delay is, because every
    // ghost behind the field takes more ink out of the screen and a ladder starting at the whole of
    // it would pale the picture away before its second rung — the bloom's reason (0280), at a
    // number of the echoes' own, because a halo may take most of the picture where three ghosts
    // may not.
    expect(ECHO_CEILING).toBeLessThan(0.5);
    expect(echoAlpha(1, 1, 1)).toBe(ECHO_CEILING);
    expect(echoAlpha(0, 1, 1)).toBe(0);
    expect(echoAlpha(0.5, 1, 1)).toBeCloseTo(ECHO_CEILING / 2, 10);
    expect(echoAlpha(2, 1, 1)).toBe(ECHO_CEILING);
    expect(echoAlpha(-1, 1, 1)).toBe(0);
    // And the ceiling is one delay's however many stand: each of `crowd` ladders is drawn at the
    // share that leaves the same picture untouched when all of them have been laid over it, so two
    // delays are twice the repeats and never a whiter picture (0294).
    expect(echoCeiling(1)).toBe(ECHO_CEILING);
    expect(echoCeiling(0)).toBe(ECHO_CEILING);
    expect(echoCeiling(-1)).toBe(ECHO_CEILING);
    for (let crowd = 1; crowd <= 4; crowd++) {
      const share = echoCeiling(crowd);
      expect(1 - (1 - share) ** crowd).toBeCloseTo(ECHO_CEILING, 12);
      expect(share).toBeGreaterThan(0);
      expect(share).toBeLessThanOrEqual(ECHO_CEILING);
    }
    expect(echoCeiling(2)).toBeLessThan(echoCeiling(1));
    expect(echoCeiling(3)).toBeLessThan(echoCeiling(2));
    expect(echoAlpha(1, 1, 2)).toBeCloseTo(echoCeiling(2), 12);
    expect(echoAlpha(1, 1, 3)).toBeCloseTo(echoCeiling(3), 12);
    // And the wind is in the alpha because it is in the spacing: a ladder gathered onto the field
    // it came from is three copies of a hole mask laid exactly over each other, which hazes every
    // window in the picture evenly instead of repeating it (0269). So a wind standing still draws
    // no ladder at all, a wind halfway round draws a faint one, and either direction draws the same.
    expect(echoAlpha(1, 0, 1)).toBe(0);
    expect(echoAlpha(1, 0.5, 1)).toBeCloseTo(ECHO_CEILING / 2, 10);
    expect(echoAlpha(1, -0.5, 1)).toBeCloseTo(ECHO_CEILING / 2, 10);
    expect(echoAlpha(1, -1, 1)).toBe(ECHO_CEILING);
    expect(echoAlpha(1, 2, 1)).toBe(ECHO_CEILING);
    expect(echoAlpha(1, -2, 1)).toBe(ECHO_CEILING);
    // At delay's own declared defaults and ranges (src/audio/effects/delay.ts, spelt out here for
    // the reason the bloom's are) the repeats are countable and the picture survives them: more
    // than the one every delay draws, fewer than the cap, and the last of the ladder well faded.
    // The Time is on its own log curve from a floor of ten milliseconds, so the default sits past
    // the middle of the knob and the spacing it reads sits past the middle of its band — which is
    // the whole point of the curve: a quarter-second delay is a repeat the ear counts, not the
    // bottom eighth of a travel (0294).
    const time = normalize(0.25, 0.01, 2, "log");
    const feedback = normalize(0.35, 0, 0.9, "linear");
    expect(time).toBeGreaterThan(0.5);
    expect(echoCount(feedback)).toBeGreaterThan(1);
    expect(echoCount(feedback)).toBeLessThan(ECHO_CAP);
    expect(echoSpacing(time)).toBeGreaterThan(ECHO_SPACING[0]);
    expect(echoSpacing(time)).toBeLessThan(ECHO_SPACING[1]);
    expect(echoFade(feedback, time) ** echoCount(feedback)).toBeLessThan(0.5);
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
    expect(echoAlpha(0.5, -0.5, 1)).toBeCloseTo(weighed(0.5, 0.5, ECHO_CEILING), 12);
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

  // P285: tape's, and the first pass that moves on the picture's own clock.
  it("swims the field on its own clock and grains the ink, on two terms under their own ceilings", () => {
    expect(LOOKS.wobble.at).toBe("pass");
    expect(LOOKS.wobble.terms).toEqual({ wobble: "turn", grain: "turn" });
    // Two more shares weighed the one way, each under a ceiling of its own (0283): what a swim may
    // take of the picture's width is not what a grain may take of its ink.
    expect(wobbleSwim(1, 1)).toBe(WOBBLE_CEILING);
    expect(wobbleSwim(0, 1)).toBe(0);
    expect(wobbleSwim(1, 0)).toBe(0);
    expect(wobbleSwim(0.5, 0.5)).toBeCloseTo(weighed(0.5, 0.5, WOBBLE_CEILING), 12);
    expect(grainBite(1, 1)).toBe(GRAIN_CEILING);
    expect(grainBite(1, 0)).toBe(0);
    expect(grainBite(0, 1)).toBe(0);
    expect(grainBite(0.5, 0.5)).toBeCloseTo(weighed(0.5, 0.5, GRAIN_CEILING), 12);
    expect(grainBite(2, 2)).toBe(GRAIN_CEILING);
    // A band swims further than nothing and never as far as the echoes step, because the swim is
    // read against the row above it and a band slid past its neighbour is a tear (0282).
    expect(WOBBLE_CEILING).toBeGreaterThan(0);
    expect(WOBBLE_CEILING).toBeLessThan(ECHO_SPACING[0]);
    expect(GRAIN_CEILING).toBeGreaterThan(0);
    expect(GRAIN_CEILING).toBeLessThan(1);
    // The slide is a sine of the deck's clock, bounded either side, and offset down the picture so
    // the bands are never all slid the same way at once — which is what makes it a swim.
    for (const clock of [0, 0.37, 12.5, 1000]) {
      for (const slice of [0, 7, 63]) {
        const slid = wobbleSlide(clock, slice, 64);
        expect(slid).toBeGreaterThanOrEqual(-1);
        expect(slid).toBeLessThanOrEqual(1);
      }
    }
    expect(wobbleSlide(0, 0, 64)).toBeCloseTo(1, 12);
    expect(wobbleSlide(0, 32, 64)).not.toBeCloseTo(wobbleSlide(0, 0, 64), 2);
    // One whole turn of the clock is where the swim started, and a stopped clock stands still: a
    // halted yard hands the same second twice and the picture does not move (0144).
    expect(wobbleSlide(1 / WOBBLE_HZ, 5, 64)).toBeCloseTo(wobbleSlide(0, 5, 64), 10);
    // Slow enough to read as wow and not as flutter, and under two waves down the field.
    expect(WOBBLE_HZ).toBeGreaterThan(0.3);
    expect(WOBBLE_HZ).toBeLessThan(1.5);
    expect(WOBBLE_WAVES).toBeGreaterThan(0.5);
    expect(WOBBLE_WAVES).toBeLessThan(2);
    // At tape's own declared defaults and ranges (src/audio/effects/tape.ts, spelt out here for the
    // reason the bloom's are) the picture swims and grains, and neither term is at an end of its
    // band: a tape standing at its defaults is visibly a tape and a long way off the most this pass
    // can do.
    const wow = normalize(0.35, 0, 1, "linear");
    const hiss = normalize(0.25, 0, 1, "linear");
    expect(wobbleSwim(1, wow)).toBeGreaterThan(0);
    expect(wobbleSwim(1, wow)).toBeLessThan(WOBBLE_CEILING);
    expect(grainBite(1, hiss)).toBeGreaterThan(0);
    expect(grainBite(1, hiss)).toBeLessThan(GRAIN_CEILING);
  });
  // P286: filter's, and the one pass that replaces the field rather than laying anything over it.
  it("softens the field on the cutoff's own turn, and stands open at the top of the knob", () => {
    expect(LOOKS.soften.at).toBe("pass");
    expect(LOOKS.soften.terms).toEqual({ radius: "turn" });
    // The band is stated open end last, because the term is the cutoff's own turn and a cutoff
    // reads that way round: shut at the bottom of the knob and wide open at the top.
    expect(SOFTEN_SCALE[0]).toBeGreaterThan(0);
    expect(SOFTEN_SCALE[0]).toBeLessThan(SOFTEN_SCALE[1]);
    // And it closes at the field itself: a filter standing open is a wire, and the band says so
    // rather than leaving the entry's own presence to say it (0202).
    expect(SOFTEN_SCALE[1]).toBe(1);
    // Wider at its shut end than the halo the bloom draws, because what this pass says is that the
    // fine detail is gone and not that there is a room around it (0280).
    expect(SOFTEN_SCALE[0]).toBeGreaterThan(BLOOM_SCALE[1]);
    // A filter standing open, and one the picture has not travelled to yet, are both the field at
    // the whole of itself — the one draw this pass makes when it makes no difference.
    expect(softenScale(1, 1)).toBe(1);
    expect(softenScale(0, 0)).toBe(1);
    expect(softenScale(-1, 0)).toBe(1);
    // And shut, it is the band's own other end: the blocks' walk out from the field's own size and
    // never the bloom's weighed share, because this pass lays nothing over the picture (0281).
    expect(softenScale(2, -1)).toBeCloseTo(SOFTEN_SCALE[0], 12);
    expect(softenScale(0.5, 0)).toBeCloseTo(1 + (SOFTEN_SCALE[0] - 1) / 2, 12);
    // At filter's own declared range and default (src/audio/effects/filter.ts, spelt out here for
    // the reason the bloom's are) the picture is visibly softened and a long way off the most this
    // pass can do — and both numbers come off the one knob: over the top of its range a cutoff
    // falling raises how present the filter is heard to be *and* shrinks the copy, and under the
    // default the presence is already the whole of it and the radius goes on alone (0202).
    expect(heardAt(20_000)).toBe(0);
    expect(heardAt(200)).toBe(1);
    // Visibly softened at the default and a long way off the most this pass can do.
    const standing = softenScale(heardAt(1000), turnAt(1000));
    expect(standing).toBeGreaterThan(SOFTEN_SCALE[0]);
    expect(standing).toBeLessThan(0.75);
    expect(softenScale(heardAt(200), turnAt(200))).toBeLessThan(standing);
    expect(softenScale(heardAt(20_000), turnAt(20_000))).toBe(1);
  });

  // P287: eq's, and the one look declared whole in a file of its own (0287).
  it("stands one band down the field on the frequency, as deep as the Q, lifting or cutting", () => {
    expect(LOOKS.band.at).toBe("pass");
    expect(LOOKS.band.terms).toEqual({ position: "turn", lift: "turn", width: "turn" });
    // The depth band is stated widest first, because the term is the Q's own turn and a Q reads
    // that way round — and neither end is the whole field or a scratch across it.
    expect(BAND_DEPTH[0]).toBeLessThan(1);
    expect(BAND_DEPTH[1]).toBeGreaterThan(0);
    expect(BAND_DEPTH[0]).toBeGreaterThan(BAND_DEPTH[1]);
    for (const width of [0, 0.25, bandTurn(1), 1]) {
      expect(bandDepth(width)).toBeLessThanOrEqual(BAND_DEPTH[0]);
      expect(bandDepth(width)).toBeGreaterThanOrEqual(BAND_DEPTH[1]);
    }
    // And the middle stands inside the picture wherever the frequency is, low at the bottom: a turn
    // of nothing is the bottom edge and one of the whole of it the top, because the picture's own y
    // runs the other way from every spectrum anyone has looked at. A kilohertz — eq's own default,
    // spelt out here for the reason the bloom's is — is a little under halfway up its log range.
    expect(bandCentre(0)).toBe(1);
    expect(bandCentre(1)).toBe(0);
    expect(bandCentre(2)).toBe(0);
    expect(bandCentre(turnAt(1_000))).toBeCloseTo(1 - turnAt(1_000), 12);
    expect(bandCentre(turnAt(1_000))).toBeLessThan(bandCentre(turnAt(200)));
    // Which way it goes is the gain's own turn about the middle of its own range, and how hard it
    // is drawn is the presence — read for a direction and never for a second share, so a cut is the
    // exact opposite of a lift and not a quieter one.
    expect([6, 0, -6].map((gain) => bandLifts(gainTurn(gain)))).toEqual([true, true, false]);
    expect(BAND_CEILING).toBeGreaterThan(0);
    expect(BAND_CEILING).toBeLessThan(1);
    expect(bandAlpha(1)).toBe(BAND_CEILING);
    expect(bandAlpha(2)).toBe(BAND_CEILING);
    expect(bandAlpha(0.5)).toBeCloseTo(BAND_CEILING / 2, 12);
    // The taper is stepped and shallower every step, the outermost slice the band's whole depth and
    // the innermost a share of it — which is what softens an edge with draws of the field alone.
    expect(BAND_EDGES).toBeGreaterThan(2);
    expect(bandTaper(0)).toBe(1);
    for (let edge = 1; edge < BAND_EDGES; edge++) {
      expect(bandTaper(edge)).toBeLessThan(bandTaper(edge - 1));
      expect(bandTaper(edge)).toBeGreaterThan(0);
    }
    // At eq's own declared silence and full (src/audio/effects/eq.ts, 0202) a band standing at its
    // default draws nothing at all — a peaking EQ ships flat — and one lifted by six decibels is
    // visibly a band and a long way off the most this pass can do. Both readings come off the one
    // knob: how far the gain stands from flat is the presence, and which side of it, the term — so
    // a cut of six is drawn exactly as hard as a lift of six, the other way round.
    expect(bandAlpha(gainHeard(0))).toBe(0);
    expect(bandAlpha(gainHeard(6))).toBeGreaterThan(0);
    expect(bandAlpha(gainHeard(6))).toBeLessThan(BAND_CEILING);
    expect(bandAlpha(gainHeard(-6))).toBe(bandAlpha(gainHeard(6)));
    expect(bandLifts(gainTurn(-6))).not.toBe(bandLifts(gainTurn(6)));
  });

  // P288: compressor's, and the eighth look to take a slot in the chain (0288).
  it("closes the field's range up between a floor and a ceiling, the floor always the lower", () => {
    expect(LOOKS.squash.at).toBe("pass");
    expect(LOOKS.squash.terms).toEqual({ floor: "turn", ceiling: "turn" });
    // The floor is a share weighed under a ceiling of its own, because the term is the Ratio's own
    // turn and one to one is no compression at all; the ceiling's band is stated open end last,
    // because the term is the Threshold's and a threshold nothing reaches is a wire. Neither reaches
    // the other, and neither closes the range to nothing.
    expect(SQUASH_FLOOR).toBeGreaterThan(0);
    expect(SQUASH_FLOOR).toBeLessThan(SQUASH_TOP[0]);
    expect(SQUASH_TOP[1]).toBe(1);
    expect(SQUASH_TOP[0]).toBeGreaterThan(0);
    expect(SQUASH_TOP[0]).toBeLessThan(1);
    // **The floor stays under the ceiling at every input there is**, which is the one thing this
    // pair may never do — a floor at or over the ceiling is a picture with no range left in it at
    // all, and the two bands are what keep them apart rather than a clamp at the draw.
    for (const presence of [0, 0.25, 0.5, 1]) {
      for (const floor of [0, 0.5, ratioTurn(4), 1]) {
        for (const ceiling of [0, 0.5, thresholdTurn(-24), 1]) {
          expect(squashFloor(presence, floor)).toBeLessThan(squashCeiling(presence, ceiling));
          expect(squashFloor(presence, floor)).toBeGreaterThanOrEqual(0);
          expect(squashCeiling(presence, ceiling)).toBeLessThanOrEqual(1);
        }
      }
    }
    // A harder ratio lays a higher floor and a lower threshold brings the ceiling further down, so
    // the range between them closes both ways.
    expect(squashFloor(1, ratioTurn(20))).toBeGreaterThan(squashFloor(1, ratioTurn(4)));
    expect(squashCeiling(1, thresholdTurn(-60))).toBeLessThan(squashCeiling(1, thresholdTurn(-24)));
    // And a compressor the picture has not travelled to yet is the field at the whole of itself:
    // the floor walks out from nothing and the ceiling from one, which is the blocks' walk and not
    // the bloom's weighed share.
    expect(squashFloor(0, 1)).toBe(0);
    expect(squashCeiling(0, 0)).toBe(1);
    // At the compressor's own declared silence — one to one, which is where its presence stands at
    // nought too (0202) — the pass lays no floor at all whichever of the two numbers is asked, and
    // at its default of four to one it is visibly squashing and a long way off the most it can do.
    expect(squashFloor(ratioHeard(1), ratioTurn(1))).toBe(0);
    const standing = squashFloor(ratioHeard(4), ratioTurn(4));
    expect(standing).toBeGreaterThan(0);
    expect(standing).toBeLessThan(SQUASH_FLOOR);
    expect(squashCeiling(ratioHeard(4), thresholdTurn(-24))).toBeLessThan(1);
  });

  // P289: shift's, and the ninth look to take a slot in the chain (0289).
  it("stands a second picture at the interval's own ratio, at a share of the first", () => {
    expect(LOOKS.double.at).toBe("pass");
    // The zoom is the interval's own semitones and not a turn of its knob, because how far apart
    // two voices stand is the musical distance; the amount is the Mix's turn, weighed under a
    // ceiling of its own.
    expect(LOOKS.double.terms).toEqual({ zoom: "value", amount: "turn" });
    // The ratio is a doubling an octave: the unison stands the second picture exactly on the first,
    // an octave up draws it twice the size, and **a downward interval zooms it in under one** —
    // which is the half of this the band's shut end holds.
    expect(doubleZoom(0)).toBe(1);
    expect(doubleZoom(12)).toBe(2);
    expect(doubleZoom(-12)).toBe(0.5);
    expect(doubleZoom(-12)).toBeLessThan(1);
    expect(doubleZoom(-1)).toBeLessThan(1);
    expect(doubleZoom(-1)).toBeGreaterThan(DOUBLE_ZOOM[0]);
    // And the band is the two octaves the entry declares either way, closed at both ends: a lane
    // that walked the term past its own knob still draws a picture the field's own size bounds.
    expect(DOUBLE_ZOOM).toEqual([1 / 4, 4]);
    for (const semitones of [-96, -24, -7, 0, 7, 24, 96]) {
      expect(doubleZoom(semitones)).toBeGreaterThanOrEqual(DOUBLE_ZOOM[0]);
      expect(doubleZoom(semitones)).toBeLessThanOrEqual(DOUBLE_ZOOM[1]);
    }
    // The amount stays inside its own band at every input there is, and never reaches the whole of
    // itself: a second picture laid at one replaces the first everywhere it lands, which is a
    // transposition and not a doubling.
    expect(DOUBLE_CEILING).toBeGreaterThan(0);
    expect(DOUBLE_CEILING).toBeLessThan(1);
    for (const presence of [0, 0.25, 0.5, 1]) {
      for (const amount of [0, mixTurn(0.5), 1]) {
        expect(doubleAmount(presence, amount)).toBeGreaterThanOrEqual(0);
        expect(doubleAmount(presence, amount)).toBeLessThanOrEqual(DOUBLE_CEILING);
      }
    }
    expect(doubleAmount(1, 1)).toBe(DOUBLE_CEILING);
    // **The Mix is read twice and both readings stand at nought in the same place** (0202): a shift
    // heard as nothing lays no second picture whichever number is asked, and one the picture has
    // not travelled to yet lays none either.
    expect(doubleAmount(mixHeard(0), mixTurn(0))).toBe(0);
    expect(doubleAmount(0, 1)).toBe(0);
    // At its own default the double is visibly there and a long way off the most it can do, and a
    // wetter mix lays more of it.
    const standing = doubleAmount(mixHeard(0.5), mixTurn(0.5));
    expect(standing).toBeGreaterThan(0);
    expect(standing).toBeLessThan(DOUBLE_CEILING);
    expect(doubleAmount(mixHeard(1), mixTurn(1))).toBeGreaterThan(standing);
  });

  // P290: scatter's, and the last look to gain a term — the pass itself landed at 0269 and is cut
  // through the slices rather than drawn in the chain (0290).
  it("breaks the field into whole pieces, as big as the span is long", () => {
    expect(LOOKS.shatter.at).toBe("cut");
    // Both terms are turns of their own knobs: how many pieces are drawn from elsewhere is the
    // Odds, and how big each piece is, is the Span.
    expect(LOOKS.shatter.terms).toEqual({ share: "turn", size: "turn" });
    // The count runs from eighths at the shut end of the span to halves at the open one, and stays
    // inside that band at every reading there is, a lane past either end of the knob included.
    expect(shatterBands(0)).toBe(SHATTER_BANDS[0]);
    expect(shatterBands(1)).toBe(SHATTER_BANDS[1]);
    for (const size of [-1, 0, 0.2, spanTurn(0.12), 0.5, 0.9, 1, 2]) {
      expect(shatterBands(size)).toBeGreaterThanOrEqual(SHATTER_BANDS[1]);
      expect(shatterBands(size)).toBeLessThanOrEqual(SHATTER_BANDS[0]);
      // And it is a whole count of pieces at every one of them: there is no half a piece of a
      // picture, and a count that stepped would be a band cut at a fraction of a slice.
      expect(shatterBands(size)).toBe(Math.round(shatterBands(size)));
    }
    // A longer window is a longer piece and never a shorter one, all the way along the knob.
    const walked = [0, 0.25, 0.5, 0.75, 1].map((size) => shatterBands(size));
    for (let at = 1; at < walked.length; at++) {
      expect(walked[at] ?? 0).toBeLessThanOrEqual(walked[at - 1] ?? 0);
    }
    expect(new Set(walked).size).toBeGreaterThan(1);
    // At its own default the span breaks the field into more than the fewest pieces and fewer than
    // the most, so the picture reads as broken at either end of the knob from there.
    const standingSize = shatterBands(spanTurn(0.12));
    expect(standingSize).toBeGreaterThan(SHATTER_BANDS[1]);
    expect(standingSize).toBeLessThan(SHATTER_BANDS[0]);
    // However big the pieces are, never more than half of them are drawn from somewhere else: a
    // picture drawn entirely from elsewhere is a picture of nothing (0250, 0269).
    for (const size of [0, 0.5, 1]) {
      expect(shatterPieces(1, size)).toBeLessThanOrEqual(SHATTER_CEILING * shatterBands(size));
      expect(shatterPieces(1, size)).toBeGreaterThanOrEqual(1);
    }
    // And a coarse count cannot honour a fine share: at the open end the picture is two pieces, so
    // a rack asking for a fifth of it drawn from elsewhere breaks nothing — a piece is drawn whole
    // or not at all (0269) and half the picture is the most there may be (0250), which together
    // leave a share smaller than the pieces are with nothing to spend itself on. The shut end,
    // where the pieces are eighths, spends the same share on one of them.
    expect(shatterPieces(0.4, 1)).toBe(0);
    expect(shatterPieces(0.4, 0)).toBe(2);
    expect(shatterPieces(1, 1)).toBe(1);
  });
});
