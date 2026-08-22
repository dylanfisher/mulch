# 0124 — A drawn number carries the amounts that shape its draw

- **Date:** 2026-08-22
- **Status:** accepted

Three of the jumps module's dials name a number the walk draws rather than a number it holds: the
burst's Vary, the Rest, and the Hold. Each carries a `+` marker at its corner
([0121](0121-a-framed-plus-is-a-door.md)) and behind it the amounts that shape _that_ draw and
nothing else. The marker's frame is one component (`src/ui/PlayerMore.tsx`); which amounts sit
behind each is that dial's own group.

Which amounts a menu holds is decided by what the number is, not by symmetry with the menu beside
it. The Hold's three stand: a chance the change fires, a spread it may stray over, a drift one
change may travel ([0118](0118-the-rate-walk-is-the-performers.md)). The Rest takes two —
`restChance`, whether the wait is taken at all, and `restSpread`, how far a taken one strays. The
Vary takes one, `varyChance`. The two that are missing are missing for reasons, and the reasons are
the rule:

- **A drift needs a walk.** It is how far one change travels from the value it is on, so it means
  something only where a value persists between steps. The rate does; a wait and a burst length are
  drawn fresh at every jump, so neither has a previous value to travel from.
- **A spread is not said twice.** Vary _is_ the spread of a burst length. A spread behind it would
  be the same knob at two depths (principle 1).

A refused draw is the field's own zero rather than a smaller one: a wait the chance turns down is
no wait, which is what a Rest of zero already means, and a landing the chance leaves alone is
exactly the burst. And a spec whose dial is at zero rolls nothing at all — a pattern that never
varies and never rests lays down the stream it laid before these existed.

Every one of them is a durable field of `PlayerSpec`, validated by the one `assertPlayer`, carried
by one `deck.player`, captioned and sentenced from `PLAYER_KNOBS` in `src/lib/copy.ts`. They are
**not** registry parameters and carry no automation lane: a jump parameter shapes a pattern drawn
from a seed before a sample is scheduled, where `src/audio/params.ts`'s lanes write onto an
`AudioParam` of a live node ([0030](0030-effects-are-instances.md)). Automating one would mean a
second automation subsystem over the durable spec, which is a decision nobody has taken.

A caption is a dial's whole accessible name, and only one menu is open at a time, so a word has to
be unique across the card's own row plus one menu and may repeat across two — which is what lets
every chance be called Chance. That is why the wait's spread is `restSpread` and reads "Spread"
rather than "Vary": Vary is already on the row beside it, and two sliders on screen under one word
are two nothing can tell apart. `src/ui/tooltips.test.ts` holds the rule.

What this constrains: a new amount behind a marker is a new durable field and a new entry in
`PLAYER_KNOBS`, in exactly one of the three menu partitions — and a menu gets an amount only where
that amount says something about how _that_ number is drawn.
