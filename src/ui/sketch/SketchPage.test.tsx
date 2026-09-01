import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PLAYER_GROUP_LABELS } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { INSTRUMENT_ROUTE, routeOf, SKETCH_ROUTE } from "@/ui/routes";
import { SKETCH_BLENDS } from "@/ui/sketch/sketchBlends";
import { SKETCH_PARTS_LIST, SKETCH_SURFACES, SketchPage } from "@/ui/sketch/SketchPage";
import {
  SKETCH_ARRANGE,
  SKETCH_ARRANGE_ODDS,
  SKETCH_BEDS,
  SKETCH_CAST,
  SKETCH_GROUND,
  SKETCH_GROUND_STANDING,
  SKETCH_REACH,
  SKETCH_SOURCE_BEDS,
} from "@/ui/sketch/sketchWalk";

/**
 * The bench is two lists of arguments drawn out of the same primitives the instrument is, so
 * rendering it is the cheapest check that none of them has gone stale against a token, a type
 * utility or a shadcn regeneration. Static markup, so it needs no DOM.
 */
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

describe("the sketch route", () => {
  it("resolves its own hash and leaves everything else on the instrument", () => {
    expect(routeOf(SKETCH_ROUTE)).toBe("sketch");
    expect(routeOf("#/sketches")).toBe("instrument");
    expect(routeOf("")).toBe("instrument");
  });
});

describe("SketchPage links", () => {
  /** A bare `#cast` is a route change: it leaves `#/sketch` and the bench unmounts (0054). */
  it("keeps every nav link on the sketch route and the wordmark on the way home", () => {
    const hrefs = [...markup.matchAll(/href="([^"]*)"/gu)].map(([, href]) => href);
    expect(hrefs).toContain(INSTRUMENT_ROUTE);
    const nav = hrefs.filter((candidate) => candidate !== INSTRUMENT_ROUTE);
    expect(nav).not.toHaveLength(0);
    for (const href of nav) expect(href).toBe(SKETCH_ROUTE);
  });
});

describe("SketchPage", () => {
  /**
   * Off the two lists and never off a list written out here: an entry's id is its identity (0247),
   * so a sketch added without an entry — or an entry that renders no section — has to fail rather
   * than pass because the count in a test still matches (0254).
   */
  it("mounts every entry of both benches", () => {
    const entries = [...SKETCH_SURFACES, ...SKETCH_PARTS_LIST];
    expect(SKETCH_SURFACES).not.toHaveLength(0);
    expect(SKETCH_PARTS_LIST).not.toHaveLength(0);
    for (const entry of entries) {
      expect(markup, `${entry.id} has an entry and no section`).toContain(`id="${entry.id}"`);
      expect(markup, `${entry.id} has an entry and no nav link`).toContain(
        `data-section="${entry.id}"`,
      );
    }
    // One id apiece across both lists: the nav scrolls to `getElementById`, so a repeat would
    // silently take a hand to the first of the two.
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws the cast as four blends of one cast", () => {
    for (const blend of SKETCH_BLENDS) expect(markup).toContain(`data-blend="${blend.key}"`);
  });

  /**
   * The one question a blend pad exists to ask is whether a hand can find the character it wants,
   * and a picture whose corners are unlabelled cannot be asked it. So the names are inside each
   * picture — every one of the six, in every one of the four, never a legend underneath (0252).
   */
  it("names every one of the six inside every blend's own picture", () => {
    for (const blend of SKETCH_BLENDS) {
      const picture = pictureOf(`data-blend="${blend.key}"`);
      for (const name of SKETCH_CAST) {
        expect(picture, `${blend.key} draws no name for ${name}`).toMatch(
          new RegExp(`<text[^>]*>[^<]*${name}`, "u"),
        );
      }
    }
  });
});

