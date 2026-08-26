/**
 * @role What the Compose door sends: the three amounts that shape a drawn arrangement, and the
 *   cast of names it may draw from — one `deck.player` per press, and a last name that stays on
 *   (0158, 0174).
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

import { PLAYER_CAST_LABEL, PLAYER_CHARACTER_LABELS, yardLabel } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { PlayerSpec } from "@/lib/player";
import { PLAYER_CAST_MAX, PLAYER_CHARACTERS, withCharacter } from "@/lib/playerCast";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PlayerArrange } from "@/ui/PlayerArrange";
import { doorsDouble } from "@/ui/playerDoorsDouble";

const PLAYER: PlayerSpec = { seed: 9, ...PLAYER_DEFAULTS };

type Control = {
  onPressedChange?: (pressed: boolean) => void;
  children?: unknown;
  render?: unknown;
  press?: unknown;
  dial?: unknown;
  "aria-label"?: unknown;
};

/** Every press the door drew, by the name it answers to. */
const presses = (element: unknown): { name: unknown; props: Control }[] => {
  const found: { name: unknown; props: Control }[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (props.onPressedChange !== undefined) {
      found.push({ name: props["aria-label"] ?? props.children, props });
    }
    // One name of the cast is a component of its own, so the tree holds one more layer: it is
    // called rather than descended into — the identity `useCallback` above is what makes that
    // possible — and it is told from the frames around it by the handler it carries.
    if (typeof type === "function" && props.press !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one of them
      // is callable — this tree holds no class components at all (src/ui/PlayerRate.test.tsx).
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    // Popovers and tooltips are frames around what they wrap: their children and the element a
    // trigger renders are descended into rather than called, since no stand-in covers their hooks.
    walk(props.render);
    walk(props.dial);
    walk(props.children);
  };
  walk(element);
  return found;
};

const door = (over: Partial<PlayerSpec> = {}) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerArrange({
    deck: "a",
    named: "",
    player: { ...PLAYER, ...over },
    defaults: PLAYER_DEFAULTS,
    patch,
    doors: doorsDouble(),
  });
  return { element, presses: presses(element), patch };
};

const named = (drawn: ReturnType<typeof door>["presses"], character: string) =>
  drawn.find((control) => control.name === `${yardLabel("a")} ${PLAYER_CAST_LABEL} ${character}`)
    ?.props;

describe("the compose door", () => {
  /** One press per declared name, so which characters a pattern may compose with is read off the
   *  one list it is drawn from rather than a second one kept here (principle 1). */
  it("offers every character as a press", () => {
    const drawn = door().presses;
    expect(drawn).toHaveLength(PLAYER_CHARACTERS.length);
    for (const character of PLAYER_CHARACTERS) {
      expect(named(drawn, PLAYER_CHARACTER_LABELS[character])).toBeDefined();
    }
  });

  /** A press on one name is one field of one command, like every other gesture on the card. */
  it("takes one name out of the cast and sends the whole of it back", () => {
    const { presses: drawn, patch } = door();
    named(drawn, PLAYER_CHARACTER_LABELS.riff)?.onPressedChange?.(false);
    expect(patch).toHaveBeenCalledExactlyOnceWith({
      cast: withCharacter(PLAYER_CAST_MAX, "riff", false),
    });
  });

  /**
   * The last one on stays on. An arrangement that may draw nobody has no part to draw, so
   * `assertPlayer` refuses an empty cast — the door may not send what the validator would throw
   * on, and the press that would empty it does nothing instead (0174, principle 5).
   */
  it("refuses to turn off the only name left", () => {
    const { presses: drawn, patch } = door({ cast: 1 });
    const only = named(drawn, PLAYER_CHARACTER_LABELS.plain);
    expect(only).toBeDefined();
    only?.onPressedChange?.(false);
    expect(patch).not.toHaveBeenCalled();
    // And the press is still a press: turning a second name on from the same cast sends one.
    named(drawn, PLAYER_CHARACTER_LABELS.slide)?.onPressedChange?.(true);
    expect(patch).toHaveBeenCalledExactlyOnceWith({ cast: withCharacter(1, "slide", true) });
  });

  /**
   * And the dial the cast sits behind says what the number is: the pattern writing its own song,
   * where Arrange is what the hand does in the section under the dials. Copy only — the field, the
   * knob id and the key the amounts are declared under are all still `arrange` (0174).
   */
  it("captions the dial as the pattern's own composing and not as the hand's arranging", () => {
    expect(PLAYER_KNOB_LABELS.arrange).toBe("Compose");
    expect(renderToStaticMarkup(door().element)).toContain(PLAYER_KNOB_LABELS.arrange);
  });
});
