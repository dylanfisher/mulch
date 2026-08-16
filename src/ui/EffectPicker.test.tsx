/** @role That the picker is the effect registry rendered, and that choosing an entry is one
    ordinary `effect.add` (P26). */
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { EFFECTS } from "@/audio/effects/registry";
import { EffectPicker } from "@/ui/EffectPicker";

type Props = {
  children?: ReactNode;
  render?: ReactNode;
  "aria-label"?: string;
  onClick?: () => void;
};

/**
 * The first element in a tree carrying this label, wherever a trigger or a popover item renders
 * it. A plain function component holds its tree behind its own call, and the picker's items are
 * components, so the walk calls them — `useCallback` is mocked above so that call is safe.
 */
function find(node: ReactNode, label: string): Props | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Props>(child)) continue;
    if (child.props["aria-label"] === label) return child.props;
    // Every component in this tree is a plain function; nothing here is a class, so the narrowing
    // `typeof` cannot reach is the one the assertion states.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const call = child.type as (props: Props) => ReactNode;
    const inner = typeof child.type === "function" ? call(child.props) : null;
    const hit =
      find(child.props.children ?? null, label) ??
      find(child.props.render ?? null, label) ??
      find(inner, label);
    if (hit !== null) return hit;
  }
  return null;
}

const rendered = () => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send");
  const root = EffectPicker({ instrument, deck: "a" });
  if (!isValidElement<Props>(root)) throw new Error("no picker");
  return { instrument, sent, tree: root as ReactNode };
};

describe("the effect picker", () => {
  // Rendered from the registry, so a new plugin appears here by existing (0016). Asserting
  // against EFFECTS rather than a written-out list is the point: a hand-kept list here would be
  // the second declaration the picker exists to avoid.
  it("lists every registry entry", () => {
    const { tree } = rendered();

    for (const effect of EFFECTS) {
      expect(find(tree, `Add ${effect.label} to Yard A`)).not.toBeNull();
    }
    expect(EFFECTS.length).toBeGreaterThan(1);
  });

  // The picture comes from the plugin's own declaration, so an entry is offered with the icon it
  // carries rather than one the UI chose for it (0055, 0056).
  it("draws the icon each plugin declares", () => {
    const { tree } = rendered();

    for (const effect of EFFECTS) {
      const item = find(tree, `Add ${effect.label} to Yard A`);
      const drawn = Children.toArray(item?.children).some(
        (child) => isValidElement(child) && child.type === effect.icon,
      );
      expect(drawn).toBe(true);
    }
  });
});

describe("choosing an entry from the picker", () => {
  it("sends effect.add for the entry chosen", () => {
    const { instrument, sent, tree } = rendered();

    find(tree, "Add Delay to Yard A")?.onClick?.();

    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ t: "effect.add", deck: "a", effect: "delay" }),
    );
    expect(instrument.probe().decks.a?.effects.map((entry) => entry.effect)).toEqual(["delay"]);
  });

  // The trigger opens the popover and nothing else: no command hangs off it, so an accidental
  // press cannot add an effect.
  it("hangs no command off the trigger itself", () => {
    const { sent, tree } = rendered();

    const trigger = find(tree, "Add an Effect to Yard A");
    expect(trigger).not.toBeNull();
    expect(trigger?.onClick).toBeUndefined();
    expect(sent).not.toHaveBeenCalled();
  });

  // A rack holds any number of instances of one entry, so the item is never spent and each press
  // mints its own opaque id (0030).
  it("mints a fresh instance id per press", () => {
    const { instrument, tree } = rendered();
    const chosen = find(tree, "Add Filter to Yard A");

    chosen?.onClick?.();
    chosen?.onClick?.();

    const ids = instrument.probe().decks.a?.effects.map((entry) => entry.id) ?? [];
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
