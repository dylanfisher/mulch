# 0375 — A checkpoint measures through the harness, and adds an instrument to it

2026-09-11. Standing on [0036](0036-the-harness-fails-by-a-clock.md),
[0050](0050-the-gate-counts-things-and-the-profiler-measures-them.md),
[0051](0051-the-profiler-remembers-its-own-runs.md) and
[0070](0070-a-per-frame-read-refills-and-never-clears.md).

## What was paid for twice, and then three more times

Five performance checkpoints in one block ([0353](0353-the-stamp-runs-on-the-marks-bit-grid.md),
[0354](0354-the-screen-tile-is-baked-off-the-frame.md),
[0358](0358-a-landing-costs-the-stamp-nothing.md),
[0365](0365-a-knob-turned-is-a-fill-and-only-the-inks-ladder-is-a-bake.md),
[0369](0369-the-block-closes-on-the-budget-and-no-kernel-qualifies.md)) each built the same thing by
hand: a base commit in a `git worktree` with a dev server of its own, a headed Chromium on a
2560 × 1440 picture at two device pixels, the drift smoke's rack on two yards, an eight-second
window, 0307's 480-move drag, and the same five accumulators compiled into the same five functions
and taken out again before the gate. Between 56 and 187 minutes apiece, and half the run's cost.

**So the setting is `./scripts/measure`, and a checkpoint measures through it.** A checkpoint that
wants a sixth instrument adds it here — a span in `src/ui/moireCost.ts`, a phase in the harness —
rather than writing the sixth private script. That is the whole decision; the rest is what the five
runs learned, recorded once so nobody re-learns it.

## The hook, and what it costs when nobody is asking

`src/lib/measure.ts` holds one accumulator per named span, declared at module level the way
`tunable()` declares a dial, and filled only while something is measuring. `costStart()` answers
nought rather than reading a clock and `costEnd()` returns before it reads one, so an unmeasured
frame pays a boolean test at each end of a span and allocates nothing (0070) — the precedent is
`measureFrameCost` in src/ui/frame.ts, which gates the frame loop's own number the same way. The
six spans are named in `src/ui/moireCost.ts`: the painting, the four inside it (`readMarks`,
`cutField`, `stampMarks`, `tintThrough`) and the screen tile's loop. Each is timed where it is
asked, because a function with its own early returns would otherwise carry a clock at each of them.

**The worker posts its bake with the reply, only when asked.** A cost declared in the worker's realm
is one the page could never read, so `ScreenBakeRequest` carries `measure` and the reply carries
`bakeMs`; the one accumulator for it is the shop's. The sliced fallback is not timed into it — its
loop is spread over as many frames as the budget takes, so its wall clock is not the same number.

`window.__MULCH_MEASURE__` is the one opening, attached by src/main.tsx behind the same gate
`window.mulch` is behind. It carries the tuning registry too, because a harness that imports
`src/lib/moireTuning.ts` into the page gets a **second, empty registry**: a dev server serves an
edited module at a timestamped URL, and checkpoint C lost two interleaved pairs to exactly that
before its logs said "no tunings registered" (0365).

## What the harness does not do

**No CDP Profiler.** With the picture up at this size `Profiler.start` wedges the renderer and does
not return inside four minutes, while an ordinary evaluate on the same page comes back in 45 ms
(0353). Attribution is the accumulators, a `longtask` observer, a rAF-gap histogram and a wrap of
the popped realm's own 2D prototype — that last one being the only instrument that is the same in
every tree whatever its source says.

**No server it did not start.** Both dev servers are the harness's, on free ports with cache
directories of their own, reaped on every exit path including the deadline; the human's 5173 is
never looked at, and the frontmost application gets focus handed back after every launch and every
pop-out, because the human is working on the machine while this runs.

**Two readings that are not each other's neighbours.** `paintMoire` and the four spans inside it are
timed in `useMoirePicture`, which every strip shares with the popped picture — a yard's strip goes on
painting beside a window that covers nothing — so at the budget's setting those means are over three
canvases, one large and two 32 pixels tall. 0358 corrected the same claim once already. The draw
count is the popped realm's alone, so the harness divides it by that realm's own clears and never by
the painting count, and the tables say which is which.

**No judgment.** It prints the budget's four numbers per tree and exits 0 whatever they say, exactly
as `./scripts/profile` does and for the reason 0051 gives; it is never in `./scripts/check`. A tree
older than the hook answers `·` — not measured — rather than a failure, which is what a base commit
from before this decision reads as.
