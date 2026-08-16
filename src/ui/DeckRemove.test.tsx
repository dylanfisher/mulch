/** @role The confirmation a playing deck asks for, and the immediacy a stopped one does not. */
import { Children, isValidElement, type ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { DeckRemove } from "@/ui/DeckRemove";

type Props = {
  children?: ReactNode;
  render?: ReactNode;
  "aria-label"?: string;
  onClick?: () => void;
};

/** The first element in a rendered tree carrying this label, wherever a trigger renders it. */
function find(node: ReactNode, label: string): Props | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Props>(child)) continue;
    if (child.props["aria-label"] === label) return child.props;
    const hit =
      find(child.props.children ?? null, label) ?? find(child.props.render ?? null, label);
    if (hit !== null) return hit;
  }
  return null;
}

const rendered = (playing: boolean) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send");
  const root = DeckRemove({ instrument, deck: "a", playing });
  if (!isValidElement<Props>(root)) throw new Error("no remove control");
  // The whole control, root included, so a trigger and its confirmation are both reachable.
  return { instrument, sent, tree: root as ReactNode };
};

const click = (props: Props | null): void => {
  if (props?.onClick === undefined) throw new Error("that control has nothing to press");
  props.onClick();
};

describe("DeckRemove", () => {
  it("removes a stopped deck on the press itself", () => {
    const { instrument, tree } = rendered(false);

    click(find(tree, "Remove Yard A"));

    expect(instrument.probe().decks.a).toBeUndefined();
  });

  it("asks a playing deck first and sends deck.remove only on confirm", () => {
    const { instrument, sent, tree } = rendered(true);

    // The trigger only opens the popover — no command hangs off it at all.
    expect(find(tree, "Remove Yard A")?.onClick).toBeUndefined();
    expect(sent).not.toHaveBeenCalled();
    expect(instrument.probe().decks.a).toBeDefined();

    click(find(tree, "Confirm Remove Yard A"));

    expect(sent).toHaveBeenCalledWith({ t: "deck.remove", deck: "a" });
    expect(instrument.probe().decks.a).toBeUndefined();
  });
});
