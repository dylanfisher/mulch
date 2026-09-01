/**
 * @role What dragging a song along the timeline actually does: where a pointer is along the bar,
 *   where the held song would drop, and the run with it moved there. Out of the component for the
 *   reason the ground's drag is (0253, 0255): a static render never drags, so this is the only
 *   place the gesture can be proven, and a drop that lands in the wrong song is the picture failing
 *   silently at the one thing its surface invites a hand to do.
 * @instead The picture this drives → src/ui/sketch/parts/SketchPartSongs.tsx. The songs themselves
 *   → src/ui/sketch/sketchWalk.ts. What a song is on the instrument → src/lib/playerSongs.ts.
 */
import type { SketchSong } from "@/ui/sketch/sketchWalk";

/**
 * What a hand has hold of: which pointer, and which song **by name**. The name and not the index,
 * for the reason the standing cursor carries one: the run is reordered under the drag, so an index
 * taken at the grab points at a different song one move later.
 */
export type SongGrab = { pointer: number; name: string };

/** Taking hold. The song's place is not read here at all — a drop lands where the pointer is,
 *  which is the whole of what a reorder means, and never at an offset from where it was taken. */
export const songGrabbed = (name: string, pointer: number): SongGrab => ({ pointer, name });

/** How long the whole bar is: every song's rounds, since a song's length on it is its plays. */
export const songsPlayed = (songs: readonly SketchSong[]): number =>
  songs.reduce((plays, song) => plays + song.plays, 0);

/**
 * Where a pointer is along the bar, as a fraction of the **bar** and not of the picture it is drawn
 * in. The bar is inset from its own box, so the two are not the same measure: a fraction of the
 * element crosses every boundary early at one end and late at the other, and the inset at each end
 * maps into the first and last song rather than past them. Given the pointer's share of the
 * element, since the box is pinned to the viewBox and one unit of it is one pixel (`SKETCH_VIEW`).
 */
export const alongBar = (across: number, view: number, left: number, wide: number): number =>
  (across * view - left) / wide;

/**
 * Where the held song drops: the place in the **rest** of the run — the run without it — that a
 * fraction of the bar points at, nought to the length of that rest so a song can be dropped past
 * the last one as well as before the first.
 *
 * Read off the rest and never off the whole run, which is what makes a drag stable. A target read
 * off a run that still holds the held song is a different target the moment the song has moved, so
 * one pointer place answers two places alternately and the drag flickers between them across a
 * third of the bar — and where it ends up is then the parity of the last move event rather than
 * where the hand let go.
 *
 * A song is passed once the pointer is past its middle, which is what makes the boundary the one a
 * hand sees: the block under the pointer is the one it would displace.
 */
export function songDropAt(rest: readonly SketchSong[], at: number): number {
  const want = at * songsPlayed(rest);
  let before = 0;
  for (const [index, song] of rest.entries()) {
    if (want < before + song.plays / 2) return index;
    before += song.plays;
  }
  return rest.length;
}

/**
 * The run with the held song moved to where the pointer is. Nothing moves unless the pointer that
 * took hold is the one that moved — a second finger on a second block would otherwise drive this
 * one's drag — and a drop back on the song's own place returns the run itself, so a drag that has
 * not crossed a boundary re-renders nothing.
 */
export function songMoved(
  songs: readonly SketchSong[],
  held: SongGrab | null,
  pointer: number,
  at: number,
): readonly SketchSong[] {
  if (held === null || held.pointer !== pointer) return songs;
  const from = songs.findIndex((song) => song.name === held.name);
  // Not a no-op: the grab named a song, and a run that no longer holds it is a drag of something
  // that is not there rather than a drag of nothing (principle 5).
  if (from === -1) throw new Error(`No song named "${held.name}" is on the bar.`);
  const rest = songs.filter((song) => song.name !== held.name);
  const to = songDropAt(rest, at);
  if (to === from) return songs;
  const song = songs[from];
  if (song === undefined) throw new Error(`The bar holds no song ${from}.`);
  return [...rest.slice(0, to), song, ...rest.slice(to)];
}

/** Letting go, on every way a press can end and not on `pointerup` alone — the ground's own rule,
 *  and for its reason: a cancelled gesture leaves the hold set, and the next pointer to cross the
 *  picture then reorders the run without ever having been pressed. */
export const songLetGo = (held: SongGrab | null, pointer: number): SongGrab | null =>
  held === null || held.pointer === pointer ? null : held;
