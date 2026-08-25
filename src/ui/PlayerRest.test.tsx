/**
 * @role What the rest group offers and which field each gesture patches: the wait on the card's
 *   row, and behind the marker at its corner the amounts of whichever author of it is live —
 *   the two that place the waits, and the two that roll one where nothing is placing them
 *   (P87, 0163).
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
  PLAYER_REST_KNOBS,
  PLAYER_REST_PLACED_KNOBS,
  PLAYER_REST_ROLLED_KNOBS,
} from "@/lib/playerKnobs";
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS, yardLabel } from "@/lib/copy";
import { PlayerRest } from "@/ui/PlayerRest";

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
  burst: 0.25,
  vary: 0,
  varyChance: 1,
  rest: 2,
  restPulses: 0,
  restSpan: 8,
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

/** Every dial this group drew, in render order: which knob it is named by and what a turn sends.
 *  The name is remembered on the way down, because it is the component's and the handler is the
 *  control's one layer inside it. */
const dials = (element: unknown): { knob: unknown; press: Press }[] => {
  const found: { knob: unknown; press: Press }[] = [];
  const walk = (node: unknown, knob?: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child, knob);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (props.onChange !== undefined) {
      found.push({ knob, press: props.onChange });
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
      walk((type as (props: Control) => unknown)(props), props.knob);
      return;
    }
    // The group's two slots, in the order they are drawn: the dial the marker sits on, then the
    // amounts behind it (src/ui/PlayerMore.tsx).
    walk(props.dial, knob);
    walk(props.children, knob);
  };
  walk(element);
  return found;
};

const group = () => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerRest({ deck: "a", player: PLAYER, defaults: DEFAULTS, patch });
  return { element, patch };
};

// One case per promise this group makes — which field each dial patches, which dials are there at
// all, and that a closed door draws none of them — so the length is how many promises there are
// rather than how much this block decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the rest group", () => {
  /**
   * The five fields it owns, each patching its own and nothing else — one `deck.player` per
   * gesture is the card's business, and this component's is which field moved (0089). The wait and
   * the two amounts that roll one are continuous; the two that place them are counted in jumps, so
   * they land on whole numbers (0163).
   */
  it("patches one field per dial", () => {
    const { element, patch } = group();
    const [rest, pulses, span, chance, vary] = dials(element).map((dial) => dial.press);
    for (const [press, value, field] of [
      [rest, 1.5, { rest: 1.5 }],
      [pulses, 3, { restPulses: 3 }],
      [span, 8, { restSpan: 8 }],
      [chance, 0.25, { restChance: 0.25 }],
      [vary, 0.75, { restSpread: 0.75 }],
    ] as const) {
      press?.(value);
      expect(patch).toHaveBeenLastCalledWith(field);
    }
    expect(patch).toHaveBeenCalledTimes(5);
  });

  /**
   * And which of them are there at all, which is what makes the placement a mode rather than a
   * third amount: while a pattern is placing the waits, the chance and the spread author nothing,
   * and a dial that is drawn and does nothing is worse than a dial that is not drawn (0163). The
   * two that place them stay either way — one of them is what turns the pattern on.
   */
  it("draws the rolled amounts only while nothing is placing the waits", () => {
    const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
    const drawn = (player: PlayerSpec) =>
      dials(PlayerRest({ deck: "a", player, defaults: DEFAULTS, patch })).map((dial) => dial.knob);
    expect(drawn(PLAYER)).toEqual([
      "rest",
      ...PLAYER_REST_PLACED_KNOBS,
      ...PLAYER_REST_ROLLED_KNOBS,
    ]);
    expect(drawn({ ...PLAYER, restPulses: 3 })).toEqual(["rest", ...PLAYER_REST_PLACED_KNOBS]);
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
