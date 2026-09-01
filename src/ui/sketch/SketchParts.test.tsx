/**
 * The parts bench's own half of the naming rule (0252, 0254, 0255): one fold of the card at a time,
 * each picture naming its corners and stating the amount beside each name inside its own close. Out
 * of `SketchPage.test.tsx` at the 400-line cap rather than shaved: that file mounts the bench and
 * checks the two lists are one bench, and this one checks what the second list draws.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PLAYER_GROUP_LABELS } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PLAYER_PLAYS_LABEL } from "@/lib/copySongs";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { SketchPage } from "@/ui/sketch/SketchPage";
import {
  SKETCH_ARRANGE,
  SKETCH_ARRANGE_ODDS,
  SKETCH_BEDS,
  SKETCH_GROUND,
  SKETCH_GROUND_STANDING,
  SKETCH_REACH,
  SKETCH_SONG_STANDING,
  SKETCH_SONGS,
  SKETCH_SOUND,
  SKETCH_SOURCE_BEDS,
} from "@/ui/sketch/sketchWalk";

/** The whole bench, rendered once: every case here reads one region out of the one markup. */
const markup = renderToStaticMarkup(<SketchPage />);

/**
 * One picture of the bench, bounded by its own close so a neighbour cannot answer for it. A
 * picture that drew nothing at all leaves `indexOf` at -1, and a slice from there is every later
 * sketch's markup rather than nothing — which is exactly how an unlabelled picture passes.
 */
function pictureOf(attribute: string): string {
  const opens = markup.indexOf(attribute);
  expect(opens, `${attribute} is not mounted`).not.toBe(-1);
  const closes = markup.indexOf("</svg>", opens);
  expect(closes, `${attribute} draws no picture`).toBeGreaterThan(opens);
  return markup.slice(opens, closes);
}

/** The parts bench: one fold of the card at a time, and the fold every other is read against. */
describe("SketchPage argues the walk three ways", () => {
  /**
   * The naming rule reaching the parts. The roll is the one reading of the three where the jump's
   * amounts are somewhere on the picture rather than numbers in a drawer, and an unlabelled step
   * is a line — so each amount names itself on the mark that is the thing, inside the roll's own
   * picture and never in a legend beside it (0252, 0254).
   */
  it("names the distance, the bias and the home inside the roll's own picture", () => {
    // Bounded by the roll's own close, so the strip and the ring above it cannot answer for it.
    const roll = pictureOf('data-reading="roll"');
    // In the card's own words for the three, never three lowercase ones written on the bench: the
    // sketch's claim is that these are *the card's* amounts made visible (principle 1).
    for (const name of [
      PLAYER_KNOB_LABELS.distance,
      PLAYER_KNOB_LABELS.bias,
      PLAYER_KNOB_LABELS.home,
    ]) {
      expect(roll, `the roll draws no name for ${name}`).toMatch(
        new RegExp(`<text[^>]*>${name}`, "u"),
      );
    }
    // And all three amounts are read off the landings rather than written beside them: a reach the
    // walk does not obey is a legend, which is the thing this reading exists to stop being.
    expect(roll).toContain(`${PLAYER_KNOB_LABELS.distance} ${SKETCH_REACH.distance}`);
    expect(roll).toContain(
      `${PLAYER_KNOB_LABELS.bias} ${Math.round(SKETCH_REACH.bias * 100) / 100}`,
    );
    expect(roll).toContain(`${PLAYER_KNOB_LABELS.home} ${Math.round(SKETCH_REACH.home * 100)}%`);
  });
});

