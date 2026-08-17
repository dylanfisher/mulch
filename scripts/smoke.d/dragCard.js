/** @role One rack card dragged sideways across a row onto the slot its neighbour holds (P48). */
import { fail, report } from "./harness.js";

/**
 * After the reload, like ./picker.js and for the same reason: this is browser work that cannot be
 * a render, and pre-reload work is what stalls the reloaded audio clock (plan §3). It runs on what
 * ./picker.js left — a filter and an eq, each declaring half the rack's width, which on this
 * viewport is two cards abreast rather than two stacked. That is the layout a column's single
 * axis cannot resolve a drop against, so it is the layout the drag is proved on.
 */
export const dragCardAcrossRow = async ({ page }) => {
  const rack = page.getByLabel("Yard A Effects");
  await rack.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() =>
    window.mulch
      .probe()
      .decks.a.effects.map((entry) => entry.effect)
      .join(","),
  );
  if (before !== "filter,eq") {
    fail(`drag smoke: the rack was ${before} — this scenario drags the filter past the eq`);
  }

  const filter = await rack.getByLabel("Filter 1", { exact: true }).boundingBox();
  const eq = await rack.getByLabel("EQ 1", { exact: true }).boundingBox();
  // Abreast, not stacked: a drag that only moved down the page would prove the old rule too.
  if (Math.abs(filter.y - eq.y) > filter.height / 2 || eq.x <= filter.x + filter.width / 2) {
    fail(
      `drag smoke: the two cards are not abreast — filter ${filter.x},${filter.y} eq ${eq.x},${eq.y}`,
    );
  }

  const handle = await rack
    .getByRole("button", { name: "Reorder Filter 1 on Yard A" })
    .boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  // Onto the eq's own centre, in steps, so the gesture sees the moves a person's would make.
  await page.mouse.move(eq.x + eq.width / 2, eq.y + eq.height / 2, { steps: 8 });
  // The landing slot is filled while the pointer is still down: the cards have moved off it, so
  // a drop with nothing under it would read as a gap rather than as a destination.
  const shown = await rack.locator('[data-slot="rack-landing"]').isVisible();
  await page.mouse.up();

  await page.waitForFunction(
    () =>
      window.mulch
        .probe()
        .decks.a.effects.map((entry) => entry.effect)
        .join(",") === "eq,filter",
  );
  if (!shown) fail("drag smoke: no landing slot was shown while the drag was live");
  report("a rack card dragged sideways across a row landed in its neighbour's slot");
};
