/**
 * @role The two tiers above a part: the songs an album is a run of, and the albums a pattern is a
 *   run of. Each tier is the tier under it said again — a named thing, in an order a hand chose,
 *   carrying how many times it plays — so the cursor that walks all three is one function and the
 *   shape is one shape (P147). The validator for that shape lives here too, beside it, the way a
 *   ground's does (0184, src/lib/playerBed.ts). Pure maths: no clock, no context, no PRNG.
 * @instead What one part is, what a song's own parts are walked as, and everything a drawn
 *   arrangement is → src/lib/playerSong.ts. The walk that unfolds a part into steps →
 *   src/lib/playerWalk.ts. The words these rows wear → src/lib/copyAlbum.ts. The spec that holds
 *   the albums, and the one validator this one is called from → src/lib/player.ts and
 *   src/lib/playerWire.ts.
 */
// Over the 400-line soft cap, and what is over it is this module's own paragraphs: three tiers of
// one shape, the cursor that walks all three, and the validator that refuses a run from another
// build — each carrying the argument for why it is that way, which exists nowhere else. Splitting
// the shape from the validator that keys it would put a field in one file and its bound in
// another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { assertDurableText, objectAt, whole } from "./guards.ts";
import type { PlayerVoice } from "./player.ts";
import {
  PLAYER_SONG_MAX,
  songIsDrawn,
  songIsPlayed,
  type ArrangementSpec,
  type SongDraw,
  type SongPart,
  type SongPartId,
} from "./playerSong.ts";

/**
 * How many albums one pattern may hold, and how many songs one album may: `PLAYER_SONG_MAX` said
 * one tier up and then another. A run a hand cannot read off a list without counting is a run it
 * cannot arrange, and that number does not change because the things in the list got bigger — so
 * it is derived here rather than typed again, exactly as `PLAYER_ARRANGE_MAX` is (principle 1).
 */
export const PLAYER_ALBUM_MAX = PLAYER_SONG_MAX;
export const PLAYER_ALBUM_SONGS_MAX = PLAYER_SONG_MAX;

/**
 * How many times one album or one song goes round before the next one, 0…16.
 *
 * **Nought is the skip**, which is the whole of why there is no second field beside this: a part
 * row carries a switch because a part's own count is jumps and one jump is the least a part can
 * last, and these two count *rounds*, where nought is a thing a hand can mean. A run passed over
 * and a run played no times at all are one fact, so they are one number (principle 1, 0158's rule
 * said for a count).
 *
 * Sixteen for the reason every other keep in this module stops there: past it the thing going
 * round outlasts anything a listener holds it against.
 */
export const PLAYER_PLAYS_MIN = 0;
export const PLAYER_PLAYS_MAX = 16;

/** A song's and an album's own opaque durable id — a part's id said one and two tiers up (0157). */
export type PlayerSongId = string;
export type PlayerAlbumId = string;

/**
 * Where a walk stands in the three tiers, and how much of each of them is still to come. The whole
 * of what the cursor below knows at a boundary, said once and carried: `createAlbums` is the one
 * thing that advances the tiers, so nothing else may derive a place from the ordinal and disagree
 * with it (principle 1, 0221).
 *
 * **Ids and not indices for the two tiers**, because what reads them is a row, and a row is keyed
 * by the id it was minted with exactly as a part's is (0157). Which *part* is standing is not here
 * at all: the draw carries the part and the step carries its id, and a place saying it again would
 * be the same fact written twice.
 *
 * **The three counts are jumps, and they are the jumps after the one this place is on** — nought is
 * the last jump of the thing it counts, and each includes everything the tier under it still owes.
 * Each counts its own *round* and never the tier's whole run: the song round the walk is inside,
 * and the album round over that, because a round is what a `plays` counts and the rounds still to
 * come are what the two counters beside them say (`PLAYER_PLAYS_MAX`). Jumps rather than seconds:
 * how long a jump lasts is a fact about the dials and the grid, which this file may not reach
 * (src/lib/player.ts, src/ui/PlayerSong.tsx).
 */
export type SongPlace = {
  album: PlayerAlbumId;
  /** Which round of that album the walk is inside, nought-based: the first round is 0. */
  albumPlay: number;
  song: PlayerSongId;
  /** And which round of that song, on the same terms. */
  songPlay: number;
  partLeft: number;
  songLeft: number;
  albumLeft: number;
};

