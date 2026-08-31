/**
 * @role What the tier over a part promises: a song plays its parts, goes round as many times as it
 *   says, a count of nought is passed over, and the run wraps past the last song (P170). What the
 *   place carried on every step of a walk says, which is the same cursor read one seam out. And
 *   what the one validator refuses, field by field — the shape is durable, so a run from another
 *   build, the three-tier one this replaced included, is not a run.
 * @instead What one part promises the cursor that hands it out, and everything a drawn arrangement
 *   is → src/lib/playerSong.test.ts. The walk those parts unfold into → src/lib/playerWalk.test.ts.
 */
// Over the line cap, and what is over it is one case per promise the two tiers make: the shape,
// the round counter, the skip, the wrap, the place at every draw and on every step, and the
// validator's refusals field by field. Splitting it would put the shape's cases in one file and
// the bound on that shape in another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { partVoice, type PlayerSpec, type PlayerVoice } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { assertPlayer } from "./playerWire.ts";
import { PLAYER_DISTANCE_MAX, PLAYER_DISTANCE_MIN, PLAYER_SLOTS } from "./playerSlots.ts";
import { PLAYER_SONG_MAX, type SongPart } from "./playerSong.ts";
import { playerSequence } from "./playerWalk.ts";
import {
  songOfParts,
  songsArePlayed,
  songsOnset,
  songsParts,
  createSongs,
  openIn,
  PLAYER_SONGS_MAX,
  soloSongs,
  withSongsPart,
  withSong,
  type PlayerSong,
  type SongPlace,
} from "./playerSongs.ts";

/** Every field a draw touches, which is the switch's own values but the run and the cast. */
const { songs: _songs, cast: _cast, ...PLAIN } = PLAYER_DEFAULTS;

/** A voice told apart by one number, the way src/lib/playerSong.test.ts tells one apart: this file
 *  never sees a character, so a draw here is a counter riding in `distance`. Wrapped onto the
 *  dial's own range, because the cases that read a *step* go through the one validator and a
 *  counter past sixteen is a part no walk would accept (`playerWalk`, principle 5). */
const voiceOf = (drawn: number): PlayerVoice => ({
  ...PLAIN,
  distance: PLAYER_DISTANCE_MIN + (drawn % PLAYER_DISTANCE_MAX),
});

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

/** One place as one line: where the walk stands, and the jumps still to come of the part and of
 *  the song round over it. */
const said = (place: SongPlace | null): string | null =>
  place === null ? null : `${place.song}/${place.songPlay} ${place.partLeft},${place.songLeft}`;

/** One expected place, said the way `said` says it: which song and round, and the two counts. */
const at = (held: PlayerSong, round: number, left: string): string => `${held.id}/${round} ${left}`;

/** The cursor's answers over `jumps` calls: which part each one began, the run that travelled with
 *  it, whether it was the top of that run, and where in the two tiers it fell. */
