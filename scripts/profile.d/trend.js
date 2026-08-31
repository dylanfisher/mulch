/**
 * @role The comparison half of ./scripts/profile — which numbers moved, which way, and whether the
 * move is worth reading. Nothing here prints or exits: it returns lines, so the profiler keeps its
 * one rule about stdout under --json ([0051](../../docs/decisions/0051-the-profiler-remembers-its-own-runs.md)),
 * and so the arithmetic that decides what turns red can be tested without a browser.
 */

/** How many past runs a comparison reads. Old enough to see a trend, short enough to forget a
 * machine you no longer run on. */
export const WINDOW = 10;
/** Below this many past runs a median is one person's opinion, so the comparison says so and
 * prints nothing else. */
export const MIN_HISTORY = 3;

/**
 * The metrics a comparison speaks about, most trustworthy first — and the whole point of the
 * ordering. The two stable ones run the same code path on the same input every time, so a move in
 * them is a move in the code. The noisy ones below share a machine with the compositor, the
 * collector and a null audio sink, so a move in them is a question, not an answer. `tolerance` is
 * how far past the recorded band a run drifts before it is worth a word, and it is deliberately
 * looser for the noisy half.
 */
export const TRACKED = [
  {
    key: "realtimeFactor",
    // Looser than the other stable metric, and not because it is noisier — because it is
    // quantized. It is RENDER_SECS * 1000 / renderMs with renderMs a whole number of
    // milliseconds, so at a ~22ms render the only values it can take are 2000/23, 2000/22,
    // 2000/21 … — steps of about 4.5%. Two steps of integer rounding is ~9.5%, which clears a
    // 0.1 tolerance while meaning nothing at all: five separate investigations across one run
    // interleaved base against head to refute exactly that, every time. 0.15 sits above two
    // steps and below three, and the render is deterministic code, so anything real is bigger
    // than that. `renderMs` is recorded beside it to be read in the unit it was measured in.
    label: "realtime factor",
    better: "higher",
    tolerance: 0.15,
    stable: true,
    format: (value) => `${value.toFixed(1)}x`,
  },
  {
    key: "loadedFactor",
    // **Not** the quantization argument above, which does not apply here: this factor is taken
    // off the render's own clock — `wallSecs` is a `performance.now()` difference (src/app/
    // render.ts) over a render some hundreds of milliseconds long — so its step is fractions of a
    // percent rather than the 4.5% integer milliseconds buy the metric above. What it is exposed
    // to instead is the automator, whose growing and retiring decides how much rack there is to
    // render; the run is seeded and the render deterministic, so that is fixed across runs of one
    // build and moves only when the draws themselves move, which is a real change and is meant to
    // show. So the band is tight: 0.05 is twice the spread of the runs recorded so far and well
    // under the smallest regression worth the word, because this is the metric that prices the
    // render someone actually waits on and a hole in it is a hole in the only number that says so.
    label: "loaded factor",
    better: "higher",
    tolerance: 0.05,
    stable: true,
    format: (value) => `${value.toFixed(1)}x`,
  },
  {
    key: "churnMs",
    label: "churn wall clock",
    better: "lower",
    tolerance: 0.1,
    stable: true,
    format: (value) => `${value.toFixed(0)}ms`,
  },
  {
    key: "framePct95",
    label: "frame p95",
    better: "lower",
    tolerance: 0.25,
    stable: false,
    format: (value) => `${value.toFixed(1)}ms`,
  },
  {
    key: "heapDeltaMb",
    label: "heap delta",
    better: "lower",
    tolerance: 0.25,
    stable: false,
    format: (value) => `${value.toFixed(2)} MB`,
  },
  {
    key: "longestTaskMs",
    label: "longest task",
    better: "lower",
    tolerance: 0.25,
    stable: false,
    format: (value) => `${value.toFixed(0)}ms`,
  },
];

/**
 * The house vocabulary, from scripts/check: green ✓, red ✗, dim for asides, bold for headings.
 * `enabled` is a caller's decision rather than an environment read here, because the profiler
 * already knows about --json and this file should stay a pure function of its arguments.
 */
export const paint = (enabled) => {
  const on = enabled === true;
  const wrap = (code) => (text) => (on ? `\u001B[${code}m${text}\u001B[0m` : String(text));
  return { ok: wrap(32), bad: wrap(31), dim: wrap(2), bold: wrap(1) };
};