/**
 * One song: the parts it is a run of, and how many times that run goes round before the next song
 * of the album. Everything a part is but the numbers a part carries — an id nothing derives, a
 * name a hand typed, a count, and the tier under it.
 */
export type PlayerSong = {
  id: PlayerSongId;
  name: string;
  /** How many times its parts go round before the next song, 0…`PLAYER_PLAYS_MAX`. Nought is
   *  the skip. Whole. */
  plays: number;
  parts: readonly SongPart[];
};

/** One album: the songs it plays in turn, and how many times it plays them. `PlayerSong` again. */
export type PlayerAlbum = {
  id: PlayerAlbumId;
  name: string;
  /** How many times its songs go round before the next album, 0…`PLAYER_PLAYS_MAX`. Whole. */
  plays: number;
  songs: readonly PlayerSong[];
};

/**
 * What adding one leaves it at: played once — the count both tiers reset to, declared once so the
 * dial on either row snaps back to the same number (principle 1) — holding nothing yet. Declared once so the gesture
 * that adds one and any test that reads it agree (principle 1) — the id and the name are minted at
 * the gesture, exactly as a part's are (`PLAYER_PART_DEFAULTS`).
 */
export const PLAYER_PLAYS_DEFAULT = 1;
export const PLAYER_SONG_DEFAULTS: Omit<PlayerSong, "id" | "name"> = {
  plays: PLAYER_PLAYS_DEFAULT,
  parts: [],
};
export const PLAYER_ALBUM_DEFAULTS: Omit<PlayerAlbum, "id" | "name"> = {
  plays: PLAYER_PLAYS_DEFAULT,
  songs: [],
};

/** One album of one song holding these parts — the smallest run that plays them, which is what a
 *  solo is heard as and what a pattern with one thing to say is arranged as. */
export const albumOfParts = (
  album: PlayerAlbumId,
  song: PlayerSongId,
  name: string,
  parts: readonly SongPart[],
): PlayerAlbum => ({
  id: album,
  name,
  plays: 1,
  songs: [{ id: song, name, plays: 1, parts }],
});

/** The smallest run a bare list of parts stands in: one album of one song, each played once, under
 *  ids of this function's own. What a pattern with one thing to say is arranged as, and what a
 *  case about parts alone builds the two tiers over them with (P147). */
export const oneAlbum = (parts: readonly SongPart[]): readonly PlayerAlbum[] => [
  albumOfParts("one-album", "one-song", "One", parts),
];

/** Which of a run is open in the section below: the one a hand pointed at, or the first, which is
 *  what "open" means before a hand has pointed at anything. One function for both tiers, because
 *  a tier shaped like the tier under it is read the same way (P147). A view preference and never
 *  durable: no command, nothing durable, no history entry (plan §2). */
export const openIn = <Held extends { id: string }>(
  run: readonly Held[],
  id: string | null,
): Held | undefined => run.find((held) => held.id === id) ?? run[0];

/** The run with one song's parts replaced, which is the road every gesture on a part row takes:
 *  the whole spec goes out in one `deck.player`, so the edit is a rebuild of the tree above the
 *  parts rather than a write into it (0089). */
export function withSongParts(
  albums: readonly PlayerAlbum[],
  album: PlayerAlbumId,
  song: PlayerSongId,
  parts: readonly SongPart[],
): readonly PlayerAlbum[] {
  return albums.map((held) =>
    held.id === album
      ? {
          ...held,
          songs: held.songs.map((each) => (each.id === song ? { ...each, parts } : each)),
        }
      : held,
  );
}

/** Every part the run holds, in the order the albums hold them and once each however many rounds
 *  it stands in: what a surface looking a part up by its id reads, since a part id is unique across
 *  the whole spec and its place in the tree is not a thing the id says (0157). What it is *not* is
 *  the run as heard — a caller drawing that asks `playedRun` first. */
export function albumsParts(albums: readonly PlayerAlbum[]): readonly SongPart[] {
  const parts: SongPart[] = [];
  for (const album of albums) for (const song of album.songs) parts.push(...song.parts);
  return parts;
}

/** The same run with one part replaced wherever it stands, which is the road every dial pointed at
 *  a part takes: the whole spec goes out in one `deck.player`, so the edit is a rebuild of the
 *  tree above the part rather than a write into it (0089, src/ui/PlayerCard.tsx). */
