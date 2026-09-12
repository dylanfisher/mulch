/**
 * @role How ./scripts/measure prints: one table per phase with the trees side by side, a cell that
 *   says the middle of the runs and the ends they reached, and the line that reads the budget's four
 *   numbers off each tree. Strings in, strings out — no browser, no process, so a unit case holds
 *   the whole of it.
 * @instead The arithmetic these cells are of → scripts/measure.d/stats.js. Everything that opens a
 *   browser → scripts/measure.
 */

/** A metric that was never read. The same glyph everywhere, so a gap is never mistaken for a zero. */
export const ABSENT = "—";

/**
 * One cell: the middle of the runs, and — where there was more than one — the ends. A single run
 * prints one number, because "1.5 (1.5–1.5)" is three statements of one reading.
 */
export function cell(held, digits = 1) {
  if (held === null) return ABSENT;
  const middle = held.median.toFixed(digits);
  const low = held.min.toFixed(digits);
  const high = held.max.toFixed(digits);
  // Compared as printed rather than as measured: ends that round to the same string are one
  // reading, and "0 (0–0)" is three statements of it.
  if (held.n < 2 || (low === high && low === middle)) return middle;
  return `${middle} (${low}–${high})`;
}

/**
 * A table whose columns are as wide as their widest cell. The label column is padded to the widest
 * label, so the eye follows one edge down the page whatever the numbers do.
 */
export function table(title, columns, rows) {
  const widths = columns.map((name, at) =>
    Math.max(name.length, ...rows.map((row) => String(row[at + 1] ?? ABSENT).length)),
  );
  const labels = Math.max(...rows.map((row) => row[0].length));
  const line = (label, cells) =>
    `  ${label.padEnd(labels)}  ${cells.map((one, at) => String(one).padEnd(widths[at])).join("  ")}`.trimEnd();
  return [
    `\n▸ ${title}`,
    line("", columns),
    ...rows.map((row) =>
      line(
        row[0],
        columns.map((_, at) => row[at + 1] ?? ABSENT),
      ),
    ),
  ];
}

/**
 * `·` is a number this tree could not answer — which is not a failure and is not a pass, and saying
 * so is the whole reason the glyph is a third one rather than a ✗.
 */
const mark = (met) => (met === null ? "·" : met ? "✓" : "✗");

/**
 * The last thing printed: the budget's four numbers, per tree, each with the reading that decided
 * it.
 */
export function verdictLine(tree, verdicts) {
  return `  ${tree}: ${verdicts.map((one) => `${mark(one.met)} ${one.name} — ${one.saying}`).join("; ")}`;
}
