/**
 * @role The shape of one deck's per-frame read, and the two operations every host that holds one
 *   performs on it: minting the one scratch object a surface reads through, and emptying it for a
 *   deck with no graph behind it. Its own file because three tiers share it — the voice that
 *   fills it, the facade that owns the scratch, and the surfaces that paint from it — and because
 *   an empty peek written out at each of those is the same fact declared three times (principle 1).
 * @instead The transport that fills one → src/audio/deck.ts. The scratch's lifetime, one object
 *   per deck → src/app/facade.ts. What the drift makes of it → src/ui/moireRows.ts.
 */
import type { PlayerStep } from "@/lib/playerWalk";
import type { EffectInstanceId, GrownEffect } from "./effects/contract";

/**
 * What the jumps module is playing right now: the very step the walk drew for the landing the
 * clock is inside, and where that step falls in this pass. Both null wherever nothing is standing
 * — a deck holding no pattern, one standing still, and one whose pass has not begun — and a step
 * whose `part` and `voice` are null is read as "the spec's own numbers" by every surface, because
 * that is what a pattern with nothing overriding it plays (0157).
 *
 * The step itself rather than three fields copied off it. `part`, `voice` and `song` are all
 * fields of the standing `PlayerStep`, and a peek that named them again was one fact declared
 * three times (principle 1) — while everything else a picture of the walk needs, from the repeats
 * to the spark, was unreachable. Handed on rather than copied, so a frame that reads it allocates
 * nothing (0070).
 *
 * A read and nothing else — no command, nothing durable, no React state (plan §2).
 */
export type PlayerPeek = {
  /** The step the landing the clock is inside was drawn as, or null while nothing stands. */
  step: PlayerStep | null;
  /**
   * That step's ordinal in this pass, counting from the first landing the pass laid down. What
   * lets a surface say which of the steps it has walked for itself is the one sounding, so a
   * picture of the walk needs no cursor of its own (`playerScope.ts`). It survives a knob move,
   * because `rearm` winds the walk's own cursor back over exactly the steps it drops.
   */
  at: number | null;
  /**
   * Where the spark of the landing the clock is inside is reading, in buffer seconds, or null
   * wherever there is none — a landing that threw one, and a delayed one only once its own start
   * has passed (0175). A second reported position on the one queue entry and never a second queue:
   * the deck's own `position` above goes on answering off the landing, which is why a spark rides
   * that landing's entry at all (0166). The jumps module's rather than the deck's, because a deck
   * that is not jumping has no such read to report — and named for the position it is rather than
   * for the field it comes from: `spark` on the spec is the odds a landing throws one.
   */
  sparkPosition: number | null;
};

/** The per-frame read, written in place so a 60fps caller allocates nothing (docs/plan.md §4). */
export type DeckPeek = {
  position: number;
  meter: number;
  /**
   * How washed this deck's own end sounds, in the unit it is measured in: the crest of the meter's
   * own window, peak over RMS (`DeckChain.crest`), where higher is drier. Raw as the meter beside
   * it is raw — what a picture makes of it is the picture's, and `washAmount` is the one place that
   * turns a crest into how washed something is (0213). 0 for a window with nothing in it, which is
   * the crest saying it measured nothing rather than a wash of none. One number for the whole deck
   * and not a map: an output belongs to no item, which is why nothing keys it.
   */
  crest: number;
  /**
   * How long this deck has been sounding without a break, in seconds. **Elapsed continuous
   * sounding and not wall time**: a paused instrument is not a maturing one and a session left
   * open overnight has not been anywhere, so it counts from the instant the worklet reported the
   * standing plan started and any halt sends it back to nought. Raw seconds, the way the crest
   * above is raw — what a picture makes of them is `driftAge` (src/lib/moireAge.ts) and nowhere
   * else. Nothing durable rests on it: it is a reading of the transport exactly as `position` is
   * (0145, 0128).
   */
  sounding: number;
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
   * What each instance holding a run of its own is holding right now, keyed by that instance's id
   * — the automator's rows, and nothing else so far. Refilled in place beside the meters above,
   * for the same reason, and every array in it is the rack's own rather than a fresh one (0070).
   * Nothing durable ever rests on it: the run is drawn from a seed and never stored (0204).
   */
  grown: Map<EffectInstanceId, GrownEffect[]>;
  /**
   * How long each of those runs is being held still, in seconds, keyed by the same instance id —
   * nought for one that is running and `Infinity` under a hold with no end. Its own map beside the
   * rows rather than a field on each of them, because a hold belongs to the instance and not to
   * any one place it laid. Refilled in place for the reason the maps above are (0070), and nothing
   * durable rests on it: what is stored is the length a hand asked for, and how much of it is left
   * is derived from the instant that command arrived (0215).
   */
  waits: Map<EffectInstanceId, number>;
  /**
   * The step the pattern is standing in, for the surfaces that paint it: the part lit in the song
   * section and named in the card's header, every dial the standing voice is overriding (0157),
   * and the landing the scope draws its window forward from (0180). Written in place beside the
   * maps above, for the same reason.
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
  crest: 0,
  sounding: 0,
  automation: new Map(),
  meters: new Map(),
  grown: new Map(),
  waits: new Map(),
  player: { step: null, at: null, sparkPosition: null },
});

/** What a deck with no graph behind it reads as. Emptied in place, never replaced. */
export function clearDeckPeek(out: DeckPeek): void {
  out.position = 0;
  out.meter = 0;
  out.crest = 0;
  out.sounding = 0;
  out.automation.clear();
  out.meters.clear();
  out.grown.clear();
  out.waits.clear();
  out.player.step = null;
  out.player.at = null;
  out.player.sparkPosition = null;
}
