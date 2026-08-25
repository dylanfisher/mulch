/**
 * @role What the slots strip sends: one `deck.player` per gesture carrying the whole spec, and a
 *   mask that is ordinary durable numbers written at the press — the onsets are read once, there,
 *   and nothing on a walk path reads them again (0089, 0165).
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The one hook this component calls, made callable outside a renderer so a control's own handler
// can be pressed — the same stand-in src/ui/PlayerRest.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import {
  PLAYER_SLOTS_ALL_LABEL,
  PLAYER_SLOTS_FROM_SOURCE_LABEL,
  PLAYER_SLOTS_LABEL,
  yardLabel,
} from "@/lib/copy";
import type { PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import {
  maskFromOnsets,
  PLAYER_GRID,
  PLAYER_MASK_MAX,
  slotAllowed,
  withSlot,
} from "@/lib/playerSlots";
import { playerSequence } from "@/lib/playerWalk";
import { PlayerSlots } from "@/ui/PlayerSlots";

const PLAYER: PlayerSpec = { seed: 9, ...PLAYER_DEFAULTS };

/** The loop the strip divides: two seconds over sixteen divisions is 125ms each. */
const LOOP = { in: 1, out: 3 };
/** Transients in the first, the third and the thirteenth division, and two outside the loop. */
const ONSETS = [0.5, 1, 1.3, 2.5, 3.2];

type Control = {
  onClick?: () => void;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  children?: unknown;
  render?: unknown;
  press?: unknown;
  "aria-label"?: unknown;
};

/** Every control the strip drew, in render order: what it is called and what pressing it does. */
const controls = (element: unknown): { name: unknown; props: Control }[] => {
  const found: { name: unknown; props: Control }[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (props.onClick !== undefined || props.onPressedChange !== undefined) {
      found.push({ name: props["aria-label"] ?? props.children, props });
    }
    // One division of the loop is a component of its own, so the tree holds one more layer: it is
    // called rather than descended into — the identity `useCallback` above is what makes that
    // possible — and it is told from the frames around it by the handler it carries.
    if (typeof type === "function" && props.press !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one of them
      // is callable — this tree holds no class components at all (src/ui/PlayerRest.test.tsx).
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    // Popovers and tooltips are frames around what they wrap: their children and the element a
    // trigger renders are descended into rather than called, since no stand-in covers their hooks.
    walk(props.render);
    walk(props.children);
  };
  walk(element);
  return found;
};

const strip = (fields: Partial<PlayerSpec> = {}, onsets: readonly number[] | null = ONSETS) => {
  const patch = vi.fn<(next: Partial<PlayerSpec>) => void>();
  const element = PlayerSlots({
    deck: "a",
    player: { ...PLAYER, ...fields },
    patch,
    loop: LOOP,
    onsets,
  });
  return { controls: controls(element), patch };
};

/** The one-shot action, found by the word on it rather than by where it sits in the row. */
const named = (drawn: ReturnType<typeof strip>["controls"], label: string) =>
  drawn.find((control) => control.name === label)?.props;

// One case per promise this strip makes, so the length is how many promises there are rather than
// how much this block decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the slots strip", () => {
  /**
   * The whole of the road §2 asks for: the press reads the onsets that are on the deck **once**
   * and what travels is the number they made, in one ordinary `deck.player` patch. Nothing about
   * the reading is kept — a mask that were a live read of analysis would mean one thing on the
   * machine that made it and another on the machine that replays it (0165).
   */
  it("writes the mask its source's transients make, once, as an ordinary whole number", () => {
    const { controls: drawn, patch } = strip();
    named(drawn, PLAYER_SLOTS_FROM_SOURCE_LABEL)?.onClick?.();
    expect(patch).toHaveBeenCalledTimes(1);
    const sent = patch.mock.calls[0]?.[0].slots;
    expect(sent).toBe(maskFromOnsets(ONSETS, LOOP));
    expect(Number.isInteger(sent)).toBe(true);
    // The divisions the three onsets inside the loop fall in, and no others.
    const permitted = PLAYER_GRID.filter((slot) => slotAllowed(sent ?? 0, slot));
    expect(permitted).toEqual([0, 2, 12]);
  });

  /**
   * And the walk reads that number and nothing else: the onsets the mask was made from can go away
   * entirely and the pattern is the pattern it was. This is what "reads nothing at walk time"
   * means, and it is the reason the field is durable numbers rather than a read of analysis.
   */
  it("walks the mask it wrote without the reading it was made from", () => {
    const { controls: drawn, patch } = strip();
    named(drawn, PLAYER_SLOTS_FROM_SOURCE_LABEL)?.onClick?.();
    const masked: PlayerSpec = { ...PLAYER, ...patch.mock.calls[0]?.[0] };
    const walked = playerSequence(masked, 200);
    // The same number, arrived at without any analysis at all.
    expect(playerSequence({ ...PLAYER, slots: masked.slots }, 200)).toEqual(walked);
    expect(walked.every((step) => slotAllowed(masked.slots, step.slot))).toBe(true);
  });

  /** A press on one division is one field of one command, like every other gesture on the card. */
  it("turns one division off and sends the whole strip back", () => {
    const { controls: drawn, patch } = strip();
    drawn
      .find((control) => control.name === `${yardLabel("a")} ${PLAYER_SLOTS_LABEL} 4`)
      ?.props.onPressedChange?.(false);
    expect(patch).toHaveBeenCalledExactlyOnceWith({
      slots: withSlot(PLAYER_MASK_MAX, 3, false),
    });
  });

  /**
   * The last one on stays on. A pattern that may land nowhere has no next slot to draw, so
   * `assertPlayer` refuses an empty mask — the strip may not send what the validator would throw
   * on, and the press that would empty it does nothing instead (0165).
   */
  it("refuses to turn off the only division left", () => {
    const { controls: drawn, patch } = strip({ slots: 1 });
    drawn
      .find((control) => control.name === `${yardLabel("a")} ${PLAYER_SLOTS_LABEL} 1`)
      ?.props.onPressedChange?.(false);
    expect(patch).not.toHaveBeenCalled();
  });

  /** And the way back to the whole loop, which is where a switch press leaves the strip. */
  it("opens the whole grid again", () => {
    const { controls: drawn, patch } = strip({ slots: 1 });
    named(drawn, PLAYER_SLOTS_ALL_LABEL)?.onClick?.();
    expect(patch).toHaveBeenCalledExactlyOnceWith({ slots: PLAYER_MASK_MAX });
  });

  /**
   * An action that could do nothing is not offered: analysis arrives when the worker answers, and
   * until it has there is no reading to take (0025).
   */
  it("offers nothing to read where the source has not been measured", () => {
    expect(named(strip({}, null).controls, PLAYER_SLOTS_FROM_SOURCE_LABEL)?.disabled).toBe(true);
    expect(named(strip({}, []).controls, PLAYER_SLOTS_FROM_SOURCE_LABEL)?.disabled).toBe(true);
    expect(named(strip().controls, PLAYER_SLOTS_FROM_SOURCE_LABEL)?.disabled).toBe(false);
  });

  /**
   * And a loop no transient falls in is nothing to send rather than a mask no pattern could play:
   * the action leaves the strip where it is instead of writing a zero.
   */
  it("says nothing where no transient falls inside the loop", () => {
    const { controls: drawn, patch } = strip({}, [0.1, 9]);
    named(drawn, PLAYER_SLOTS_FROM_SOURCE_LABEL)?.onClick?.();
    expect(patch).not.toHaveBeenCalled();
  });
});
