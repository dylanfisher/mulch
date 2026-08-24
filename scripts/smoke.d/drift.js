/**
 * @role The drift opens where it is looked at: the strip's click zooms the picture over this page,
 * only the zoomed header's own button pays for a browser window (0139), and Option on the strip
 * skips straight to that window (0138).
 */
import { fail, report } from "./harness.js";

/** The copy the gestures are found by, imported rather than restated (principle 1). */
import { driftTitle, MOIRE_POP_OUT, MOIRE_STRIP, yardLabel } from "../../src/lib/copy.ts";

/**
 * After the rack scenarios, because a yard with nothing running has no strip to click
 * (src/ui/MoireStrip.tsx) — what ./picker.js and ./rackRow.js left in yard A is what this reads.
 * It leaves the page as it found it: the picture closes and the window it opened is closed.
 */
export const driftOpens = async ({ page }) => {
  const strip = page.getByLabel(`${yardLabel("a")} ${MOIRE_STRIP}`);
  await strip.scrollIntoViewIfNeeded();
  const picture = page.getByLabel(driftTitle("a"));
  const before = page.context().pages().length;

  // The cheap gesture: it zooms in place, and it does not pay for a window.
  await strip.click();
  await picture.waitFor();
  if (page.context().pages().length !== before) {
    fail("drift smoke: the strip's own click opened a browser window", {
      before,
      after: page.context().pages().length,
    });
  }

  // And the window is asked for from the header of the picture already open.
  const popped = page.context().waitForEvent("page");
  await picture.getByRole("button", { name: MOIRE_POP_OUT }).click();
  const second = await popped;
  await second.waitForLoadState("domcontentloaded");
  const title = await second.title();
  if (title !== driftTitle("a")) {
    fail("drift smoke: the popped-out window is not the yard's own picture", { title });
  }
  // The picture is handed over rather than drawn twice: this page stops covering itself.
  await picture.waitFor({ state: "detached" });
  const canvases = await second.locator("canvas").count();
  if (canvases !== 1) fail("drift smoke: the window holds no one picture", { canvases });

  // And the strip behind it is not a second way in: clicking it again while the window holds the
  // picture would draw the same yard twice, on two frame loops, for one of it (0070, 0139).
  await strip.click();
  await page.waitForTimeout(50);
  if (await picture.isVisible()) {
    fail("drift smoke: the strip drew a second picture behind the window already holding one");
  }

  await second.close();
  // The window is gone from the browser, not merely from this page's view of it.
  if (page.context().pages().length !== before) {
    fail("drift smoke: closing the popped-out picture left a window behind", {
      before,
      after: page.context().pages().length,
    });
  }
  // The hidden gesture, which is the whole of the shortcut's claim: Option on the strip skips the
  // zoom and opens the window itself, so the picture never covers the instrument on the way (0138).
  const straight = page.context().waitForEvent("page");
  await strip.click({ modifiers: ["Alt"] });
  const skipped = await straight;
  await skipped.waitForLoadState("domcontentloaded");
  if (await picture.isVisible()) {
    fail("drift smoke: the Option press covered this page on its way to a window");
  }
  const straightTitle = await skipped.title();
  if (straightTitle !== driftTitle("a")) {
    fail("drift smoke: Option opened something other than the yard's own picture", {
      straightTitle,
    });
  }
  await skipped.close();

  report(
    `the strip's click zoomed the drift over the page without a window, "${MOIRE_POP_OUT}" handed it to one titled ${title}, an Option press opened that window on its own, and the strip behind it opened nothing more`,
  );
};
