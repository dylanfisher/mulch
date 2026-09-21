# 0391 — The header counts the mulch

- **Date:** 2026-09-21
- **Status:** accepted

**The header carries one readout of what the session is doing to the sound** (src/ui/MulchTally.tsx,
beside the meter in src/ui/App.tsx): the yards standing, the effect instances over every rack, the
parameters moving on their own, the deepest chain one yard's sound crosses, and a word grading that
depth. "in header, add a effects count, and yard count, and any other funny interesting statistics
about how the sound is manipulated. push the mulch idea." The meter says how loud; this says how
mulched.

**One readout, not four things on the bar.** A later statistic joins these rather than standing
beside them: the row already holds a menubar, a transport, a clock, a meter, history and two
toggles, and a bar that grows by one element per fact is a bar that stops fitting. It is also why
the group it sits in wraps rather than pushing the row out — the shell is measured at 360px
(scripts/smoke.d/narrow.js) and the readout is the widest thing on the right-hand end.

**Every number is a fact the store already holds** (`tallyMulch`, src/state/mulchTally.ts). Nothing
here peeks at the graph and nothing here runs per frame: the counts move on a command and are
derived on the read, stored nowhere (0025). The master's instances are counted with the yards'
because the master is a rack (0321), and the deepest chain is one yard's rack plus the master's
behind it, which is the number the grade is read at. A session holding no yards at all is graded
by the master's rack alone: a readout saying five effects and "untouched" in one breath would be
saying two things at once, and zero yards is a state the instrument allows (0029). A list entry
with no yard behind it is refused rather than counted past, through the store's own `deckIn`.

**The subscription is a string, not the tally.** `useSyncExternalStore` spins on a snapshot that is
a fresh object each read, and the `decks` record is replaced on every write to any yard — a
`param.set` per pointer move included — so a subscriber reading objects would re-render for the
whole of a knob drag. The four numbers are joined into one string and read back out of it
(`mulchKey`, `mulchOfKey`), which is its own identity and wakes only when a count moves. The same
shape the move menu's tags already use (src/ui/EffectMove.tsx).

**A grade is a ladder of words, not a number.** `MULCH_GRADES` (src/lib/copyMulch.ts) runs from
Untouched to Pulverized, indexed by the deepest chain, with the last word standing for that depth
and anything past it. The point of the readout is that a hand reads at a glance how hard the
instrument is working the sound over, and "5" does not say that. The words are drafted plainly and
left for a hand to tune; the two nouns the counts are named with are the instrument's own (`YARD`,
`EFFECTS_LABEL`) read back rather than retyped.

**Not chosen:** a count that needs a peek per frame; a stored tally; a second readout beside this
one for the next statistic; a bypassed-instance count, which would say a card is off rather than
what the sound is crossing.
