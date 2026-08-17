# 0067. A gesture is one history entry

- **Date:** 2026-08-16
- **Status:** accepted

A drag arrives as a stream of `param.set`, so history is keyed on the gesture rather than the
value: a commit carrying the (deck, instance, parameter) key an open transaction already holds
moves that transaction's end instead of opening another. The boundary is the hand, not a timer —
the pointer comes up and the surface sends `gesture.end`, a command that is neither durable nor
transport and does nothing when nothing is open, so a replayed file never has to know what was
held. `GESTURE_IDLE_MS` is only the backstop for a gesture whose end never arrives. A commit under
a different key or none closes the transaction too, and so does any `history.group`, which is one
entry by definition; a group about a single value still opens a gesture the rest of that drag
joins, which is what puts a lane back when the move that cleared it is undone. A gesture that ends
where it began leaves no entry at all, the way a command that changes nothing never did.

Restoring a checkpoint carries the transport across the swap rather than leaving it behind. Every
deck the target gives the same source to and that is playing is seeked to its own playhead and
played again on the far side of the commit, which is told which decks it is restarting so their
teardown reports neither `playing: false` nor a `deck.stopped`: the rebuild is a restart, and a
restart is not a stop ([0052](0052-a-restart-is-not-a-stop.md)). Two decks are deliberately left
out. One whose source the checkpoint changes is not resumed, because a playhead belongs to the
buffer it was read from. One that is paused keeps losing its held position, as it did before this:
a paused deck is stopped on both sides of the restore, so nothing about it is a restart.
