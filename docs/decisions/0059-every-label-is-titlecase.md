# 0059. Every label is Titlecase, and the header's actions are menus

- **Date:** 2026-08-16
- **Status:** accepted

Every label the instrument writes is Titlecase — "View", "Yard A", "Capture Yard A", "Export
Session" — on screen and in the `aria-label` a driver and a screen reader read by, which are the
same string. What is _not_ a label is exempt and stays as it is: a readout ("nothing loaded", "120
bpm · 8 onsets"), a counter's name in the debug console, and an identifier a control sets rather
than describes — a theme, a generator kind — which is shown as itself, because titling it would be
a second spelling of a durable value. "Yard A" is built by `yardLabel(deck)` in `src/lib/copy.ts`
beside the noun itself: the pattern was written at twenty call sites and is now written once, and
a deck id stays opaque (0029).

The header's actions hang off the menubar 0054 gave it rather than sitting loose beside the
wordmark: `File` holds session open and export, `View` holds the routes. Both open with
`duration-0`, because ./scripts/drive clicks through them (0056). The archive's file input stays
mounted beside the menu rather than inside it — a menu's content is portalled and unmounted the
moment it closes, and a picker that exists only while a popup is open costs the smoke a gesture to
reach and cannot be reached at all by anything else. It is out of the tab order, since the menu
entry is how a keyboard reaches it; a failed export or import is drawn by the header rather than
by the menu, because the menu that caused it has already shut.
