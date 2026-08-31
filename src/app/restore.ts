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
import { BOUNDABLE_PARAM_IDS } from "@/audio/effects/registry";
import { tierName, type NamedTier } from "@/lib/copyNames";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import type { PlayerSpec } from "@/lib/player";
import type { SongPartId } from "@/lib/playerSong";
import type { EffectBounds, Session, SessionDeck, SessionEffect } from "@/state/session";
import {
  deckIdsOf,
  deckIn,
  fromDecks,
  INITIAL_DECK_ID,
  spendDeckIds,
  type DeckId,
  type SessionState,
  type SessionStore,
} from "@/state/store";
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
  // The windows on what an instance's run may draw, after its values and before its lanes: a
  // bound names an instance the rack must already hold, and nothing about it depends on a value
  // (0208). Only the windows the preset carries — a parameter with none is the parameter's own
  // declared range, which is where a fresh instance already stands.
  (deck, preset) => preset.effects.flatMap((entry) => boundsCommands(deck, entry.id, entry.bounds)),
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
  // After the loop, and it has to be: a jump is a move inside the loop's grid, and a player
  // arriving before one would be a pattern with nowhere to run (0089). Null is a stage that
  // sends nothing — a restored deck starts with none, the way it starts with no loop.
  (deck, preset) =>
    preset.player === null ? [] : [{ t: "deck.player", deck, player: preset.player }],
];

const NOTHING_HELD: ReadonlySet<EffectInstanceId> = new Set();

/**
 * One instance's windows as the commands that put them there, in the pool's own declared order so
 * a replayed file writes them the same way every time. The one expansion, shared by the stages
 * above and by the copy an `effect.duplicate` is (0092, 0208).
 */
export function boundsCommands(
  deck: DeckId,
  instance: EffectInstanceId,
  bounds: EffectBounds,
): GroupedEditCommand[] {
  return BOUNDABLE_PARAM_IDS.flatMap((param): GroupedEditCommand[] => {
    const bound = bounds[param];
    return bound === undefined
      ? []
      : [{ t: "effect.bounds", deck, instance, param, bounds: { min: bound.min, max: bound.max } }];
  });
}

/**
 * Every lane the preset does not carry, cleared — deck-level and on each surviving instance — and
 * every window it does not carry with them. Both for the same reason: an instance the preset names
 * by the same id keeps its nodes rather than being rebuilt, so what the preset is silent about is
 * what it still holds, and a deck rewritten to be exactly a clip has to say so (0027, 0208).
 */
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
    for (const param of BOUNDABLE_PARAM_IDS) {
      if (entry.bounds[param] === undefined) continue;
      if (kept.bounds[param] !== undefined) continue;
      commands.push({ t: "effect.bounds", deck, instance: entry.id, param, bounds: null });
    }
  }
  return commands;
}

/** One deck restored from one durable preset, in the registered stage order. */
export function deckRestorationCommands(deck: DeckId, preset: SessionDeck): GroupedEditCommand[] {
  return STAGES.flatMap((stage) => stage(deck, preset, NOTHING_HELD));
}

/**
 * The id one copied rack instance carries in the yard it lands in: its position in the rack, in
 * fixed digits so the comparison stays lexicographic, and the yard it belongs to.
 *
 * It is a fresh id rather than the original's, so the card reads out a name of its own and there
 * is nothing to copy (0076), and it is derived rather than drawn so a replayed `deck.duplicate`
 * makes the same session it made the first time (0057). Deriving it from the position rather than
 * from the id it copies is what bounds its length — an id built by appending to the one before it
 * grows past `DURABLE_TEXT_MAX` after enough duplications of duplications — and what makes the
 * copies rank in rack order whatever shape the originals' ids were (0076).
 *
 * Cut to `DURABLE_TEXT_MAX`, because a deck id is durable text and may be the whole of it: a yard
 * an agent named with sixty characters would otherwise mint instance ids no guard would accept,
 * and duplicating that yard would be refused rather than done. The cut takes the tail, so the
 * position stays in front and the ordering it carries survives it.
 */
const copiedInstanceId = (to: DeckId, index: number): EffectInstanceId =>
  `${String(index).padStart(9, "0")}-${to}`.slice(0, DURABLE_TEXT_MAX);

/**
 * The same, for one part of a copied yard's song. A part id is identity exactly as an instance id
 * is (0157), so a copy that carried the original's would give two yards two rows wearing one badge
 * — the one thing the badge exists to prevent. Marked apart from an instance's so the two are
 * legible in a command log as the different things they are.
 */
const copiedPartId = (to: DeckId, index: number): SongPartId =>
  `${String(index).padStart(9, "0")}-song-${to}`.slice(0, DURABLE_TEXT_MAX);

/** One copied player, with every album, song and part renamed onto ids of `to`'s own. Mutates the
 *  clone it is handed and never the preset it came from. Every tier and not the parts alone: an id
 *  is identity at all three, and two yards holding one album id is the thing the badge exists to
 *  prevent (0157, P147). One counter across the three, so no two of them collide. */
