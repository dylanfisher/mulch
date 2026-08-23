# 0135 — The repeats dial gets its own door, and a vary is seconds

- **Date:** 2026-08-22
- **Status:** accepted
- **Amends:** [0124](0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md) — four menu partitions, not three

[0134](0134-a-pattern-plays-the-repeats-it-was-set.md) made the repeat count exactly the number on
the dial and left it with no amount saying how far it may stray. It has one now, behind the framed
plus the other three drawn numbers wear ([0121](0121-a-framed-plus-is-a-door.md), 0124):
`repeatsChance`, `repeatsSpread` and `repeatsHold`, drawn by a fourth `Player*` component beside
`PlayerVary`, `PlayerRest` and `PlayerRate`. A count is kept for `repeatsHold` jumps and then
redrawn, on the odds the chance allows, uniform over the whole numbers within `repeatsSpread` of
the dial and clipped to its own range.

**A spread of zero draws nothing at all**, chance and keep whatever they say — the guard `vary` and
`rest` already carry, said for the count. Without it, a keep turned up over a spread of zero would
roll a number per due jump and shift every other field of every step after it: a dial naming the
count would move everything about the pattern except the count. So a card nobody has opened still
plays 0134's arithmetic, stream for stream.

**A count is drawn fresh, not travelled**, so there is no drift beside the three. A choice, not a
consequence: the count persists between steps as the rate's rung does, so 0124's "a drift needs a
walk" no longer excludes it — the redraw is a uniform pick inside the spread, which leaves nothing
for a drift to bound. A count that slides is the decision to reopen if a performance wants one.

**The keep reads "Keep" and not "Hold."** The rate walk's Hold is a dial on the row this menu opens
over, and two dials on screen at once under one word are two nothing can tell apart — the rule that
already made a wait's spread read "Spread" rather than "Vary" (0124, `src/ui/tooltips.test.ts`).
The field stays `repeatsHold`: in the data it is the same noun the rate's is, counted in the same
jumps and bounded by the same `PLAYER_HOLD_MIN…PLAYER_HOLD_MAX`.

**A vary is seconds of burst.** It was 0…1 of the burst's length, which made it the one dial on the
card saying a number nothing beside it was said in: half of whatever the burst happened to be, so
moving the burst moved what the vary meant. It is now wall seconds on the burst's range, with the
burst's step and its readout (`burstLabel`, moved to `src/ui/Knob.tsx` because two dials read it). Linear where the burst is logarithmic: a log range cannot hold a zero, and this
one's zero is what turns it off. So the pair compares by readout rather than by knob angle, and the
burst's step over a linear sweep is fine enough that an arrow key moves a fraction of a
millisecond — which is what a vary at the 5ms floor needs, and a long walk at the top of the dial.

**The jumps amounts stay spec fields and gain no lanes** — the thing P97 asked to be decided in
writing rather than half-done. An automatable thing is a registry parameter with one declaration
and one (instance, param) value ([0030](0030-effects-are-instances.md)) writing onto an `AudioParam`
of a live node; a jumps amount shapes a pattern drawn from a seed before a sample is scheduled, and
a deck is not an instance of anything. Declaring these would mean a bound value per deck per field
that nothing reads per frame, and a second automation subsystem over the durable spec. A performer
who wants a jump amount to move turns up the amounts behind these doors.

Durable shape: `PlayerSpec` gains the three fields and changes what `vary` means. A spec from
before this is refused whole by the one `assertPlayer`, on its key set, and discarded rather than
migrated ([0026](0026-pre-release-has-no-migrations.md)).
