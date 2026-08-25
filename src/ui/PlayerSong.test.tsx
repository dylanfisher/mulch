/**
 * @role What the song section sends: every gesture patches the whole list rather than one part of
 *   it, a part may only name a declared character, a part moved is one `deck.player` carrying the
 *   whole spec, and the ceiling on how many parts a song holds is refused at the control rather
 *   than left to the validator (0153, 0089, 0157).
 */
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The one hook this menu calls, made callable outside a renderer so a control's own handler can be
// pressed — the same stand-in src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { type PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_PART_DEFAULTS, PLAYER_SONG_MAX, type SongPart } from "@/lib/playerSong";
import { PlayerSong } from "@/ui/PlayerSong";

const spec = (song: readonly SongPart[]): PlayerSpec => ({ seed: 3, ...PLAYER_DEFAULTS, song });

/** A part, with the opaque id every one now carries: minted at the gesture that adds one, so a
 *  test that wants two parts alike in every field still has two things (0076, 0157). */
let minted = 0;
const part = (over: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  ...PLAYER_PART_DEFAULTS,
  ...over,
});

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
  "aria-label"?: string;
  onKeyDown?: (event: { key: string; preventDefault: () => void }) => void;
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

/** One control of the section, by the name it wears — the road to a handler this walk does not
 *  collect, because a grip answers a keypress rather than a value change (src/ui/listDrag.ts). */
const labelled = (element: unknown, label: string): Control | null => {
  let found: Control | null = null;
  const walk = (node: unknown): void => {
    if (found !== null) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (typeof type === "function" && props.part !== undefined) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    if (props["aria-label"] === label) {
      found = props;
      return;
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

/**
 * The section's own element tree, built inside a render of its own — which is where its hooks run:
 * the reorder gesture's refs, and the frame that lights the part standing (src/ui/PlayerSong.tsx).
 * The instrument is real, because the reorder reads the song back off the store at the release
 * rather than trusting the press (0111).
 */
const menu = (song: readonly SongPart[], playing = false) => {
  const instrument = createInstrument(manualClock());
  // The store as the session would hold it. Stubbed rather than sent, because `deck.player` is
  // refused for a deck with nothing loaded and no engine to hold it (src/app/execute.ts) — what
  // this file is about is the section reading the arrangement back at the release rather than
  // trusting the press (0111).
  const held = instrument.state.getState();
  vi.spyOn(instrument.state, "getState").mockReturnValue({
    ...held,
    decks: { ...held.decks, a: { ...held.decks.a!, player: spec(song) } },
  });
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const setFolded = vi.fn<(folded: boolean) => void>();
  const sent = vi.spyOn(instrument, "send");
  let element: ReactNode = null;
  function Probe(): null {
    element = PlayerSong({
      instrument,
      deck: "a",
      player: spec(song),
      playing,
      patch,
      fold: [false, setFolded],
    });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return { element, patch, sent, setFolded, instrument };
};

/**
 * Where a row's four controls sit among the handlers, in the order the row draws them: the
 * character it is drawn as, how long it lasts, how far into that character it is taken, whether it
 * is a chorus, and the press that takes it away (src/ui/PlayerSong.tsx).
 */
const FOLD = 0;
const CHARACTER = 1;
const LENGTH = 2;
const AMOUNT = 3;
const CHORUS = 4;
const REMOVE = 5;

// One case per gesture the menu sends, and its table is a line per control. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the song section", () => {
  // A song with no parts is the ordinary case and says what one is for, rather than opening on an
  // empty box with a button under it (P65).
  it("offers the one gesture that starts a song, and nothing to edit", () => {
    const { element, patch } = menu([]);
    const press = handlers(element);
    // The fold this section is under, and the gesture that adds the first part. Nothing else.
    expect(press).toHaveLength(2);
    press[1]?.();
    // The id is minted at the gesture, so what is sent is the defaults with one of its own.
    const [sentSong] = patch.mock.calls[0] ?? [];
    expect(sentSong?.song).toHaveLength(1);
    const [added] = sentSong?.song ?? [];
    expect(added).toMatchObject(PLAYER_PART_DEFAULTS);
    expect(added?.id.length).toBeGreaterThan(0);
  });

  /**
   * Every gesture patches the whole list: `song` is one durable field, and a part edited in place
   * would be half a record reaching the instrument (0089).
   */
  it("patches the whole song with one part moved", () => {
    const song = [part({ character: "riff" }), part({ character: "breathe", length: 4 })];
    const { element, patch } = menu(song);
    const press = handlers(element);
    // Each expectation is the very part that was edited, with one field moved: a part's id is its
    // own and no gesture on this row may mint a second one (0157).
    const moved = (fields: Partial<SongPart>) => ({ song: [{ ...song[0]!, ...fields }, song[1]] });
    press[LENGTH]?.(12.4);
    expect(patch).toHaveBeenLastCalledWith(moved({ length: 12 }));
    press[CHORUS]?.(true);
    expect(patch).toHaveBeenLastCalledWith(moved({ chorus: true }));
    press[AMOUNT]?.(0.25);
    expect(patch).toHaveBeenLastCalledWith(moved({ amount: 0.25 }));
    press[CHARACTER]?.("scatter");
    expect(patch).toHaveBeenLastCalledWith(moved({ character: "scatter" }));
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
   * The fold is a view preference and says nothing to the instrument: no command, nothing durable,
   * no history entry (plan §2). It is the one control on this section that patches nothing.
   */
  it("folds without sending anything", () => {
    const { element, patch, sent, setFolded } = menu([part()]);
    handlers(element)[FOLD]?.(true);
    expect(setFolded).toHaveBeenCalledWith(true);
    expect(patch).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();
  });

  /**
   * The gesture this list has never had. A part is moved by the handle both of the instrument's
   * other ordered lists wear, and it lands in one `deck.player` carrying the whole spec — so an
   * arrangement moved is undone, logged and replayed like any other durable edit (0062, 0089,
   * 0157). The order is read back off the store at the release rather than trusted from the press
   * (0111), which is why this case sends through a real instrument.
   */
  it("moves a part by its own handle, in one command carrying the whole spec", () => {
    const song = [part({ character: "riff" }), part({ character: "breathe" })];
    const { element, sent } = menu(song);
    const grip = labelled(element, "Reorder Yard A Song Part 1");
    grip?.onKeyDown?.({ key: "ArrowDown", preventDefault: () => {} });
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...spec(song), song: [song[1], song[0]] },
    });
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
