import type { ReactNode } from "react";
import type * as ShortcutsModule from "@/ui/shortcuts";
import type * as ToastModule from "@/ui/components/toast";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The provider's own auto-dismiss is a prop and never markup, so the one thing that can be read
// back out of a static render is a stand-in that writes what it was handed. Everything else the
// module exports — the manager the File menu and the export dialog say things through — is the
// real one.
vi.mock("@/ui/components/toast", async (importOriginal) => ({
  ...(await importOriginal<typeof ToastModule>()),
  Toaster: ({ children, timeout }: { children?: ReactNode; timeout?: number }) => (
    <div data-slot="toaster" data-timeout={timeout}>
      {children}
    </div>
  ),
}));

/**
 * Whether the palette's module has been evaluated yet, and the open flag a static render reads.
 * The real hook answers closed on a server render, so the one way to render the shell with the
 * palette open without a DOM is to hand it the flag; everything else in both modules is real.
 */
const palette = vi.hoisted(() => ({ loaded: false, open: false }));
vi.mock("@/ui/CommandPalette", (importOriginal) => {
  palette.loaded = true;
  return importOriginal();
});
vi.mock("@/ui/shortcuts", async (importOriginal) => ({
  ...(await importOriginal<typeof ShortcutsModule>()),
  usePaletteOpen: () => palette.open,
}));

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { INITIAL_YARD_EMOJI, yardLabel } from "@/lib/copy";
import { App, TOAST_TIMEOUT_MS } from "@/ui/App";
import { INSTRUMENT_ROUTE } from "@/ui/routes";

/**
 * Both of the root's stores are read during render, and `useSyncExternalStore` throws
 * outright when a server snapshot is missing — so rendering the root without a DOM is the
 * cheapest check that neither the theme nor the route reads `window` on the way in.
 */
// One `it` per claim the root makes, and the count tracks how many of them there are.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("App", () => {
  it("renders without a DOM", () => {
    const instrument = createInstrument(manualClock());
    // A fresh session is one deck; the second is one a person adds, and the screen lists as
    // many as the session holds rather than a fixed pair (0029).
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
    const markup = renderToStaticMarkup(<App instrument={instrument} />);
    expect(markup).toContain(">View<");
    expect(markup).toContain("Add Yard");
    expect(markup).toMatch(/data-active="true"[^>]*aria-label="Yard A \(Active\)"/u);
    expect(markup).toMatch(/data-active="false"[^>]*aria-label="Yard B"/u);
  });

  /**
   * P28: each yard is headed by the emoji it was added with and by the noun the interface uses,
   * so two yards on screen carry two different emoji rather than one shared decoration.
   */
  it("heads each yard with its own emoji and label", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.add", deck: "b", emoji: "🐝", name: "Wild Bramble" });
    const markup = renderToStaticMarkup(<App instrument={instrument} />);
    const headings = [...markup.matchAll(/<h2[^>]*>(.*?)<\/h2>/gu)].map(([, inner]) =>
      inner?.replaceAll(/<[^>]*>/gu, ""),
    );
    expect(headings).toEqual([`${INITIAL_YARD_EMOJI} ${yardLabel("a")}`, `🐝 ${yardLabel("b")}`]);
  });

  /**
   * The counts of what the session is doing to the sound sit on the header beside the meter, as
   * one readout rather than four things loose in the row (0391).
   */
  it("carries the mulch tally in its header, through an add and a remove", () => {
    const instrument = createInstrument(manualClock());
    // Everything before the header closes — `indexOf` rather than `split`, which hands back the
    // whole document when the boundary is not there and would pass on a readout drawn below it.
    const header = (): string => {
      const markup = renderToStaticMarkup(<App instrument={instrument} />);
      const closed = markup.indexOf("</header>");
      expect(closed).toBeGreaterThan(0);
      return markup.slice(0, closed);
    };

    instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
    instrument.send({ t: "effect.add", deck: "b", id: "dly", effect: "delay" });
    expect(header()).toMatch(/data-count="yards"[\s\S]*?type-readout">2</u);
    expect(header()).toMatch(/data-count="effects"[\s\S]*?type-readout">1</u);

    instrument.send({ t: "effect.remove", deck: "b", instance: "dly" });
    instrument.send({ t: "deck.remove", deck: "b" });
    expect(header()).toMatch(/data-count="yards"[\s\S]*?type-readout">1</u);
    expect(header()).toMatch(/data-count="effects"[\s\S]*?type-readout">0</u);
  });

  /** The header's routes are a menu now, not two anchors sitting beside the wordmark. */
  it("puts the routes behind a menubar trigger", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup).toContain('data-slot="menubar-trigger"');
    expect(markup).not.toContain("Primitives →");
  });

  /** Home is where it already is: on the instrument the wordmark links nowhere. */
  it("leaves the wordmark inert on the instrument", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup).not.toContain(`href="${INSTRUMENT_ROUTE}"`);
  });

  /**
   * P29: session export and open are entries of a `File` menu, not two controls loose in the
   * header. The trigger is what the driver opens, and the picker has to stay mounted beside it —
   * a menu's content is portalled away the moment it closes, and the archive smoke sets its file
   * on that input directly.
   */
  it("hangs the session archive off a File menu, with its picker mounted beside it", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup).toContain(">File<");
    expect(markup).toContain('aria-label="Import Session Archive"');
    // Not a header button any more: the export lives behind the trigger, which renders no
    // content until it is opened.
    expect(markup).not.toContain("Export Session");
  });

  /** Two menus now — File beside View — and both of them on the one menubar the shell has. */
  it("puts File beside View on the one menubar", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup.match(/data-slot="menubar-trigger"/gu)).toHaveLength(2);
    expect(markup.match(/data-slot="menubar"/gu)).toHaveLength(1);
  });

  /**
   * P30: the event log page is gone. Nothing in the header may point at `#/log`, and the log
   * leaves through the File menu instead — which renders no content until it is opened, so what
   * is asserted here is the absence of the link, not the presence of the entry.
   */
  it("offers no route to an event log page", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(markup).not.toContain("#/log");
    expect(markup).not.toContain("Event Log");
  });

  /**
   * P56: a toast clears itself, on a wait this repo states rather than one inherited from Base
   * UI's own default. Declared once, at the one provider that owns toasts, and long enough to
   * read a filename off — the close control is still there for sooner.
   */
  it("hands the one toast provider a timeout it takes itself away after", () => {
    const markup = renderToStaticMarkup(<App instrument={createInstrument(manualClock())} />);
    expect(TOAST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(markup).toContain(`data-timeout="${TOAST_TIMEOUT_MS}"`);
  });

  it("renders the affordance that adds the first deck when the session holds none", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.remove", deck: "a" });
    const markup = renderToStaticMarkup(<App instrument={instrument} />);
    expect(markup).not.toContain('aria-label="Yard A');
    expect(markup).toContain("Add Yard");
  });

  /**
   * The palette is a chunk of its own, fetched by the first press that opens it: a shell rendered
   * with it closed has not so much as evaluated its module, and one rendered open asks for it.
   */
  it("loads the palette's module on its first opening, not at startup", async () => {
    const instrument = createInstrument(manualClock());
    renderToStaticMarkup(<App instrument={instrument} />);
    expect(palette.loaded).toBe(false);

    palette.open = true;
    try {
      renderToStaticMarkup(<App instrument={instrument} />);
      await vi.waitFor(() => {
        expect(palette.loaded).toBe(true);
      });
    } finally {
      palette.open = false;
    }
  });
});
