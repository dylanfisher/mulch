# 0041. A seek is transport, not durable

- **Date:** 2026-08-15
- **Status:** accepted; its "a seek however far it travels" clause now holds for a press without Shift, a Shift-held one being the sweep [0066](0066-shift-is-the-loop.md) gave the peaks

A click on a waveform sends `deck.seek`, which moves the playhead and nothing else: no history entry and nothing durable, the position held in the live `paused` field a pause already writes, and the same behavior stopped (where the next play begins) as playing (a restart from that offset, at the rate the deck is running); with a loop active only a point inside it seeks (`seekTarget`, `src/lib/timeline.ts`), and a press on the peaks is a seek however far it travels, because the loop is dragged by its own handles and not by the peaks ([0053](0053-a-loop-is-dragged-by-its-handles.md)).
