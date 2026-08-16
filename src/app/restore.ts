/**
 * @role The deterministic command order for hydrating a durable deck preset through ordinary app
 *   behavior: sources, deck parameters, rack instances, their values, bypass, automation, then
 *   loops. One stage list serves startup restoration and clip application alike (0027).
 */
import {
  DECK_AUTOMATION_PARAM_IDS,
  DECK_PARAM_IDS,
  effectAutomationParamIds,
  effectParamIds,
  paramIn,
} from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { Session, SessionDeck, SessionEffect } from "@/state/session";
import { deckIn, fromDecks, INITIAL_DECK_ID, type DeckId, type SessionState } from "@/state/store";
import type { Command, GroupedEditCommand } from "./commands";

/**
 * One stage of the restoration order, for one deck's durable preset. `held` is the set of rack
 * instances the deck already carries — empty for a fresh deck, and exactly the survivors when a
 * clip is applied over one, which is what lets an instance stay put rather than be rebuilt (0030).
 */
type Stage = (
  deck: DeckId,
  preset: SessionDeck,
  held: ReadonlySet<EffectInstanceId>,
) => GroupedEditCommand[];

// The order, written once. An instance's values follow its addition and its bypass follows both,
// because each names an instance the rack must already hold (0023, 0030); a lane follows the
// value it falls back to; a loop follows the source it is clamped into.
const STAGES: readonly Stage[] = [
  (deck, preset) =>
    preset.source === null ? [] : [{ t: "deck.load", deck, source: preset.source }],
  (deck, preset) =>
    DECK_PARAM_IDS.map((param) => ({ t: "param.set", deck, param, value: preset.params[param] })),
  (deck, preset, held): GroupedEditCommand[] => [
    ...preset.effects
      .filter((entry) => !held.has(entry.id))
      .map((entry): GroupedEditCommand => ({
        t: "effect.add",
        deck,
        id: entry.id,
        effect: entry.effect,
      })),
    // Only when something survived: a fresh deck receives the instances in order already, and a
    // reorder per entry would be a command that moves nothing.
    ...(held.size === 0
      ? []
      : preset.effects.map((entry, index): GroupedEditCommand => ({
          t: "effect.reorder",
          deck,
          instance: entry.id,
          index,
        }))),
  ],
  (deck, preset) =>
    preset.effects.flatMap((entry) =>
      effectParamIds(entry.effect).map((param) => ({
        t: "param.set",
        deck,
        instance: entry.id,
        param,
        value: paramIn(entry.params, param),
      })),
    ),
  // Stated for every entry, not only the bypassed ones: an instance the preset kept may already
  // be bypassed, and a preset that says otherwise has to be able to say so. Setting the flag it
  // already holds is a silent no-op, the way setting a parameter to its own value is (0030).
  (deck, preset) =>
    preset.effects.map((entry) => ({
      t: "effect.bypass",
      deck,
      instance: entry.id,
      bypassed: entry.bypassed,
    })),
  (deck, preset) =>
    DECK_AUTOMATION_PARAM_IDS.flatMap((param) => {
      const lane = preset.automation[param];
      return lane === undefined ? [] : [{ t: "automation.set", deck, param, points: lane }];
    }),
  (deck, preset) =>
    preset.effects.flatMap((entry) =>
      effectAutomationParamIds(entry.effect).flatMap((param) => {
        const lane = entry.automation[param];
        return lane === undefined
          ? []
          : [{ t: "automation.set", deck, instance: entry.id, param, points: lane }];
      }),
    ),
  (deck, preset) =>
    preset.loop === null
      ? []
      : [{ t: "deck.loop", deck, in: preset.loop.in, out: preset.loop.out }],
];

const NOTHING_HELD: ReadonlySet<EffectInstanceId> = new Set();

/** One deck restored from one durable preset, in the registered stage order. */
export function deckRestorationCommands(deck: DeckId, preset: SessionDeck): GroupedEditCommand[] {
  return STAGES.flatMap((stage) => stage(deck, preset, NOTHING_HELD));
}

