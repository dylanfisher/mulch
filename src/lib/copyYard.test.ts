import { afterEach, describe, expect, it, vi } from "vitest";

import { DURABLE_TEXT_MAX } from "./guards.ts";
import {
  mintYardName,
  YARD_ADJECTIVES,
  YARD_AIRS,
  YARD_DETAILS,
  YARD_PLACES,
  YARD_PLANTS,
} from "./copyYard.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

/** How many draws from a pool of this many readings before a repeat is expected (0149). */
const drawsBeforeARepeat = (readings: number): number => Math.sqrt((Math.PI * readings) / 2);

/** The three banks a name always draws from, and the two it draws on a coin. */
const ALWAYS = [YARD_ADJECTIVES, YARD_PLANTS, YARD_PLACES];
const OPTIONAL = [YARD_AIRS, YARD_DETAILS];

describe("the banks a yard is named from", () => {
  it("outlasts far more than a session's worth of yards", () => {
    const readings = ALWAYS.reduce((total, bank) => total * bank.length, 1);
    expect(drawsBeforeARepeat(readings)).toBeGreaterThan(24);
    expect([YARD_ADJECTIVES.length, YARD_PLANTS.length]).toEqual([48, 48]);
  });

  // The three that always speak have to fit inside the bound on durable text on their own, because
  // nothing gives way for them: only the optional two do (`mintYardName`).
  it("keeps the three that always speak inside the bound on durable text", () => {
    const longest = ALWAYS.map((bank) => Math.max(...bank.map((entry) => entry.length)));
    expect(longest.reduce((total, at) => total + at, ALWAYS.length - 1)).toBeLessThanOrEqual(
      DURABLE_TEXT_MAX,
    );
  });

  it("writes no entry of any bank twice", () => {
    for (const bank of [...ALWAYS, ...OPTIONAL]) {
      expect(new Set(bank).size).toBe(bank.length);
    }
  });

  // The two halves that are words are Titlecase like every other pool the instrument draws from
  // (0059); the three that are phrases open on the preposition that makes them a place or a time.
  it("says each word half Titlecase and each phrase half as a phrase", () => {
    for (const word of [...YARD_ADJECTIVES, ...YARD_PLANTS]) {
      expect(word).toMatch(/^[A-Z][a-z]+$/u);
    }
    for (const phrase of [YARD_PLACES, YARD_AIRS, YARD_DETAILS].flat()) {
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

  // The two optional banks are a coin apiece: over enough draws every bank speaks, and no draw
  // says fewer than the three that always do.
  it("draws all five banks over enough runs and never fewer than three", () => {
    const names = Array.from({ length: 400 }, () => mintYardName());
    for (const bank of [...ALWAYS, ...OPTIONAL]) {
      expect(names.some((name) => bank.some((entry) => name.includes(entry)))).toBe(true);
    }
    for (const name of names) {
      for (const bank of ALWAYS) {
        expect(bank.some((entry) => name.includes(entry))).toBe(true);
      }
    }
  });

  // Both coins come up tails: the shortest reading a yard can wear is the three that always speak.
  it("says the three when both coins are tails and all five when both are heads", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(mintYardName()).toBe(
      `${YARD_ADJECTIVES.at(-1)} ${YARD_PLANTS.at(-1)} ${YARD_PLACES.at(-1)}`,
    );
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(mintYardName()).toBe(
      `${YARD_ADJECTIVES[0]} ${YARD_PLANTS[0]} ${YARD_PLACES[0]} ${YARD_AIRS[0]} ${YARD_DETAILS[0]}`,
    );
  });
});
