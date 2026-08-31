# 0223. A tier's name redraws to avoid a sibling; an effect's may not

- **Date:** 2026-08-30
- **Status:** accepted, extends [0081](0081-an-effect-name-is-two-pools-multiplied.md)

An album, a song and a part are named the way an effect instance is — two pools of twelve
multiplied, nouns disjoint from every other pool in `src/lib/copyNames.ts`, both indices from one
fold of the row's own durable id (`TIER_NAMES`, `tierName`). What parts from 0081 is the mint:
these three are named at a hand's gesture, which is outside every stream a seed reproduces, so
`mintTierName` may look at the names its siblings wear and step the fold on until it finds a
reading none of them has. Stepped rather than folded again, because the two indices are one
number's remainder and quotient: adding one walks the adjectives and carries into the nouns, so
144 attempts reach all 144 readings exactly once and a free one is never missed while one exists.

What a cleared name field writes stays the row's badge (`src/ui/PlayerPart.tsx`,
`src/ui/PlayerAlbum.tsx`): emptying a field is a rename like any other, and the four characters of
an id are the one reading no pool draws, so a row wearing one says that a hand took its name away
rather than that nothing has named it yet.

The bound is that product and the fallback is the first draw, which is a list of 144 siblings
wearing a repeat rather than a loop that will not end (principle 5). What a walk draws for itself keeps the pure draw and no
avoidance — the drawn run in `src/lib/playerWalk.ts` has no list of siblings to look at, and a walk
laying a part down per jump may not spend a lookup over one.

A copy follows the same rule the mint does: `renamedSong` (`src/app/restore.ts`) redraws a row's
name onto the id it is given wherever the row still wears the one its old id drew, so a duplicated
yard's names stay a function of the ids it actually holds (P134).
