import { describe, expect, it } from "vitest";
import {
  assertDurableText,
  DURABLE_TEXT_MAX,
  exactKeys,
  finite,
  isRecord,
  objectAt,
  positive,
} from "@/lib/guards";

describe("isRecord", () => {
  it("accepts a plain object and refuses the two things that pretend to be one", () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
  });
});

describe("objectAt", () => {
  it("refuses a non-object and names where it failed", () => {
    expect(() => {
      objectAt(null, "session.deck");
    }).toThrow(/session\.deck is not an object/u);
  });
});

describe("exactKeys", () => {
  it("accepts the declared keys in any order and refuses an extra or a missing one", () => {
    expect(() => {
      exactKeys({ b: 1, a: 2 }, ["a", "b"], "a part");
    }).not.toThrow();
    expect(() => {
      exactKeys({ a: 1, b: 2, c: 3 }, ["a", "b"], "a part");
    }).toThrow(/a part has keys \[a, b, c\], expected \[a, b\]/u);
    expect(() => {
      exactKeys({ a: 1 }, ["a", "b"], "a part");
    }).toThrow(/a part has keys \[a\], expected \[a, b\]/u);
  });

  it("refuses a field the record only inherits, which a count alone would let through", () => {
    const inherited: Record<string, unknown> = { a: 1 };
    Object.setPrototypeOf(inherited, { b: 1 });
    expect(() => {
      exactKeys(inherited, ["a", "b"], "a part");
    }).toThrow(/a part has keys \[a\], expected \[a, b\]/u);
  });
});

describe("finite", () => {
  it("refuses the values JSON smuggles in where a number belongs", () => {
    for (const value of [null, "3", Number.NaN, Infinity]) {
      expect(() => {
        finite(value, "deck.gain");
      }).toThrow(/deck\.gain is not a finite number/u);
    }
    expect(finite(0, "deck.gain")).toBe(0);
  });
});

describe("positive", () => {
  it("refuses zero, which the maths would divide by rather than fail on", () => {
    expect(() => {
      positive(0, "rate");
    }).toThrow(/rate is not a positive number/u);
    expect(() => {
      positive(-1, "rate");
    }).toThrow(/rate is not a positive number/u);
    expect(positive(44_100, "rate")).toBe(44_100);
  });
});

describe("assertDurableText", () => {
  it("refuses an empty string and a non-string", () => {
    expect(() => {
      assertDurableText("", "deck.id");
    }).toThrow(/deck\.id is not a non-empty string/u);
    expect(() => {
      assertDurableText(7, "deck.id");
    }).toThrow(/deck\.id is not a non-empty string/u);
  });

  it("accepts text at the bound and refuses one character past it", () => {
    expect(() => {
      assertDurableText("y".repeat(DURABLE_TEXT_MAX), "deck.name");
    }).not.toThrow();
    expect(() => {
      assertDurableText("y".repeat(DURABLE_TEXT_MAX + 1), "deck.name");
    }).toThrow(`deck.name is longer than ${DURABLE_TEXT_MAX} characters`);
  });
});
