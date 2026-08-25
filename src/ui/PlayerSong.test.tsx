/**
 * @role What the song section sends: every gesture patches the whole list rather than one part of
 *   it, an added part carries the spec the card's dials were showing, a part moved is one
 *   `deck.player` carrying the whole spec, and the ceiling on how many parts a song holds is
 *   refused at the control rather than left to the validator (0176, 0089, 0157) — and that a pattern drawing its own arrangement
 *   shows that run here instead, with nothing on it a gesture can edit (0158). And two things the
 *   section has to be readable at a glance for: an empty song's sentence runs the width of the
 *   section it is the only content of, and the row a walk is standing on is lit in an ink no
 *   control on that row is filled with — and in one the row a hand has selected is not (0172,
 *   0176).
 */
// Two over the dependency cap, and both are the standing row's own case: the toggle's variants,
// because the ink a pressed control wears is read off the primitive rather than copied here, and
// `node:fs`, because the value behind a token is only in the one file that declares it. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the line cap: this file is one case per gesture the section offers and two more for the
// inks its rows are lit in, so its length is that surface's rather than a judgement of its own —
// the same waiver the component it renders carries. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { readFileSync } from "node:fs";

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
import { partVoice, type PartVoice, type PlayerSpec } from "@/lib/player";
import { PLAYER_SONG_DRAWN } from "@/lib/copy";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import {
  PLAYER_PART_DEFAULTS,
  PLAYER_SONG_MAX,
  type SongPart,
  type SongPartId,
} from "@/lib/playerSong";
import { toggleVariants } from "@/ui/components/toggle";
import { PlayerSong } from "@/ui/PlayerSong";

