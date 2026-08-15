# 0035. A lane repeats on its own length, and the surfaces paint what it is doing

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** [0028](0028-automation-is-gesture-relative.md) in part — its per-pass arming, and
  with it [0034](0034-releasing-option-ends-the-recording.md)'s unlooped-pass origin.

## Context

0028 made a lane's time its own gesture's and had the transport arm it once per **pass** of the
deck's loop: each pass origin got a copy of the points, and a lane longer than the pass was
truncated at the next one. That ties a recorded gesture to the length of the loop it happened to
be recorded over. Move the loop and the gesture is re-cut; record a two-second sweep over a
half-second loop and three quarters of it is never heard. A performer riding a knob is not
subdividing the bar — the shape has a length, and that length is the shape.

The surfaces had the matching gap: nothing showed a lane doing anything. A knob owning a lane sat
still while the parameter it names moved underneath it, and the hover preview drew the gesture as
a static path with no indication of where in it the transport had reached.

## Decision

**A lane is its own loop, of its own length.** Its period is `laneSpan(lane)` — the time of its
last point — and the transport arms cycle `n` at `anchor + n * span` for every cycle beginning
inside `AUTOMATION_HORIZON_SECS`, capped by `MAX_AUTOMATION_CYCLES`. Two lanes of different lengths
drift against each other and against the waveform, deliberately: that is what makes a hand-recorded
gesture behave like a shape rather than like a subdivision. A lane that never moved has no period
and is scheduled once.

**The anchor is when the gesture was recorded**, and the lane counts from there for as long as it
is held — through a loop change, a rate change, a stop and the next play. Re-arming never lays out
history: the first cycle scheduled is the one the clock is already inside. The same points arriving
again is a **re-base**, not a new gesture — `param.set` under a lane re-draws its schedule onto the
new manual value and the lane keeps the phase it is in the middle of.

**A lane sounds while the deck plays, and only then.** Stopping still ramps every automated
parameter back to its manual value, as 0028 had it.

**Repetition needs a tick of its own.** No boundary report announces a lane's cycle, so a playing
deck holding lanes runs an interval at `AUTOMATION_REARM_SECS` — half the horizon, so every tick
has a whole horizon of slack and a missed one costs nothing. Offline it never fires, which is what
the horizon was always for: a render hears what was armed before `startRendering`.

**Cycles join, they do not jump.** A gesture that ends somewhere other than where it started would
step from its last value to its first at every boundary — a click, once per cycle, forever. Each
cycle now holds the value the previous one left (`cancelAndHoldAtTime`, with the Firefox fallback
`rampTo` already carries) and ramps into its first point across `LANE_SEAM_SECS`, shortened when
the gesture's own first move lands inside it.

**One live read serves every surface.** `peek()` carries, per deck, how far into its own cycle each
held lane is — seconds, keyed by `paramKey`, refilled in place, empty when nothing plays. From that
one number and the lane it already holds, a knob paints its dial and the preview paints its
playhead, both through `automationValueAt` in `src/lib/automation.ts` — the same interpolation
`scheduleAutomation` schedules, so what is seen cannot drift from what is heard.

**Painting is per-frame and opt-in.** `Knob` takes an optional `live` reader and registers a frame
callback only when it gets one, which `ParameterKnob` passes only for a knob that owns a lane on a
playing deck. The preview's dot lives in `AutomationPreview`, mounted only while the popover is
open — so it costs nothing until a performer hovers the mark, and a page with nothing playing runs
no frames at all. A drag suppresses the live read: a hand on the knob outranks the lane it is
about to replace.

## Consequences

- A lane recorded against one loop still means the same thing when the loop moves, and a gesture
  longer than a pass is heard whole.
- Nothing in the durable session changes: a lane is still exactly the points that were performed.
  What changed is only where the transport lays them.
- `aria-valuenow` and the knob's accessible value stay the value a performer set. Sixty
  announcements a second is not an accessible control; the readout under the dial follows, the
  announced value does not.
- The offline horizon now measures cycles rather than passes, so a very short lane is capped at
  `MAX_AUTOMATION_CYCLES` copies per arming — 64 of a 20ms gesture is 1.3s of schedule, and the
  live tick extends it before it runs out.
- A window of rendered audio measured against a lane's edges must allow for the master bus delay
  (a few hundred frames, see `DeckReport`); `scripts/smoke` measures the middle of a state rather
  than its boundary.
