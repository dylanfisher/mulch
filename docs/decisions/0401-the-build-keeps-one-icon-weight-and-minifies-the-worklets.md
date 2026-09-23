# 0401 — The build keeps one icon weight, and minifies the worklets

- **Date:** 2026-09-22
- **Status:** accepted

**Every icon is drawn at Phosphor's `regular` weight, and the build keeps no other.** Each icon's
defs module is a map of six weights. The build cuts it to the one entry (`oneIconWeight`,
vite.config.ts), and that takes 136 kB (34 kB gzipped) off the script the first paint waits on. It
fails loudly both ways. A defs file with no `regular` entry stops the build. So does a source file
that gives an icon a `weight` other than `regular`, or reaches for `IconContext`, because either
would draw an empty svg with no error. A second weight means widening the one constant there.

**The six worklets are minified when they are emitted.** `?url` copies a file byte for byte, and
boot awaits every one of them before the first paint (0088). 87 kB became 16 kB. The gate's drive
step runs every worklet from that build.
