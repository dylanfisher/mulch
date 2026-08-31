/**
 * @role The commands a gesture builds where more than one surface offers that gesture — the
 *   button and the palette entry reach the same construction, so a second way to send is never a
 *   second command (P41).
 * @instead A command exactly one control sends → build it at that control. What a command then
 *   does → src/app/execute.ts. The union itself → src/app/commands.ts.
 */
import type { Command } from "@/app/commands";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import { mintClipName, mintYardEmoji, mintYardName, type TransportAction } from "@/lib/copy";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import type { SongPartId } from "@/lib/playerSong";
import type { Clip } from "@/state/session";
import { deckIn, deckIndexOf, type DeckId, type SessionState } from "@/state/store";

/** The alphabet a deck is named from, before ids stop being things a person says out loud. */
const DECK_LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x61 + index));

/**
 * An id for the next deck: the first letter this session has never drawn, or a minted one once
 * they run out. Asked of what the session has spent rather than of what it holds — a letter
 * someone has already said out loud must not come back meaning a different yard, so add, remove,
 * add lands on C (P55). Opaque either way: the session stores whatever string arrives and nothing
 * derives meaning from it (0029), and it is minted at the gesture, outside the command, the way
 * a clip's id is.
 */
function nextDeckId(spent: readonly DeckId[]): DeckId {
  const free = DECK_LETTERS.find((letter) => !spent.includes(letter));
  return free ?? crypto.randomUUID().slice(0, DURABLE_TEXT_MAX);
}

/**
 * Add a yard. The emoji and the name are drawn here, beside the id: the command carries all
 * three, so a replayed or restored session gets the yard it had rather than a fresh draw (0057).
 */
export function addYardCommand(spent: readonly DeckId[]): Command {
  return {
    t: "deck.add",
    deck: nextDeckId(spent),
    emoji: mintYardEmoji(),
    name: mintYardName(),
  };
}

/**
 * Copy one yard. The new yard's id, emoji and name are drawn here beside each other exactly as
 * `deck.add`'s are, so a replayed or restored session gets the yard it had (0057). What the copy
 * carries — source, parameters, rack, values, bypass, lanes, loop — is the reducer's, because a
 * caller that listed it would be a second way to build a deck (0078).
 *
 * Where it lands is the slot after the original's, read off the list at the press: a copy belongs
 * under the yard it was taken from, not at the bottom of a session someone has been building all
 * evening (0111). A yard the list no longer holds puts it at the end, which is where an append
 * would have put it anyway.
 */
export function duplicateYardCommand(
  { spentDeckIds, deckList }: SessionState,
  deck: DeckId,
): Command {
  const at = deckIndexOf(deckList, deck);
  return {
    t: "deck.duplicate",
    deck,
    to: nextDeckId(spentDeckIds),
    index: at === -1 ? deckList.length : at + 1,
    emoji: mintYardEmoji(),
    name: mintYardName(),
  };
}

/**
 * Capture one yard as a clip. The id is minted here for the reason every durable id is: a clip's
 * identity is opaque and given, never derived from the label or the list position (0027).
 */
export function captureClipCommand(clips: readonly Clip[], deck: DeckId): Command {
  return { t: "clip.capture", id: crypto.randomUUID(), name: mintClipName(clips.length), deck };
}

/**
 * The wall clock, forced to strictly increase: two effects added inside one millisecond would
 * otherwise mint two ids with the same prefix, and the random half would decide which of them
 * came first.
 */
let lastMintedAt = 0;
const mintedAt = (): number => {
  lastMintedAt = Math.max(Date.now(), lastMintedAt + 1);
  return lastMintedAt;
};

/** That instant as a fixed nine base-36 digits, which it stays for the next three millennia. */
const mintedStamp = (): string => mintedAt().toString(36).padStart(9, "0");

/**
 * The opaque id a fresh rack instance is given, minted to sort after every id minted before it:
 * a base-36 millisecond in front of the random half. Nothing reads the time back out and nothing
 * derives meaning from the string — it stays opaque and the session stores whatever arrives —
 * but a card's ordinal is the rank of its id among its effect's instances (0076), so a purely
 * random mint would drop the second delay in front of the first and renumber a card no command
 * touched. The stamp is padded because the comparison is lexicographic, and a shorter number
 * would sort in front of a longer one whatever its value.
 */
const mintInstanceId = (): EffectInstanceId => `${mintedStamp()}-${crypto.randomUUID()}`;

