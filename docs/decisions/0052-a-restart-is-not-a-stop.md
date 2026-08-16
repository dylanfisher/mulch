# 0052. A restart is not a stop

- **Date:** 2026-08-16
- **Status:** accepted

A seek on a playing deck reschedules its transport, and the stop half of that restart is reported to nobody: `seek` in `src/app/engine.ts` marks the deck as rescheduling for the one synchronous call, so the voice's `stopped` report writes neither `playing: false` nor a `deck.stopped` event. One state, not two — no "seeking" flag on the durable deck and no view-local smoothing (0041).

That silence is only safe because the other half of `playing` no longer waits for a report: becoming true is the graph's `started`, but becoming false is written by whichever command halted the voice, since a halt is finished the moment it returns. Without that, a stop, pause or load inside the replacement source's lookahead — where the transport reports nothing, having never sounded — would leave the deck reading as playing for ever.
