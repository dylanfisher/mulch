# 0054. The shell owns the width; nothing below it does

- **Date:** 2026-08-16
- **Status:** accepted

The instrument's maximum width is declared once, on the shell's container in `src/ui/App.tsx`, and nothing that container holds — deck, rack, waveform, clip rack — carries a width of its own. A surface that will not fit reflows (`flex-wrap`, `min-w-0`, truncation), never a `max-w`, a fixed column count, or a breakpoint of its own; `scripts/smoke.d/narrow.js` fails the gate when any element runs past a 360px viewport. A width below the shell is a second source of truth for the same fact and stops tracking the shell the day it changes. The sibling top-level screens are outside this: the gallery and the error fallback are text, and a measure is a property of text, so each sets its own and none reads `SHELL_WIDTH`. (The log screen was one of them until P30 deleted it — the ring leaves through `File` now, [0060](0060-the-ring-is-the-whole-exported-log.md).)
