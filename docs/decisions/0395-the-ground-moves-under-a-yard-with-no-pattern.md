# 0395 — The ground moves under a yard with no pattern, and the loop coming round is its clock

- **Date:** 2026-09-21
- **Status:** accepted, extending [0277](0277-the-ground-moves-in-words.md) under
  [0192](0192-the-grounds-period-is-counted-on-a-clock-a-hand-picks.md); narrowing
  P164's "a bypassed card draws what a card with no pattern draws" to everything but the ground's
  own two controls

**The three words move the loop with the mulcher off.** Whether the ground wanders, how far and
which way (0277) now shape a yard whose switch stands off over its pattern: the loop it is playing
is carried through the source on the period beside those words, and nothing else about the yard
changes. `playerCrawling` (src/lib/player.ts) is `playerSounding`'s exact complement — at most one
of the two ever answers a spec — and the crawl spends only the three words, the period, the bed and
the zone. **It is not a hidden mulcher**: no landing, burst, rest or spark is drawn, and the yard
goes on playing its loop straight.

**Nothing durable moved.** The words and the period are already `PlayerSpec` fields and the switch
keeps the whole spec (P164), so a yard switched off is already holding everything a crawl needs. Nor
does the crawl write any: the loop the hand set stays the session's, and what moves is the window
the transport reads — the same offset a walking pattern carries on its step, folded onto the buffer
through the one fold every ground lands through (`bedGround`, 0318). A saved session is the loop a
hand dragged, wherever the crawl had wandered to when it was saved.

**The loop coming round is the tick.** Such a yard takes no jumps, stands in no part and comes round
on no song, so all three of `PLAYER_BED_PERS` count nothing — and its loop is the one boundary it
has and the one a hand can hear go by. The period is therefore spent in rounds of the loop whatever
`bedPer` says, which is 0192's own fallback read one tier along. Rounds are counted as reports
arrive and never off the reporter's cycle number: a move the playhead does not survive restarts the
pass and sends that number back to zero, so a crawl reading it would re-take its first move forever.

**One walker for both grounds.** `crawlBedAt` (src/lib/playerCrawl.ts) is what the session's shared
ground already was (0313), keyed on whichever object holds the words, so one reach means one
distance on the instrument. `createDeckCrawl` (src/audio/deckCrawl.ts) holds the loop the hand set
as the ground it counts from — a crawl counting from its own last move would compound them and never
come home — and a loop it did not author is a hand's, which replants it there.

**The ground's own controls stay live with the switch off**, and they are the only ones that do: the
bed a crawl comes home to, the period, and the rows of words beside them, reading and writing the
held spec rather than the switch's greyed defaults. Every other dial on the card is refused exactly
as P164 left it — and the rows inside that fold are not refused by Together either, on or off,
because they are the only author of the session's shared ground and are drawn on the yards standing
on it (0313): refusing them would put that ground out of reach of the whole instrument. Without this the feature is unreachable — the ask was to set how a ground moves
_without_ enabling the mulcher, and a hand that has to switch the pattern on to say so has not been
given it.

**The move is the two roads a hand's loop move takes and never a third**: in place where the
playhead survives it, by a restart where it does not, and _nothing_ on a halted deck, which is left
where its next play will begin. And a load takes the ground with the pattern and the loop, without
handing any loop back: the words belonged to a spec the session no longer holds, and a window still
moving under a yard that draws no pattern anywhere would be the hidden mulcher this refuses.

**A yard on the session's ground crawls none of its own**, off or on: the ground is not this yard's
to move (0313). And a yard that has never held a pattern has no ground to move: the words are the
pattern's, so the switch is pressed once to mint one and the crawl is what off means thereafter.
