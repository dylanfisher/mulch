# 0256 — The song builder is the tier a hand actually works, and two folds may need nothing

- **Date:** 2026-09-01
- **Status:** accepted, closing the parts bench of [0254](0254-the-bench-argues-the-card-fold-by-fold.md) and resting on [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md), [0252](0252-the-blend-is-four-arguments-and-every-corner-is-named.md) and [0255](0255-the-ground-and-the-arrangement-have-their-own-benches.md)

**The song builder is two readings, and what they disagree about is whether length is visible.**
`SketchPartSongs` draws the tier over a part ([src/lib/playerSongs.ts](../../src/lib/playerSongs.ts))
as a timeline — songs as segments of one bar, each as long as it plays, cut into one cell per round
so the plays can be counted rather than read off a label — beside a tracker, a numbered row per
song. The timeline trades the list: a bar as long as the run plays turns eight songs of sixteen
rounds into a wall of slivers and the names inside them go first. The tracker trades the reorder and
the length: a row is a row however long the song is. Only the timeline can be dragged, only the
tracker stays readable, and that is the whole of the choice.

**Both draw the cursor, because a run with no cursor over it is a list and not a song.** The cursor
stands in one _round_ of one song and never over the whole of it: a song that plays four times is
somewhere inside those four, and a highlight that could not say where is not a cursor.

**The cursor is named after its song, never indexed.** `SKETCH_SONG_STANDING` carries a name, and
the grab that drags a block carries one too. This is `SongPlace`'s own rule one tier down — "an id
and not an index for the song" — arriving for the reason that rule exists: the timeline reorders the
run under the hand, so an index taken before a drag points at whichever song was dragged into that
place. A cursor held as an index would light a stranger's block after one move, and a second drag
would move a song nobody took hold of.

**The gesture's arithmetic is out of the component, because a static render never drags.**
`sketchSongs.ts` holds where a pointer is along the bar, where the held song drops, and the run with
it moved there, with a test beside it — the shape `sketchGround.ts` and `sketchPile.ts` took (0253,
0255). It pins what `renderToStaticMarkup` cannot see: a place off either end clamps to an end of
the run rather than answering nothing, a drop on a song's own place returns the run itself, a
pointer that never took hold moves nothing, and a hold naming a song the run does not have throws.

**A reorder's target is read off the run without the held song, or the drag oscillates.** Read off
the run it is reordering, the target changes the moment the song has moved: with this fixture, a
pointer a tenth along holding `Out` answers "first" and then "second" and then "first" again, so the
run flickers for as long as the hand holds still and the arrangement it ends on is the parity of the
last move event. Read off the rest — which no move of the held song reorders — one pointer place is
one answer. A song is passed once the pointer is past its middle, which makes the boundary the one a
hand sees, and the drop index runs to the length of the rest so a song can be dropped past the last
one as well as before the first.

**The capture is taken on the picture, never on the block that was pressed.** A reorder moves the
block's own node in the DOM, and a moved node has its pointer capture released implicitly — so a
capture on the block dies at the first swap, `lostpointercapture` drops the hold, and the run stops
following a hand that is still down. It fails asymmetrically (a leftward drag moves the other nodes
and survives), which is what makes it read as flakiness. The ground's drag captures on its own chip
safely because it never reorders anything; this one cannot. No test here reaches it — the bench has
no DOM harness and `renderToStaticMarkup` never drags — so it is recorded rather than pinned.

**The bar is inset, so a fraction of the picture is not a fraction of the bar.** `alongBar` converts
one to the other, and its test is the one that fails without it: the head of the picture is _before_
the bar and its tail is _past_ it, where the element's own measure reports exactly nought and
exactly one. Read the element's way, every drop boundary sits a few pixels off the boundary the hand
can see, and the inset at each end lands in the first and last song rather than past them. The claim
copied from the ground's `sourceAt` — "the element's own width is the bar's" — is true there and
false here.

**Both readings draw the run, not the fixture.** The tracker maps the same state the timeline does,
so a reorder reaches its numbering. The tracker's trade is that it offers no reorder _gesture_; a
tracker still numbered in the order the bench opened in would be the two readings of one run
disagreeing about the run, which is the pair arguing with itself.

**The two folds that are already only dials get one sketch, and it is allowed to conclude "leave
them alone".** `SketchPartSound` draws How It Sounds and How It Is Timed as the dials they are
today, each beside one alternative: the sound fold as a single chew axis all six of its knobs ride,
the timing fold as a picker of grids. Neither fold is a picture waiting to be drawn, so the question
is not which surface wins but whether either needs to be anything else — and no whole-surface sketch
above can express that answer, because a surface that replaces the card cannot say "this part of it
was right". This is the entry a hand picks to say so.

**An alternative that claims to derive is drawn as derived.** The axis is one number
(`SKETCH_SOUND.chew`) and each of the six is that number through its own reach, so the honest dials
beside it read the same amounts rather than a table of six written twice; the picture draws a line
from the handle to each dot, because six unconnected dots are six dials in a different typeface. The
picker is the same rule: each cell's Repeats and Rest are what its own grid comes to — a landing
struck once per division and a wait of what one division is worth in the loop's own sixteenths — and
the grids stop at four because a coarser one owes a wait past `PLAYER_REST_MAX`, which is a cell the
picker could not honour. Burst and Vary are seconds, which no division of the loop can say, so the
picture names both under "No cell" rather than dropping them and arguing the fold has four dials.

**0252's naming rule reaches a fold that is not a picture.** Every song is named with the rounds it
plays inside both of its own pictures, every grid cell states its two amounts, and each of the six
sound knobs is named with its amount on the axis and on the dial beside it. A fold drawn as dials
has no `</svg>` to be bounded by, so it is bounded by the region that follows it instead — the slice
the chips' pile already takes — and the amounts on the axis are read out of the markup and found
again in the fold, so the two cannot drift.

**The song's name sits over its block, not inside it.** The shot found it: the cursor is a box round
one round of one block, and a name under that box reads as a clipped label — the trap 0252's own
shot caught twice, where `stutter 38` drawn as `stutter 3` is legible and wrong. The name moved
above the bar and what the cursor comes to is stated along the picture's foot.

**The parts bench's cases are their own file.** `SketchPage.test.tsx` crossed the 400-line cap, and
the split is by what is being checked: that file mounts the bench and checks the two lists are one
bench, `SketchParts.test.tsx` checks what the second list draws. Split at the cap rather than shaved
— prose taken out of a case is the reason a later reader cannot tell what it was for.

**The dark shot is still not taken, for 0254's reason.** `./scripts/drive` cannot set a theme, so
"at both themes" would cost an edit to `scripts/` the gate forbids. Both sketches are drawn in the
tokens the bench already uses at both; the light shot is the proof taken.
