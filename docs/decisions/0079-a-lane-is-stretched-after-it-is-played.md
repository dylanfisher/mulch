# 0079 — A lane is stretched after it is played

`laneSpan(lane)` is no longer only a fact about the gesture that was recorded: `automation.span`
rewrites it. The command carries one length, and it lands as the ordinary whole-lane write with
every point's time scaled onto that length, so the shape, the values and the number of points are
untouched and the only thing that changes is the cycle the lane repeats on
([0035](0035-a-lane-runs-on-its-own-clock.md)) — one command that writes a lane, not two. The last
point takes the target span exactly rather than the product, so a lane reports back the length it
was asked for. `stretchLane` holds the span inside `MIN_LANE_SPAN`..`MAX_LANE_SPAN` the way a
parameter value is held inside its range; zero and below are refused at the wire, because a lane of
no length is not a short lane. The floor is what the transport can keep armed — one re-arm tick
lays down at most `MAX_AUTOMATION_CYCLES` cycles, so a span under
`AUTOMATION_REARM_SECS / MAX_AUTOMATION_CYCLES` stutters once per tick — and `src/audio/deck.test.ts`
holds it against those two constants, because a leaf in `lib` cannot import them. A target holding
no lane, or one that never moved, has nothing to scale and throws rather than inventing a gesture.
The (deck, instance, parameter) lookup a lane is found by is `laneIn` in `src/state/store.ts`,
because it was about to be written a third time.

Because a stretch is that gesture still going round, it keeps the anchor it was recorded on: the
voice re-bases a lane whose values arrive again in the same order, at whatever length, so `sameLane`
became `sameGesture` and a stretch mid-flight re-arms from the old anchor rather than restarting the
cycle under the performer's hand. Only different values are a new recording.

The gesture that sends it is a drag on the dial above the preview — a vertical drag on the
preview's time axis until [0085](0085-a-control-reads-the-way-it-moves.md) turned it the way every
other dial reads — which is why the preview is no longer read-only: that dial is the one editable
thing on it, and the lane's span is read there rather than beside it, because the number and the
thing that changes it are one control. The
drag writes the length it has reached into the DOM on every pointer event and sends exactly one
command when it ends ([0065](0065-a-live-move-is-joined-over-its-own-cadence.md)): one gesture, one
command, one history entry ([0067](0067-a-gesture-is-one-history-entry.md)). Option coming up takes
the popover away mid-drag, and that unmount commits what the drag had reached, exactly as it ends
the recording on the knob below it ([0034](0034-releasing-option-ends-the-recording.md)).
