/**
 * @role The shape of one deck's per-frame read, and the two operations every host that holds one
 *   performs on it: minting the one scratch object a surface reads through, and emptying it for a
 *   deck with no graph behind it. Its own file because three tiers share it — the voice that
 *   fills it, the facade that owns the scratch, and the surfaces that paint from it — and because
 *   an empty peek written out at each of those is the same fact declared three times (principle 1).
 * @instead The transport that fills one → src/audio/deck.ts. The scratch's lifetime, one object
 *   per deck → src/app/facade.ts. What the drift makes of it → src/ui/moireRows.ts.
 */
import type { EffectInstanceId } from "./effects/contract";

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
});

/** What a deck with no graph behind it reads as. Emptied in place, never replaced. */
export function clearDeckPeek(out: DeckPeek): void {
  out.position = 0;
  out.meter = 0;
  out.automation.clear();
  out.meters.clear();
}
