/**
 * @role The deterministic command order for hydrating a durable session through ordinary app
 *   behavior: sources, parameters, ordered effects, then loops.
 */
import { AUTOMATION_PARAM_IDS, PARAM_IDS } from "@/audio/params";
import type { SessionV3 } from "@/state/session";
import { DECK_IDS, fromDecks, type DeckId, type SessionState } from "@/state/store";
import type { Command } from "./commands";

export function restorationCommands(session: SessionV3): Command[] {
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
    for (const param of AUTOMATION_PARAM_IDS) {
      const lane = session.decks[deck].automation[param];
      if (lane !== undefined) commands.push({ t: "automation.set", deck, param, points: lane });
    }
  }
  for (const deck of DECK_IDS) {
    const loop = session.decks[deck].loop;
    if (loop !== null) commands.push({ t: "deck.loop", deck, in: loop.in, out: loop.out });
  }
  commands.push({ t: "deck.activate", deck: session.activeDeck });
  return commands;
}

/** Project one prepared durable checkpoint into the live store in the same registered order. */
export function restoredSessionState(
  session: SessionV3,
  durations: Readonly<Record<DeckId, number>>,
): SessionState {
  return {
    activeDeck: session.activeDeck,
    decks: fromDecks(DECK_IDS, (deck) => ({
      params: { ...session.decks[deck].params },
      automation: structuredClone(session.decks[deck].automation),
      effects: [...session.decks[deck].effects],
      source: session.decks[deck].source === null ? null : { ...session.decks[deck].source },
      duration: durations[deck],
      playing: false,
      loop: session.decks[deck].loop === null ? null : { ...session.decks[deck].loop },
    })),
  };
}
