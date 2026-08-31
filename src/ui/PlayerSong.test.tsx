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
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks a row calls, made callable outside a renderer so a control's own handler can be
// pressed — the same stand-in src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    // And the memo beside it, for the same reason: a row called outside a renderer has no hook
    // dispatcher, and what `useMemo` is *for* here is identity across renders there are none of.
    useMemo: (factory: () => unknown) => factory(),
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { partVoice, playerVoice, type PartVoice, type PlayerSpec } from "@/lib/player";
import { copyName, partBadge, PLAYER_PART_NAME_LABEL, PLAYER_SONG_DRAWN } from "@/lib/copy";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import {
  PLAYER_PART_DEFAULTS,
  PLAYER_SONG_MAX,
  type SongPart,
  type SongPartId,
} from "@/lib/playerSong";
import { albumsParts, oneAlbum } from "@/lib/playerAlbum";
import type { PlayerStep } from "@/lib/playerWalk";
import { ROW_LEFT, ROW_LEFT_SLOT } from "@/ui/PlayerPart";
import { ALBUM_ATTRIBUTE } from "@/ui/PlayerAlbum";
import { litRows, PlayerSong, standingIn } from "@/ui/PlayerSong";

/** And what a gesture actually patched, read back through the tiers it was sent inside. */
const patched = (fields: Partial<PlayerSpec> | undefined): readonly SongPart[] =>
  albumsParts(fields?.albums ?? []);

const spec = (song: readonly SongPart[], arrange = 0): PlayerSpec => ({
  seed: 3,
  ...PLAYER_DEFAULTS,
  albums: oneAlbum(song),
  arrange,
});

/** A part, with the opaque id every one now carries: minted at the gesture that adds one, so a
 *  test that wants two parts alike in every field still has two things (0076, 0157). */
let minted = 0;
const part = (over: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  name: `part-${minted}`,
  ...PLAYER_PART_DEFAULTS,
  voice: partVoice(PLAYER_DEFAULTS),
  ...over,
});

/** The spec the card's dials are showing, as this section is handed it: what Add Part captures
 *  (0176). One field moved, so a case can tell a captured spec from the defaults. */
const DIALS: PartVoice = { ...partVoice(PLAYER_DEFAULTS), gate: 0.75 };

/**
 * One step of a walk standing four jumps from the end of its part, fourteen from the end of the
 * song round and forty-four from the end of the album round — two seconds of landing and, at the
 * half-second slot every case here reads, one of wait, so a jump of it is three seconds.
 */
const STANDING: PlayerStep = {
  slot: 0,
  bed: 0,
  repeats: 2,
  burst: 1,
  rest: 2,
  rates: [1, 1],
  ratchet: 0,
  dropped: false,
  reversed: false,
  sparked: null,
  gate: 1,
  part: "part-9",
  voice: null,
  song: null,
  place: {
    album: "album-1",
    albumPlay: 0,
    song: "song-1",
    songPlay: 0,
    partLeft: 4,
    songLeft: 14,
    albumLeft: 44,
  },
};

/**
 * One row as the frame reads and writes it: the id it is keyed by, the standing mark written onto
 * it, and the one span the countdown goes into — hand-built for the reason a card is in
 * src/ui/listDrag.test.ts, since a painting is DOM and this suite renders to a string. The clock
 * counts its own writes, because writing a `textContent` that already matches is the thing 0070
 * forbids.
 */