export function withAlbumsPart(
  albums: readonly PlayerAlbum[],
  id: SongPartId,
  next: (part: SongPart) => SongPart,
): readonly PlayerAlbum[] {
  return albums.map((album) => ({
    ...album,
    songs: album.songs.map((song) => ({
      ...song,
      parts: song.parts.map((part) => (part.id === id ? next(part) : part)),
    })),
  }));
}

/**
 * Whether anything at all is walked: an album that plays, holding a song that plays, holding a
 * part it does not pass over. A rule and never a second field, asked here rather than answered
 * again at each surface (principle 1). What "holding a part it does not pass over" means is
 * `songIsPlayed`'s, one tier down, and it is called rather than said again here: a run and a song
 * that disagreed about whether a song is played would be two answers to one question.
 */
export const albumsArePlayed = (albums: readonly PlayerAlbum[]): boolean =>
  albums.some(
    (album) =>
      album.plays > PLAYER_PLAYS_MIN &&
      album.songs.some((song) => song.plays > PLAYER_PLAYS_MIN && songIsPlayed(song.parts)),
  );

/** The run as the cursor below actually walks it: albums, songs and parts that play, with anything
 *  emptied by that filter dropped — an album whose every song is passed over is passed over too,
 *  because a round of nothing is not a round. Taken once at the build rather than at every jump,
 *  the way a skipped part's pass already is (0089, 0070). */
export function playedRun(albums: readonly PlayerAlbum[]): PlayerAlbum[] {
  const played: PlayerAlbum[] = [];
  for (const album of albums) {
    if (album.plays <= PLAYER_PLAYS_MIN) continue;
    const songs: PlayerSong[] = [];
    for (const song of album.songs) {
      if (song.plays <= PLAYER_PLAYS_MIN) continue;
      const parts = song.parts.filter((part) => !part.skip);
      if (parts.length > 0) songs.push({ ...song, parts });
    }
    if (songs.length > 0) played.push({ ...album, songs });
  }
  return played;
}

/** Every song the run stands in, in the order it stands in them and once per round it plays —
 *  which is the whole of what the cursor below walks, said as a sequence for the one caller that
 *  wants the arithmetic rather than the cursor (`albumsOnset`). */
function* playedSongs(albums: readonly PlayerAlbum[]): Generator<PlayerSong> {
  for (const album of playedRun(albums)) {
    for (let play = 0; play < album.plays; play++) {
      for (const song of album.songs) {
        for (let round = 0; round < song.plays; round++) yield song;
      }
    }
  }
}

/** How many jumps one run of parts lasts: every part's own length summed. Called on the played run
 *  alone, where a part passed over has already been dropped — so a jump counted here is a jump the
 *  walk actually takes (`playedRun`). */
const runJumps = (parts: readonly SongPart[]): number =>
  parts.reduce((jumps, part) => jumps + part.length, 0);

/**
 * The pattern's cursor: the song's own cursor with two tiers over it, answering one shape so
 * nothing below this line knows how many tiers there are (src/lib/playerWalk.ts). Call
 * it once per jump for the part that jump begins, or null while the part standing goes on.
 *
 * An album plays its songs, a song plays its parts, and each says how many times it goes round
 * before the next one — so the parts run out into the song's next round, the songs into the
 * album's, and the albums wrap past the last one, which is what makes a pattern come round.
 *
 * The arrangement that travels with each draw is the standing song's own parts, and `first` is the
 * top of that run: a song is what a ground clocked per song ticks on and what a surface reads out
 * as the arrangement in force, and both were true of the one song there used to be (0192, 0158).
 *
 * Stateful, and the state is a cursor rather than a fact: built fresh at every walk and re-derived
 * by replaying, which is what lets a knob moved mid-pattern re-derive its tail (0089, 0096).
 */
