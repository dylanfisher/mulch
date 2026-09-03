/**
 * @role What the grid draws and sends: a column per song and a row per part with the cells a song
 *   lacks drawn empty, an added song or part minted at the gesture and picked as it lands, a cell
 *   pressed arming with one transport command and patching nothing, a pick resolved through its
 *   song, the marks every cell is mounted with, and the run a drawn pattern lays shown instead
 *   (0275, 0158, 0176).
 * @instead What the row under it sends → src/ui/PlayerGridPick.test.tsx. Where the run stands and
 *   how a row is lit → src/ui/playerLit.test.ts. What comes next → src/lib/playerNext.test.ts.
 */
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks a cell calls, made callable outside a renderer so a control's own handler can be
// pressed — the same stand-in src/ui/PlayerCard.test.tsx uses. The grid's own hooks run inside
// the render below.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
  };
});

// Over the dependency cap by the fixture: a grid is drawn off a whole spec, and a case reads the
// words and the bounds of both tiers to say what it drew. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { turns } from "@/app/persistenceDouble";
import { createInstrument, type Instrument } from "@/app/facade";
import { partVoice, type PartVoice, type PlayerSpec } from "@/lib/player";
import { CLEAR_ALL_LABEL, partBadge, PLAYER_SONG_DRAWN } from "@/lib/copy";
import { PLAYER_SONGS_LABEL } from "@/lib/copySongs";
import { tierName } from "@/lib/copyNames";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_PART_DEFAULTS, type SongPart } from "@/lib/playerSong";
import type { PlayerSong } from "@/lib/playerSongs";
import { PlayerGrid } from "@/ui/PlayerGrid";
import type { GridPick } from "@/ui/PlayerGridCell";
// oxlint-enable import/max-dependencies

let minted = 0;
const part = (over: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  name: `part-${minted}`,
  ...PLAYER_PART_DEFAULTS,
  voice: partVoice(PLAYER_DEFAULTS),
  ...over,
});
const song = (parts: readonly SongPart[], over: Partial<PlayerSong> = {}): PlayerSong => ({
  id: `song-${++minted}`,
  name: `song-${minted}`,
  plays: 1,
  parts,
  ...over,
});

/** The spec the card's dials are showing, as this section is handed it: what Add Part captures
 *  (0176). One field moved, so a case can tell a captured spec from the defaults. */
const DIALS: PartVoice = { ...partVoice(PLAYER_DEFAULTS), gate: 0.75 };

type Press = (...args: unknown[]) => void;
type Control = {
  onClick?: Press;
  onPressedChange?: Press;
  disabled?: boolean;
  "aria-label"?: string;
  children?: unknown;
  /** What a popover's trigger holds its own control in (src/ui/components/popover.tsx). */
  render?: unknown;
};

/** The components of the grid called rather than descended into, by name: each holds nothing but
 *  the hook stubbed above, so calling one is exactly writing its contents out here. */
const CALLED = new Set(["GridCell", "GridHead", "GridAddPart", "PlayerSongsClear"]);

const labelled = (element: unknown, label: string): Control => {
  // Held in a box rather than a `let`: a closure's write is not one the checker follows, and the
  // throw below would otherwise read as one on a value that cannot be null.
  const held: { found: Control | null } = { found: null };
  const walk = (node: unknown): void => {
    if (held.found !== null) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (typeof type === "function" && CALLED.has(type.name)) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    if (props["aria-label"] === label) {
      held.found = props;
      return;
    }
    walk(props.children);
    // A control a popover opens from is the element handed to its trigger's `render`, and not a
    // child of it — the same reach `findLabelled` takes (src/ui/effectRackDouble.tsx).
    walk(props.render);
  };
  walk(element);
  if (held.found === null) throw new Error(`no control labelled ${label}`);
  return held.found;
};

/**
 * The section's own element tree, built inside a render of its own — which is where its hooks
 * run: the ref the frame lights through, and the commit that paints once (src/ui/PlayerGrid.tsx).
 */