/**
 * The opaque id one part of a song is given, minted at the gesture that adds it — the same rule a
 * rack instance's id follows, for the same reason: what tells two parts apart has to be the part
 * and not its place in a list a drag moves (0076, 0157). The stamp is in front for the reason it
 * is there, so a part's badge is stable under every gesture but its own.
 */
export const mintSongPartId = (): SongPartId => mintInstanceId();

/**
 * And the one a song is given, which is the same mint said one tier up: the
 * two tiers are one shape, so what makes each of them a thing rather than a place in a list is
 * one generator and not two (0157, P147).
 */
export const mintPlayerRunId = (): string => mintInstanceId();

/**
 * Add one instance of a registered effect. A rack may hold any number of instances of one entry,
 * so every call mints a fresh opaque id (0030).
 */
export function addEffectCommand(deck: DeckId, effect: EffectId): Command {
  return { t: "effect.add", deck, id: mintInstanceId(), effect };
}

/**
 * Copy one instance onto the end of the same rack. The copy's id is minted here, beside the one
 * `addEffectCommand` mints and by the same rule, so the newest card is the last of its effect's
 * instances whichever way it arrived (0076). What the copy carries — its values and its bypass —
 * is the reducer's, because a caller that listed it would be a second way to build a rack entry
 * (0092).
 */
export function duplicateEffectCommand(deck: DeckId, instance: EffectInstanceId): Command {
  return { t: "effect.duplicate", deck, instance, id: mintInstanceId() };
}

/** Play or pause one yard — the toggle the transport, the Space key and the palette all send. */
export function playToggleCommand(deck: DeckId): Command {
  return { t: "deck.play.toggle", deck };
}

/** Send one yard's playhead back to the top of its loop (0038). */
export function stopCommand(deck: DeckId): Command {
  return { t: "deck.stop", deck };
}

/**
 * Which command each of the three global transport gestures builds for one yard. Constructors
 * rather than tags, so `deck.stop` is written once in this file and the header's stop is the
 * same construction the yard's own row and the palette already send (principle 1). The gestures
 * themselves are `TRANSPORT_ACTIONS`, declared beside the words they say (P66).
 */
const TRANSPORT_COMMANDS = {
  // A yard already sounding starts again from the top of its loop, which is what lines every
  // yard up: `deck.play` resumes a held playhead and rewinds one that is not (0038).
  play: (deck: DeckId): Command => ({ t: "deck.play", deck }),
  pause: (deck: DeckId): Command => ({ t: "deck.pause", deck }),
  stop: stopCommand,
} as const satisfies Record<TransportAction, (deck: DeckId) => Command>;

/**
 * The yards a global press has anything to say to, in the session's own order. Asked through
 * `deckIn`, which throws on an id `deckList` claims and `decks` does not hold: a mismatch there
 * is a bug everywhere else in the app and would otherwise make one yard quietly stop answering
 * the transport (principle 5, 0029).
 */
function reachable(state: SessionState): readonly DeckId[] {
  return state.deckList
    .filter((entry) => deckIn(state.decks, entry.id).duration > 0)
    .map((entry) => entry.id);
}

/**
 * One global transport press, expanded into the per-deck commands a person pressing every yard
 * in turn would have sent — the header's three buttons and the Space key both come here, so
 * neither is a second kind of state and the log reads the same either way (P66). A yard with
 * nothing loaded is skipped for the reason its own transport row is disabled: there is no
 * playhead to move, and a global press must not spray one error per empty yard. A session with
 * no decks — or none loaded — is an empty list, which is a press that does nothing.
 */
export function transportAllCommands(
  state: SessionState,
  action: TransportAction,
): readonly Command[] {
  return reachable(state).map((deck) => TRANSPORT_COMMANDS[action](deck));
}

/**
 * What Space means: the yard's own play control, pressed on every yard. Deliberately not a
 * choice this file makes between the header's play and pause sets — whether a yard is sounding
 * is the graph's to answer, and the session's `playing` does not learn it until the transport's
 * lookahead has elapsed, so a second press inside that window would rewind every yard instead of
 * pausing it. `deck.play.toggle` asks the graph at the moment it runs, which is what the single
 * yard's control has always done (0038).
 */
export function playToggleAllCommands(state: SessionState): readonly Command[] {
  return reachable(state).map((deck) => playToggleCommand(deck));
}

/** Make one yard the one the keyboard and the palette's active-yard entries target. */
export function activateYardCommand(deck: DeckId): Command {
  return { t: "deck.activate", deck };
}
