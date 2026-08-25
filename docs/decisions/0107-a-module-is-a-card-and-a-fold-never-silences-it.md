# 0107 — A module is a card, and a fold never silences it

- **Date:** 2026-08-21
- **Status:** accepted

Everything a yard holds that has knobs is drawn in the rack's own language: a section whose
heading is the toggle that folds it (0106), its dials at the rack's size with the two line boxes
every caption spends (0093), and a sentence on every control that does something (0094). The jumps
module was a bare row of `xs` knobs and is now drawn that way; anything added beside it is too.

The two switches are never the same switch. Folding is a view preference — no command, nothing
durable, no history entry — and the durable switch that holds or clears the module's spec is a
different gesture, so putting a module away and silencing it stay two of them. A module offering
only the durable one has no way to be put away except by being turned off, which is the defect
this rules out.

**Amended, P82:** the durable switch goes under the fold with everything else rather than standing
in the heading beside it. The fold is refused while there is no spec — there would be nothing
under it — so a folded module always holds one and the control that clears it is one press of the
heading away. Everything above still holds: folding says nothing to the instrument, and a spec
cleared from somewhere else brings the switch back out from under a fold that can no longer be
opened.

The word on that heading is a noun for what the module does, decided in `src/lib/copy.ts` with the
rest of the instrument's words. "Player" named no behaviour — every yard plays — so the module
that moves where inside its loop a deck reads from (0089) is called Jumps, and its knobs carry
their own sentences rather than borrowing another control's — as does its reseed, which now has a picture of
its own too, because an action that borrows the picture borrows the words with it (0055).

**Amended again, P87:** the durable switch comes back above the fold, and the module is drawn as a
full-width card of the rack rather than as a bare section beside them — `Card`, `CardHeader`,
`CardAction`, `CardContent`, the primitives `src/ui/EffectRack.tsx` draws a card with. The switch
sits in the action corner at the top right, which is where every other card's switch is, so a
person looking for what silences a card looks in one place. P82's amendment stands repealed on its
own terms: it put the switch under the fold and then had to bring it back out whenever the fold
could not be opened, which is two rules for one control. Above the fold there is one — the fold
takes the body and never the switch — and the fold is still refused while there is no pattern,
because there is then nothing under it.

**Amended a third time, P98
([0136](0136-a-yard-reads-from-its-top.md)):** the heading leaves the card and stands over it, the
way the rack's section heading stands over its cards, with the seed the pattern unfolds from
beside it. The switch does not move — it stays in the action corner, with reseed immediately left
of it — so both rules above are untouched: the fold takes the body and never the switch, and a
heading outside the card is still the fold.

**Amended a fourth time, P130 ([0173](0173-the-card-is-boxes-and-a-refused-dial-is-drawn.md)):**
the switch leaves the corner for the right-hand end of the heading. It costs P87's rule that a
card's switch is in one place, and the third amendment buys it: a folded card is its heading and
nothing else, so a corner switch is a durable control a fold puts away.
