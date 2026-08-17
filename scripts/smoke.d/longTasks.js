/** @role What the gestures cost the main thread, watched across the drags that already happen. */
import { fail, report } from "./harness.js";

/**
 * How long one task may hold the main thread during a gesture before the drag stops tracking the
 * pointer. A `longtask` entry is by definition already over 50ms — the browser does not report
 * anything shorter — so this is not "is there any jank" but "is there jank a hand would feel".
 * Set from an observed run, not from taste: see the claim, which prints the real worst every time
 * so the day it creeps up is the day it is visible rather than the day it trips.
 */
const LONGEST_MS = 200;

/**
 * Installed before the drags and read after them, which is why this is two exports rather than
 * one. It rides the page the gestures already use and adds no work of its own: an observer that
 * pushes and two evaluates that bracket scenarios which were going to run anyway. Both halves sit
 * after `reload` for the reason everything does (plan §3).
 *
 * What this can and cannot see, established by holding the thread deliberately and watching: work
 * done inside a `page.evaluate` call's own task is not attributed as a long task at all, only work
 * in a task the page itself scheduled — a handler, a timer, a frame. That is the behaviour worth
 * having, because it means this measures the instrument rather than the harness driving it, but
 * it also means a negative control has to schedule its stall from inside the page to prove this
 * assertion still has teeth.
 */
export const watchLongTasks = async ({ page }) => {
  await page.evaluate(() => {
    window.__MULCH_LONG_TASKS__ = [];
    // Not `buffered: true`: the entries from startup and the reload are real but they are not
    // what a gesture cost, and folding them in would make the worst number permanently the
    // page's own boot.
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__MULCH_LONG_TASKS__.push(entry.duration);
    }).observe({ type: "longtask" });
  });
};

export const longTasks = async ({ page }) => {
  const tasks = await page.evaluate(() => {
    const durations = window.__MULCH_LONG_TASKS__;
    return {
      count: durations.length,
      longest: durations.length === 0 ? 0 : Math.max(...durations),
      total: durations.reduce((sum, duration) => sum + duration, 0),
    };
  });

  if (tasks.longest > LONGEST_MS) {
    fail(`a gesture blocked the main thread for ${tasks.longest.toFixed(0)}ms`, tasks);
  }
  report(
    `the slide, trim, seek and sweep gestures blocked the main thread for ` +
      `${tasks.longest.toFixed(0)}ms at worst, across ${tasks.count} long tasks`,
  );
};
