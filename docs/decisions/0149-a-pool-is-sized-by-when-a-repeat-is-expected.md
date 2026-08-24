# 0149. A name pool is sized by the draw a repeat is expected at

- **Date:** 2026-08-24
- **Status:** accepted, amending [0081](0081-an-effect-name-is-two-pools-multiplied.md)

Draws from these pools are independent, so what a pool has to be sized against is not how many
readings it holds but how few draws it takes for two to read alike: about `sqrt(pi * readings / 2)`
of them. Ten adjectives times ten plants is 100 readings and a repeated yard name by the twelfth
yard; six times six is 36 and two delays reading alike by the seventh. Both were sized when a
session held two decks ([0075](0075-every-kind-of-thing-draws-from-its-own-pool.md),
[0081](0081-an-effect-name-is-two-pools-multiplied.md)) and both are inside one session now.

The pools are twenty-four and twenty-four for a yard — 576 readings, a repeat expected near the
thirtieth — and twelve and twelve per effect kind — 144, expected past the twelfth instance of one
kind, further than any rack goes. The yard emoji pool widens with them to twenty-four. Every rule
the two decisions fixed is unchanged: house-and-garden, Titlecase ([0059](0059-every-label-is-titlecase.md)), an adjective that says
what that kind of effect does to the sound, and noun pools pairwise disjoint so a name read on its
own says which kind of thing it names. `copy.test.ts` asserts the draws-before-a-repeat figure
rather than the pool lengths, so it says why a pool is that long.

More words, not a new way to make a name: no generator, no grammar, and `mintYardName` and
`effectName` keep their shapes and their draws. A draw that also avoided the names already on
screen — a spent name, the way a deck letter is spent ([0082](0082-a-deck-letter-is-spent-when-it-is-drawn.md)) — is **declined**: it would make both
mint functions read the session, and widening already puts the first repeat past a session's worth
of draws, which is all a name is asked for. The id identifies a yard; the name only names it
([0029](0029-deck-identity-is-durable-shape.md)), so a repeat far down a long session is a repeat and not a defect.
