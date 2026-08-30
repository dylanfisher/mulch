/**
 * @role What the distance group offers and which field each gesture patches: how far a jump may
 *   travel, and the three amounts standing beside it in its own run — which way the walk leans,
 *   how often a jump takes the whole distance and how often it comes home to the top of the loop
 *   instead (0162, 0195).
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

import { PLAYER_TRAVEL_KNOBS } from "@/lib/playerKnobs";
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerDistance } from "@/ui/PlayerDistance";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";

const PLAYER: PlayerSpec = {
  bed: 0,
  bedPer: "jump",
  beds: [],
  bedEvery: 0,
  bedDistance: 2,
  bedBias: 0,
  bedHome: 0,
  seed: 9,
  bias: 0.5,
  stride: 0.25,
  home: 0.1,
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  arrangeAmount: 1,
  arrangeGrow: 0,
  arrangeSpan: 0,
  arrangeApart: 0,
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
  sparkDelay: 0,
  burst: 0.25,
  vary: 0,
  varyChance: 1,
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
  cast: PLAYER_CAST_MAX,
};

const DEFAULTS: PlayerDefaults = {
  ...PLAYER,
  bias: 0,
  stride: 0,
  home: 0,
};

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
    // that draws a run, whose own hooks no stand-in covers (src/ui/PlayerRun.tsx).
    if (typeof type === "function" && props.knob !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one of them
      // is callable — this tree holds no class components at all, so the narrowing is a fact about
      // the file rather than a guess (src/lib/records.ts takes the same one).
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    // The run's two slots, in the order they are drawn: the dial the amounts belong to, then the
    // amounts beside it (src/ui/PlayerRun.tsx).
    walk(props.dial);
    walk(props.children);
  };
  walk(element);
  return found;
};

const group = () => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerDistance({
    deck: "a",
    named: "",
    player: PLAYER,
    defaults: DEFAULTS,
    patch,
  });
  return { element, patch };
};

describe("the distance group", () => {
  /**
   * The four fields it owns, each patching its own and nothing else — one `deck.player` per
   * gesture is the card's business, and this component's is which field moved (0089). The distance
   * is a count in slots, so it rounds what its dial hands it; the lean and the two odds are
   * fractions and land where the dial left them, the lean being the one that may land below zero.
   */
  it("patches one field per dial, and rounds the one that is a count", () => {
    const { element, patch } = group();
    const [distance, bias, stride, home] = dials(element);
    for (const [press, value, field] of [
      [distance, 7.4, { distance: 7 }],
      [bias, -0.75, { bias: -0.75 }],
      [stride, 0.3, { stride: 0.3 }],
      [home, 0.2, { home: 0.2 }],
    ] as const) {
      press?.(value);
      expect(patch).toHaveBeenLastCalledWith(field);
    }
    expect(patch).toHaveBeenCalledTimes(4);
  });

  /**
   * All four are on the card at once, and what tells an amount from the dial it shapes is the name
   * it wears: a caption is a dial's whole accessible name (src/ui/Knob.tsx), so every amount is
   * named for the dial it belongs to and the words on screen stay one each (0195).
   */
  it("draws every amount beside the distance, each named for it", () => {
    const markup = renderToStaticMarkup(group().element);
    for (const knob of PLAYER_TRAVEL_KNOBS) {
      expect(markup).toContain(`${PLAYER_KNOB_LABELS.distance} ${PLAYER_KNOB_LABELS[knob]}`);
    }
  });
});