function renamedSong(player: PlayerSpec, to: DeckId): PlayerSpec {
  let index = 0;
  const rename = (held: { id: string; name: string }, tier: NamedTier): void => {
    const id = copiedPartId(to, index++);
    // The name goes with the id wherever nothing has renamed it: a row is minted wearing a name
    // drawn off its own id, so a copy that kept the name and took a new id would wear one that is
    // no longer a function of anything it holds, permanently and with nothing to say why (P134,
    // 0081). Which tier's pools to redraw from is the caller's, because the three are named off
    // three pools and only the walk down knows which one it is standing on.
    if (held.name === tierName(tier, held.id)) held.name = tierName(tier, id);
    held.id = id;
  };
  for (const album of player.albums) {
    rename(album, "album");
    for (const song of album.songs) {
      rename(song, "song");
      for (const part of song.parts) rename(part, "part");
    }
  }
  return player;
}

/**
 * One yard's durable preset as the yard `to` will hold it: everything it plays and everything in
 * its rack, with the rack's instances and its song's parts renamed onto ids of their own (0078,
 * 0157). What then builds the yard is the ordinary stage list above — a duplicate is not a second
 * way to make a deck (0027).
 */
export function duplicatedDeckPreset(preset: SessionDeck, to: DeckId): SessionDeck {
  const player = preset.player;
  return {
    ...structuredClone(preset),
    effects: preset.effects.map((entry, index): SessionEffect => ({
      ...structuredClone(entry),
      id: copiedInstanceId(to, index),
    })),
    // Renamed in place on the clone, which is what the copy already is: a spread per part would
    // build a third object for every one of them (oxc's no-map-spread), and there is nothing here
    // the original still shares.
    player: player === null ? null : renamedSong(structuredClone(player), to),
  };
}

/**
 * A fresh store holds exactly one deck, `INITIAL_DECK_ID`, so the deck list a stored session
 * asks for is reached by removing that one and adding the session's own in order. Removing it
 * unconditionally — even when the session names it too — is what makes the resulting order
 * exactly `session.deckList` rather than that list rotated around whatever booted (0029). Each
 * addition carries the emoji and name the deck was created with, so a restored yard is the yard
 * that was saved rather than a fresh draw (0057).
 */
export function restorationCommands(session: Session): Command[] {
  const commands: Command[] = [
    { t: "deck.remove", deck: INITIAL_DECK_ID },
    ...session.deckList.map(({ id: deck, emoji, name }): Command => ({
      t: "deck.add",
      deck,
      emoji,
      name,
    })),
  ];
  // Stage-major across decks: every source loads before any parameter is set, so a deck never
  // waits on another deck's stage to reach its own.
  for (const stage of STAGES) {
    for (const { id: deck } of session.deckList)
      commands.push(...stage(deck, deckIn(session.decks, deck), NOTHING_HELD));
  }
  // The clock the yards jump on, after every deck exists and before any of them is played: one
  // command for the session rather than one per yard (0097). Null sends nothing, the way a
  // restored deck's null player does — both callers of this list build a host that has never
  // held a clock, and a graph being rebuilt under a live session takes the other road
  // (`prepareRestore`, src/app/engine.ts), which states it either way.
  if (session.sync !== null) commands.push({ t: "session.sync", sync: session.sync });
  // A session that holds no decks has nothing to activate, and says so by holding null (0029).
  if (session.activeDeck !== null) commands.push({ t: "deck.activate", deck: session.activeDeck });
  return commands;
}

/**
 * A stored session's whole restoration, for the one caller that boots into a live store: the
 * letters it spent, written straight to the store because no command carries them, and then the
 * commands that rebuild the decks it holds. The two belong together — replaying those adds
 * respends only the ids still held, so a boot that took the commands without the seed would hand
 * a letter it drew and removed out to a different yard (0082).
 */
export function restoreInto(store: SessionStore, session: Session): Command[] {
  spendDeckIds(store, session.spentDeckIds);
  return restorationCommands(session);
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

/**
 * Project one prepared durable checkpoint into the live store in the same registered order.
 *
 * `resuming` names the decks whose transport the caller is carrying across the swap: their voice
 * is rebuilt and restarted where it was reading, which is a restart and not a stop, so they must
 * not appear halted for the lookahead the new source takes to sound (0052). Every other deck
 * arrives stopped, because a restored graph has nothing playing in it.
 */
export function restoredSessionState(
  session: Session,
  durations: Readonly<Record<DeckId, number>>,
  resuming: ReadonlySet<DeckId> = new Set(),
): SessionState {
  return {
    activeDeck: session.activeDeck,
    deckList: session.deckList.map((entry) => ({ ...entry })),
    decks: fromDecks(deckIdsOf(session.deckList), (deck) => {
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
          bounds: structuredClone(entry.bounds),
        })),
        source: stored.source === null ? null : { ...stored.source },
        duration: deckIn(durations, deck),
        // Derived, not restored: the engine re-requests it for every buffer it commits (0025).
        analysis: null,
        playing: resuming.has(deck),
        paused: null,
        loop: stored.loop === null ? null : { ...stored.loop },
        player: stored.player === null ? null : { ...stored.player },
      };
    }),
    // Carried, not rebuilt from `deckList`: the letters this session drew and then removed live
    // nowhere else, and deriving them from the decks it still holds would hand one out twice.
    spentDeckIds: [...session.spentDeckIds],
    // Inert durable data: a clip has nothing for the graph to prepare, so it restores by copy.
    clips: structuredClone(session.clips),
    sync: session.sync,
  };
}
