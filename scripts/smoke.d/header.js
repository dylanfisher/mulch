/**
 * @role The instrument's header under a scroll: fixed at the top of the viewport rather than
 * riding the page away, so the menus stay reachable however far down the yards a person is (P46).
 */
import { fail, report } from "./harness.js";

/** How far down the page is pushed. Past any header height, so a header that scrolled is gone. */
const SCROLL_PX = 400;

export const fixedHeader = async ({ page }) => {
  // After the reload with everything else here: this is browser work, and pre-reload browser work
  // is what stalls the reloaded audio clock (plan §3).
  const scrolled = await page.evaluate(
    (distance) =>
      new Promise((resolve) => {
        const header = document.querySelector("header");
        // From a known zero, not from whatever the scenario before left behind: a page that
        // arrived already at its maximum scroll would not move here, and a header that scrolled
        // away with the page would read as one that stayed put.
        window.scrollTo(0, 0);
        const before = header.getBoundingClientRect().top;
        window.scrollTo(0, distance);
        requestAnimationFrame(() => {
          const box = header.getBoundingClientRect();
          resolve({
            before,
            top: box.y,
            height: box.height,
            scrollY: window.scrollY,
            // What the header sits over: a menubar that scrolled out with the page is the
            // failure this scenario exists to catch.
            menus: header.querySelectorAll('[data-slot="menubar-trigger"]').length,
          });
        });
      }),
    SCROLL_PX,
  );

  // A header that covers the top of the page has to be reserved against, or every scroll-into-view
  // — a tab into a control below the fold, an anchored section — parks its target underneath it.
  const reached = await page.evaluate(
    () =>
      new Promise((resolve) => {
        // From the bottom, reaching back up for the first heading: the browser then puts that
        // heading's top at the top of the page, which is exactly where the header is.
        window.scrollTo(0, document.documentElement.scrollHeight);
        const header = document.querySelector("header").getBoundingClientRect();
        const target = document.querySelector("main h2");
        target.scrollIntoView();
        requestAnimationFrame(() => {
          resolve({ header: header.height, top: target.getBoundingClientRect().top });
        });
      }),
  );
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });

  // The whole distance, not merely some of it: a document too short to scroll `SCROLL_PX` clamps,
  // and a clamped scroll proves nothing about a header that would have ridden away with it.
  if (scrolled.scrollY < SCROLL_PX) {
    fail("the instrument did not scroll, so nothing was proved about its header", scrolled);
  }
  // The instrument's header, specifically — the gallery's is the same element with no menubar in
  // it, so this says which page was under the scroll as well as what the header held.
  if (scrolled.height <= 0 || scrolled.menus < 2) {
    fail("this is not the instrument's header: it held no menus to keep on screen", scrolled);
  }
  if (Math.abs(scrolled.top - scrolled.before) > 1) {
    fail(
      `the header moved ${Math.round(scrolled.top - scrolled.before)}px under a scroll`,
      scrolled,
    );
  }
  if (reached.top < reached.header) {
    fail(
      `a yard scrolled into view landed ${Math.round(reached.header - reached.top)}px under the ` +
        `header rather than clear of it`,
      reached,
    );
  }
  report(
    `P46: the header stayed at ${Math.round(scrolled.top)}px with its ${scrolled.menus} menus ` +
      `while the instrument scrolled to ${Math.round(scrolled.scrollY)}px, and a yard scrolled ` +
      `into view landed at ${Math.round(reached.top)}px, clear of its ${Math.round(reached.header)}px`,
  );
};
