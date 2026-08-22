/**
 * @role What the rate group offers and which field each gesture patches: the hold on the strip,
 *   the three amounts behind the marker at its corner, and the marker saying whether this walk
 *   has been shaped (0118).
 */
// One case is one claim about four dials, and its table is a line per dial. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this component calls, made callable outside a renderer so a control's own handler
// can be pressed — the same stand-in src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { PLAYER_DRIFT_MAX, PLAYER_RATE_KNOBS, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copy";
import { PlayerRate, type RateDefaults } from "@/ui/PlayerRate";

const DEFAULTS: RateDefaults = { chance: 1, spread: 2, drift: PLAYER_DRIFT_MAX };

const PLAYER: PlayerSpec = {
  seed: 9,
  variation: "wander",
  distance: 3,
  repeats: 4,
  gate: 0.5,
  burst: 0.25,
  vary: 0,
  rest: 0,
  hold: 2,
  ...DEFAULTS,
};

/** Whatever a control's own handler takes — this strip's job is which field it patches. */
type Press = (value: number) => void;
type Control = { onChange?: Press; children?: unknown };

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
    walk(node.props.children);
  };
  walk(element);
  return found;
};

/** Whether the marker at the dial's corner is the lit one. */
const lit = (element: ReactTypes.ReactElement): boolean =>
  renderToStaticMarkup(element).includes("bg-primary");

const group = (over: Partial<PlayerSpec> = {}) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerRate({
    deck: "a",
    player: { ...PLAYER, ...over },
    defaults: DEFAULTS,
    patch,
  });
  return { element, patch };
};

describe("the rate group", () => {
  /**
   * The four fields it owns, each patching its own and nothing else — one `deck.player` per
   * gesture is the card's business, and this component's is which field moved (0089). The three
   * counted ones round, because a dial's travel is continuous and a count of jumps or rungs is
   * not.
   */
  it("patches one field per dial, rounding the ones that are counts", () => {
    const { element, patch } = group();
    const [hold, chance, spread, drift] = dials(element);
    for (const [press, value, field] of [
      [hold, 3.4, { hold: 3 }],
      [chance, 0.25, { chance: 0.25 }],
      [spread, 2.6, { spread: 3 }],
      [drift, 1.2, { drift: 1 }],
    ] as const) {
      press?.(value);
      expect(patch).toHaveBeenLastCalledWith(field);
    }
    expect(patch).toHaveBeenCalledTimes(4);
  });

  /**
   * The three are behind the marker rather than on the row, which is the whole reason this
   * component exists: a closed popover draws no dial, so the card's row stays the height the rack
   * measures (0093, 0107) and the eight-dial strip it would otherwise be never happens.
   */
  it("draws only the hold until the marker is opened", () => {
    const markup = renderToStaticMarkup(group().element);
    expect(markup).toContain(PLAYER_KNOB_LABELS.hold);
    for (const knob of PLAYER_RATE_KNOBS) {
      expect(markup).not.toContain(PLAYER_KNOB_LABELS[knob]);
    }
  });

  /**
   * What the marker itself says. A hold dial reading 4 looks the same whether the changes it
   * counts are certain or a coin flip, so the one pixel that can tell a performer this walk has
   * been shaped is lit from the three values rather than from whether the popup was ever opened.
   */
  it("lights its marker only once one of the three is off its default", () => {
    expect(lit(group().element)).toBe(false);
    // Every one of them on its own, so no field is the only one the marker is watching.
    for (const knob of PLAYER_RATE_KNOBS) {
      expect(lit(group({ [knob]: DEFAULTS[knob] - 1 }).element)).toBe(true);
    }
    // And the hold is not one of the three: it is drawn on the strip, where it says its own value.
    expect(lit(group({ hold: 11 }).element)).toBe(false);
  });
});