/**
 * A fresh store holds exactly one deck, `INITIAL_DECK_ID`, so the deck list a stored session
 * asks for is reached by removing that one and adding the session's own in order. Removing it
 * unconditionally — even when the session names it too — is what makes the resulting order
 * exactly `session.deckIds` rather than that list rotated around whatever booted (0029).
 */
export function restorationCommands(session: Session): Command[] {
  const commands: Command[] = [
    { t: "deck.remove", deck: INITIAL_DECK_ID },
    ...session.deckIds.map((deck): Command => ({ t: "deck.add", deck })),
  ];
  // Stage-major across decks: every source loads before any parameter is set, so a deck never
  // waits on another deck's stage to reach its own.
  for (const stage of STAGES) {
    for (const deck of session.deckIds)
      commands.push(...stage(deck, deckIn(session.decks, deck), NOTHING_HELD));
  }
  // A session that holds no decks has nothing to activate, and says so by holding null (0029).
  if (session.activeDeck !== null) commands.push({ t: "deck.activate", deck: session.activeDeck });
  return commands;
}

/** Every lane the preset does not carry, cleared — deck-level and on each surviving instance. */
function clearedLanes(
  deck: DeckId,
  current: SessionDeck,
  preset: SessionDeck,
): GroupedEditCommand[] {
  const commands: GroupedEditCommand[] = [];
  for (const param of DECK_AUTOMATION_PARAM_IDS) {
    if (current.automation[param] === undefined) continue;
    if (preset.automation[param] !== undefined) continue;
    commands.push({ t: "automation.set", deck, param, points: [] });
  }
  for (const entry of current.effects) {
    const kept = preset.effects.find((candidate) => candidate.id === entry.id);
    if (kept === undefined) continue;
    for (const param of effectAutomationParamIds(entry.effect)) {
      if (entry.automation[param] === undefined) continue;
      if (kept.automation[param] !== undefined) continue;
      commands.push({ t: "automation.set", deck, instance: entry.id, param, points: [] });
    }
  }
  return commands;
}

/**
 * One deck rewritten to be exactly a clip. Only what the preset does not carry is cleared: an
 * instance the preset names by the same id stays in the rack, keeps its nodes and is moved into
 * place, because `effect.add` refuses a repeated instance id rather than a repeated effect and
 * the rack no longer has to be emptied to be reordered (0027, 0030).
 */
export function clipRestorationCommands(
  deck: DeckId,
  current: SessionDeck,
  preset: SessionDeck,
): GroupedEditCommand[] {
  const kept = new Set(preset.effects.map((entry) => entry.id));
  const held = new Set(
    current.effects.map((entry) => entry.id).filter((instance) => kept.has(instance)),
  );
  const cleared: GroupedEditCommand[] = current.effects
    .filter((entry) => !kept.has(entry.id))
    .map((entry) => ({ t: "effect.remove", deck, instance: entry.id }));
  cleared.push(...clearedLanes(deck, current, preset));
  return [...cleared, ...STAGES.flatMap((stage) => stage(deck, preset, held))];
}

/** Project one prepared durable checkpoint into the live store in the same registered order. */
export function restoredSessionState(
  session: Session,
  durations: Readonly<Record<DeckId, number>>,
): SessionState {
  return {
    activeDeck: session.activeDeck,
    deckIds: [...session.deckIds],
    decks: fromDecks(session.deckIds, (deck) => {
      const stored = deckIn(session.decks, deck);
      return {
        params: { ...stored.params },
        automation: structuredClone(stored.automation),
        effects: stored.effects.map((entry): SessionEffect => ({
          id: entry.id,
          effect: entry.effect,
          bypassed: entry.bypassed,
          params: { ...entry.params },
          automation: structuredClone(entry.automation),
        })),
        source: stored.source === null ? null : { ...stored.source },
        duration: deckIn(durations, deck),
        // Derived, not restored: the engine re-requests it for every buffer it commits (0025).
        analysis: null,
        playing: false,
        paused: null,
        loop: stored.loop === null ? null : { ...stored.loop },
      };
    }),
    // Inert durable data: a clip has nothing for the graph to prepare, so it restores by copy.
    clips: structuredClone(session.clips),
  };
}
