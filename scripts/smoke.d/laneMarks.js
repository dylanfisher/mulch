/** @role The mark a recorded lane leaves on its own knob, and the preview that rides the transport. */
import { fail, report } from "./harness.js";

export const lanePreview = async ({ page }) => {
  // P10 rides the same restored page, deliberately after the reload rather than before it, for
  // the same reason P8 does (plan §3): the lane a knob owns is marked on the knob itself while
  // Option is down, and hovering that mark previews it read-only — the whole of what replaced
  // the lane editor (0028). A restored lane is the honest place to ask: the mark is derived from
  // the session, so it has to come back with it.
  await page.keyboard.down("Alt");
  // The mark is named for the slot that owns the value, because two instances of one effect
  // would otherwise give two knobs the same name (0030).
  const cutoffMark = page.getByLabel("Yard A Filter 1 Cutoff Automation");
  await cutoffMark.scrollIntoViewIfNeeded();
  await cutoffMark.hover();
  await page.getByLabel(/^Yard A Filter 1 Cutoff Lane, \d+ points$/u).waitFor();
  // One mark per lane and no more: a knob that owns nothing has nothing to show.
  const laneMarks = await page.evaluate(
    () => document.querySelectorAll('[data-automated="true"]').length,
  );

  // P10 rides the same open preview: while the deck plays, a lane paints. The dial follows the
  // value the transport is driving it with, and the preview's dot rides the same phase — one
  // peek a frame, two surfaces, and neither of them a clock of its own (0035).
  const sample = () =>
    page.evaluate(() => {
      const indicator = document.querySelector(
        '[aria-label="Filter 1"] [role="slider"][aria-label="Cutoff"] line',
      );
      const dot = document.querySelector('[data-slot="lane-playhead"]');
      return {
        dial: `${indicator.getAttribute("x2")},${indicator.getAttribute("y2")}`,
        left: dot.style.left,
        opacity: dot.style.opacity,
      };
    });
  const stillLane = await sample();
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.play", deck: "a" });
  });
  const movingLane = await (
    await page.waitForFunction(
      (before) => {
        const indicator = document.querySelector(
          '[aria-label="Filter 1"] [role="slider"][aria-label="Cutoff"] line',
        );
        const dot = document.querySelector('[data-slot="lane-playhead"]');
        const now = {
          dial: `${indicator.getAttribute("x2")},${indicator.getAttribute("y2")}`,
          left: dot.style.left,
          opacity: dot.style.opacity,
        };
        return now.dial !== before.dial && now.left !== before.left && now.opacity === "1"
          ? now
          : null;
      },
      stillLane,
      { timeout: 10_000 },
    )
  ).jsonValue();
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.stop", deck: "a" });
  });
  // Stopping parks the gesture where it stopped instead of putting the dial back to the value
  // underneath it: the dot stays on the path, and a quarter second later — several cycles of a
  // 0.4s lane — neither it nor the dial has moved (0040).
  await page.waitForFunction(() => window.mulch.probe().decks.a.playing === false, undefined, {
    timeout: 5_000,
  });
  const haltedLane = await sample();
  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });
  const heldLane = await sample();
  await page.keyboard.up("Alt");

  // P10: the knob's mark is the whole surviving affordance, and it is derived from the restored
  // session — one mark per lane the reloaded page came back holding, none for a knob without (0028).
  if (laneMarks !== 2) {
    fail(`a restored page marked ${laneMarks} knobs, expected one per lane`);
  }

  // P10: the live surfaces follow it. The dial and the preview's dot both moved while it played,
  // and both held where they were when it stopped (0035, 0040).
  if (movingLane.opacity !== "1") {
    fail(`the lane preview never showed a playhead — ${JSON.stringify(movingLane)}`);
  }
  if (haltedLane.opacity !== "1") {
    fail(`stopping took the lane's playhead away — ${JSON.stringify(haltedLane)}`);
  }
  if (haltedLane.dial !== heldLane.dial || haltedLane.left !== heldLane.left) {
    fail(
      `the lane kept moving after the transport stopped — ` +
        `${JSON.stringify(haltedLane)} then ${JSON.stringify(heldLane)}`,
    );
  }
  report("the dial and the preview's dot both followed it live, and both parked where it stopped");
};
