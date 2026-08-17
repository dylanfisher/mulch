/**
 * @role The commands a gesture builds where more than one surface offers that gesture — the
 *   button and the palette entry reach the same construction, so a second way to send is never a
 *   second command (P41).
 * @instead A command exactly one control sends → build it at that control. What a command then
 *   does → src/app/execute.ts. The union itself → src/app/commands.ts.
 */
import type { Command } from "@/app/commands";
import type { EffectId } from "@/audio/effects/registry";
import { mintYardEmoji, mintYardName } from "@/lib/copy";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import type { Clip } from "@/state/session";
import { deckIdsOf, type DeckEntry, type DeckId } from "@/state/store";

/** The alphabet a deck is named from, before ids stop being things a person says out loud. */
const DECK_LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x61 + index));

/**
 * An id for the next deck: the first free letter, or a minted one once they run out. Opaque
 * either way — the session stores whatever string arrives, and nothing derives meaning from it
 * (0029). Minted at the gesture, outside the command, the way a clip's id is.
 */
function nextDeckId(held: readonly DeckId[]): DeckId {
  const free = DECK_LETTERS.find((letter) => !held.includes(letter));
  return free ?? crypto.randomUUID().slice(0, DURABLE_TEXT_MAX);
}

/**
 * Add a yard. The emoji and the name are drawn here, beside the id: the command carries all
 * three, so a replayed or restored session gets the yard it had rather than a fresh draw (0057).
 */
export function addYardCommand(deckList: readonly DeckEntry[]): Command {
  return {
    t: "deck.add",
    deck: nextDeckId(deckIdsOf(deckList)),
    emoji: mintYardEmoji(),
    name: mintYardName(),
  };
}

/**
 * Capture one yard as a clip. The id is minted here for the reason every durable id is: a clip's
 * identity is opaque and given, never derived from the label or the list position (0027).
 */
export function captureClipCommand(clips: readonly Clip[], deck: DeckId): Command {
  return { t: "clip.capture", id: crypto.randomUUID(), name: `clip ${clips.length + 1}`, deck };
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
 * Add one instance of a registered effect. A rack may hold any number of instances of one entry,
 * so every call mints a fresh opaque id (0030).
 *
 * The id is minted to sort after every id minted before it: a base-36 millisecond in
 * front of the random half. Nothing reads the time back out and nothing derives meaning from the
 * string — it stays opaque and the session stores whatever arrives — but a card's ordinal is the
 * rank of its id among its effect's instances (0076), so a purely random mint would drop the
 * second delay in front of the first and renumber a card no command touched. The stamp is padded
 * because the comparison is lexicographic, and a shorter number would sort in front of a longer
 * one whatever its value.
 */
export function addEffectCommand(deck: DeckId, effect: EffectId): Command {
  return { t: "effect.add", deck, id: `${mintedStamp()}-${crypto.randomUUID()}`, effect };
}

/** Play or pause one yard — the toggle the transport, the Space key and the palette all send. */
export function playToggleCommand(deck: DeckId): Command {
  return { t: "deck.play.toggle", deck };
}

/** Send one yard's playhead back to the top of its loop (0038). */
export function stopCommand(deck: DeckId): Command {
  return { t: "deck.stop", deck };
}

/** Make one yard the one the keyboard and the palette's active-yard entries target. */
export function activateYardCommand(deck: DeckId): Command {
  return { t: "deck.activate", deck };
}
