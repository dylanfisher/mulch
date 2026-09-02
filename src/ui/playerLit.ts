/**
 * @role Where the run stands, read off the step the clock is inside, and the rows lit by it: the
 *   place and the two countdowns in one shape, the compare that keeps a frame off the DOM where
 *   nothing moved, and the one walk that writes the standing mark and the clock into whichever
 *   rows wear a tier's attribute (0157, 0070). Shared by the grid and the scope's lanes, which are
 *   two pictures of one run and may not disagree about where it is (principle 1).
 * @instead The grid that mounts the rows → src/ui/PlayerGrid.tsx. The lanes that light segments
 *   with the same walk → src/ui/PlayerScope.tsx. The step itself → src/lib/playerWalk.ts.
 */
import { growthLeft } from "@/lib/copyAuto";
import { stepSecs } from "@/lib/playerScope";
import type { SongPartId } from "@/lib/playerSong";
import type { PlayerStep } from "@/lib/playerWalk";

/** The attribute a song's column header and its inspector row carry the song's id under, so the
 *  frame can light the one standing without asking React for anything (0157). */
export const SONG_ATTRIBUTE = "data-song";

/** And the one a part's cell and its inspector row carry the part's id under, one tier down. */
export const PART_ATTRIBUTE = "data-part";

/** The slot a row of the arrangement — a part's and a song's — wears its countdown in, mounted
 *  whether or not anything is standing in it and filled by that same frame: a run arriving may not
 *  move the page under it, which is the rule the automator's own rows keep (0070,
 *  src/ui/GrownRows.tsx). One name for both tiers, so the frame that fills them reads one
 *  selector (principle 1). */
export const ROW_LEFT_SLOT = "row-left";

/** And the column the countdown is reserved in: the automator's own width, because it says the
 *  automator's own words and a row whose clock moved the buttons beside it would be a row nothing
 *  could be pressed on (`growthLeft`, src/lib/copyAuto.ts). Both are the width of the longest
 *  thing that column says — "59m 59s", 52px in either face — and they move together, because two
 *  columns counting the same thing at two widths is the claim in this sentence being false. */
export const ROW_LEFT = "w-14 shrink-0 text-right type-readout text-muted-foreground tabular-nums";

/**
 * What one painting of the arrangement says: which song and which part the walk is standing in,
 * and how long each of those two has left in the words a countdown is already said in
 * (`growthLeft`, src/lib/copyAuto.ts). The ids so a row can be found by the attribute it wears,
 * the words so a row can be filled with them.
 */
export type StandingRow = {
  song: string | null;
  part: SongPartId | null;
  songLeft: string;
  partLeft: string;
};

/** Nothing standing anywhere, which is what a stopped yard, a pattern with no arrangement and a
 *  pattern drawing its own all read as. Declared once, outside any render: it is what the frame
 *  compares its first painting against. */
export const NOTHING_STANDING: StandingRow = {
  song: null,
  part: null,
  songLeft: "",
  partLeft: "",
};

/**
 * Where the run stands and how long each row it is standing in has left, off the step the clock is
 * actually inside — the walk's own answer and never a second count of the ordinal (principle 1,
 * 0157, 0180). The place says the jumps still to come at each of the two tiers; this says how
 * long those jumps take.
 *
 * **An estimate, and drawn as one**: every jump still to come is priced at the landing the
 * *dials* say, which is the standing part's voice — so it moves when a hand moves a dial, exactly
 * as the automator's own row does, and not when a roll strays one burst or places one wait
 * (`stepSecs`, src/lib/playerScope.ts; 0221).
 *
 * A yard whose loop has no grid has no seconds to say and says none — `slotSecs` is null there, and
 * a wait counted in slots of a grid that does not exist is not a number (0159).
 */
export function standingIn(step: PlayerStep | null, slotSecs: number | null): StandingRow {
  const place = step?.place ?? null;
  const part = step?.part ?? null;
  if (place === null) return { ...NOTHING_STANDING, part };
  // The part's own numbers where one is standing, which is every step that carries a place; the
  // step's own drawn ones are the total answer where none is (0157).
  const secs = step === null || slotSecs === null ? null : stepSecs(step.voice ?? step, slotSecs);
  const said = (left: number): string => (secs === null ? "" : growthLeft(left * secs));
  return {
    song: place.song,
    part,
    songLeft: said(place.songLeft),
    partLeft: said(place.partLeft),
  };
}

/** Whether two paintings say the same thing, which is what keeps the DOM walk off the frames
 *  where nothing moved (0070). Field by field rather than by identity: `standingIn` answers a
 *  fresh object every frame, and it is the four answers that are the state. */
export const sameRow = (one: StandingRow, two: StandingRow): boolean =>
  one.song === two.song &&
  one.part === two.part &&
  one.songLeft === two.songLeft &&
  one.partLeft === two.partLeft;

/** One tier's rows lit: the standing mark on every row of it, and the countdown in the one row
 *  that is standing. Written into the DOM and never through React, and compared before it is
 *  written, because a `textContent` replaces the node's children whether or not the string
 *  matches (0070, plan §2). */
export function litRows(
  section: HTMLElement,
  attribute: string,
  standing: string | null,
  left: string,
): void {
  for (const row of section.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
    const here = standing !== null && row.getAttribute(attribute) === standing;
    row.dataset["standing"] = String(here);
    const clock = row.querySelector<HTMLElement>(`[data-slot="${ROW_LEFT_SLOT}"]`);
    if (clock === null) continue;
    const says = here ? left : "";
    if (clock.textContent !== says) clock.textContent = says;
  }
}
