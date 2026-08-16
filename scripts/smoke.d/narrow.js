/**
 * @role The shell at a phone's width: the widened container reflows rather than overflowing, and
 * nothing below it carries a width the viewport cannot honour (P24).
 */
import { fail, report } from "./harness.js";

/** The narrowest viewport the instrument claims to work at — a small phone, portrait. */
const NARROW = { width: 360, height: 780 };
/** Sub-pixel layout rounds; a scrollWidth one pixel past the client box is not an overflow. */
const SLACK_PX = 1;

export const narrowShell = async ({ page }) => {
  // After the reload, like everything else here: this is browser work, and pre-reload browser
  // work is what stalls the reloaded audio clock (plan §3).
  const wide = page.viewportSize();
  await page.setViewportSize(NARROW);
  // The waveform canvas re-measures against its box on resize, so the assertion waits for a
  // frame in which the layout has actually settled rather than reading the old boxes.
  await page.waitForFunction(
    // innerWidth, not clientWidth: a vertical scrollbar narrows the client box, and this wait
    // must say "the viewport resized", not "the page happens to have no scrollbar".
    (width) => window.innerWidth === width,
    NARROW.width,
  );
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );

  const narrow = await page.evaluate((slack) => {
    const root = document.documentElement;
    // Every element whose own box runs past the viewport — the ones that would need a
    // horizontal scroll to read. Named by what they are, so a failure says which surface.
    const clipped = [...document.querySelectorAll("main, main *")]
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + slack)
      .slice(0, 5)
      .map(
        (element) =>
          `${element.tagName.toLowerCase()}${
            (element.getAttribute("aria-label") ?? element.className)
              ? `[${element.getAttribute("aria-label") ?? element.className}]`
              : ""
          }`,
      );
    return {
      documentOverflow: root.scrollWidth - root.clientWidth,
      clipped,
      // One waveform per deck by construction, anchored at both ends. `section[aria-label^="Yard"]`
      // would also match each deck's effect rack, labelled `Yard <id> Effects`
      // (src/ui/EffectRack.tsx); a bare `$=" waveform"` would also match a clip's thumbnail,
      // labelled `<name> Waveform` (src/ui/ClipThumbnail.tsx). Either one miscounts.
      decks: document.querySelectorAll('canvas[aria-label^="Yard "][aria-label$=" Waveform"]')
        .length,
      // The same selector, not a bare `canvas`: the clip rack sits above the yards now (P32),
      // so the first canvas on the page is a captured clip's thumbnail and measuring it would
      // report a width no waveform has.
      waveform:
        document
          .querySelector('canvas[aria-label^="Yard "][aria-label$=" Waveform"]')
          ?.getBoundingClientRect().width ?? 0,
    };
  }, SLACK_PX);

  await page.setViewportSize(wide);
  await page.waitForFunction((width) => window.innerWidth === width, wide.width);

  if (narrow.documentOverflow > SLACK_PX) {
    fail(`the shell scrolled horizontally at ${NARROW.width}px`, narrow);
  }
  if (narrow.clipped.length > 0) {
    fail(`the shell overflowed its viewport at ${NARROW.width}px`, narrow);
  }
  if (narrow.decks < 1 || narrow.waveform <= 0) {
    fail(`the shell rendered nothing to measure at ${NARROW.width}px`, narrow);
  }
  report(
    `P24: at ${NARROW.width}px the shell reflowed — ${narrow.decks} decks and a ` +
      `${Math.round(narrow.waveform)}px waveform, and no element past the viewport`,
  );
};
