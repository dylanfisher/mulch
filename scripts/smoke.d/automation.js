/** @role One ride of the gain knob under Option, committed as a single durable lane. */
import { fail } from "./harness.js";

export const automation = async ({ page }) => {
  // P3/P10 ride the same browser: Option plus a ride of the gain knob commits one durable lane
  // whose points are its own gesture's timing, and the ordinary history commands undo and redo
  // that whole gesture (0028).
  const gainKnob = page.getByLabel("Deck a (active)").getByRole("slider", { name: "Gain" });
  await gainKnob.scrollIntoViewIfNeeded();
  const beforeAutomation = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  const gainBounds = await gainKnob.boundingBox();
  if (gainBounds === null) throw new Error("gain knob has no browser bounds");
  const gainIs = (points) =>
    page.waitForFunction(
      (points) => (window.mulch.probe().decks.a.automation["deck.gain"]?.length ?? 0) === points,
      points,
    );
  await page.keyboard.down("Alt");
  await page.mouse.move(gainBounds.x + gainBounds.width / 2, gainBounds.y + gainBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(gainBounds.x + gainBounds.width / 2, gainBounds.y - 30, { steps: 6 });
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
