# 0031. Rate lives in the play plan, and key lock did not ship

- **Date:** 2026-08-15
- **Status:** accepted

## Context

P14 asks for a wide-range speed control per deck, a pitch knob in semitones, and a key-lock
switch. Speed itself is one line — `playbackRate` on the buffer source — and that is not where the
step's work is. The work is that every piece of position arithmetic in the build was written
against 1×.

There are two of them, on opposite sides of a boundary nothing can import across. `playheadAt` in
`src/lib/timeline.ts` reads a plan as a remainder, on the main thread, for the waveform's
playhead. `src/audio/worklets/loop-reporter.js` reads the _same plan_ as a floor division, on the
audio thread, to say when a loop went round — and a worklet is its own module graph with no
bundler preamble, so it cannot import the file that states the arithmetic. The plan is the only
thing the two share, and both of them assumed one second of clock bought one second of buffer.

Three questions had to be answered before any code. What a rate change does to a plan that is
already running, given that the answer must not be "restart the source". How the two sides stay
one piece of arithmetic when one of them cannot import the other. And whether key lock — a pitch
shifter, with no dependency permitted — can be made to sound like something a person would switch
on, which the step explicitly allows to be answered "no".

## Decision

**Speed and pitch are ordinary registered deck parameters; there is no key lock.** `deck.speed` is
a multiplier from 0.25 to 4 on a log curve, so half speed and double speed sit the same distance
either side of 1, and it claims no BPM — nothing in `src/audio` knows the tempo of what is loaded.
`deck.pitch` is semitones, stepped to whole ones. Both are declared once in `src/audio/params.ts`
and bound once in `src/audio/chain.ts`, so defaults, the knob, serialization, clips, restore,
history and archives all follow for free, exactly as [0011](0011-sound.md) and
[0016](0016-effects-are-ordered-plugins.md) said a parameter should.

Neither opts into automation, and that is a decision rather than an omission: a lane would make
the rate a continuous function of time, and every formula below is written against a rate that is
constant between two re-anchorings. A ramped rate makes the true position an integral, and there
is no inverse for the reporter to place a boundary with.

**Their AudioParams live on the source node, so the chain holds their values and replays them.**
`gain` and `pan` bind to nodes `buildDeckChain` owns and are there from construction;
`playbackRate` and `detune` belong to the `AudioBufferSourceNode`, which exists only between a
play and a stop. The binding map stays total over `DeckParamId` — a new deck parameter still fails
to compile until it is wired — but each entry is now a lookup that may answer `null`, and the
chain keeps every deck parameter's current value. `bindSource` writes speed and pitch onto each
source the transport builds, so a rate set while stopped is heard on the next play, and
`chain.rate()` is the one composition of the two: `speed * 2 ** (semitones / 12)`, stated once in
`playbackRate()` in `src/lib/timeline.ts`. Semitones are the registry's unit and cents are the
node's; that conversion happens in exactly one line of the chain.

Pitch therefore moves the read rate with it, because without key lock it is the same axis as speed
in different units — the turntable's own honesty, and the reason the step wanted a switch.

**The plan carries the rate, and a rate change re-anchors it rather than restarting anything.**
`PlayPlan` grows two fields: `rate`, buffer seconds per second of clock, and `phase`, how far into
the current cycle the source already was at `startTime`. A play posts a plan with `phase: 0`.
A rate change while playing does not touch the source — the native loop keeps looping and the read
position is continuous, only its slope changes, so there is no discontinuity to click — and
instead posts a plan re-anchored at the instant of the change: `startTime` is now, `phase` is the
position the old rate had reached, and the count of boundaries already crossed goes in `base`.
`playheadAt` at that instant returns exactly what it returned a moment before, which is what
"does not desync the playhead" means arithmetically rather than approximately.

The re-anchor instant is the later of the clock and the plan's own start, not the clock. A deck is
planned for `LOOKAHEAD_SECS` before it sounds, and a rate change inside that window is a change to
a source that has not started: anchoring it at `now` would tell both sides of the seam that
playback began a lookahead early, and the playhead would lead the sound by that much for the rest
of the pass. A plan that has not started keeps its own `startTime` and its own `phase`, and only
its slope changes.

Speed and pitch are also the only deck parameters written with `setValueAtTime` instead of
`rampTo`. A ten-millisecond ramp would be a rate the plan cannot describe, so they step at the
same instant the plan is re-anchored at.

