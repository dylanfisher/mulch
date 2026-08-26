/**
 * @role The two questions a command that needs sound asks before it does anything: whether there
 *   is an audio host at all, and whether the deck it names holds any. Each refusal has one wording
 *   here rather than one per handler — a deck with nothing loaded is one fact however it was
 *   reached, and the refusal tests match these strings (principle 1).
 * @instead What a command does once they are answered → src/app/execute.ts and the files it
 *   dispatches to, which is where these were written until the hard line cap made the second
 *   caller a move (0045, 0181). The graph they reach for → src/app/engine.ts.
 */
import { deckIn, type DeckId } from "@/state/store";
import type { Command } from "./commands";
import type { Engine } from "./engine";
import type { Runtime } from "./runtime";

/**
 * The audio host, or an error on the log saying why the command did nothing. A command that
 * needs sound is not malformed when there is no context — it is unanswerable, and the log is
 * where an agent finds that out.
 */
export function audio(rt: Runtime, cmd: Command["t"]): Engine | null {
  if (rt.engine !== null) return rt.engine;
  rt.bus.emit({ t: "error", detail: `no audio host: ${cmd} needs an AudioContext` });
  return null;
}

/**
 * Whether a deck holds nothing, said once on the log. Every transport command asks it and asks
 * it the same way, so the wording is here rather than in each of them — the refusal tests match
 * this string, and a deck with nothing loaded is one fact however you reached it.
 */
export function refuseUnloaded(rt: Runtime, deck: DeckId): boolean {
  if (deckIn(rt.store.getState().decks, deck).duration > 0) return false;
  rt.bus.emit({ t: "error", detail: `deck ${deck} has nothing loaded` });
  return true;
}
