/**
 * @role What the two tiers over a part promise: an album plays its songs, a song plays its parts,
 *   each goes round as many times as it says, a count of nought is passed over, and the run wraps
 *   past the last album (P147). And what the one validator refuses, tier by tier — the shape is
 *   durable, so a run from another build is not a run.
 * @instead What one part promises the cursor that hands it out, and everything a drawn arrangement
 *   is → src/lib/playerSong.test.ts. The walk those parts unfold into → src/lib/playerWalk.test.ts.
 */
// Over the line cap, and what is over it is one case per promise the three tiers make: the shape,
// the two round counters, the skip, the wrap, the place at every draw of a three-tier run, and the
// validator's refusals field by field. Splitting it would put the shape's cases in one file and
// the bound on that shape in another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { partVoice, type PlayerVoice } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { assertPlayer } from "./playerWire.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import { PLAYER_SONG_MAX, type SongPart } from "./playerSong.ts";
import {
  albumOfParts,
  albumsArePlayed,
  albumsOnset,
  albumsParts,
  createAlbums,
  openIn,
  PLAYER_ALBUM_MAX,
  soloAlbums,
  withAlbumsPart,
  withSongParts,
  type PlayerAlbum,
  type PlayerSong,
  type SongPlace,
} from "./playerAlbum.ts";

/** Every field a draw touches, which is the switch's own values but the run and the cast. */
const { albums: _albums, cast: _cast, ...PLAIN } = PLAYER_DEFAULTS;

/** A voice told apart by one number, the way src/lib/playerSong.test.ts tells one apart: this file
 *  never sees a character, so a draw here is a counter riding in `distance`. */
const voiceOf = (drawn: number): PlayerVoice => ({ ...PLAIN, distance: drawn });

let minted = 0;
const part = (fields: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  name: `part-${minted}`,
  skip: false,
  voice: partVoice(voiceOf(minted)),
  length: 1,
  steps: [],
  ...fields,
});
const song = (parts: readonly SongPart[], plays = 1): PlayerSong => ({
  id: `song-${++minted}`,
  name: `song-${minted}`,
  plays,
  parts,
});
const album = (songs: readonly PlayerSong[], plays = 1): PlayerAlbum => ({
  id: `album-${++minted}`,
  name: `album-${minted}`,
  plays,
  songs,
});

/** One place as one line: where the walk stands, and the jumps still to come of the part, of the
 *  song round over it and of the album round over that. */
const said = (place: SongPlace | null): string | null =>
  place === null
    ? null
    : `${place.album}/${place.albumPlay} ${place.song}/${place.songPlay} ` +
      `${place.partLeft},${place.songLeft},${place.albumLeft}`;

/** One expected place, said the way `said` says it: which album and round, which song and round,
 *  and the three counts. */
const at = (
  run: PlayerAlbum,
  play: number,
  held: PlayerSong,
  round: number,
  left: string,
): string => `${run.id}/${play} ${held.id}/${round} ${left}`;

/** The cursor's answers over `jumps` calls: which part each one began, the run that travelled with
 *  it, whether it was the top of that run, and where in the three tiers it fell. */
function walk(albums: readonly PlayerAlbum[], jumps: number) {
  let asked = 0;
  const next = createAlbums(albums, (held) => {
    asked++;
    return { ...PLAIN, ...held.voice };
  });
  const seen = Array.from({ length: jumps }, () => next());
  return {
    asked,
    parts: seen.map((handed) => handed?.part.id ?? null),
    runs: seen.map((handed) => handed?.song.map((held) => held.id).join(",") ?? null),
    firsts: seen.map((handed) => handed?.first ?? null),
    places: seen.map((handed) => (handed === null ? null : said(handed.place))),
  };
}

