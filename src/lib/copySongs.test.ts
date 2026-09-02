import { describe, expect, it } from "vitest";

import { partVoice } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { playsSaid, standingSaid } from "./copySongs.ts";
import type { PlayerSong } from "./playerSongs.ts";

const part = (id: string) => ({
  id,
  name: id.toUpperCase(),
  skip: false,
  voice: partVoice(PLAYER_DEFAULTS),
  length: 4,
  steps: [],
});
const SONGS: readonly PlayerSong[] = [
  { id: "intro", name: "Intro", plays: 3, parts: [part("open"), part("chew")] },
];

describe("what the grid's foot line says", () => {
  it("names the song and the part standing, and which round of how many", () => {
    expect(standingSaid(SONGS, "intro", "chew")).toBe("Playing Intro · CHEW");
    expect(playsSaid(SONGS, "intro", 1)).toBe("Plays 2 of 3");
  });

  /** A frame may not throw, so a step drawn under a list an edit has since replaced says what it
   *  can rather than failing (0070). */
  it("says nothing for a song or a part the run no longer holds, rather than throwing", () => {
    expect(standingSaid(SONGS, "gone", "chew")).toBe("Playing  · ");
    expect(standingSaid(SONGS, "intro", "gone")).toBe("Playing Intro · ");
    expect(playsSaid(SONGS, "gone", 0)).toBe("Plays 1 of 0");
  });
});