describe("SketchPage argues the ground two ways", () => {
  /**
   * The naming rule reaching the ground. A chip a hand has just dragged is the one corner a legend
   * cannot keep up with, so each planted ground names itself inside the picture it is drawn in —
   * the source, which is the picture that has them (0252, 0255).
   */
  it("names every planted ground inside the source's own picture", () => {
    const source = pictureOf('data-ground="source"');
    for (const bed of SKETCH_BEDS) {
      expect(source, `the source draws no name for ${bed.name}`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${bed.name}`, "u"),
      );
    }
  });

  /** And the deck's own corners: every bed of the source names itself on its card. */
  it("names every bed of the source inside the deck's own picture", () => {
    const deck = pictureOf('data-ground="deck"');
    for (let bed = 0; bed < SKETCH_SOURCE_BEDS; bed += 1) {
      expect(deck, `the deck draws no card for bed ${bed}`).toMatch(
        new RegExp(`<text[^>]*>${PLAYER_KNOB_LABELS.bed} ${bed}<`, "u"),
      );
    }
  });
});

describe("SketchPage draws the ground's five amounts", () => {
  /**
   * In the card's own words *and* at the card's own numbers. The label alone is not the claim: a
   * deck drawing `Distance 7` beside a fixture of 24 names the amount and states something else,
   * which is the legend this reading exists to stop being (0184, 0252).
   */
  it("draws the five ground amounts at the amounts the fixture holds", () => {
    const deck = pictureOf('data-ground="deck"');
    expect(deck).toContain(`>${PLAYER_KNOB_LABELS.bedEvery} ${SKETCH_GROUND.every}<`);
    // In sixteenths of the loop and never in whole beds, which is what src/lib/playerBed.ts is
    // emphatic about: the deck is drawn in beds, so this is the one number on it that would be
    // silently restated if the picture spent it as cards.
    expect(deck).toContain(`>${PLAYER_KNOB_LABELS.bedDistance} ${SKETCH_GROUND.distance}<`);
    expect(deck).toContain(`>${PLAYER_KNOB_LABELS.bedBias} ${SKETCH_GROUND.bias} `);
    expect(deck).toContain(
      `>${PLAYER_KNOB_LABELS.bedHome} ${Math.round(SKETCH_GROUND.home * 100)}% to ${PLAYER_KNOB_LABELS.bed} ${SKETCH_GROUND.bed}<`,
    );
  });

  /**
   * And both pictures light the one window the loop is reading, which is the pair's whole claim —
   * two readings of one ground rather than two grounds. Read off each picture's own mark, since a
   * picture that drew the lit window in the other one's markup would pass a slice of the page.
   */
  it("lights the standing ground in both of its pictures, part-way into a bed", () => {
    expect(pictureOf('data-ground="source"')).toContain('data-standing="source"');
    expect(pictureOf('data-ground="deck"')).toContain('data-standing="deck"');
    // Part-way into one, not on a boundary: a fixture that stood on a whole bed would draw a
    // crawl that never crawls, and the readout would say so while the pictures did not.
    expect(SKETCH_GROUND_STANDING.into, "the ground stands on a whole bed").not.toBe(0);
    expect(markup).toContain(
      `${PLAYER_GROUP_LABELS.ground} is standing on ${PLAYER_KNOB_LABELS.bed} ${SKETCH_GROUND_STANDING.bed}, ${SKETCH_GROUND_STANDING.into} sixteenths in`,
    );
  });
});

/**
 * The three the tray draws: the attribute its own hundred of pips carries, the word the card gives
 * it, and the share the sixteen passes rolled. Written once and read by both cases below, because
 * a table of the three repeated per case is the drift the naming rule exists to stop.
 */
const TRAY_ODDS: readonly { key: string; name: string; share: number }[] = [
  { key: "chance", name: PLAYER_KNOB_LABELS.arrangeChance, share: SKETCH_ARRANGE_ODDS.chance },
  { key: "keep", name: PLAYER_KNOB_LABELS.arrangeKeep, share: SKETCH_ARRANGE_ODDS.keep },
  { key: "return", name: PLAYER_KNOB_LABELS.arrangeReturn, share: SKETCH_ARRANGE_ODDS.return },
];

describe("SketchPage argues the arrangement two ways", () => {
  /**
   * The ladder's half: the three amounts that shape a part are named on the pass that is the
   * thing, inside the ladder's own picture. An unlabelled staircase is a staircase — which of its
   * three dimensions is `Apart` would then be a guess.
   */
  it("names the grow, the span and the apart at the amounts the passes hold", () => {
    const ladder = pictureOf('data-arrange="ladder"');
    // Each amount read back off the sixteen passes, the way the roll's three are read off the
    // landings: a ladder drawing a Span the widest rung does not have is a legend.
    const climbs = SKETCH_ARRANGE.map((pass, index) => ({ pass, index })).filter(
      ({ pass, index }) => index > 0 && pass.parts > (SKETCH_ARRANGE[index - 1]?.parts ?? 0),
    );
    const grow = (climbs[1]?.index ?? 0) - (climbs[0]?.index ?? 0);
    const drawn: readonly [string, number][] = [
      [PLAYER_KNOB_LABELS.arrangeGrow, grow],
      [PLAYER_KNOB_LABELS.arrangeSpan, Math.max(...SKETCH_ARRANGE.map((pass) => pass.span))],
      [PLAYER_KNOB_LABELS.arrangeApart, Math.max(...SKETCH_ARRANGE.map((pass) => pass.apart))],
    ];
    for (const [name, amount] of drawn) {
      expect(ladder, `the ladder draws no ${name} of ${amount}`).toContain(`>${name} ${amount}<`);
    }
  });

  /**
   * The tray's half, and the one thing a tray of odds can get wrong: a share drawn beside a name
   * that the hundred pips under it do not agree with. Each hundred is counted out of the markup
   * itself, so a picture that rounded its label one way and filled its pips another fails.
   */
  it("fills each hundred pips to the share its own name states", () => {
    const tray = pictureOf('data-arrange="tray"');
    for (const { key, name, share } of TRAY_ODDS) {
      const lit = Math.round(share * 100);
      expect(tray, `the tray draws no name for ${name}`).toContain(`>${name} ${lit}%<`);
      const opens = tray.indexOf(`data-odds="${key}"`);
      expect(opens, `the tray has no hundred for ${key}`).not.toBe(-1);
      const ends = tray.indexOf("</g>", opens);
      const hundred = tray.slice(opens, ends === -1 ? undefined : ends);
      // A hundred pips and not ninety: an odds drawn out of anything else is a bar chart, and the
      // whole of what this reading buys over one is that a hand can count the pips.
      expect([...hundred.matchAll(/<circle/gu)], `${key} is not a hundred pips`).toHaveLength(100);
      expect([...hundred.matchAll(/class="fill-primary"/gu)]).toHaveLength(lit);
    }
  });
});

/**
 * One region of the bench that is not a picture — a fold drawn as the dials it actually is — bounded
 * by the region that follows it rather than by an `</svg>` it has none of. The same shape the pile's
 * own slice takes, and for its reason: a slice to the end of the markup would let a later sketch
 * answer for a dial this one never drew.
 */
function foldOf(opens: string, closes: string): string {
  const from = markup.indexOf(opens);
  const to = markup.indexOf(closes);
  expect(from, `${opens} is not mounted`).not.toBe(-1);
  expect(to, `${closes} does not follow ${opens}`).toBeGreaterThan(from);
  return markup.slice(from, to);
}

describe("SketchPage argues the song builder two ways", () => {
  /**
   * The naming rule reaching the tier over a part. A song is a name a hand typed and a count of
   * rounds, and a segment as long as its plays with neither on it is a coloured block — so both
   * readings draw the name and the amount beside it, inside their own picture (0252, 0255).
   */
  it("names every song and the rounds it plays inside both of its own pictures", () => {
    for (const reading of ["timeline", "tracker"]) {
      const picture = pictureOf(`data-songs="${reading}"`);
      for (const song of SKETCH_SONGS) {
        // Bounded by the song's own mark and not by the whole picture: a bar that labelled each
        // block with its neighbour's count passes a search of the picture, since the counts it
        // draws are the right multiset drawn against the wrong names.
        const opens = picture.indexOf(`data-song="${song.name}"`);
        expect(opens, `the ${reading} draws no ${song.name}`).not.toBe(-1);
        const ends = picture.indexOf("</g>", opens);
        const block = picture.slice(opens, ends === -1 ? undefined : ends);
        expect(block, `the ${reading} draws no name for ${song.name}`).toMatch(
          new RegExp(`<t(?:ext|span)[^>]*>[^<]*${song.name}`, "u"),
        );
        // And the count beside it, in the card's own word: a bar whose length is the plays and
        // whose label says a different number is the legend the rule exists to stop.
        expect(block, `the ${reading} draws no count for ${song.name}`).toContain(
          `>${PLAYER_PLAYS_LABEL} ${song.plays}<`,
        );
      }
    }
  });

  /**
   * And both draw the cursor, which is the pair's whole claim: what a song is, is a run and a
   * cursor over it. Inside one round of one song and never over the whole of it — a song that plays
   * four times is somewhere in those four, and a cursor that could not say where is a highlight.
   */
  it("stands the cursor in one round of one song, in both of its pictures", () => {
    expect(pictureOf('data-songs="timeline"')).toContain('data-standing="timeline"');
    expect(pictureOf('data-songs="tracker"')).toContain('data-standing="tracker"');
    const standing = SKETCH_SONG_STANDING.song;
    expect(SKETCH_SONGS, "the standing song is not one of the run").toContain(standing);
    // A song of one round could not tell a cursor in a round from a cursor on the song.
    expect(standing.plays).toBeGreaterThan(1);
    expect(pictureOf('data-songs="tracker"')).toContain(
      `>${SKETCH_SONG_STANDING.play + 1}/${standing.plays}<`,
    );
  });
});

/** The six the sound fold draws, in the order src/ui/PlayerDials.tsx draws them across. Written out
 *  rather than read off the sketch: what is being checked is that the sketch draws the card's fold,
 *  and a list read out of the sketch would agree with it however wrong both were. */
const SOUND_KNOBS = ["gate", "drop", "spark", "sparkLevel", "sparkDelay", "reverse"] as const;

describe("SketchPage argues the sound fold as one axis", () => {
  /**
   * The one thing an axis that claims to set six dials can get wrong: an amount drawn on the axis
   * that the honest dial beside it does not have. Each amount is read out of the picture and found
   * again in the fold, so the two cannot drift — and none of them is past the axis itself, which is
   * what makes them a share of one hand movement rather than six numbers.
   */
  it("names each of the six at one amount, on the axis and on the dial beside it", () => {
    const axis = pictureOf('data-sound="chew"');
    const dials = foldOf('data-sound="dials"', 'data-sound="chew"');
    const chew = Math.round(SKETCH_SOUND.chew * 100);
    for (const knob of SOUND_KNOBS) {
      const name = PLAYER_KNOB_LABELS[knob];
      const found = new RegExp(`>${name} ([0-9]+)<`, "u").exec(axis);
      expect(found, `the axis draws no amount for ${name}`).not.toBeNull();
      const at = Number(found?.[1]);
      expect(at, `${name} is drawn past the axis it rides`).toBeLessThanOrEqual(chew);
      // The two are one table today, so this cannot drift while that holds — which is the thing
      // it pins: a fold given amounts of its own is the axis's claim quietly abandoned.
      expect(dials, `the fold's own dial disagrees about ${name}`).toContain(`>${name} ${at}<`);
    }
  });
});

describe("SketchPage argues the timing fold as a grid", () => {
  /**
   * The picker's half. Every cell states the two amounts its own grid comes to — a landing struck
   * once per division, and a wait of what one division is worth in the loop's own sixteenths — so a
   * cell naming a grid and stating something else is the same legend, one fold along.
   */
  it("states each grid's repeats and rest at what the grid itself comes to", () => {
    const picker = pictureOf('data-timed="picker"');
    const cells = [...picker.matchAll(/data-grid="1\/([0-9]+)"/gu)];
    expect(cells.length, "the picker offers no grids").toBeGreaterThan(1);
    for (const [, divisions] of cells) {
      const many = Number(divisions);
      // Inside the cell's own group, the way the tray's hundreds are counted inside theirs: a
      // picker that drew 1/4's repeats in the 1/16 cell states every amount the picture owes and
      // states each of them against the wrong grid.
      const opens = picker.indexOf(`data-grid="1/${many}"`);
      const ends = picker.indexOf("</g>", opens);
      const cell = picker.slice(opens, ends === -1 ? undefined : ends);
      expect(cell, `1/${many} states no repeats`).toContain(
        `>${PLAYER_KNOB_LABELS.repeats} ${many}<`,
      );
      expect(cell, `1/${many} states no rest`).toContain(
        `>${PLAYER_KNOB_LABELS.rest} ${PLAYER_SLOTS / many}<`,
      );
    }
    // One grid standing, and the honest fold beside it holding the same two amounts: the picker is
    // an alternative to that fold and not a second fold with numbers of its own.
    expect([...picker.matchAll(/data-standing="picker"/gu)]).toHaveLength(1);
  });

  /**
   * And the two the grid cannot reach are named where it says it cannot reach them. A picker that
   * quietly dropped the burst would be arguing that the fold has four dials, which is the trade
   * being hidden rather than stated (principle 5, 0247).
   */
  it("names the burst and the vary the grid has no cell for, in the card's own unit", () => {
    const burst = `${PLAYER_KNOB_LABELS.burst} ${Math.round(SKETCH_SOUND.burst * 1000)}ms`;
    const vary = `${PLAYER_KNOB_LABELS.vary} ${Math.round(SKETCH_SOUND.vary * 1000)}ms`;
    expect(pictureOf('data-timed="picker"')).toContain(`${burst}, ${vary}`);
    const dials = foldOf('data-timed="dials"', 'data-timed="picker"');
    expect(dials, "the timing fold draws no burst").toContain(`>${burst}<`);
    expect(dials, "the timing fold draws no vary").toContain(`>${vary}<`);
  });
});
