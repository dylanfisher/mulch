import { afterEach, describe, expect, it, vi } from "vitest";

import { DURABLE_TEXT_MAX } from "./guards.ts";
import {
  mintYardName,
  YARD_ADJECTIVES,
  YARD_PLACE_NOUNS_BY_STAND,
  YARD_PLACE_WORDS_BY_REACH,
  YARD_AIR_NOUNS,
  YARD_AIR_WORDS,
  YARD_DETAILS,
  YARD_PLACE_NOUNS,
  YARD_PLACE_WORDS,
  YARD_PLANTS,
} from "./copyYard.ts";
import { SCENE_REACHES, SCENE_STANDS } from "./moireScene.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

/** How many draws from a pool of this many readings before a repeat is expected (0149). */
const drawsBeforeARepeat = (readings: number): number => Math.sqrt((Math.PI * readings) / 2);

/** The banks a name always draws from, and the banks it draws on a coin. */
const ALWAYS = [YARD_ADJECTIVES, YARD_PLANTS, YARD_PLACE_WORDS, YARD_PLACE_NOUNS];
const OPTIONAL = [YARD_AIR_WORDS, YARD_AIR_NOUNS, YARD_DETAILS];
/** The two families that are a joining word drawn against a noun (0324). */
const JOINED = [
  [YARD_PLACE_WORDS, YARD_PLACE_NOUNS],
  [YARD_AIR_WORDS, YARD_AIR_NOUNS],
] as const;
/** The joining words are whole words in a name, so they are read off it as words, not substrings. */
const JOINING_WORDS: ReadonlySet<readonly string[]> = new Set([YARD_PLACE_WORDS, YARD_AIR_WORDS]);
const saysAnEntryOf = (name: string, bank: readonly string[]): boolean =>
  JOINING_WORDS.has(bank)
    ? bank.some((entry) => name.split(" ").includes(entry))
    : bank.some((entry) => name.includes(entry));

describe("the banks a yard is named from", () => {
  it("outlasts far more than a session's worth of yards", () => {
    const readings = ALWAYS.reduce((total, bank) => total * bank.length, 1);
    expect(drawsBeforeARepeat(readings)).toBeGreaterThan(24);
    expect([YARD_ADJECTIVES.length, YARD_PLANTS.length]).toEqual([48, 48]);
  });

  // The banks that always speak have to fit inside the bound on durable text on their own, because
  // nothing gives way for them: only the optional ones do (`mintYardName`). With the place joined,
  // that is the longest joining word plus the longest noun of the place family (0324).
  it("keeps what always speaks inside the bound on durable text", () => {
    const longest = ALWAYS.map((bank) => Math.max(...bank.map((entry) => entry.length)));
    expect(longest.reduce((total, at) => total + at, ALWAYS.length - 1)).toBeLessThanOrEqual(
      DURABLE_TEXT_MAX,
    );
  });

  it("groups every place word under a reach and every place noun under a stand", () => {
    // The grouping *is* the bank (0329, 0335): a word exists in exactly one place, so the flattened
    // bank has to be the grouped one entry for entry and in its order — a second list would be a
    // word that can be drawn without a reach, or a reach naming a word nobody draws (principle 1).
    expect(YARD_PLACE_WORDS).toEqual(
      SCENE_REACHES.flatMap((reach) => YARD_PLACE_WORDS_BY_REACH[reach]),
    );
    expect(YARD_PLACE_NOUNS).toEqual(
      SCENE_STANDS.flatMap((stand) => YARD_PLACE_NOUNS_BY_STAND[stand]),
    );
    // And every group speaks: a reach with no word and a stand with no noun are both a reading the
    // mint can never draw.
    for (const reach of SCENE_REACHES)
      expect(YARD_PLACE_WORDS_BY_REACH[reach], reach).not.toEqual([]);
    for (const stand of SCENE_STANDS)
      expect(YARD_PLACE_NOUNS_BY_STAND[stand], stand).not.toEqual([]);
  });

  it("writes no entry of any bank twice", () => {
    for (const bank of [...ALWAYS, ...OPTIONAL]) {
      expect(new Set(bank).size).toBe(bank.length);
    }
  });

  // The two halves that are words are Titlecase like every other pool the instrument draws from
  // (0059); a joining word is lowercase and its noun Titlecase after the article it may carry, so
  // the join reads as a sentence rather than a shouted label (0324).
  it("says each word half Titlecase, each joining word lowercase and each noun Titlecase", () => {
    for (const word of [...YARD_ADJECTIVES, ...YARD_PLANTS]) {
      expect(word).toMatch(/^[A-Z][a-z]+$/u);
    }
    for (const [wordBank, nounBank] of JOINED) {
      for (const word of wordBank) expect(word).toMatch(/^[a-z]+$/u);
      for (const noun of nounBank) expect(noun).toMatch(/^(?:the )?[A-Z][a-z]+(?: [A-Z][a-z]+)*$/u);
    }
    for (const phrase of YARD_DETAILS) {
      expect(phrase).toMatch(/^[a-z]+(?: (?:[A-Z][a-z]+|[a-z]+))+$/u);
    }
  });
});

