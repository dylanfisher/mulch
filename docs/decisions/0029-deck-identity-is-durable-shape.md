# 0029. Deck identity is durable shape, and the session's list is the only registry

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** the cardinality half of [0019](0019-active-deck-and-shortcut-commands.md)

## Context

P12 asks for decks that are added and removed while the instrument is playing. Every part of the
build was written against `DECK_IDS = ["a", "b"] as const` — a compile-time tuple that was, at
once, the type of a deck id, the list every loop iterated, the key set the durable session
validated against, and the proof that `Record<DeckId, DeckState>` was total. 0019 called it "the
runtime cardinality registry" and expected a change to it to cost a session version.

That constant is exactly what a variable number of decks cannot have. A registry of ids is a
statement that the set is known before the session exists, and the whole point of the step is that
it is not: the set is a thing a person builds while playing. The question is not how to grow the
tuple but what replaces it as the answer to "which decks are there, and in what order".

Three sub-questions each decide a durable shape that later work cannot cheaply change: what makes
a deck _the same deck_, who owns the list, and what the floor is.

## Decision

**A `DeckId` is an opaque, caller-supplied, durable string — the same kind of identity a clip has
([0027](0027-clips-are-borrowed-deck-presets.md)).** It is not an index, not a position, and not a
display label. `deck.add` names the id it is creating, the way `clip.capture` does; the UI mints
the first free letter of the alphabet and falls back to a random id, and a JSONL file adds a deck
and then addresses it by the name it wrote itself. Adding an id the session already holds is
refused and changes nothing. Nothing derives meaning from the string: `src/ui` prints it, and no
other tier reads inside it.

**The session's own `deckIds` is the single source of truth for membership and order.** It is a
durable field beside `decks`, and the two are validated as one shape: `exactKeys(decks, deckIds)`,
with no repeats. Every loop that used to walk `DECK_IDS` now walks the session it is about —
`restorationCommands`, `restoredSessionState`, `prepareRestore`, `decks.play.toggle`, the
instrument's deck list, the clip rack's capture and apply buttons, and `sessionBlobIds`. That last
one matters most: it is the one reachability projection persistence GC, portable archives and
`SessionHistory.blobIds()` all share, and teaching it the deck list — rather than giving it a
sibling that knows about removals — is what makes a removed deck's blob collectable everywhere at
once. Removal deletes no bytes; it stops referencing them, and the existing rule collects them on
the first save after the last referrer, including a live undo checkpoint, lets go.

**A session may hold zero decks, and `activeDeck` is then null.** Removing the last deck is
allowed, and the screen shows the same "add deck" affordance that adds the first one. A floor of
one was rejected: it is a special case every writer would have to know about — removal would
sometimes refuse, the UI would need a disabled state that means something different from every
other disabled state, and `activeDeck` would carry a guarantee that only holds because of a rule
written somewhere else. Null is checkable, and the validator checks it in both directions: a
session with decks must name one of them as active, and a session with none must name null. The
keyboard registry answers `null` for a gesture the session cannot satisfy, which is the same
answer it already gave for an unrecognised key.

**An unknown deck id throws, exactly as an unknown effect does.** There is no registry to check
against, so `execute` asks the session before dispatch: a command naming a deck the session does
not hold is malformed wire input, not an unanswerable request, and it never reaches the log as an
error event. `deck.add` is the one exception, because naming a deck that is not there yet is its
whole purpose. Under it, `deckIn(map, deck)` is the one checked read of a deck-keyed map and
`patchDeck` refuses a deck the store does not hold, so a caller that skips the guard fails at the
write rather than inventing a deck keyed by a name `deckIds` never learns.

**`deck.add` and `deck.remove` are ordinary durable, undoable commands.** They take history,
persistence, archives and graph restore like every other durable edit. Removal disposes the voice
and forgets the analysis request still in flight for that deck by its identity, before the store
row goes — a late reply then has no deck to be applied to, which is the identity rule
[0025](0025-beat-analysis-is-derived-not-durable.md) already established rather than a new one.

## Alternatives considered

- **Keep `DECK_IDS` and grow it** — rejected. A compile-time tuple cannot describe a set a person
  edits at runtime, and every version of "grow it" ends in a fixed maximum with empty slots.
- **Make the deck list an array of `{ id, ...deck }` and drop the keyed map** — rejected. Every
  read becomes a `find`, including the ones in the per-frame path and in `param.set`, and the
  durable diff that history compares stops being stable under reorder.
- **Derive the list from `Object.keys(decks)`** — rejected. It makes JSON key order load-bearing,
  which is a property of the serialiser rather than of the session, and a numeric-looking deck id
  would silently reorder the instrument.
- **A floor of one deck** — rejected above.
- **An unknown deck emits an error event instead of throwing** — rejected. A stale rack macro
  naming an effect the deck no longer holds is a refusal because the deck is still there to refuse;
  a command for a deck that does not exist has nothing to refuse it, and quietly addressing a
  neighbour or creating one on demand is exactly the silent fallback principle 5 forbids.
- **`deck.remove` deletes the blob its deck referenced** — rejected. It is a second owner for a
  fact the reachability walk already computes exactly, and it would delete bytes an undo needs.
- **Per-deck routing, sends and a mixer** — explicitly out of scope. Every deck still lands in the
  one master bus; nothing here divides the output.

## Consequences

`DeckId` being `string` means `Record<DeckId, T>` is an index signature, so under
`noUncheckedIndexedAccess` every read is `T | undefined`. That is honest — the type system cannot
prove a map holds an opaque id — and `deckIn` is the one place it turns into a throw. Test call
sites that name a deck they set up read it with a non-null assertion.

A checkpoint rebuild now grows with the deck count, because restore prepares every deck's buffer.
If it bites, the fix is P8's decode cache keyed by blob id, never a second engine
([0018](0018-offline-export-parity.md)).

Hydration reaches a stored deck list by removing the deck a fresh store booted with and adding the
session's own in order, so the restored order is exactly `deckIds` rather than that list rotated
around whatever booted. Costing one voice teardown at startup is the price of not writing a
diffing restore path.

Stored sessions written before this decision no longer validate and are discarded, which
[0026](0026-pre-release-has-no-migrations.md) already decided.
