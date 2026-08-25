# 0171 — A drawing that says only _that_ goes

- **Date:** 2026-08-25
- **Status:** accepted; takes the drawing half of
  [0101](0101-a-tape-draws-its-reels.md) back out, and with it P89's larger box and the mark
  [0078](0078-a-yard-is-duplicated-by-one-command.md) describes beside a playing yard's transport.

Two pictures leave the instrument: the tape's reels and the recycle mark. Neither is replaced,
and nothing durable moves — a session written before this build loads unchanged.

**The reels' subject moved to the drift.** 0101's argument was that the tape is the one effect
whose state a person can watch, so its card carries a picture of it. That was true when it was
written and it is not now: since P99 the tape declares a row of its own in the drift
([0137](0137-an-effect-declares-the-wave-it-draws-with.md)), and since P101 that row is what the
effect is _set to_ ([0139](0139-a-row-is-what-an-effect-is-set-to.md)) — every one of its seven
parameters reaches the picture through a dimension it names
([0148](0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)). So the repeat time and the
deck's read rate, which is the whole of what the reels drew from, are read in the picture the whole
yard is read in, at the size the drift opens at. What the card lost is a second, smaller reading of
a subset of one, in the one place a rack card is supposed to be its knobs. 0101's other half
stands and is why this is one line rather than a rewrite: a picture draws only what the interface
is already holding, and the day a plugin wants one again, `EffectCard` names it the way 0101 said
it would.

**`width: "full"` was the room the drawing needed.** The tape's card is a `"half"` like every
other entry's, so the rack lays two abreast on a wide viewport whatever is in it. That closes
plan §4's "the tape's picture wraps under its knobs 48px sooner" outright rather than answering
it: there is no picture to wrap, no second box size to choose at a breakpoint, and no reason to
put a tape in `scripts/smoke.d/rackRow.js` to watch one. `EffectWidth` keeps `"full"` with no
entry declaring it — the vocabulary a plugin may declare is the contract's, not a census of what
is currently declared. What a half costs the tape is that its seven knobs wrap where they did not:
between the `sm:` breakpoint and about 1100px of viewport a tape stands one knob row taller than
the two-parameter card beside it. That is a card wrapping its own knobs rather than a card
carrying a picture, which is the ordinary thing every rack card does and what
[0093](0093-a-knob-caption-reserves-two-line-boxes.md) is about a caption's line boxes inside.

**A mark that says only _that_ a yard is playing says nothing the row does not.** The recycle
mark stood beside the transport whose own control reads Pause exactly when it would have been
drawn, over a playhead and a drift that say the same thing while saying _where_ the deck is
reading. P64 already took its motion away for that reason; this finishes that argument rather
than opening another one. It was two arrowheads of geometry and no hook, so it cost nothing —
which is not an argument for keeping a thing that is redundant, only for why nobody noticed.

**The wordmark's recycle icon is untouched.** `src/ui/Logo.tsx` draws a different mark, from
`@phosphor-icons`, and it is the app's name rather than a report about a yard.

**Proof.** `src/ui/EffectRack.test.tsx` asks the tape's card for no `<canvas>` and for the same
half width its neighbour declares; `src/ui/Deck.test.tsx` asks a playing yard's markup for neither
of the mark's two arrowheads by their own path data, so a copy of the geometry left somewhere else
is a failure rather than a silence. Both were seen failing against the tree before this change.