**Both sides of the worklet seam read the same three formulas, and `src/lib/timeline.ts` is where
they are stated.** `playheadAt` is the remainder, `cyclesAt` the floor division, `cycleTimeAt` its
inverse — the wall-clock time of the nth boundary, which is where `period / rate` shows up as the
cost of one cycle. The worklet restates `cyclesAt` and `cycleTimeAt` in its own code, as it always
restated the floor division, and its comments name the functions it is a copy of. That duplication
is the price of a module graph with no imports; what changed is that the copy now has a named
original with tests, on both sides: `src/lib/timeline.test.ts` drives the pure maths, and
`src/audio/worklets/loop-reporter.test.ts` stands up `AudioWorkletProcessor`, `registerProcessor`
and `currentTime` as globals and drives the real processor file block by block from Node.

**A boundary is announced when the absolute count says it is new, never because a plan is new.**
The two clocks disagree by up to a render block in _either_ direction, and the re-anchoring is
computed from the main thread's. So `base` can be one behind a boundary the audio thread has
already reported, or one ahead of one it has not reported yet. The processor keeps an absolute
cycle counter across re-anchorings and compares it against `base + completed`: the first case
reports nothing, the second reports the boundary that was owed. Both were found by a real render —
the mid-flight speed change in `scripts/smoke` skipped cycle 2 until the counter stopped being
clamped upwards.

**A loop's minimum length is a fact about wall time, so it scales with rate.** The floor was a
render quantum of buffer; a cycle now costs `period / rate` seconds, so at 4× a loop needs four
quanta of buffer to still last one quantum of clock. Below 1× the floor stays where 1× put it,
because accepting a shorter loop on a slow deck would mean refusing it again on the way back up.

**The waveform reports the tempo it is playing, not the tempo it decoded.** Analysis measures the
buffer ([0025](0025-beat-analysis-is-derived-not-durable.md)); the deck reads that buffer at
whatever the knobs ask for, so the readout is `analysis.bpm * rate`. Nothing durable changed —
the analysis is still derived, and the rate is still a parameter.

**Key lock does not ship, and no switch for it exists anywhere.** Not a durable field, not a
command, not a disabled control. The step is explicit that a switch nobody would turn on is worse
than none, and what was measured says nobody would turn this one on. See below.

## What the stretch kernel measured

The step called this the repo's first stretch kernel and asked that what it learns be written
down, because §4 starts paulstretch and the rearranger from here. Both attempts were plain
JavaScript, measured offline in Node before anything was moved into a worklet, which is the order
the step asked for and the right one: neither ever needed a browser to be disqualified.

**A two-tap crossfaded delay line** — the classic cheap key lock: one circular buffer, two read
taps a half-window apart, Hann-crossfaded, the read pointer drifting against the write pointer at
`1 - ratio` samples per sample. It is correct in the sense that its dominant partial lands exactly
where it should: a 440 Hz sine shifted seven semitones peaks at 659 Hz, to the hertz. It is
unusable in every other sense. Against a 437 Hz sine — deliberately not commensurate with any
grain length, because a 440 Hz sine at a 50 ms grain is an exact 22 periods and measures
_perfectly_, which is a phase coincidence and not a result:

| grain | shifted partial | worst sideband | amplitude ripple |
| ----- | --------------- | -------------- | ---------------- |
| 10 ms | −22 to −36 dB   | −31 to −11 dB  | 0.9–1.6 dB       |
| 20 ms | −22 to −38 dB   | −34 to −9 dB   | 5.7–8.0 dB       |
| 30 ms | −20 to −35 dB   | −17 to +1 dB   | 9.6–15.2 dB      |
| 40 ms | −4 to −32 dB    | −35 to +1 dB   | 3.1–3.3 dB       |
| 60 ms | −0.3 to −21 dB  | −29 to −7 dB   | 0.5 dB           |
| 90 ms | −4 to −28 dB    | −24 to +2 dB   | 5.9–6.1 dB       |

Sidebands are relative to the shifted partial, at multiples of the grain rate around it. Read the
spread across each row rather than any cell: the same kernel loses 4 dB of the partial at one
grain size and 32 dB at another, and swings 15 dB of amplitude ripple in and out, purely on the
phase relationship between the grain length and the input's own period. That is the two taps
cancelling each other, and it is audible as warble at the grain rate on anything tonal. There is
no grain size that fixes it, because the problem is not the size.

