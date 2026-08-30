# 0209 — A worklet crossfades in its own kernel

The delay, the reverb and the tape each hang their wet path off a graph-side dry/wet pair: one
`ConstantSourceNode` feeding two `WaveShaperNode`s cut to the equal-power curves of
`src/lib/crossfade.ts`, driving a dry gain and a wet gain. Three copies of that block already
stand, written out rather than extracted, because extracting it would reorder node construction in
shipped plugins for no behaviour.

The pop stage does not grow a fourth. Its processor already holds the dry sample and the wet sample
in the same iteration of the same loop, so it blends them there and binds `pop.mix` as an **a-rate**
worklet parameter — the only a-rate parameter any processor in this repo declares. The rule this
sets:

**An effect whose whole wet path is inside one worklet crossfades inside that worklet, and its mix
is an a-rate parameter of the processor.** An effect whose wet path is a graph — a convolver, a
delay line built from native nodes — keeps the `ConstantSource` and `mixCurve` pair.

Two things follow.

The blend is **linear**, not equal-power. The three graph-side plugins fade between two signals that
are decorrelated by construction — a reverb's tail, a delay's repeats — where an equal-power law is
what keeps the sum's level flat. Nothing in the pop processor looks ahead: the wet is the dry moved,
sample for sample, so the two sum in phase and a linear blend is the one that holds the level. An
equal-power law here would dip three decibels in the middle of the knob.

And the mix is a-rate because it is the parameter an automator fades to bring the whole effect in
and out (0202). A k-rate mix is one value per 128-frame block, which is a staircase of about three
hundred steps across a one-second arrival; the four other parameters stay k-rate, where a block's
granularity is under three milliseconds of a control that nothing is ramping through zero.

The cost is the one every worklet already carries: the processor's `parameterDescriptors` are a
second copy of the plugin's declared ranges, because a worklet imports nothing. `pop.test.ts`
asserts the pair, including which of them is a-rate.
