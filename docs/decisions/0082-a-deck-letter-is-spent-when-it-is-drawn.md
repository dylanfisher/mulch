# 0082. A deck letter is spent when it is drawn, and does not come back

- **Date:** 2026-08-20
- **Status:** accepted

`nextDeckId` took the first letter no live deck held, so adding B, removing B and adding again
handed back B — a letter someone has already said out loud, now meaning a different yard. No list
of live decks can say what has been drawn once a remove has happened, so the session carries it:
`spentDeckIds`, one durable field in `Session` and in the store, appended to by `addDeck` and by
nothing else, and never shortened by a remove. The validator requires it to be a superset of
`deckList`'s ids, and stored data that is not this shape is discarded rather than repaired (0026).

Restoration replays `deck.add` for the decks a session holds, which respends exactly those — the
letters it drew and then removed are reachable only from the stored field, so the boot path seeds
`spentDeckIds` from the validated session before the replay. Every other whole-session write goes
through `replaceSession`, and that is where the one rule lives: the spent list is the single field
it unions rather than replaces, so an undo, a group rollback and an archive import all leave the
store's letters where they were. Undo is a time machine for the session; it is not one for what
was said out loud, and the yard someone saw called B is why B is gone.
