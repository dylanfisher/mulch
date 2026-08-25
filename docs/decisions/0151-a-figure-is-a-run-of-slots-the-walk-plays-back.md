# 0151 — A figure is a run of slots the walk plays back

- **Date:** 2026-08-24
- **Status:** accepted
- **Extends:** [0089](0089-a-jump-is-the-transports.md) — the walk now remembers, and remembers only where

Every amount the jumps module had shaped the _draw of the next step_. None of them made the pattern
say anything twice: `playerWalk` drew a fresh slot at every step, so a performance was statistically
stable and structurally memoryless. `phrase` is the first field that gives it a memory — a run of
slots laid down, played back, evolved, and let go of either onto a new branch or back to the run it
started from.

**A figure is a run of slots and nothing else.** The alternative was a run of whole `PlayerStep`s,
which is the obvious reading of "repeat the pattern" and the wrong one: it would have frozen
`repeats`, `burst`, `rest`, `rate` and `gate` alongside the positions, and every one of those
already has amounts saying how it varies. Keeping only the slots means **a figure owns where, and
the dials already on the card own how long and how fast**. The performance this was grown for —
four passes at one burst rate, then eight at a faster one, over a run you can hear coming round —
is then a `hold` or a `repeatsHold` that does not divide the `phrase`, and the two cycles beat
against each other. Nothing new had to be declared for it.

**A pass is over at the top of the pass after it.** The keep, the chance and the return are read
when the read cursor is back at the head of a full figure, before the slots that pass decides about
are handed out — not at the bottom of the pass that ended, where the decision would land one figure
late. Let go and evolve are exclusive: a figure just dropped has nothing left to evolve.

**A figure is a walk however many times it has been let go of.** An evolving figure has one of its
own slots redrawn from the slot before it in the run, by the same distance and sign an ordinary jump
takes — so `distance` and the lean still say what the pattern's steps are like, and a mutated
figure cannot contain a leap the dials forbid. A walk that comes home therefore evolves a slot home
([0162](0162-a-lean-is-an-amount-and-replaces-the-walk.md)), which is this clause and not an
exception to it. The first slot is walked from the last one sounded,
which is its own predecessor in a run that comes round.

**Zero keeps no figure, and keeps the stream.** With `phrase` at zero not one of the four fields
reaches a draw, so a spec that keeps no figure lays down exactly the slots it laid before figures
existed — the guard `vary`, `rest` and `repeatsSpread` already carry
([0134](0134-a-pattern-plays-the-repeats-it-was-set.md),
[0135](0135-the-repeats-dial-gets-its-own-door.md)), and the reason a switch pressed today still
sounds like a switch pressed yesterday.

**The keep declares its own range, where the count's keep shares the rate walk's.** `repeatsHold`
and `hold` are one range because a hold is counted in **jumps** whatever it is holding. A keep is
counted in **passes of a figure**, which is `phrase` jumps each, so it is a second range that
happens to agree on its numbers and not the same one — the one place in this module where two
counts that look alike are not collapsed (principle 1 is about facts, and these are two).

**There is no spread beside the three.** A figure is a run and not a number, so there is no amount
it could be strayed by; what may become of one is whether it moves (`phraseChance`) and where it
goes when dropped (`phraseReturn`). 0124's rule decides which amounts sit behind a dial by what the
number is, and this one is not a number.

Proof is all in `src/lib/player.test.ts` — the walk is the only thing that changed, so
`src/audio/player.ts` is untouched, a step is still a step, and no browser scenario was added
([0117](0117-proof-lives-at-the-layer-that-owns-it.md)).

Durable shape: `PlayerSpec` gains `phrase`, `phraseKeep`, `phraseChance` and `phraseReturn`. A spec
from before this is refused whole by the one `assertPlayer`, on its key set, and discarded rather
than migrated ([0026](0026-pre-release-has-no-migrations.md)).
