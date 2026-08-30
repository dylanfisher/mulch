# 0220 — A dismissal lays nothing

- **Date:** 2026-08-30
- **Status:** accepted

A hand can let one place of an automator's run go: `effect.dismiss`, naming the deck, the entry
growing the run, and the place. **The slot it vacates stays empty until its own tick comes round.**

That is the whole of the decision. `createGrowth` lays into slot `tick % most` and every draw a lay
makes is spent whenever it is due, so the stream is a function of the spec and the tick count alone
([0134](0134-a-pattern-plays-the-repeats-it-was-set.md),
[0204](0204-a-run-is-laid-on-the-automation-horizon.md)). Laying a replacement at the moment
of the dismissal would spend a draw out of turn, and every place after it would be a different
effect — the seed would no longer promise anything, and `scripts/smoke.d/renderAutomator.js`'s
two-renders-of-one-seed assertion would be asserting a coincidence. So a dismissal retires and lays
nothing: a hole for at most one turn of the run, then the slot's own tick fills it with exactly the
effect it was always going to. An empty slot is a shape the run already has, since a tick the odds
leave unlaid makes one ([0210](0210-a-run-is-a-size-range.md)).

**It is not a `DurableEditCommand`, and it cannot be one.** The run is drawn from a seed and never
stored (0204, [0205](0205-a-cards-face-is-declared.md)), so a place a hand dismissed is
not a fact a session could carry. It enters no history for the reason a seek enters none
([0041](0041-a-seek-is-transport-not-durable.md)): letting go of a place is as undoable as moving a
playhead, and saying so in the type is cheaper than a transaction with nothing to put back.

**It leaves the way the clock takes one** — the fade `auto.fade` gives every departure, then the
same teardown — because nothing the entry holds is ever cut off
([0202](0202-an-effect-declares-how-present-it-is.md)). A hand asking for it sooner is asking for
sooner and not for a click. It is therefore the one gesture that works while a wait stands
([0215](0215-a-run-can-be-held-and-the-hold-runs-out.md)): the wait is the clock held, and this
is a hand.

**A departure the clock has scheduled is not one that has begun.** The run is laid ahead across
the pump's horizon (0204), so a place with seconds still to run usually already carries a retire —
under `auto.stays` at its floor, every place carries one from the moment it is laid. `leave` is
therefore refused only once the fade has actually started, and asked again before that instant it
re-lays the fade from where the place stands now: `rampTo` cancels from that instant, so the later
ramp it replaces never fires. Keyed on `goneAt` instead, the × would be dead for the last seconds
of every place's life, which is exactly the window in which asking for sooner means anything. What
cannot be let go of is what cannot be heard: a place laid ahead of the horizon has not arrived, and
a departure ramped in before its arrival had run would cut it off rather than fade it (0202).

**The place is named by the id it is held under**, which folds in the tick it was laid at. A row
addressed by its slot alone would dismiss whatever had rolled into that slot while the pointer
travelled, so the press reads `peek()` at the press and a command whose place has already gone is
refused rather than applied to its successor (principle 5).
