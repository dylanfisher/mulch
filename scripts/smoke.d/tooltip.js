/**
 * @role The tooltip costs the driver nothing: a pointer that crosses a rack opens no popup, and a
 * control pressed the moment it is reached is pressed straight away rather than through an
 * animation.
 */
import { fail, report, settledBox } from "./harness.js";

/**
 * What a popup the driver has to wait out is worth, measured: an animated popover cost one
 * scenario ~450ms after the reload and 1.68s before it (plan §3, 0056). A press that has waited
 * for nothing lands in tens of milliseconds, so anything approaching that measured cost is the
 * tooltip having become a thing the smoke waits on.
 */
const ANIMATION_BUDGET_MS = 300;

/**
 * After the reload with the rest of the rack's browser work, and for the same reason (plan §3).
 * It presses the reorder handle, which is the one control on a card whose bare click changes
 * nothing — reordering is a drag or an arrow key on it (0062) — so this scenario leaves the page
 * exactly as it found it, and it asserts that too rather than assuming it.
 */
export const tooltipCostsNothing = async ({ page }) => {
  const rack = page.getByLabel("Yard A Effects");
  const handle = rack.getByRole("button", { name: /^Reorder .* on Yard A$/u }).first();
  // First, because it scrolls: everything measured after it is measured against the viewport it
  // leaves at rest (0036, harness.js).
  const box = await settledBox(handle, "a rack card's own handle");
  const popup = page.locator('[data-slot="tooltip-content"]');
  const order = () =>
    page.evaluate(() =>
      window.mulch
        .probe()
        .decks.a.effects.map((entry) => entry.effect)
        .join(","),
    );
  const before = await order();

  // The crossing: a hand moving to a control passes over every caption and every button on the
  // way. The centres are read in one pass and walked with raw moves, because that is the shape of
  // the crossing — at no delay each of these would flash a popup in turn.
  const crossed = await rack.locator("[data-base-ui-tooltip-trigger]").evaluateAll((triggers) =>
    triggers.map((trigger) => {
      const at = trigger.getBoundingClientRect();
      return { x: at.x + at.width / 2, y: at.y + at.height / 2 };
    }),
  );
  if (crossed.length < 2) {
    fail(`tooltip smoke: the rack offered ${crossed.length} tooltips to cross`);
  }
  for (const at of crossed) await page.mouse.move(at.x, at.y);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const crossing = await popup.count();

  // The press, taken from where the pointer already is: this is the shape every gesture in the
  // browser half has, and the only thing being timed is whether something opened in front of it.
  const started = Date.now();
  await handle.click();
  const pressed = Date.now() - started;
  const during = await popup.count();

  if (crossing !== 0) {
    fail(
      `tooltip smoke: ${crossing} popups opened at a pointer crossing ${crossed.length} controls`,
    );
  }
  if (during !== 0) fail(`tooltip smoke: ${during} popups stood in front of the control pressed`);
  if (pressed > ANIMATION_BUDGET_MS) {
    fail(
      `tooltip smoke: a press the pointer was already resting on took ${pressed}ms, over the ${ANIMATION_BUDGET_MS}ms an animation would cost`,
    );
  }
  const after = await order();
  if (after !== before) fail(`tooltip smoke: the press reordered the rack — ${before} to ${after}`);
  report(
    `a pointer crossed ${crossed.length} tooltips and pressed a handle in ${pressed}ms, opening none of them`,
  );
};
