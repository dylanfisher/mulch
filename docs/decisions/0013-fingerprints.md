# 0013. Fingerprints close the loop

- **Date:** 2026-08-13
- **Status:** accepted

## Context

M2 gave an agent a way to hear that something happened — `deck.started`, `deck.looped`, an
`at` on the audio clock. It gave no way to hear _what_. Every assertion in `scripts/smoke` was
about the event log; a deck that played the wrong samples, at the wrong gain, with a click at
the loop point, passed all of them.

[docs/plan.md](../plan.md) §3 names the answer: an offline render, and a fingerprint of it as
diffable text. §2 names where determinism comes from — an `OfflineAudioContext` inside the same
pinned Chromium the live host runs in, never a Node implementation of Web Audio, which would be
a second DSP implementation and a green test that proves nothing about the browser.

## Decision

**`./scripts/drive --render SECS FILE`** renders the command file through
`src/app/renderOffline` and prints the same JSONL stream a live run prints, then one more line:
`{"fingerprint":…}`. `--out x.wav` and `--png x.png` write the render itself when a person
wants to hear or see it.

**The fingerprint is six measurements, and each states its own tolerance** — decided once in
`src/lib/fingerprint.ts` rather than per test:

| field                          | compared | why                                                         |
| ------------------------------ | -------- | ----------------------------------------------------------- |
| `sampleRate`, `frames`         | exactly  | a render is exactly as long as it was asked to be           |
| `clicks`                       | exactly  | a discontinuity is present or it is not                     |
| `silence` (frame spans)        | exactly  | this is the timing assertion; a frame of drift is the point |
| `peakDb`, `dcDb` (per channel) | ±0.5 dB  | measured, so compared in dB, never as floats                |
| `rmsDb` (per 100ms window)     | ±0.5 dB  | where a gain-staging regression shows up                    |

Nothing hashes the samples. A hash says something changed and nothing about what, which is the
opposite of what an agent with no ears needs.

**The golden lives at `fixtures/golden/render-smoke.json` and is blessed deliberately** —
`./scripts/smoke --bless`, which prints a reminder to read the diff. `scripts/smoke` also
asserts the facts the fixture is _built_ to produce (a full-length render, click onsets, a
silent tail, matched channels) independently of the golden, so a careless bless cannot quietly
empty the test.

**A fixture means the same thing driven and rendered.** Offline the clock is the render
timeline, so `drive` resolves `wait` and `after` against a cursor that starts at zero instead of
against the page's clock. `wait 1` then a command is a command at one second either way. The
instrument's own contract is untouched: it still never sees `wait` or `after`.

**The engine's unlock is injected.** `createAudioEngine` takes `resume`, which is `ctx.resume`
live and `null` offline — because the render driver suspends and resumes the context on its own
schedule to pump the command queue, and a second resumer would fight it. The gate itself stays
where it was, with `deck.play` (0011): only who owns the context's suspension differs.

## Alternatives considered

- **Rendering in Node with a Web Audio shim.** Rejected in the plan and still right: a green
  test against a different DSP implementation proves nothing about what ships, and parity
  between two engines is the failure the post-mortem describes.
- **Hashing the rendered samples.** One number, no diagnosis, and no tolerance to state.
- **RMS windows only, no silence spans.** Windows are 100ms; the spans are sample-exact, and
  they are what turns a click train through a loop point into a timing assertion. A loop that
  drifts by a millisecond moves 48 frames of a boundary and 0.0 dB of any window.
- **Per-channel RMS windows.** Doubles the longest field to catch what per-channel `peakDb` and
  `dcDb` already catch. Two numbers per channel, not forty.
- **A `--render` mode that reuses the live instrument.** A render is a second session on a
  second context; sharing one would mean an agent could not render while something was playing,
  and the render's events would interleave into the live stream with a second `seq`.

## Consequences

`scripts/smoke` gained a fourth concurrent `drive` run at ~0.46s — free underneath the deck
fixture's ~2.3s, so the gate is unchanged at ~3.3s (0012 still holds).

The golden is pinned to this Chromium revision, at 48kHz stereo regardless of the machine's
device rate. A Playwright upgrade may move it; that churn is the diff it is, read once and
blessed, and the tolerances are chosen so nothing else moves it. If a field turns out to move
without a cause, the fix is to widen or drop _that field_ with a reason written here — never a
`.skip` on the golden test (plan §5).
