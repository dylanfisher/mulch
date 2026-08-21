/**
 * @role The tooltip costs the driver nothing: a pointer that crosses a rack opens no popup, and a
 * control pressed after that crossing is pressed straight away rather than through an animation.
 */
import { fail, report } from "./harness.js";

/**
 * What a popup the driver has to wait out is worth, measured: an animated popover cost one
 * scenario ~450ms after the reload and 1.68s before it (plan §3, 0056). A press that has waited
 * for nothing lands in tens of milliseconds, so anything approaching that measured cost is the
 * tooltip having become a thing the smoke waits on.
 */
const ANIMATION_BUDGET_MS = 300;

/**
 * How many of the rack's triggers the pointer is actually walked over. Every move is one round
 * trip, and the claim — a hand crossing the rack opens nothing on the way past — is the same claim
 * at four controls as at twelve, while the other eight cost the gate ~65ms to repeat it (0012).
 */
const CROSSED_SAMPLE = 4;

/** The rack this rides, named once: the label the driver finds it by and the label it reports. */
const RACK = "Yard A Effects";

/**
 * Everything about the page this scenario reads, in one round trip rather than four: what the rack
 * holds, how many popups are open, and where the controls a pointer would cross are. A locator
 * `count()` and a `probe()` are a CDP call each, and this scenario is on the gate's critical path.
 */
const survey = (page) =>
  page.evaluate((rack) => {
    const section = document.querySelector(`[aria-label="${rack}"]`);
    if (section === null) throw new Error(`no ${rack} on the page`);
    return {
      order: window.mulch
        .probe()
        .decks.a.effects.map((entry) => entry.effect)
        .join(","),
      popups: document.querySelectorAll('[data-slot="tooltip-content"]').length,
      triggers: [...section.querySelectorAll("[data-base-ui-tooltip-trigger]")].map((trigger) => {
        const at = trigger.getBoundingClientRect();
        return { x: at.x + at.width / 2, y: at.y + at.height / 2 };
      }),
    };
  }, RACK);

/**
 * After the reload with the rest of the rack's browser work, and for the same reason (plan §3).
 * It presses the reorder handle, which is the one control on a card whose bare click changes
 * nothing — reordering is a drag or an arrow key on it (0062) — so this scenario leaves the page
 * exactly as it found it, and it asserts that too rather than assuming it.
 */
export const tooltipCostsNothing = async ({ page }) => {
  const handle = page
    .getByLabel(RACK)
    .getByRole("button", { name: /^Reorder .* on Yard A$/u })
    .first();
  // Playwright's own actionability is the settling this would otherwise pay four round trips for:
  // it scrolls the control into view and waits for its box to hold still before the pointer lands
  // on it, which is what every coordinate read after this is measured against (0036, harness.js).
  await handle.hover();
  const before = await survey(page);
  if (before.triggers.length < 2) {
    fail(`tooltip smoke: the rack offered ${before.triggers.length} tooltips to cross`);
  }

  // The crossing: a hand moving to a control passes over the captions and buttons on the way, and
  // at no delay every one the pointer touches flashes a popup in turn. A sample, evenly spaced
  // across the rack, because the twelfth move asserts what the first one did.
  const stride = Math.max(1, Math.ceil(before.triggers.length / CROSSED_SAMPLE));
  const crossed = before.triggers.filter((_, index) => index % stride === 0);
  for (const at of crossed) await page.mouse.move(at.x, at.y);
  const { popups: crossing } = await survey(page);

  // The press that ends the crossing: the click walks the pointer back to the control and presses
  // it, which is the shape every gesture in the browser half has. What is timed is whether
  // anything opened in front of it on the way.
  const started = Date.now();
  await handle.click();
  const pressed = Date.now() - started;
  const after = await survey(page);

  if (crossing !== 0) {
    fail(
      `tooltip smoke: ${crossing} popups opened at a pointer crossing ${crossed.length} of the rack's ${before.triggers.length} controls`,
    );
  }
  if (after.popups !== 0) {
    fail(`tooltip smoke: ${after.popups} popups stood in front of the control pressed`);
  }
  if (pressed > ANIMATION_BUDGET_MS) {
    fail(
      `tooltip smoke: a press at the end of that crossing took ${pressed}ms, over the ${ANIMATION_BUDGET_MS}ms an animation would cost`,
    );
  }
  if (after.order !== before.order) {
    fail(`tooltip smoke: the press reordered the rack — ${before.order} to ${after.order}`);
  }
  report(
    `a pointer crossed ${crossed.length} of the rack's ${before.triggers.length} tooltips and pressed a handle in ${pressed}ms, opening none of them`,
  );
};
