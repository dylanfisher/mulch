/**
 * @role What the rest group offers and which field each gesture patches: the wait on the card's
 *   row, and the two amounts behind the marker at its corner (P87).
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

import { PLAYER_REST_KNOBS, type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS, yardLabel } from "@/lib/copy";
import { PlayerRest } from "@/ui/PlayerRest";

const PLAYER: PlayerSpec = {
  seed: 9,
  variation: "wander",
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  distance: 3,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  gate: 0.5,
  burst: 0.25,
  vary: 0,
  varyChance: 1,
  rest: 2,
  restChance: 0.5,
  restSpread: 0.25,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  song: [],
};

const DEFAULTS: PlayerDefaults = { ...PLAYER, rest: 0, restChance: 1, restSpread: 0 };

type Press = (value: number) => void;
type Control = { onChange?: Press; knob?: unknown; dial?: unknown; children?: unknown };

/** Every `onChange` this group put on a dial, in render order. */
const dials = (element: unknown): Press[] => {
  const found: Press[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (props.onChange !== undefined) {
      found.push(props.onChange);
      return;
    }
    // A dial is a component of its own now, so the tree holds one more layer. It is called rather
    // than descended into — the identity `useCallback` above is what makes that possible — and it
    // is told from the frame around it by the patch it carries: this walk may not call a component
    // that draws a popover, whose own hooks no stand-in covers (src/ui/PlayerDial.tsx).
    if (typeof type === "function" && props.knob !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one of them
      // is callable — this tree holds no class components at all, so the narrowing is a fact about
      // the file rather than a guess (src/lib/records.ts takes the same one).
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    // The group's two slots, in the order they are drawn: the dial the marker sits on, then the
    // amounts behind it (src/ui/PlayerMore.tsx).
    walk(props.dial);
    walk(props.children);
  };
  walk(element);
  return found;
};

const group = () => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerRest({ deck: "a", player: PLAYER, defaults: DEFAULTS, patch });
  return { element, patch };
};

describe("the rest group", () => {
  /**
   * The three fields it owns, each patching its own and nothing else — one `deck.player` per
   * gesture is the card's business, and this component's is which field moved (0089). None of
   * them rounds: a wait, the odds it is taken and how far it strays are all continuous.
   */
  it("patches one field per dial", () => {
    const { element, patch } = group();
    const [rest, chance, vary] = dials(element);
    for (const [press, value, field] of [
      [rest, 1.5, { rest: 1.5 }],
      [chance, 0.25, { restChance: 0.25 }],
      [vary, 0.75, { restSpread: 0.75 }],
    ] as const) {
      press?.(value);
      expect(patch).toHaveBeenLastCalledWith(field);
    }
    expect(patch).toHaveBeenCalledTimes(3);
  });

  /**
   * The two are behind the marker rather than on the row, which is the whole reason this
   * component exists: a closed popover draws no dial, so the card's row stays the height the rack
   * measures (0093, 0118, P87). The door itself is named for the yard and the dial it sits on.
   */
  it("draws only the wait until its marker is opened", () => {
    const markup = renderToStaticMarkup(group().element);
    expect(markup).toContain(`${yardLabel("a")} ${PLAYER_KNOB_LABELS.rest}`);
    for (const knob of PLAYER_REST_KNOBS) {
      expect(markup).not.toContain(PLAYER_KNOB_LABELS[knob]);
    }
  });
});