function walk(songs: readonly PlayerSong[], jumps: number) {
  let asked = 0;
  const next = createSongs(songs, (held) => {
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

/** And the pattern holding a run, on one seed: what a case about the *step* reads is the same
 *  cursor one seam out, so what moves between two of them is the run alone. */
const spec = (songs: readonly PlayerSong[]): PlayerSpec => ({
  seed: 11,
  ...PLAYER_DEFAULTS,
  songs,
});

// One case per promise the two tiers make together, and the list of them is what a run is: the
// length is how many such promises there are rather than how much this block decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("songs of parts", () => {
  // An empty list is the whole of "no arrangement", and so is a run whose every song is empty: the
  // walk is never handed a voice and never draws one.
  it("hands the walk nothing while there is nothing to walk", () => {
    const nothing = Array.from({ length: 4 }, () => null);
    expect(walk([], 4).parts).toEqual(nothing);
    expect(walk([song([])], 4).parts).toEqual(nothing);
  });

  // The parts of a song in the order they are listed, the songs of a run in theirs, and round
  // again past the last song — which is what makes a pattern come round.
  it("plays its parts, then its songs, and wraps past the last", () => {
    const [one, two, three] = [part(), part(), part()];
    const songs = [song([one, two]), song([three])];
    expect(walk(songs, 6).parts).toEqual([one.id, two.id, three.id, one.id, two.id, three.id]);
  });

  /**
   * And the tier says how many times it goes round before the next one. Song one four times, then
   * song two once, then round again — the shape the step was written for, said at the tier that
   * says it (P170).
   */
  it("plays one song its own number of times before the next", () => {
    const [one, two] = [part(), part()];
    const songs = [song([one], 4), song([two])];
    expect(walk(songs, 10).parts).toEqual([
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

  /**
   * A count of nought is the skip the part row already carries, said at the tier that counts
   * rounds: the run is held and passed over, so trying an arrangement without a song in it costs
   * one press rather than a remove and an add that would mint new ids (P170).
   */
  it("passes over a song played no times at all", () => {
    const [one, two] = [part(), part()];
    const songs = [song([one], 0), song([two])];
    expect(walk(songs, 4).parts).toEqual([two.id, two.id, two.id, two.id]);
    // And the rule asked of the list rather than walked, which is what the card reads to decide
    // whether there is an arrangement at all (principle 1, src/ui/PlayerCard.tsx).
    expect(songsArePlayed(songs)).toBe(true);
    expect(songsArePlayed([song([one], 0)])).toBe(false);
    expect(songsArePlayed([song([{ ...one, skip: true }])])).toBe(false);
    expect(songsArePlayed([])).toBe(false);
  });

  /**
   * The run that travels with each draw is the standing song's own parts, less the ones it passes
   * over, and `first` is the top of that run: a song is what a ground clocked per song ticks on
   * and what a surface reads out as the arrangement in force (0192, 0158).
   */
  it("hands out the standing song's own run, and says where it comes round", () => {
    const [one, skipped, two] = [part(), part({ skip: true }), part()];
    const songs = [song([one, skipped]), song([two])];
    const seen = walk(songs, 3);
    expect(seen.parts).toEqual([one.id, two.id, one.id]);
    expect(seen.runs).toEqual([one.id, two.id, one.id]);
    expect(seen.firsts).toEqual([true, true, true]);
    // Two parts in one song is one boundary that is not the top of it.
    expect(walk([song([one, two])], 2).firsts).toEqual([true, false]);
  });

  /**
   * Where the walk stands, at every draw: which song, which round of it — and the jumps still to
   * come of the standing part and of the song round it is inside. Both are this cursor's, because
   * it is the one thing that advances the tiers: a surface counting the ordinal again would be a
   * second walk that could disagree with it (principle 1).
   *
   * Eleven draws is a whole run of seven jumps and the beginning of the next, so the round counter
   * comes back to nought and the counts start again at what they opened on. The skipped part is
   * none of them: `playedRun` drops it before the cursor ever counts a jump.
   */
  it("says where it stands and how much of each tier is still to come, at every draw", () => {
    const [one, skipped, two, three] = [part({ length: 2 }), part({ skip: true }), part(), part()];
    const first = song([one, skipped, two], 2);
    const last = song([three]);
    // Seven jumps to the run: three of the first song twice over, and one for the song after it.
    // The song's count is a pass through its parts, so it runs down to nought and then does it
    // again under the round counter beside it.
    const round = [
      at(first, 0, "1,2"),
      null,
      at(first, 0, "0,0"),
      at(first, 1, "1,2"),
      null,
      at(first, 1, "0,0"),
      at(last, 0, "0,0"),
    ];
    expect(walk([first, last], 11).places).toEqual([...round, ...round.slice(0, 4)]);
  });

  /**
   * And the same place read one seam out, off the step a walk hands a surface rather than off the
   * cursor under it: a step is armed seconds before it sounds, so a surface that drew the
   * arrangement off the list would be drawing where the list is rather than where the pattern is
   * (0157, 0180).
   *
   * The counts come down a jump at a time, because the cursor above speaks once a part and a step
   * is one jump of it — which is what makes the countdown on a row a countdown rather than a
   * number that moves at boundaries.
   */
  it("carries where it stands on every step, counted down a jump at a time", () => {
    const held = part({ length: 3 });
    // One song of one three-jump part, going round twice: three jumps to a round, six to the whole
    // run — so the part's count and the round counter say different things at every step.
    const run = [song([held], 2)];
    const places = playerSequence(spec(run), 12).map((step) => step.place);
    expect(places.map((place) => place?.partLeft)).toEqual([2, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1, 0]);
    expect(places.map((place) => place?.songLeft)).toEqual([2, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1, 0]);
    // And the count says which round of the song it is inside, nought-based.
    expect(places.map((place) => place?.songPlay)).toEqual([0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1]);
    expect(places[0]).toMatchObject({ song: run[0]?.id });
  });

  // A pattern holding no run at all stands in no song, so there is no place to carry and none is
  // invented: null is the whole of "nothing is arranged" (0158, principle 5).
  it("carries no place at all while there is nothing to stand in", () => {
    expect(playerSequence(spec([]), 3).map((step) => step.place)).toEqual([null, null, null]);
  });

  // The voice is read once per boundary and never per jump, which is what makes a part a part: a
  // part lasting three jumps is asked for once (0176).
  it("reads a part's numbers at its own first jump and at no other", () => {
    const held = part({ length: 3 });
    expect(walk([song([held])], 6)).toMatchObject({ asked: 2 });
  });

  /**
   * Which jump one part's own first jump is, which is what an audition winds the walk to (0181).
   * It counts what the cursor hands out — every round before it — so it agrees with the walk
   * rather than restating it.
   */
  it("counts the jumps to a part's own first standing, over every round before it", () => {
    const [one, two, three] = [part({ length: 3 }), part({ length: 4 }), part({ length: 5 })];
    const songs = [song([one], 4), song([two, three])];
    expect(songsOnset(songs, one.id)).toBe(0);
    // Four rounds of the first song, at three jumps each.
    expect(songsOnset(songs, two.id)).toBe(12);
    expect(songsOnset(songs, three.id)).toBe(16);
    // A part nothing plays has no first jump at all: null rather than the top of the run, which
    // would audition whatever stands there instead (principle 5).
    expect(songsOnset([song([one], 0)], one.id)).toBeNull();
    expect(songsOnset(songs, "part-nobody-minted")).toBeNull();
  });

  /**
   * What a solo does, which is the one thing it does: the run becomes that part alone, in one
   * song, and a run of one part comes round — so the walk plays it over and over for as long as
   * the solo is held (0190). Derived and never written.
   */
  it("makes the run the one part being soloed, and plays it over and over", () => {
    const [one, two] = [part({ length: 2 }), part({ length: 3 })];
    const songs = [song([one]), song([two])];
    const held = { ...AMOUNTS, songs };
    expect(songsParts(soloSongs(held, two.id).songs)).toEqual([two]);
    expect(held.songs).toBe(songs);
    const { parts } = walk(soloSongs(held, two.id).songs, 6);
    expect(parts.filter((id) => id !== null)).toEqual([two.id, two.id]);
  });

  /**
   * And it is the identity wherever a solo cannot be honoured — nothing soloed, a pattern drawing
   * its own arrangement, a part no song holds, and one the tier over it passes over. Each is
   * refused loudly at the command that asked for it (principle 5, src/app/deckPlayer.ts).
   */
  it("hands the run back untouched wherever a solo cannot be honoured", () => {
    const [one, passed] = [part(), part()];
    const songs = [song([one]), song([passed], 0)];
    const held = { ...AMOUNTS, songs };
    expect(soloSongs(held, null)).toBe(held);
    expect(soloSongs(held, "part-nobody-minted")).toBe(held);
    expect(soloSongs(held, passed.id)).toBe(held);
    expect(soloSongs({ ...held, arrange: 2 }, one.id).songs).toBe(songs);
  });

  /**
   * The three reads every surface holding a run makes of it: every part it holds, whichever song a
   * hand has open, and the two rebuilds an edit is — a part written where it stands, and a song's
   * parts replaced whole (0089, plan §2).
   */
  it("reads a run flat, opens the first until a hand says otherwise, and rebuilds in place", () => {
    const [one, two] = [part(), part()];
    const first = song([one]);
    const second = song([two]);
    const songs = [first, second];
    expect(songsParts(songs)).toEqual([one, two]);
    // The first of a run until a hand points at another, and the first again where the one it
    // pointed at has gone: a view preference names a thing, and a name nothing answers is no
    // selection at all (plan §2).
    expect(openIn(songs, null)).toBe(first);
    expect(openIn(songs, second.id)).toBe(second);
    expect(openIn(songs, "song-nobody-minted")).toBe(first);
    expect(openIn<PlayerSong>([], null)).toBeUndefined();
    const renamed = withSongsPart(songs, two.id, (each) => ({ ...each, name: "Break" }));
    expect(songsParts(renamed).map((each) => each.name)).toEqual([one.name, "Break"]);
    expect(songsParts(withSong(songs, second.id, { parts: [one, two] }))).toEqual([one, one, two]);
    // And the same rebuild for the two fields the song row's own gestures move (principle 3).
    expect(withSong(songs, second.id, { plays: 0, name: "Break" })[1]).toEqual({
      ...second,
      plays: 0,
      name: "Break",
    });
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

// One case per refusal the shape carries: the length is how many fields there are rather than how
// much this block decides. See docs/decisions/0007-reviewed-oversized-functions.md.
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

  /**
   * The tier over a part, keyed and bounded exactly as the spec itself is: a field nobody declared
   * is a run from another build, and a count outside its range is refused rather than clamped into
   * something that plays (principle 5, 0026).
   */
  it("refuses a song that is not one", () => {
    expect(assertPlayer({ ...SPEC, songs: [SONG] }, "a player")?.songs).toEqual([SONG]);
    expect(() => assertPlayer({ ...SPEC, songs: null }, "a player")).toThrow(/not an array/u);
    // A count of nought is legal — it is the skip — and one over the ceiling is not.
    expect(assertPlayer({ ...SPEC, songs: [{ ...SONG, plays: 0 }] }, "a player")).not.toBeNull();
    expect(() => assertPlayer({ ...SPEC, songs: [{ ...SONG, plays: 17 }] }, "a player")).toThrow(
      /outside/u,
    );
    expect(() => assertPlayer({ ...SPEC, songs: [{ ...SONG, plays: 1.5 }] }, "a player")).toThrow(
      /not whole/u,
    );
    const { plays: _plays, ...missing } = SONG;
    expect(() => assertPlayer({ ...SPEC, songs: [missing] }, "a player")).toThrow(/expected/u);
    expect(() => assertPlayer({ ...SPEC, songs: [{ ...SONG, name: "" }] }, "a player")).toThrow(
      /non-empty string/u,
    );
    // And the three-tier run this shape replaced, which is a run from another build and is
    // discarded rather than repaired: a song holding songs is keyed like nothing this build
    // declares (0026, P170).
    const older = { id: "stale-one", name: "First", plays: 1, songs: [SONG] };
    expect(() => assertPlayer({ ...SPEC, songs: [older] }, "a player")).toThrow(/expected/u);
    // One song per id across the whole run, and one part per id across it too: a selection, a solo
    // and an audition all name a part by its id alone, so two of anything under one id are two
    // things nothing could tell apart (0157).
    expect(() => assertPlayer({ ...SPEC, songs: [SONG, { ...SONG }] }, "a player")).toThrow(
      /repeats the id/u,
    );
    const twice = { ...SONG, id: "song-two" };
    expect(() => assertPlayer({ ...SPEC, songs: [SONG, twice] }, "a player")).toThrow(
      /repeats the id/u,
    );
    // And the bound the list itself carries, which is the parts' own eight said one tier up.
    const many = Array.from({ length: PLAYER_SONGS_MAX + 1 }, () => SONG);
    expect(() => assertPlayer({ ...SPEC, songs: many }, "a player")).toThrow(/over/u);
    expect(PLAYER_SONGS_MAX).toBe(PLAYER_SONG_MAX);
  });

  /**
   * And the parts inside them, checked part by part. Every field of a part is durable and reaches
   * the walk, so a part carrying a number outside its own range, lasting no jumps or keyed like
   * another build's is refused as loudly (principle 5, 0176).
   */
  it("refuses a part that is not one, field by field", () => {
    const held = (parts: unknown) => ({ ...SPEC, songs: [{ ...SONG, parts }] });
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

  /** And the smallest run there is, which is what a solo is heard as: one song of these parts. */
  it("builds one song from a run of parts", () => {
    const one = songOfParts("song-one", "First", [PART]);
    expect(assertPlayer({ ...SPEC, songs: [one] }, "a player")?.songs).toEqual([one]);
  });
});
