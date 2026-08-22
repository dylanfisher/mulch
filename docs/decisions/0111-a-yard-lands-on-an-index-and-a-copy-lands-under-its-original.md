# 0111. A yard lands on an index, and a copy lands under the yard it was copied from

- **Date:** 2026-08-21
- **Status:** accepted

`deckList` is the order yards are shown and addressed in, and until now nothing moved one: a yard
could be added, removed and duplicated, `addDeck` appended, and a copy landed at the bottom of the
list rather than under its original. `deck.reorder` names the yard and the index it lands on — the
shape `effect.reorder` already has (0062), clamped into the list the same way rather than refused.
It carries no second id: a yard is addressed by its own opaque id (0029), and the destination is a
position because a position is what a drag produces.

It is a groupable durable edit and that is the whole of its durable work. The order is already
`deckList`'s own, so history, persistence, the archive and graph restore learn a move without a
field, a stage or a validator between them: history snapshots the session, `restorationCommands`
replays `deck.add` in `deckList` order, and the graph has no opinion at all — a yard's voice hangs
off the master bus and two yards are not in series, so nothing calls the engine here. The letters
the session has spent are untouched: `spentDeckIds` is appended to by `addDeck` and by nothing
else, and a move draws none (0082).

`deck.duplicate` gains `index`, the position the copy lands on. Its reducer already expands into
`deck.add` plus the restoration stages (0078), so the insert is one more command in that same
group — the `deck.reorder` above, straight after the add — and no second path builds a deck. The
gesture supplies one past the original, so a copy arrives under the yard it came from.

The drag is the rack's, shared rather than rewritten. This is the gesture's second occurrence and
principle 3 fires on the third, but the alternative was two hundred duplicated lines, and sharing
bent nothing: exactly two things differed — the command sent on release and the list re-read to
check the gesture still describes it — and both were single call sites, so they became the two
callbacks `useListDrag` takes. `src/ui/rackDrag.ts` is `src/ui/listDrag.ts` for that reason, and
the nearest-slot-centre landing 0076 wrote for a wrapped rack degenerates to a column, which is
what a list of yards is.

The _landing_ degenerates; the overlay under the finger does not. `paint` shifts a passed item
corner to corner onto its neighbour's measured slot, which tiles exactly only when the two are
the same size along the axis — and two yards are not, since one of them may be folded. Dragging
an open yard past a folded one leaves a gap in the live picture the height of the difference. It
is the picture only: the placeholder still sits on the slot the drop commits to, and the index
sent is the one the nearest centre chose. Shifting by the dragged item's own extent instead
would fix it, and would also rewrite how the rack paints and the fifteen assertions that pin it,
for an artifact that lasts as long as a finger is down. Recorded, not taken.

One thing the rack never needed: the page scrolls under a yard drag, because a yard is a panel
and not a card. Slots are measured once at the press, in client coordinates, so the gesture now
carries the scroll offset it measured at and adds the delta to the pointer's — the drag is
resolved in page space, which is where the list actually is. At zero scroll it is arithmetically
the old gesture, which is why the rack's own cases did not move.