/** The machine's own half of the naming rule: a hopper, a drum of blades, and a heap of chips. */
describe("SketchPage draws the mulcher as a mulcher", () => {
  /**
   * The blades and the planted grounds are the chipper's corners, so 0252's rule reaches them:
   * the name is inside the machine's own picture, never in a legend beside it. A drum whose
   * blades are unlabelled is six wedges, and which wedge is `stutter` is then a count from the
   * top — the exact reading the pad's names were added to end.
   */
  it("names every blade and every planted ground inside the chipper's own picture", () => {
    const machine = pictureOf('data-machine="chipper"');
    for (const name of [...SKETCH_CAST, ...SKETCH_BEDS.map((bed) => bed.name)]) {
      expect(machine, `the chipper draws no name for ${name}`).toMatch(
        new RegExp(`<text[^>]*>[^<]*${name}`, "u"),
      );
    }
  });

  /**
   * The pile's half of the same rule. A heap has no corners, so each wood names itself where its
   * own chips are, and the sorts that push it are named for the character rather than the knob.
   */
  it("names every wood in the pile and in the sorts that push it", () => {
    const heap = markup.indexOf('data-machine="chips"');
    const sorts = markup.indexOf('data-sorts="chips"');
    expect(heap, "the chips sketch draws no pile").not.toBe(-1);
    expect(sorts, "the chips sketch offers no sorts").toBeGreaterThan(heap);
    const pile = markup.slice(heap, sorts);
    for (const name of SKETCH_CAST) {
      expect(pile, `the pile draws no name for ${name}`).toContain(name);
      // By the row's own attribute and not by a slice to the end of the markup: the bench grows a
      // second list of sketches below this one (0254), and a tail slice would then let one of
      // those answer for a sort this one never drew.
      expect(markup, `no sort is named for ${name}`).toContain(`data-wood="${name}"`);
    }
  });
});

describe("SketchPage weighs the drum", () => {
  /**
   * The drum is the blend of 0252, so the six numbers on it are shares of one mix and not six
   * independent reaches — they are drawn in the pad's own readout, where a number beside a name
   * has always meant a share, and six reaches in that typography would sum to anything.
   */
  it("draws the drum's blades as shares of one mix", () => {
    const machine = pictureOf('data-machine="chipper"');
    const drawn = SKETCH_CAST.map((name) => {
      const found = new RegExp(`<text[^>]*>${name}[^0-9]*([0-9]+)`, "u").exec(machine);
      expect(found, `the drum draws no weight for ${name}`).not.toBeNull();
      return Number(found?.[1]);
    });
    // Six shares of one, each rounded to a whole number where it is drawn, so the sum lands
    // within a point or two of a hundred rather than on it.
    const whole = drawn.reduce((sum, one) => sum + one, 0);
    expect(whole).toBeGreaterThan(96);
    expect(whole).toBeLessThan(104);
  });
});

describe("SketchPage reads nothing it must not", () => {
  /**
   * The one thing a sketch must not do. `src/ui/sketch` reads no store and sends no command, so
   * nothing on the bench can be showing a real deck's numbers — which is checked here by the
   * import list rather than the markup, since a store read leaves no trace in static HTML.
   */
  it("is drawn out of the instrument's own controls", () => {
    expect(markup).toContain('data-slot="switch"');
    expect(markup).toContain('data-slot="slider"');
  });

  /**
   * And the import list is where the store read would be. `scripts/arch` lets any `src/ui` file
   * import `src/state`, `src/app` and `src/audio` — which is right for the tier and wrong for this
   * one directory, where 0247 forbids a wire outright — so the narrower rule is stated here, over
   * the whole tree including the parts (0254).
   */
  it("imports no store, no command and no graph anywhere on the bench", () => {
    const root = import.meta.dirname;
    const files = readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) =>
      entry.isFile(),
    );
    expect(files.length, "the bench has no files to read").toBeGreaterThan(1);
    for (const file of files) {
      const held = join(file.parentPath, file.name);
      const source = readFileSync(held, "utf8");
      // Every specifier, resolved, rather than the three aliases spelled out: a relative wire out
      // of the bench and up into the store — a shape this repo writes elsewhere — reads nothing
      // like the alias and would walk straight past a check on the alias alone. (Written without
      // an example path, because this case reads its own source and would find one.)
      for (const found of source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/gu)) {
        const spec = found[1] ?? "";
        const path = spec.startsWith("@/")
          ? spec.slice(2)
          : spec.startsWith(".")
            ? relative(join(root, "../.."), resolve(dirname(held), spec))
            : "";
        for (const tier of ["state", "app", "audio"]) {
          expect(path.startsWith(`${tier}/`), `${file.name} imports ${spec}`).toBe(false);
        }
      }
    }
  });
});

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
