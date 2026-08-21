# 0106 — A fold is its own heading

- **Date:** 2026-08-21
- **Status:** accepted

A control that folds a whole card or section is the heading of the thing it folds: the words sit
inside the `Toggle` and the caret sits beside them, so the press target is the whole heading and
the control's accessible name is what the heading says. Nothing labels it from outside — an
`aria-label` there would be a second name for the words already in it. What the heading does not
say, the region around it does: the rack's fold reads "Effects" and the section it folds is named
for its yard. The state it reports is unchanged, `aria-pressed` and a caret that turns with it
(0055); this decides where the label lives, not which primitive it is.

The heading is therefore not a place to touch a yard without acting on it. A driver that wants a
yard selected aims at the readout beside the heading, not at the heading.
