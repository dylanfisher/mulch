/** @role What the gestures cost the main thread, watched across the drags that already happen. */
import { fail, report, settledBox } from "./harness.js";

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

/**
 * One more gesture inside the bracket, and the only one that is dragged while a yard is *playing*:
 * a dial in the mulcher's Which Ground fold, on a deck jumping an arrangement it drew for itself.
 * That is the drag P151 measured — every dial on the card is painting the standing voice off the
 * one loop while the drag's own renders queue behind it — so the claim about what a gesture costs
 * the main thread is made here rather than in a scenario of its own (plan §3).
 *
 * The yard is borrowed and put back: the pattern and the transport go back to what this page came
 * with and the loop is never touched, because everything after this reads a settled page
 * (`playerRate` borrows the same yard the same way).
 */
export const groundDrag = async ({ page }) => {
  // Yard B, because it is the one carrying a loop by the time this runs — `sweep` and `flick`
  // shaped it two scenarios ago — and a yard with no loop draws no card at all (0159, 0171).
  const card = page.getByLabel("Yard B Mulcher");
  // The switch mints the spec, because a full one is the module's own vocabulary and this file has
  // no business writing one out (0173, principle 1).
  await card.locator('[data-slot="player-heading"]').getByLabel("Enable Mulcher on Yard B").click();
  await page.waitForFunction(() => window.mulch.probe().decks.b.player !== null);
  const fold = card.getByRole("button", { name: "Which Ground", exact: true });
  await fold.waitFor();
  await fold.click();
  const every = card.getByRole("slider", { name: "Every", exact: true });
  await every.waitFor();

  // A ground that moves and an arrangement the pattern draws for itself: without one, no part
  // stands and no dial paints a voice at all, which is the cheap case rather than the measured one.
  await page.evaluate(() => {
    const player = window.mulch.probe().decks.b.player;
    window.mulch.send({
      t: "deck.player",
      deck: "b",
      player: { ...player, arrange: 1, bedEvery: 8, bedDistance: 8 },
    });
    window.mulch.send({ t: "deck.play", deck: "b" });
  });
  await page.waitForFunction(() => window.mulch.peek("b").player.step !== null);

  const box = await settledBox(every, "ground drag smoke: the Every dial");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Kept off the dial's own floor: a period of nought draws no grounds ahead, so a drag that
  // bottoms out stops being the gesture this is here to price.
  for (let round = 0; round < 3; round += 1) {
    await page.mouse.move(x, y - 16, { steps: 30 });
    await page.mouse.move(x, y + 6, { steps: 30 });
  }
  await page.mouse.up();
  const moved = await page.evaluate(() => window.mulch.probe().decks.b.player.bedEvery);
  if (moved === 8) {
    fail("ground drag smoke: the drag on Every wrote nothing, so it priced no gesture", { moved });
  }

  // Put back: the transport halted and the pattern cleared the way the switch clears it, which
  // leaves this yard exactly as it was found — its loop was never touched.
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.stop", deck: "b" });
    window.mulch.send({ t: "deck.player", deck: "b", player: null });
  });
  await page.waitForFunction(
    () =>
      window.mulch.probe().decks.b.playing === false &&
      window.mulch.probe().decks.b.player === null,
  );
  // And the fold shut again, which is how this yard was found: what one scenario leaves is what the
  // next one reads, and a view preference is state like any other (src/ui/Deck.tsx).
  await fold.click();
  // The pointer taken off the control it let go on, so no popup of its own stands into whatever
  // reads the page next (0056, 0094 — the same close `playerRate` waits out).
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () => document.querySelectorAll('[data-slot="tooltip-content"]').length === 0,
  );
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
    `the slide, trim, seek, sweep and ground gestures blocked the main thread for ` +
      `${tasks.longest.toFixed(0)}ms at worst, across ${tasks.count} long tasks`,
  );
};
