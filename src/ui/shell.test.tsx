import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { deckIn } from "@/state/store";
import { App } from "@/ui/App";
import { DevPage } from "@/ui/dev/DevPage";
import { MoireOverlay } from "@/ui/MoireStrip";
import {
  INSTANT_POPUP,
  SHELL_BODY,
  SHELL_HEADER,
  SHELL_HEADER_ROW,
  SHELL_HEADER_ROW_HEIGHT,
  SHELL_WIDTH,
} from "@/ui/shell";

/** The two top-level screens, as the markup each one lays out (P46). */
const SCREENS = {
  instrument: renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />),
  gallery: renderToStaticMarkup(<DevPage />),
};

/** The instrument the third surface draws a yard of — its own, so no screen's state is shared. */
const drifting = createInstrument(manualClock());

/** Every surface wearing the shell's header: both screens, and the drift overlay over them (P80). */
const SURFACES = {
  ...SCREENS,
  overlay: renderToStaticMarkup(
    <MoireOverlay
      instrument={drifting}
      deck="a"
      state={deckIn(drifting.state.getState().decks, "a")}
      onClose={() => {}}
    />,
  ),
};

/** A surface's header and the row inside it — all three wear these; only the routes have a main. */
function headerOf(markup: string): { header: string; headerRow: string } {
  const header = /<header class="([^"]*)"><div\s+class="([^"]*)"/u.exec(markup);
  if (header === null) throw new Error("a surface rendered without a header row");
  return { header: header[1] ?? "", headerRow: header[2] ?? "" };
}

/** A screen's own layout boxes: the header, the row inside it, and the content column. */
function boxesOf(markup: string): { header: string; headerRow: string; main: string } {
  const main = /<main class="([^"]*)"/u.exec(markup);
  if (main === null) throw new Error("a screen rendered without a main column");
  return { ...headerOf(markup), main: main[1] ?? "" };
}

/**
 * Every `max-w-*` a class list carries, so a second width is visible rather than merely absent.
 * Variants count: `md:max-w-5xl` is a second number in a page at one breakpoint, and `twMerge`
 * does not collapse it against a bare width either.
 */
const widthsIn = (classes: string) =>
  classes.split(/\s+/u).filter((entry) => entry.includes("max-w-"));

/** One spacing class's own number, in the 0.25rem steps the scale counts in. */
function steps(classes: string, prefix: string): number {
  const found = new RegExp(String.raw`(?:^|\s)${prefix}-(\d+)(?:\s|$)`, "u").exec(classes);
  if (found === null) throw new Error(`no ${prefix}-* declared in: ${classes}`);
  return Number(found[1]);
}

/**
 * The menubar's own height — `h-8` in src/ui/components/menubar.tsx, a regenerated primitive that
 * exports no measure to import, so the one place that can hold this number is the test that ties
 * the shell's row to it.
 */
const MENUBAR_HEIGHT = 8;

// One `it` per fact the shell holds — a width, a header, a row height, a gutter, a reserve and a
// popup's animation — over the three surfaces rendered once above. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("the shell's own layout", () => {
  /**
   * P46: the instrument and the primitives page are the same measure, and that measure is
   * declared once (0054). A page that carried its own number would stop tracking this one the
   * day it changes.
   */
  it("lays both routes out to the one declared width and no other", () => {
    for (const [route, markup] of Object.entries(SCREENS)) {
      const { headerRow, main } = boxesOf(markup);
      expect(widthsIn(main), route).toEqual([SHELL_WIDTH]);
      expect(widthsIn(headerRow), route).toEqual([SHELL_WIDTH]);
    }
  });

  /**
   * The other half of that width: the gutter beside it. It was written per surface, so the header
   * row and the column under it agreed on `px-6` only by three files happening to say so.
   */
  it("insets both routes' content the same as the header row over it", () => {
    for (const [route, markup] of Object.entries(SCREENS)) {
      const { headerRow, main } = boxesOf(markup);
      expect(main.split(/\s+/u), route).toEqual(expect.arrayContaining(SHELL_BODY.split(/\s+/u)));
      expect(steps(main, "px"), route).toBe(steps(headerRow, "px"));
    }
  });

  /**
   * And no surface reserves that top a second time. The gallery carried a `scroll-mt-14` of its
   * own, which added to the token rather than replacing it: an anchored section stopped 7.5rem
   * down where the header covers 4. One number, in src/ui/tokens.css, read by src/index.css.
   */
  it("leaves the header's reserve to the one token, on every surface", () => {
    for (const [surface, markup] of Object.entries(SURFACES)) {
      expect(markup, surface).not.toMatch(/\bscroll-(?:mt|pt)-/u);
    }
  });

  /** P46: one header treatment — fixed and blurred — worn by both screens, from one string. */
  it("gives both routes the one fixed header", () => {
    for (const [route, markup] of Object.entries(SCREENS)) {
      expect(boxesOf(markup).header, route).toContain(SHELL_HEADER);
    }
  });

  /**
   * P80: the height of that bar is a shell fact, so the row declares it rather than inheriting
   * whatever the tallest control a surface happened to put in it measures. Left to the content,
   * the instrument's menubar made its header 56px while the gallery and the overlay — whose
   * tallest thing is an `sm` Button — stood at 52px, and opening the overlay shifted the title.
   */
  it("stands all three surfaces' header rows at the one declared height", () => {
    // The bar the menubar makes, and not the control's own height: `box-sizing: border-box` puts
    // the row's padding inside its minimum, so a floor at `h-8` would clear nothing at all.
    expect(steps(SHELL_HEADER_ROW_HEIGHT, "min-h")).toBe(
      MENUBAR_HEIGHT + 2 * steps(SHELL_HEADER_ROW, "py"),
    );
    for (const [surface, markup] of Object.entries(SURFACES)) {
      expect(headerOf(markup).headerRow.split(/\s+/u), surface).toContain(SHELL_HEADER_ROW_HEIGHT);
    }
  });

  /**
   * Nine popups carried this class themselves and four re-narrated the reason. The value is the
   * one the measurement in 0056 was taken at: a popup that animates makes Playwright wait the
   * enter and the exit out before it may click, which the gate pays for one scenario at a time.
   */
  it("opens every popup the driver clicks through instantly", () => {
    // The per-popup half is asserted where each popup is: FileMenu and ExportAudioDialog both
    // check their content carries it, and those go red the moment this value moves without them.
    expect(INSTANT_POPUP).toBe("duration-0");
  });
});
