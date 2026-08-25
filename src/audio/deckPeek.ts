/**
 * @role The shape of one deck's per-frame read, and the two operations every host that holds one
 *   performs on it: minting the one scratch object a surface reads through, and emptying it for a
 *   deck with no graph behind it. Its own file because three tiers share it — the voice that
 *   fills it, the facade that owns the scratch, and the surfaces that paint from it — and because
 *   an empty peek written out at each of those is the same fact declared three times (principle 1).
 * @instead The transport that fills one → src/audio/deck.ts. The scratch's lifetime, one object
 *   per deck → src/app/facade.ts. What the drift makes of it → src/ui/moireRows.ts.
 */
import type { PlayerVoice } from "@/lib/player";
import type { SongPart, SongPartId } from "@/lib/playerSong";
import type { EffectInstanceId } from "./effects/contract";

/**
 * What the jumps module is playing right now: which part of its song is standing, and the numbers
 * the walk is reading under it. Both null wherever no part stands — a deck holding no pattern, one
 * standing still, and a pattern with no song at all — and null is read as "the spec's own
 * numbers" by every surface, because that is what a pattern with nothing overriding it plays
 * (0157).
 *
 * A read and nothing else — no command, nothing durable, no React state (plan §2). The voice is
 * the very object the walk drew, handed on rather than copied, so a frame that reads it allocates
 * nothing (0070).
 */
export type PlayerPeek = {
  part: SongPartId | null;
  voice: PlayerVoice | null;
  /**
   * The arrangement being walked: the list a hand wrote, or the run the pattern drew for itself,
   * and null wherever no part stands. The one read a drawn song has — nothing stores one, so the
   * section that shows an arrangement reads it here and derives no second (0158). The very array
   * the walk laid, handed on rather than copied, so a frame that reads it allocates nothing.
   */
  song: readonly SongPart[] | null;
};

/** The per-frame read, written in place so a 60fps caller allocates nothing (docs/plan.md §4). */
export type DeckPeek = {
  position: number;
  meter: number;
  /**
   * How far into its own cycle each held lane is, in seconds, keyed by `paramKey`. Empty only
   * when there are no lanes: a halted deck reports the phase it is frozen at, because that is
   * where its gesture is parked and where the next play resumes it (0040). This is the whole live
   * automation read: a knob paints its dial and a preview paints its playhead from this one
   * number and the lane they already hold (0035).
   */
  automation: Map<string, number>;
  /**
   * How hard each effect instance in this deck's rack that exposes a meter is working right now,
   * keyed by instance id — gain reduction in dB for the one plugin that has one. Refilled in
   * place beside the lanes above, for the same reason (0070). An instance whose plugin meters
   * nothing is absent rather than zero, and nothing durable ever rests on this (0128).
   */
  meters: Map<EffectInstanceId, number>;
  /**
   * What the pattern is standing in, for the two surfaces that paint it: the part lit in the song
   * section and named in the card's header, and every dial the standing voice is overriding
   * (0157). Written in place beside the maps above, for the same reason.
   */
  player: PlayerPeek;
};

/**
 * A fresh scratch object. One per deck, ever, and refilled in place on every read after that: a
 * fresh object per read would be garbage sixty times a second (docs/plan.md §4).
 */
export const emptyDeckPeek = (): DeckPeek => ({
  position: 0,
  meter: 0,
  automation: new Map(),
  meters: new Map(),
  player: { part: null, voice: null, song: null },
});

/** What a deck with no graph behind it reads as. Emptied in place, never replaced. */
export function clearDeckPeek(out: DeckPeek): void {
  out.position = 0;
  out.meter = 0;
  out.automation.clear();
  out.meters.clear();
  out.player.part = null;
  out.player.voice = null;
  out.player.song = null;
}
