# 0018. Offline export is the renderer's PCM projection

- **Date:** 2026-08-14
- **Status:** accepted

## Context

M3's diagnostic renderer grew optional WAV output with its fingerprints, so M7's export behavior
already existed before the milestone named it. What was missing was the load-bearing assertion:
the file must contain the samples produced by the shared Web Audio graph, not samples from a
second export-only graph or DSP implementation.

## Decision

**Offline export remains the optional WAV projection of `renderOffline`; it is not a new render
path.** `src/app/render.ts` builds one `OfflineAudioContext`, creates the ordinary instrument with
`createAudioEngine`, runs the ordinary command queue, and derives the fingerprint, diagnostic PNG,
and 16-bit PCM WAV from that context's rendered `AudioBuffer`.

Two checks make the guarantee. `scripts/arch` gives every signal-chain constructor one production
caller, enforcing the route from `createAudioEngine` through `createDeckVoice` and `buildDeckChain`.
The browser smoke then intercepts the renderer's `startRendering()` result without changing the
graph. It requests a WAV through the public render API, validates the file's channel, rate, frame,
and byte counts, and compares every interleaved file sample with every rendered channel sample. The
epsilon is half a positive 16-bit PCM step, exported by `src/lib/wav.ts` beside the bit depth and
encoder rather than restated in the test. The fixture is deliberately audible and exercises gain, pan,
and a registry effect, so an empty or bypassed graph cannot pass as parity. An existing CLI fixture
also writes its render through `--out` and checks the resulting file, covering the final transport
step without another browser run.

Offline worklet messages use an explicit ordered round-trip rather than an event-loop delay. Before
rendering, it proves zero-time plans reached every reporter. At each suspension it first drains
reports from the elapsed interval, then delivers due commands, then proves their replacement plans
arrived before resuming. A final round-trip drains reports produced by the last interval. This order
matters: pumping first can invalidate a plan id while its valid `started` report is still crossing
threads. The barrier has a loud timeout, so a stopped worklet fails the render instead of hanging.

## Alternatives considered

- **Build an export graph in the test** — rejected because a second wiring can agree with a second
  implementation while both diverge from the live graph, recreating the failure this test guards.
- **Compare fingerprints** — rejected because their deliberate dB tolerances do not prove sample
  parity or correct WAV interleaving.
- **Expose raw `AudioBuffer` data through the facade** — rejected because the read-channel boundary
  explicitly keeps buffers and graph objects private. The test observes the browser primitive and
  returns only scalar diagnostics.

## Consequences

`./scripts/check` now proves the public renderer's PCM projection matches its structurally guarded
shared graph within half a 16-bit quantization step, and that the CLI writes that projection as a WAV.
The parity render shares the persistence smoke's preview server and browser, so it adds no new
build, launch, or real-time wait to the gate.
