/**
 * @role The tier over a part: the songs a pattern is a run of, each a named thing in an order a
 *   hand chose, carrying how many times it plays — and the cursor that walks that run into the
 *   parts under it (P170). One tier and not two: a tier has to earn a fact of its own, and a
 *   second run shaped exactly like this one earned none. The validator for that shape lives here
 *   too, beside it, the way a ground's does (0184, src/lib/playerBed.ts). Pure maths: no clock, no
 *   context, no PRNG.
 * @instead What one part is, what a song's own parts are walked as, and everything a drawn
 *   arrangement is → src/lib/playerSong.ts. The walk that unfolds a part into steps →
 *   src/lib/playerWalk.ts. The words these rows wear → src/lib/copySongs.ts. The spec that holds
 *   the songs, and the one validator this one is called from → src/lib/player.ts and
 *   src/lib/playerWire.ts.
 */
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
 * How many songs one pattern may hold: `PLAYER_SONG_MAX` said one tier up. A run a hand cannot
 * read off a list without counting is a run it cannot arrange, and that number does not change
 * because the things in the list got bigger — so it is derived here rather than typed again,
 * exactly as `PLAYER_ARRANGE_MAX` is (principle 1).
 */
export const PLAYER_SONGS_MAX = PLAYER_SONG_MAX;

/**
 * How many times one song goes round before the next one, 0…16.
 *
 * **Nought is the skip**, which is the whole of why there is no second field beside this: a part
 * row carries a switch because a part's own count is jumps and one jump is the least a part can
 * last, and this counts *rounds*, where nought is a thing a hand can mean. A run passed over and a
 * run played no times at all are one fact, so they are one number (principle 1, 0158's rule said
 * for a count).
 *
 * Sixteen for the reason every other keep in this module stops there: past it the thing going
 * round outlasts anything a listener holds it against.
 */
export const PLAYER_PLAYS_MIN = 0;
export const PLAYER_PLAYS_MAX = 16;

/** A song's own opaque durable id — a part's id said one tier up (0157). */
export type PlayerSongId = string;

/**
 * Where a walk stands in the two tiers, and how much of each of them is still to come. The whole
 * of what the cursor below knows at a boundary, said once and carried: `createSongs` is the one
 * thing that advances the tiers, so nothing else may derive a place from the ordinal and disagree
 * with it (principle 1, 0221).
 *
 * **An id and not an index for the song**, because what reads it is a row, and a row is keyed by
 * the id it was minted with exactly as a part's is (0157). Which *part* is standing is not here at
 * all: the draw carries the part and the step carries its id, and a place saying it again would be
 * the same fact written twice.
 *
 * **The two counts are jumps, and they are the jumps after the one this place is on** — nought is
 * the last jump of the thing it counts, and each includes everything the tier under it still owes.
 * `songLeft` counts the song's own *round* and never its whole run: a round is what `plays` counts
 * and the rounds still to come are what the counter beside it says (`PLAYER_PLAYS_MAX`). Jumps
 * rather than seconds: how long a jump lasts is a fact about the dials and the grid, which this
 * file may not reach (src/lib/player.ts, src/ui/PlayerSong.tsx).
 */
export type SongPlace = {
  song: PlayerSongId;
  /** Which round of that song the walk is inside, nought-based: the first round is 0. */
  songPlay: number;
  partLeft: number;
  songLeft: number;
};

/**
 * One song: the parts it is a run of, and how many times that run goes round before the next song.
 * Everything a part is but the numbers a part carries — an id nothing derives, a name a hand
 * typed, a count, and the tier under it.
 */
export type PlayerSong = {
  id: PlayerSongId;
  name: string;
  /** How many times its parts go round before the next song, 0…`PLAYER_PLAYS_MAX`. Nought is
   *  the skip. Whole. */
  plays: number;
  parts: readonly SongPart[];
};

