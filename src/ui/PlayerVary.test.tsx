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

import {
  PLAYER_BURST_MAX,
  PLAYER_BURST_STEP,
  type PlayerDefaults,
  type PlayerSpec,
} from "@/lib/player";
import { PLAYER_VARY_KNOBS } from "@/lib/playerKnobs";
import { yardLabel } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { burstLabel } from "@/ui/Knob";
import { PlayerVary } from "@/ui/PlayerVary";

const PLAYER: PlayerSpec = {
  seed: 9,
  bias: 0,
  stride: 0,
  home: 0,
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
  ratchet: 0,
  gate: 0.5,
  drop: 0,
  reverse: 0,
  spark: 0,
  sparkLevel: 0.5,
  burst: 0.25,
  vary: 0.5,
  varyChance: 0.25,
  rest: 0,
  restPulses: 0,
  restSpan: 8,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  climb: 0,
  song: [],
};

const DEFAULTS: PlayerDefaults = { ...PLAYER, vary: 0, varyChance: 1 };

type Press = (value: number) => void;
type Control = {
  onChange?: Press;
  knob?: unknown;
  dial?: unknown;
  children?: unknown;
  max?: number;
  step?: number;
  format?: (value: number) => string;
};

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

/** The props of the dial the marker sits on — the one slot `PlayerMore` draws before its menu. */
const dialProps = (element: unknown): Control | null => {
  if (!isValidElement<Control>(element)) return null;
  const dial: unknown = element.props.dial;
  if (!isValidElement<Control>(dial)) return null;
  // The dial the marker sits on is a component of its own now, named by the knob it draws rather
  // than built with a range: what this case is about is the range it draws that knob on, so it is
  // called for the control underneath (src/ui/PlayerDial.tsx).
  const { type, props } = dial;
  if (typeof type !== "function") return props;
  // Callable for the reason the walk above says: this tree holds no class components.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const drawn = (type as (props: Control) => unknown)(props);
  // Through the box the dial is drawn in: a dial the song can move wears a mark in its corner, so
  // the knob is one element in rather than the root (src/ui/PlayerDial.tsx).
  return knobIn(drawn);
};

/** The first element under here that is a dial — the one carrying a range. */
const knobIn = (node: unknown): Control | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = knobIn(child);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isValidElement<Control>(node)) return null;
  return node.props.max === undefined ? knobIn(node.props.children) : node.props;
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

  /**
   * The vary is a length of burst and is said in the burst's own unit: the same readout, the same
   * step and the same ceiling as the dial beside it, so the pair compares by eye and moving the
   * burst does not move what the vary means (0135).
   */
  it("reads the spread in the burst's own unit, off the burst's own step", () => {
    const dial = dialProps(group().element);
    expect(dial?.max).toBe(PLAYER_BURST_MAX);
    expect(dial?.step).toBe(PLAYER_BURST_STEP);
    expect(dial?.format).toBe(burstLabel);
  });
});
