# 0376 — A dead audio device stops the harness once, in one sentence

**2026-09-12.** When Chromium reports that it has lost the output device, every part of the harness
that waits on the instrument's clock abandons the wait as soon as the clock is read and found
standing still, and says the one sentence in `scripts/smoke.d/audioDevice.js`. That file is the
whole declaration: the string Chromium prints, the sentence the harness answers with, the
two-reads-a-beat-apart that tells a stopped clock from a slow one, and the `AudioDeviceGone` a lane
raises. `scripts/drive` imports it; so do `scripts/smoke` and the browser half.

**Because the machine's fault was being paid for once per wait.** On 2026-09-11 this machine's audio
output went away mid-run and `./scripts/check`'s `drive` step took 17m37s to report one red line
while every other step was green; eleven of twenty-three step agents paid that wait at least twice.
Reproduced deterministically with a frozen `AudioContext.currentTime`, the same state cost 61.5s:
the six drive runs go at once, and the two that wait on a live clock each sat out the full 60s
`settle` timeout for a fact the first read of the clock already had. The browser half cost 16s of
it and printed three unrelated-looking failures — one lane stopped on a Playwright timeout, one on
`renders`' prelude, one on an assertion that read "deck a held nothing" — none of which names the
machine, and each of which reads as a defect in whatever is being gated. After: 2.0s, one sentence.

**A clock that is merely slow still gets its minute.** The device error alone abandons nothing.
Only a clock read twice, 500ms apart, that has not moved is treated as stopped — Chromium having
printed the error once is not proof that nothing is rendering, and a wait for real audio time is
allowed to be slow. Where the loss is reported and the clock is still moving, the 60s stands
exactly as before.

**A live device pays nothing.** A lane's check is a boolean that the console listener set, read
once before the lane's first scenario; no round trip, no extra page, no new wait. The gate's mean
moved from 10.64s to 10.76s across three runs each side, inside 0012's 250ms. Nothing that plays is
skipped when the device is alive, and no scenario's own assertion moved.

**A lane cut short by the device prints no page.** `reportPageFailure` exists because a Playwright
timeout says only that time passed (0036); a probe of a page whose clock is stopped is the same
non-answer in three hundred lines, and three of them bury the one sentence that is true. So a lane
that fails with its clock stopped under it — at the check before it starts, or on whatever it
happened to stop on later — returns `AudioDeviceGone` and nothing else, and `scripts/smoke` drops
its usual "the failing lane's ring and probe are printed above" for that one case, because they are
not. Both places ask the same two-part question, and the second one has to: a lane that blamed a
live device for a failure it read off the page would suppress the evidence for a real regression
and send its reader to look at a sound card, and a hosted runner that merely ran out of clock
(0330) would lose its `cutShort` the first time Chromium mentioned audio.

**What this asks of a future lane or scenario:** nothing, and that is the point. Do not add a
second detector, a second wording, or a per-scenario guard — a scenario keeps waiting on the clock
in its own words and the lane above it does the stopping. If the sentence needs to change, it
changes in `audioDevice.js` and every half of the harness changes with it.

**Not chosen:** shortening `WAIT_MS` or the transport's 60s. Both are picked against a working
machine (0330) and neither number is what went wrong; cutting them would make a loaded machine red
to buy back a minute on a broken one.
