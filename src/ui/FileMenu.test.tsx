/** @role What the File menu offers, and the one thing 0056 says a menu the driver opens must be. */
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The three hooks this menu holds, made callable outside a renderer so its tree can be read the
// way src/ui/DeckRemove.test.tsx reads that control's. Nothing here presses anything: what is
// asserted is the shape a first render produces.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useState: (initial: unknown) => [initial, () => {}],
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { FileMenu } from "@/ui/FileMenu";

type Props = { className?: string; children?: ReactNode; "aria-label"?: string };

/**
 * The menu's own content never reaches markup — it is portalled, and rendered only once the menu
 * is open — so the element tree is what these read. Every node in it, depth first.
 */
function* nodes(node: ReactNode): Generator<Props> {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Props>(child)) continue;
    yield child.props;
    yield* nodes(child.props.children ?? null);
  }
}

const PICKER = "Import Session Archive";

const rendered = () => FileMenu({ instrument: createInstrument(manualClock()), onError: () => {} });
const tree = () => [...nodes(rendered())];

/** The menu's own popup — the one node carrying the class 0056 requires of it. */
const content = () => tree().find((props) => props.className?.includes("duration-0") === true);

/** The words a node shows, its element children skipped. */
const words = (children: ReactNode): string =>
  Children.toArray(children)
    .filter((child): child is string => typeof child === "string")
    .join("");

describe("the File menu", () => {
  it("offers opening a session and exporting one, in Titlecase", () => {
    const shown = tree().map((props) => words(props.children));
    expect(shown).toContain("Open Session…");
    expect(shown).toContain("Export Session");
  });

  /**
   * 0056: Playwright waits out a popup's enter and exit animations before it may click, which
   * costs the gate 450ms and up. A menu ./scripts/drive opens has none.
   */
  it("opens with no animation for the driver to wait out", () => {
    const instant = tree().some((props) => props.className?.includes("duration-0") === true);
    expect(instant).toBe(true);
  });

  /**
   * The picker sits outside the menu on purpose: a menu's content is unmounted the moment it
   * closes, and the archive smoke sets its file on that input directly.
   */
  it("keeps the archive picker mounted outside the menu's content", () => {
    expect(tree().some((props) => props["aria-label"] === PICKER)).toBe(true);
    // Inside the popup it would exist only while the menu is open, which is neither what
    // `scripts/smoke.d/archive.js` sets its file on nor what the Open Session… entry clicks.
    const inside = [...nodes(content()?.children ?? null)];
    expect(inside.some((props) => props["aria-label"] === PICKER)).toBe(false);
  });
});
