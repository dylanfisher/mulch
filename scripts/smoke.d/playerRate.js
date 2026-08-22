/** @role The rate group in a real browser: the marker on the Hold dial opened, one amount moved. */
import { fail, report } from "./harness.js";

/**
 * The one claim no unit test can make: the marker at the Hold dial's corner actually opens the
 * popup, and a dial inside it patches the spec the card sends (0118). Everything else about the
 * group — which field each dial moves, when the marker lights, that the three are not drawn until
 * it opens — is `src/ui/PlayerRate.test.tsx`, which is faster and does not need a page.
 *
 * After the picker for the reason the picker is after the reload: a popover opened before
 * `reload()` stalls the reloaded page's audio clock (plan §3, 0056). What it leaves behind is a
 * yard holding a pattern, which nothing after it reads — `./leaks.js` takes its own deltas.
 */
export const playerRate = async ({ page }) => {
  const player = page.getByLabel("Yard A Jumps");
  await player.scrollIntoViewIfNeeded();
  // The module is off on this page until something turns it on, and turning it on is the switch a
  // person presses rather than a command written past the UI.
  await player.getByLabel("Enable Jumps on Yard A").click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player !== null);

  const marker = player.getByRole("button", { name: "Yard A Rate" });
  const spread = page.getByRole("slider", { name: /Spread/u });
  // Not drawn at all until the marker is pressed: the three amounts are behind it, which is what
  // keeps the card's row one height (0093).
  if (await spread.isVisible()) fail("player rate smoke: the spread dial was drawn before opening");
  await marker.click();
  await spread.waitFor();

  // Moved by the keyboard rather than by a drag: this scenario's claim is that the popup opens and
  // its dials reach the same `deck.player` the card sends, not how a knob reads a pointer (0064).
  const before = await page.evaluate(() => window.mulch.probe().decks.a.player.spread);
  await spread.focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    (was) => window.mulch.probe().decks.a.player.spread === was - 1,
    before,
  );

  const after = await page.evaluate(() => window.mulch.probe().decks.a.player);
  if (after.hold !== 0) fail("player rate smoke: moving the spread moved the hold", after);
  report(
    `the rate marker opened on a jumping yard and its spread dial moved ${before}→${after.spread}, leaving the hold at ${after.hold}`,
  );
};
