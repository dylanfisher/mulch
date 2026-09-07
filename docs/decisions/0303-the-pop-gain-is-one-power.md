# 0303. The pop gain is one power, held to the decibel form by its test

- **Date:** 2026-09-06
- **Status:** accepted, applying [0211](0211-the-pictures-kernel-is-gated-on-byte-equality.md)'s bar to a worklet

`src/audio/worklets/pop.js` was the dearest row in `./scripts/bench` — 1302ms for ten stereo
minutes, against 154ms for crush — and two `Math.log10` and a `10 **` per sample were most of it.
The loop now computes `expandRatio`, `clamp((level / pivot) ** lift)`, which is `expandGain` of
the two `ampToDb`s restated: a clamp on the decibels is the same clamp on the multiplier because
the exponential is monotonic. The decibel pair stays exported as the statement the ratio is held
to, and `./pop.test.ts` asserts the two part by less than 1e-9 over a grid that reaches under
`DB_FLOOR` and both clamps (measured: 2.2e-16), and pins the shipped stage's output on a fixed
noise to within 1e-6 of what the log form drew. The same change writes `widthPair` into one pair
the stage owns, so the loop allocates nothing. Ten stereo minutes: 1302ms → 985ms, and the
two `tanh` of the sheen are what is left.