const grid = (
  songs: readonly PlayerSong[],
  pick: GridPick | null = null,
  arrange = 0,
  /** The instrument to draw against, where a case is about what a press does to a session rather
   *  than about which command it sends: given one, the patch is the card's own — a `deck.player`
   *  carrying the whole spec (src/ui/PlayerCard.tsx) — and nothing is stubbed out. */
  live: Instrument | null = null,
) => {
  const instrument = live ?? createInstrument(manualClock());
  const player: PlayerSpec = { seed: 3, ...PLAYER_DEFAULTS, songs, arrange };
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>(
    live === null
      ? undefined
      : (fields) => {
          instrument.send({ t: "deck.player", deck: "a", player: { ...player, ...fields } });
        },
  );
  const setPick = vi.fn<(pick: GridPick | null) => void>();
  const setSolo = vi.fn<(solo: string | null) => void>();
  const sent =
    live === null
      ? vi.spyOn(instrument, "send").mockImplementation(() => {})
      : vi.spyOn(instrument, "send");
  let element: ReactNode = null;
  function Probe(): null {
    element = PlayerGrid({
      instrument,
      deck: "a",
      player,
      playing: false,
      slotSecs: 1 / 16,
      voice: DIALS,
      patch,
      fold: [false, () => {}],
      pick: [pick, setPick],
      dials: [false, () => {}],
      solo: [null, setSolo],
    });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return { element, markup: renderToStaticMarkup(element), patch, setPick, setSolo, sent };
};

// One case per thing the grid draws or sends, read in order. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the launch grid", () => {
  it("draws a column per song and a row per part, with the cells a song lacks drawn empty", () => {
    const short = song([part()]);
    const long = song([part(), part(), part()]);
    const { markup } = grid([short, long]);
    expect(markup.match(/data-song="/gu)).toHaveLength(2);
    expect(markup.match(/data-part="/gu)).toHaveLength(4);
    // Two empty cells under the short song, so the columns are the same height.
    expect(markup.match(/border-dashed border-border\/50/gu)).toHaveLength(2);
    // Every cell wears both marks, lit by the frame and never by React (0070).
    expect(markup.match(/group-data-\[standing=true\]\/cell:opacity-100/gu)).toHaveLength(6);
    expect(markup.match(/group-data-\[armed=true\]\/cell:opacity-100/gu)).toHaveLength(4);
    // And the names are positional, as a locator asks for them.
    expect(markup).toContain('aria-label="Arm Yard A Song 2 Part 3"');
    expect(markup).toContain('aria-label="Select Yard A Song 1"');
    expect(markup).toContain(`>${partBadge(long.parts[2]!.id)}<`);
  });

  it("adds a song minted at the gesture and picks it, and a part into its own column", () => {
    const one = song([part()]);
    const { element, patch, setPick } = grid([one, song([])]);
    labelled(element, "Add Yard A Song").onClick?.();
    const [added] = patch.mock.calls.at(-1) ?? [];
    const third = added?.songs?.[2];
    expect(added?.songs).toHaveLength(3);
    expect(third?.name).toBe(tierName("song", third!.id));
    expect(setPick).toHaveBeenLastCalledWith({ song: third?.id, part: null });
    // A part lands in the column it was added to, carrying the dials as they stood (0176), and
    // is picked as it lands.
    labelled(element, "Add Yard A Song 2 Part").onClick?.();
    const [filled] = patch.mock.calls.at(-1) ?? [];
    const landed = filled?.songs?.[1]?.parts[0];
    expect(filled?.songs?.[0]).toEqual(one);
    expect(landed?.voice).toEqual(DIALS);
    expect(landed?.name).toBe(tierName("part", landed!.id));
    expect(setPick).toHaveBeenLastCalledWith({ song: filled?.songs?.[1]?.id, part: landed?.id });
  });

  it("arms a cell with one transport command and patches nothing", () => {
    const held = part();
    const one = song([held]);
    const { element, patch, sent } = grid([one]);
    labelled(element, "Arm Yard A Song 1 Part 1").onClick?.();
    expect(sent).toHaveBeenLastCalledWith({ t: "deck.playerArm", deck: "a", part: held.id });
    expect(patch).not.toHaveBeenCalled();
    // Refused on a part the walk passes over and on a song that plays no times: the pass would
    // refuse both, and a control that vanished would say nothing (0121).
    const skipped = part({ skip: true });
    const quiet = grid([song([skipped]), song([part()], { plays: 0 })]);
    expect(labelled(quiet.element, "Arm Yard A Song 1 Part 1").disabled).toBe(true);
    expect(labelled(quiet.element, "Arm Yard A Song 2 Part 1").disabled).toBe(true);
  });

  it("picks a cell or a column head for the row under the grid, and lets go of either", () => {
    const held = part();
    const one = song([held]);
    const { element, setPick, sent } = grid([one]);
    labelled(element, "Select Yard A Song 1 Part 1").onPressedChange?.(true);
    expect(setPick).toHaveBeenLastCalledWith({ song: one.id, part: held.id });
    labelled(element, "Select Yard A Song 1").onPressedChange?.(true);
    expect(setPick).toHaveBeenLastCalledWith({ song: one.id, part: null });
    labelled(element, "Select Yard A Song 1").onPressedChange?.(false);
    expect(setPick).toHaveBeenLastCalledWith(null);
    expect(sent).not.toHaveBeenCalled();
    // A picked part draws its row under the grid, in the hand's ink and never the walk's (0172).
    const picked = grid([one], { song: one.id, part: held.id });
    expect(picked.markup).toContain('aria-label="Name Yard A Song 1 Part 1"');
    expect(picked.markup.match(/bg-foreground\/10/gu)).toHaveLength(1);
    // A pick naming what the run no longer holds is no pick, and draws no row.
    const stale = grid([one], { song: "gone", part: held.id });
    expect(stale.markup).not.toContain('aria-label="Name Yard A Song 1"');
  });

  /** The one gesture on the heading that is about the run rather than about a song, asked first
   *  the way the rack's own clear is (src/ui/EffectRack.test.tsx). */
  it("offers the run's own clear only while a song stands, and asks before it empties it", () => {
    const named = `${CLEAR_ALL_LABEL} ${PLAYER_SONGS_LABEL} on Yard A`;
    const { element, patch, setPick, sent } = grid([song([part()]), song([])]);
    // The trigger carries no command at all: the confirmation, which says how many are going, is
    // what sends it.
    expect(labelled(element, named).onClick).toBeUndefined();
    expect(patch).not.toHaveBeenCalled();
    labelled(element, `Confirm ${named}`).onClick?.();
    expect(patch).toHaveBeenCalledExactlyOnceWith({ songs: [] });
    // The gesture is closed on both sides of the edit, so a song edit inside the idle window
    // cannot swallow it from either (src/app/history.ts), and the pick goes with what it named.
    expect(sent.mock.calls.flat()).toEqual([{ t: "gesture.end" }, { t: "gesture.end" }]);
    expect(setPick).toHaveBeenLastCalledWith(null);
    // A word over an empty list is a control that does nothing, so it is not there (P73).
    const empty = grid([]);
    expect(empty.markup).not.toContain(CLEAR_ALL_LABEL);
    expect(() => labelled(empty.element, named)).toThrow();
    // Nor over the run the pattern drew for itself: the written list is held and not shown then,
    // so the press would take columns nothing on screen says are there (0158).
    const drawn = grid([song([part()])], null, 2);
    expect(drawn.markup).not.toContain(CLEAR_ALL_LABEL);
    expect(() => labelled(drawn.element, named)).toThrow();
  });

  it("empties the run as one entry, even inside a song edit's own idle window", async () => {
    // The silent graph, because a pattern is held only where there is a host to hand it to
    // (src/app/refusals.ts, src/app/engineDouble.ts).
    const instrument = createInstrument(manualClock(), () => silentEngine());
    // A yard with nothing loaded holds no pattern at all, so there is something to jump around
    // before there is a run to empty (src/app/deckPlayer.ts).
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine" } });
    await turns();
    const one = song([part()]);
    const { element, patch } = grid([one], null, 0, instrument);
    // A song renamed, which is a `deck.player` keyed by the deck alone: the clear that follows it
    // inside `GESTURE_IDLE_MS` would fold into this entry without the gesture's end.
    patch({ songs: [{ ...one, name: "Out" }] });
    await turns();
    labelled(element, `Confirm ${CLEAR_ALL_LABEL} ${PLAYER_SONGS_LABEL} on Yard A`).onClick?.();
    await turns();
    expect(instrument.probe().decks.a?.player?.songs).toEqual([]);
    // And the gesture is closed behind the press as well as in front of it: a song added inside
    // the same idle window is its own entry, so the first undo is that song and not the run.
    patch({ songs: [{ ...one, name: "Back" }] });
    await turns();
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a?.player?.songs).toEqual([]);
    // One undo more, and the run a hand had is back — with the rename it was given, not without it.
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a?.player?.songs.map((each) => each.name)).toEqual(["Out"]);
  });

  it("shows the run the pattern drew rather than the grid a hand wrote", () => {
    const { markup } = grid([song([part()])], null, 2);
    expect(markup).toContain(PLAYER_SONG_DRAWN);
    expect(markup).not.toContain("data-part=");
  });
});
