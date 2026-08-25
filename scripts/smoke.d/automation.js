/** @role One ride of the gain knob under Option, committed as a single durable lane. */
import { fail, report, settledBox } from "./harness.js";

export const automation = async ({ page }) => {
  // P3/P10 ride the same browser: Option plus a ride of the gain knob commits one durable lane
  // whose points are its own gesture's timing, and the ordinary history commands undo and redo
  // that whole gesture (0028).
  const gainKnob = page.getByLabel("Yard A (Active)").getByRole("slider", { name: "Gain" });
  const beforeAutomation = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  const gainBounds = await settledBox(gainKnob);
  const gainIs = (points) =>
    page.waitForFunction(
      (points) => (window.mulch.probe().decks.a.automation["deck.gain"]?.length ?? 0) === points,
      points,
    );
  const aim = [gainBounds.x + gainBounds.width / 2, gainBounds.y + gainBounds.height / 2];
  // What the press actually reached, kept by the page itself: `page.mouse` aims at coordinates
  // rather than at a control, so a viewport still moving between the measurement and the press
  // sends the ride to whatever is under the point by then. Named here, because the wait below
  // would report only that no lane arrived in 15s — the one report that never says why (0036).
  await page.evaluate(() => {
    window.ridePressed = null;
    document.addEventListener(
      "pointerdown",
      (event) => {
        window.ridePressed =
          event.target instanceof Element
            ? (event.target.closest("[data-slot], [aria-label]")?.getAttribute("aria-label") ??
              "something unlabelled")
            : null;
      },
      { capture: true, once: true },
    );
  });
  await page.keyboard.down("Alt");
  await page.mouse.move(...aim);
  await page.mouse.down();
  const pressed = await page.evaluate(() => window.ridePressed);
  if (pressed !== "Gain")
    fail("the gain ride pressed something else", { pressed, gainBounds, aim });
  await page.mouse.move(aim[0], gainBounds.y - 30, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await page.waitForFunction(
    () => (window.mulch.probe().decks.a.automation["deck.gain"]?.length ?? 0) > 1,
  );
  const gainLane = await page.evaluate(
    (after) => ({
      // One gesture, one durable change: the whole ride is a single command (0028).
      events: window.mulch
        .ring()
        .filter((event) => event.seq > after && event.t === "automation.changed").length,
      points: window.mulch.probe().decks.a.automation["deck.gain"],
    }),
    beforeAutomation,
  );
  const gainPoints = gainLane.points.length;
  await page.getByRole("button", { name: "undo" }).click();
  await gainIs(0);
  await page.getByRole("button", { name: "redo" }).click();
  await gainIs(gainPoints);

  // P10: riding the gain knob under Option is one durable gesture, undone and redone whole (0028).
  if (gainLane.events !== 1 || gainLane.points.length < 2) {
    fail(`the recorded gain ride was not one whole lane — ${JSON.stringify(gainLane)}`);
  }
  if (gainLane.points[0].at !== 0) {
    fail(`a recorded lane did not start at its own zero — ${JSON.stringify(gainLane.points[0])}`);
  }

  // P112: the marker that lane left is a control. A press latches its preview open, so the one
  // gesture the preview exists for — the drag that stretches the lane's span (0079) — can start by
  // taking the pointer off the dot that opened it, and a second press puts it away (0154).
  await page.keyboard.down("Alt");
  const marker = page.getByLabel("Yard A Gain Automation");
  await marker.scrollIntoViewIfNeeded();
  await marker.click();
  const preview = page.getByLabel(/^Yard A Gain Lane, \d+ points$/u);
  await preview.waitFor();
  // Measured here and not from the ride's own box seventy lines up: that box predates a scroll and
  // a popup, and an aim that has gone stale lands inside the popup this line has to leave — where
  // Base UI's own hover would hold it open and the assertion below would pass with no latch at
  // all. Down, because the popup opens upwards.
  const markerBox = await settledBox(marker);
  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height + 160, {
    steps: 6,
  });
  // Longer than any close still being decided: the popup itself opens and closes instantly (0056),
  // and by here the pointer is well outside the grace region the hover closes on.
  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });
  if (!(await preview.isVisible())) {
    fail("a latched lane preview closed when the pointer left the marker");
  }
  await marker.click();
  await preview.waitFor({ state: "hidden" });
  await page.keyboard.up("Alt");
  report("the lane marker latched its preview open under a press and closed it under the next");
};
