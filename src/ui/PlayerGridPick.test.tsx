/**
 * @role What the row under the grid sends: every gesture on the song and on the part patches the
 *   whole list rather than one field of it, a copy carries a fresh id and moves the pick onto
 *   itself, a move is refused at either end, the audition sends the one transport command and
 *   patches nothing, and the fold opens the part's own dials named after the part (0089, 0092,
 *   0121, 0176, 0190).
 * @instead What the grid around it sends — add, arm, pick — and how it lights → src/ui/PlayerGrid.test.tsx.
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks the row calls, made callable outside a renderer so a control's own handler can be
// pressed — the same stand-in src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
  };
});

import { partVoice, type PlayerSpec } from "@/lib/player";
import { copyName } from "@/lib/copy";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_PART_DEFAULTS, PLAYER_SONG_MAX, type SongPart } from "@/lib/playerSong";
import type { PlayerSong } from "@/lib/playerSongs";
import type { GridPick } from "@/ui/PlayerGridCell";
import { PlayerGridPick } from "@/ui/PlayerGridPick";

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

/** Whatever a control's own handler takes — this row's job is which spec it patches. */
type Press = (...args: unknown[]) => void;
type Control = {
  onClick?: Press;
  onPressedChange?: Press;
  onChange?: Press;
  onBlur?: (event: { currentTarget: { value: string } }) => void;
  disabled?: boolean;
  "aria-label"?: string;
  /** What a dial is named by: the knob draws its own label off this (src/ui/Knob.tsx). */
  name?: string;
  children?: unknown;
};

/** The components of this row called rather than descended into, by name: each holds nothing
 *  but the two hooks stubbed above, so calling one is exactly writing its contents out here. */
const CALLED = new Set(["NameField", "Nudge"]);

/** One control of the row, by the name it wears. */
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
    if (props["aria-label"] === label || props.name === label) {
      held.found = props;
      return;
    }
    walk(props.children);
  };
  walk(element);
  if (held.found === null) throw new Error(`no control labelled ${label}`);
  return held.found;
};

const row = (songs: readonly PlayerSong[], pick: GridPick, soloed = false) => {
  const player: PlayerSpec = { seed: 3, ...PLAYER_DEFAULTS, songs };
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const onPick = vi.fn<(pick: GridPick | null) => void>();
  const onAudition = vi.fn<(part: string, soloed: boolean) => void>();
  const setOpen = vi.fn<(open: boolean) => void>();
  const songAt = songs.findIndex((held) => held.id === pick.song);
  const held = songs[songAt]!;
  const partAt = held.parts.findIndex((each) => each.id === pick.part);
  const element = PlayerGridPick({
    deck: "a",
    named: "Yard A Song",
    player,
    songAt,
    song: held,
    partAt,
    part: held.parts[partAt],
    soloed,
    dials: [false, setOpen],
    patch,
    onPick,
    onAudition,
  });
  return { element, patch, onPick, onAudition, setOpen, player };
};

