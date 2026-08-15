# 0034. Releasing Option ends the recording, and an unlooped pass begins where the clock is

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** [0028](0028-automation-is-gesture-relative.md) in part — its gesture-ending rule,
  and its reading of "one pass, from play".

## Context

0028 shipped the recorder and the per-pass arming, and two of its edges made a recorded gesture
disappear rather than play.

The first is the gesture's end. 0028 committed a lane only on a deliberate pointer release with
Option still down; a released Option abandoned whatever had been recorded. But Option is what the
performer is thinking in — it arms every knob, it is the visible boundary, and letting it up is
what "stop recording" feels like with a hand on a knob. A performer who lets Option up first and
the mouse second lost the whole ride, silently: no lane, so nothing to play back.

The second is where an unlooped pass starts. `armLanes` laid the single `plan.period === 0` pass
against `plan.startTime` — the instant playback began. That is right for a lane armed before the
source starts (a play, an offline render), and wrong for every lane armed after: a gesture released
a second into a one-shot was scheduled from a second ago, so every point of it was already behind
the clock and the parameter simply landed on the gesture's last value. Rendered offline
(`./scripts/drive --render 2`), the RMS trace of such a lane was flat: it was never heard, and
could not be until the deck was stopped and played again.

## Decision

**Option coming up commits the recording, where the pointer is irrelevant.** `ParameterKnob`
commits from an effect on the armed flag as well as from the pointer release, so either ending of
the gesture lands the same single `automation.set`. The rest of that drag is then **inert** — it
neither records nor clears. Without that, the ordinary-move rule ("moving an automated knob clears
its lane") would fire on the next pointer move and delete the lane the same drag had just
recorded. A cancel and a lost capture still abandon: neither is the performer saying anything.

**An unlooped deck's one pass begins when the lane is armed**, not when the source did:
`Math.max(plan.startTime, ctx.currentTime)`. Armed before the source starts, the lookahead start
is still ahead of the clock and this is exactly `plan.startTime`, so play and render are unchanged.
Armed during playback, the gesture is heard from that moment — the same "released mid-pass is heard
now" that 0028 already gives a looped deck.

Everything else of 0028 stands: a point's `at` is time from its own gesture's start, the transport
arms and the command only stores, stopping cancels back to the manual value, and repetition is a
property of the transport rather than of the bytes.

## Consequences

- A performer can end a recording with either hand, and the two endings are the same command, the
  same event and the same autosave.
- A lane recorded on an unlooped deck plays once, from its release. It does not repeat, because
  there is no second pass to repeat onto — which is the honest reading of a one-shot.
- Re-arming after a rate change on an unlooped deck now restarts the lane from the re-anchoring
  rather than from a start already behind the clock. Both are arbitrary; this one is audible.
