/** @role A dial told a number instead of turned to one: the readout pressed, typed into, and the
 *  one command that lands — and Escape, which lands nothing (0201). */
import { fail, report } from "./harness.js";

/** A reading a drag could not land on: the tone dial is logarithmic across two decades, so this
 *  is the case for typing rather than turning in the first place. */
const TYPED_HZ = 220;

/** What the dial is standing at when this scenario arrives, and what Escape must leave it at. */
const tone = (page) => page.evaluate(() => window.mulch.probe().decks.a.params["deck.tone"]);

export const typedKnob = async ({ page }) => {
  const yard = page.getByLabel("Yard A (Active)");
  const dial = yard.getByRole("slider", { name: "Tone" });
  await dial.scrollIntoViewIfNeeded();
  // The readout is the dial's own second half, beside it in the same box (src/ui/Knob.tsx).
  const reading = dial.locator('xpath=../span[@data-slot="knob-reading"]//button');
  const before = await tone(page);

  await reading.click();
  const field = yard.locator('[data-slot="knob-field"]');
  await field.fill(String(TYPED_HZ));
  await field.press("Enter");
  await page.waitForFunction(
    (hz) => window.mulch.probe().decks.a.params["deck.tone"] === hz,
    TYPED_HZ,
  );

  // And the way out that changes nothing: a field opened, typed into and dismissed leaves the
  // dial exactly where the last committed reading left it.
  await reading.click();
  await field.fill("1234");
  await field.press("Escape");
  if ((await field.count()) !== 0) fail("Escape left the readout as a field");
  const after = await tone(page);
  if (after !== TYPED_HZ) {
    fail(`a typed reading did not hold — ${JSON.stringify({ before, typed: TYPED_HZ, after })}`);
  }
  report(
    `a tone dial standing at ${before}Hz was told ${TYPED_HZ}Hz through its own readout, and a second reading typed over it and dismissed left it there`,
  );
};
