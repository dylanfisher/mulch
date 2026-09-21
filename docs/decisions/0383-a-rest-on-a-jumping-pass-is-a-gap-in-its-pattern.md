# 0383 — A rest on a jumping pass is a gap in its pattern

- **Status:** accepted, amending [0371](0371-an-effect-may-ask-the-transport-for-a-hold-and-never-touch-it.md),
  whose mechanism it keeps and whose one refusal it removes.

0371 let the transport decide what an ask is worth and had it refuse a yard walking a pattern: a
pattern's steps are their own transport, laid ahead by the player, and a stop scheduled on the
ordinary source would hold nothing the next step does not start again. That refusal is what "lull
effect doesn't appear to work when mulcher is activated" is — the lull draws its rests, the rack
gathers them, and the one transport that could take them says no.

So the ask reaches the pattern instead of being refused at the deck's door. A rest on a jumping
pass is **a gap in the pattern and never a halt**: the player drops the steps ahead of the instant,
stops the step the instant falls inside there along with its companions, and lays nothing until the
release. Nothing of the deck's transport moves — no plan is torn down, no stop is reported, no
playhead is handed back — because a pattern is already a run of sound and silence, and a rest is
one more silence in it. The deck's own rest queue stays the ordinary pass's alone, and the two
never meet: a deck is walking a pattern or it is not.

The walk is **continued and not redrawn**. The drop winds the cursor back over exactly the steps it
took, the way a re-arm does, so the release lays those same steps from the ordinal the rest found —
a rest is a pause in the performance and not a second performance of its top. What a redraw is
owed, `releaseNow`, is therefore also a continuation here and not the restart in place an ordinary
pass takes: there is nothing to restart, because nothing was torn down.

A rest is asked for up to a horizon ahead of the clock, so there is a long window in which one
stands and has not begun. Inside it the rest is simply **the nearer horizon**: the pass is laid up
to its instant and never past it, so every move that re-arms — a mulcher number, a clock, a part
queued or let go — drops the steps before the rest and lays them down again under what changed,
rather than leaving the yard silent from wherever the drop found it. Two consequences are accepted
rather than fixed. The stop the ask scheduled cannot be taken back, so a bypass arriving before
the instant still cuts the pass there and carries on from it — 0371's own rule, paid by the next
step here instead of by a whole new source. And an arming that cannot reach the instant, which is
what `MAX_PLAYER_STEPS` allows at the shortest slot, rests where the queue ends instead: the ask
horizon and the step cap are the transport's margin (0120) and not this rest's to reconcile.

The step the rest lands inside is stopped hard at the instant, with no seam. That is what a rest
already does to an ordinary pass's source, and one rule for both transports is worth more than a
fade that would move the rest a seam earlier or later than the lull drew it.
