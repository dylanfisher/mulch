# 0218 — A card peeks once a frame, however many dials read it

- **Date:** 2026-08-30
- **Status:** accepted, standing on
  [0070](0070-a-per-frame-read-refills-and-never-clears.md) — the memo is a closure and the stamp is the one loop's own
  count, so nothing per-frame enters React state — and on
  [0035](0035-a-lane-runs-on-its-own-clock.md), whose live read every dial on this card paints
  from. What the card already said was "once per card"; this says once per card **per frame**.

**Dragging a dial in Which Ground stutters because the frame loop is doing the card's work forty
times over, not because the picture beside it is expensive.** P151 named three suspects and the
measurement picked one; the other two are refuted here with their figures so nobody guesses them
again.

The instrument is `Profiler` over a real drag of the Every dial on a playing, arranged yard —
four seconds, ~480 pointer moves — with base and head runs interleaved, and a Node timing for the
one suspect that is pure arithmetic.

- **The per-frame `voice` read: guilty.** The card hands every dial a reader, and each dial called
  it once a frame from its own frame callback. Each call was `instrument.peek(deck)`, and a peek
  refills the deck's _whole_ read — including the meter's `getFloatTimeDomainData` copy and the
  `peakMagnitude` and `crestFactor` reductions over it. Forty-five knobs, forty-five peeks a frame,
  for a number that cannot move inside one frame. Turning the voice off entirely took the one
  loop's inclusive cost from **3.77% and 3.66%** of the wall clock to **2.06% and 2.03%** across
  interleaved runs — about **1.7 points, near half of everything the loop was doing** — and the
  three meter frames under it accounted for 1.49 points of that on their own.
- **`groundsAhead` on every commit: refuted.** **0.016ms a call** over 2,000 calls in Node, at
  every period from 1 to the dial's own 64. `PLAYER_GROUND_LOOK` already bounds the walk, which is
  what that bound was for. Forty of them a second is 0.6ms a second.
- **`usePeakCanvas` on every commit: refuted.** The peaks are `loadedPeaks.get(deck)`, one stable
  object per load, so `draw` and `rebake` do not change identity and the observer is not rebuilt: a
  ResizeObserver counter installed across the drag recorded **zero** re-observations.
- **`PlayerBeds` re-deriving off the whole spec: refuted.** It draws one toggle per kept ground and
  the row is empty by default; it does not appear in the profile at all.

**So the fix is the yard reading once a frame and handing the answer round**, which is the repair
P151 allowed: memoising what does not change. `frame.ts` raises a stamp at the top of every tick —
one number, no clock, no second loop — and the reader peeks only when the stamp has moved. What it
caches is the standing step's _voice_, the walk's own object rather than the scratch it arrived in,
and nothing ever writes to a voice, so another surface peeking the same deck in the same frame
cannot rewrite it underneath.

The cache is kept per **yard** and not per reader, beside the deck the way the facade keeps its own
peek scratch. That is the half a memo cannot be trusted with: the very drag this is about redraws
the card on every pointer move, and a reader rebuilt by one of those redraws would peek again. The
`useMemo` that builds the reader is now about prop identity alone — a fresh `live` on every commit
is a fresh layout effect on all forty-five knobs — and the card's own test asserts the frame is
shared by building a second card mid-frame and watching it take no peek.

**The stamp is only honest inside the tick.** It moves nowhere else, so a caller reading between
frames or with the loop stopped holds whatever the last frame left, silently. Every dial reads it
from a frame callback: `PlayerDial` passes no `animate` and `Knob` defaults it true, so the
off-loop read in `Knob`'s layout effect is unreachable for this card. A mulcher dial adopting
`ParameterKnob`'s `animate={playing}` would be exactly the caller that breaks it, which is why both
`frameStamp` and the reader say so where they are written.

**What is not done, deliberately.** The drag's own re-renders are `performWorkOnRoot` at 7–9% of
the same window, unchanged by any of this: a commit re-renders every dial on the card because each
is handed a fresh spec. That is a bigger change than one step, it is not one of the three suspects,
and principle 4 says one thing gets fixed. It is written down here so the next measurement starts
from the number rather than from the list again.
