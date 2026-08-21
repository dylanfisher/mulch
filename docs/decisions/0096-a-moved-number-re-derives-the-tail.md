# 0096 — A moved player number re-derives the tail of the pattern

The player arms every step a whole `AUTOMATION_HORIZON_SECS` before it sounds
([0089](0089-a-jump-is-the-transports.md),
[0071](0071-the-offline-pump-arms-the-lanes.md)). A moved knob that waited for the next play was
therefore inaudible for as long as a person could hold their hand still, and a burst pattern is
exactly the thing nobody can shape unheard. Moving a number now cancels the steps armed past the
fade horizon and lays the pattern down again from the spec being held.

**What is re-derived is the tail, and it is a function of a step count.** `playerWalk(spec, from)`
winds a fresh walk forward over `from` steps and hands back the rest, and the transport keeps how
many steps this pass has laid down. A re-arm drops the steps ahead of the horizon, winds the count
back by exactly that many, and draws the replacements from the seed under the new spec. Nothing
reads a wall clock and nothing durable carries a cursor, so a play, a re-play and an offline render
of one session still lay down one performance and the same session still renders the same file
([0068](0068-an-export-is-a-render-spec.md)). A speed change takes the same road, which is a
strengthening: the steps it replaces are now the same steps rather than the next ones off a cursor.

**The threshold is the lookahead, not the fade.** A move may cancel exactly the steps `arm` can
put back where they were, and `arm` cannot place one earlier than `LOOKAHEAD_SECS`. Dropping a step
inside that window takes it out and defers its replacement instead, and a drag doing it sixty times
a second walks the pattern forward faster than the clock moves — a deck that reads as playing and
is silent for the whole drag. It is the same threshold the speed change already re-arms from.

**The step already sounding keeps the window and the seams it was built with.** Its fades are
scheduled curves on its own gain, and cutting it means either a bare stop or a second curve where
one already stands — a click, or the `NotSupportedError` two touching curves are (0089). So a move
lands at the end of the burst being played, not at the end of the horizon. That is the whole of the
claim: heard where it was turned, to within one burst.

**Switching the module on or off stays the caller's transport change**, and still restarts a
playing deck the way a loop move does. `DeckPlayer.set` re-arms; `src/audio/deck.ts` decides
between that and a restart, which is the one place that knows the deck is sounding.

**Four fields, and the magnitudes are the module's.** `burst`, `vary`, `rest` and `drift` join
`PlayerSpec`, which `assertPlayer` keys exactly, so every stored player from an older build is
discarded rather than migrated ([0026](0026-pre-release-has-no-migrations.md)). Three are amounts
in slots or fractions. `drift` is a count — how many jumps hold one read rate — because the set it
draws from, `PLAYER_RATES`, is the module's decision and how often it is drawn is the performer's;
a knob that was both would be two knobs. A drifted step reads at that ratio of the deck's own rate,
and its window is measured in it, so a drifting pattern is still a pattern of windows and not of
resamplings.

**A burst below one slot loops only its own length, and never below the floor.** The window is
pinned at `PLAYER_MIN_SLOT_SECS` — the same floor a loop too short to jump around is refused by —
because two fades have to fit inside it. What this does not do is fade the wrap _inside_ a repeat:
a repeat that is not a whole number of cycles of what it is reading clicks at its own loop point,
which is 0089's butt splice and predates this. It only became visible because a varied burst stops
landing on whole cycles.

**Two costs are accepted rather than closed**, both recorded in `docs/plan.md` §4: the chain holds
one bound source and writes absolute rates onto it, so a `deck.speed` write can land on a drifted
step and undo its ratio; and a re-arm rebuilds every step across the horizon, which a knob sending
sixty moves a second pays for. Neither is new in kind — the binding is 0031's and the per-event
re-arm is what `deck.speed` has done since 0089 — and closing either moves a boundary this decision
does not.
