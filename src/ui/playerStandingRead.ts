/**
 * @role One yard's once-a-frame read of what its pattern is standing at: the reader every dial on
 *   the mulcher card paints from, and the per-frame memo behind it (0218).
 * @instead The prop a dial is handed that reader as, and what it does with it → src/ui/PlayerDial.tsx.
 *   The card that builds one per yard → src/ui/PlayerCard.tsx, which this was the top of until
 *   P164 needed the room under the hard cap (0045). The frame stamp itself → src/ui/frame.ts.
 */
import type { Instrument } from "@/app/facade";
import type { PlayerVoice } from "@/lib/player";
import type { DeckId } from "@/state/store";
import { frameStamp } from "@/ui/frame";
import type { PlayerVoiceReader } from "@/ui/PlayerDial";

/** What one yard's dials are all painting from, and the frame it was read on. */
type StoodAt = { read: number; voice: PlayerVoice | null };

/**
 * One entry per yard, because the answer belongs to the deck and not to whoever asked: there is one
 * mulcher card per yard, and a reader the card rebuilt mid-frame finds the frame already read
 * rather than taking it again. Kept beside the deck the way the facade keeps its own peek scratch,
 * and never cleared for the same reason — an entry for a departed yard is one number nobody asks
 * for (src/app/facade.ts).
 */
const readAt = new Map<DeckId, StoodAt>();

/**
 * The yard's own per-frame read of what the pattern is standing at, asked once a frame however many
 * dials read it. Forty-five dials each peeked for themselves, and a peek refills the deck's whole
 * read — the meter's own time-domain copy and its two reductions among them — so a playing card
 * paid for forty-five of those every frame to answer forty-five questions that cannot move inside
 * one frame. Measured at 1.7% of the wall clock of a drag on this card, about half of everything
 * the one loop was doing (P151, docs/decisions/0218-a-card-peeks-once-a-frame.md).
 *
 * The loop's own stamp and not a clock of this card's: a memo of what does not change between two
 * reads inside one frame, which is the only per-frame cache the boundaries allow (0070,
 * src/ui/frame.ts). What it holds is the standing step's *voice*, the walk's own object rather than
 * the scratch it arrived in — and nothing ever writes to a voice (src/lib/playerWalk.ts) — so a
 * peek somebody else takes on this deck in the same frame cannot rewrite it underneath.
 *
 * Read from inside the loop and nowhere else, which is where every dial reads it: the stamp moves
 * only while the loop is running, so a caller off it would hold whatever the last frame left. A
 * dial handed `animate={false}` would be exactly that caller, and none is (src/ui/Knob.tsx).
 */
export const standingVoice =
  (instrument: Instrument, deck: DeckId): PlayerVoiceReader =>
  (knob) => {
    const frame = frameStamp();
    let held = readAt.get(deck);
    if (held === undefined || held.read !== frame) {
      // Peeked before the frame is marked read: a peek throws for a deck the session has removed,
      // and a read that had already claimed the frame would answer the forty-four dials after it
      // with the frame before rather than with the same error (principle 5, src/app/facade.ts).
      const voice = instrument.peek(deck).player.step?.voice ?? null;
      held = { read: frame, voice };
      readAt.set(deck, held);
    }
    return held.voice?.[knob] ?? null;
  };
