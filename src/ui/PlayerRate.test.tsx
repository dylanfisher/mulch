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

import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_DRIFT_MAX } from "@/lib/playerRungs";
import { PLAYER_RATE_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_RATE_LABEL } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerRate } from "@/ui/PlayerRate";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";

const RATE = { chance: 1, spread: 2, drift: PLAYER_DRIFT_MAX, climb: 0 } as const;

const PLAYER: PlayerSpec = {
  bypassed: false,
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
  hold: 2,
  albums: [],
  cast: PLAYER_CAST_MAX,
  ...RATE,
};

/** What a switch press leaves every field at, as this group's dials snap back to (0118). */
const DEFAULTS: PlayerDefaults = { ...PLAYER, hold: 0 };

/** Whatever a control's own handler takes — this strip's job is which field it patches. */
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

const group = (over: Partial<PlayerSpec> = {}) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerRate({
    deck: "a",
    named: "",
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
   * All five are on the card at once and none of them is behind anything: what a hand can turn is
   * what it can see, which is the whole of 0195. They stand inside one marked bracket with the dial
   * they shape, so the tint reads as one thing — and each is named for that dial, because the
   * repeats' own Keep and five other chances are on the same card (0135, 0195, 0197).
   */
  it("draws every amount beside the hold, marked as one run and named for it", () => {
    const markup = renderToStaticMarkup(group().element);
    expect(markup).toContain(PLAYER_KNOB_LABELS.hold);
    for (const knob of PLAYER_RATE_KNOBS) {
      expect(markup).toContain(`${PLAYER_RATE_LABEL} ${PLAYER_KNOB_LABELS[knob]}`);
    }
    // One mark for the run and not one per element: the tint is a single bracket holding the dial
    // and its amounts, rather than a tile per control with the box's own gap cutting between every
    // pair — which is what made forty controls read as one flat field (0197).
    const marked = markup.match(new RegExp(`data-run="${PLAYER_RATE_LABEL}"`, "gu")) ?? [];
    expect(marked.length).toBe(1);
    // And no marker to press: the toggle that opened the run and the count on it are both gone,
    // because there is nothing left for a press to reveal (0121 retired, 0195).
    expect(markup).not.toContain('data-slot="toggle"');
  });
});
