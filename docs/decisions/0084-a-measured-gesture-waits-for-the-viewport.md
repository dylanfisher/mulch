# 0084. A measured gesture waits for the viewport

- **Date:** 2026-08-20
- **Status:** accepted

A smoke gesture driven through `page.mouse` aims at coordinates, not at a control, so it measures
its target with `settledBox` (`scripts/smoke.d/harness.js`) rather than `boundingBox` — two
identical animation frames either side of the scroll into view. Chromium animates a keyboard
scroll and resumes what a scroll interrupts, so a `Space` the app leaves to the browser is still
moving the page a route change later; a box measured mid-flight sends the gesture to whatever has
since slid under the point.
