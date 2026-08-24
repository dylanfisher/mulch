# 0081. An effect instance's name is two pools multiplied

- **Date:** 2026-08-20
- **Status:** accepted, amended by [0149](0149-a-pool-is-sized-by-when-a-repeat-is-expected.md)

A flat pool of fixed pairs runs out: eight of them meant a rack of nine delays wore a repeated
reading, and the ninth card was indistinguishable from the first. `EFFECT_NAMES` now holds two
pools per effect — adjectives saying what that kind of effect does, and nouns disjoint across
effects so a name read on its own still says which kind of thing it names — and a name is one
drawn from each, joined by the same `twoPartName` a yard's name is (0075). Six times six was
thirty-six readings for the cost of twelve words; twelve times twelve is 144, and which of those
numbers a pool is sized to is 0149's.

The draw stays what 0076 made it: a pure function of the instance's own durable id, never a
`Math.random()` at the call site, so a name survives a drag, a reload and an archive with no
durable field carrying it. Both indices come from one FNV-1a fold — the remainder picks the
adjective, the quotient picks the noun — so the halves move independently and every pairing is
reachable. A new effect plugin declares both pools or the registry test fails it (0056).
