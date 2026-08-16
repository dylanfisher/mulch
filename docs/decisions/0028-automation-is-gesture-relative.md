# 0028. A lane's time is its own gesture's, and the transport arms it per pass

- **Date:** 2026-08-14
- **Status:** accepted
- **Supersedes:** [0024](0024-automation-workspace.md) in part — its lane editor, in full.

A recorded automation point's `at` is time from the start of its own gesture (not a loop or audio-clock position), a stored lane is exactly the gesture performed with no baked-in repetition, and the transport re-arms each lane against every pass origin within its scheduling horizon rather than the command scheduling it once.
