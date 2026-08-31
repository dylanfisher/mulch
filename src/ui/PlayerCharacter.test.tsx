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

import { PLAYER_KNOBS, type PlayerKnob, type PlayerSpec } from "@/lib/player";
import { PLAYER_CHARACTERS } from "@/lib/playerCast";
import { characterKnobs, PLAYER_DEFAULTS } from "@/lib/playerCharacter";

/** What a press patches when none of the character is taken: every field a draw touches, which is
 *  the defaults but the song, the cast, the ground's own clock and the switch — a character never
 *  rewrites the arrangement it is a part of, nor the list the arrangement after it may be drawn
 *  from, nor what the ground's period is counted on, nor whether the module is on at all (0153,
 *  0174, 0192, P164). */
const {
  albums: _albums,
  cast: _cast,
  bedPer: _bedPer,
  beds: _beds,
  bypassed: _bypassed,
  ...PLAIN
} = PLAYER_DEFAULTS;
import { PLAYER_CHARACTER_LABELS } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerCharacter } from "@/ui/PlayerCharacter";

type Character = (typeof PLAYER_CHARACTERS)[number];
type Control = {
  /** What one name item carries: which character it is, and the draw the menu handed it. */
  character?: Character;
  press?: (character: Character) => void;
  /** The amount's own handler, which Base UI answers a one-thumb slider with a number through. */
  onValueChange?: (value: number) => void;
  /** What a dial under a pressed name carries: which knob it draws and what it is called (0153). */
  knob?: PlayerKnob;
  name?: string;
  /** The one press in this menu that is a plain button: another draw of the name being shown. */
  onClick?: () => void;
  children?: unknown;
};

/** What the menu offers, as the two gestures a hand has: press a name, and move the amount. */
type Menu = {
  press: (character: Character) => void;
  names: Character[];
  amount: (value: number) => void;
  /** The dials the pressed name is about, in the order the menu draws them (0153). */
  shaping: { knob: PlayerKnob; name?: string }[];
  /** The Again press, absent until a name has been pressed and it has something to redraw. */
  again?: () => void;
};

const offered = (element: unknown): Menu => {
  const names: Character[] = [];
  let press: ((character: Character) => void) | undefined;
  let amount: ((value: number) => void) | undefined;
  const shaping: { knob: PlayerKnob; name?: string }[] = [];
  let again: (() => void) | undefined;
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
    // A dial is read off its props for the same reason a name item is: which knob the menu offered
    // is this file's business, and what a dial does with it is src/ui/PlayerDial.tsx's.
    const { knob, name, onClick } = node.props;
    if (knob !== undefined) shaping.push(name === undefined ? { knob } : { knob, name });
    if (onClick !== undefined) again = onClick;
    walk(node.props.children);
  };
  walk(element);
  if (press === undefined || amount === undefined) throw new Error("the menu offered nothing");
  return again === undefined
    ? { press, names, amount, shaping }
    : { press, names, amount, shaping, again };
};

/** The spec the dials under a pressed name read — what a switch press leaves, and a seed. */
const PLAYER: PlayerSpec = { seed: 5, ...PLAYER_DEFAULTS };

const menu = (over: Partial<PlayerSpec> = {}) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const player = { ...PLAYER, ...over };
  /** One render of the menu, at whatever state the last one left behind. */
  const render = (): Menu => {
    cursor = 0;
    return offered(PlayerCharacter({ deck: "a", player, patch }));
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
    expect(Object.keys(fields).sort()).toEqual([...PLAYER_KNOBS].sort());
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
    expect(patch).toHaveBeenLastCalledWith({ ...PLAIN });
    render().amount(1);
    expect(patch).toHaveBeenLastCalledWith(drawn);
    random.mockRestore();
    // Three gestures, three commands: nothing here batches, and nothing sends twice.
    expect(patch).toHaveBeenCalledTimes(3);
  });

  /**
   * A character sets what the pattern is *like*, and which arrangement is playing is not a
   * likeness. A press blends from `PLAYER_DEFAULTS`, whose `arrange` is zero, so without the four
   * being held back a name pressed while the pattern drew its own arrangement would silently swap
   * the author of the song — and the amount under it would go on doing so at every frame of a drag
   * (0152, 0158).
   */
  it("leaves the amounts a drawn arrangement is shaped by exactly where they were", () => {
    const held = { arrange: 3, arrangeKeep: 2, arrangeChance: 1, arrangeReturn: 0.5 };
    const { render, patch } = menu(held);
    const random = middling();
    render().press("stutter");
    render().amount(0.25);
    random.mockRestore();
    expect(patch).toHaveBeenCalledTimes(2);
    for (const [fields] of patch.mock.calls) expect(fields).toMatchObject(held);
  });

  // A name pressed at half an amount is half a character, and the press after it draws afresh:
  // the amount is what the next draw is taken at, not something applied to an old one.
  it("takes the next press at the amount the slider is left on", () => {
    const { render, patch } = menu();
    const random = middling();
    render().amount(0);
    render().press("stutter");
    random.mockRestore();
    expect(patch).toHaveBeenLastCalledWith({ ...PLAIN });
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

  /**
   * The dials a pressed name is about, hoisted beside the name that moved them — and none at all
   * until a name has been pressed, because until then this menu has no opinion to shape. Which
   * knobs those are is the region's own answer, so the case asks the region rather than listing
   * them: a character edited in src/lib/playerCharacter.ts must not need this file edited too
   * (0153, principle 1).
   */
  it("offers the dials a pressed name is about, and none until one is pressed", () => {
    const { render } = menu();
    expect(render().shaping).toEqual([]);
    const random = middling();
    render().press("riff");
    random.mockRestore();
    expect(render().shaping.map((dial) => dial.knob)).toEqual(characterKnobs("riff"));
  });

  // Plain names no knob, which is what makes it the identity: its menu is empty because there is
  // nothing about it to shape, and an Again beside no dials would be a control over nothing.
  it("offers nothing to shape for the one character that draws nothing", () => {
    const { render } = menu();
    render().press("plain");
    expect(render().shaping).toEqual([]);
    expect(render().again).toBeUndefined();
  });

  /**
   * A caption is a dial's whole accessible name (src/ui/Knob.tsx), and the card's own row is
   * drawing these very knobs behind this popover — so each says which character's it is. Without
   * it, "Distance" would name two sliders on screen at once and nothing could tell them apart.
   */
  it("names each of those dials for the character, not by its caption alone", () => {
    const { render } = menu();
    render().press("stutter");
    const shown = render().shaping;
    for (const dial of shown) {
      expect(dial.name).toContain(PLAYER_CHARACTER_LABELS.stutter);
      expect(dial.name).toContain(PLAYER_KNOB_LABELS[dial.knob]);
    }
    expect(new Set(shown.map((dial) => dial.name)).size).toBe(shown.length);
  });

  // Another one of the kind being shown, which is the gesture the name itself already is — said
  // again where the hand is looking after it has turned one of these dials (0152).
  it("draws another of the same character from the button under its dials", () => {
    const { render, patch } = menu();
    render().press("scatter");
    const random = vi.spyOn(Math, "random");
    render().again?.();
    random.mockRestore();
    const [first, second] = patch.mock.calls.map(([fields]) => fields);
    expect(patch).toHaveBeenCalledTimes(2);
    expect(first).not.toEqual(second);
  });
});
