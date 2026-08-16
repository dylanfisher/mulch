# 0039. A failing page prints what it held

- **Date:** 2026-08-15
- **Status:** accepted

Every failure in `scripts/smoke`'s browser half is routed through `reportPageFailure`, which prints the message, the failing line, and the page's `probe()`/`ring()` state before the browser closes; waits default to a 15-second timeout instead of 30; and one drive fixture's failure is caught into a sentinel so the other parallel fixtures still run and report.