**A WSOLA time-stretch plus a resample** is the known answer to exactly that — nudge each
synthesis grain to the lag that best correlates with what is already written, so the crossfade
joins two waveforms that agree in phase. It was implemented and it did not reach a working state
inside this step: with the correlation search enabled the fundamental collapsed 30–60 dB, which is
a bug in the search or the overlap-add and not a property of the algorithm. It was not debugged
further, because by then the decision was already made on the first kernel's numbers and the
parts of P14 that must ship either way were done.

**What a future attempt should start from.** Not the two-tap delay line — it is a dead end for
tonal material and the table above is the evidence, so do not re-derive it. Start from WSOLA with
the correlation search, and build it in this order:

1. **In `src/lib`, as a pure function over `Float32Array`, with the bench as the test.** Every
   number in the table above came from a Node script in under a second. A kernel that has to be
   heard in a browser to be judged cannot be iterated on, and the gate has no room for it
   ([0012](0012-the-gate-stays-under-four-seconds.md)).
2. **Measure a non-commensurate frequency, and measure several.** The single most misleading
   result in this whole exercise was a perfect one, from a 440 Hz sine at a 50 ms grain.
3. **Measure amplitude ripple, not only spectrum.** The warble is an envelope artefact; a
   spectrum at one point in the signal misses it entirely.
4. **Only then a worklet, and only then a switch.** The live half is a second processor, a durable
   per-deck flag, a command, a restore stage and a control — none of which is worth writing
   against a kernel whose quality is unknown.

The rest of P14 is what makes that attempt cheaper when it comes: the rate is already a number the
plan carries and both sides of the seam already read, so a shifter that compensates for it has a
single, tested place to read the ratio from.

## Alternatives considered

- **Restarting the source on a rate change** — rejected, and it is the thing the step names. It is
  what `setLoop` does for a loop _move_, for a reason that does not apply here: a moved loop leaves
  the reporter counting from a phase the source no longer has, whereas a rate change leaves the
  phase exactly where it was. Restarting would click and would throw the playhead away for free.
- **Ramping speed like every other parameter** — rejected above. The plan would have to describe a
  rate that is changing, and `cycleTimeAt` would have no closed form.
- **Posting the loop period to the worklet already divided by the rate, leaving the processor
  unchanged** — rejected. It hides the rate from the side of the seam that most needs it: the
  processor would have no way to place a boundary in the plan's own terms, and "the audio thread
  does not know how fast the deck is running" is a sentence that will be false the first time
  anything else on that thread needs it.
- **Folding `phase` into `offset`** — rejected for a loop. `offset` is the wrap anchor, and moving
  it to the mid-cycle position would change where the loop wraps to. A one-shot has no cycle, so
  it does exactly that instead and carries no phase.
- **A per-plan cycle index instead of an absolute counter** — rejected. It cannot express "this
  boundary has already been reported", which is the only thing that stops a re-anchoring from
  double-counting when the audio thread is ahead.
- **Automatable speed** — rejected above. Worth revisiting only with a plan shape that can
  describe a rate envelope, which is a different decision.
- **A key-lock switch shipped disabled, or shipped with the granular kernel behind it** — rejected.
  The step says not to ship a switch nobody would turn on, and a disabled control is a promise the
  session shape would then have to keep.
- **Adding a pitch-shift dependency** — not available. The step is explicit that key lock adds
  none, and [AGENTS.md](../../AGENTS.md) requires approval regardless.

## Consequences

Every stored session written before this decision holds a two-key `params` map and no longer
validates, so it is discarded — which [0026](0026-pre-release-has-no-migrations.md) already
decided.

A deck at 4× reads its buffer four times as fast, so a loop that was legal at 1× can be refused
after a speed change. The refusal is the ordinary one — `setLoop` returns `null` and
`deck.loop.changed` carries it — but a restore is louder: `prepareRestore` sets deck parameters
before it applies loops and throws if a stored loop does not survive, so a session saved with a
very short loop at a very high speed will refuse to come back rather than come back wrong.

An automation lane armed for future passes was laid against the old rate's pass origins, so a rate
change re-arms every lane from the pass the clock is inside. The pass currently sounding is
re-laid from its own new origin, which means a lane can step at the instant the rate changes: the
part already played happened at the old rate and the new schedule assumes the whole pass ran at
the new one. This is inherent to re-anchoring a pass mid-flight, and it is one parameter jump on a
gesture, not a loop glitch.

`deck.pitch` moves the rate, so it is a second speed control in musical units until a shifter
exists. That is honest and it is what a turntable does, but it is the one thing about this step a
reader will assume works the other way.
