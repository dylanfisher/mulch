/**
 * @role One yard's once-a-frame read of the deck: the peek every frame callback on a yard shares —
 *   its dials, its waveform, its automator's rows — and the per-frame memo behind it (0218).
 * @instead The read itself, and the object it refills → `peek` in src/app/facade.ts. What the
 *   pattern alone is standing at → src/ui/playerStandingRead.ts. The master bus → src/ui/masterHeard.ts.
 */
import type { DeckPeek, Instrument } from "@/app/facade";
import type { RackId } from "@/state/store";
import { frameStamp, inFrame } from "@/ui/frame";

/**
 * Which frame each rack's scratch was last refilled on, per instrument: the answer belongs to the
 * deck and not to whoever asked. Never cleared, for `standingVoice`'s reason — an entry for a
 * departed yard is one number nobody asks for — and weak on the instrument, because a page holds
 * one and a test suite holds hundreds.
 */
const readAt = new WeakMap<Instrument, Map<RackId, { read: number; out: Readonly<DeckPeek> }>>();

/**
 * What a yard is doing, asked once a frame however many of its surfaces want it. A peek refills
 * the deck's whole read — every meter, the automator's run, the pattern's queue, every lane's phase
 * — and each automated dial on a yard asked for its own, so a playing rack paid for one refill per
 * dial per frame to answer one question that cannot move inside a frame (0218, which did this for
 * the mulcher card's dials alone).
 *
 * The facade's own object is handed back, so this adds no allocation and no copy. Outside a frame —
 * a commit, a press, a painting with the loop stopped — it is a plain peek, because the stamp
 * moves only inside the tick and a memo keyed on it would hand a commit the last frame's answer.
 */
export function deckHeard(instrument: Instrument, deck: RackId): Readonly<DeckPeek> {
  if (!inFrame()) return instrument.peek(deck);
  const frame = frameStamp();
  let racks = readAt.get(instrument);
  if (racks === undefined) {
    racks = new Map();
    readAt.set(instrument, racks);
  }
  const held = racks.get(deck);
  if (held !== undefined && held.read === frame) return held.out;
  // Peeked before the frame is marked read: a peek throws for a deck the session has removed, and a
  // read that had already claimed the frame would answer the callers after it with the frame
  // before rather than with the same error (principle 5, src/app/facade.ts).
  const out = instrument.peek(deck);
  if (held === undefined) racks.set(deck, { read: frame, out });
  else {
    held.read = frame;
    held.out = out;
  }
  return out;
}
