/**
 * @role What the repeats group offers and which field each gesture patches: the count on the
 *   card's row, and the four amounts behind the marker at its corner — a chance a due redraw
 *   fires, a spread it may stray by, how many jumps keep one count (0135), and how much of each
 *   repeat the next one keeps (P118).
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

import { PLAYER_REPEATS_KNOBS } from "@/lib/playerKnobs";
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerRepeats } from "@/ui/PlayerRepeats";
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
  repeatsChance: 0.5,
  repeatsSpread: 2,
  repeatsHold: 3,
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
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  ratchet: 0,
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
    // The group's two slots, in the order they are drawn: the dial the marker sits on, then the
    // amounts behind it (src/ui/PlayerRun.tsx).
    walk(props.dial);
    walk(props.children);
  };
  walk(element);
  return found;
};

const group = () => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerRepeats({
    deck: "a",
    named: "",
    player: PLAYER,
    defaults: DEFAULTS,
    patch,
  });
  return { element, patch };
};

describe("the repeats group", () => {
  /**
   * The five fields it owns, each patching its own and nothing else — one `deck.player` per
   * gesture is the card's business, and this component's is which field moved (0089). The count,
   * the spread and the keep are whole numbers, so each rounds what its dial hands it; the chance
   * and the ratchet are fractions and land where the dial left them.
   */
  it("patches one field per dial, and rounds the three that are counts", () => {
    const { element, patch } = group();
    const [repeats, chance, spread, hold, ratchet] = dials(element);
    for (const [press, value, field] of [
      [repeats, 7.4, { repeats: 7 }],
      [chance, 0.25, { repeatsChance: 0.25 }],
      [spread, 2.6, { repeatsSpread: 3 }],
      [hold, 4.2, { repeatsHold: 4 }],
      [ratchet, 0.3, { ratchet: 0.3 }],
    ] as const) {
      press?.(value);
      expect(patch).toHaveBeenLastCalledWith(field);
    }
    expect(patch).toHaveBeenCalledTimes(5);
  });

  /**
   * The four stand beside the count rather than behind a marker, each named for it: the rate
   * walk's own Keep is on the same card, and what tells two dials under one word apart is the dial
   * each of them shapes (0124, 0135, 0195).
   */
  it("draws every amount beside the count, each named for it", () => {
    const markup = renderToStaticMarkup(group().element);
    for (const knob of PLAYER_REPEATS_KNOBS) {
      expect(markup).toContain(`${PLAYER_KNOB_LABELS.repeats} ${PLAYER_KNOB_LABELS[knob]}`);
    }
  });
});
