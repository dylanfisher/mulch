# 0402 — An analysis already had is not asked for again

- **Date:** 2026-09-22
- **Status:** accepted, amending [0025](0025-beat-analysis-is-derived-not-durable.md)'s "re-derived
  on every load"

**The analysis host remembers each answer against the samples it described.** The key is the
first channel's own array, held weakly (`known`, src/app/analysis.ts). An undo, a redo or an
import restores a deck onto the buffer the decode cache already holds. That answer now lands at
once. Before, every restore cloned every deck's whole source to the worker again, for a function
of the samples that could not have changed. It is still derived and never stored. It goes when the
buffer does.

**A restored rack is told its beat when the answer lands, as a loaded one is.** A restore's
measurement passed no `analyzed` callback, so every rebuilt yard's rack counted on nought until a
deck knob moved (0371).
