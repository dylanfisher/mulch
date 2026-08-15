/**
 * @role The deterministic command order for hydrating a durable deck preset through ordinary app
 *   behavior: sources, parameters, ordered effects, bypass, automation, then loops. One stage
 *   list serves startup restoration and clip application alike (0027).
 */
import { AUTOMATION_PARAM_IDS, PARAM_IDS } from "@/audio/params";
import type { Session, SessionDeck } from "@/state/session";
import { DECK_IDS, fromDecks, type DeckId, type SessionState } from "@/state/store";
import type { Command, GroupedEditCommand } from "./commands";

/** One stage of the restoration order, for one deck's durable preset. */
type Stage = (deck: DeckId, preset: SessionDeck) => GroupedEditCommand[];

// The order, written once. Bypass follows every addition because it names an effect the rack
// must already hold (0023); a lane follows the rack for the same reason (0024); a loop follows
// the source it is clamped into.
const STAGES: readonly Stage[] = [
  (deck, preset) =>
    preset.source === null ? [] : [{ t: "deck.load", deck, source: preset.source }],
  (deck, preset) =>
    PARAM_IDS.map((param) => ({ t: "param.set", deck, param, value: preset.params[param] })),
  (deck, preset) => preset.effects.map((effect) => ({ t: "effect.add", deck, effect })),
  (deck, preset) =>
    preset.bypassed.map((effect) => ({ t: "effect.bypass", deck, effect, bypassed: true })),
  (deck, preset) =>
    AUTOMATION_PARAM_IDS.flatMap((param) => {
      const lane = preset.automation[param];
      return lane === undefined ? [] : [{ t: "automation.set", deck, param, points: lane }];
    }),
  (deck, preset) =>
    preset.loop === null
      ? []
      : [{ t: "deck.loop", deck, in: preset.loop.in, out: preset.loop.out }],
];

/** One deck restored from one durable preset, in the registered stage order. */
export function deckRestorationCommands(deck: DeckId, preset: SessionDeck): GroupedEditCommand[] {
  return STAGES.flatMap((stage) => stage(deck, preset));
}

export function restorationCommands(session: Session): Command[] {
  // Stage-major across decks: every source loads before any parameter is set, so a deck never
  // waits on another deck's stage to reach its own.
  const commands: Command[] = STAGES.flatMap((stage) =>
    DECK_IDS.flatMap((deck) => stage(deck, session.decks[deck])),
  );
  commands.push({ t: "deck.activate", deck: session.activeDeck });
  return commands;
}

/**
 * One deck rewritten to be exactly a clip: everything the preset does not carry is cleared
 * first, then the same restoration stages run. Every effect currently held is removed rather
 * than kept and reordered, because `effect.add` refuses an effect the rack already holds and
 * the preset's order has to be the final one (0027).
 */
export function clipRestorationCommands(
  deck: DeckId,
  current: SessionDeck,
  preset: SessionDeck,
): GroupedEditCommand[] {
  const cleared: GroupedEditCommand[] = current.effects.map((effect) => ({
    t: "effect.remove",
    deck,
    effect,
  }));
  for (const param of AUTOMATION_PARAM_IDS) {
    if (current.automation[param] === undefined) continue;
    if (preset.automation[param] !== undefined) continue;
    cleared.push({ t: "automation.set", deck, param, points: [] });
  }
  return [...cleared, ...deckRestorationCommands(deck, preset)];
}

/** Project one prepared durable checkpoint into the live store in the same registered order. */
export function restoredSessionState(
  session: Session,
  durations: Readonly<Record<DeckId, number>>,
): SessionState {
  return {
    activeDeck: session.activeDeck,
    decks: fromDecks(DECK_IDS, (deck) => ({
      params: { ...session.decks[deck].params },
      automation: structuredClone(session.decks[deck].automation),
      effects: [...session.decks[deck].effects],
      bypassed: [...session.decks[deck].bypassed],
      source: session.decks[deck].source === null ? null : { ...session.decks[deck].source },
      duration: durations[deck],
      // Derived, not restored: the engine re-requests it for every buffer it commits (0025).
      analysis: null,
      playing: false,
      loop: session.decks[deck].loop === null ? null : { ...session.decks[deck].loop },
    })),
    // Inert durable data: a clip has nothing for the graph to prepare, so it restores by copy.
    clips: structuredClone(session.clips),
  };
}
