/**
 * @role What a drawn lane says about itself once it is the session's rather than a knob's: the
 *   character the row is pressed on, the count set without redrawing, a duplicate of the effect
 *   that redraws the same way (0314) — and the global Stop putting the session's elapsed run back
 *   to nought (0315).
 */
import { fail, report } from "./harness.js";

/** What the session holds for the EQ's frequency on a given instance, or null. */
const drawnOn = (page, instance) =>
  page.evaluate(
    (id) => window.mulch.probe().decks.a.effects.find((entry) => entry.id === id)?.drawn ?? null,
    instance,
  );

export const motionDrawn = async ({ page }) => {
  // The character row is a toggle group pressed on what the session holds, so the press is the
  // ordinary one a hand makes: the marker, then a name, then a count (0314).
  await page.keyboard.down("Alt");
  const marker = page.getByLabel("Yard A EQ/Filter 1 Freq Automation");
  await marker.scrollIntoViewIfNeeded();
  await marker.click();
  await page.getByLabel("Yard A EQ/Filter 1 Freq Smooth").click();
  await page.waitForFunction(
    () => window.mulch.probe().decks.a.effects[0]?.drawn["eq.frequency"] !== undefined,
  );
  // The count is set without redrawing: the other writer of the one fact the draw above wrote.
  const points = await page.evaluate(
    () => window.mulch.probe().decks.a.effects[0]?.automation["eq.frequency"]?.length ?? 0,
  );
  await page.getByLabel("Yard A EQ/Filter 1 Freq Redraw every 2 passes").click();
  await page.waitForFunction(
    () => window.mulch.probe().decks.a.effects[0]?.drawn["eq.frequency"]?.redraw === 2,
  );
  await page.keyboard.up("Alt");
  await page.keyboard.press("Escape");

  const drew = await drawnOn(page, "flt");
  if (drew?.["eq.frequency"]?.character !== "smooth" || !(points > 1)) {
    fail("the drawn lane did not say what drew it", { drew, points });
  }

  // A duplicate carries it, which is the whole reason the fact had to leave the knob: two knobs
  // redraw the same way because the session says so (0027, 0314).
  await page.evaluate(() =>
    window.mulch.send({ t: "effect.duplicate", deck: "a", instance: "flt", id: "flt-2" }),
  );
  await page.waitForFunction(() =>
    window.mulch.probe().decks.a.effects.some((entry) => entry.id === "flt-2"),
  );
  const copied = await drawnOn(page, "flt-2");
  if (JSON.stringify(copied) !== JSON.stringify(drew)) {
    fail("a duplicated effect did not carry what drew its lane", { drew, copied });
  }
  report("a drawn lane says what drew it, and a copy of its effect redraws the same way");

  // And the one thing a global press sends that no yard's own row does: the session's elapsed run
  // back to nought, which is where the next take begins (0315).
  const ran = await page.evaluate(() => window.mulch.probe().at);
  await page.getByRole("button", { name: "Stop Every Yard" }).click();
  const rewound = await page.evaluate(() => window.mulch.probe().at);
  if (!(ran > 1) || !(rewound < 1)) {
    fail("the global stop did not return the elapsed run to nought", { ran, rewound });
  }
  report(`the global stop put the elapsed run back to nought from ${ran.toFixed(1)}s`);
};
