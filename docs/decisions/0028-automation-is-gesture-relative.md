# 0028. A lane's time is its own gesture's, and the transport arms it per pass

- **Date:** 2026-08-14
- **Status:** accepted
- **Supersedes:** [0024](0024-automation-workspace.md) in part — its lane editor, in full.

## Context

[0022](0022-parameter-automation.md) and [0024](0024-automation-workspace.md) shipped a durable
lane, a target derived from the registry, and an Option-held knob gesture that records one. What
they never shipped was playback. `automation.set` scheduled the lane exactly once, through
`setAutomation` into `scheduleAutomation`, at the `ctx.currentTime` of the instant the command
landed, and never armed it again. A point's `at` was read as a position on the audio clock. So a
lane recorded while the deck was stopped was scheduled into the past and never heard; a lane
recorded while it played was heard at most once, and never again on the next time round the loop.
0024 papered over the second half by tiling the recorded gesture across the deck's loop window
inside the recorder (`repeatedLane`) — a repeat baked into the stored data, aligned to whatever
the loop happened to be when the knob was released.

There is also a question 0024 answered with an editor: how a performer sees and shapes a lane. A
freehand SVG with drag-to-add and drag-to-move is a second way to write a lane, a second gesture
model to keep consistent with the knob, and — for an instrument played with two hands on knobs —
a surface nobody reaches for mid-performance.

## Decision

**A point's `at` is time from the start of its own gesture.** Not a position on the loop, not a
position on the audio clock. The recorder in `src/ui/ParameterKnob.tsx` reads `probe().at` on the
first movement of a gesture and stores every point as the distance from it, so the first point of
every lane is at zero. `src/lib/automation.ts` says so in the type, and normalization keeps its
existing guarantees (sorted, non-negative, last-write-wins on ties, range-bounded).

**The recorded playhead offset is discarded on purpose.** The recorder knows exactly where the
playhead was — it holds the same clock the transport schedules against — and throws that away.
This is the one thing a reader will otherwise assume works the other way, so it is written down:
whether the gesture happened 1.2s into a pass, 37.5s in, while the deck was stopped, or across a
loop boundary, the lane is the same lane and plays from its own zero. That is what makes a
recording repeatable — the same gesture sounds the same however it was captured — and what makes
the same lane still correct after the loop it was recorded over is moved.

**The transport arms the lanes; the command only stores them.** `src/audio/deck.ts` holds a
deck's lanes with the manual value each falls back to, and schedules them against pass origins:
`plan.startTime + n * plan.period`, for every pass beginning inside `AUTOMATION_HORIZON_SECS`
(`src/audio/transport.ts`), extended again at every loop boundary the reporter announces. Without
a loop there is one pass, from play. `scheduleAutomation` takes that origin and lays the gesture's
own times out from it, replacing only what was scheduled from that origin onwards — so arming the
next pass never disturbs the one currently sounding. A lane set mid-pass is armed from the pass
the clock is already inside, so releasing the knob is heard immediately rather than at the next
time round.

The horizon is a window rather than "the next pass" because an offline render has no main thread
listening while it runs: `render()` hears only what was armed before `startRendering`. One
mechanism serves live, headless, offline and exported audio, which is the point.

**Stopping cancels back to the manual value.** `halt()` ramps every automated parameter to the
value the performer left the knob at, through the same `rampTo` an ordinary move uses. Clearing a
lane does the same thing immediately, playing or not.

**Repetition moves out of the data and into the transport.** `repeatedLane`, `MAX_LANE_REPEATS`
and `LANE_SEAM_SECS` are deleted. A stored lane is now exactly the gesture that was performed; how
often it is heard is a property of the transport playing it, not of the bytes. This also removes
the failure the tiling had: a lane tiled to one loop length is wrong the moment the loop changes.

**The lane editor is superseded, not deprecated.** `src/ui/AutomationLane.tsx` and
`src/ui/AutomationWorkspace.tsx` are deleted, and with them `automationTargets()` — the derived
list existed only to feed the picker, and `paramReachable()`, the rule underneath it that the
executor and the restore stage ask, stays. What survives of 0024 is everything else: the derived
targets rule, the plugin-owned `automationTarget(param)` binding, retention of a removed effect's
lane, one `automation.set` per gesture, and the clear-on-normal-move transaction.

**The knob carries the whole affordance.** Option arms every automatable knob, as before. A knob
that owns a lane grows a small mark at its top right, shown only while Option is held; hovering it
opens a read-only popover previewing the points. Editing a lane means riding the knob again;
clearing it means moving the knob normally, which is unchanged.

## Consequences

- Durability and history do not move: one `automation.set` per gesture, one event, one autosave.
  Sessions stored under 0024's absolute-time points no longer mean what they say, and — pre-release
  ([0026](0026-pre-release-has-no-migrations.md)) — are neither migrated nor detected. They simply
  restore as gesture-relative lanes.
- A lane longer than its loop pass is truncated by the next pass's arming, which is the honest
  reading of "the lane replays from its own zero at the start of each pass".
- `automationValueAt` is gone with the editor and with the old scheduler's "start at the
  interpolated present value" step; there is no longer a reader that asks a lane for its value at
  an arbitrary clock time.
