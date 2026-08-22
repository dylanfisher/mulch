/**
 * @role What the vary group offers and which field each gesture patches: the spread of burst
 *   lengths on the card's row, and the one amount behind the marker at its corner (P87).
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this component calls, made callable outside a renderer so a control's own handler
// can be pressed — the same stand-in src/ui/PlayerRate.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { PLAYER_VARY_KNOBS, type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS, yardLabel } from "@/lib/copy";
import { PlayerVary } from "@/ui/PlayerVary";

const PLAYER: PlayerSpec = {
  seed: 9,
  variation: "wander",
  distance: 3,
  repeats: 4,
  gate: 0.5,
  burst: 0.25,
  vary: 0.5,
  varyChance: 0.25,
  rest: 0,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
};

const DEFAULTS: PlayerDefaults = { ...PLAYER, vary: 0, varyChance: 1 };

type Press = (value: number) => void;
type Control = { onChange?: Press; dial?: unknown; children?: unknown };

/** Every `onChange` this group put on a dial, in render order. */
const dials = (element: unknown): Press[] => {
  const found: Press[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    if (node.props.onChange !== undefined) found.push(node.props.onChange);
    // The group's two slots, in the order they are drawn: the dial the marker sits on, then the
    // amounts behind it (src/ui/PlayerMore.tsx).
    walk(node.props.dial);
    walk(node.props.children);
  };
  walk(element);
  return found;
};

const group = () => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerVary({ deck: "a", player: PLAYER, defaults: DEFAULTS, patch });
  return { element, patch };
};

describe("the vary group", () => {
  /**
   * The two fields it owns, each patching its own and nothing else — one `deck.player` per
   * gesture is the card's business, and this component's is which field moved (0089).
   */
  it("patches one field per dial", () => {
    const { element, patch } = group();
    const [vary, chance] = dials(element);
    for (const [press, value, field] of [
      [vary, 0.75, { vary: 0.75 }],
      [chance, 0.25, { varyChance: 0.25 }],
    ] as const) {
      press?.(value);
      expect(patch).toHaveBeenLastCalledWith(field);
    }
    expect(patch).toHaveBeenCalledTimes(2);
  });

  /**
   * The chance is behind the marker rather than on the row, so the card's row stays the height
   * the rack measures (0093, 0118, P87). One amount is still a menu: Vary *is* the spread of a
   * burst and a drift is a property of a walk, so a chance is the only one of the rate group's
   * three that says anything here.
   */
  it("draws only the spread until its marker is opened", () => {
    const markup = renderToStaticMarkup(group().element);
    expect(markup).toContain(`${yardLabel("a")} ${PLAYER_KNOB_LABELS.vary}`);
    for (const knob of PLAYER_VARY_KNOBS) {
      expect(markup).not.toContain(PLAYER_KNOB_LABELS[knob]);
    }
  });
});
