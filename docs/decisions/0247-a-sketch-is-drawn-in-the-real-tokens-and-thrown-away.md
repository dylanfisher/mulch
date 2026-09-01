# 0247 — A sketch is drawn in the real tokens, and thrown away

- **Date:** 2026-08-31
- **Status:** accepted, adding a third screen to
  [0074](0074-both-screens-read-the-one-shell-width.md)

`src/ui/PlayerCard.tsx` draws one control per number the module declares — 45 dials, eight of them
carrying a run of extra amounts, in five folds, and every part row redraws 32 of them again. Its own
comment defends the length correctly: the card is the size of that vocabulary. The vocabulary is not
the problem; the card being the only way in is. Before any of that is rebuilt, the alternatives have
to be seen beside each other, and `#/sketch` is where they are.

**A sketch is a route and not a separate page.** The tempting cheap version is one HTML file with
its own colours, opened in a browser. That file would be an argument about a palette. A sketch that
matters is one drawn in `src/ui/tokens.css`'s inks, the five `type-*` utilities and the same shadcn
primitives — because what is being judged is whether _this instrument_ reads better that way, and
the parts of a design that are hardest to judge are exactly the ones a mock gets to skip. Six
surfaces distinguished by geometry and density and not by colour is a constraint, and it is the
right one: the instrument has one hue (0236), so a sketch that needed a second was never going to
ship.

**Nothing on the bench is wired.** `src/ui/sketch` imports `src/lib` and `src/ui` and nothing from
`src/state`, `src/app` or `src/audio`. Local `useState` for a dragged puck or a picked block is
allowed and necessary — a blend pad that cannot be dragged says nothing about how it feels — but no
sketch reads the session or sends a command, so none of them can be half-adopted by accident. The
fake walk they draw is written by hand in `src/ui/sketch/sketchWalk.ts` rather than seeded, so two
screenshots of one sketch are the same picture. What they _do_ import is the real vocabulary:
`PLAYER_PART_KNOBS`, `PLAYER_CHARACTERS` and `PLAYER_GROUP_LABELS`, so a sketch arguing about
forty-five dials is counting the forty-five that exist.

**Each sketch is one function, and the length cap is waived in it.** The `max-lines-per-function`
waiver on all six is the same reason each time: a sketch is one surface making one argument, and
splitting it names pieces of a shape that has not won yet — names being the hardest part to throw
away. This waiver does not carry to whatever is built afterwards.

**The directory is deleted, not kept.** The day one of the six wins, `src/ui/sketch/`, the
`SKETCH_ROUTE` const, the `"sketch"` member of `Route`, its branch in `src/ui/App.tsx` and the View
menu item go with the five that lost. A bench left standing beside the thing it argued about is
read, years later, as a set of half-built features.
