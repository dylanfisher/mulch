# 0031. Rate lives in the play plan, and key lock did not ship

- **Date:** 2026-08-15
- **Status:** accepted

Speed and pitch are ordinary registered deck parameters with no automation and no key lock; the play plan carries `rate` and `phase` so a rate change re-anchors the plan instead of restarting the source, and `src/lib/timeline.ts` states the shared arithmetic that `src/audio/worklets/loop-reporter.js` independently restates for its own module graph. Key lock ships as nothing at all, not a disabled switch: a two-tap crossfaded delay line was measured and rejected — it warbles on anything tonal at every grain size — so a future attempt starts from WSOLA with a correlation search, benched as a pure `src/lib` function against non-commensurate frequencies, never from the two-tap kernel again.
