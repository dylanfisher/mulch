# 0317 — A yard is named for a small scene

- **Date:** 2026-09-08
- **Status:** accepted, narrowed by
  [0324](0324-a-place-and-an-air-are-a-word-drawn-against-a-noun.md), which made the place and the
  air a joining word drawn against a noun — so the name is seven banks, not five, "a preposition is
  not a half of a name" no longer holds for those two, and the yard's join is `twoPartName`'s after
  all. Otherwise accepted, extending
  [0081](0081-an-effect-name-is-two-pools-multiplied.md) and P55 — pools multiplied rather
  than a list of pairs — and resting on
  [0149](0149-a-pool-is-sized-by-when-a-repeat-is-expected.md)'s birthday rule and
  [0045](0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md).

**Every pool in `copyNames.ts` doubles, to twenty-four by twenty-four.** Twelve by twelve is 144
readings, and 0149's rule expects the first repeat somewhere past the twelfth draw — which a rack
of a dozen delays reaches. 576 puts it past the thirtieth. The nouns stay disjoint across every
pool in the file, which is what makes a name read on its own say which kind of thing it names.

**A yard's name is five banks, three of which always speak.** An adjective, a plant and a place —
"beneath the Stairs", "at the Corner of the Yard" — and then a time and a small detail, each on its
own coin. A rack of yards then reads as a set of tiny scenes rather than a list of usernames, and
the two optional banks are what stop every name from saying the same amount. The place, the time
and the detail are whole phrases rather than words a pool multiplies: a preposition is not a half
of a name, and "beneath" and "the Stairs" are one thing to read.

**It is bounded by the bound on durable text, and the optional banks are what give way.** A name is
`deck.add`'s, so it is durable text and capped like any other. The three that always speak fit
inside that cap by construction; each optional bank is added only if the reading still fits, so a
long place never costs a hand its yard. Cutting the phrase would have been the alternative, and a
scene that stops halfway is worse than one that says less.

**The banks live in `src/lib/copyYard.ts`.** src/lib/copy.ts was a couple of dozen lines from the
hard cap, and five banks do not fit in it. This is a split rather than a shave (0045).
`twoPartName` stays what it is — the effect and tier draws still join two halves — and the yard's
join is its own.