// One case per promise the three tiers make together, and the list of them is what a run is: the
// length is how many such promises there are rather than how much this block decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("albums of songs of parts", () => {
  // An empty list is the whole of "no arrangement", and so is a run whose every tier is empty: the
  // walk is never handed a voice and never draws one.
  it("hands the walk nothing while there is nothing to walk", () => {
    const nothing = Array.from({ length: 4 }, () => null);
    expect(walk([], 4).parts).toEqual(nothing);
    expect(walk([album([])], 4).parts).toEqual(nothing);
    expect(walk([album([song([])])], 4).parts).toEqual(nothing);
  });

  // The parts of a song in the order they are listed, the songs of an album in theirs, and round
  // again past the last album — which is what makes a pattern come round.
  it("plays its parts, then its songs, then its albums, and wraps past the last", () => {
    const [one, two, three] = [part(), part(), part()];
    const albums = [album([song([one, two])]), album([song([three])])];
    expect(walk(albums, 6).parts).toEqual([one.id, two.id, three.id, one.id, two.id, three.id]);
  });

  /**
   * And each tier says how many times it goes round before the next one. Album one four times,
   * then album two once, then round again — the shape the step was written for, said at the tier
   * that says it (P147).
   */
  it("plays one album its own number of times before the next", () => {
    const [one, two] = [part(), part()];
    const albums = [album([song([one])], 4), album([song([two])])];
    const seen = walk(albums, 10).parts;
    expect(seen).toEqual([
      one.id,
      one.id,
      one.id,
      one.id,
      two.id,
      one.id,
      one.id,
      one.id,
      one.id,
      two.id,
    ]);
  });

  /** The same one tier down: a song's own count is rounds of its parts, taken before the album
   *  moves on to the next song. */
  it("plays one song its own number of times before the next", () => {
    const [one, two] = [part(), part()];
    expect(walk([album([song([one], 3), song([two])])], 4).parts).toEqual([
      one.id,
      one.id,
      one.id,
      two.id,
    ]);
  });

  /**
   * A count of nought is the skip the part row already carries, said at the two tiers that count
   * rounds: the run is held and passed over, so trying an arrangement without an album in it costs
   * one press rather than a remove and an add that would mint new ids (P147).
   */
  it("passes over an album and a song played no times at all", () => {
    const [one, two, three] = [part(), part(), part()];
    const albums = [album([song([one], 0), song([two])]), album([song([three])], 0)];
    expect(walk(albums, 4).parts).toEqual([two.id, two.id, two.id, two.id]);
    // And the rule asked of the list rather than walked, which is what the card reads to decide
    // whether there is an arrangement at all (principle 1, src/ui/PlayerCard.tsx).
    expect(albumsArePlayed(albums)).toBe(true);
    expect(albumsArePlayed([album([song([one], 0)])])).toBe(false);
    expect(albumsArePlayed([album([song([one])], 0)])).toBe(false);
    expect(albumsArePlayed([album([song([{ ...one, skip: true }])])])).toBe(false);
    expect(albumsArePlayed([])).toBe(false);
  });

  /**
   * The run that travels with each draw is the standing song's own parts, less the ones it passes
   * over, and `first` is the top of that run: a song is what a ground clocked per song ticks on
   * and what a surface reads out as the arrangement in force (0192, 0158).
   */
  it("hands out the standing song's own run, and says where it comes round", () => {
    const [one, skipped, two] = [part(), part({ skip: true }), part()];
    const albums = [album([song([one, skipped]), song([two])])];
    const seen = walk(albums, 3);
    expect(seen.parts).toEqual([one.id, two.id, one.id]);
    expect(seen.runs).toEqual([one.id, two.id, one.id]);
    expect(seen.firsts).toEqual([true, true, true]);
    // Two parts in one song is one boundary that is not the top of it.
    expect(walk([album([song([one, two])])], 2).firsts).toEqual([true, false]);
  });

  /**
   * Where the walk stands, at every draw of a run that is three tiers deep: which album, which
   * round of it, which song, which round of that — and the jumps still to come of the standing
   * part, of the song round it is inside and of the album round over that. Every one of them is
   * this cursor's, because it is the one thing that advances the tiers: a surface counting the
   * ordinal again would be a second walk that could disagree with it (principle 1).
   *
   * Two dozen draws is a whole run of fifteen jumps and the beginning of the next, so both round
   * counters come back to nought and the counts start again at what they opened on. The skipped
   * part is none of any of them: `playedRun` drops it before the cursor ever counts a jump.
   */
  it("says where it stands and how much of each tier is still to come, at every draw", () => {
    const [one, skipped, two, three, four] = [
      part({ length: 2 }),
      part({ skip: true }),
      part(),
      part(),
      part(),
    ];
    const first = song([one, skipped, two], 2);
    const second = song([three]);
    const last = song([four]);
    const opening = album([first, second], 2);
    const closing = album([last]);
    // Fifteen jumps to the run: three of the first song twice over, one of the second, all of it
    // twice for the album, and one for the album after it. Each count is its own round's — the
    // song's is a pass through its parts, the album's is a pass through its songs — so the album's
    // runs seven down to nought and then does it again under the second round counter.
    const round = [
      at(opening, 0, first, 0, "1,2,6"),
      null,
      at(opening, 0, first, 0, "0,0,4"),
      at(opening, 0, first, 1, "1,2,3"),
      null,
      at(opening, 0, first, 1, "0,0,1"),
      at(opening, 0, second, 0, "0,0,0"),
      at(opening, 1, first, 0, "1,2,6"),
      null,
      at(opening, 1, first, 0, "0,0,4"),
      at(opening, 1, first, 1, "1,2,3"),
      null,
      at(opening, 1, first, 1, "0,0,1"),
      at(opening, 1, second, 0, "0,0,0"),
      at(closing, 0, last, 0, "0,0,0"),
    ];
    expect(walk([opening, closing], 24).places).toEqual([...round, ...round.slice(0, 9)]);
  });

  // The voice is read once per boundary and never per jump, which is what makes a part a part: a
  // part lasting three jumps is asked for once (0176).
  it("reads a part's numbers at its own first jump and at no other", () => {
    const held = part({ length: 3 });
    expect(walk([album([song([held])])], 6)).toMatchObject({ asked: 2 });
  });

  /**
   * Which jump one part's own first jump is, which is what an audition winds the walk to (0181).
   * It counts what the cursor hands out — every round of every tier before it — so it agrees with
   * the walk rather than restating it.
   */
  it("counts the jumps to a part's own first standing, over every round before it", () => {
    const [one, two, three] = [part({ length: 3 }), part({ length: 4 }), part({ length: 5 })];
    const albums = [album([song([one], 2)], 2), album([song([two, three])])];
    expect(albumsOnset(albums, one.id)).toBe(0);
    // Two rounds of the song, twice over for the album, at three jumps each.
    expect(albumsOnset(albums, two.id)).toBe(12);
    expect(albumsOnset(albums, three.id)).toBe(16);
    // A part nothing plays has no first jump at all: null rather than the top of the run, which
    // would audition whatever stands there instead (principle 5).
    expect(albumsOnset([album([song([one], 0)])], one.id)).toBeNull();
    expect(albumsOnset(albums, "part-nobody-minted")).toBeNull();
  });

  /**
   * What a solo does, which is the one thing it does: the run becomes that part alone, in one
   * album of one song, and a run of one part comes round — so the walk plays it over and over for
   * as long as the solo is held (0190). Derived and never written.
   */
  it("makes the run the one part being soloed, and plays it over and over", () => {
    const [one, two] = [part({ length: 2 }), part({ length: 3 })];
    const albums = [album([song([one]), song([two])])];
    const spec = { ...AMOUNTS, albums };
    expect(albumsParts(soloAlbums(spec, two.id).albums)).toEqual([two]);
    expect(spec.albums).toBe(albums);
    const { parts } = walk(soloAlbums(spec, two.id).albums, 6);
    expect(parts.filter((id) => id !== null)).toEqual([two.id, two.id]);
  });

  /**
   * And it is the identity wherever a solo cannot be honoured — nothing soloed, a pattern drawing
   * its own arrangement, a part no album holds, and one every tier over it passes over. Each is
   * refused loudly at the command that asked for it (principle 5, src/app/deckPlayer.ts).
   */
  it("hands the run back untouched wherever a solo cannot be honoured", () => {
    const [one, passed] = [part(), part()];
    const albums = [album([song([one]), song([passed], 0)])];
    const spec = { ...AMOUNTS, albums };
    expect(soloAlbums(spec, null)).toBe(spec);
    expect(soloAlbums(spec, "part-nobody-minted")).toBe(spec);
    expect(soloAlbums(spec, passed.id)).toBe(spec);
    expect(soloAlbums({ ...spec, arrange: 2 }, one.id).albums).toBe(albums);
  });

  /**
   * The three reads every surface holding a run makes of it: every part it holds, whichever tier
   * a hand has open, and the two rebuilds an edit is — a part written where it stands, and a
   * song's parts replaced whole (0089, plan §2).
   */
  it("reads a run flat, opens the first until a hand says otherwise, and rebuilds in place", () => {
    const [one, two] = [part(), part()];
    const first = song([one]);
    const second = song([two]);
    const held = album([first, second]);
    const albums = [held];
    expect(albumsParts(albums)).toEqual([one, two]);
    // The first of a run until a hand points at another, and the first again where the one it
    // pointed at has gone: a view preference names a thing, and a name nothing answers is no
    // selection at all (plan §2).
    expect(openIn(albums, null)).toBe(held);
    expect(openIn(held.songs, second.id)).toBe(second);
    expect(openIn(held.songs, "song-nobody-minted")).toBe(first);
    expect(openIn<PlayerSong>([], null)).toBeUndefined();
    const renamed = withAlbumsPart(albums, two.id, (each) => ({ ...each, name: "Break" }));
    expect(albumsParts(renamed).map((each) => each.name)).toEqual([one.name, "Break"]);
    expect(albumsParts(withSongParts(albums, held.id, second.id, [one, two]))).toEqual([
      one,
      one,
      two,
    ]);
  });
});

