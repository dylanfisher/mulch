# 0086 — A render hands its samples back

`renderOffline` detaches the rendered `AudioBuffer`'s channels before it returns
(`releaseSamples`, `src/app/render.ts`), and removes every deck of its own host before that.

An OfflineAudioContext that has loaded a worklet module is retained by the browser and not by any
reference in `src/`: Blink's `AudioWorkletMessagingProxy` is a C++ persistent root, and an offline
context has no `close()`. A context retains the buffer it rendered, so before this every export
left its whole output alive — measured at 220MB after a ten-minute export, and another 22MB for
each further minute exported, with no way to reach it. Detaching each channel's `ArrayBuffer` is
the only thing that gives the memory back.

The consequence, which is why this is written down: after `renderOffline` resolves, the samples it
rendered are gone. The result object is the whole of what a render produces — events, probes,
fingerprint, wav, png — and anything wanting the raw samples must copy them while the render is
still running, as `scripts/smoke.d/parity.js` does at its `startRendering` hook. Nothing may add a
read of the buffer after the return.

Both the teardown and the detach are in a `finally`: encoding an hour asks for over a gigabyte in
one call, and a throw there would leave exactly the residue this closes. A throw before the render
resolves is the one case nothing covers — the context allocates its output when it is constructed
and hands over no reference until `startRendering` resolves.

The peak this does not move is inherent: encoding needs every sample and every encoded byte at
once. Plan §4 owns that number — both what was measured and what the two allocations add up to —
and this file does not restate it.
