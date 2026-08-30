# 0202 — An effect declares how present it is, and silent means transparent

- **Date:** 2026-08-29
- **Status:** accepted, extending
  [0148](0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)

Nothing could turn an effect down to nothing without knowing which effect it was. A delay and a
reverb are absent at a mix of nothing, a peaking EQ at a gain of nothing, a compressor at a ratio
of one, and a lowpass filter at the _top_ of its own range — six entries, six spellings, no shared
parameter id to look for and no value that means the same thing twice. Anything wanting to bring
an effect in without a step had to carry a map from effect ids to how you fade them, which is the
second map from ids to behaviour that [0055](0055-a-state-is-a-toggle-and-an-action-has-one-icon.md) exists to
prevent.

**An entry declares its own presence**, beside its width and its icon, for the reason those are
declared there: how an effect is turned down to nothing is a fact about the effect and not about
whoever is turning it. `presence` is either `{ param, silent, held? }` — which of its parameters
says how much of it is heard, and where that parameter stands when it is not — or `{ none }` with
the reason, which is 0148's shape again: a value is reached or it is written down as not.

**Silent means transparent, not silent.** An effect is a link in a series chain, so what is asked
for is that it passes its input through unchanged. An entry whose silence muted its own output
would be the chain switched off rather than the effect absent.

**A presence must be schedulable.** The named parameter declares `automation: "linear"`, and the
registry throws at load for one that does not. A fade is a schedule laid on a bound `AudioParam`;
a parameter with no lane behind it is reached through the manual join instead, which ramps over
`PARAM_RAMP_SECS` or the gap since the last move (src/audio/ramp.ts) — a step, not a fade. The
rule is written down here because it is the difference between a two-second arrival and a click.

**`held` is what the compressor forced.** `comp.output` is a makeup multiplier, so a compressor at
a ratio of one with a drawn makeup of two is +6dB of nothing at all. `held` names the parameters
that must stand at their declared defaults for `silent` to be silent, and nothing drawing values
for an instance may draw those.

Consequences. `validateEffects` throws at load for a presence naming a parameter its entry does not
own, a `silent` outside that parameter's range, a presence with no lane, and a `held` that is
unowned, duplicated or its own presence — the same load-time account it already keeps of the drift
declarations ([0122](0122-a-registry-answers-for-itself-at-load.md)).

And two of the six are transparent only **approximately**. The filter has no dry path around its
biquad, so a lowpass at 20kHz is very nearly a wire and not exactly one, and an arrival is faintly
audible in the top octave. Giving the filter a mix parameter would be a durable-shape change to a
shipped plugin; the approximation is written down here instead of hidden, because a reader
comparing the filter's fade to the delay's will otherwise think something is broken.
