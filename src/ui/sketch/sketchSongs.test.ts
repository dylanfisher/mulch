import { describe, expect, it } from "vitest";

import {
  alongBar,
  songDropAt,
  songGrabbed,
  songLetGo,
  songMoved,
  songsPlayed,
} from "@/ui/sketch/sketchSongs";
import { SKETCH_SONG_STANDING, SKETCH_SONGS } from "@/ui/sketch/sketchWalk";

/** One pointer, and a second one that never took hold of anything. */
const HAND = 1;
const OTHER = 2;

/** The run said as names, which is the only thing a reorder can be read off. */
const named = (songs: readonly { name: string }[]) => songs.map((song) => song.name);

describe("reading a place on the song bar", () => {
  /**
   * The bar is inset inside its own picture, so a fraction of the element is not a fraction of the
   * bar. Read the element's way, the pointer crosses every drawn boundary early at one end and late
   * at the other, and the inset at each end maps into the first and last song rather than past them.
   */
  it("measures along the bar and not along the picture the bar is drawn in", () => {
    const view = 320;
    const left = 8;
    const wide = view - left * 2;
    // The head of the picture is before the bar, and its tail is past it — the two places a
    // fraction of the element reports as exactly nought and exactly one.
    expect(alongBar(0, view, left, wide)).toBeLessThan(0);
    expect(alongBar(1, view, left, wide)).toBeGreaterThan(1);
    // The bar's own ends, and its middle, which the element's middle happens to agree with.
    expect(alongBar(left / view, view, left, wide)).toBe(0);
    expect(alongBar((view - left) / view, view, left, wide)).toBe(1);
    expect(alongBar(0.5, view, left, wide)).toBe(0.5);
  });

  /**
   * Where a held song drops: a place in the run **without** it, so the answer does not move when
   * the song does. A song is passed once the pointer is past its middle, which is the boundary a
   * hand sees — the block under the pointer is the one it would displace.
   */
  it("drops before the song the pointer is over, and past the last one at the tail", () => {
    const rest = SKETCH_SONGS.filter((song) => song.name !== "Intro");
    expect(songDropAt(rest, 0)).toBe(0);
    expect(songDropAt(rest, 1)).toBe(rest.length);
    // Halfway through the first of the rest is where it stops being the one displaced.
    const played = songsPlayed(rest);
    const first = rest[0]?.plays ?? 0;
    expect(songDropAt(rest, (first / 2 - 0.1) / played)).toBe(0);
    expect(songDropAt(rest, (first / 2 + 0.1) / played)).toBe(1);
  });

  /** A place off either end means an end of the run, never nothing: a drop that answered nothing
   *  would leave the song where it was while the hand went on dragging. */
  it("clamps a place off either end of the bar to an end of the run", () => {
    const rest = SKETCH_SONGS.filter((song) => song.name !== "Intro");
    expect(songDropAt(rest, -5)).toBe(0);
    expect(songDropAt(rest, 5)).toBe(rest.length);
  });
});

describe("dragging a song along the bar", () => {
  it("moves the held song to the song the pointer is over and keeps the rest in order", () => {
    const held = songGrabbed("Out", HAND);
    // Dragged to the head of the bar: the last song opens the run and the other two follow in the
    // order they already stood in.
    const moved = songMoved(SKETCH_SONGS, held, HAND, 0);
    expect(named(moved)).toEqual(["Out", "Intro", "Middle"]);
    expect(moved).toHaveLength(SKETCH_SONGS.length);
  });

  /**
   * The whole reason the grab carries a name. The run is reordered under the hand, so an index
   * taken at the grab points at whichever song was dragged into that place — and a second drag
   * would then move a song nobody took hold of.
   */
  it("keeps hold of the song it was given after the run has been reordered", () => {
    const held = songGrabbed("Out", HAND);
    const once = songMoved(SKETCH_SONGS, held, HAND, 0);
    const twice = songMoved(once, held, HAND, 1);
    expect(named(twice)).toEqual(["Intro", "Middle", "Out"]);
  });

  /**
   * And the standing cursor survives it, which is what a cursor named after a song buys: what a
   * song is, is a run and a cursor over it, so a reorder that moved the cursor to a different song
   * would be the picture answering a gesture nobody made (`SongPlace`, src/lib/playerSongs.ts).
   */
  it("carries the standing song itself to the place it was dragged to", () => {
    const held = songGrabbed(SKETCH_SONG_STANDING.song.name, HAND);
    const moved = songMoved(SKETCH_SONGS, held, HAND, 0);
    // It opens the run now, and it is the very song the cursor stands in rather than a song of the
    // same name: the cursor reads its rounds and its parts off this object.
    expect(named(moved)).toEqual(["Middle", "Intro", "Out"]);
    expect(moved[0]).toBe(SKETCH_SONG_STANDING.song);
  });
});

describe("dragging a song to one place and holding still", () => {
  /**
   * The one thing a reorder read off the run it is reordering gets wrong. A target computed against
   * a run that still holds the held song is a different target the moment the song has moved, so
   * one pointer place answers two places alternately: the run flickers between them for as long as
   * the hand holds still, and where it ends up is the parity of the last move event.
   */
  it("answers one place for one pointer, however many times the hand moves there", () => {
    const held = songGrabbed("Out", HAND);
    // A tenth along, which is inside the head of the run a target read off the whole bar keeps
    // changing its mind about: that reading answers "first" and then "second" and then "first"
    // again, for as long as the hand holds still.
    const once = songMoved(SKETCH_SONGS, held, HAND, 0.1);
    expect(named(once)).toEqual(["Out", "Intro", "Middle"]);
    const twice = songMoved(once, held, HAND, 0.1);
    expect(named(twice)).toEqual(named(once));
    expect(twice).toBe(once);
  });
});

describe("dropping a song where it already is", () => {
  it("returns the run itself when the song is dropped on its own place", () => {
    const held = songGrabbed("Intro", HAND);
    expect(songMoved(SKETCH_SONGS, held, HAND, 0)).toBe(SKETCH_SONGS);
  });

  it("moves nothing for a pointer that never took hold, and nothing when nothing is held", () => {
    const held = songGrabbed("Out", HAND);
    expect(songMoved(SKETCH_SONGS, held, OTHER, 0)).toBe(SKETCH_SONGS);
    expect(songMoved(SKETCH_SONGS, null, HAND, 0)).toBe(SKETCH_SONGS);
  });

  it("refuses a hold on a song the run does not have", () => {
    const held = songGrabbed("Nothing", HAND);
    expect(() => songMoved(SKETCH_SONGS, held, HAND, 0)).toThrow(/Nothing/u);
  });
});

describe("letting a song go", () => {
  it("lets go for the pointer that took hold and keeps the hold for another", () => {
    const held = songGrabbed("Out", HAND);
    expect(songLetGo(held, HAND)).toBeNull();
    expect(songLetGo(held, OTHER)).toBe(held);
    expect(songLetGo(null, HAND)).toBeNull();
  });
});
