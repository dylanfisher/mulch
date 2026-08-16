# 0034. Releasing Option ends the recording, and an unlooped pass begins where the clock is

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** [0028](0028-automation-is-gesture-relative.md) in part — its gesture-ending rule, and its reading of "one pass, from play".

Option coming up commits the recorded lane regardless of pointer state, and an unlooped deck's one pass begins when the lane is armed (`Math.max(plan.startTime, ctx.currentTime)`) rather than always at `plan.startTime`.
