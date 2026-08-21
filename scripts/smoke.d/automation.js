/** @role One ride of the gain knob under Option, committed as a single durable lane. */
import { fail, settledBox } from "./harness.js";

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
};
