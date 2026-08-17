# 0073. The palette's memory of what you last ran is an order, not a highlight

- **Date:** 2026-08-16
- **Status:** accepted

P45 wants ⌘K then Enter to be play/pause, and ⌘K then Enter again to be a second effect: the entry
the last invocation ran is the active one when the palette reopens. The palette does not own its
highlight — Base UI's `Autocomplete` does, and it exposes no way to set it (0069, and reimplementing
a combobox to gain one is the thing that decision refused). What it does expose is
`autoHighlight="always"`, which makes the first row of the list the active one the moment it opens
and moves to the first match as soon as a query filters the list.

So the memory is spelled as order. `src/ui/CommandPalette.tsx` holds one module binding of the last
chosen entry's id and `paletteEntries` returns that entry first; everything else keeps the order the
list already gave it. Nothing is pinned, so a typed query still moves the highlight to its first
match — that is the primitive's doing, untouched. Recency is part of the order rather than an
override of it, so a remembered row that a query still matches leads those matches too: after
running Add Yard, typing `add` highlights Add Yard rather than the first effect. That is the same
answer every recency-ordered palette gives, and it is why this is an order and not a second rule
layered on one. The memory is a view preference like the theme and
the open flag: no command, nothing durable, no history entry (§2), and a module binding forgets it
on reload, which is the whole of "does not survive a reload".

It is written in `choosePaletteEntry`, the one place a row is chosen, and never inside an entry's
`run` — a `run` is the surface control's own doing and stays identical to it, which is what 0069's
`toEqual` comparison measures.