// One case per gesture the two tiers offer, read in order: the length is the count of them. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the row under the grid", () => {
  it("patches the whole run with one song's field moved, and moves a song along it", () => {
    const [one, two] = [song([part()]), song([])];
    const { element, patch } = row([one, two], { song: two.id, part: null });
    labelled(element, "Yard A Song 2 Plays").onChange?.(3.4);
    expect(patch).toHaveBeenLastCalledWith({ songs: [one, { ...two, plays: 3 }] });
    labelled(element, "Name Yard A Song 2").onBlur?.({ currentTarget: { value: "  Out " } });
    expect(patch).toHaveBeenLastCalledWith({ songs: [one, { ...two, name: "Out" }] });
    labelled(element, "Earlier Yard A Song 2").onClick?.();
    expect(patch).toHaveBeenLastCalledWith({ songs: [two, one] });
    // Refused at the end of the run rather than sent as nothing (0121).
    expect(labelled(element, "Later Yard A Song 2").disabled).toBe(true);
  });

  it("copies a song with ids of its own and picks the copy, and takes one away and picks nothing", () => {
    const one = song([part()]);
    const { element, patch, onPick } = row([one], { song: one.id, part: null });
    labelled(element, "Duplicate Yard A Song 1").onClick?.();
    const [copied] = patch.mock.calls.at(-1) ?? [];
    const copy = copied?.songs?.[1];
    expect(copied?.songs).toHaveLength(2);
    expect(copy?.id).not.toBe(one.id);
    expect(copy?.name).toBe(copyName(one.name));
    expect(copy?.parts[0]?.id).not.toBe(one.parts[0]?.id);
    expect(onPick).toHaveBeenLastCalledWith({ song: copy?.id, part: null });
    labelled(element, "Remove Yard A Song 1").onClick?.();
    expect(patch).toHaveBeenLastCalledWith({ songs: [] });
    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it("patches the whole run with one part's field moved, and moves a part along its song", () => {
    const [first, second] = [part(), part()];
    const one = song([first, second]);
    const { element, patch } = row([one], { song: one.id, part: second.id });
    labelled(element, "Yard A Song 1 Part 2 Jumps").onChange?.(6.2);
    expect(patch).toHaveBeenLastCalledWith({
      songs: [{ ...one, parts: [first, { ...second, length: 6 }] }],
    });
    labelled(element, "Skip Yard A Song 1 Part 2").onPressedChange?.(true);
    expect(patch).toHaveBeenLastCalledWith({
      songs: [{ ...one, parts: [first, { ...second, skip: true }] }],
    });
    labelled(element, "Earlier Yard A Song 1 Part 2").onClick?.();
    expect(patch).toHaveBeenLastCalledWith({ songs: [{ ...one, parts: [second, first] }] });
    expect(labelled(element, "Later Yard A Song 1 Part 2").disabled).toBe(true);
    // An emptied name puts the badge back rather than committing nothing (principle 5).
    labelled(element, "Name Yard A Song 1 Part 2").onBlur?.({ currentTarget: { value: "  " } });
    const [renamed] = patch.mock.calls.at(-1) ?? [];
    expect(renamed?.songs?.[0]?.parts[1]?.name).toBe(second.id.slice(-4).toUpperCase());
  });

  it("copies a part after itself under a fresh id, refuses the copy at the ceiling, and removes one", () => {
    const held = part();
    const one = song([held]);
    const { element, patch, onPick } = row([one], { song: one.id, part: held.id });
    labelled(element, "Duplicate Yard A Song 1 Part 1").onClick?.();
    const [copied] = patch.mock.calls.at(-1) ?? [];
    const parts = copied?.songs?.[0]?.parts ?? [];
    expect(parts).toHaveLength(2);
    expect(parts[1]?.id).not.toBe(held.id);
    expect(parts[1]?.name).toBe(copyName(held.name));
    expect(onPick).toHaveBeenLastCalledWith({ song: one.id, part: parts[1]?.id });
    labelled(element, "Remove Yard A Song 1 Part 1").onClick?.();
    expect(patch).toHaveBeenLastCalledWith({ songs: [{ ...one, parts: [] }] });
    expect(onPick).toHaveBeenLastCalledWith({ song: one.id, part: null });
    const full = song(Array.from({ length: PLAYER_SONG_MAX }, () => part()));
    const crowded = row([full], { song: full.id, part: full.parts[0]!.id });
    expect(labelled(crowded.element, "Duplicate Yard A Song 1 Part 1").disabled).toBe(true);
  });

  it("hands the audition to the grid and patches nothing, and refuses it on a part passed over", () => {
    const held = part();
    const one = song([held]);
    const { element, patch, onAudition } = row([one], { song: one.id, part: held.id });
    labelled(element, "Audition Yard A Song 1 Part 1").onPressedChange?.(true);
    expect(onAudition).toHaveBeenLastCalledWith(held.id, true);
    expect(patch).not.toHaveBeenCalled();
    const skipped = part({ skip: true });
    const quiet = song([skipped]);
    const refused = row([quiet], { song: quiet.id, part: skipped.id });
    expect(labelled(refused.element, "Audition Yard A Song 1 Part 1").disabled).toBe(true);
    // And on a song the run passes over, for the same reason: no first jump to wind to.
    const passed = song([part()], { plays: 0 });
    const still = row([passed], { song: passed.id, part: passed.parts[0]!.id });
    expect(labelled(still.element, "Audition Yard A Song 1 Part 1").disabled).toBe(true);
  });

  it("opens the part's own dials without sending anything, and a redraw writes the whole part", () => {
    const held = part();
    const one = song([held]);
    const { element, patch, setOpen } = row([one], { song: one.id, part: held.id });
    labelled(element, "Open Yard A Song 1 Part 1").onPressedChange?.(true);
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(patch).not.toHaveBeenCalled();
    labelled(element, "Redraw Yard A Song 1 Part 1").onClick?.();
    const [drawn] = patch.mock.calls.at(-1) ?? [];
    const redrawn = drawn?.songs?.[0]?.parts[0];
    expect(redrawn?.id).toBe(held.id);
    expect(redrawn?.voice).not.toEqual(held.voice);
  });
});