/** Whether this process's stdout should carry escape codes at all. NO_COLOR wins, FORCE_COLOR
 * overrides a pipe, and a piped run is plain by default so `| grep` and `| cat` read cleanly. */
export const wantsColour = (env, stream) => {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "") return true;
  return stream.isTTY === true;
};

const BLOCKS = "▁▂▃▄▅▆▇█";
/** How many cells a sparkline gets. Eight is the WINDOW's ten minus the two the band trims —
 * close enough that a cell is a run, narrow enough to sit in a row beside the median and band. */
export const SPARK_CELLS = 8;

/**
 * The window drawn as one glyph per run, oldest first, scaled between its own extremes. This is
 * the trend the band cannot show: where the run sits is a number, which way the last eight have
 * been walking is a shape. A flat window is drawn flat rather than divided by zero.
 */
export const sparkline = (values, cells = SPARK_CELLS) => {
  const recent = values.slice(-cells);
  if (recent.length === 0) return "";
  const low = Math.min(...recent);
  const high = Math.max(...recent);
  if (high === low) return BLOCKS[3].repeat(recent.length);
  return recent
    .map((value) => {
      const at = Math.round(((value - low) / (high - low)) * (BLOCKS.length - 1));
      return BLOCKS[at];
    })
    .join("");
};

export const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Where this run sits against the ones before it. A metric is called worse only when it is outside
 * every recorded run AND past its tolerance from the median — outside-the-band alone fires
 * constantly on a small history, and tolerance alone fires on a metric that has always been wide.
 * The band drops its own extremes once there are enough runs to spare them: untrimmed, a single
 * unlucky run — a backup kicking off, a browser update downloading — widens the band permanently
 * and quietly turns the detector off for the next ten runs, which is the failure mode nobody would
 * notice, because it stops flagging and looks exactly like nothing regressing.
 */
export const judge = (value, seen, metric) => {
  const ranked = seen.toSorted((a, b) => a - b);
  const band = ranked.length >= 5 ? ranked.slice(1, -1) : ranked;
  const middle = median(seen);
  const low = band[0];
  const high = band.at(-1);
  const worse = metric.better === "higher" ? value < low : value > high;
  const drift = middle === 0 ? 0 : Math.abs(value - middle) / Math.abs(middle);
  const better = metric.better === "higher" ? value > high : value < low;
  const verdict = worse && drift > metric.tolerance ? "worse" : better ? "better" : "steady";
  return { verdict, middle, low, high, drift };
};

/** The move against the median, signed and in percent, since a metric's own unit says nothing
 * about how big the move was. A true minus sign, because a hyphen at this size reads as a dash. */
const delta = (value, middle) => {
  if (middle === 0) return "—";
  const percent = ((value - middle) / Math.abs(middle)) * 100;
  const rounded = Math.abs(percent) < 10 ? percent.toFixed(1) : percent.toFixed(0);
  return `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${rounded.replace("-", "")}%`;
};

const ICON = { worse: "✗", better: "✓", steady: "·" };

const LABEL_WIDTH = Math.max(...TRACKED.map((metric) => metric.label.length));

/** Every tracked metric read against the window, in the order TRACKED states — most trustworthy
 * first, which is also the order they are printed and counted in. */
const judgeAll = (record, past) =>
  TRACKED.map((metric) => {
    const value = record.metrics[metric.key];
    const seen = past
      .map((run) => run.metrics?.[metric.key])
      .filter((one) => typeof one === "number");
    // A metric this run did not produce, or one the window has too few of, is neither steady nor
    // moved. Saying "unknown" out loud is the point: a silently absent row reads as a pass.
    if (value === null || value === undefined || seen.length < MIN_HISTORY) {
      return { metric, verdict: "unknown" };
    }
    return { metric, value, seen, ...judge(value, seen, metric) };
  });

/** The metrics of a verdict, read out in the order TRACKED puts them in. */
const named = (ones) => ones.map((one) => one.metric.label).join(", ");

/**
 * The last line the profiler prints, and for most runs the only one anyone reads. Three states,
 * and the middle one is the whole reason there are three: TRACKED's stable half runs the same code
 * on the same input every time, so a move there is a move in the code, while the half below it
 * shares a machine with the compositor, the collector and a null audio sink. Calling both of those
 * red would make red mean "something happened", which is what a colour means when it is worn out.
 * Judging nothing that exits non-zero, as everything else here does ([0051]).
 */
