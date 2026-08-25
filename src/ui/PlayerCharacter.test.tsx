/**
 * @role What the character menu sends: a name press patches every field of the spec at once and
 *   never the seed, the amount moves the pattern it drew rather than drawing another, and a slider
 *   with nothing drawn yet says nothing to the instrument at all (0152, 0089).
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The component's own two cells, held across the renders this file performs by hand — the same
 *  stand-in src/ui/AsyncButton.test.tsx drives its button with. */
let cells: unknown[] = [];
let cursor = 0;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useState: (initial: unknown) => {
      const cell = cursor;
      cursor += 1;
      if (cells.length <= cell) cells[cell] = initial;
      return [cells[cell], (value: unknown) => (cells[cell] = value)];
    },
  };
});

import { PLAYER_KNOBS, type PlayerSpec } from "@/lib/player";
import { PLAYER_CHARACTERS, PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_CHARACTER_LABELS } from "@/lib/copy";
import { PlayerCharacter } from "@/ui/PlayerCharacter";

type Character = (typeof PLAYER_CHARACTERS)[number];
type Control = {
  /** What one name item carries: which character it is, and the draw the menu handed it. */
  character?: Character;
  press?: (character: Character) => void;
  /** The amount's own handler, which Base UI answers a one-thumb slider with a number through. */
  onValueChange?: (value: number) => void;
  children?: unknown;
};

/** What the menu offers, as the two gestures a hand has: press a name, and move the amount. */
type Menu = {
  press: (character: Character) => void;
  names: Character[];
  amount: (value: number) => void;
};

const offered = (element: unknown): Menu => {
  const names: Character[] = [];
  let press: ((character: Character) => void) | undefined;
  let amount: ((value: number) => void) | undefined;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    // The name items are components of their own, so what they were handed is read off their
    // props rather than rendered — this file's business is the menu, not the button
    // (src/ui/PlayerCharacter.tsx).
    if (node.props.character !== undefined && node.props.press !== undefined) {
      names.push(node.props.character);
      press = node.props.press;
    }
    if (node.props.onValueChange !== undefined) amount = node.props.onValueChange;
    walk(node.props.children);
  };
  walk(element);
  if (press === undefined || amount === undefined) throw new Error("the menu offered nothing");
  return { press, names, amount };
};

const menu = () => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  /** One render of the menu, at whatever state the last one left behind. */
  const render = (): Menu => {
    cursor = 0;
    return offered(PlayerCharacter({ deck: "a", patch }));
  };
  return { render, patch };
};

/** The draw, pinned: every span is taken at its own middle, so a case reads one value. */
const middling = () => vi.spyOn(Math, "random").mockReturnValue(0.5);

afterEach(() => {
  cells = [];
  vi.restoreAllMocks();
});

// One case per gesture the menu offers. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the character menu", () => {
  it("offers every character the module declares, and one amount under them", () => {
    expect(menu().render().names).toEqual([...PLAYER_CHARACTERS]);
    for (const character of PLAYER_CHARACTERS) {
      expect(PLAYER_CHARACTER_LABELS[character].trim().length).toBeGreaterThan(0);
    }
  });

  /**
   * Every field at once and no field left behind — the card merges what this sends into the spec
   * it holds, so a partial patch would be a pattern half of one character and half of another.
   * The seed is not among them: a character changes what the pattern is like, and which
   * performance it is stays the number the heading reads out (0089, 0152).
   */
  it("patches every knob of the spec at once, and never the seed", () => {
    const { render, patch } = menu();
    const random = middling();
    render().press("stutter");
    random.mockRestore();
    const fields = patch.mock.calls[0]?.[0] ?? {};
    // ES2022 has no toSorted; both arrays are fresh, so sorting cannot mutate a caller's value.
    // oxlint-disable-next-line unicorn/no-array-sort
    expect(Object.keys(fields).sort()).toEqual([...PLAYER_KNOBS, "variation"].sort());
    expect(fields).not.toHaveProperty("seed");
    // The character itself, at all of it: a hammered pattern staying where it is.
    expect(fields.gate).toBeGreaterThan(PLAYER_DEFAULTS.gate);
    expect(fields.burst).toBeLessThan(PLAYER_DEFAULTS.burst);
    expect(fields.repeats).toBeGreaterThan(PLAYER_DEFAULTS.repeats);
  });

  // The slider is a control over one drawn pattern, not a die: with nothing drawn there is nowhere
  // to travel, so it sets what the next press takes and sends nothing.
  it("says nothing to the instrument until a name has been pressed", () => {
    const { render, patch } = menu();
    render().amount(0.5);
    expect(patch).not.toHaveBeenCalled();
  });

  /**
   * Moving the amount blends the pattern that was drawn rather than drawing again — which is what
   * makes it a control a hand can hold. None of it is the values the switch leaves.
   */
  it("moves the drawn character toward plain without redrawing it", () => {
    const { render, patch } = menu();
    const random = middling();
    render().press("stutter");
    const drawn = patch.mock.calls[0]?.[0];
    render().amount(0);
    expect(patch).toHaveBeenLastCalledWith({ ...PLAYER_DEFAULTS });
    render().amount(1);
    expect(patch).toHaveBeenLastCalledWith(drawn);
    random.mockRestore();
    // Three gestures, three commands: nothing here batches, and nothing sends twice.
    expect(patch).toHaveBeenCalledTimes(3);
  });

  // A name pressed at half an amount is half a character, and the press after it draws afresh:
  // the amount is what the next draw is taken at, not something applied to an old one.
  it("takes the next press at the amount the slider is left on", () => {
    const { render, patch } = menu();
    const random = middling();
    render().amount(0);
    render().press("stutter");
    random.mockRestore();
    expect(patch).toHaveBeenLastCalledWith({ ...PLAYER_DEFAULTS });
  });

  // Two presses of one name are two patterns of one kind — the region is drawn from, not landed
  // on, so a hand that liked Scatter can press it again for another one (0152).
  it("draws a fresh pattern on a second press of the same name", () => {
    const { render, patch } = menu();
    const random = vi.spyOn(Math, "random").mockReturnValue(0.1);
    render().press("scatter");
    random.mockReturnValue(0.9);
    render().press("scatter");
    random.mockRestore();
    const [first, second] = patch.mock.calls.map(([fields]) => fields);
    expect(first).not.toEqual(second);
  });
});
