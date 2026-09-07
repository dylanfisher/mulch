/**
 * @role Where each deck that is playing right now has read to, for the decks a checkpoint about
 *   to be restored still gives something to play — the one read a restore takes of each voice's
 *   playhead, so an undo changes what the instrument sounds like and never whether it is sounding
 *   (0052, 0067).
 * @instead The restore itself — preparing the graph, replacing the session, seeking and playing
 *   the carried decks — stays in src/app/facade.ts, whose `restoreCheckpoint` is the one caller.
 */
import type { DeckPeek } from "@/audio/deckPeek";
import { deckIn, holdsDeck, type DeckId, type SessionStore } from "@/state/store";
import type { Session } from "@/state/session";
import type { Engine } from "./engine";

/**
 * Rebuilding a voice that was playing is a restart and a restart is not a stop (0052): an undo
 * changes what the instrument sounds like, never whether it is sounding. A deck the checkpoint
 * holds no source for has nothing to resume, and one it does not hold at all is leaving with the
 * voice. A deck whose source the checkpoint changes is not resumed either: a playhead belongs to
 * the buffer it was read from, and carrying it onto different audio would land wherever that
 * buffer happened to end. `scratch` is the caller's one refilled peek object (0070).
 */
export function playingPositions(
  engine: Engine | null,
  store: SessionStore,
  target: Session,
  scratch: DeckPeek,
): Map<DeckId, number> {
  const carried = new Map<DeckId, number>();
  if (engine === null) return carried;
  for (const { id: deck } of target.deckList) {
    if (!holdsDeck(store.getState().deckList, deck)) continue;
    const restored = deckIn(target.decks, deck).source;
    if (restored === null) continue;
    const held = deckIn(store.getState().decks, deck).source;
    if (JSON.stringify(held) !== JSON.stringify(restored)) continue;
    if (!engine.planned(deck)) continue;
    engine.peek(deck, scratch);
    carried.set(deck, scratch.position);
  }
  return carried;
}
