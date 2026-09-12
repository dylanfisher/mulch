import { describe, expect, it } from "vitest";

import { ABSENT, cell, table, verdictLine } from "./tables.js";

describe("a cell", () => {
  it("prints one number for one run, because a range of one is three statements of it", () => {
    expect(cell({ median: 1.5, min: 1.5, max: 1.5, n: 1 }, 1)).toBe("1.5");
  });

  it("prints the middle and the ends where the runs disagreed", () => {
    expect(cell({ median: 9.2, min: 9, max: 10.4, n: 3 }, 1)).toBe("9.2 (9.0–10.4)");
  });

  it("prints one number where several runs agreed to the digit it is printed at", () => {
    expect(cell({ median: 0, min: 0, max: 0, n: 3 }, 0)).toBe("0");
    expect(cell({ median: 0.00012, min: 0.00012, max: 0.00019, n: 3 }, 0)).toBe("0");
    expect(cell({ median: 0.12, min: 0.12, max: 0.19, n: 3 }, 2)).toBe("0.12 (0.12–0.19)");
  });

  it("says a metric was never read, so an absence is never mistaken for a nought", () => {
    expect(cell(null)).toBe(ABSENT);
  });
});

describe("a table", () => {
  it("pads every column to its widest cell, so one edge runs down the page", () => {
    const lines = table(
      "a window",
      ["base (abc1234)", "head"],
      [
        ["frames a second", "60.1", "119.8"],
        ["gaps over 20 ms", "0", "4"],
      ],
    );
    expect(lines[0]).toBe("\n▸ a window");
    expect(lines[1]).toBe("                   base (abc1234)  head");
    expect(lines[2]).toBe("  frames a second  60.1            119.8");
    expect(lines[3]).toBe("  gaps over 20 ms  0               4");
  });

  it("fills a row that is short of a column with the absent mark", () => {
    const [, , row] = table("a window", ["base", "head"], [["bakes", "0"]]);
    expect(row).toBe(`  bakes  0     ${ABSENT}`);
  });
});

describe("the verdict line", () => {
  it("marks a number met, missed, and unanswerable as three different things", () => {
    const line = verdictLine("head", [
      { name: "no long task", met: true, saying: "0 at worst" },
      { name: "a knob drag drops no frame", met: false, saying: "3 gaps over 20 ms" },
      { name: "a tile bake", met: null, saying: "not measured" },
    ]);
    expect(line).toBe(
      "  head: ✓ no long task — 0 at worst; " +
        "✗ a knob drag drops no frame — 3 gaps over 20 ms; " +
        "· a tile bake — not measured",
    );
  });
});
