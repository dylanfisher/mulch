/**
 * @role The deterministic command order for hydrating a durable session through ordinary app
 *   behavior: sources, parameters, ordered effects, then loops.
 */
import { PARAM_IDS } from "@/audio/params";
import type { SessionV1 } from "@/state/session";
import { DECK_IDS } from "@/state/store";
import type { Command } from "./commands";

export function restorationCommands(session: SessionV1): Command[] {
  const commands: Command[] = [];
  for (const deck of DECK_IDS) {
    const source = session.decks[deck].source;
    if (source !== null) commands.push({ t: "deck.load", deck, source });
  }
  for (const deck of DECK_IDS) {
    for (const param of PARAM_IDS) {
      commands.push({ t: "param.set", deck, param, value: session.decks[deck].params[param] });
    }
  }
  for (const deck of DECK_IDS) {
    for (const effect of session.decks[deck].effects) {
      commands.push({ t: "effect.add", deck, effect });
    }
  }
  for (const deck of DECK_IDS) {
    const loop = session.decks[deck].loop;
    if (loop !== null) commands.push({ t: "deck.loop", deck, in: loop.in, out: loop.out });
  }
  return commands;
}
