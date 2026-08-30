/**
 * @role What the walk does with the two tiers over a part: an album goes round as many times as it
 *   says before the next one, the run wraps past the last, and a count of nought is passed over
 *   (P147). Read off `playerSequence` and never off the cursor under it, because what the step
 *   carries is what every surface reads.
 * @instead Everything else a walk draws, the song of parts included → src/lib/playerWalk.test.ts,
 *   which this left when the pair of subjects outgrew one file (0045). What the tiers promise the
 *   walk on their own → src/lib/playerAlbum.test.ts.
 */
import { describe, expect, it } from "vitest";

import { partVoice, type PlayerSpec } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { PLAYER_PART_DEFAULTS, type SongPart } from "./playerSong.ts";
import type { PlayerAlbum } from "./playerAlbum.ts";
import { playerSequence } from "./playerWalk.ts";

/** A part lasting one jump, told apart by its id alone: what these cases read off a step is which
 *  part it was walked under, and nothing about how that part sounds. */
let minted = 0;
const part = (): SongPart => ({
  id: `part-${++minted}`,
  name: `part-${minted}`,
  ...PLAYER_PART_DEFAULTS,
  voice: partVoice(PLAYER_DEFAULTS),
  length: 1,
});

/** One album of one song, played as many times as it is told. */
const album = (parts: readonly SongPart[], plays: number): PlayerAlbum => ({
  id: `album-${++minted}`,
  name: `album-${minted}`,
  plays,
  songs: [{ id: `song-${minted}`, name: `song-${minted}`, plays: 1, parts }],
});

/** And the pattern holding them, on one seed: what moves between two cases is the run. */
const spec = (albums: readonly PlayerAlbum[]): PlayerSpec => ({
  seed: 11,
  ...PLAYER_DEFAULTS,
  albums,
});

const walked = (albums: readonly PlayerAlbum[], jumps: number): (string | null)[] =>
  playerSequence(spec(albums), jumps).map((step) => step.part);

describe("a walk that holds a run of albums", () => {
  /**
   * The three tiers walked as one: an album plays its songs, a song plays its parts, each says how
   * many times it goes round, and the run wraps past the last album. Album one four times, then
   * album two once, then round again — the shape P147 was written for, read off the walk itself
   * rather than off the cursor under it (src/lib/playerAlbum.ts).
   */
  it("plays an album its own number of times, and comes round past the last", () => {
    const [one, two] = [part(), part()];
    const run = [album([one], 4), album([two], 1)];
    const played = [one, one, one, one, two, one, one, one, one, two];
    expect(walked(run, played.length)).toEqual(played.map((held) => held.id));
  });

  /**
   * And a count of nought is the skip a part row already carries: the album is held and passed
   * over, so the walk plays what is left rather than standing in a run nothing plays.
   */
  it("passes over an album played no times at all", () => {
    const [one, two] = [part(), part()];
    const run = [album([one], 0), album([two], 1)];
    expect(new Set(walked(run, 6))).toEqual(new Set([two.id]));
  });
});
