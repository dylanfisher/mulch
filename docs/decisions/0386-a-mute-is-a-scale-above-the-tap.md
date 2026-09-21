# 0386 — A mute is a scale above the tap

- **Date:** 2026-09-20
- **Status:** accepted

**A yard's mute is the last gain in its chain, and the meter is tapped off the pan above it**
(src/audio/chain.ts). A muted yard is silent everywhere its sound goes and its peek goes on
moving, so its picture, its level and its crest all read what it would have sounded like. That is
the whole difference between a mute and a stop, and it is why the mute is a node of its own rather
than a second writer on `deck.gain`: the fader keeps the level a hand set and unmuting hands that
level back. It ramps through `rampTo` like every other level here, because a step straight to
nought is the click that ramp exists to prevent (0102).

**`deck.mute` carries the state to be in, not a toggle**, so a press, a replayed JSONL line, a
restore and a duplicate all say the same thing and land in the same place. The same for
`deck.tag`, which asks the graph nothing: it is the word a hand writes on a yard — "low end",
"tops" — over the life of a session, and so is its own command rather than a second field on
`deck.add`, where the emoji and the name a yard was drawn with live and never change (0057). There
is no vocabulary behind it; the instrument offers a field and never a list.

**Both are durable fields of `SessionDeck`** — a flag and a bounded word, the empty string for a
yard nobody has named — and both are restored unconditionally, unlike the loop or the player,
because a flag and a word always have a value: "not muted" and "no tag" are states to put a yard
in rather than nothing to say. Which is what makes a clip applied over a muted yard unmute it,
instead of leaving the yard wearing a state the clip does not hold (0027). Stored sessions without
the two fields no longer validate and are discarded, not migrated (0026).

**A flatten renders unmuted and keeps both.** Rendering through a mute would bake silence into the
bytes and leave a flattened yard holding nothing at all, so the pass is made at one; and neither
fact is in the samples — the render was made unmuted, and a tag is a word about the yard rather
than a sound it makes — so the flattened yard is left holding exactly what the hand left it
holding.

**What this costs:** one more gain per yard in the graph, and one more field the stored shape
insists on. The mute reaches a rebuilt graph twice over — through the restore's own stage list,
and through the prepare in src/app/engine.ts that an undo takes instead of replaying commands —
which is the arrangement the sequence beside it already uses (0379). And a durable word now
travels a guard of its own, `assertDurableTextOrEmpty`, because an id, a label or a name has
nothing it could be empty _for_ and a tag has.

**Not chosen:** mute as a stop, which would lose the yard's place and its peek; a tag vocabulary,
which would be the instrument naming the hand's yards for it; and the tag on the deck list's
record beside the emoji and the name, which would make a word a hand rewrites a fact about how the
yard was drawn.