/**
 * What adding one leaves it at: played once, holding nothing yet. Declared once so the gesture
 * that adds one and any test that reads it agree (principle 1) — the id and the name are minted at
 * the gesture, exactly as a part's are (`PLAYER_PART_DEFAULTS`).
 */
export const PLAYER_PLAYS_DEFAULT = 1;
export const PLAYER_SONG_DEFAULTS: Omit<PlayerSong, "id" | "name"> = {
  plays: PLAYER_PLAYS_DEFAULT,
  parts: [],
};

/** One song holding these parts, played once — the smallest run that plays them, which is what a
 *  solo is heard as and what a pattern with one thing to say is arranged as. */
export const songOfParts = (
  song: PlayerSongId,
  name: string,
  parts: readonly SongPart[],
): PlayerSong => ({ id: song, name, plays: 1, parts });

/** The smallest run a bare list of parts stands in: one song, played once, under an id of this
 *  function's own. What a pattern with one thing to say is arranged as, and what a case about
 *  parts alone builds the tier over them with (P170). */
export const oneSong = (parts: readonly SongPart[]): readonly PlayerSong[] => [
  songOfParts("one-song", "One", parts),
];

/** Which of the run is open in the section below: the one a hand pointed at, or the first, which
 *  is what "open" means before a hand has pointed at anything. A view preference and never
 *  durable: no command, nothing durable, no history entry (plan §2). */
export const openIn = <Held extends { id: string }>(
  run: readonly Held[],
  id: string | null,
): Held | undefined => run.find((held) => held.id === id) ?? run[0];

/** The run with one song's fields replaced — its parts, its count or its name — which is the road
 *  every gesture on a song row and on a part row takes: the whole spec goes out in one
 *  `deck.player`, so the edit is a rebuild of the tree above the field rather than a write into it
 *  (0089). One function for all three, because a run rebuilt around one id is one piece of
 *  arithmetic however many fields the gesture moved (principle 3). */
export function withSong(
  songs: readonly PlayerSong[],
  song: PlayerSongId,
  fields: Partial<Omit<PlayerSong, "id">>,
): readonly PlayerSong[] {
  return songs.map((held) => (held.id === song ? { ...held, ...fields } : held));
}

/** Every part the run holds, in the order the songs hold them and once each however many rounds
 *  it stands in: what a surface looking a part up by its id reads, since a part id is unique across
 *  the whole spec and its place in the tree is not a thing the id says (0157). What it is *not* is
 *  the run as heard — a caller drawing that asks `playedRun` first. */
export function songsParts(songs: readonly PlayerSong[]): readonly SongPart[] {
  const parts: SongPart[] = [];
  for (const song of songs) parts.push(...song.parts);
  return parts;
}

/** The same run with one part replaced wherever it stands, which is the road every dial pointed at
 *  a part takes: the whole spec goes out in one `deck.player`, so the edit is a rebuild of the
 *  tree above the part rather than a write into it (0089, src/ui/PlayerCard.tsx). */
export function withSongsPart(
  songs: readonly PlayerSong[],
  id: SongPartId,
  next: (part: SongPart) => SongPart,
): readonly PlayerSong[] {
  return songs.map((song) => ({
    ...song,
    parts: song.parts.map((part) => (part.id === id ? next(part) : part)),
  }));
}

/**
 * Whether anything at all is walked: a song that plays, holding a part it does not pass over. A
 * rule and never a second field, asked here rather than answered again at each surface (principle
 * 1). What "holding a part it does not pass over" means is `songIsPlayed`'s, one tier down, and it
 * is called rather than said again here: a run and a song that disagreed about whether a song is
 * played would be two answers to one question.
 */
export const songsArePlayed = (songs: readonly PlayerSong[]): boolean =>
  songs.some((song) => song.plays > PLAYER_PLAYS_MIN && songIsPlayed(song.parts));