// One cursor per tier, held as indices rather than as three nested closures: what is over the
// length cap is the paragraph on each of them saying which count hands over to which. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createAlbums(
  albums: readonly PlayerAlbum[],
  voiceOf: (part: SongPart, index: number) => PlayerVoice,
): () => SongDraw | null {
  const played = playedRun(albums);
  /** Where the walk stands: which album, which round of it, which song, which round of that, and
   *  which part — plus the jumps of the standing part still to come, and whether a part has stood
   *  at all, since the first jump begins the first part rather than the one after it. */
  let album = 0;
  let albumPlay = 0;
  let song = 0;
  let songPlay = 0;
  let part = 0;
  let left = 0;
  let begun = false;

  /** One boundary on, innermost tier first: a run that has run out hands the count to the tier
   *  over it, and the top of the albums wraps back onto the first. */
  const advance = (): void => {
    const at = played[album];
    if (at === undefined) return;
    const held = at.songs[song];
    if (held === undefined) return;
    part++;
    if (part < held.parts.length) return;
    part = 0;
    songPlay++;
    if (songPlay < held.plays) return;
    songPlay = 0;
    song++;
    if (song < at.songs.length) return;
    song = 0;
    albumPlay++;
    if (albumPlay < at.plays) return;
    albumPlay = 0;
    album = (album + 1) % played.length;
  };

  /** The five cursors above read out as one shape, at the boundary the part begins: where the walk
   *  stands, and the jumps still to come of the part, of the song round over it and of the album
   *  round over that. The rounds still to run are counted at the tier that owns them, so a place is
   *  arithmetic on what this cursor already holds rather than a second walk of the run. */
  const placeOf = (at: PlayerAlbum, held: PlayerSong, standing: SongPart): SongPlace => {
    const partLeft = standing.length - 1;
    // The round and not the whole tier: what is left of this pass through the song's parts, and of
    // this pass through the album's songs — the rounds still to come are the *next* round's, which
    // is the counter beside them (`songPlay`, `albumPlay`).
    const songLeft = partLeft + runJumps(held.parts.slice(part + 1));
    let albumLeft = songLeft + (held.plays - songPlay - 1) * runJumps(held.parts);
    for (const each of at.songs.slice(song + 1)) albumLeft += runJumps(each.parts) * each.plays;
    return { album: at.id, albumPlay, song: held.id, songPlay, partLeft, songLeft, albumLeft };
  };

  return () => {
    if (played.length === 0) return null;
    if (left > 0) {
      left--;
      return null;
    }
    if (begun) advance();
    begun = true;
    const at = played[album];
    const held = at?.songs[song];
    const standing = held?.parts[part];
    if (at === undefined || held === undefined || standing === undefined) return null;
    // This call is the part's own first jump, so what is left is every jump but it.
    left = standing.length - 1;
    return {
      part: standing,
      voice: voiceOf(standing, part),
      song: held.parts,
      first: part === 0,
      place: placeOf(at, held, standing),
    };
  };
}

/**
 * How many jumps into the run one part's own first jump falls, or null where that part never
 * stands at all — one no album holds, and one every tier over it passes over. What an audition
 * winds the walk to (0181, src/audio/player.ts), and the first standing and not a later one: a
 * pattern comes round, so the nearest is the one a press means.
 */
export function albumsOnset(albums: readonly PlayerAlbum[], id: SongPartId): number | null {
  let at = 0;
  for (const song of playedSongs(albums)) {
    for (const part of song.parts) {
      if (part.id === id) return at;
      at += part.length;
    }
  }
  return null;
}

/**
 * The run as it is being *heard* while one part is soloed: that part alone, in one album of one
 * song, which a walk plays over and over because a pattern comes round. The one author of what a
 * solo does, called by the transport that plays it and by the picture that draws it (0190).
 *
 * **Total, and the identity wherever a solo cannot be honoured** — nothing soloed, a pattern
 * drawing its own arrangement, a part no album holds or every tier passes over. Each is refused
 * loudly at the command that asked for it
 * (src/app/deckPlayer.ts, principle 5); here the answer has to be a run, and the honest one is the
 * run itself.
 */
export function soloAlbums<Spec extends ArrangementSpec & { albums: readonly PlayerAlbum[] }>(
  spec: Spec,
  solo: SongPartId | null,
): Spec {
  if (solo === null || songIsDrawn(spec)) return spec;
  for (const album of playedRun(spec.albums)) {
    for (const song of album.songs) {
      const part = song.parts.find((held) => held.id === solo);
      if (part === undefined) continue;
      return { ...spec, albums: [albumOfParts(album.id, song.id, song.name, [part])] };
    }
  }
  return spec;
}

/** The fields one album and one song are keyed against, read exactly as the spec's own are. */
const ALBUM_FIELDS = ["id", "name", "plays", "songs"] as const;
const SONG_FIELDS = ["id", "name", "plays", "parts"] as const;