describe("one yard's name", () => {
  // Every reading is one line, and every word in it is either a capitalised name or one of the
  // small joining words that make it a scene rather than a label (0317).
  it("reads as one line of Titlecase names and joining words", () => {
    for (let index = 0; index < 200; index++) {
      const name = mintYardName();
      expect(name).toMatch(/^[A-Z][a-z]+(?: (?:[A-Z][a-z]+|[a-z]+))+$/u);
      expect(name).not.toContain("\n");
      // A yard's name is durable text, and the two optional banks give way to that bound (0317).
      expect(name.length).toBeLessThanOrEqual(DURABLE_TEXT_MAX);
    }
  });

  // A coin apiece: over enough draws every bank speaks, and none says fewer than the ones that do.
  it("draws every bank over enough runs and never fewer than the ones that always speak", () => {
    const names = Array.from({ length: 400 }, () => mintYardName());
    for (const bank of [...ALWAYS, ...OPTIONAL]) {
      expect(names.some((name) => saysAnEntryOf(name, bank))).toBe(true);
    }
    for (const name of names) {
      for (const bank of ALWAYS) expect(saysAnEntryOf(name, bank)).toBe(true);
    }
  });
});

describe("the joined halves of one yard's name", () => {
  // The point of joining the two families: a noun comes back under a different word, so a rack
  // repeats a place or an air without repeating a phrase (0324).
  it("says one noun of each joined family under more than one joining word", () => {
    const names = Array.from({ length: 400 }, () => mintYardName());
    for (const [wordBank, nounBank] of JOINED) {
      const under = (noun: string): number =>
        wordBank.filter((word) => names.some((name) => name.includes(`${word} ${noun}`))).length;
      expect(nounBank.some((noun) => under(noun) > 1)).toBe(true);
    }
  });

  // The coin is flipped before the bank it decides is drawn, and each joined half is one word then
  // one noun: seven draws in that order say a name with no air and a detail (0324).
  it("flips each coin before the draw it decides", () => {
    const coins = [0, 0, 0, 0, 0.9, 0.1, 0];
    let at = 0;
    vi.spyOn(Math, "random").mockImplementation(() => coins[at++] ?? 0);
    expect(mintYardName()).toBe(
      `${YARD_ADJECTIVES[0]} ${YARD_PLANTS[0]} ${YARD_PLACE_WORDS[0]} ${YARD_PLACE_NOUNS[0]} ` +
        YARD_DETAILS[0],
    );
    expect(at).toBe(coins.length);
  });

  // Tails: the shortest reading is what always speaks, its place one word drawn before one noun.
  it("says only what always speaks when both coins are tails, and every bank when both are heads", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(mintYardName()).toBe(
      `${YARD_ADJECTIVES.at(-1)} ${YARD_PLANTS.at(-1)} ` +
        `${YARD_PLACE_WORDS.at(-1)} ${YARD_PLACE_NOUNS.at(-1)}`,
    );
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(mintYardName()).toBe(
      `${YARD_ADJECTIVES[0]} ${YARD_PLANTS[0]} ${YARD_PLACE_WORDS[0]} ${YARD_PLACE_NOUNS[0]} ` +
        `${YARD_AIR_WORDS[0]} ${YARD_AIR_NOUNS[0]} ${YARD_DETAILS[0]}`,
    );
  });
});
