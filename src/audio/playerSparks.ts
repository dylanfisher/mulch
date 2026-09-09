/**
 * @role The companions one landing throws, built: one source at a slot of its own each, through a
 *   gain held at the landing's spark level and into the landing's own fader, opened evenly up to
 *   the fraction the delay says (P123, 0175). Its own file because src/audio/player.ts is at the
 *   hard cap and this is the one block of it a landing's count grows (0045).
 * @instead Where a companion reads and how many there are → src/lib/playerWalk.ts, which draws a
 *   jump per spark. Where the delays come from → src/lib/playerSpark.ts. Reading one slot end to
 *   end, and where a spark's cursor answers → src/audio/player.ts, which holds both.
 */
import { PLAYER_FADE_SECS } from "@/lib/player";
import { sparkStartOf } from "@/lib/playerSpark";
import type { PlayerStep } from "@/lib/playerWalk";

/** One companion of one landing, as the transport holds it. */
export type Spark = {
  source: AudioBufferSourceNode;
  /** Its level gain, held here for the reason the source is: what a step is made of is what a step
   *  has to let go of, and a node dropped without being disconnected is still wired in. */
  level: GainNode;
  /** Where it reads and the window it loops there, so a cursor can answer off it. */
  slot: number;
  span: number;
  /** And when it began, which is the one instant it does not share with the landing (0175). */
  at: number;
};

/** One slot read end to end, as src/audio/player.ts builds one for the landing itself: the
 *  companion and the landing that threw it differ by nothing else, which is why they share it.
 *  Declared here and imported there, so the one signature is written once (principle 1). */
export type ReadSlot = (
  slot: number,
  into: AudioNode,
  begins: number,
  tune: (source: AudioBufferSourceNode) => void,
) => { source: AudioBufferSourceNode; span: number };

/**
 * The companions of one landing, empty where it threw none. Each hangs under the landing's own
 * `fader`, so it takes the landing's window, its count, its stop, its direction and every seam but
 * the one it opens on — everything a spark has of its own is its slot, its level and where it
 * begins (P123).
 *
 * They are handed back to be held on the landing's own queue entry rather than pushed on as
 * entries of their own: `position` answers off the latest entry the clock is at or past, and a
 * companion in that list would win the scan and walk the cursor away from the pattern (P123).
 */
export function buildSparks(
  ctx: BaseAudioContext,
  fader: GainNode,
  sparked: PlayerStep["sparked"],
  /** The landing's own window: when it starts and when it ends, both on the graph's clock. */
  at: number,
  ends: number,
  readSlot: ReadSlot,
  /** What the landing's own source was tuned to, applied to each companion — the ladder it climbs
   *  and the detune it reads at, copied off the landing rather than bound (P123, 0031). */
  tune: (source: AudioBufferSourceNode) => void,
): Spark[] {
  if (sparked === null) return [];
  return sparked.slots.map((slot, index) => {
    const level = ctx.createGain();
    level.connect(fader);
    // A fraction of the landing's own window less a seam, and the fraction is the whole bound: no
    // reading of either dial can start a spark at or after its own stop, at any burst, count or
    // rate, so nothing downstream checks that one did (0175, 0166).
    const begins =
      at +
      sparkStartOf(index, sparked.slots.length, sparked.delay) *
        Math.max(0, ends - at - PLAYER_FADE_SECS);
    // The one seam a spark writes for itself: undelayed it opens under a fader still at zero,
    // delayed it would step the sum by a whole second read in one sample (0104, 0175). Straight
    // rather than equal-power — it opens over its own silence — and no automation at all at none,
    // so that pattern lays the graph it always laid.
    if (begins > at) {
      level.gain.value = 0;
      level.gain.setValueAtTime(0, begins);
      level.gain.linearRampToValueAtTime(sparked.level, begins + PLAYER_FADE_SECS);
    } else {
      level.gain.value = sparked.level;
    }
    const read = readSlot(slot, level, begins, tune);
    return { source: read.source, level, slot, span: read.span, at: begins };
  });
}
