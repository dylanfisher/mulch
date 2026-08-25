/**
 * @role What the song menu sends: every gesture patches the whole list rather than one part of it,
 *   a part may only name a declared character, and the ceiling on how many parts a song holds is
 *   refused at the control rather than left to the validator (0153, 0089).
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The one hook this menu calls, made callable outside a renderer so a control's own handler can be
// pressed — the same stand-in src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { type PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_PART_DEFAULTS, PLAYER_SONG_MAX, type SongPart } from "@/lib/playerSong";
import { PlayerSong } from "@/ui/PlayerSong";

const spec = (song: readonly SongPart[]): PlayerSpec => ({ seed: 3, ...PLAYER_DEFAULTS, song });

const part = (over: Partial<SongPart> = {}): SongPart => ({ ...PLAYER_PART_DEFAULTS, ...over });

/** Whatever a control's own handler takes — this menu's job is which song it patches. */
type Press = (...args: unknown[]) => void;
type Control = {
  onClick?: Press;
  onValueChange?: Press;
  onPressedChange?: Press;
  onChange?: Press;
  disabled?: boolean;
  /** What a row carries: the part it is, so a walk can call it for the controls underneath. */
  part?: SongPart;
  children?: unknown;
};

const HANDLERS = ["onValueChange", "onChange", "onPressedChange", "onClick"] as const;

/**
 * Every handler the menu put on a control, in render order, with the rows called rather than
 * descended into — a row is a component of its own, and the identity `useCallback` above is what
 * makes calling it possible (src/ui/PlayerSong.tsx).
 */
const handlers = (element: unknown): Press[] => {
  const found: Press[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (typeof type === "function" && props.part !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one is
      // callable; this tree holds no class components.
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    for (const key of HANDLERS) {
      const handler = props[key];
      if (handler !== undefined) found.push(handler);
    }
    walk(props.children);
  };
  walk(element);
  return found;
};

/** Every disabled flag the menu set, so the ceiling is read off the control that refuses it. */
const refused = (element: unknown): boolean => {
  let found = false;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    if (node.props.disabled === true) found = true;
    walk(node.props.children);
  };
  walk(element);
  return found;
};

const menu = (song: readonly SongPart[]) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerSong({ deck: "a", player: spec(song), patch });
  return { element, patch };
};

/**
 * Where a row's four controls sit among the handlers, in the order the row draws them: the
 * character it is drawn as, how long it lasts, how far into that character it is taken, whether it
 * is a chorus, and the press that takes it away (src/ui/PlayerSong.tsx).
 */
const CHARACTER = 0;
const LENGTH = 1;
const AMOUNT = 2;
const CHORUS = 3;
const REMOVE = 4;

// One case per gesture the menu sends, and its table is a line per control. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the song menu", () => {
  // A song with no parts is the ordinary case and says what one is for, rather than opening on an
  // empty box with a button under it (P65).
  it("offers the one gesture that starts a song, and nothing to edit", () => {
    const { element, patch } = menu([]);
    const press = handlers(element);
    expect(press).toHaveLength(1);
    press[0]?.();
    expect(patch).toHaveBeenCalledWith({ song: [PLAYER_PART_DEFAULTS] });
  });

  /**
   * Every gesture patches the whole list: `song` is one durable field, and a part edited in place
   * would be half a record reaching the instrument (0089).
   */
  it("patches the whole song with one part moved", () => {
    const song = [part({ character: "riff" }), part({ character: "breathe", length: 4 })];
    const { element, patch } = menu(song);
    const press = handlers(element);
    press[LENGTH]?.(12.4);
    expect(patch).toHaveBeenLastCalledWith({ song: [part({ length: 12 }), song[1]] });
    press[CHORUS]?.(true);
    expect(patch).toHaveBeenLastCalledWith({ song: [part({ chorus: true }), song[1]] });
    press[AMOUNT]?.(0.25);
    expect(patch).toHaveBeenLastCalledWith({ song: [part({ amount: 0.25 }), song[1]] });
    press[CHARACTER]?.("scatter");
    expect(patch).toHaveBeenLastCalledWith({ song: [part({ character: "scatter" }), song[1]] });
  });

  // A pick that is not a declared character is refused here rather than thrown on by the
  // validator: the picker hands back whatever its items carry, and this row is what says what a
  // part may name (principle 5).
  it("refuses a character nobody declared rather than sending it", () => {
    const { element, patch } = menu([part()]);
    handlers(element)[CHARACTER]?.("chorus");
    expect(patch).not.toHaveBeenCalled();
  });

  it("takes a part away by the place it stands in, and leaves the rest in order", () => {
    const song = [part({ character: "riff" }), part({ character: "slide" }), part()];
    const { element, patch } = menu(song);
    handlers(element)[REMOVE]?.();
    expect(patch).toHaveBeenCalledWith({ song: [song[1], song[2]] });
  });

  /**
   * At the ceiling the gesture is refused rather than hidden: a control that vanishes at a bound
   * leaves nothing on screen saying there was one (0121).
   */
  it("refuses another part at the ceiling instead of hiding the gesture", () => {
    const full = Array.from({ length: PLAYER_SONG_MAX }, () => part());
    expect(refused(menu(full).element)).toBe(true);
    expect(refused(menu(full.slice(1)).element)).toBe(false);
  });
});
