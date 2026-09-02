/**
 * @role Which turn of the run comes after the one standing: the next part of the song, the song's
 *   own top where it has rounds still to play, or the next played song's top, coming round past
 *   the last. What a launch grid rings while nothing is armed — the ring says what is coming, and
 *   a grid that could not say so with nothing queued would be dark at exactly the moment it is
 *   read. Pure arithmetic over the played run and the standing step.
 * @instead The cursor that actually walks the run, and the played run it walks →
 *   src/lib/playerSongs.ts. The step that says where the walk is standing → src/lib/playerWalk.ts.
 */
import type { PlayerStep } from "./playerWalk.ts";
import type { SongPartId } from "./playerSong.ts";
import { playedRun, type PlayerSong, type PlayerSongId } from "./playerSongs.ts";

/** One turn of the run named by its two tiers — the song, and the part of it. */
export type SongTurn = { song: PlayerSongId; part: SongPartId };

/**
 * The turn after the one `step` is standing in, or null where nothing is standing — no step, a
 * step of a pattern holding no arrangement, a drawn run (which carries no place), or a step drawn
 * under a list the run no longer holds. Null and never a throw for that last one: this is read
 * once a frame, and a frame may not throw (0070). The order is the played run's, so a part passed
 * over or a song that plays no times is never what comes next — exactly what `createSongs` walks.
 */
export function songsAfter(songs: readonly PlayerSong[], step: PlayerStep | null): SongTurn | null {
  if (step === null || step.place === null || step.part === null) return null;
  const played = playedRun(songs);
  const at = played.findIndex((song) => song.id === step.place?.song);
  const song = played[at];
  if (song === undefined) return null;
  const partAt = song.parts.findIndex((part) => part.id === step.part);
  if (partAt < 0) return null;
  const following = song.parts[partAt + 1];
  if (following !== undefined) return { song: song.id, part: following.id };
  const top = song.parts[0];
  if (top === undefined) return null;
  if (step.place.songPlay + 1 < song.plays) return { song: song.id, part: top.id };
  const next = played[(at + 1) % played.length];
  const nextTop = next?.parts[0];
  if (next === undefined || nextTop === undefined) return null;
  return { song: next.id, part: nextTop.id };
}