/** The id and the name every tier carries, checked the way every other durable id is: opaque text
 *  of a bounded length, one per list, and never the empty string (0157, principle 5). */
function namedAt(raw: Record<string, unknown>, where: string, seen: Set<string>): [string, string] {
  const id: unknown = raw["id"];
  assertDurableText(id, `${where} id`);
  if (seen.has(id)) throw new TypeError(`${where} repeats the id ${id}`);
  seen.add(id);
  const name: unknown = raw["name"];
  assertDurableText(name, `${where} name`);
  return [id, name];
}

/**
 * The albums off the wire or out of storage, checked. An empty list is the whole of "no
 * arrangement" and is the ordinary case, so it is not an error (0153).
 *
 * Loud about everything else, for the reason every durable field is: an album is carried by a
 * command, and a pattern quietly playing a run nobody set is exactly what principle 5 refuses.
 * Keyed like the spec itself — no extra fields and none missing.
 *
 * `partsOf` is the caller's because the parts a song holds are checked by the one validator that
 * says what a player's numbers are, and this file knows nothing about those numbers (principle 1,
 * src/lib/playerWire.ts).
 */
export function albumsOf(
  value: unknown,
  at: string,
  partsOf: (value: unknown, at: string) => readonly SongPart[],
): readonly PlayerAlbum[] {
  if (!Array.isArray(value)) throw new TypeError(`${at} is not an array`);
  if (value.length > PLAYER_ALBUM_MAX) {
    throw new RangeError(`${at} has ${value.length} albums, over ${PLAYER_ALBUM_MAX}`);
  }
  const albums = new Set<string>();
  /** One set for every song of the spec and one for every part of it, rather than one per list:
   *  a selection, a solo and an audition all name a part by its id alone, so two parts under one
   *  id in two different songs are two things nothing could tell apart (0157). */
  const songs = new Set<string>();
  const parts = new Set<string>();
  return value.map((raw: unknown, index: number): PlayerAlbum => {
    const where = `${at}[${index}]`;
    const album = objectAt(raw, where);
    const keys = Object.keys(album);
    if (keys.length !== ALBUM_FIELDS.length || ALBUM_FIELDS.some((f) => !Object.hasOwn(album, f))) {
      throw new TypeError(`${where} has ${keys.join(", ")}, expected ${ALBUM_FIELDS.join(", ")}`);
    }
    const [id, name] = namedAt(album, where, albums);
    return {
      id,
      name,
      plays: whole(album["plays"], PLAYER_PLAYS_MIN, PLAYER_PLAYS_MAX, `${where} plays`),
      songs: songsOf(album["songs"], `${where} songs`, songs, parts, partsOf),
    };
  });
}

/** One album's songs, checked exactly as the albums above are — the same shape, so the same
 *  keying, the same bound and the same guards (principle 1). */
function songsOf(
  value: unknown,
  at: string,
  songs: Set<string>,
  parts: Set<string>,
  partsOf: (value: unknown, at: string) => readonly SongPart[],
): readonly PlayerSong[] {
  if (!Array.isArray(value)) throw new TypeError(`${at} is not an array`);
  if (value.length > PLAYER_ALBUM_SONGS_MAX) {
    throw new RangeError(`${at} has ${value.length} songs, over ${PLAYER_ALBUM_SONGS_MAX}`);
  }
  return value.map((raw: unknown, index: number): PlayerSong => {
    const where = `${at}[${index}]`;
    const song = objectAt(raw, where);
    const keys = Object.keys(song);
    if (keys.length !== SONG_FIELDS.length || SONG_FIELDS.some((f) => !Object.hasOwn(song, f))) {
      throw new TypeError(`${where} has ${keys.join(", ")}, expected ${SONG_FIELDS.join(", ")}`);
    }
    const [id, name] = namedAt(song, where, songs);
    const held = partsOf(song["parts"], `${where} parts`);
    for (const part of held) {
      if (parts.has(part.id)) throw new TypeError(`${where} parts repeats the id ${part.id}`);
      parts.add(part.id);
    }
    return {
      id,
      name,
      plays: whole(song["plays"], PLAYER_PLAYS_MIN, PLAYER_PLAYS_MAX, `${where} plays`),
      parts: held,
    };
  });
}
