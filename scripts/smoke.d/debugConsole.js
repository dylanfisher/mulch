/** @role The debug console: one key, the ring it already had, and nothing left in the page after it. */
import { fail, report } from "./harness.js";

export const debugKey = async ({ page }) => {
  // P9 rides the same restored page, for the same reason P8 does — this is browser work, and
  // it belongs after the reload (plan §3). One key opens the console, the ring it already had
  // is what it shows, and the counters are written by the frame loop rather than by React.
  // The command is `session.save`: transient, so the export below still carries the same
  // durable session, and it is a row in the feed within a frame of being sent.
  // Out of the rename field first: an editable target keeps its own keyboard, by design.
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Backquote");
  const debugPanel = '[aria-label="Debug Console"]';
  await page.waitForSelector(debugPanel);
  await page.evaluate(() => window.mulch.send({ t: "session.save" }));
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.textContent?.includes("session.saved") === true,
    debugPanel,
  );
  const debugConsole = await page.evaluate((selector) => {
    const panel = document.querySelector(selector);
    const counter = (name) =>
      [...panel.querySelectorAll("dl > div")].find(
        (pair) => pair.firstElementChild.textContent === name,
      )?.lastElementChild.textContent;
    return {
      rows: panel.querySelectorAll("ol > li").length,
      feed: panel.querySelector("ol").textContent,
      frame: counter("frame"),
      context: counter("context"),
      queued: counter("queued"),
    };
  }, debugPanel);
  await page.keyboard.press("Backquote");
  await page.waitForSelector(debugPanel, { state: "detached" });
  debugConsole.closed = (await page.locator(debugPanel).count()) === 0;

  // P9: the console is a view of what already exists — a fixed window of the one ring, counters
  // the frame loop wrote, and nothing at all left behind when it closes.
  if (!debugConsole.feed.includes("session.saved")) {
    fail(`the debug console did not show the command it was sent — ${debugConsole.feed}`);
  }
  if (debugConsole.rows < 1) {
    fail("the debug console rendered no feed rows");
  }
  if (!/^\d+\.\d\dms$/u.test(debugConsole.frame ?? "")) {
    fail(`the frame loop did not write the frame cost — ${debugConsole.frame}`);
  }
  if (!["running", "suspended", "closed"].includes(debugConsole.context)) {
    fail(`the debug console did not report the context state — ${debugConsole.context}`);
  }
  if (!/^\d+$/u.test(debugConsole.queued ?? "")) {
    fail(`the debug console did not report the queue depth — ${debugConsole.queued}`);
  }
  if (!debugConsole.closed) {
    fail("the debug console stayed in the page after its key closed it");
  }
  report(
    `one key opened the debug console: ${debugConsole.rows} feed rows carrying the ` +
      `command it was sent, a ${debugConsole.frame} frame on a ` +
      `${debugConsole.context} context, and nothing left in the page when it closed`,
  );
};
