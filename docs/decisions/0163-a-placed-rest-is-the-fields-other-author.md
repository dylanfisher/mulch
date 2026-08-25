# 0163 — A placed rest is the field's other author

`restPulses` and `restSpan` place the waits: a Bjorklund pattern spreading `restPulses` waits as
evenly over `restSpan` jumps as whole numbers allow, so E(3,8) is `x..x..x.` and E(5,8) is
`x.xx.xx.`. Where the pattern breathes stops being a roll per jump and becomes a figure that comes
round, which is the deterministic emergent rhythm no chance could ask for.

**It is a mode, not a third amount, and which author is live is a rule.** `restIsPlaced` is
`restPulses > 0` and nothing else — the shape
[0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md) gave the song's two authors,
for the same reason: a switch beside these numbers could disagree with them, and a spec holding
both a placement and a flag saying to ignore it is one instruction arriving from two fields
(principle 1). A pattern of zero pulses is the whole of "off", the way a null player is the whole
of a deck not jumping.

**While it is authoring, the two rolled amounts are not read and are not drawn.** `drawRest` in
`src/lib/playerWalk.ts` returns the dial's own length on the jumps the pattern names and zero on the
rest, taking no draw at all — so the walk under a placed pattern is the same walk step for step at
either end of `restChance` and `restSpread`, and a moved knob still re-derives the tail
([0096](0096-a-moved-number-re-derives-the-tail.md)). The Rest door draws the two placing dials
always and the two rolling ones only while nothing is placing, because a dial that is drawn and does
nothing is worse than a dial that is not drawn. `rest` itself is neither author's: it is how long a
wait lasts, and a `rest` of zero is no wait whoever placed it.

**This amends [0124](0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md).** A framed
plus held the amounts that shape how its dial's number is _drawn_, and the Rest marker held exactly
two of them. It now holds four, and the two added ones shape no draw — they replace it. A door is
therefore where a number's other author lives as well as where its draw's amounts do, which is the
same door for the same reason: what is behind the plus is everything about the dial it sits on that
is not the dial. The count is still one per dial, because only one of the two authors is ever drawn.

**The placement starts again at a part boundary**, with every count the walk keeps — a part is a new
set of numbers, and a figure of waits carried over from the part before it would be one the new
part's own span could never come round on ([0153](0153-a-song-is-a-run-of-parts-the-walk-plays-back.md)).

**No region names either, and that is the written answer
[0152](0152-a-character-is-a-region-of-the-spec.md) asks for.** A placed pattern is heard only once
it has come round — a span of eight is eight jumps before the figure repeats, and at half an amount
a drawn one would be a different figure again — so a name pressed on it would be a character a
listener could not hear as one. It is the argument the stride and the home were left out on
([0162](0162-a-lean-is-an-amount-and-replaces-the-walk.md)).

Durable shape: `PlayerSpec` grows `restPulses` and `restSpan`, both whole. `RestSpec` and every
bound a wait has — the two new ones and the three that were in `src/lib/player.ts` — are declared
in `src/lib/playerRest.ts` with the generator, the way the figure's are declared beside the figure
and the jump's beside the jump. A stored spec without the two fields is discarded rather than
migrated ([0026](0026-pre-release-has-no-migrations.md)).
