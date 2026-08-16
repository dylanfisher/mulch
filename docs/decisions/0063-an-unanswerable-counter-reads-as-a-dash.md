# 0063 — An unanswerable counter reads as a dash

A counter the browser cannot answer renders `—` in the DebugConsole, never `0`. `audioLoad` is
null in a browser without `AudioContext.renderCapacity` and while nothing is measuring; `heapMb`
is null everywhere but Chromium, which alone exposes `performance.memory`. A zero there would be
a measured silence — an audio thread doing no work, a heap holding nothing — and a reader cannot
tell that apart from a number nobody took (principle 5).

So the type carries the absence rather than the formatter inventing a floor: a counter that can
be unknown is `number | null` on `Stats`, and the `COUNTERS` entry that reads it is the one place
that turns null into `—`. A counter that is always knowable — `bufferMb`, which the engine counts
itself — stays a plain `number` and is allowed to be zero, because its zero is a fact.

This binds every counter added after it: decide whether the number can be absent, say so in the
type, and let the console print the dash.