/** The four amounts at what a switch press leaves them, which is what a solo case reads to know
 *  no arrangement is being drawn (0158). */
const AMOUNTS = {
  arrange: 0,
  arrangeKeep: 0,
  arrangeChance: 0,
  arrangeReturn: 0,
  arrangeAmount: 1,
  arrangeGrow: 0,
  arrangeSpan: 0,
  arrangeApart: 0,
};

/** A whole spec at its defaults, which is what the validator is handed a field of at a time. */
const SPEC = { seed: 11, ...PLAYER_DEFAULTS };

// One case per refusal the shape carries, tier by tier: the length is how many fields there are
// rather than how much this block decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("what a run off the wire may be", () => {
  const PART = {
    id: "part-one",
    name: "Riff",
    skip: false,
    voice: partVoice(SPEC),
    length: 4,
    steps: [],
  };
  const SONG = { id: "song-one", name: "One", plays: 1, parts: [PART] };
  const ALBUM = { id: "album-one", name: "First", plays: 1, songs: [SONG] };

  /**
   * The two tiers over a part, keyed and bounded exactly as the spec itself is: a field nobody
   * declared is a run from another build, and a count outside its range is refused rather than
   * clamped into something that plays (principle 5, 0026).
   */
  it("refuses an album or a song that is not one", () => {
    expect(assertPlayer({ ...SPEC, albums: [ALBUM] }, "a player")?.albums).toEqual([ALBUM]);
    expect(() => assertPlayer({ ...SPEC, albums: null }, "a player")).toThrow(/not an array/u);
    expect(() =>
      assertPlayer({ ...SPEC, albums: [{ ...ALBUM, songs: null }] }, "a player"),
    ).toThrow(/not an array/u);
    // A count of nought is legal — it is the skip — and one over the ceiling is not.
    expect(assertPlayer({ ...SPEC, albums: [{ ...ALBUM, plays: 0 }] }, "a player")).not.toBeNull();
    expect(() => assertPlayer({ ...SPEC, albums: [{ ...ALBUM, plays: 17 }] }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, albums: [{ ...ALBUM, plays: 1.5 }] }, "a player")).toThrow(
      /not whole/u,
    );
    const { plays: _plays, ...missing } = ALBUM;
    expect(() => assertPlayer({ ...SPEC, albums: [missing] }, "a player")).toThrow(/expected/u);
    expect(() => assertPlayer({ ...SPEC, albums: [{ ...ALBUM, name: "" }] }, "a player")).toThrow(
      /non-empty string/u,
    );
    // One album per id, one song per id across the whole run, and one part per id across it too: a
    // selection, a solo and an audition all name a part by its id alone, so two of anything under
    // one id are two things nothing could tell apart (0157).
    expect(() => assertPlayer({ ...SPEC, albums: [ALBUM, { ...ALBUM }] }, "a player")).toThrow(
      /repeats the id/u,
    );
    const twice = { ...ALBUM, id: "album-two", songs: [{ ...SONG, id: "song-two" }] };
    expect(() => assertPlayer({ ...SPEC, albums: [ALBUM, twice] }, "a player")).toThrow(
      /repeats the id/u,
    );
    // And the two bounds the lists themselves carry, which is the same eight said twice.
    const many = Array.from({ length: PLAYER_ALBUM_MAX + 1 }, () => ALBUM);
    expect(() => assertPlayer({ ...SPEC, albums: many }, "a player")).toThrow(/over/u);
    const long = Array.from({ length: PLAYER_SONG_MAX + 1 }, () => SONG);
    expect(() =>
      assertPlayer({ ...SPEC, albums: [{ ...ALBUM, songs: long }] }, "a player"),
    ).toThrow(/over/u);
  });

  /**
   * And the parts inside them, checked part by part. Every field of a part is durable and reaches
   * the walk, so a part carrying a number outside its own range, lasting no jumps or keyed like
   * another build's is refused as loudly (principle 5, 0176).
   */
  it("refuses a part that is not one, field by field", () => {
    const held = (parts: unknown) => ({
      ...SPEC,
      albums: [{ ...ALBUM, songs: [{ ...SONG, parts }] }],
    });
    expect(() => assertPlayer(held(null), "a player")).toThrow(/not an array/u);
    expect(() => assertPlayer(held([PART, { ...PART }]), "a player")).toThrow(/repeats the id/u);
    expect(() => assertPlayer(held([{ ...PART, length: 0 }]), "a player")).toThrow(/outside/u);
    expect(() => assertPlayer(held([{ ...PART, length: 1.5 }]), "a player")).toThrow(/not whole/u);
    // The captured spec goes through the one validator, so a part's numbers are bounded by the very
    // ranges the card's own are and there is no second copy of them to drift (0176).
    expect(() => assertPlayer(held([{ ...PART, voice: { ...PART.voice, gate: 2 } }]), "a")).toThrow(
      /outside/u,
    );
    expect(() =>
      assertPlayer(held([{ ...PART, voice: { ...PART.voice, repeats: 3.7 } }]), "a"),
    ).toThrow(/not whole/u);
    // Keyed like the spec itself, and so is the spec it carries: a part with a field nobody
    // declared is a part from another build, and so is one carrying a field a part may not (0158).
    const { length: _length, ...short } = PART;
    expect(() => assertPlayer(held([short]), "a player")).toThrow(/expected/u);
    expect(() =>
      assertPlayer(held([{ ...PART, voice: { ...PART.voice, arrange: 2 } }]), "a"),
    ).toThrow(/expected/u);
    expect(() => assertPlayer(held([{ ...PART, name: "" }]), "a player")).toThrow(
      /non-empty string/u,
    );
    expect(() => assertPlayer(held([{ ...PART, skip: 1 }]), "a player")).toThrow(/not a boolean/u);
    // And the row a hand wrote it as, checked by the module that says what a cell may be — an
    // empty one is a part the dials draw and is the ordinary case, so it is not an error (0188).
    const written = { ...PART, steps: [{ slot: 3, repeats: 2, rest: 1 }] };
    expect(assertPlayer(held([written]), "a player")).not.toBeNull();
    expect(() => assertPlayer(held([{ ...PART, steps: null }]), "a player")).toThrow(
      /not an array/u,
    );
    const strayed = { ...PART, steps: [{ slot: PLAYER_SLOTS, repeats: 1, rest: 0 }] };
    expect(() => assertPlayer(held([strayed]), "a player")).toThrow(/outside/u);
  });

  /** And the smallest run there is, which is what a solo is heard as: one album of one song. */
  it("builds one album of one song from a run of parts", () => {
    const one = albumOfParts("album-one", "song-one", "First", [PART]);
    expect(assertPlayer({ ...SPEC, albums: [one] }, "a player")?.albums).toEqual([one]);
  });
});