const rowAt = (attribute: string, id: string) => {
  const clock = {
    said: "stale",
    writes: 0,
    get textContent(): string {
      return this.said;
    },
    set textContent(next: string) {
      this.said = next;
      this.writes++;
    },
  };
  const row = {
    dataset: {} as Record<string, string>,
    getAttribute: (name: string): string | null => (name === attribute ? id : null),
    querySelector: (): typeof clock => clock,
  };
  return { row, clock };
};

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
  onKeyDown?: (event: {
    key: string;
    preventDefault?: () => void;
    currentTarget?: { blur: () => void };
  }) => void;
  onBlur?: (event: { currentTarget: { value: string } }) => void;
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
  /** One slot of a one-second loop, which is what turns the jumps a row has left into seconds
   *  (`slotSecsOf`, src/ui/PlayerScope.tsx). */
  const slotSecs = 1 / 16;
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
  const setOpened = vi.fn<(open: SongPartId | null) => void>();
  const setSolo = vi.fn<(solo: SongPartId | null) => void>();
  const sent = vi.spyOn(instrument, "send");
  let element: ReactNode = null;
  function Probe(): null {
    element = PlayerSong({
      instrument,
      deck: "a",
      player: spec(song, arrange),
      playing,
      slotSecs,
      voice: DIALS,
      patch,
      fold: [false, setFolded],
      select: [selected, setSelected],
      open: [null, setOpened],
      solo: [null, setSolo],
      // The lists over the parts open on the first of each, which is what a null view reads as
      // (P147, `openIn`).
      album: [null, () => {}],
      songView: [null, () => {}],
    });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return { element, patch, sent, setFolded, setSelected, setOpened, setSolo, instrument };
};

/**
 * Where a row's controls sit among the handlers, in the order the row draws them: the press that
 * points the card's dials at it, the fold that opens its own dials, how long it lasts, and its
 * actions — the die that fills it with a character among them (0189, src/ui/PlayerPart.tsx). The
 * character menu beside that die puts no handler on the row: its presses are inside a popover of
 * its own, which is where src/ui/PlayerCharacter.test.tsx asks about them.
 */
