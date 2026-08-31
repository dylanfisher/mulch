/**
 * @role What the walk does with the two tiers over a part: an album goes round as many times as it
 *   says before the next one, the run wraps past the last, a count of nought is passed over
 *   (P147), and a ground counted in albums comes round on that top tier (P158). Read off
 *   `playerSequence` and never off the cursor under it, because what the step carries is what
 *   every surface reads.
 * @instead Everything else a walk draws, the song of parts included → src/lib/playerWalk.test.ts,
 *   which this left when the pair of subjects outgrew one file (0045). What the tiers promise the
 *   walk on their own → src/lib/playerAlbum.test.ts.
 */
import { describe, expect, it } from "vitest";

import { partVoice, type PlayerSpec } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { PLAYER_PART_DEFAULTS, type SongPart } from "./playerSong.ts";
import type { PlayerAlbum } from "./playerAlbum.ts";
import { PLAYER_BIAS_MAX } from "./playerTravel.ts";
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

// One case per promise the two tiers make the walk: the rounds, the wrap, the skip, and the place
// every step carries. The length is how many such promises there are rather than how much this
// block decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
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

  /**
   * And every step says where in the run it falls, beside the part and the ground it already
   * carries: a step is armed seconds before it sounds, so a surface that drew the arrangement off
   * the list would be drawing where the list is rather than where the pattern is (0157, 0180).
   *
   * The counts come down a jump at a time, because the cursor under this speaks once a part and a
   * step is one jump of it — which is what makes the countdown on a row a countdown rather than a
   * number that moves at boundaries.
   */
  it("carries where it stands on every step, counted down a jump at a time", () => {
    const held: SongPart = { ...part(), length: 3 };
    // One album of one song of one three-jump part, the song going round twice inside the album
    // and the album twice over: three jumps to a song round, six to an album round, twelve to the
    // whole run — so the three counts are three different numbers at every step.
    const run = [{ ...album([held], 2), songs: [{ ...album([held], 2).songs[0]!, plays: 2 }] }];
    const places = playerSequence(spec(run), 12).map((step) => step.place);
    expect(places.map((place) => place?.partLeft)).toEqual([2, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1, 0]);
    expect(places.map((place) => place?.songLeft)).toEqual([2, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1, 0]);
    expect(places.map((place) => place?.albumLeft)).toEqual([5, 4, 3, 2, 1, 0, 5, 4, 3, 2, 1, 0]);
    // And each count says which round of its own tier it is inside, nought-based.
    expect(places.map((place) => place?.songPlay)).toEqual([0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1]);
    expect(places.map((place) => place?.albumPlay)).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(places[0]).toMatchObject({ album: run[0]?.id });
  });

  /**
   * And the ground counted on the tier over the song: a period counted in albums comes due at the
   * first part of the first song of a round of an album and nowhere inside one, so a song coming
   * round twice inside that album moves nothing (P158, 0192). One album of one song of two
   * one-jump parts, the song going round twice — four jumps to an album round, and a full lean so
   * every move is a move on and the beds can be read as fours.
   */
  it("moves the ground once an album round, and not at a song round inside one", () => {
    const held = album([part(), part()], 1);
    const run = [{ ...held, songs: [{ ...held.songs[0]!, plays: 2 }] }];
    const beds = playerSequence(
      { ...spec(run), bedPer: "album", bedEvery: 1, bedDistance: 4, bedBias: PLAYER_BIAS_MAX },
      12,
    ).map((step) => step.bed);
    // The song's own bed for the whole of the first album round — the pattern beginning is not a
    // boundary it crossed — and then one ground per round, held for all four of its jumps.
    for (const at of [0, 4, 8]) expect(new Set(beds.slice(at, at + 4)).size).toBe(1);
    expect(beds[0]).toBe(0);
    expect(new Set(beds).size).toBe(3);
  });

  /**
   * And the quiet case the words say out loud: a run the pattern draws for itself stands in no
   * album, so a ground counted in albums never comes round however long it plays — the honest
   * answer rather than a fall back to jumps (0158, principle 5, `PLAYER_BED_PER_TOOLTIP`).
   */
  it("never moves the ground on the album clock while the pattern draws its own run", () => {
    const beds = playerSequence(
      {
        ...spec([]),
        arrange: 2,
        bedPer: "album",
        bedEvery: 1,
        bedDistance: 4,
        bedBias: PLAYER_BIAS_MAX,
      },
      12,
    ).map((step) => step.bed);
    expect(new Set(beds)).toEqual(new Set([0]));
  });

  // A pattern holding no run at all stands in no album and no song, so there is no place to carry
  // and none is invented: null is the whole of "nothing is arranged" (0158, principle 5).
  it("carries no place at all while there is nothing to stand in", () => {
    expect(playerSequence(spec([]), 3).map((step) => step.place)).toEqual([null, null, null]);
  });
});
