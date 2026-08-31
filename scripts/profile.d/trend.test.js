import { describe, expect, it } from "vitest";

import { judge, sparkline, TRACKED, trendLines, verdictLine, wantsColour } from "./trend.js";

const metric = (key) => TRACKED.find((one) => one.key === key);

/** A run record shaped the way ./scripts/profile assembles one, with only the keys under test. */
const run = (metrics, extra = {}) => ({
  at: "2026-08-31T00:00:00.000Z",
  cycles: 20,
  metrics,
  ...extra,
});
/** `count` past runs holding one metric flat, which is the history every case here varies from. */
const flat = (key, value, count) => Array.from({ length: count }, () => run({ [key]: value }));

const plain = (record, past) => trendLines(record, past, { cycles: 20, colour: false }).join("\n");

describe("sparkline", () => {
  it("draws one cell per run and puts the full block on the largest", () => {
    expect(sparkline([1, 2, 3, 4, 5, 6, 7, 8])).toBe("▁▂▃▄▅▆▇█");
  });

  it("keeps only the newest cells when the window is longer than the line", () => {
    expect(sparkline([9, 9, 9, 1, 2, 3, 4, 5, 6, 100])).toHaveLength(8);
    expect(sparkline([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).at(-1)).toBe("█");
  });

  it("draws a flat window flat rather than dividing by zero", () => {
    expect(sparkline([5, 5, 5])).toBe("▄▄▄");
  });
});

describe("judge", () => {
  it("calls a run worse only when it is outside the band AND past the tolerance", () => {
    const churn = metric("churnMs");
    const seen = [240, 242, 244, 246, 248];
    // Outside the band and 22% above the median: both halves of the conjunction.
    expect(judge(300, seen, churn).verdict).toBe("worse");
    // Outside the band, but 2% above the median — the case 0051 exists to keep quiet.
    expect(judge(250, seen, churn).verdict).toBe("steady");
  });

  it("reads a higher-is-better metric in its own direction", () => {
    const factor = metric("realtimeFactor");
    const seen = [50, 51, 52, 53, 54];
    expect(judge(20, seen, factor).verdict).toBe("worse");
    expect(judge(90, seen, factor).verdict).toBe("better");
  });

  it("trims the band's own extremes once there are five runs to spare them", () => {
    const churn = metric("churnMs");
    expect(judge(300, [240, 245, 250, 255, 900], churn).high).toBe(255);
    expect(judge(300, [240, 245, 250, 900], churn).high).toBe(900);
  });
});

describe("trendLines", () => {
  it("says how thin the history is and compares nothing below three runs", () => {
    const lines = plain(run({ churnMs: 240 }), flat("churnMs", 240, 2));
    expect(lines).toContain("2 recorded");
    expect(lines).toContain("3 needed before a median means anything");
    expect(lines).not.toContain("churn wall clock");
  });

  it("heads the section with a tally, and marks a regression red-side", () => {
    const past = flat("churnMs", 240, 5);
    const lines = plain(run({ churnMs: 400 }), past);
    expect(lines).toContain("1 regressed");
    expect(lines).toMatch(/✗ churn wall clock\s+400ms\s+\+67%/u);
    // Four metrics this record never carried, so they are counted as unknown rather than steady.
    expect(lines).toContain("4 unknown");
  });

  it("marks a best-recorded run and signs its delta the way it moved", () => {
    const lines = plain(run({ realtimeFactor: 90 }), flat("realtimeFactor", 50, 5));
    expect(lines).toContain("1 improved");
    expect(lines).toMatch(/✓ realtime factor\s+90.0x\s+\+80%/u);
  });

  it("draws the window with this run as its last cell", () => {
    const past = [20, 30, 40, 50, 60].map((value) => run({ realtimeFactor: value }));
    expect(plain(run({ realtimeFactor: 100 }), past)).toContain("▁▂▃▄▅█");
  });

  it("says out loud that a baseline was reset, so a narrowed band is never a surprise", () => {
    const past = [
      run({ churnMs: 240 }, { sha: "abc1234", accepted: "the reverb tile costs this" }),
    ];
    expect(plain(run({ churnMs: 240 }), past)).toContain(
      "baseline reset at abc1234 — the reverb tile costs this",
    );
  });

  it("emits no escape codes when colour is off", () => {
    const lines = plain(run({ churnMs: 400 }), flat("churnMs", 240, 5));
    expect(lines).not.toContain("\u001B[");
  });

  it("emits them when it is on", () => {
    const lines = trendLines(run({ churnMs: 400 }), flat("churnMs", 240, 5), {
      cycles: 20,
      colour: true,
    }).join("\n");
    expect(lines).toContain("\u001B[31m");
  });
});

const verdict = (record, past) => verdictLine(record, past, { cycles: 20, colour: false });

describe("verdictLine", () => {
  it("is red when a metric the code owns regressed", () => {
    const line = verdict(run({ churnMs: 400 }), flat("churnMs", 240, 5));
    expect(line).toContain("🔴");
    expect(line).toContain("bad");
    expect(line).toContain("churn wall clock regressed");
  });

  it("is yellow when only the half that shares the machine moved", () => {
    const line = verdict(run({ framePct95: 40 }), flat("framePct95", 10, 5));
    expect(line).toContain("🟡");
    expect(line).toContain("that half shares the machine");
  });

  it("is red when both halves moved, because the code's half decides", () => {
    const past = [240, 240, 240, 240, 240].map((value, index) =>
      run({ churnMs: value, framePct95: [10, 10, 10, 10, 10][index] }),
    );
    expect(verdict(run({ churnMs: 400, framePct95: 40 }), past)).toContain("🔴");
  });

  it("is green when nothing regressed, and says what came back best", () => {
    const line = verdict(run({ realtimeFactor: 90 }), flat("realtimeFactor", 50, 5));
    expect(line).toContain("🟢");
    expect(line).toContain("good");
    expect(line).toContain("realtime factor at its best recorded");
  });

  it("refuses to judge a history too thin to have a median", () => {
    const line = verdict(run({ churnMs: 400 }), flat("churnMs", 240, 2));
    expect(line).toContain("🟡");
    expect(line).toContain("no verdict — 2 of 3 runs recorded at 20 cycles");
  });
});

describe("wantsColour", () => {
  it("paints a terminal and not a pipe", () => {
    expect(wantsColour({}, { isTTY: true })).toBe(true);
    expect(wantsColour({}, {})).toBe(false);
  });

  it("lets NO_COLOR win and FORCE_COLOR override a pipe", () => {
    expect(wantsColour({ NO_COLOR: "1" }, { isTTY: true })).toBe(false);
    expect(wantsColour({ NO_COLOR: "1", FORCE_COLOR: "1" }, { isTTY: true })).toBe(false);
    expect(wantsColour({ FORCE_COLOR: "1" }, {})).toBe(true);
  });
});
