# 0092 — An effect copies itself with one command

Duplicating a rack instance is `effect.duplicate`, carrying the instance being copied and the id
the copy will land under — minted at the press beside the one `effect.add` mints, so the copy's
card reads a name and an ordinal of its own out of that id
([0076](0076-a-card-reads-itself-out-of-its-own-id.md),
[0081](0081-an-effect-name-is-two-pools-multiplied.md)). The reducer expands it into the add, the
values, the bypass and the lanes and finishes through `historyGroup`, exactly as a yard's copy does
([0078](0078-a-yard-is-duplicated-by-one-command.md)): one press is one undoable entry, and a UI
that sent three commands would be a second way to build a rack entry.

**Amended (P94): the copy takes the original's automation lanes.** This decision first said it did
not — a lane is the gesture that was ridden onto that knob, and the copy is an instance to perform
on rather than a second player of a recording nobody made on it. A session says otherwise: the
reason to copy an instance is to keep what was ridden onto it and move it, and a yard's copy has
always agreed, restoring the whole preset lanes included. So the group gains one `automation.set`
per lane the original holds, last, after the values those lanes fall back to — the restoration
order the same expansion already runs in ([0027](0027-clips-are-borrowed-deck-presets.md)).

What this constrains: the command is durable and ungroupable, so it joins history, persistence,
the archive and graph restore as a whole and can never appear inside a `history.group`. A later
field an instance carries has to say whether a copy takes it, and the answer is not automatic: it
is copied unless copying it would copy the identity a fresh id was minted to replace.