const FOLD = 0;
const SELECT = 1;
const OPEN = 2;
const LENGTH = 3;
const REDRAW = 4;
const DUPLICATE = 5;
const SKIP = 6;
const AUDITION = 7;
const REMOVE = 8;

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
    expect(patched(sentSong)).toHaveLength(1);
    const [added] = patched(sentSong);
    expect(added).toMatchObject(PLAYER_PART_DEFAULTS);
    expect(added?.voice).toEqual(DIALS);
    expect(added?.id.length).toBeGreaterThan(0);
    // And it is called its own badge, because a part is never nameless: `assertDurableText`
    // refuses the empty string, so the mint has to write one (principle 5, P134).
    expect(added?.name).toBe(partBadge(added!.id));
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
    const moved = (fields: Partial<SongPart>) => ({
      albums: oneAlbum([{ ...song[0]!, ...fields }, song[1]!]),
    });
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

  /**
   * Copying one: a fresh id, because identity is the one thing a copy may not take (0092), and the
   * name it was taken from with the marker saying it is a second one. It lands directly after the
   * part it was copied from, and it is one command carrying the whole list like every other
   * gesture here (0089).
   */
  it("copies a part with an id of its own, directly after it, in one command", () => {
    const song = [part({ name: "Riff" }), part()];
    const { element, patch } = menu(song);
    handlers(element)[DUPLICATE]?.();
    const [sent] = patch.mock.calls[0] ?? [];
    expect(patched(sent)).toHaveLength(3);
    const [, copy] = patched(sent);
    expect(copy?.id).not.toBe(song[0]?.id);
    expect(copy?.name).toBe(copyName("Riff"));
    expect({ ...copy, id: song[0]?.id, name: song[0]?.name }).toEqual(song[0]);
    expect(patched(sent)[2]).toBe(song[1]);
  });

  /**
   * Rolling the die on one: a whole character into that part's voice, sent as the whole song in one
   * `deck.player` like every other edit here — the part beside it untouched, and its name, its
   * length and the seed left exactly where they were (0089, 0189).
   */
  it("rolls a character into one part, as the whole song in one command", () => {
    const song = [part({ name: "Riff" }), part()];
    const { element, patch } = menu(song);
    handlers(element)[REDRAW]?.();
    const [sent] = patch.mock.calls[0] ?? [];
    const [rolled, other] = patched(sent);
    expect(other).toBe(song[1]);
    expect({ ...rolled, voice: song[0]?.voice }).toEqual(song[0]);
    expect(rolled?.voice).not.toEqual(song[0]?.voice);
  });

  /**
   * Skipping one keeps it in the list and takes it out of the run, and it is a durable edit like
   * any other: the whole song, in one `deck.player` (0089).
   */
  it("skips a part by patching the whole song with that one field moved", () => {
    const song = [part(), part()];
    const { element, patch } = menu(song);
    handlers(element)[SKIP]?.(true);
    expect(patch).toHaveBeenLastCalledWith({
      albums: oneAlbum([{ ...song[0]!, skip: true }, song[1]!]),
    });
  });

  /**
   * Auditioning one is the section's one gesture that is not a `deck.player`: the pass plays that
   * part on its own for as long as the toggle is held, and nothing durable moves — so it is sent
   * straight and patches nothing, on the terms a seek is transport (0041, 0190). The yard is told
   * beside the instrument, because the toggle's own pressed state is that same fact.
   */
  it("solos a part with one transport command, and patches nothing", () => {
    const song = [part(), part()];
    const { element, patch, sent, setSolo } = menu(song);
    handlers(element)[AUDITION]?.(true);
    expect(sent).toHaveBeenCalledWith({ t: "deck.playerSolo", deck: "a", part: song[0]?.id });
    expect(setSolo).toHaveBeenCalledWith(song[0]?.id);
    handlers(element)[AUDITION]?.(false);
    expect(sent).toHaveBeenLastCalledWith({ t: "deck.playerSolo", deck: "a", part: null });
    expect(setSolo).toHaveBeenLastCalledWith(null);
    expect(patch).not.toHaveBeenCalled();
  });

  /**
   * And the name, committed on Enter and never per keystroke — as one whole spec, like every other
   * edit on this row (0024, 0089). An emptied field puts the badge back rather than committing
   * nothing: `assertDurableText` refuses the empty string, so "no name" is not a state a part can
   * be in (principle 5).
   */
  it("commits a typed name as one whole spec, and an emptied one as the badge", () => {
    const song = [part({ name: "Riff" }), part()];
    const named = `${PLAYER_PART_NAME_LABEL} Yard A Song Part 1`;
    const { element, patch } = menu(song);
    const field = labelled(element, named);
    // Enter leaves the field and leaving it is what commits, so one deliberate gesture is one
    // durable edit rather than two — and the field, keyed on the stored name, is not remounted
    // under the caret by its own commit (0024).
    const blur = vi.fn<() => void>();
    field?.onKeyDown?.({ key: "Enter", currentTarget: { blur } });
    expect(blur).toHaveBeenCalledTimes(1);
    expect(patch).not.toHaveBeenCalled();
    field?.onBlur?.({ currentTarget: { value: "  Break  " } });
    expect(patch).toHaveBeenLastCalledWith({
      albums: oneAlbum([{ ...song[0]!, name: "Break" }, song[1]!]),
    });
    const blank = menu(song);
    labelled(blank.element, named)?.onBlur?.({ currentTarget: { value: "   " } });
    expect(blank.patch).toHaveBeenLastCalledWith({
      albums: oneAlbum([{ ...song[0]!, name: partBadge(song[0]!.id) }, song[1]!]),
    });
  });

  /**
   * Opening a part's own dials sends nothing at all: it is a view preference held by the yard, on
   * exactly the terms the selection beside it is held on (plan §2, 0176).
   */
  it("opens a part's own dials without sending anything", () => {
    const song = [part()];
    const { element, patch, sent, setOpened } = menu(song);
    handlers(element)[OPEN]?.(true);
    expect(setOpened).toHaveBeenCalledWith(song[0]?.id);
    expect(patch).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();
  });

  it("takes a part away by the place it stands in, and leaves the rest in order", () => {
    const song = [part(), part(), part()];
    const { element, patch } = menu(song);
    handlers(element)[REMOVE]?.();
    expect(patch).toHaveBeenCalledWith({ albums: oneAlbum([song[1]!, song[2]!]) });
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
      player: { ...spec(song), albums: oneAlbum([song[1]!, song[0]!]) },
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
   * An arrangement the pattern drew for itself lights in the ink the written one does, or a walk
   * reads as two different things depending on who wrote the run it is walking (0158, 0172). Which
   * ink that is, and that no control on the row wears it, is the row's own case
   * (src/ui/PlayerPart.test.tsx).
   */
  it("lights a drawn run's rows in the ink a written part's row wears", () => {
    const ink = (song: readonly SongPart[], arrange: number): string | undefined =>
      /data-\[standing=true\]:bg-([\w./-]+)/u.exec(
        renderToStaticMarkup(menu(song, false, arrange).element),
      )?.[1];
    const written = ink([part()], 0);
    expect(written).toBeDefined();
    expect(ink([part(), part()], 3)).toBe(written);
  });

  /**
   * Every row of the three tiers wears a play mark and a countdown, and it wears them in slots the
   * row is mounted with whether or not anything is standing in it — the rule `GrownRows` already
   * keeps for the automator's own places, for its reason: a run arriving may not move the page
   * under it (0070). Reserved as well as mounted, so the clock filling has no width to take.
   */
  it("mounts a play mark and a countdown on every row, standing or not", () => {
    const drawn = renderToStaticMarkup(menu([part(), part()]).element);
    // One album row, one song row and two part rows, none of them standing: a static render is a
    // stopped yard, and the slots are all there anyway.
    expect(drawn.match(new RegExp(`data-slot="${ROW_LEFT_SLOT}"`, "gu"))).toHaveLength(4);
    expect(drawn.match(/group-data-\[standing=true\]\/row:opacity-100/gu)).toHaveLength(4);
    // Empty, and holding its column while it is: the countdown is a width the row already has.
    expect(ROW_LEFT).toMatch(/(?:^|\s)w-\d/u);
    expect(drawn).toContain(`class="${ROW_LEFT}"></span>`);
  });

  /**
   * And what the frame writes into them: where the run stands, off the step the clock is inside
   * rather than off the list, and how long each of the three rows it is standing in has left — the
   * jumps still to come at the length the standing landing lasts, in the words a countdown is
   * already said in (0157, 0180, `growthLeft`).
   */
  it("says where the run stands and how long each row it is standing in has left", () => {
    expect(standingIn(STANDING, 1 / 2)).toEqual({
      album: "album-1",
      song: "song-1",
      part: "part-9",
      partLeft: "12s left",
      songLeft: "42s left",
      albumLeft: "2m 12s left",
    });
    // And priced off the dials and not off what they drew: the standing part's own numbers say a
    // two-second landing and no wait, so the same four jumps read eight seconds however far the
    // roll strayed the burst on the step itself.
    const dials = playerVoice({ ...spec([]), burst: 2, repeats: 1, ratchet: 0, rest: 0 });
    expect(standingIn({ ...STANDING, voice: dials }, 1 / 2).partLeft).toBe("8s left");
    // A yard whose loop has no grid has no seconds to say and says none, which is the answer the
    // picture above it already gives by not being there (0159).
    expect(standingIn(STANDING, null)).toMatchObject({
      album: "album-1",
      partLeft: "",
      songLeft: "",
      albumLeft: "",
    });
    // And a stopped yard is standing nowhere at all.
    expect(standingIn(null, 1 / 2)).toEqual({
      album: null,
      song: null,
      part: null,
      partLeft: "",
      songLeft: "",
      albumLeft: "",
    });
  });

  /**
   * And what the painting does with that: the row the run is standing in wears the mark and the
   * words, every other row of its tier is cleared rather than left saying what it last said, and a
   * row that already says the right thing is not written to at all — a `textContent` replaces the
   * node's children whether or not the string matches (0070).
   */
  it("lights the row the run is standing in, and clears the one it has left", () => {
    const here = rowAt(ALBUM_ATTRIBUTE, "album-1");
    const gone = rowAt(ALBUM_ATTRIBUTE, "album-2");
    const section = { querySelectorAll: () => [here.row, gone.row] };
    // The frame walks elements; this suite builds the two fields it touches and nothing else.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const held = section as unknown as HTMLElement;
    litRows(held, ALBUM_ATTRIBUTE, "album-1", "12s left");
    expect(here.row.dataset["standing"]).toBe("true");
    expect(here.clock.textContent).toBe("12s left");
    expect(gone.row.dataset["standing"]).toBe("false");
    expect(gone.clock.textContent).toBe("");
    // The same answer again writes nothing: one write for the words, one for the clearing.
    litRows(held, ALBUM_ATTRIBUTE, "album-1", "12s left");
    expect(here.clock.writes).toBe(1);
    expect(gone.clock.writes).toBe(1);
    // And a stopped yard is standing in no album, so the row that was lit is cleared too.
    litRows(held, ALBUM_ATTRIBUTE, null, "");
    expect(here.row.dataset["standing"]).toBe("false");
    expect(here.clock.textContent).toBe("");
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
});
