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

  // P148: an automator's run is the widest row the instrument draws — a name, a strip of mini
  // dials, a bar and a countdown on one line — so it is the row that decides whether a card fits a
  // phone. Added here and taken out again, so nothing this scenario measures outlives it.
  await page.evaluate(() =>
    window.mulch.send({ t: "effect.add", deck: "a", id: "narrow-auto", effect: "automator" }),
  );
  await page.locator('[data-slot="grown-row"]').first().waitFor({ state: "attached" });

  const narrow = await page.evaluate((slack) => {
    const root = document.documentElement;
    // Every element whose own box runs past the viewport — the ones that would need a
    // horizontal scroll to read. Named by what they are, so a failure says which surface.
    // The header as well as the column under it: it is a sibling of `main` since P46, and a
    // selector that still said `main` alone would have stopped measuring the menubar, the meter
    // and the theme toggle the day the header moved out (0074).
    const clipped = [...document.querySelectorAll("header, header *, main, main *")]
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
      // The run's own row, column by column: the name, the strip of dials, the bar and the
      // countdown are drawn side by side on one line, so a row whose columns want more than the
      // line has is a row running out past the card that holds it. Measured while the row is
      // invisible, which it is until something is grown — `visibility` keeps the layout it hides.
      crowded: [...document.querySelectorAll('[data-slot="grown-row"]')]
        .map((row) => {
          const last = row.lastElementChild?.getBoundingClientRect().right ?? 0;
          return Math.round(last - row.getBoundingClientRect().right);
        })
        .filter((over) => over > slack),
    };
  }, SLACK_PX);

  await page.evaluate(() =>
    window.mulch.send({ t: "effect.remove", deck: "a", instance: "narrow-auto" }),
  );

  await page.setViewportSize(wide);
  await page.waitForFunction((width) => window.innerWidth === width, wide.width);

  if (narrow.documentOverflow > SLACK_PX) {
    fail(`the shell scrolled horizontally at ${NARROW.width}px`, narrow);
  }
  if (narrow.clipped.length > 0) {
    fail(`the shell overflowed its viewport at ${NARROW.width}px`, narrow);
  }
  if (narrow.crowded.length > 0) {
    fail(`a grown run's columns ran out past its row at ${NARROW.width}px`, narrow);
  }
  if (narrow.decks < 1 || narrow.waveform <= 0) {
    fail(`the shell rendered nothing to measure at ${NARROW.width}px`, narrow);
  }
  report(
    `P24: at ${NARROW.width}px the shell reflowed — ${narrow.decks} decks and a ` +
      `${Math.round(narrow.waveform)}px waveform, no element past the viewport and no column of ` +
      `a grown run past the row that holds it`,
  );
};
