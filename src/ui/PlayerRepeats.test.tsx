/**
 * @role What the repeats group offers and which field each gesture patches: the count on the
 *   card's row, and the three amounts behind the marker at its corner — a chance a due redraw
 *   fires, a spread it may stray by, and how many jumps keep one count (0135).
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

import { PLAYER_REPEATS_KNOBS, type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS, yardLabel } from "@/lib/copy";
import { PlayerRepeats } from "@/ui/PlayerRepeats";

const PLAYER: PlayerSpec = {
  seed: 9,
  variation: "wander",
  distance: 3,
  repeats: 4,
  repeatsChance: 0.5,
  repeatsSpread: 2,
  repeatsHold: 3,
  gate: 0.5,
  burst: 0.25,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
};

const DEFAULTS: PlayerDefaults = {
  ...PLAYER,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
};

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
  const element = PlayerRepeats({ deck: "a", player: PLAYER, defaults: DEFAULTS, patch });
  return { element, patch };
};

describe("the repeats group", () => {
  /**
   * The four fields it owns, each patching its own and nothing else — one `deck.player` per
   * gesture is the card's business, and this component's is which field moved (0089). The count,
   * the spread and the keep are whole numbers, so each rounds what its dial hands it.
   */
  it("patches one field per dial, and rounds the three that are counts", () => {
    const { element, patch } = group();
    const [repeats, chance, spread, hold] = dials(element);
    for (const [press, value, field] of [
      [repeats, 7.4, { repeats: 7 }],
      [chance, 0.25, { repeatsChance: 0.25 }],
      [spread, 2.6, { repeatsSpread: 3 }],
      [hold, 4.2, { repeatsHold: 4 }],
    ] as const) {
      press?.(value);
      expect(patch).toHaveBeenLastCalledWith(field);
    }
    expect(patch).toHaveBeenCalledTimes(4);
  });

  /**
   * The three amounts are behind the marker rather than on the row, so the card's row stays the
   * height the rack measures (0093, 0118, P87) — and the keep is captioned "Keep" rather than
   * "Hold", because the rate walk's Hold is on the row this menu opens over and two dials on
   * screen at once under one word are two nothing can tell apart (0124, 0135).
   */
  it("draws only the count until its marker is opened", () => {
    const markup = renderToStaticMarkup(group().element);
    expect(markup).toContain(`${yardLabel("a")} ${PLAYER_KNOB_LABELS.repeats}`);
    for (const knob of PLAYER_REPEATS_KNOBS) {
      expect(markup).not.toContain(PLAYER_KNOB_LABELS[knob]);
    }
  });
});
