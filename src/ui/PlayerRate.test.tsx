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

// Three over the dependency cap, and all three are what a door now takes: the set it reads, the
// key it reports itself by and the word that key is built from. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_DRIFT_MAX } from "@/lib/playerRungs";
import { PLAYER_RATE_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_RATE_LABEL } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerRate } from "@/ui/PlayerRate";
import { doorKey } from "@/ui/PlayerMore";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import { doorsDouble, doorsOpen } from "@/ui/playerDoorsDouble";
// oxlint-enable import/max-dependencies

const RATE = { chance: 1, spread: 2, drift: PLAYER_DRIFT_MAX, climb: 0 } as const;

const PLAYER: PlayerSpec = {
  bed: 0,
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
  song: [],
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
    // that draws a door, whose own hooks no stand-in covers (src/ui/PlayerMore.tsx).
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

/** The one press the group draws that is not a dial: the marker that opens the door. */
const marker = (element: unknown): ((open: boolean) => void) | undefined => {
  let found: ((open: boolean) => void) | undefined;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (
      !isValidElement<{
        onPressedChange?: (open: boolean) => void;
        doors?: unknown;
        children?: unknown;
      }>(node)
    ) {
      return;
    }
    const { type, props } = node;
    // The door itself is a component, and the marker is inside its own render — so it is called
    // rather than descended into, the way a dial is, and told apart by the set it carries. The
    // `useCallback` stand-in above is what makes calling it safe (src/ui/PlayerMore.tsx).
    if (typeof type === "function" && props.doors !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one is
      // callable; this tree holds no class components.
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: unknown) => unknown)(props));
      return;
    }
    found ??= props.onPressedChange;
    walk(props.children);
  };
  walk(element);
  return found;
};

const group = (over: Partial<PlayerSpec> = {}, doors = doorsDouble()) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerRate({
    deck: "a",
    named: "",
    player: { ...PLAYER, ...over },
    defaults: DEFAULTS,
    patch,
    doors,
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
   * The four are behind the marker rather than on the row, which is the whole reason this
   * component exists: a shut door draws no dial at all — not one hidden with CSS, whose caption
   * would still spend the two line boxes the rack measures a row by (0093, 0107, P135).
   */
  it("draws only the hold until the marker is opened", () => {
    const markup = renderToStaticMarkup(group().element);
    expect(markup).toContain(PLAYER_KNOB_LABELS.hold);
    for (const knob of PLAYER_RATE_KNOBS) {
      expect(markup).not.toContain(PLAYER_KNOB_LABELS[knob]);
    }
  });

  /**
   * And opened, they are drawn where they live: siblings of the dial in the box's own flow rather
   * than a layer over it, each carrying the run's own mark so the tint brackets the dial and its
   * amounts as one thing (P135). The whole of what the popover used to be is this one name.
   */
  it("draws its amounts beside the dial once the door is open", () => {
    const markup = renderToStaticMarkup(group({}, doorsOpen("", PLAYER_RATE_LABEL)).element);
    for (const knob of PLAYER_RATE_KNOBS) {
      expect(markup).toContain(PLAYER_KNOB_LABELS[knob]);
    }
    // One mark per element of the run: the dial the marker sits on, and one per amount.
    const marked = markup.match(new RegExp(`data-door="${PLAYER_RATE_LABEL}"`, "gu")) ?? [];
    expect(marked.length).toBe(PLAYER_RATE_KNOBS.length + 1);
    // And nothing on the page while it is shut, which is what makes the count above a claim.
    expect(renderToStaticMarkup(group().element)).not.toContain("data-door=");
  });

  /**
   * The marker is a state and not an action — the door stands open or it does not — so it is a
   * `Toggle`, and what it reports is which door moved rather than a spec (0055, P135). It says so
   * by the key the card holds the set under, because a part's fold draws this very door again and
   * one press may not open both (`doorKey`).
   */
  it("reports the door it opened by its own key and patches nothing", () => {
    const setOpen = vi.fn<(open: string | null) => void>();
    const { element, patch } = group({}, doorsDouble(null, setOpen));
    marker(element)?.(true);
    expect(setOpen).toHaveBeenCalledWith(doorKey("", PLAYER_RATE_LABEL));
    // And shut again by the same press, which is the whole of a toggle: one door at a time, so
    // closing one is saying that none is open rather than taking a name out of a list.
    marker(group({}, doorsDouble(doorKey("", PLAYER_RATE_LABEL), setOpen)).element)?.(false);
    expect(setOpen).toHaveBeenLastCalledWith(null);
    expect(patch).not.toHaveBeenCalled();
  });

  /**
   * What the marker says, which is all it says: how many amounts the dial holds. 0121's framed
   * plus said only "more of it behind a press" and left a person to find out how much by pressing
   * — which is the failure P135 is written against, so the picture is retired for the number
   * (0121 amended). It stays one ink: whether the door stands open is the toggle's own fill, and
   * a marker that changed colour with what is behind it would report a state a door does not have.
   */
  it("draws its marker as the count of what is behind it, not as the framed plus", () => {
    for (const element of [group().element, group({ chance: 0 }).element]) {
      const markup = renderToStaticMarkup(element);
      // The marker holds the count and nothing else: 0121's framed plus was the icon vocabulary's
      // own `more`, and this step retired the entry with the picture (src/ui/icons.ts).
      expect(markup).toMatch(
        new RegExp(
          `data-slot="toggle"[^>]*><span class="type-readout">${PLAYER_RATE_KNOBS.length}</span>`,
          "u",
        ),
      );
      expect(markup).toContain("cursor-pointer");
      // One colour, whatever the four are set to: the accent is a state, and this is not one.
      expect(markup).toContain("text-foreground");
      expect(markup).not.toContain("text-primary");
      // The dot it is not: the one a lane preview hangs off, one control along.
      expect(markup).not.toContain("size-2 rounded-md");
    }
  });
});
