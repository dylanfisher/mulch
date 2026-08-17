/** @role The ⌘/Ctrl+K palette in a real browser: one key, one filter, one entry, one command. */
import { fail, report } from "./harness.js";

/**
 * After the reload, like every other browser gesture: work before `reload()` stalls the reloaded
 * page's audio clock (plan §3), and this is a dialog. It opens instantly — `duration-0` on the
 * popup and the backdrop both — so Playwright never waits out an animation before it may type
 * (0056). One pass and one entry: which command each of the others sends is proved without a
 * browser in src/ui/CommandPalette.test.tsx.
 *
 * What it leaves behind is one extra yard, so it runs after ./narrow.js: a third yard's controls
 * do not fit the 360px shell that scenario measures. Only ./leaks.js follows, and that takes its
 * own before-and-after deltas on deck a.
 */
export const commandPalette = async ({ page }) => {
  const before = await page.evaluate(() => window.mulch.probe().deckList.length);

  // Control rather than Meta: the registry takes either as the primary modifier, and Meta is the
  // OS's on the machine this may also be run by hand on.
  await page.keyboard.press("Control+k");
  const filter = page.locator('input[aria-label="Command Palette"]');
  await filter.waitFor();

  const entries = page.locator('[role="option"]');
  const offered = await entries.count();
  if (offered < 2) {
    fail(`palette smoke: the palette opened offering ${offered} entries`);
  }

  // "Add Yard" is the whole query and matches exactly one label: "Add Filter to Yard A" and the
  // Go To rows carry both words but never that pair, so the first row is the one Enter takes.
  await filter.fill("Add Yard");
  await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 1);
  await page.keyboard.press("Enter");

  // Chosen closes it, so the instrument is back under the hand it was reached from.
  await filter.waitFor({ state: "detached" });
  await page.waitForFunction((was) => window.mulch.probe().deckList.length === was + 1, before);
  const added = await page.evaluate(() => window.mulch.probe().deckList.at(-1));
  if (typeof added.emoji !== "string" || added.emoji.length === 0) {
    fail(`palette smoke: the palette added a yard with no emoji — ${JSON.stringify(added)}`);
  }

  report(
    `one key opened a palette of ${offered} entries, and the one Enter chose sent the ordinary ` +
      `deck.add the button sends — yard ${added.id} "${added.name}" ${added.emoji}`,
  );
};
