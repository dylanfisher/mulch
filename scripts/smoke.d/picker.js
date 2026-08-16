/** @role The add-an-effect picker in a real browser: the registry listed, one entry chosen. */
import { fail, report } from "./harness.js";

/**
 * After the reload rather than beside ./rack.js, which is where the rack's other gestures live: a
 * popover opened before `reload()` stalls the reloaded page's audio clock and costs the gate most
 * of a second (plan §3, 0056). What it leaves behind is one extra EQ on deck a, which nothing
 * after it reads — ./leaks.js measures its own before-and-after deltas.
 */
export const effectPicker = async ({ page }) => {
  const rack = page.getByLabel("Yard A Effects");
  const before = await page.evaluate(() => window.mulch.probe().decks.a.effects.length);

  const chosen = page.getByRole("button", { name: "Add EQ to Yard A" });
  await rack.getByRole("button", { name: "Add an Effect to Yard A" }).click();
  await chosen.waitFor();
  // Every registry entry, read in one pass off the open popup rather than one wait per label: a
  // plugin appears here by existing (0016), so what is asserted is the whole list, not a sample.
  const listed = await page
    .locator('[data-slot="popover-content"] [aria-label^="Add "]')
    .evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
  const expected = ["Filter", "Delay", "EQ"].map((label) => `Add ${label} to Yard A`);
  if (listed.join("|") !== expected.join("|")) {
    fail(
      `picker smoke: the popover listed ${listed.join(", ")} — the registry is ${expected.join(", ")}`,
    );
  }

  await chosen.click();
  // Choosing closes the picker, so the next control a person reaches for is not behind it.
  await chosen.waitFor({ state: "hidden" });
  await page.waitForFunction((was) => {
    const entries = window.mulch.probe().decks.a.effects;
    return entries.length === was + 1 && entries.at(-1).effect === "eq";
  }, before);
  report(`the picker listed ${listed.length} registry entries and added an eq through the popover`);
};
