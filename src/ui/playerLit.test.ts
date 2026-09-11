import { describe, expect, it } from "vitest";

import { playerVoice } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import type { PlayerStep } from "@/lib/playerWalk";
import { litRows, sameRow, SONG_ATTRIBUTE, standingIn } from "@/ui/playerLit";

/**
 * One step of a walk standing four jumps from the end of its part and fourteen from the end of
 * its song round, drawn at two repeats of a one-second burst and two slots of wait: at half a
 * second a slot, a jump of it is three seconds.
 */
const STANDING: PlayerStep = {
  slot: 0,
  bed: 0,
  zone: null,
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
  place: { song: "song-1", songPlay: 0, partLeft: 4, songLeft: 14 },
  opens: true,
  first: false,
  rows: false,
};

/**
 * One row as the frame reads and writes it: the id it is keyed by, the standing mark written onto
 * it, and the one span the countdown goes into — hand-built because a painting is DOM and this
 * suite renders nothing. The clock counts its own writes, because writing a `textContent` that
 * already matches is the thing 0070 forbids.
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

// One case per thing the frame writes, read in order. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("where the run stands, and the rows lit by it", () => {
  /**
   * Where the run stands, off the step the clock is inside rather than off the list, and how long
   * each of the two rows it is standing in has left — the jumps still to come at the length the
   * standing landing lasts, in the words a countdown is already said in (0157, 0180, `growthLeft`).
   */
  it("says where the run stands and how long each row it is standing in has left", () => {
    expect(standingIn(STANDING, 1 / 2)).toEqual({
      song: "song-1",
      part: "part-9",
      partLeft: "12s",
      songLeft: "42s",
    });
    // And priced off the dials and not off what they drew: the standing part's own numbers say a
    // two-second landing and no wait, so the same four jumps read eight seconds however far the
    // roll strayed the burst on the step itself.
    const dials = playerVoice({ ...PLAYER_DEFAULTS, burst: 2, repeats: 1, ratchet: 0, rest: 0 });
    expect(standingIn({ ...STANDING, voice: dials }, 1 / 2).partLeft).toBe("8s");
    // A yard whose loop has no grid has no seconds to say and says none (0159).
    expect(standingIn(STANDING, null)).toMatchObject({
      song: "song-1",
      partLeft: "",
      songLeft: "",
    });
    // And a stopped yard is standing nowhere at all.
    expect(standingIn(null, 1 / 2)).toEqual({
      song: null,
      part: null,
      partLeft: "",
      songLeft: "",
    });
    expect(sameRow(standingIn(STANDING, 1 / 2), standingIn(STANDING, 1 / 2))).toBe(true);
    expect(sameRow(standingIn(STANDING, 1 / 2), standingIn(STANDING, null))).toBe(false);
  });

  /**
   * And what the painting does with that: the row the run is standing in wears the mark and the
   * words, every other row of its tier is cleared rather than left saying what it last said, and a
   * row that already says the right thing is not written to at all — a `textContent` replaces the
   * node's children whether or not the string matches (0070).
   */
  it("lights the row the run is standing in, and clears the one it has left", () => {
    const here = rowAt(SONG_ATTRIBUTE, "song-1");
    const gone = rowAt(SONG_ATTRIBUTE, "song-2");
    const section = { querySelectorAll: () => [here.row, gone.row] };
    // The frame walks elements; this suite builds the two fields it touches and nothing else.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const held = section as unknown as HTMLElement;
    litRows(held, SONG_ATTRIBUTE, "song-1", "12s");
    expect(here.row.dataset["standing"]).toBe("true");
    expect(here.clock.textContent).toBe("12s");
    expect(gone.row.dataset["standing"]).toBe("false");
    expect(gone.clock.textContent).toBe("");
    // The same answer again writes nothing: one write for the words, one for the clearing.
    litRows(held, SONG_ATTRIBUTE, "song-1", "12s");
    expect(here.clock.writes).toBe(1);
    expect(gone.clock.writes).toBe(1);
    // And a stopped yard is standing in no song, so the row that was lit is cleared too.
    litRows(held, SONG_ATTRIBUTE, null, "");
    expect(here.row.dataset["standing"]).toBe("false");
    expect(here.clock.textContent).toBe("");
  });
});
