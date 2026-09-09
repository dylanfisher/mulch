# 0326 — A tapped parameter is declared, and the rack draws its tap

**2026-09-08.** `ParamSpec` gains `beat?: true` (`src/audio/effects/contract.ts`): this parameter is
a length of time in wall seconds a hand may tap out or hold to the beat. `delay.time` declares it
and nothing else does. A rack draws, beside any parameter that says so, the same tap and the same
hold the mulcher's burst row draws — keyed on the declaration and never on the effect's id, the rule
every face a card wears already keeps (0055, 0205, 0325).

**The arithmetic is the burst's, bounded by the dial it writes.** `tapPress` and `tapBurst` are the
tap; `beatBurst` with `PLAYER_BEAT_DIVISIONS` is the hold (`src/lib/playerBurst.ts`). `defineEffect`
refuses `beat` on a parameter whose range runs outside `PLAYER_BURST_MIN`…`PLAYER_BURST_MAX`, and on
one that names its choices, because a name has no interval between two of it.

That the parameter's range is a **sub**-range is why `tapBurst` and `beatBurst` take a
`BurstBounds` — the burst's own by default, the parameter's `ParamSpec` from a rack. The delay's
Time bottoms out at 10ms where the burst bottoms out at 5, and the beat the hold rounds against is
the sounding one, up to four times the measured tempo at a doubled speed: a thirty-second of it can
fall under that floor while still lying inside the burst's. Answering with it would leave the
reducer clamping the value back and the toggle reading pressed over a time on no division at all.

**A run of taps is one gesture.** Neither the tap nor the hold sends `gesture.end` after its
`param.set`, which is the burst row's own shape: four presses carry one (instance, parameter) key
converging on one value, so history keeps them as one entry and closes it when the presses stop
(0067). Ending the gesture per press would leave an undo entry holding each intermediate mean.

**One rounding in front of every one of a card's commands.** `heldValue` is that rule, and every
writer on a card goes through it: `ParameterKnob` takes an optional `round` applied to whatever
reaches its one `onChange` — a drag, an arrow key, a reset, a point of a recording —
`ParameterBeat`'s tap calls it on its own answer, and the die on the card's head passes its whole
draw through it (`randomizeEffectCommand`). That is `heldPatch`'s shape said for a registry
parameter (`playerBurstControls.ts`), where the card's patch is what every control writes through
rather than one of them.

A lane is the exception and stays one: a drawn or pasted lane is a continuous sweep and not a value
being written, and quantising it would make a hold into a staircase nobody asked for. A lane a hand
_recorded_ is rounded, because its points are the values that were actually written and heard.

**Nothing durable moves.** The time stays `delay.time` in seconds; the tap and the hold are two more
writers of it, and there is no `delay.sync` — a stored division would be a second fact about the
time that can disagree with the seconds the graph plays. The hold itself is runtime state the yard
keeps beside its folds, above the rack's own fold so putting a rack away does not let go of it, and
it is keyed by `paramKey` so two delay cards hold independently.

**The beat is the yard's.** `analysis.bpm * deckRate`, the sounding tempo, read in `src/ui/Deck.tsx`
the way the jumps card reads it for its own burst (0031). Nought is a yard with no grid and is also
the rack that is no yard's, which hears no one deck (0320): there the hold is refused rather than
absent and the tap is offered anyway.
