# 0205 — A card's face is declared, not branched on

- **Date:** 2026-08-29
- **Status:** accepted, extending
  [0055](0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)

Every effect card is its knobs and stops. The automator has something more to show — the run it is
holding, a row apiece — and the obvious way to draw it is `if (entry.effect === "automator")` in
the rack. That is the map from effect ids to pictures that the `icon` field exists to prevent: the
painter learns a plugin's name, and the next entry with something to show adds a second branch.

**An entry declares its `face`**, beside its `width`, and the rack keys a total record off it —
the shape `WIDTH_CLASS` already is. `knobs` draws nothing extra; `grown` draws the rows. A new face
is a new key in that record, so an entry declaring one nothing draws fails to compile rather than
falling back to knobs alone. No component is keyed on an id anywhere.

The rows are painted from `peek`, not from the session, because nothing about them is stored
([0203](0203-a-rack-may-hold-a-rack.md)): every row the run could hold is mounted once, so a
population turning over costs a class and a scale rather than a React render
([0070](0070-a-per-frame-read-refills-and-never-clears.md)). Mounted once **and never taken out of
the layout**: an empty row is made invisible and keeps its line, and the word for an empty run is
laid over the rows rather than among them, so a run growing and letting go on its own clock never
moves the page under it.

One trap worth writing down, because it cost a debugging pass and looked like broken arithmetic:
the bar is scaled by writing `style.scale`, not `style.transform`. The utility that sets its
resting state uses the standalone `scale` property, and a `transform` written beside it _composes_
with that rather than replacing it — leaving the bar at nothing however far in the effect is.
