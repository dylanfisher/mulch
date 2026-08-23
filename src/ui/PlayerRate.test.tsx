/**
 * @role What the rate group offers and which field each gesture patches: the hold on the strip,
 *   the three amounts behind the marker at its corner, and the marker saying whether this walk
 *   has been shaped (0118).
 */
// One case is one claim about four dials, and its table is a line per dial. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { createElement, isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this component calls, made callable outside a renderer so a control's own handler
// can be pressed — the same stand-in src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import {
  PLAYER_DRIFT_MAX,
  PLAYER_RATE_KNOBS,
  type PlayerDefaults,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copy";
import { ACTION_ICONS } from "@/ui/icons";
import { PlayerRate } from "@/ui/PlayerRate";

const RATE = { chance: 1, spread: 2, drift: PLAYER_DRIFT_MAX } as const;

const PLAYER: PlayerSpec = {
  seed: 9,
  variation: "wander",
  distance: 3,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  gate: 0.5,
  burst: 0.25,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restChance: 1,
  restSpread: 0,
  hold: 2,
  ...RATE,
};

/** What a switch press leaves every field at, as this group's dials snap back to (0118). */
const DEFAULTS: PlayerDefaults = { ...PLAYER, hold: 0 };

/** Whatever a control's own handler takes — this strip's job is which field it patches. */
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

/** The `more` icon's own path, so the marker is asserted against the vocabulary and not a guess. */
const door = /d="([^"]+)"/u.exec(renderToStaticMarkup(createElement(ACTION_ICONS.more)))?.[1] ?? "";

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
   * What the marker's picture says, which is all it says: a dot reads as a state of the dial it
   * sits on, and this one is a door. The vocabulary's `more` is the picture that says so, in the
   * instrument's own ink and in one colour, so the dial hiding three others is told apart from
   * the ones hiding nothing before it is clicked (0121).
   */
  it("draws its marker as the framed plus under a pointer, not as a dot", () => {
    for (const element of [group().element, group({ chance: 0 }).element]) {
      const markup = renderToStaticMarkup(element);
      // The picture the icon vocabulary files under `more`, asked for as that entry's own drawing
      // rather than as a shape that happens to look like it (src/ui/icons.ts).
      expect(markup).toContain(door);
      expect(markup).toContain("cursor-pointer");
      // One colour, whatever the three are set to: the accent is a state, and this is not one.
      expect(markup).toContain("text-foreground");
      expect(markup).not.toContain("text-primary");
      // The dot it is not: the one a lane preview hangs off, one control along.
      expect(markup).not.toContain("size-2 rounded-md");
    }
  });
});
