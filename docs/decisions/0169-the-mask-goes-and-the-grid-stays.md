# 0169 — The mask goes, and the grid stays

- **Date:** 2026-08-25
- **Status:** accepted; supersedes [0165](0165-a-mask-is-numbers-a-gesture-wrote.md), whose
  argument stands and whose field does not.

`slots` leaves `PlayerSpec`. A jumping pattern may land on any of the loop's sixteen divisions
again: the walk draws a slot and reads it, with nothing between the draw and the landing.

**What goes is which of the sixteen, never the sixteen.** `PLAYER_SLOTS` and the bounds derived
from it — the distance a jump may travel, the length a figure may run — are what every other number
in the module is counted in, so `src/lib/playerSlots.ts` keeps the grid and loses the mask half:
`PLAYER_MASK_MIN`/`PLAYER_MASK_MAX`, `slotAllowed`, `withSlot`, `nearestSlot`, `maskFromOnsets` —
and `PLAYER_GRID` with them, which is the grid said as a list and existed for the strip that drew
one division at a time. Nothing draws the divisions one at a time any more, so the count is the
whole of what the grid has to say. The snap `playerWalk` spent after every draw goes with them, so `travelFrom` is the draw and the
wrap and nothing else, and the first landing is slot 0 because a play begins at the top rather than
because a mask happened to permit it.

**0165 survives its own removal.** That decision was about what a mask _is_ if there is one — one
durable whole number, written by a one-shot gesture that reads analysis at the gesture and never at
walk time, snapped onto rather than drawn within so a masked pattern takes exactly the draws an
unmasked one takes. Every clause of it was correct and none of it is why the field goes. It goes
because the card has fifteen controls on one row and this was the one of them that is neither a
dial nor a state a person can hear the module without: a strip of sixteen presses behind a popover,
answering a question — where in the loop may this land — that the Distance dial beside it already
answers in the unit the rest of the module is said in. Removing it is one control off a row P130
has to group, and the shape 0165 argued for is spent again in P131 on a list of names, where the
thing being narrowed is a closed list a hand can read rather than sixteen unlabelled divisions.

**A session holding a `slots` field is discarded.** `PLAYER_FIELDS` is keyed exactly — no extras
and none missing — so a stored spec from the build before this one is a spec from another build and
`assertPlayer` throws on it. That is the whole of the migration, and it is
[0026](0026-pre-release-has-no-migrations.md)'s.

**One browser assertion goes with it, deleted rather than repaired.** `renderPlayer.js`'s "a masked
pattern rendered the same file as the same pattern unmasked", and the two renders and the 7Hz
click train that existed only to feed it. It was reported failing on a clean tree at `ccef08b`
after being green through the whole of P125, so it was intermittent rather than standing red. It
was **deleted, not repaired**: there is no mask left to render, so the step that would have had to
diagnose it is the step that took its subject away, and nothing was learned about why it flickered.
