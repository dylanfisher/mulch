/**
 * @role The words the tier over a part says: what a run of songs is called, the one sentence
 *   saying how the two tiers fit together as a grid, the dial that says how many times a song goes
 *   round, the press that arms a part, and what the grid reads out under itself. Beside
 *   src/lib/copy.ts rather than in it because that file is at the hard cap (0045, the reason
 *   src/lib/copyStrip.ts is where it is).
 * @instead What a song *is*, and the bound each of these words sits under → src/lib/playerSongs.ts.
 *   The grid itself → src/ui/PlayerGrid.tsx. What one song is called, and every other word the
 *   interface says, the badge a cell wears included → src/lib/copy.ts.
 */
import { PLAYER_SONG_LABEL, PLAYER_STANDING_LABEL, READOUT_JOIN } from "./copy.ts";
import type { SongPartId } from "./playerSong.ts";
import type { PlayerSong, PlayerSongId } from "./playerSongs.ts";

/** What the run of them is called, where the section needs a word. Titlecase per (0059). The
 *  singular is `PLAYER_SONG_LABEL`, said once in src/lib/copy.ts (principle 1). */
export const PLAYER_SONGS_LABEL = "Songs";

/**
 * How the two tiers fit together, in one sentence on the heading that folds them: a column per
 * song, a row per part, and what a press on a cell does. Said once, where the run is edited (0080).
 */
export const PLAYER_SONGS_TOOLTIP = `Arrange this pattern as a grid: a column per song, a row per part. A song plays its parts down its column and says how many times it goes round before the next; the run comes round past the last song, and a count of none passes one over. The cell playing is lit, the one coming is ringed, and pressing a cell arms it for the next boundary.`;

/**
 * The one gesture the songs heading carries beside the fold, and the only one on it that is about
 * the run rather than about a song: every song off at once, for a pattern arranged by trying
 * columns that is quicker to empty than to unpick. The word on it is `CLEAR_ALL_LABEL`, said once
 * in src/lib/copy.ts so this heading and the rack's cannot drift apart (principle 1); what is here
 * is the sentence this list says about itself.
 */
export const PLAYER_SONGS_CLEAR_TOOLTIP = `Take every song off this pattern. One press, one undo — the whole run comes back a step back, and the pattern draws its own arrangement meanwhile.`;

/**
 * The question that press is asked first: it takes every named column at once, so it says how many
 * are going and waits to be told again, exactly as the rack's own clear does
 * (`effectsClearTitle`, src/ui/EffectRack.tsx). The count is the whole point of the sentence, so
 * it is minted here beside the words rather than at the surface that shows it.
 */
export const playerSongsClearTitle = (held: number): string =>
  `${held} ${held === 1 ? PLAYER_SONG_LABEL : PLAYER_SONGS_LABEL} In The Run`;
export const PLAYER_SONGS_CLEAR_CONFIRM_LABEL = `Clear The ${PLAYER_SONGS_LABEL}`;

/** What the dial saying how many times a run goes round is called under it. One word, like every
 *  caption — and not "Jumps", which is the part's own count one tier down (0059). */
export const PLAYER_PLAYS_LABEL = "Plays";
export const PLAYER_PLAYS_TOOLTIP = `How many times this goes round before the next one. None passes it over without taking it out of the run.`;

/**
 * What the press that fills a cell does: the run jumps to that part at the next part boundary and
 * carries on from there. A launch grid's whole argument is that the next thing is the thing a hand
 * presses (0275).
 */
export const PLAYER_ARM_TOOLTIP = `Play this part next: the run jumps to it at the next part boundary and carries on from there. Press again to let the run keep its own order.`;

/** What the press on a column's head does: picks the song for the row under the grid, and
 *  nothing about what plays (plan §2). */
export const PLAYER_SONG_PICK_TOOLTIP = `Fill the row under the grid with this song, to name it, say how many times it plays, move it, copy it or take it away. A view and nothing else: which one is picked changes nothing about what plays.`;

/** The two words the foot line says before the part that is coming: the run's own next turn, or
 *  the one a hand queued. Titlecase per (0059). */
export const PLAYER_NEXT_LABEL = "Next";
export const PLAYER_ARMED_LABEL = "Armed";

/** What the section says while a pattern is arranged as nothing at all. The shape in words, which
 *  is what an empty grid cannot say for itself. */
export const PLAYER_SONGS_EMPTY = `No songs: every jump is drawn from the dials as they stand. Add one, and parts down its column, and they play in turn.`;

/**
 * The run as the card reads it out beside the seed: its songs by the names they were given, in
 * order. Outside the fold and in muted text, for the reason the seed is — what a pattern is
 * arranged as is legible without opening anything (P98, 0153). The top tier only: eight songs of
 * eight parts is not a line of text, and the tier a hand chose the order of is the one that says
 * what the performance is.
 */
export const songsLabel = (songs: readonly PlayerSong[]): string =>
  songs.map((song) => song.name).join(READOUT_JOIN);

/** The song of that id, or nothing — a foot line is written once a frame, and a frame may not
 *  throw on a step drawn under a list an edit has since replaced (0070). */
const songNamed = (songs: readonly PlayerSong[], id: PlayerSongId): PlayerSong | undefined =>
  songs.find((song) => song.id === id);

/** Where the run stands, said the one way: the song, and the part under it — both tiers, because
 *  a song is a run and a cursor over it and half of that place is a list. */
export const standingSaid = (
  songs: readonly PlayerSong[],
  song: PlayerSongId,
  part: SongPartId,
): string => {
  const held = songNamed(songs, song);
  const named = held?.parts.find((each) => each.id === part)?.name ?? "";
  return `${PLAYER_STANDING_LABEL} ${held?.name ?? ""}${READOUT_JOIN}${named}`;
};

/** The name a part is called, found by its id across the run — for the foot line, which names
 *  what is coming and never counts where it is. Beside the two sentences the foot line is written
 *  from, because it is the third of them (principle 1). */
export const partNamed = (songs: readonly PlayerSong[], id: SongPartId): string => {
  for (const song of songs) {
    const part = song.parts.find((held) => held.id === id);
    if (part !== undefined) return part.name;
  }
  return "";
};

/** Which round of that song, of how many — the one amount the tier over a part carries. */
export const playsSaid = (
  songs: readonly PlayerSong[],
  song: PlayerSongId,
  songPlay: number,
): string => `${PLAYER_PLAYS_LABEL} ${songPlay + 1} of ${songNamed(songs, song)?.plays ?? 0}`;
