# 0014. The read channel

- **Date:** 2026-08-13
- **Status:** accepted

Continuous and bulk reads (`peek(deck)` for live position/meter, `peaks(deck)` for cached waveform columns) are a third channel on the facade, beside `probe()` and the event log, consumed only from one shared `requestAnimationFrame` loop in `src/ui/frame.ts` — never through a component reading `ctx.currentTime` or an `AudioBuffer` directly.
