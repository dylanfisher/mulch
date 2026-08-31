/**
 * @role The words the tier over a part says: what a run of songs is called, the one sentence
 *   saying how the two tiers fit together, the dial that says how many times a song goes round,
 *   and what the card reads out beside the seed. Beside src/lib/copy.ts rather than in it because
 *   that file is at the hard cap (0045, the reason src/lib/copyStrip.ts is where it is).
 * @instead What a song *is*, and the bound each of these words sits under → src/lib/playerSongs.ts.
 *   The rows themselves → src/ui/PlayerSongRow.tsx. What one song is called, and every other word
 *   the interface says, the badge these rows wear included → src/lib/copy.ts.
 */
import { READOUT_JOIN } from "./copy.ts";
import type { PlayerSong } from "./playerSongs.ts";

/** What the run of them is called, where the section needs a word. Titlecase per (0059). The
 *  singular is `PLAYER_SONG_LABEL`, said once in src/lib/copy.ts (principle 1). */
export const PLAYER_SONGS_LABEL = "Songs";

/**
 * How the two tiers fit together, in one sentence on the heading that folds them: a song plays its
 * parts, and it says how many times it goes round. Said once, where the run is edited (0080).
 */
export const PLAYER_SONGS_TOOLTIP = `Arrange this pattern as songs of parts: a song plays its parts in turn and says how many times it goes round before the next. The run comes round past the last song, and a count of none passes one over.`;

/** What the dial saying how many times a run goes round is called under it. One word, like every
 *  caption — and not "Jumps", which is the part's own count one tier down (0059). */
export const PLAYER_PLAYS_LABEL = "Plays";
export const PLAYER_PLAYS_TOOLTIP = `How many times this goes round before the next one. None passes it over without taking it out of the run.`;

/** The press that fills the area below with one song's parts: a view of the run and never an edit
 *  of it, which is why it says "Open" and not "Select" (plan §2). */
export const PLAYER_SONG_OPEN_LABEL = "Open";
export const PLAYER_SONG_OPEN_TOOLTIP = `Show what this holds in the list below. A view and nothing else: which one is open changes nothing about what plays.`;

/** What the section says while a pattern is arranged as nothing at all. The shape in words, which
 *  is what an empty list cannot say for itself. */
export const PLAYER_SONGS_EMPTY = `No songs: every jump is drawn from the dials as they stand. Add one and its parts play in turn.`;

/**
 * The run as the card reads it out beside the seed: its songs by the names they were given, in
 * order. Outside the fold and in muted text, for the reason the seed is — what a pattern is
 * arranged as is legible without opening anything (P98, 0153). The top tier only: eight songs of
 * eight parts is not a line of text, and the tier a hand chose the order of is the one that says
 * what the performance is.
 */
export const songsLabel = (songs: readonly PlayerSong[]): string =>
  songs.map((song) => song.name).join(READOUT_JOIN);