export const verdictLine = (record, past, { cycles, colour }) => {
  const { ok, bad, dim } = paint(colour);
  if (past.length < MIN_HISTORY) {
    return `🟡 ${dim(`no verdict — ${past.length} of ${MIN_HISTORY} runs recorded at ${cycles} cycles`)}`;
  }
  const judged = judgeAll(record, past);
  const worse = judged.filter((one) => one.verdict === "worse");
  if (worse.some((one) => one.metric.stable)) {
    return `🔴 ${bad("bad")} — ${named(worse)} regressed. Re-run, then bisect from the sha in the history.`;
  }
  if (worse.length > 0) {
    return `🟡 ${dim(`unsure — ${named(worse)} moved, and that half shares the machine. Re-run before you believe it.`)}`;
  }
  const better = judged.filter((one) => one.verdict === "better");
  const gained = better.length === 0 ? "" : `, ${named(better)} at its best recorded`;
  return `🟢 ${ok("good")} — nothing regressed against the last ${past.length} runs${gained}.`;
};

/** One metric's line: verdict, value, how far it moved, the window as a shape, then the numbers
 * it was judged against. Everything left of the median is painted, because that is the half a
 * reader is scanning for; the median and band stay dim, because they are the reference. */
const metricLine = (one, { ok, bad, dim }) => {
  const label = one.metric.label.padEnd(LABEL_WIDTH);
  if (one.verdict === "unknown") {
    return `  ${dim("·")} ${label} ${dim("not recorded often enough to compare")}`;
  }
  const tint = one.verdict === "worse" ? bad : one.verdict === "better" ? ok : dim;
  return (
    `  ${tint(ICON[one.verdict])} ${label} ` +
    `${one.metric.format(one.value).padStart(9)} ${tint(delta(one.value, one.middle).padStart(6))}  ` +
    `${tint(sparkline([...one.seen, one.value]))}  ` +
    dim(
      `median ${one.metric.format(one.middle).padEnd(9)} ` +
        `band ${one.metric.format(one.low)}–${one.metric.format(one.high)}`,
    )
  );
};

/**
 * The whole comparison section, as lines. The headline goes first on purpose: this is read in a
 * push's scrollback, where the only line anyone reliably catches is the one nearest the heading.
 */
export const trendLines = (record, past, { cycles, colour }) => {
  const brush = paint(colour);
  const { ok, bad, dim, bold } = brush;
  const lines = [
    "",
    bold(`▸ against the last ${past.length} run${past.length === 1 ? "" : "s"} on this machine`),
  ];
  const note = (text) => lines.push(`  ${dim(text)}`);

  // Said out loud, because a baseline that quietly forgot everything before it is worse than no
  // baseline: the band would narrow for no visible reason and nobody would know to distrust it.
  const from = past.find((run) => typeof run.accepted === "string");
  if (from !== undefined)
    note(`baseline reset at ${from.sha ?? "an earlier run"} — ${from.accepted}`);
  if (past.length < MIN_HISTORY) {
    lines.push(
      `  ${`${past.length} recorded`.padEnd(26)} ` +
        `at ${cycles} cycles — ${MIN_HISTORY} needed before a median means anything`,
    );
    return lines;
  }

  const judged = judgeAll(record, past);
  const counted = (verdict) => judged.filter((one) => one.verdict === verdict).length;
  const tally = [
    counted("worse") > 0 ? bad(`${counted("worse")} regressed`) : null,
    counted("better") > 0 ? ok(`${counted("better")} improved`) : null,
    counted("steady") > 0 ? `${counted("steady")} steady` : null,
    counted("unknown") > 0 ? dim(`${counted("unknown")} unknown`) : null,
  ].filter((part) => part !== null);
  const headline = counted("worse") > 0 ? bad("✗") : counted("better") > 0 ? ok("✓") : dim("·");
  lines.push("", `  ${headline} ${tally.join(", ")}`);

  for (const one of judged) {
    if (!one.metric.stable && TRACKED[TRACKED.indexOf(one.metric) - 1]?.stable) {
      note("── below here the machine has as much say as the code ──");
    }
    lines.push(metricLine(one, brush));
  }
  note("the sparkline is this window oldest-first with this run last, scaled to its own");
  note("extremes. This exits 0 whatever it finds: re-run a flagged number before you");
  note("believe it, and bisect from the sha in the history rather than from the feeling.");
  return lines;
};
