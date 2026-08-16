# 0011. Sound: how a worklet is loaded, who reports transport facts, and where a param is bound

- **Date:** 2026-08-13
- **Status:** accepted

A worklet is plain `.js` loaded by `?url` through one helper; the audio thread alone reports "started"/"looped" (never a main-thread timer); `playing` is written only from the graph's own report, never on intent; a param is declared in `params.ts` and bound in `chain.ts` via a `satisfies Record<ParamId, AudioParam>` that fails to compile if unwired; and every session write emits an event, so the log alone accounts for every state change.
