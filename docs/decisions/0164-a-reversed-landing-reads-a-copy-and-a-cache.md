# 0164 — A reversed landing reads a copy, and the copy is a cache

`reverse` is the odds one landing reads its slot backwards, rolled per landing in the walk beside
the drop ([0160](0160-a-hole-is-a-landing-that-never-opens.md)). There is no negative rate on an
`AudioBufferSourceNode`, so what a reversed landing plays is a reversed copy of the deck's whole
buffer, entered at the mirror of its own slot: `[from, from + span)` becomes
`[duration − from − span, duration − from)`, the same length, entered at its beginning like any
other window. Because the copy is the whole buffer, the grid still divides it and nothing else
about the landing moves — the slot, the count, the seams and the rest after it are what they were.

**The copy is a cache and is durable nowhere.** One per deck, minted at the first landing that asks
for one rather than at every load, and let go of when the pattern is — which is where a deck's own
`load` goes, since it switches the module off before it holds anything new (`src/audio/deck.ts`). A
stop keeps it, and so does a `reverse` turned back to zero: a pause, a play, or a dial swept
through its own floor must not each cost a copy of the whole buffer. That is what the deferred mint
costs in the other direction — the copy is three passes over the sample on the arming tick, paid at
the first landing that rolls reversed rather than at every load, and then held until the deck is
holding other audio. Audio nobody imported is a crop's business
([0047](0047-a-crop-mints-audio-the-user-did-not-import.md)) and a reversed read is not a crop — nothing here is stored, exported or named, so two machines replaying
one session mint the same copy from the same bytes and neither writes it down.

**The cursor runs backwards with it.** `position()` answers the deck's read head off the queue
entry the clock is inside, and the playhead, the peaks and the picture are all drawn from that one
number — so a reversed landing that left the cursor walking forwards would be the instrument
showing one thing while it played another. Inside the same slot the head is `span` in and coming
back: `grid.in + slot × grid.slot + (span − into)`.

Durable shape: `PlayerSpec` grows `reverse`, bounded in `src/lib/playerReverse.ts` because
`src/lib/player.ts` is at the hard cap ([0045](0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)).
The dial is on the card's own row rather than behind a framed plus, because it shapes no drawn
number ([0124](0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)). No character's
region names it: every knob a character names is true of the pattern whatever it is playing, and
whether a slot read backwards is worth hearing is a fact about the material rather than about the
walk — which is the written answer [0152](0152-a-character-is-a-region-of-the-spec.md) asks for.
