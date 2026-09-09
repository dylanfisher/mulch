# 0320 — An effect's address is a rack, not a yard

- **Date:** 2026-09-08
- **Status:** accepted, widening
  [0030](0030-effects-are-instances.md) — a rack holds instances, and this says which rack — and
  resting on [0029](0029-deck-identity-is-durable-shape.md), whose claim that a deck id is opaque
  and caller-supplied is the whole reason null is the master's name.

**`deck: null` is the rack that is no yard's.** Every command that names a rack —
`effect.add`, `effect.bypass`, `effect.remove`, `effect.reorder`, `effect.bounds`,
`effect.duplicate`, `effect.dismiss`, and the `param.set` and `automation.*` that may name an
instance sitting in one — takes `RackId = DeckId | null`. A reserved id string cannot do this job: a
`DeckId` is opaque, caller-supplied and spent by the session (0029), so any literal is one a hand
could be handed and then be unable to address. Null is not an id at all, so nothing can collide with
it, and the narrowing is one guard at the top of each reducer rather than a check at every reader.

**One value command, one lane command, wherever the instance stands.** `param.set` and the
automation trio widen with the rack operations rather than staying yard-only, because a master
instance holds exactly the parameters and lanes its plugin declares — the same pair 0030 is about —
and a second set of commands for the same pair is the duplication principle 1 exists to refuse.
What the widening costs is one guard: the master holds no parameter of its own, so `deck: null`
with no `instance` beside it names nothing, and it is refused on the log the way any command naming
something that is not there is (0023).

**A move is a removal and an arrival, as one history entry.** `effect.move { from, to, instance,
index }` carries the instance whole — its id, its values, its lanes, what drew them, its bounds and
its bypass — and it is a move and never a copy, so `effect.duplicate` remains the one way a second
instance is made (0092). It expands the way a copy does, through `rt.historyGroup`, because a rack
instance's nodes are built inside the rack that holds them: what the graph can actually do is take
it out of one and build it in the other, and the arrival is the very restoration a stored session
comes back through (0027). The expansion is `rackRestorationCommands`, which is now the one
declaration of a rack's restoration order and is replayed onto a yard's rack and the master's
alike.

**A move into the rack it is already in is refused.** That gesture is `effect.reorder`, and two
commands that reorder a rack would be two authorities on where an instance goes. So is a move onto
a rack already holding that id: an instance id is unique inside a rack and only inside one, so two
racks may each hold one under the same name, and a move that left the clash to the `effect.add`
inside its own group would already have removed the source's copy — the guard `duplicateEffect`
carries, said for the pair.

**The picture files a master row apart from a yard's.** A master instance is heard on every yard, so
its row is in every yard's picture — which makes it a row of the field. It carries the `master:` key
prefix rather than `rack:` because two pictures of one session would otherwise file a master row and
a yard's under one name, and a rebuilt set would hand the wrong row's share. Its look, its shape and
its wind are read off the same standing population a yard's rack is, because a standing rack's look
has always applied to the whole picture.

**What was left out.** The drag that reorders inside a rack does not yet carry a card across into
another one; the "Move to" menu is the whole of the gesture. That drag's geometry is one list's
slots measured at the press, and reaching a second list needs a hit test and a second measurement
that the yard list — which wears the same gesture — must not grow.
