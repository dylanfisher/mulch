# 0013. Fingerprints close the loop

- **Date:** 2026-08-13
- **Status:** accepted

`./scripts/drive --render SECS FILE` renders offline through `src/app/renderOffline` inside the same pinned Chromium the live host runs in and prints a fingerprint — six measurements (`sampleRate`, `frames`, `clicks`, `silence` spans exactly; `peakDb`/`dcDb` ±0.5dB; `rmsDb` per 100ms window ±0.5dB), never a hash — diffed against a deliberately-blessed golden at `fixtures/golden/render-smoke.json`.