/** The run as the cursor below actually walks it: songs and parts that play, with anything emptied
 *  by that filter dropped — a song whose every part is passed over is passed over too, because a
 *  round of nothing is not a round. Taken once at the build rather than at every jump, the way a
 *  skipped part's pass already is (0089, 0070). */
export function playedRun(songs: readonly PlayerSong[]): PlayerSong[] {
  const played: PlayerSong[] = [];
  for (const song of songs) {
    if (song.plays <= PLAYER_PLAYS_MIN) continue;
    const parts = song.parts.filter((part) => !part.skip);
    if (parts.length > 0) played.push({ ...song, parts });
  }
  return played;
}

/** Every song the run stands in, in the order it stands in them and once per round it plays —
 *  which is the whole of what the cursor below walks, said as a sequence for the one caller that
 *  wants the arithmetic rather than the cursor (`songsOnset`). */
function* playedSongs(songs: readonly PlayerSong[]): Generator<PlayerSong> {
  for (const song of playedRun(songs)) {
    for (let round = 0; round < song.plays; round++) yield song;
  }
}

/** How many jumps one run of parts lasts: every part's own length summed. Called on the played run
 *  alone, where a part passed over has already been dropped — so a jump counted here is a jump the
 *  walk actually takes (`playedRun`). */
const runJumps = (parts: readonly SongPart[]): number =>
  parts.reduce((jumps, part) => jumps + part.length, 0);

/**
 * The pattern's cursor: the song's own cursor with one tier over it, answering one shape so
 * nothing below this line knows how many tiers there are (src/lib/playerWalk.ts). Call it once per
 * jump for the part that jump begins, or null while the part standing goes on.
 *
 * A song plays its parts and says how many times it goes round before the next one — so the parts
 * run out into the song's next round, and the songs wrap past the last one, which is what makes a
 * pattern come round.
 *
 * The arrangement that travels with each draw is the standing song's own parts, and `first` is the
 * top of that run: a song is what a ground clocked per song ticks on and what a surface reads out
 * as the arrangement in force, and both were true of the one song there used to be (0192, 0158).
 *
 * Stateful, and the state is a cursor rather than a fact: built fresh at every walk and re-derived
 * by replaying, which is what lets a knob moved mid-pattern re-derive its tail (0089, 0096).
 */
// One cursor per tier, held as indices rather than as two nested closures: what is over the length
// cap is the paragraph on each of them saying which count hands over to which. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createSongs(
  songs: readonly PlayerSong[],
  voiceOf: (part: SongPart, index: number) => PlayerVoice,
): () => SongDraw | null {
  const played = playedRun(songs);
  /** Where the walk stands: which song, which round of it, and which part — plus the jumps of the
   *  standing part still to come, and whether a part has stood at all, since the first jump begins
   *  the first part rather than the one after it. */
  let song = 0;
  let songPlay = 0;
  let part = 0;
  let left = 0;
  let begun = false;

  /** One boundary on, innermost tier first: a run that has run out hands the count to the tier
   *  over it, and the top of the songs wraps back onto the first. */
  const advance = (): void => {
    const held = played[song];
    if (held === undefined) return;
    part++;
    if (part < held.parts.length) return;
    part = 0;
    songPlay++;
    if (songPlay < held.plays) return;
    songPlay = 0;
    song = (song + 1) % played.length;
  };

  /** The cursors above read out as one shape, at the boundary the part begins: where the walk
   *  stands, and the jumps still to come of the part and of the song round over it. The rounds
   *  still to run are counted at the tier that owns them, so a place is arithmetic on what this
   *  cursor already holds rather than a second walk of the run. */
  const placeOf = (held: PlayerSong, standing: SongPart): SongPlace => {
    const partLeft = standing.length - 1;
    // The round and not the whole tier: what is left of this pass through the song's parts — the
    // rounds still to come are the *next* round's, which is the counter beside it (`songPlay`).
    const songLeft = partLeft + runJumps(held.parts.slice(part + 1));
    return { song: held.id, songPlay, partLeft, songLeft };
  };

  return () => {
    if (played.length === 0) return null;
    if (left > 0) {
      left--;
      return null;
    }
    if (begun) advance();
    begun = true;
    const held = played[song];
    const standing = held?.parts[part];
    if (held === undefined || standing === undefined) return null;
    // This call is the part's own first jump, so what is left is every jump but it.
    left = standing.length - 1;
    return {
      part: standing,
      voice: voiceOf(standing, part),
      song: held.parts,
      first: part === 0,
      place: placeOf(held, standing),
    };
  };
}

