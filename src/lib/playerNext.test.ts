import { describe, expect, it } from "vitest";

import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { partVoice } from "./player.ts";
import { songsAfter } from "./playerNext.ts";
import type { PlayerSong } from "./playerSongs.ts";
import type { PlayerStep } from "./playerWalk.ts";

/** One part of the fixture, drawn by the defaults and eight jumps long. */
const part = (id: string, skip = false) => ({
  id,
  name: id,
  skip,
  voice: partVoice(PLAYER_DEFAULTS),
  length: 8,
  steps: [],
});

/** Two songs that play, one passed over between them, and a skipped part inside the first. */
const SONGS: readonly PlayerSong[] = [
  { id: "intro", name: "Intro", plays: 2, parts: [part("open"), part("gone", true), part("chew")] },
  { id: "rest", name: "Rest", plays: 0, parts: [part("never")] },
  { id: "out", name: "Out", plays: 1, parts: [part("wide")] },
];

/** A step standing in `part` of `song`, on round `songPlay`; nothing else about it matters here. */
const standing = (song: string, id: string, songPlay = 0): PlayerStep => ({
  slot: 0,
  bed: 0,
  zone: null,
  repeats: 1,
  burst: 0.1,
  rest: 0,
  rates: [1],
  ratchet: 0,
  dropped: false,
  reversed: false,
  sparked: null,
  gate: 1,
  part: id,
  voice: null,
  song: null,
  place: { song, songPlay, partLeft: 0, songLeft: 0 },
  opens: false,
  first: false,
  rows: false,
});

describe("what the run comes to next", () => {
  it("names the next played part of the song, skipping the one passed over", () => {
    expect(songsAfter(SONGS, standing("intro", "open"))).toEqual({ song: "intro", part: "chew" });
  });

  it("comes back to the song's own top while it has rounds to play, and moves on when it has none", () => {
    expect(songsAfter(SONGS, standing("intro", "chew", 0))).toEqual({
      song: "intro",
      part: "open",
    });
    expect(songsAfter(SONGS, standing("intro", "chew", 1))).toEqual({ song: "out", part: "wide" });
  });

  it("comes round past the last song to the first, and past a song that plays no times", () => {
    expect(songsAfter(SONGS, standing("out", "wide"))).toEqual({ song: "intro", part: "open" });
  });

  it("names nothing where nothing is standing, rather than throwing on a frame", () => {
    expect(songsAfter(SONGS, null)).toBeNull();
    expect(songsAfter(SONGS, { ...standing("intro", "open"), place: null })).toBeNull();
    expect(songsAfter(SONGS, standing("elsewhere", "open"))).toBeNull();
    expect(songsAfter(SONGS, standing("intro", "never"))).toBeNull();
    expect(songsAfter([], standing("intro", "open"))).toBeNull();
  });
});
