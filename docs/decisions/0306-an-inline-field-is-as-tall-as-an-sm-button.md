# 0306. An inline field is as tall as an sm button

- **Date:** 2026-09-07
- **Status:** accepted

A field that shares a row with the transport is drawn through `src/ui/InlineField.tsx`: label
beside input on one line, the input `h-7` — the height `Button` and `Toggle` give `size="sm"` —
and the whole self-started at the top of the row. Not the stacked `Field` a dialog uses, and not a
one-off height at the call site.

The transport's buttons are the row's edge; an `h-8` input beside them hung a pixel below it, and
a label stacked above pushed the box down a line. Any later field on a button row goes through the
same component, so the two heights are declared once, in the primitives, and read from there.
