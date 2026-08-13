# 0010. The harness transport: drive, the pinned browser, and the vite stdin trap

- **Date:** 2026-08-13
- **Status:** accepted

## Context

M1 of [docs/plan.md](../plan.md): `./scripts/drive` boots the preview build in headless
Chromium, feeds it JSONL commands, and streams back the event log. Most of its design was
decided in the plan (§2–§3); this records what landed and the two things that were not
obvious from it.

## Decision

- **The hour-one spike passed.** With `--autoplay-policy=no-user-gesture-required` and no
  output device, Playwright's headless Chromium runs an `AudioContext` whose `currentTime`
  advances, and an `OfflineAudioContext` renders. The architecture's footing (plan §2) holds
  with no extra flags — no null-sink flag was needed.
- **Playwright is pinned exactly** (`"playwright": "1.62.1"`, no caret) — the Playwright
  version is what pins the Chromium revision, so a floating range would float the browser
  the fingerprints (M3) are reproducible within. `./scripts/setup` installs the browser;
  CI caches it keyed on the lockfile, so the cache rolls exactly when the pin does.
- **Drive strips vite's stdin listener.** `vite.preview()` programmatically still installs
  its CLI shutdown hook: on stdin `end` it closes the server and calls `process.exit()`.
  Drive reads stdin to EOF as input, so that hook fired mid-run and the exit raced the
  final probe line — an intermittently truncated stream, the worst kind of transport bug.
  Drive owns both stdin and the server's lifetime, so it removes the listener vite adds
  (diffing stdin's `end` listeners around the `preview()` call). Vite's SIGTERM handler
  stays. Revisit if vite grows an option to opt out.
- **The assertions live in `scripts/smoke`, not in drive.** Drive is a transport and must
  not learn what a param is (plan §5). The gate's `drive` step runs smoke, which runs drive
  twice: the fixture pass (param.set in → param.changed out, gapless `seq`, `probe()`
  agreement) and `--expect-no-attach`, the negative half of the runtime-gated
  `window.mulch` contract — a flag-less preview page must not expose the hook.
- **Until M2, the live clock is `performance.now()/1000`** (`realTimeClock` in
  `src/app/clock.ts`) — wall time in seconds, so envelopes keep their unit, swapped for
  `ctx.currentTime` the day an `AudioContext` exists. A 10 ms interval in `main.tsx` pumps
  the queue; fine timing is M2's schedule-ahead transport's job, not this loop's.

## Consequences

From this commit on, every change is verified through the same pipe an agent uses:
`./scripts/check` builds (only when stale), boots the real preview bundle in the real
browser, and asserts on the stream. The loop reuses a running preview server or the cached
`dist/`, with `--fresh` and `--dev` as the escape hatches (plan §3).
