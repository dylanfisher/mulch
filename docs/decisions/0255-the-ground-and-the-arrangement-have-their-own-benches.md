# 0255 — The ground and the arrangement have their own benches

- **Date:** 2026-09-01
- **Status:** accepted, extending [0254](0254-the-bench-argues-the-card-fold-by-fold.md) and resting on [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md), [0252](0252-the-blend-is-four-arguments-and-every-corner-is-named.md) and [0184](0184-the-ground-is-the-songs-and-a-part-plays-back-on-it.md). The two drawings it records were cleared off the bench, and `sketchGround.ts` now holds the fourth clock's arithmetic rather than a drag's; what stands is that the ground is the song's and the crawl is counted in sixteenths

**Which Ground is two readings, and what they disagree about is whether a bed has a waveform.**
`SketchPartGround` draws the source with the grounds planted on it — chips a hand drags and resizes,
so where a ground is and how much of the file it holds are one gesture — beside the beds of that
source as a deck of cards the Every dial cuts. The source gives up the order: nothing on it says
when the loop gets anywhere, so the Every dial has no mark on that picture. The deck gives up the
sample: a card is a bed with no waveform under it, so nothing on it says which ground is worth
standing on. Both light the one window the loop is reading, and the readout under them states the
fold's own fact — one ground, for the whole song, because the loop walks the source once under
every part in turn ([0184](0184-the-ground-is-the-songs-and-a-part-plays-back-on-it.md)).

**The deck is cut in beds and the move is counted in sixteenths, which is the whole of the crawl.**
The two lists a ground fold could be drawn from are not the same list: `SKETCH_BEDS` are the grounds
a hand planted, and the beds the crawl walks over are loop-lengths of the file. The cards are the
second, named by the Bed dial's own count. `bedDistance` is then spent in the unit
`src/lib/playerBed.ts` is emphatic about — "counted in the loop's own sixteenths and not in whole
beds" — so the move lands part-way into a card, and so does the standing window. A deck that spent
it as whole cards would draw the one reading the parameter exists to make impossible, and it would
do it while wearing the card's own word for the amount. `SketchPage.test.tsx` pins the number and
not only the label for exactly that reason.

**The gesture's arithmetic is out of the component, because a static render never drags.**
`sketchGround.ts` holds where a chip lands, how wide it may be resized to and which pointer is
allowed to move it, with `sketchGround.test.ts` beside it — the shape `sketchPile.ts` took for the
same reason one step earlier (0253). It is what pins the two things a rendered-markup test cannot
see: a chip is clamped to the file at both ends and never below the width a hand can take hold of,
and a grab carries the pointer that made it, so a second finger neither drives the first one's chip
nor drops its drag. Letting go is wired to `pointercancel` and `lostpointercapture` as well as
`pointerup`, since a hold left set drags the next pointer to cross a chip without a press.

**A picture a hand drags is pinned to its own viewBox.** `SKETCH_PICTURE` is `h-40 w-80` against a
320-by-160 viewBox, so one unit of the drawing is one pixel of the element and a pointer's place in
the box is its place in the picture. A `w-full` box letterboxes the drawing inside itself under the
default `preserveAspectRatio`, and a drag read off the element's width then lags the pointer by the
ratio between the two — invisible to `renderToStaticMarkup` and obvious to a hand.

**How It Is Arranged needs two pictures, and that is the finding rather than the layout.** Eight
knobs and not one of them is a thing. Three shape a part and are seen by climbing: `SketchPartArrange`'s
ladder puts sixteen passes across and how many parts stood up, so Grow is a staircase's tread, Span
is a rung's width and Apart is how far a rung is pushed off its own step. Three are odds and are
seen by counting: the dice tray draws each as a hundred pips filled to the share the passes rolled.
What happens and what tends to happen cannot share axes, which is the wall 0247's drawn scores hit
head-on — "a drawn score says what happens, not what tends to happen" — so this is the one fold on
the bench that is two pictures rather than a picture and an alternative to it.

**The Keep is restated, and the picture says so.** Keep is a count of rounds on the card, not an
odds, so the tray draws it as the odds any one pass is the pass that lets go. That is the only
number on the bench restated rather than read, and it is what makes the three comparable in one
tray; a tray that quietly rescaled it would be arguing with the card. Compose and Amount are the two
neither picture holds, and the sketch names them as still just dials.

**Every reading is read off the fixture, never written beside it.** `SKETCH_ARRANGE` is sixteen
hand-written passes and `SKETCH_ARRANGE_ODDS` derives all three shares from them, the way
`SKETCH_REACH` already derives the walk's — a share the passes did not roll is a legend, and a run
that never lets go throws rather than drawing a nought it never observed. The same rule bites twice
more on the ladder: a run that grows at two different rates has no one Grow to name and says so
rather than labelling its first gap, and a run that never stands two parts throws where the ladder's
scale is read rather than filling every rung with `NaN` first. `SKETCH_GROUND` and
`SKETCH_SOURCE` join them in `sketchWalk.ts` for the reason that file's `@role` gives: two
screenshots of one sketch must be the same picture.

**0252's naming rule reaches both folds.** Each planted ground names itself inside the source's
picture and each bed on its own card, the five ground amounts name themselves on the deck's own
marks, the three ladder amounts
name themselves on the pass that is the thing, and each hundred of pips carries the card's word for
its odds beside the share it is filled to. `SketchPage.test.tsx` slices by `data-ground` and
`data-arrange` and counts the pips against the label, so a picture whose fill and whose label
disagree fails rather than shipping as odds.
