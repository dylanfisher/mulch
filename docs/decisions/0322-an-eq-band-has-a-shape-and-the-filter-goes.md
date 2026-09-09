# 0322 — An EQ band has a shape, and the filter goes

**2026-09-08.** `eq.shape` is a fourth parameter on `src/audio/effects/eq.ts`: a discrete choice
over peaking, low-pass, high-pass and band-pass, written straight onto the `BiquadFilterNode.type`
the entry already builds. The four shapes are `EQ_SHAPES` in `src/lib/biquad.ts`, spelled as the
node's own type strings, because both the plugin and the picture need the same list and lib may not
import audio.

It takes no lane and it is **held by the presence** (`held: ["eq.shape"]`). A gain of nought is
flat for the peaking shape and for no other, so a run that drew a low-pass and then faded its gain
would be fading a knob nothing is hearing. Held, an automator-grown EQ is always the peaking one,
and the entry stays in the growable pool. A value out of range is refused rather than clamped: the
command join clamps already, so a bad value here is a shape nobody declared.

The shape steers the band the picture draws (`bandLook`, `src/lib/moireBand.ts`): a peaking band is
the band as it was, lifted or cut at the frequency; a pass shape is everything past the band's own
edge taken out, with the taper running outward from the corner. The direction the peaking band
reads off `lift` is not in a pass shape's draw at all — the node does not hear the gain there, and a
picture saying what the sound is not is what 0128 refuses. What both draws are weighed by is the
presence, which is the chain's rule for every pass and not this look's (0285).

`src/audio/effects/filter.ts` is gone. A low-pass EQ is exactly what it was, and two entries
answering one question is the duplication principle 1 exists to refuse. Its look `soften` went with
it, and so did its wave `slope`: a look or a profile no entry names is maths nothing can reach. Its
`radius` term stayed, because the bloom declares it too. A stored session holding a `filter`
instance no longer validates and is discarded (0026), which is free and is why this is one step and
not a migration.
