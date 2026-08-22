# 0109 — The drift is one picture at two sizes

- **Date:** 2026-08-21
- **Status:** accepted

**One window, `MOIRE_CYCLES`, whichever size the picture is drawn at.** The strip asked for four
loop periods and the overlay for forty-eight, which made the small one a different picture rather
than a smaller one: at four cycles across a strip's height the rows are as wide as the band they
beat against and read as a blob. The finer lines follow from the window, exactly as the pitch
follows from the band (0098) — never from a second set of drawing rules. Both sizes reach the
window through one hook, so there is one call and one constant to disagree about.

**The overlay wears the shell's header.** It covers a screen, so it is a screen: `SHELL_HEADER`
and `SHELL_HEADER_ROW` from `src/ui/shell.ts` put the yard's label where every other title on this
instrument sits, at the one measure both routes lay out to (0074). The row is now declared beside
the treatment it fills rather than restated at each header, because this is the third one. Escape
closes it, bound while it is mounted and gone with it: it is a view preference and not a command,
so it is not in the registry every serialisable key is declared in.

**A folded yard draws its drift in its header.** Everything below that header is behind the fold,
so a shut yard drew no picture at all. The strip moves into the slack the header already has,
between the readout and the button group — in one place or the other, never both.