/** One row's own class list, off the attribute it carries the part it draws under. */
const row = (markup: string): string =>
  /data-part="[^"]*" class="([^"]*)"/u.exec(markup)?.[1] ?? "";

/** What a colour token is declared as, read out of the one file every colour in the instrument is
 *  declared in (boundaries.md). Two utilities naming two tokens are two inks only if the tokens
 *  are two values, which is the whole of what the standing row's case below asserts. */
const tokenValue = (token: string): string => {
  const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
  const found = new RegExp(`^\\s*--${token}:([^;]+);`, "mu").exec(css);
  if (found === null) throw new Error(`No --${token} declared in tokens.css.`);
  return found[1]!.trim();
};

const spec = (song: readonly SongPart[], arrange = 0): PlayerSpec => ({
  seed: 3,
  ...PLAYER_DEFAULTS,
  song,
  arrange,
});

/** A part, with the opaque id every one now carries: minted at the gesture that adds one, so a
 *  test that wants two parts alike in every field still has two things (0076, 0157). */
let minted = 0;
const part = (over: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  ...PLAYER_PART_DEFAULTS,
  voice: partVoice(PLAYER_DEFAULTS),
  ...over,
});

/** The spec the card's dials are showing, as this section is handed it: what Add Part captures
 *  (0176). One field moved, so a case can tell a captured spec from the defaults. */
const DIALS: PartVoice = { ...partVoice(PLAYER_DEFAULTS), gate: 0.75 };

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
const menu = (
  song: readonly SongPart[],
  playing = false,
  arrange = 0,
  selected: SongPartId | null = null,
) => {
  const instrument = createInstrument(manualClock());
  // The store as the session would hold it. Stubbed rather than sent, because `deck.player` is
  // refused for a deck with nothing loaded and no engine to hold it (src/app/execute.ts) — what
  // this file is about is the section reading the arrangement back at the release rather than
  // trusting the press (0111).
  const held = instrument.state.getState();
  vi.spyOn(instrument.state, "getState").mockReturnValue({
    ...held,
    decks: { ...held.decks, a: { ...held.decks.a!, player: spec(song, arrange) } },
  });
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const setFolded = vi.fn<(folded: boolean) => void>();
  const setSelected = vi.fn<(selected: SongPartId | null) => void>();
  const sent = vi.spyOn(instrument, "send");
  let element: ReactNode = null;
  function Probe(): null {
    element = PlayerSong({
      instrument,
      deck: "a",
      player: spec(song, arrange),
      playing,
      voice: DIALS,
      patch,
      fold: [false, setFolded],
      select: [selected, setSelected],
    });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return { element, patch, sent, setFolded, setSelected, instrument };
};

/**
 * Where a row's three controls sit among the handlers, in the order the row draws them: the press
 * that points the card's dials at it, how long it lasts, and the press that takes it away
 * (src/ui/PlayerSong.tsx).
 */
const FOLD = 0;
const SELECT = 1;
const LENGTH = 2;
const REMOVE = 3;

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
    // The id is minted at the gesture, so what is sent is the defaults with one of its own — and
    // the spec the card's dials were showing at that gesture, which is the whole of what makes a
    // part "this pattern, exactly as it stands right now" (0176).
    const [sentSong] = patch.mock.calls[0] ?? [];
    expect(sentSong?.song).toHaveLength(1);
    const [added] = sentSong?.song ?? [];
    expect(added).toMatchObject(PLAYER_PART_DEFAULTS);
    expect(added?.voice).toEqual(DIALS);
    expect(added?.id.length).toBeGreaterThan(0);
  });

  /**
   * Every gesture patches the whole list: `song` is one durable field, and a part edited in place
   * would be half a record reaching the instrument (0089).
   */
  it("patches the whole song with one part moved", () => {
    const song = [part(), part({ length: 4 })];
    const { element, patch } = menu(song);
    const press = handlers(element);
    // Each expectation is the very part that was edited, with one field moved: a part's id is its
    // own and no gesture on this row may mint a second one (0157).
    const moved = (fields: Partial<SongPart>) => ({ song: [{ ...song[0]!, ...fields }, song[1]] });
    press[LENGTH]?.(12.4);
    expect(patch).toHaveBeenLastCalledWith(moved({ length: 12 }));
  });

  /**
   * The one gesture on this row that sends nothing: which part the card's dials are pointed at is
   * a view preference, held by the yard the way both folds are — no command, nothing durable, no
   * history entry (plan §2, 0176). Pressing a second part's badge moves the dials rather than
   * adding to a set, and pressing the standing one again takes them off it.
   */
  it("points the dials at a part without sending anything", () => {
    const song = [part(), part()];
    const { element, patch, sent, setSelected } = menu(song);
    handlers(element)[SELECT]?.(true);
    expect(setSelected).toHaveBeenCalledWith(song[0]?.id);
    expect(patch).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();
    const held = menu(song, false, 0, song[0]?.id ?? null);
    handlers(held.element)[SELECT]?.(false);
    expect(held.setSelected).toHaveBeenCalledWith(null);
  });

  it("takes a part away by the place it stands in, and leaves the rest in order", () => {
    const song = [part(), part(), part()];
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
    const song = [part(), part()];
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

  /**
   * Which author is live is a rule and not a second field: while the pattern is drawing its own
   * arrangement, this section shows that run rather than the list a hand wrote, and every gesture
   * that would edit one is gone or refused — the written list is held, untouched, and comes back
   * the moment the Arrange dial goes to zero (0158).
   */
  it("shows the run the pattern drew rather than the list a hand wrote", () => {
    const written = [part(), part()];
    const { element } = menu(written, false, 3);
    // The fold and the add, and not one of the three controls a written part carries.
    expect(handlers(element)).toHaveLength(2);
    expect(refused(element)).toBe(true);
    // One row per part the arrangement is a run of, filled in by the frames rather than by React.
    const markup = renderToStaticMarkup(element);
    expect(markup.match(/data-drawn="/gu)).toHaveLength(3);
    expect(markup).toContain(PLAYER_SONG_DRAWN);
  });

  /**
   * The one thing an empty song draws is prose, and it is the only content of a full-width
   * section: capped at a column it left the rest of the section blank beside it, which reads as a
   * layout that failed rather than as a sentence (P129).
   */
  it("runs the empty song's sentence the width of the section", () => {
    const [, drawn] = /<p class="([^"]*)"/u.exec(renderToStaticMarkup(menu([]).element)) ?? [];
    expect(drawn).toContain("w-full");
    expect(drawn).not.toMatch(/max-w-/u);
  });

  /**
   * The row a walk is standing on is lit in an ink no control on it is filled with. `accent` and
   * `muted` are one value in both schemes, so the one control on the row whose whole job is to be
   * read at a glance — the chorus toggle then, the Select toggle now — went invisible on exactly
   * the row where reading it matters (0172, 0176). Asserted against the declared tokens rather than against the class names,
   * because the class names never agreed: the values did. Both lists are read: an arrangement the
   * pattern drew for itself lights in the ink the written one does, or a walk reads as two
   * different things depending on who wrote the run it is walking (0158, 0172).
   */
  it("lights the standing row in an ink no pressed control wears", () => {
    const ink = (song: readonly SongPart[], arrange: number): string | undefined => {
      const markup = renderToStaticMarkup(menu(song, false, arrange).element);
      return /data-\[standing=true\]:bg-([\w./-]+)/u.exec(markup)?.[1];
    };
    const standing = ink([part()], 0);
    expect(standing).toBeDefined();
    expect(ink([part(), part()], 3)).toBe(standing);
    const pressed = [
      ...toggleVariants({ variant: "outline", size: "sm" }).matchAll(
        /(?:aria-pressed|data-\[state=on\]):bg-([a-z-]+)/gu,
      ),
    ].map(([, token]) => token!);
    expect(pressed.length).toBeGreaterThan(0);
    for (const token of pressed) {
      expect(tokenValue(token)).not.toBe(tokenValue(standing!.split("/")[0]!));
    }
  });

  /**
   * And the row a hand has pointed the card's dials at is lit in neither of those: what the walk's
   * ink says is that a part is *playing*, and what this one says is that the dials above are that
   * part's, so a surface drawing the two the same would report the wrong one of them (0172, 0176).
   * The hand's mark wins where both are true — a selected row draws no standing variant at all —
   * because what a selected row is for is the dials, and the walk moves on by itself.
   */
  it("lights the selected row in an ink that is neither the standing one nor a control's", () => {
    const song = [part()];
    const held = song[0]!.id;
    const walked = row(renderToStaticMarkup(menu(song).element));
    const picked = row(renderToStaticMarkup(menu(song, false, 0, held).element));
    const standing = /data-\[standing=true\]:bg-([\w./-]+)/u.exec(walked)?.[1];
    const selected = /(?:^|\s)bg-([\w./-]+)/u.exec(picked)?.[1];
    expect(standing).toBeDefined();
    expect(selected).toBeDefined();
    expect(picked).not.toContain("data-[standing=true]:bg-");
    expect(tokenValue(selected!.split("/")[0]!)).not.toBe(tokenValue(standing!.split("/")[0]!));
    const pressed = [
      ...toggleVariants({ variant: "outline", size: "sm" }).matchAll(
        /(?:aria-pressed|data-\[state=on\]):bg-([a-z-]+)/gu,
      ),
    ].map(([, token]) => token!);
    for (const token of pressed) {
      expect(tokenValue(token)).not.toBe(tokenValue(selected!.split("/")[0]!));
    }
  });
});
