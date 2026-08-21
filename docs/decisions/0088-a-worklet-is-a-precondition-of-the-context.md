# 0088. A worklet is a precondition of the context, not of the chain

- **Date:** 2026-08-20
- **Status:** accepted; rests on the one-signal-chain boundary and [0068](0068-an-export-is-a-render-spec.md)

`buildDeckChain` is synchronous and stays synchronous, and so does every plugin's `build`. A processor module is registered on a context by whoever creates that context, before the first node is built on it: `src/main.tsx` for the live one, `renderOffline` for the offline one, both through the one `loadWorklets(ctx)` over the one `MODULES` list. That list is what makes the two contexts the same instrument — a processor added for the live path cannot be absent offline, because there is no second list to forget.

So a plugin whose graph contains a worklet constructs `new AudioWorkletNode` directly and lets it throw when the module is not there. No `await` reaches into a chain, no registration is lazy, and an unregistered processor is never caught and bypassed: an effect that quietly dropped itself would render an export missing it and report nothing, which is precisely the failure 0068 says an export may not have. A loud construction error is the correct behaviour, because the only way to reach it is a context that was built wrong.

The pairing is checked rather than remembered. `src/audio/worklet.test.ts` reads every processor file in `src/audio/worklets/`: the name each one registers must be an exported constant of `worklet.ts`, and each file must be imported `?url` into `MODULES`. A worklet that exists and is never registered — the shape that makes an export silently lose an effect — fails that test at the seam instead of failing in a browser nobody was watching.
