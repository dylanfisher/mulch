# 0018. Offline export is the renderer's PCM projection

- **Date:** 2026-08-14
- **Status:** accepted

Offline export remains the optional WAV projection of `renderOffline`, built from the same shared Web Audio graph as live playback, not a second export-only graph or DSP implementation — `scripts/arch` holds that guarantee by giving every signal-chain constructor exactly one production caller.
