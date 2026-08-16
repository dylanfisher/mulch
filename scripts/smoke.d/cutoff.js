/** @role An effect's own parameter recorded under Option, onto the instance that holds it. */
import { fail } from "./harness.js";

export const cutoff = async ({ page }) => {
  const rack = page.getByLabel("Deck a effects");
  // P5/P10 ride the same browser: an effect's parameter is automatable only because its plugin
  // declared it and the rack holds it, and Option turns that same knob into a recorded lane —
  // on a bypassed effect, which is still bound and still scheduled (0024, 0028).
  const beforeCutoff = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  const cutoffKnob = rack.getByRole("slider", { name: "Cutoff" });
  const knobBounds = await cutoffKnob.boundingBox();
  if (knobBounds === null) throw new Error("cutoff knob has no browser bounds");
  const armed = () => page.locator('[data-automation="armed"]').count();
  if ((await armed()) !== 0) throw new Error("a knob was armed before Option was held");
  await page.keyboard.down("Alt");
  // The reveal: every automatable knob, on both decks, and nothing else.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-automation="armed"]').length === 3,
  );
  await page.mouse.move(knobBounds.x + knobBounds.width / 2, knobBounds.y + knobBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(knobBounds.x + knobBounds.width / 2, knobBounds.y - 40, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  // The lane lands on the instance holding the knob, not beside the deck's own lanes (0030).
  await page.waitForFunction(
    () => (window.mulch.probe().decks.a.effects[0]?.automation["filter.cutoff"]?.length ?? 0) > 1,
  );
  if ((await armed()) !== 0) throw new Error("a knob stayed armed after Option was released");
  const cutoffOps = await page.evaluate((after) => {
    const deck = window.mulch.probe().decks.a;
    const entry = deck.effects[0];
    return {
      events: window.mulch
        .ring()
        .filter((event) => event.seq > after && event.t === "automation.changed")
        .map((event) => event.param),
      lane: entry.automation["filter.cutoff"].length,
      // Every recorded point is timed from the start of its own gesture, never from the
      // playhead the recorder happened to be at (0028).
      startsAtZero: entry.automation["filter.cutoff"][0].at === 0,
      // The deck holds no lane of its own for it: a value belongs to (instance, param) (0030).
      deckLanes: Object.keys(deck.automation).join(","),
      // The recorded lane runs against a bypassed instance, which kept its nodes (0023, 0024).
      bypassed: deck.effects
        .filter((current) => current.bypassed)
        .map((current) => current.effect)
        .join(","),
    };
  }, beforeCutoff);

  // P5/P10: one command, one registry-owned target — and the effect's own lane both on the live
  // bypassed rack and through the offline chain, marked and previewed on the knob (0024, 0028).
  if (
    cutoffOps.events.length !== 1 ||
    cutoffOps.events.some((param) => param !== "filter.cutoff") ||
    cutoffOps.lane < 2 ||
    !cutoffOps.startsAtZero ||
    cutoffOps.bypassed !== "filter"
  ) {
    fail(
      `effect-owned automation did not commit one lane per gesture — ${JSON.stringify(cutoffOps)}`,
    );
  }
};
