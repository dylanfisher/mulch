# 0152 — A character is a region of the spec, and the amount is how far in

- **Date:** 2026-08-24
- **Status:** accepted
- **Extends:** [0151](0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md) — twenty knobs is more
  than a hand can hold in its head at once, so there is now a way to ask for all of them by name

The jumps card offers twenty numbers and a walk. Every one of them says what it does in a sentence,
and reading twenty sentences is not how anyone finds out what a pattern sounds like. A **character**
is a name a hand presses to set the whole spec at once.

**A character is a region, not a preset.** Each one declares, per knob, the _span_ it is drawn
inside rather than the value it lands on. So pressing a name twice is two patterns of one kind, and
"give me another one of those" needs no second control — the name is also the die. A preset would
have needed a shuffle beside it, and a shuffle over the whole spec draws noise rather than music.

**A character names only what it is about.** Every knob its region does not name is left at
`PLAYER_DEFAULTS`, so what moves on the card when a name is pressed _is_ what the name means. That
is how this teaches: a person reads Stutter off the four dials that jumped, not off a tooltip.

**The amount blends a draw, and never draws.** The Amount slider moves every knob a fraction of the
way from plain to the pattern that was drawn — so it is a control a hand can hold, and dragging it
does not deal a new hand on every frame. Zero is exactly `PLAYER_DEFAULTS`, which makes it the way
back as well as the way in. A press takes the amount the slider is left on; the slider with nothing
drawn yet sends nothing.

**Every field travels; none steps over.** `variation` was the one exception — a choice between two
named things cannot be half taken, so the amount stepped it at the middle of the sweep — and it is
gone: the walk is an amount now, and the amount travels it like everything else
([0162](0162-a-lean-is-an-amount-and-replaces-the-walk.md) supersedes this clause). The burst
travels geometrically, because it is the one dial drawn on a log curve: half way from 250ms to 10ms
is 50ms by the ear and by the dial, where the arithmetic middle would read as a knob that had barely
moved.

**Nothing durable remembers which character it was.** The spec is what the pattern is; a field
naming its character would be a second answer to that question, and the dials would contradict it
the moment a hand turned one. The drawn character lives in the menu's own state, for exactly as long
as the menu is on screen.

**The seed is not among the fields it patches.** A character changes what the pattern is _like_;
reseed changes which performance of it you are hearing. The two gestures stand next to each other in
the card's corner and stay separable, so a character can be auditioned against a fixed performance
([0089](0089-a-jump-is-the-transports.md)).

`PLAYER_DEFAULTS` moved from `src/ui/PlayerCard.tsx` to `src/lib/playerCharacter.ts`: it is no
longer only what a switch press leaves, it is the point every character is a distance from, and two
gestures that set a whole spec have to read one declaration (principle 1). Which knobs are whole is
declared beside the regions, but `assertPlayer` is its judge —
`src/lib/playerCharacter.test.ts` puts every character's draw at every amount through the one
validator, so a knob missing from that list fails the gate rather than reaching a session as 3.7
repeats.

Durable shape: unchanged. A character is a gesture that sends an ordinary `deck.player` command, so
it is undoable, logged, captured into clips and replayed like any other
([0107](0107-a-module-is-a-card-and-a-fold-never-silences-it.md)).
