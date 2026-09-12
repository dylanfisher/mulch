/**
 * @role The arithmetic ./scripts/measure prints — percentiles over a frame-gap histogram, the
 *   spread across interleaved runs, and the four numbers of the block's budget read off one run.
 *   No browser and no process: this is the half of the harness a unit case can hold, which is why
 *   it is a file of its own (the same reason scripts/profile.d/trend.js is one).
 * @instead Standing the trees up, driving them and printing → scripts/measure. The table this
 *   feeds → scripts/measure.d/tables.js.
 */

/**
 * The budget, from docs/plan.md §1 ("The budget, before the first checkpoint"). It is written out
 * here because a harness cannot read a paragraph: the plan states it in prose and this is the one
 * place in code that spells it, so a budget that moves in the plan moves here in the same change
 * and nowhere else. A gap over `frameMs` is a frame dropped at 120 Hz and two at 60 — which is how
 * every checkpoint from 0358 on has read the drag — and `taskMs` is what the browser itself calls a
 * long task.
 */
export const BUDGET = {
  gapP95Ms: 20,
  frameMs: 20,
  taskMs: 50,
  bakeMeanMs: 4,
  bakeWorstMs: 8,
};

/** The value at `q` of an ascending list, by nearest rank — no interpolation between samples. */
export const percentile = (sorted, q) =>
  sorted.length === 0
    ? 0
    : sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1))];

/** The middle of a list, or nought where there is nothing to be in the middle of. */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
}

/**
 * What a window's frame-to-frame gaps say about the loop. `over20` and `over50` are counts and not
 * ratios on purpose: the budget is stated as "nothing over 50", and a ratio would round the one
 * gap that matters away.
 */
export function gapRead(list, secs) {
  const sorted = list.toSorted((a, b) => a - b);
  return {
    frames: list.length,
    fps: secs > 0 ? list.length / secs : 0,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    maxMs: sorted.length === 0 ? 0 : sorted.at(-1),
    over20: list.filter((gap) => gap > BUDGET.frameMs).length,
    over50: list.filter((gap) => gap > BUDGET.taskMs).length,
  };
}

/**
 * The middle of a metric across interleaved runs, with the ends it reached. Both, always: a median
 * alone hides the run that dipped, and a range alone hides where the runs actually sat. A tree that
 * never measured the metric — a base commit from before the app carried the hook — answers null
 * rather than nought, because nought is a reading and this is the absence of one.
 */
export function spread(runs, pick) {
  const values = runs
    .map((one) => pick(one))
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return null;
  return {
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    n: values.length,
  };
}

/**
 * The budget's four numbers, read off one tree's runs. `met` is null where the tree could not
 * answer — the bake has no cost in a tree whose source predates the measuring hook, and nothing is
 * served by calling an absence a failure. The harness prints these and judges nothing further: it
 * exits 0 whatever they say, for the reason 0051 gives.
 */
/**
 * Where a run's bake was actually sampled. Nothing rebakes at the budget's own setting (0365, 0369),
 * so under `--bake` the only sample there is stands in the bake window; judging the still window's
 * absence instead would make the budget's third number unanswerable in every run.
 */
const baked = (run) => run.bake ?? run.still;

export function budgetVerdicts(runs, drags) {
  const worstOf = (list, pick) => {
    const held = spread(list, pick);
    return held === null ? null : held.max;
  };
  const longest = worstOf(runs, (run) => run.still.longTasks.count);
  const p95 = spread(runs, (run) => run.still.gaps.p95);
  const over50 = worstOf(runs, (run) => run.still.gaps.over50);
  const bakeMean = spread(runs, (run) => baked(run).costs?.screenBake?.meanMs ?? null);
  const bakeWorst = worstOf(runs, (run) => baked(run).costs?.screenBake?.worstMs ?? null);
  const bakes = worstOf(runs, (run) => baked(run).costs?.screenBake?.calls ?? null);
  const dropped = worstOf(drags, (drag) => drag.gaps.over20);
  return [
    {
      name: "no long task the picture causes",
      met: longest === null ? null : longest === 0,
      saying: longest === null ? "not measured" : `${longest} at worst`,
    },
    {
      name: `rAF gap p95 under ${BUDGET.gapP95Ms} ms, nothing over ${BUDGET.taskMs}`,
      met: p95 === null ? null : p95.max < BUDGET.gapP95Ms && over50 === 0,
      saying:
        p95 === null
          ? "not measured"
          : `p95 ${p95.max.toFixed(1)} ms at worst, ${over50} over ${BUDGET.taskMs}`,
    },
    {
      name: `a tile bake under ${BUDGET.bakeMeanMs} ms mean and ${BUDGET.bakeWorstMs} ms worst`,
      met:
        bakeMean === null || bakes === 0
          ? null
          : bakeMean.max < BUDGET.bakeMeanMs && bakeWorst < BUDGET.bakeWorstMs,
      saying:
        bakeMean === null
          ? "not measured — this tree carries no measuring hook"
          : bakes === 0
            ? "nothing rebaked in the window"
            : `${bakeMean.max.toFixed(1)} ms mean, ${bakeWorst.toFixed(1)} ms worst`,
    },
    {
      name: "a knob drag drops no frame",
      met: dropped === null ? null : dropped === 0,
      saying: dropped === null ? "not measured" : `${dropped} gaps over ${BUDGET.frameMs} ms`,
    },
  ];
}
