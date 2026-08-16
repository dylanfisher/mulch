# 0038. Pause holds the playhead, stop rewinds it

- **Date:** 2026-08-15
- **Status:** accepted

`deck.play.toggle` (and Space) now pauses, holding the playhead in `pausedAt` (`src/audio/deck.ts`) and resuming a loop at the same phase, while `deck.stop` still rewinds to the top; a pause reports itself as a `deck.stopped` event with reason `"paused"`, and a pause inside the lookahead is a plain stop since nothing was ever sounded.
