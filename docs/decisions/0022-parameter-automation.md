# 0022. Automation is a registry-gated, absolute-seconds lane

- **Date:** 2026-08-14
- **Status:** accepted

An automation point is `{ at, value }` in absolute context seconds on the same timeline as `Envelope.at`, gated by a registry `automation` allow-list (`deck.gain` first), replaced whole per lane by `automation.set` with one command per gesture, and scheduled sample-accurately by the graph binding rather than RAF.
