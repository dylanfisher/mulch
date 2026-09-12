import { describe, expect, it } from "vitest";

import { BUDGET, budgetVerdicts, gapRead, median, percentile, spread } from "./stats.js";

/** One run's shape, with only the fields the verdicts read — the rest is the harness's. */
const runAt = (still) => ({ still: { longTasks: { count: 0, worstMs: 0 }, ...still } });
const gapsAt = (p95, over50) => ({ gaps: { p95, over50 } });

describe("percentile", () => {
  it("takes the value at the nearest rank, and never interpolates between two samples", () => {
    // Rank ⌈n·q⌉, so the median of four is the second and not the third: at an exact boundary the
    // floor of n·q is one rank high, which reads every p95 a sample worse than it was.
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([1, 2, 3, 4], 0.95)).toBe(4);
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([], 0.95)).toBe(0);
  });
});

describe("median", () => {
  it("averages the middle pair of an even list and takes the middle of an odd one", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("gapRead", () => {
  it("counts the gaps over a frame and over a task, and never rounds them into a ratio", () => {
    const read = gapRead([8, 8, 25, 8, 60], 1);
    expect(read.frames).toBe(5);
    expect(read.fps).toBe(5);
    expect(read.over20).toBe(2);
    expect(read.over50).toBe(1);
    expect(read.maxMs).toBe(60);
    expect(read.p50).toBe(8);
  });

  it("reads an empty window as nothing rather than as a division by nought", () => {
    expect(gapRead([], 0)).toEqual({
      frames: 0,
      fps: 0,
      p50: 0,
      p95: 0,
      maxMs: 0,
      over20: 0,
      over50: 0,
    });
  });
});

describe("spread", () => {
  it("says the middle of the runs and the ends they reached", () => {
    expect(spread([1, 5, 3], (one) => one)).toEqual({ median: 3, min: 1, max: 5, n: 3 });
  });

  it("answers null where the trees never measured it, which is not nought", () => {
    expect(spread([null, undefined], (one) => one)).toBeNull();
    expect(spread([0, 0], (one) => one)).toEqual({ median: 0, min: 0, max: 0, n: 2 });
  });
});

describe("the budget's four numbers", () => {
  it("reads the worst of the runs, so one bad window is not averaged away", () => {
    const runs = [
      runAt({ ...gapsAt(9, 0), longTasks: { count: 0, worstMs: 0 } }),
      runAt({ ...gapsAt(9, 1), longTasks: { count: 2, worstMs: 120 } }),
    ];
    const [tasks, gaps] = budgetVerdicts(runs, [{ gaps: { over20: 0 } }]);
    expect(tasks.met).toBe(false);
    expect(tasks.saying).toContain("2");
    expect(gaps.met).toBe(false);
    expect(gaps.saying).toContain(`1 over ${BUDGET.taskMs}`);
  });

  it("counts a gap over a frame in the drag as a frame the drag dropped", () => {
    const runs = [runAt(gapsAt(9, 0))];
    expect(budgetVerdicts(runs, [{ gaps: { over20: 0 } }])[3].met).toBe(true);
    expect(budgetVerdicts(runs, [{ gaps: { over20: 3 } }])[3].met).toBe(false);
  });
});

describe("the budget's third number, the bake", () => {
  it("reads the bake off the phase that drove one, where a run carries one", () => {
    const runs = [
      {
        ...runAt(gapsAt(9, 0)),
        bake: { costs: { screenBake: { calls: 70, meanMs: 22, worstMs: 44 } } },
      },
    ];
    const [, , bake] = budgetVerdicts(runs, [{ gaps: { over20: 0 } }]);
    expect(bake.met).toBe(false);
    expect(bake.saying).toBe("22.0 ms mean, 44.0 ms worst");
  });

  it("calls a tree with no measuring hook unanswered, and never failed", () => {
    const [, , bake] = budgetVerdicts([runAt(gapsAt(9, 0))], [{ gaps: { over20: 0 } }]);
    expect(bake.met).toBeNull();
    expect(bake.saying).toContain("no measuring hook");
  });

  it("says so where nothing rebaked, rather than reading a mean of nought as met", () => {
    const runs = [
      runAt({
        ...gapsAt(9, 0),
        costs: { screenBake: { calls: 0, meanMs: 0, worstMs: 0 } },
      }),
    ];
    const [, , bake] = budgetVerdicts(runs, [{ gaps: { over20: 0 } }]);
    expect(bake.met).toBeNull();
    expect(bake.saying).toBe("nothing rebaked in the window");
  });

  it("holds a bake to both halves of its number, mean and worst", () => {
    const held = (meanMs, worstMs) =>
      budgetVerdicts(
        [runAt({ ...gapsAt(9, 0), costs: { screenBake: { calls: 4, meanMs, worstMs } } })],
        [{ gaps: { over20: 0 } }],
      )[2];
    expect(held(2, 5).met).toBe(true);
    expect(held(2, 9).met).toBe(false);
    expect(held(5, 5).met).toBe(false);
  });
});