/**
 * How many jumps into the run one part's own first jump falls, or null where that part never
 * stands at all — one no song holds, and one the tier over it passes over. What an audition winds
 * the walk to (0181, src/audio/player.ts), and the first standing and not a later one: a pattern
 * comes round, so the nearest is the one a press means.
 */
export function songsOnset(songs: readonly PlayerSong[], id: SongPartId): number | null {
  let at = 0;
  for (const song of playedSongs(songs)) {
    for (const part of song.parts) {
      if (part.id === id) return at;
      at += part.length;
    }
  }
  return null;
}

/**
 * The run as it is being *heard* while one part is soloed: that part alone, in one song, which a
 * walk plays over and over because a pattern comes round. The one author of what a solo does,
 * called by the transport that plays it and by the picture that draws it (0190).
 *
 * **Total, and the identity wherever a solo cannot be honoured** — nothing soloed, a pattern
 * drawing its own arrangement, a part no song holds or the tier over it passes over. Each is
 * refused loudly at the command that asked for it
 * (src/app/deckPlayer.ts, principle 5); here the answer has to be a run, and the honest one is the
 * run itself.
 */
export function soloSongs<Spec extends ArrangementSpec & { songs: readonly PlayerSong[] }>(
  spec: Spec,
  solo: SongPartId | null,
): Spec {
  if (solo === null || songIsDrawn(spec)) return spec;
  for (const song of playedRun(spec.songs)) {
    const part = song.parts.find((held) => held.id === solo);
    if (part === undefined) continue;
    return { ...spec, songs: [songOfParts(song.id, song.name, [part])] };
  }
  return spec;
}

/** The fields one song is keyed against, read exactly as the spec's own are. */
const SONG_FIELDS = ["id", "name", "plays", "parts"] as const;

/** The id and the name a song carries, checked the way every other durable id is: opaque text of a
 *  bounded length, one per list, and never the empty string (0157, principle 5). */
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
 * The songs off the wire or out of storage, checked. An empty list is the whole of "no
 * arrangement" and is the ordinary case, so it is not an error (0153).
 *
 * Loud about everything else, for the reason every durable field is: a song is carried by a
 * command, and a pattern quietly playing a run nobody set is exactly what principle 5 refuses.
 * Keyed like the spec itself — no extra fields and none missing, so a run of the old three-tier
 * shape is refused rather than repaired (0026).
 *
 * `partsOf` is the caller's because the parts a song holds are checked by the one validator that
 * says what a player's numbers are, and this file knows nothing about those numbers (principle 1,
 * src/lib/playerWire.ts).
 */
export function songsOf(
  value: unknown,
  at: string,
  partsOf: (value: unknown, at: string) => readonly SongPart[],
): readonly PlayerSong[] {
  if (!Array.isArray(value)) throw new TypeError(`${at} is not an array`);
  if (value.length > PLAYER_SONGS_MAX) {
    throw new RangeError(`${at} has ${value.length} songs, over ${PLAYER_SONGS_MAX}`);
  }
  const songs = new Set<string>();
  /** One set for every part of the spec rather than one per song: a selection, a solo and an
   *  audition all name a part by its id alone, so two parts under one id in two different songs
   *  are two things nothing could tell apart (0157). */
  const parts = new Set<string>();
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
