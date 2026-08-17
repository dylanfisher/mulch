import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { App } from "@/ui/App";
import { DevPage } from "@/ui/dev/DevPage";
import { SHELL_HEADER, SHELL_WIDTH } from "@/ui/shell";

/** The two top-level screens, as the markup each one lays out (P46). */
const SCREENS = {
  instrument: renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />),
  gallery: renderToStaticMarkup(<DevPage />),
};

/** A screen's own layout boxes: the header, the row inside it, and the content column. */
function boxesOf(markup: string): { header: string; headerRow: string; main: string } {
  const header = /<header class="([^"]*)"><div\s+class="([^"]*)"/u.exec(markup);
  const main = /<main class="([^"]*)"/u.exec(markup);
  if (header === null || main === null) {
    throw new Error("a screen rendered without a header row or a main column");
  }
  return { header: header[1] ?? "", headerRow: header[2] ?? "", main: main[1] ?? "" };
}

/**
 * Every `max-w-*` a class list carries, so a second width is visible rather than merely absent.
 * Variants count: `md:max-w-5xl` is a second number in a page at one breakpoint, and `twMerge`
 * does not collapse it against a bare width either.
 */
const widthsIn = (classes: string) =>
  classes.split(/\s+/u).filter((entry) => entry.includes("max-w-"));

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

  /** P46: one header treatment — fixed and blurred — worn by both screens, from one string. */
  it("gives both routes the one fixed header", () => {
    for (const [route, markup] of Object.entries(SCREENS)) {
      expect(boxesOf(markup).header, route).toContain(SHELL_HEADER);
    }
  });
});
