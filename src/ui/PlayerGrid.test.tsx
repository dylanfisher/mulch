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
import { createInstrument } from "@/app/facade";
import { partVoice, type PartVoice, type PlayerSpec } from "@/lib/player";
import { partBadge, PLAYER_SONG_DRAWN } from "@/lib/copy";
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
};

/** The components of the grid called rather than descended into, by name: each holds nothing but
 *  the hook stubbed above, so calling one is exactly writing its contents out here. */
const CALLED = new Set(["GridCell", "GridHead", "GridAddPart"]);

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
  };
  walk(element);
  if (held.found === null) throw new Error(`no control labelled ${label}`);
  return held.found;
};

/**
 * The section's own element tree, built inside a render of its own — which is where its hooks
 * run: the ref the frame lights through, and the commit that paints once (src/ui/PlayerGrid.tsx).
 */
const grid = (songs: readonly PlayerSong[], pick: GridPick | null = null, arrange = 0) => {
  const instrument = createInstrument(manualClock());
  const player: PlayerSpec = { seed: 3, ...PLAYER_DEFAULTS, songs, arrange };
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const setPick = vi.fn<(pick: GridPick | null) => void>();
  const setSolo = vi.fn<(solo: string | null) => void>();
  const sent = vi.spyOn(instrument, "send").mockImplementation(() => {});
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

  it("shows the run the pattern drew rather than the grid a hand wrote", () => {
    const { markup } = grid([song([part()])], null, 2);
    expect(markup).toContain(PLAYER_SONG_DRAWN);
    expect(markup).not.toContain("data-part=");
  });
});
