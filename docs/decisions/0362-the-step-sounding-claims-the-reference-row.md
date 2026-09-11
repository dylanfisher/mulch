# 0362 — The step sounding claims the reference row

**2026-09-11.** A `PlayerStep` carries repeats, burst, rest, rates, ratchet, reversed and a voice,
and the picture read two of them: the bed it stands on and the place it falls in. Three of the rest
reach it now through the one row that is already a picture of what is sounding — the reference row
(0196) — declared in one table, `PLAYER_REACH` (src/lib/playerDrift.ts), the way an effect's
registry entry declares a way into the drift for each of its knobs (0139, 0148, 0359). Two more were
refused on the block's budget, which is the other half of this decision.

**The reference row and no other.** That row is cut by the stretch of source under the playhead
because that is what the yard is hearing; a step is the whole of the rest of what it is hearing, so
the two belong on one row. A claim of the walk's on any other row would be the arrangement drawing
over a plugin's. The three dimensions are `depth` for the wait, `fringe` for the ratchet and `hue`
for the voice — none of which that row already spends, so nothing here contradicts the spacing 0196
put there or the anchor the ground writes. The depth is shared with the deck's own meter and they do
not disagree: this is the ceiling a knob asked for, and a reading only ever takes it down (0128
amended). `burst` and `repeats` are not among them because they are already the row's period between
them (`landingSecs`, `playerRowPeriod`).

**A table, spent through itself.** `playerReachInto` writes each dimension as `PLAYER_REACH.<field>`
rather than by name, so a claim declared and never spent cannot exist, and the test reads the table
rather than a list of its own. Each field is read on its own scale: the wait as a share of the widest
a roll may draw (`PLAYER_REST_DRAWN_MAX`, P87) and _down_ the depth, because a step that waits is a
step sounding less; the ratchet up from the fringe's rest to the whole of its reach.

**And every field's zero is its dimension's own rest, which is what keeps a plain landing a plain
picture.** The ratchet is the one that had to be said: `colourReached` would have put a dial at zero
at fringe nought, which is the three channel lattices laid on top of each other and the loudest claim
on that dimension there is — `boldestRow` scores by distance from rest, so a pattern nobody had
ratcheted would have out-shouted every effect claiming fringe and flattened the screen for as long as
it played. A picture may not change because the transport started.

**A voice makes the hue's claim and the part's badge tells two of them apart.** A voice is the
numbers a part is overriding the card's dials with and carries no identity, so the tint is folded off
the badge that handed it over, onto the same four stops the module's own row uses (`playerTint`,
`PLAYER_TINTS`) — one fold in one place, not a second ladder. A step playing the card's own numbers
rests, which is every step of a pattern holding no song.

**All three rest when nothing stands, and that is a write and not an omission.** A yard playing
nothing claims nothing, so the read writes the rests back every frame. Left unwritten, the picture
would hold the last landing's claim after the walk stopped, which is a row saying something is
sounding that is not.

**Reversed reaches no row: it is which way the lattice crawls.** The crawl is the one travel the
screen makes across the picture, so a landing reading its slot backwards runs it backwards — the
term negated inside the rounding, so the lattice still lands on whole cells (0346). It turns the
crawl alone: the wind is the rack's own tail and the sides are the output's two channels (0361), and
neither of those is being played backwards, so a reversed step's crawl composes with that lean
rather than replacing it. Like both of them it is a term on the transform and touches no field of
the tile's key, so a pattern played backwards all day bakes nothing (0129) and no picture-sized draw
is added (`STAMP_PICTURE_DRAWS`, 0353, 0354). It reaches the painter as one boolean on the row set,
beside the alphabet and for the alphabet's reason: there is one lattice and it crawls one way.

**`repeats` and `rates` were refused, and the budget refused them.** `octaves` is decided once where
the set is built: `spreadOctaves` puts a floor under every straight row and `shareOctaves` is the
last word on what the whole set can afford (0230, 0244). A per-frame write of it on the reference row
is both a second opinion about that row and an escape from the budget — a count at the top of its
dial would cut two more picture-sized fills a frame than the set was ever allowed. And `chirp` turns
a straight row into a swept one, whose tile is as wide as the picture and keyed by the cycles its
spacing comes to (`cutStraight`, src/ui/moireCanvas.ts, 0142) — and the reference row's spacing is
rewritten every frame from the onsets under a moving playhead (0196), so a claim there is a
picture-wide per-pixel bake on the frame path whenever that spacing crosses a cycle. Both are exactly
what the block's budget paragraph forbids, so neither landed; docs/plan.md §4 holds the price and
what a later step could do instead.

**And a step carries the bounds its own offset means anything inside.** `PlayerStep.bed` is an
unbounded offset folded onto the ground that exists wherever that is known, and the picture is the
one reader that cannot ask a spec — it is handed a per-frame peek and nothing else. So it read the
offset over the whole file and anchored a zoned yard's rows outside the stretch the hand had marked
(0318). The zone now rides on the step beside the bed, off the spec and never off the voice, because
a zone is a place and not a number a dial turns — one object carrying both halves of one question,
rather than a nineteenth parameter threaded down the per-frame read.
