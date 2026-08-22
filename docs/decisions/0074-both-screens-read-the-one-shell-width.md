# 0074. Both screens read the one shell width, under one fixed header

- **Date:** 2026-08-16
- **Status:** accepted

The instrument and the gallery are the same measure and wear the same header, and both facts are
declared once in `src/ui/shell.ts` — `SHELL_WIDTH` and `SHELL_HEADER` — which is what
[0054](0054-the-shell-owns-the-width.md) meant by the shell owning the width, now that a second
screen lays out to it. Nothing a container holds carries a width of its own; a page that restated
the number stopped tracking it the day it changed, which is exactly what the gallery's `max-w-5xl`
did. The header is `sticky top-0` over a blurred background on both screens, so the menubar, the
meter and the history controls stay reachable however far the yards are scrolled — and because it
covers the top of the page, the page reserves that much for it: `--shell-header-reserve` in
`src/ui/tokens.css` is the `scroll-padding-top` every scroll-into-view stops clear of, so a tabbed
-to control never parks underneath it. How tall that bar stands is a shell fact too, so
`SHELL_HEADER_ROW` carries its own minimum — the menubar's `h-8` plus the row's own padding, which
the minimum has to include because the box is a border box. Left to the content, the header was as
tall as whatever a surface happened to put in it, and the one header stood at three heights. The error
fallback is still outside this: it is text, and a measure is a property of text.
