# 0116. A per-sample kernel is priced before it is argued about

- **Date:** 2026-08-22
- **Status:** accepted

`./scripts/bench` carries a row for every per-sample loop in `src/lib` whose cost grows with a
source somebody chose, plus every worklet whose loop is as long as the audio — tape, pop and
scatter. Such a kernel that the bench does not carry is a
kernel nobody has measured, and the rule [0058](0058-nothing-qualified-for-wasm.md) states —
absolute cost, never headroom — cannot be applied to a number that does not exist. Adding one means
adding its row, and its row has to print a number: a kernel shorter than the clock is timed a
thousand calls at a time rather than reported as `0.0ms`.

The qualifier is the whole of the exemption. `applyFades` loops per sample but only over the fade
seconds, and `mixCurve` and `crossfade` over a fixed step count, so their cost is a constant a row
would restate; every kernel whose loop is as long as the audio is on the table.

P83 found five that qualified and were missing: `encodeWav`, `fingerprint`, `peakMagnitude`,
`impulseResponse` and `renderGen`. Two of them were the largest in the app after the tape loop and
both sit on the export path a person waits through, which is exactly where 0058's rule wants a
number — and the list they are priced over is `GEN_KINDS` itself, so a generator added there is
priced here without anyone remembering to.

[0050](0050-the-gate-counts-things-and-the-profiler-measures-them.md) still holds unchanged: the
bench is never in `./scripts/check`, it asserts nothing, and its output is a table a human reads.
