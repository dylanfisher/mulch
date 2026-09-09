# 0325 — A choice is picked by name, and the EQ ships as a filter

- **Date:** 2026-09-08
- **Status:** accepted, extending
  [0322](0322-an-eq-band-has-a-shape-and-the-filter-goes.md) — which made the band's shape a
  number stepped by one and took the standalone filter away — and resting on
  [0202](0202-an-effect-declares-how-present-it-is.md),
  [0089](0089-a-jump-is-the-transports.md) and
  [0026](0026-pre-release-has-no-migrations.md).

**A parameter may name its steps, and one that does is picked rather than turned.**
`ParamDeclaration` gains `choices` — the name of each step from `min`, one name per step and no
more, refused at `defineEffect` otherwise. A rack draws such a parameter as a select in the knob's
own place, its items the names and its value the number, sending the same `param.set` a turn sends:
a choice therefore undoes, persists, archives and drives exactly as a turn does (0089), and
./scripts/smoke reads the row the way it reads a row of knobs, because the control wears the dial's
label, its sentence and its `data-automation` mark. The control is keyed on what the parameter
declares and never on the effect's id, which is the rule every face in the rack already keeps
(0055, 0205).

**A choice takes no lane**, for the reason a `rebuild` takes none (0090): a picker draws no lane,
arms under no modifier and offers no motion menu, so a lane on a parameter drawn as one would be a
name a hand picked and the next pass wrote over, with nothing on screen saying why. Refused beside
the two rules above.

All three are refused at `defineEffect` rather than at the registry's load, because they are rules
about one declaration and need no other entry to read them — the throw then names the file that got
it wrong. The cost is that the deck's own parameters do not pass through it (src/audio/params.ts),
so the rules reach the registry's entries only; a deck parameter that named its steps would be
drawn as a dial, which is where the second half of the fence would go if one ever did. Choices are
not extended to the panner's three 0/1 knobs either: a choice of two is a knob until a third asks
(principle 3).

**The EQ is the EQ/Filter, and it ships as a low-pass.** 0322 folded the standalone filter into
the band and left the entry called EQ, which is the wrong half of what it now does: everywhere a
reader sees it — the entry's label, the automator's weight, the sentences under both — it reads
EQ/Filter, and `eq.gain` loses its "EQ" to become Band Gain. The default of `eq.shape` moves from
peaking to low-pass. A stored value is still a whole number over `EQ_SHAPES` and is read as it is;
the ids `eq` and `eq.*` are keys and do not move (0026).

**The presence follows the shape it ships in.** A gain of nought is flat for the peaking shape and
for no other, so the pair 0322 left — silent at `eq.gain` 0, with the shape held — describes a
shape this entry no longer ships in. The presence is the frequency now: silent at 20kHz, where a
low-pass's edge stands above hearing and the entry is a wire, and full at 500Hz, where the whole top
of a sound is gone and an arrival is the thing that happened. The shape stays held for the reason
it was held before — the silence is a low-pass's and not a band-pass's — so an automator-grown
EQ/Filter arrives as a sweep closing down from open, which is the sound a filter is grown for.

`full` is declared rather than left to the default: at the declared kilohertz a low-pass has taken
the air off a sound and little else, which is a place arriving and nobody noticing. Below 500Hz is a
filter closed rather than a filter in.

**What this costs.** A presence names one parameter, so it can only be right for one shape. It was
right for the peaking one and is right for the low-pass one now: the picture reads a flat Peak — a
hand's pick, gain at nought, frequency at a kilohertz — as almost fully present, where before it
read an audible low-pass as absent. The reading reaches the band's alpha, the tail's weight and the
shape's (src/lib/moireBand.ts, moireWind.ts, moireShape.ts), so the error moved rather than went.
Shape-aware presence is a second field on the contract and is not this decision.

The presence is also read as a distance in hertz, so a grown filter's presence is linear across a
range a hand turns logarithmically — the same crudeness the gain's reading had, moved. And
`eq.gain` is now a drawn value on an entry whose shape is held to a low-pass, where the node does
not read it — and a stirred one, since `stir` skips only what is held, the presence and what has no
lane (src/lib/effectGrowth.ts), so a grown place schedules ramps on a knob nothing hears. Inert
rather than wrong, at the cost of the schedule; giving it a window would be a second presence.
