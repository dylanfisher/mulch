# 0076. A rack card reads itself out of its own id, and declares its own width

- **Date:** 2026-08-16
- **Status:** accepted

P48 asked whether the ordinal and the name a card wears become durable fields on the instance.
They do not. Both are pure functions of the opaque durable id the instance already carries (0030):
the name is `EFFECT_NAMES[effect]` indexed by an FNV-1a fold of the id, and the ordinal is one plus
the number of instances of the same effect whose id sorts before it. Reordering moves the cards and
never the ids, so a drag cannot renumber or rename anything, and a reload, an archive and a replay
all arrive at the same two words without a byte carried for them. That reverses the half of 0075
that said an effect's name is drawn at the call site and travels in the command — 0075 deferred
exactly this question here — and it leaves `effect.add` the shape it was, which is what kept the
whole change off ninety-odd call sites. A yard's name stays a `Math.random()` draw carried in
`deck.add`, because a yard has no second thing to be told apart from and its emoji is drawn beside
it (0057).

Ranking by id only reads right if a fresh id sorts after the ones already in the rack, so
`addEffectCommand` mints one that does: a fixed nine base-36 digits of a strictly-increasing
millisecond in front of the random half. Without it a purely random uuid lands in front of an
existing card about half the time, and that card — which no command named — is renumbered, its
controls and its knobs renamed with it, and the rack reads "Delay 2" above "Delay 1". The id stays
opaque: nothing reads the time back out, the session stores whatever string arrives, and an id an
agent's JSONL supplies out of order numbers out of order, which is that caller's ordering to pick.
Removing an instance still renumbers the ones after it within its own effect; that is the price of
not storing a number, and the ordinals stay contiguous and in rack order, which is what a person
reading "Delay 1, Delay 2" expects.

A card's width is a plugin declaration beside its icon (`Effect.width`), because how much room a
set of knobs needs is a fact about the effect. Every current entry declares `half`, so the rack
wraps two abreast on a wide viewport and stacks on a narrow one. That makes the rack a
two-dimensional layout, and the reorder drag (0062) resolves a drop against it by nearest slot
centre rather than by walking a column's centres: nearest is the one rule that reads the same
sideways along a row, downwards onto the next, and diagonally between them, and it degenerates to
the old behaviour on a single column. The landing slot is shown as a filled placeholder — one
absolutely-positioned element the rack renders once and the gesture writes a box to, hidden between
drags. It sits inside the list, so the gesture reads its cards by `data-rack-card` rather than by
being children, and a card the drag passes is shifted corner to corner rather than centre to
centre, because the rack is `items-start` and a card with more knobs than its neighbour is taller.
All four arrow keys walk one slot for the same reason the drop got a second axis: the slot before
this one is as often to the left as it is above. Still no dnd-kit (0062).

Bypass is a `Switch`: it is on or it is off and the instance is left in that state, so it stops
being a `Toggle` wearing a power icon — a state is a switch, an action has an icon, never both
(0055). `ACTION_ICONS.bypass` went with it.
