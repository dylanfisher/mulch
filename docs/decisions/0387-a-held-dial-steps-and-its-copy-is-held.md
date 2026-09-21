# 0387 — A held dial steps, and its copy is held

- **Date:** 2026-09-21
- **Status:** accepted

**A dial may be handed a landing — the places it is allowed to stand at all — and while it has
one it steps between them instead of sliding and being corrected afterwards** (`land`,
src/ui/Knob.tsx). A parameter held to the beat hands over the rounding it already had
(`heldValue`, src/ui/ParameterBeat.tsx), so one function is both the rule in front of the command
and the set of places the dial can reach: "setting delay to beat mode should change time to only
toggle between set beat points."

**Because the correction was landing and the picture was not.** The rounding sat in front of
`param.set` in src/ui/ParameterKnob.tsx, so what the store held was always a whole division — and
the dial painted every value the hand dragged through, on its way to a number it could not hold.
The hand saw a continuous dial whose readout disagreed with the delay it heard. The landing is
applied where the dial paints, which is the only place that answers it.

**The hand's travel is kept and the dial's is not.** A drag goes on accumulating the value it
would have reached (`state.fraction`, and `reached` beside the new `landed`), and the keys go on
adding their `step` to it; what is dropped is the stretch between two places. That is what makes
the dial step on the crossing and what keeps an arrow key alive under a hold: stepping from the
place the dial never leaves would recompute the same place forever and leave every key on a held
dial permanently dead — as far as the dial's own `step` moves it at all, which on a log range
coarse enough to swallow a key's move is nowhere, landing or none (P82). A gesture's ending hands
the travel back to the place: a press that crossed nothing writes nothing, so no render re-seats
the two, and the travel it abandoned would otherwise seed the next press. The landing must be
idempotent, because the readout's typed number reaches the command without passing the dial.

**The hold stays runtime, and the copy of a card carries it by hand.** A hold is no part of what
the graph plays — the value it rounded is already durable — so it remains the rack's own state
above its fold (0026, and the burst's hold before it), and no stored session changes shape. What
that costs is that a copy has to say so: `duplicateEffectCommand` now returns its narrowed command
so the press that mints the new id can hand both ids to the rack (`copyHolds`,
src/ui/EffectRack.tsx), which answers "duplicate delay effect should also copy the beat toggle".
Which parameters are visited comes off the registry's own `beat` declarations, not a list.

**Not chosen:** a `SessionEffect` field, which would make the hold undoable, restorable and
clip-borne — four seams for a toggle that is a way of writing a number rather than a number; and
a second rounding inside the dial, which would be the same rule spelled twice.
