/**
 * @role The jumps card in a real browser: its bypass switch pressed in the corner every card's is
 *   in, then the marker on the Hold dial opened and one amount moved — and the other door in that
 *   corner, where a character name draws the whole spec at once and the amount under it travels
 *   the card back to plain (0152).
 */
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
  // person presses rather than a command written past the UI. It is pressed where every other
  // card's is: in the card's own action corner, at the top right of its header — which is the one
  // claim about the corner no unit test can make about a laid-out page (P87).
  const corner = player.locator('[data-slot="card-header"] [data-slot="card-action"]');
  const toggle = corner.getByLabel("Enable Jumps on Yard A");
  if ((await toggle.count()) !== 1) {
    fail("player rate smoke: the jumps switch was not in the card's top-right corner");
  }
  const head = await player.locator('[data-slot="card-header"]').boundingBox();
  const box = await toggle.boundingBox();
  // A box is null for anything the page is not laying out, so the switch being invisible has to
  // fail as the corner claim it is rather than as a TypeError two lines further on (principle 5).
  if (head === null || box === null) {
    fail("player rate smoke: the jumps card's head or its switch was not laid out", { head, box });
  }
  if (box.x + box.width / 2 < head.x + head.width / 2 || box.y > head.y + head.height) {
    fail("player rate smoke: the jumps switch was not drawn in the head's right-hand half", {
      head,
      box,
    });
  }
  await toggle.click();
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

  /**
   * And the other door in that corner. What no unit test can say is that a name pressed in a real
   * popover reaches the same `deck.player` every dial sends — twenty fields at once — and that the
   * amount under those names travels the whole card back to what the switch leaves (0152).
   */
  await page.keyboard.press("Escape");
  const character = corner.getByLabel("Character on Yard A");
  await character.click();
  const stutter = page.getByRole("button", { name: "Stutter", exact: true });
  await stutter.waitFor();
  await stutter.click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.gate > 0);

  const drawn = await page.evaluate(() => window.mulch.probe().decks.a.player);
  // The seed is the one field a character may not touch: it says which performance this is, and
  // the control that draws a new one is the button beside this menu (0089).
  if (drawn.seed !== after.seed) {
    fail("player rate smoke: pressing a character redrew the seed", { was: after, now: drawn });
  }
  if (drawn.burst >= after.burst) {
    fail("player rate smoke: Stutter did not shorten the burst", { was: after, now: drawn });
  }

  const amount = page.getByRole("slider", { name: "Yard A Character Amount" });
  await amount.focus();
  await page.keyboard.press("Home");
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.gate === 0);
  const plain = await page.evaluate(() => window.mulch.probe().decks.a.player);

  report(
    `the jumps switch in the card's top-right corner turned the module on, then the rate marker opened and its spread dial moved ${before}→${after.spread}, leaving the hold at ${after.hold}; the character menu beside it drew Stutter onto the whole card at once — burst ${after.burst}s→${drawn.burst.toFixed(3)}s, gate ${after.gate}→${drawn.gate.toFixed(2)} — on the same seed ${plain.seed}, and none of it put every dial back at the switch's own burst ${plain.burst}s and gate ${plain.gate}`,
  );
};
