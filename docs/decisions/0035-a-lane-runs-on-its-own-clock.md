# 0035. A lane repeats on its own length, and the surfaces paint what it is doing

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** [0028](0028-automation-is-gesture-relative.md) in part — its per-pass arming, and with it [0034](0034-releasing-option-ends-the-recording.md)'s unlooped-pass origin.

A lane is its own loop of length `laneSpan(lane)`, anchored at the moment it was recorded and re-armed on that cycle regardless of the deck's own loop or rate changes, cycles join via `cancelAndHoldAtTime` plus a ramp into the first point, and one shared `peek()`/`automationValueAt` read drives both the knob dial and the preview playhead so what is seen matches what is heard.
