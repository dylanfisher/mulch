# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device. A performance stays editable, portable, reproducible through commands,
and identical through the live and offline signal paths.

The instrument today is an any-number-of-decks instrument, with decks the interface calls yards, a
durable session, portable archives, bounded undo/redo, and a menubar shell over a scrolled
instrument. A yard holds a source, a beat-aware loop with its own handles, a rack of effect
instances — one of which keeps the last few seconds of what passed through it and plays that back
in windows a trigger opens (0222) — a jump module, and a moiré drift picture of everything
automating it. The source is
imported in any format the browser decodes or drawn from the generator list, both behind the one
source control in the yard's header. The picture is drawn over a reference row cut by the clip's own
analysis, turned and anchored by the ground the yard is reading on, it carries a layer per tier of
the arrangement being walked, it breathes with what the meters read, and it opens large in a browser
window of its own.
The pattern a yard jumps is arranged as albums of songs of parts, each tier named, ordered and
saying how many times it goes round, with a part carrying the dials it was captured from — or drawn
by the pattern itself, which holds a hand's own run untouched meanwhile.
An automator grows a run of effects in a rack of its own, breathing between a floor and a ceiling at
the odds a turn lays anything, bounded by a window a hand may put on any parameter its pool draws —
read off the pool's own declarations, so a knob added to a plugin is bounded by construction, and
opened from a badge the knob that says how often that entry is drawn wears in its corner — and
kept alive by one Wander dial beside Stray. Its run can be held still by hand — a Wait dial said in
seconds, and an hourglass at the head of the run that asks for that time again, up to a lock with no
end (0215). A yard running one, or jumping, is told its picture
never comes round rather than given a figure (0208, 0210).
Every continuous parameter except the read rate carries a gesture-relative lane. Audio leaves
through one render harness: the File dialog writes a folder holding the .wav and the session that
made it, or a crop, or a flatten, and a take begins where the ear is — warmed to the second the
button was pressed, or to a lookback behind it (0216). A ⌘/Ctrl+K palette sends the same commands
the screen sends.

Each of those is one decision record in [`docs/decisions`](decisions/), which says what it is and
why it is that way. This document holds only the path forward.

The product outcome guiding the next sequence is:

> A person can shape local samples into a beat-aware performance, recall its sounds and gestures
> exactly, and control it from either the screen or hardware without changing the instrument's
> underlying command model.

---

## 1. Ordered next work

Finish one step, including its full gate, before starting the next. A step delivers a usable
vertical slice, not infrastructure for a feature nobody has asked for.

An entry says what durable shape it moves before the step is started. That is what makes a step
expensive, so it is the first thing to state. A step is written against §2, §3, and the standing
clauses in [subagent-prompt.md](subagent-prompt.md).

The subject of the run below is **the surfaces that run of steps left behind** — a switch that
throws a pattern away, a press that keeps one ground and then takes it back, and an export that
says nothing about how long it will take. Every one of them is a report from using the instrument
rather than a feature nobody has asked for. The first of them is done: the walk's three lanes each
say which tier they are and the name of the row standing in them, copied per frame off the segment
the same painting lit (P163).

The run then turns to **the picture, and what it is a picture of**. Every row in the drift is an
input — a knob, one instance's meter, a clock — so nothing in it is the sound that actually comes
out (P167); its sharpest feature, the rosette two crossing axes throw, happens once in the middle by
default and holds still (P168); and a rack six times busier draws six times as many rows and never a
deeper one (P169). Those three are read off the same picture and are one subject: what the drift
draws when nobody is turning anything.

The subject the last run of steps had was **what an arrangement looks like
while it is playing**, and it is finished: a step carries `SongPlace` — which album, which round of
it, which song, which round of that, and the jumps still to come of each — the three tiers' rows
wear a play mark and a countdown off it (P155) — a clock and no word, what the number counts being
the slot's own label written once at mount rather than a string a frame composes (P162,
`GROWTH_LEFT_LABEL`) — the walk's own picture says where it waits and draws
its run as three lanes and its boundaries as three weights of rule off that same place (P156), the
ground comes round on the top tier off it too (P158), the three tiers wear names drawn off their own
ids rather than four characters of them (P160, 0223), and the drift now has a row per tier and a
field the ground turns and anchors (P161, 0224).

The place is on the step, and every one of those reads it: nothing below may re-derive one.

The run then turns to **what the instrument asks a hand to do, and what it asks for twice**. A tier
that is the tier under it with a different word on it (P170); a picture of the walk that is also a
control over two numbers that are not on it (P171); a pool of eight things drawn as eight numbers
among the numbers that shape the run (P172); a run of dials that arrive where they are going before
the sound does and then stand still for two minutes (P173); and a field that teleports on a jump
whose whole meaning is a distance (P174). Four of the five are subtractions, and that is the shape
of the subject: every one of them is a second way of saying something the instrument already says.

The run ends by turning on itself. **What no step has ever read is the tree.** Five territories read
`src/` for a fact declared twice, a behaviour nobody asserts and a cost on a per-frame path, and the
duplicates collapse and the tests get written (P175); one pass measures what the picture run actually
cost against the profiler's own history and pays down what it can attribute (P176). Both are steps
and not surveys: they land diffs, one gated landing at a time, and only what needs a durable shape or
a decision leaves as an entry below them.

Document order is the run order.

### Scheduled

**P164 — Turning the module off keeps the pattern it was playing.** The durable shape is one field:
`PlayerSpec` gains `bypassed`, validated in `src/lib/playerWire.ts` beside every other field of the
spec and defaulted false. No migration and none needed (0026).

The switch on the card sends `send(pressed ? { seed: mintSeed(), ...PLAYER_DEFAULTS } : null)`
(`onSwitch`, `src/ui/PlayerCard.tsx`) — so turning the module off **deletes the whole spec**, and
turning it back on mints a fresh seed and factory dials. Every part, song, album, kept ground and
turned dial is gone, and the only way back is undo. That is not what a switch means anywhere else
in this instrument: `effect.bypass` leaves an instance's values live and set, and the rack says so
in as many words ("a bypassed effect keeps its knobs live"). The module is the last surface where
off means discard, and it is the one holding the most work.

**So off is a bypass and costs no new command.** `deck.player` already carries the whole spec
(0089), so the switch patches `bypassed` like any other field and `setPlayer` hands the graph
`cmd.player.bypassed ? null : cmd.player` — one reader of that field, in the one place a pattern
reaches the engine, so nothing downstream learns a second way to be silent (`src/app/deckPlayer.ts`).
A yard with no spec at all is still what a fresh mint answers: the switch mints only where
`player === null`, and thereafter it is turning one field over. What the card draws while bypassed
is what it already draws for `off` — `OFF_SPEC`'s greyed, unturnable dials — but the values under
them are the ones that come back (`src/ui/PlayerDial.tsx`).

Proof: the field through the validator in `src/lib/player.test.ts`, which is where a spec's own
fields are already put through `assertPlayer` and which stands at 738 with room for one; the graph
handed null while
the spec is held, in `src/app/deckPlayer.test.ts`, which is where `deck.player` is already exercised
against a recording engine; and the switch turning the field over rather than sending null, in
`src/ui/PlayerCard.test.tsx`, whose existing `player: null` cases are the ones that pin the old
behaviour. `src/ui/PlayerCard.tsx` stands at 766 of the 800-line hard cap and P165 touches it too:
make the room before landing at the cap, not after (0045).

**P165 — The plus keeps a ground, and never takes one away.** The durable shape is none: it is the
same `beds` list, edited by a different arithmetic.

The `+` on the kept row calls `onKeep`, which reads the bed the walk is **standing** on off the peek
and hands it to `plantBed` — which toggles: a bed the list already holds comes out of it. Together
those are the reported bug in full. A yard that is not jumping has no `step` and the press does
nothing at all; a yard standing on one ground keeps it on the first press and lets it go on the
second, so a hand pressing `+` twice ends with an empty row, and a ground it did keep disappears
the next time the press lands on the same one. One press, one meaning: **`+` keeps the ground the
window is on and adds nothing that is already kept.**

Three things follow. The bed is `player.bed` — the durable field the Bed dial turns and the drag on
the picture writes — not the peek, so the press means the same thing on a stopped yard as on a
running one and the `+` is live whenever a spec is. `plantBed` splits into the add the row's press
uses and the toggle the picture's Option-press keeps: the two gestures were one arithmetic because
they edit one list, but they do not mean one thing — a modifier-press on a lit block a hand can see
is legibly a toggle, and a `+` at the end of a row is not (principle 1 asks for one author, and this
is two gestures with one author each). And the press says why it is unavailable rather than sitting
dead: it is disabled at `PLAYER_BEDS_MAX` as it is now, and disabled when the window's own ground is
already kept, with the sentence in `src/lib/copyGround.ts` saying so (principle 5). Letting one go
stays where it already is: the `×` under the row and the Option-press on the block.

Proof: the add and the toggle as two functions, including the full list and the already-kept ground,
in `src/lib/playerGround.test.ts` at 105; the press adding a second and a third ground rather than
emptying the row, in `src/ui/PlayerBeds.test.tsx` at 125; and the card handing it the window's bed
rather than the peek's step, in `src/ui/PlayerCard.test.tsx`. Nothing in the browser: a scenario
lands on the gate one for one (§3).

**P166 — An export says how long it is going to take, once it knows.** The durable shape is none: a
rate is a measurement of this machine and nothing about the performance.

Exporting a few minutes of a yard with a full rack takes minutes of wall clock, and the dialog says
`Exporting…` and nothing else — so the one number a hand needs before pressing the button is the one
number nothing on screen has. **The instrument measures itself rather than being told.** 0051 is the
precedent and the constraint both: a render rate is a fact about the machine it ran on, so a figure
shipped in the source would be measuring the author's laptop on everyone else's. So the render
harness reports what it is doing — rendered seconds against wall seconds, off the pump it already
runs in `src/app/render.ts` — and two things read it.

**While it renders**, the button says how much is left, in `growthLeft`'s spelling — the clock,
with the word for what it counts carried by the sentence around it rather than on the number
(P162): a real countdown off a rate this render has actually observed, arriving within a second of
the press and revised as it goes. That is the half that is always honest, because it is measuring
the render it is describing.

**Before it renders**, the dialog says a figure only where this session has already measured one —
the last export's own rate, held in memory beside `elapsedSecs` and never durable (§2) — said as
what it is: about so long, at the speed this session last managed. Where nothing has been measured
it says the shape and not a number, which is the answer 0208 and 0210 already settled for a picture
that never comes round: a made-up figure is worse than a stated unknown (principle 5).

Proof: the rate and the seconds remaining as pure arithmetic over rendered-against-wall, tested
where the words are; the harness reporting progress in `src/app/render.test.ts`, which is where the
pump is already driven; and the dialog saying the shape with nothing measured and a figure with one,
in `src/ui/ExportAudioDialog.test.tsx`. The browser scenario that exports audio already exists in
`scripts/smoke.d`, and asserting the busy label there costs no new scenario (§3).

**P167 — The picture is beaten against what the session is putting out.** The durable shape is
none: two more numbers on a per-frame read and one more row in every picture, and nothing about
either is stored (0145).

Every row in the drift is a picture of an input — a knob position, one instance's own meter, a
clock — and the one thing nothing draws is what the instrument sounds like at the end. 0213 named
the place: a deck's crest belongs to the field "because the picture is a yard's; the master's taps
in `src/audio/context.ts` are where this would live if the picture were ever the session's."
**So the session gets a row, and it is a row rather than a second field reading**: 0213 refuses an
output a row because a deck's output has no item to belong to, and the master bus has one — it is
the thing every yard lands in. It is one row per picture and the same row in every picture, so two
yards open side by side are beaten against one layer and drift together, which is what a picture of
the session is and what a second per-deck reading would not be.

**Two allocation-free scans of a window already being fetched say what it needs.**
`createMasterBus` taps two analysers off the bus input and reads `peakMagnitude` off each; the peaks
are a meter's and a row driven off an instantaneous peak flickers on every transient, so the row
takes an RMS — `rmsMagnitude` in `src/lib/peaks.ts`, which `crestFactor` then reads instead of
computing a second power under the same window (principle 1). Brightness is the RMS of that window's
first difference over the RMS of the window itself, halved onto 0..1 (`spectralTilt`): a sine at _f_
answers `2·sin(π f/sr)`, so a dark mix reads near nothing and a bright one near one. **In the time
domain and never a spectrum** — `METER_WINDOW`'s own comment is a promise that nothing here asks for
frequency data, and an FFT a channel a frame to move one grating is a large bill for a scalar.
Silence answers 0, which is the sentinel `crestFactor` and `BeatAnalysis.crest` already use for
"measured nothing" and not a reading a window with sound in it can produce.

The level cuts the row's depth and the tilt sets its pitch, through a `heardTilt` beside
`heardPitch` and `densityPitch` (`src/lib/moireSound.ts`) so a reading is spent as a spacing in one
spelling. Its period is the session's own — `sync`, the one clock every yard shares, falling back to
the deck's loop where nothing is synced, because a period no deck owns is what keeps it from locking
to a yard's rows. It is straight, plain and folded off 0 like the reference row, so it is never
fanned and never takes one of the screen's four motions (0128). And it counts among the gratings the
ink is shared out over as the share of one its level has made of it, for the reason the wash row
does (0213): counted whole, a silent session weighs the picture down; counted only once loud, the
whole picture steps as the first sound arrives.

`MasterPeek` gains the two fields, `engine.masterPeek` and the facade's preallocated `masterScratch`
widen with them, and the no-engine branch zeroes them as it zeroes the peaks. **`masterPeek()` gets
a second caller a frame** for the first time — the meter and now the drift — so the facade fills its
scratch once per `frameStamp()` and hands the same object back, which is the throttle `stats()`
already uses for its heap read.

Room first: `src/ui/moireRows.ts` stands at 782 of the 800-line hard cap, so the field's own rows —
the reference, `washInto`, `macroInto` and this one — move out to `src/ui/moireRowsField.ts`, whose
test file already exists under that name. Make room before landing at a cap, not after.

Proof: the two scans against a sine, a sine an octave up, noise and silence in
`src/lib/peaks.test.ts`; `heardTilt`'s band and its silence answer in `src/lib/moireSound.test.ts`;
the row's period off the sync clock and its depth at nothing under silence in
`src/ui/moireRowsField.test.ts`; the widened peek in `src/ui/MasterMeter.test.tsx`. Nothing in the
browser: a scenario lands on the gate one for one (§3).

**P168 — Two rows crossing is a place on the picture, and it moves.** The durable shape is none: a
resting centre folded off a row's own identity, and one more per-frame write beside `phase` and
`pulse`.

The picture's best feature is one it draws by accident and then holds still. Where two curved rows'
axes nearly coincide the field throws a rosette — a knot of fine radial nodes, sharper than anything
a single grating makes — and every curved row no effect gives a `centre` claim to carries
`DRIFT_REST.centre = 0.5`. So a rack of them piles every axis on one point: one cluster, dead
centre, unmoving until a knob is turned. **So a curved row rests where its own fold puts it, and its
anchor moves.**

The rest comes off the same number its shape and its period already do (0076) — a third independent
read of one fold, the way `effectRowPeriod` takes the quotient where the waveform takes the
remainder. Rows spread, pairs come into near-coincidence in ones and twos rather than all at once,
and a rosette happens where two rows actually cross rather than where the default was. A row with a
claim still stands where its knob puts it: this is the rest value and not an override.

**The drift moves nothing a knob does not already own.** Each such row's centre is carried around
its rest by its own `phase` over its own `period`, both of which are already the row's and already
per-frame, so rows on different periods sweep past each other at their own rates and a crossing
forms, tightens and comes apart on the beat between the two. That is the whole of "the pattern moves
with how the parts are playing back": the periods _are_ how they are playing back. What is new is
the punch — `row.pulse`, the instance's own meter, throwing the centre a little further off its rest
on a transient — and **that half is a second thing a reading moves**, where 0128 amended lets a
reading move exactly one. The case for widening it is that an anchor is not a knob position but
where the row is standing, and a reading that moves where one row stands cannot be read as a knob
nobody turned, which is the thing 0128 exists to prevent.

**The step is affordable because of one line already in the painter.** `placeCurved` reads
`stepped(row.centre, DRIFT_CENTRE_REACH)` and `TILE_CACHE`'s key is built from the stepped value,
because a curved row's tile is a picture-sized bake per stop and that is the one thing that must
never reach a frame (0142). A drifting centre therefore walks the ladder `stepped` already quantises
to and visits cache entries rather than baking new ones: the number of stops is exactly what it was.
Written against the raw centre instead, the same step is a bake a frame — so that is what the proof
holds.

Proof: the fold spreading two identities to two centres, and a claimed centre surviving, in
`src/lib/moire.test.ts`; the per-frame write and its allocation count in `src/ui/moireRows.test.ts`;
and the load-bearing one, a sweep across a full period visiting a bounded set of `TILE_CACHE` keys,
in `src/ui/moireCanvas.test.ts`. One reading by eye rather than a scenario: `./scripts/drive --shot`
on a run of three or more curved rows, judged from the swing and the 1:1 crop.

**P169 — An automator draws its run at as many scales as it is holding.** The durable shape is
none: `octaves` on a grown row, answered per frame off the population the read is carrying.

An automator holding six effects draws six rows at one scale each, so a rack that got six times
busier got six times wider and never deeper. `octaves` is the dimension for exactly this — one copy
at the pitch it asked for and each further one an octave coarser and half as deep (0143) — and the
automator itself may not claim it: `STRAIGHT_DIMENSIONS` refuses `chirp` and `octaves` to a curved
entry, its own geometry is `fan`, and the registry throws at load rather than the painter dropping
the claim (0142). **So the claim lands on the rows it grew and not on its own**, each of which
carries its plugin's geometry, several of the eight poolable entries being straight.

One function answers it, in `src/lib/effectGrowth.ts` beside the rest of the growth maths:
`grownOctaves(held, geometry)` is `held` copies for a straight row, bounded by
`DRIFT_OCTAVES_REACH`, and **one for a curved row as the answer and not a drop** — a curved copy
needs a tile of its own, which is 0142's own sentence said once more where it can be tested rather
than silently in the painter. `held` is the run's own size, which `DeckPeek.grown` already carries
and `GROWTH_COUNT_MAX` already bounds at six; the set rebuilds when the population turns over, which
makes these the frame's rows and not the session's (0212).

**One bound is new, because the number of automators is not.** Each copy is a fill of its own, so
four automators holding six apiece ask for four times the fills one does. `DRIFT_SCALES_BUDGET` is
the total extra fills a row set may ask for, and past it the counts fall back toward one evenly — a
very large rack draws fewer scales rather than turning the painter into a slideshow. The picture may
fall behind and the hand may not (0144); this is what keeps the falling-behind bounded rather than
merely permitted. Past three held effects a straight row is already at every scale the picture can
carry, and further complexity is more rows rather than more depth. That is the honest ceiling and it
is `DRIFT_OCTAVES_REACH`'s own reason, not a shortfall of this step.

Proof: `grownOctaves` at each held count, at the cap and on a curved geometry, in
`src/lib/effectGrowth.test.ts`; the budget sharing out across an oversized set in
`src/lib/moire.test.ts`; the grown rows' octaves rebuilt when a population turns over in
`src/ui/moireRows.test.ts`. Nothing in the browser beyond P168's own reading.

**P170 — Two tiers of one shape is one tier said twice.** The durable shape is the arrangement's
own: `PlayerSpec.albums`, a run of albums of songs of parts, becomes `PlayerSpec.songs`, a run of
songs of parts. Two tiers, not three. Nothing is migrated; a stored spec of the old shape is
discarded (0026).

0214 built the album on one argument — a tier is the tier under it said again, so a third costs one
editor rather than three — and the argument was right about the _cost_ and wrong about the _reason_.
An album carries a name, an order, an id and a count of rounds, which is exactly and only what a
song carries: two tiers that differ in nothing but their depth are one tier a hand has to choose a
level in twice. **What a tier has to earn is a fact of its own**, and the album never had one. The
part earns its own: a length in jumps, a voice, a switch. The song earns its own: the parts it is a
run of, and the draw that may fill it (0158). The album earns rounds, which the song already counts.

**The picture loses nothing it could actually draw**, and that is the load-bearing evidence rather
than a concession. 0224 wrote the album's row at `DRIFT_BROADEST_PITCH` and the song's at the
geometric middle, then said in its own second paragraph that `gratingPitch` saturates both: on most
jumping yards the two were drawn at the same spacing and told apart only by the fold of their ids.
A layer nobody can see a spacing difference in is a layer, not a tier. So the song's row takes
`DRIFT_BROADEST_PITCH` outright, `PLAYER_ALBUM_ROW_PITCH` and `PLAYER_ALBUM_ROW_SHAPE` go, and the
band has one coarse layer over the part's — which is the band the picture had before 0224 asked it
for three.

What comes out, and it has to come all the way out: `PlayerAlbum`, `PlayerAlbumId`,
`PLAYER_ALBUM_MAX`, `PLAYER_ALBUM_SONGS_MAX`, `album` and its round and its jump counter from
`SongPlace`, `"album"` from `NamedTier`, `playerAlbumRowShape`, the album lane in the walk's three,
`src/ui/PlayerAlbum.tsx`, `src/lib/copyAlbum.ts` and `src/lib/playerWalkAlbum.test.ts` — the last of
which existed only because `playerWalk.test.ts` was four lines from the cap, and its two cases go
home. `src/lib/playerAlbum.ts` keeps its role — the tier over a part, its cursor and its validator —
under a name that says one tier; `createAlbums` becomes the one cursor over two tiers and answers
what it already answered, so nothing below it changes at all. Delete, don't comment out (principle
6): a grep for `album` across `src/` is the step's own gate.

**A part id stays unique across the whole spec** and the validator stays keyed that way (0214's last
paragraph), because a selection, a solo and an audition still name a part by its id alone — that
clause was never about the album.

The decision this constrains is the next one, so it is written down: there are two tiers, and a
third is a fact of its own or it is not a tier. 0214 is superseded and 0224 is amended in its first
two paragraphs.

Proof: the cursor over two tiers, at a boundary of each and at the end of the run, in
`src/lib/playerAlbum.test.ts` with `playerWalkAlbum.test.ts`'s two cases folded back in; the
validator refusing a three-tier spec, in the same file; the two tier rows and their pitches in
`src/ui/moireRowsSong.test.ts`; two lanes rather than three in `src/ui/PlayerScope.test.tsx`. One
reading by eye: the arrangement card, which loses a level of nesting and should read as a shorter
card rather than a rearranged one.

**P171 — The walk is a picture of the walk, and there is nothing on it to grab.** The durable shape
is none: `distance` and `repeats` keep their declarations, their bounds and their dials in Fine
Tune. What goes is a second road to them.

0197 made the picture a control on the ground's own precedent — `player.bed` is turned by its dial
and dragged on its picture, and both send the one field (0191). The precedent does not carry,
because the two pictures are not the same kind of picture. **The ground's rectangle is a place**:
dragging it points at a stretch of the file, and where the pointer is _is_ the value. The walk's
sheet is a shape, and the crosshair on it wrote how far a jump travels across and how many bursts a
landing is cut into up — neither of which is anywhere on the sheet. A hand aiming at a landing it
can see gets two numbers about landings in general, and the sheet redraws under the pointer into a
sheet it was not aiming at. That is the report: the gesture is cumbersome because it is a drag whose
target moves in answer to itself.

So the walk keeps the eyebrow, the sentence behind `Explains`, the wait it counts down and the lanes
under it, and loses `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, the
`usePointerGesture` record, `write`, `aim`, the grab cursors and the `data-disabled` that was only
ever read by them. `scopeAim`, `scopeMark` and `ScopeAim` go from `src/lib/playerScope.ts` with
their tests, the crosshair goes from `src/ui/playerScopeCanvas.ts` and its `aims` from the painting
double, and `PLAYER_WALK_AIM` goes from `src/lib/copyCard.ts` — the tooltip is the picture's own
sentence again and not half a sentence about a control. `src/ui/PlayerScope.tsx` falls back under
the 400-line soft cap and its `max-lines` waiver goes with the code that earned it.

**The ground's picture keeps its drag**, on the argument above and not by omission: it is a place,
its rectangle is where the thing is, and a plant there writes back where the hand pointed. 0197's
"the picture is a control" clause is reversed for the walk and stands for the ground.

Proof: `src/ui/PlayerScope.test.tsx` loses its crosshair cases and gains the one that matters — a
press and a drag across the picture send no command at all — and keeps every case about what it
paints. `src/lib/playerScope.test.ts` loses the round-trip between `scopeAim` and `scopeMark`, which
is the whole of what those two were for.

**P172 — An entry is its icon, and how often it is drawn lives with what it is drawn inside.** The
durable shape is none: `auto.filter` through `auto.scatter` keep their declarations, their values,
their `rebuild` and their `AUTO_UNREACHED` reasons. What changes is how a hand reaches them.

Eight weights on the automator's knob row is a pool drawn as eight numbers. They sit among the run's
own dials — Least, Most, Odds, Stays, Wait, Fade, Stray, Wander — which are about the _shape_ of the
run, while a weight is about _which thing_, and the row says nothing about which of the sixteen is
which. So the eight come off the row and become a grid of buttons, two or three to a row, each
wearing its entry's own icon and label. A press opens the popover the corner badge already opened —
one bound row per parameter that entry's arrivals are drawn at — with the entry's weight as one
slider at the head of it. **How often, and inside what, in one place**: the two halves 0208 already
called one row on the card, said as one popover instead of a knob with a badge in its corner.

`BoundsEntry` becomes the whole entry rather than its window, and its trigger stops being an
`icon-xs` badge. The weight slider commits the way a bound row does — one `param.set` on release and
never one per pointer event, because a weight is `rebuild` and a drag that wrote one per frame is
sixty crossfaded populations (0065, 0090, 0202). `ParameterKnob`'s `corner` slot loses its only
caller and goes with it (principle 6). `WEIGHT_OF` stays the one list saying which parameter is
which entry's weight, and it is now what the grid is built from rather than what a knob is badged
against — so an effect joining the pool still gets its button by existing, exactly as 0208 made it
bounded by existing.

**And the same icon lands in the two other places an entry is named.** `plugin.icon` is the
registry's own field (0055) and the popover trigger was its only reader: the rack card's header
wears it left of the label, for every effect and not only a poolable one, and each grown row wears
it left of its name in `src/ui/GrownRows.tsx`. A card found by its shape before its word is the
whole reason the field exists.

Proof: the grid built off `WEIGHT_OF` with a button per poolable entry, and one popover holding both
the weight and the windows, in `src/ui/EffectRack.test.tsx`; the release-only command for the
weight, in the same file; the header icon asserted once there and the row icon once in the grown
rows' own suite. One reading by eye: the automator card, which should read as eight dials and a list
rather than sixteen dials.

**P173 — A drawn dial travels while the value does, and it goes on being redrawn.** The durable
shape is none: `auto.wander` keeps its declaration and its range. Everything here is what the run
does with it and how a row paints it.

**Three faults, one subject — the run's own dials are lying about motion.**

_Where they are._ A row is a name at two fifths, a ×, the dials at a fixed `5.25rem`, the bar, and
the countdown in its own `w-20`. The bar is the one column that absorbs slack and it shrinks to
`min-w-2`, so on a narrow card the dials end up hard against the clock with nothing between them.
The dials move up beside the name, ahead of the ×, and the bar takes a floor it cannot shrink under
— so the thing that gives is the name, by truncating, which is what the row already says it is for
(P24).

_That they do not move._ A wander is a ramp: `wander()` schedules `rampTo` over `wanderSecs` and
then writes `place.values[at]` to the destination in the same breath, so the dial arrives a whole
ramp before the sound does. An arrival is honestly instant — a grown effect is _built_ at its drawn
values and only its presence is faded (0202) — so the arrival is drawn right and the wander is drawn
wrong, and only the wander needs fixing. Each drawn value takes the `Fade` shape the presence
already has — where it started, where it is headed, when, and over what — and `grown()` reads it at
`when` the way `reach()` already reads the presence. Derived per read, written into the same array
in place, no allocation per frame (0070).

_That they barely happen._ `stir` runs once per growth tick, which is `stays / most`: sixty seconds
over three places is one chance every twenty, so Wander at its default moves a given knob about once
every two minutes. That is not a texture, it is an occurrence. The wander takes a clock of its own,
well under a growth tick and bounded the way `TICK_MIN_SECS` bounds that one, so a standing value
keeps getting its chance for as long as it stands.

**The stream is what this costs, and it is the thing to state.** A seed names one performance
because every draw is spent whenever it is due and whatever it says (0134): a wander on its own
cadence spends its draws on that cadence, so the same seed at two `stays` values is two
performances. Free while pre-release (0026), and the discipline that survives it is the same one —
the wander's draws and the growth tick's are spent through the one generator in a fixed order, so
turning Wander down is still a quieter run and never a different one.

**What is _not_ here, said so nobody adds it.** A held parameter — a presence, or anything the
automator is driving — is never drawn and gets no dial, and the row paints the automator's own fade
as its opacity instead. A dial for a value nobody drew would be a control's clothes on the fade
(0128, 0202).

Proof: the wander's chance coming round more than once inside one place's life, and the draw order
holding across two cadences, in `src/lib/effectGrowth.test.ts`; a dial read mid-ramp standing
between where it was and where it is headed, in the automator's own suite; the row's columns at a
narrow card, in the grown rows' suite. One reading by eye: `./scripts/drive --shot` on a run at
Wander up, judged from the 1:1 crop — dials that creep, not dials that tick.

**P174 — A ground move is a move, and the picture travels it.** The durable shape is none: this is
the frame's row set and nothing else (0212), and it rests on the ground the standing step already
carries (0185, 0224).

`refillRows` writes `groundCentre` straight onto the three rows that rest on it — the reference row,
the wash, and the part's own tier row — so a loop jumping to a new stretch of the file teleports the
field the whole picture is beaten against. 0224 was right that a ground move re-centres and rotates
the field and never said _how it gets there_, and the answer it left by default is instantly. **A
jump is a distance, and the picture is the one surface that could show it.** The centre eases toward
the ground's own centre rather than being written to it, so a jump to the next bar slides and a jump
across the file sweeps — the distance travelled is the distance jumped, which is what
`DRIFT_CENTRE_REACH` already measures the ground in, so there is no second number anywhere.

**The ease has to finish inside the jump it is about.** A yard set to jump every quarter second and
eased over a second is a picture permanently chasing a ground two jumps back, which is a smear and
not a move. So the ease's own time is a fraction of `playerRowPeriod` — the landing length the
module already resolves and bands — and never a constant: a yard jumping often moves abruptly
because there is no room for anything else, and a yard jumping rarely glides. That is the rule a hand
sees, and it is derived rather than dialled.

**And it may not cost a bake.** `stepped(row.centre, DRIFT_CENTRE_REACH)` is what `TILE_CACHE` is
keyed on, and a picture-sized bake per stop is the one thing that must never reach a frame (0142,
P168). An eased centre walks exactly the ladder `stepped` already quantises to, the way P168's
drifting centre does, so a glide visits cache entries rather than baking new ones and the number of
stops is what it was. Written against the raw centre this step is a bake a frame, so that is what
the proof holds.

Proof: the ease's own time falling out of the period, at a fast jump and a slow one, in
`src/lib/playerDrift.test.ts`; a centre travelling toward a moved ground across frames rather than
arriving at it, and no allocation per frame, in `src/ui/moireRowsField.test.ts`; and the
load-bearing one, a ground move eased across a full travel visiting a bounded set of `TILE_CACHE`
keys, in `src/ui/moireCanvas.test.ts`. One reading by eye rather than a scenario:
`./scripts/drive --shot` across a jump, judged from the `{"shot":…}` swing.

**P175 — The tree is read whole once, by territory, and what it finds is collapsed.** The durable
shape is none, and that is a bar rather than an observation: a collapse that moves a session shape is
not a collapse, and the moment one of these findings needs a shape it stops being this step's and
becomes an entry below it.

Every step so far has been reviewed as a diff, by the four lenses in
[subagent-prompt.md](subagent-prompt.md), and a diff is small enough that one agent reads it whole.
Nothing has read the 85,255 lines of `src/` across 388 files as one thing. **A fact declared twice in
one step's diff is caught; a fact declared twice across two steps a month apart is not**, and that is
the class of finding this step exists for — principle 1 and principle 3, checked at tree scale rather
than at change scale, and then repaired.

**The fan-out is by territory, not by lens, and that is a departure said out loud.** The standing
clause divides review agents by lens because bugs live at the seams of one diff. A tree is not a
diff: no agent can hold `src/` and answer four questions about it. So five territories, sized by
lines rather than by directory — `src/lib` (107 files, 19.3k), `src/audio` (47, 12.6k), `src/ui`
twice (180 files, 38.5k, split so neither half is double `lib`), and `src/app` with `src/state` and
`src/workers` (53, 14.7k) — and every agent runs the same three lenses over its own files:

- **One source of truth.** A constant, type, config value or copy string declared twice, or a
  derivation written twice. The finding names both sites as `file:line` **and** says which one is
  the source, because a finding that only says "these are the same" hands the decision back.
  Principle 3 holds and is the whole discipline here: the second occurrence is not a finding.
- **Coverage.** A behaviour nobody asserts, named as the behaviour and the test file it belongs
  beside — never as a percentage. No coverage instrument is wired into this repo and one is a new
  dependency (principle 7), so this step does not add `@vitest/coverage-v8`; whether the next one
  should is a written answer it hands back, with what the number would decide.
- **Cost.** A read or an allocation on a path that runs per frame, and dead code — an export
  nothing imports, a parameter nothing passes. **A cost lens may not quote a timing**: that is P176,
  which owns the clocks, and an agent that measures while four others are reading measures them.

Each agent is Sonnet with fast thinking, which is what a hundred small anchored judgements want —
every finding is a `grep` and a file open, not an argument. **An agent finds and never merges**, and
that is the standing clause meaning exactly what it says here: five agents collapsing duplicates at
once, into a tree where the whole point is that two files hold one fact, is the single thing this
shape can get wrong. So the reports come back, and the orchestrator does every write.

**A landing is one collapse, gated.** `./scripts/fix` then `./scripts/check` after each, never once
at the end over forty of them — P85's twenty-two collapses were gated twenty-two times and two of
them needed the run to say so, and a red gate over a pile is a bisect nobody budgeted for. The three
lenses land differently and the difference is the work:

- A **duplicate** collapses to one declaration and an import, and the removed site's behaviour is
  proved by the suite that already covered it. Where nothing covered it, the test comes first: this
  step may not delete a line no test was reading.
- A **missing test** is written where the lens said it belongs, and is watched failing by breaking
  the behaviour it covers and reverting — the standing clause's rule, adapted, because a test for
  behaviour that already works cannot fail without the change and can very easily assert nothing.
- A **cost** is fixed only where the fix is local and the behaviour is identical; anything else is
  P176's, which owns the measurement that would say whether it worked.

What does not land is written down rather than dropped: a finding needing a durable shape, a
decision, or a behaviour change is a §1 entry below this step or a §4 paragraph, with its sites named
either way. **A review that lands no entry and no collapse is a valid result** and is written down as
one: the report saying so is the record that the tree was read.

Proof: every collapse carries the test that reads the surviving declaration, and every coverage
finding carries the test it was; the suite grows by a counted delta and `./scripts/check` is green at
each landing rather than at the end. The load-bearing one is negative and belongs in `scripts/arch`
wherever a lens found the same shape three times — a rule that fails the gate on the duplicate coming
back, since a collapse nothing enforces is a collapse with a re-entry date (0044).

**P176 — What the instrument costs is measured against its own history, and then it is paid down.**
The durable shape is none, and nothing here may become a gate assertion
([0050](decisions/0050-the-gate-counts-things-and-the-profiler-measures-them.md)).

The instruments already exist and this step builds none: `./scripts/profile --compare` against
`.profile-history.jsonl`, which is what turns a number into a regression
([0051](decisions/0051-the-profiler-remembers-its-own-runs.md)); `./scripts/bench` for the pure
kernels in `src/lib`, which is the tool §4's WASM rule is measured with (0058); and the gate's own
mean by the interleaved method in §3. What has never happened is one pass that runs all three, and
the run of picture steps behind it — a layer per tier (P161), a row per effect an automator holds
(P169), a field eased across a ground move (P174) — is exactly the kind of work whose cost
accumulates a frame at a time and is never attributed.

Three questions, in this order, because each is cheaper than the next:

1. **Does anything allocate in a frame?** The per-frame boundary is a written invariant
   ([boundaries.md](boundaries.md), 0212) and `moireRowsField.test.ts` already asserts it for one
   field. `--heap` over `--cycles` says whether the rack's own churn leaves anything behind, and
   `scripts/smoke.d/leaks.js` and `longTasks.js` are the two booleans that already ride in the gate.
2. **What does the paint cost now?** `TILE_CACHE` is keyed on `stepped(row.centre,
DRIFT_CENTRE_REACH)` and a bake per stop is the one thing that must never reach a frame
   (0142, P168, P174). The number wanted is stops per second under a busy rack, against the median.
3. **Where has the gate gone?** 0012 is 250ms a feature and §3 measured 7425ms of a 7471ms mean
   inside `drive` at `88173b2`. Whether the slack §3 describes is still there is a fact about
   fourteen interleaved runs, not about one.

**A number is attributed before it is fixed, and one fix at a time.** A regression with no named
cause buys a guess and a second measurement that cannot say whether the guess worked; a pile of three
fixes measured once buys a single number three changes are competing to explain. So each: attribute,
fix, remeasure against the median and band, keep or revert on that number. A cost that is real,
attributed and decided against fixing is `--accept WHY` — said once in the history, rather than
re-proved for the ten runs the band takes to forget it — and a §4 paragraph beside it.

**This step owns a wall clock, so it runs alone**, which is the standing clause's own rule and the
reason it is a second step rather than a sixth territory of P175. At most one subagent at a time and
never during a measurement: a Sonnet reading pass may look for allocation shapes while nothing is
being timed, and every run of `profile`, `bench` and `check` is the orchestrator's own, as is every
fix — a fix landed by an agent that cannot measure it is a change nobody has priced.

Proof: each fix carries the test that holds its behaviour still — an allocation-free assertion in the
suite that owns the frame, a bounded `TILE_CACHE` key count for the paint — because a speed-up the
gate cannot tell from a regression in output is not a speed-up. The numbers themselves are the other
half, each quoted with the median and band it is read against and the window it was measured in, and
never a mean compared across windows (§3). A fix whose remeasurement lands inside the band is
reverted, not kept and hoped for.

### What a step costs

- A new browser scenario lands on the gate one for one (§3). Assert in a scenario that already
  exists wherever one will hold it.
- Nothing gets a migration while pre-release
  ([0026](decisions/0026-pre-release-has-no-migrations.md)).
- A new jumps knob costs four things: a bound, a fineness and a curve in `src/lib/playerKnobs.ts`;
  a caption and a sentence in `src/lib/copyKnobs.ts`, which `src/ui/tooltips.test.ts` totals
  against `PLAYER_KNOBS` so a missing one fails the gate; and a written answer to whether any
  character region names it, in `src/lib/playerCharacter.ts`. A knob no region names stands where
  the switch left it. That is a good answer, and it has to be a written one
  ([0152](decisions/0152-a-character-is-a-region-of-the-spec.md)).
- A new fold of the mulcher card costs three things and none of them is a state hook in the card:
  the pair lives in `src/ui/Deck.tsx` beside `fineFold`, `groundFold` and `arrangeFold`, because a
  fold held by the card is forgotten every time the card's own fold closes (0157); a prop and its
  paragraph on `PlayerCard`, drawn by `cardFold` there rather than as a fourth copy of one toggle;
  and a field in `CardView` in `src/ui/playerCardDouble.ts`, which is where both card suites get
  the card's props from, with the case for it in `src/ui/PlayerCardFolds.test.tsx`. Whether it
  keeps its bordered box is a written answer, not a default: a lone box under its own eyebrow is a
  frame around the only thing there (0173's argument run the other way, 0200, 0217).
- One file sits at the 800-line hard cap: `src/lib/player.test.ts` at 798 — the kept ground's own
  validator cases went to `src/lib/playerBed.test.ts` beside `bedsOf` rather than in there (0194).
  Make room before landing at a cap, not after: the drop family moved out to
  `src/lib/playerDrop.ts` to make the room 0194 needed, and P142's eighth name pool took
  `EFFECT_NAMES` and `effectName` out of `src/lib/copy.ts` to `src/lib/copyNames.ts` — the way
  `copyParams.ts` and `copyKnobs.ts` each took one — rather than shaving the pools, since 0081's
  odds are the twelves multiplied. `copy.ts` stands at 678 with room for the next entry's pool.
- A tier above the song costs no command and no road — `deck.player` already carries the whole
  spec, so P147's album was a shape, a validator and a section, not a fourth command — and that
  cheapness is exactly why it was built and why P170 takes it out again. **What a tier has to earn
  is a fact of its own**, not a place in the nesting; the next one that cannot name one is not a
  tier. What the album actually cost was room, which is what comes back: its shape and validator in
  `src/lib/playerAlbum.ts` beside `src/lib/playerSong.ts`, its words in `src/lib/copyAlbum.ts` the
  way `copyStrip.ts` did (0045), and its two walk cases in `src/lib/playerWalkAlbum.test.ts`
  because `src/lib/playerWalk.test.ts` was within four lines of the hard cap.
- A new automator parameter costs three things beyond the behaviour: the declaration in that
  file's own `params`, a tooltip in `src/lib/copyParams.ts` which `src/ui/tooltips.test.ts` totals,
  and a `driftFrom` mapping or a written `because` in `driftUnreached`
  ([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)). Its label has to
  be one no sibling wears: the run's size already wears _Least_, _Most_ and _Odds_, so P148's was
  _Wait_. The table itself now lives in `src/audio/effects/automatorParams.ts` — P148 split it out
  of `automator.ts` at 793 of the 800-line cap rather than shaving it, and the declaration, the
  bounds it is said in and the `driftUnreached` reasons went together, because those are the three
  a new parameter adds.
- A new row in the drift costs a place in one of two sets, and which one is the question to answer
  first: the session's, built with no run at all and where the estimate beside the picture is read,
  or the frame's, which is that set with a row per effect the read says an automator is holding
  ([0212](decisions/0212-the-picture-draws-the-run-a-read-is-holding.md)). A row that rests on a
  per-frame read belongs to the second and rebuilds when the population turns over, never through
  React state. The module's three tier rows are measured in `src/ui/moireRowsSong.test.ts`, which
  `src/ui/moireRows.test.ts` reached the hard cap and split into (0045), and the two rows that
  belong to the whole field — the loop's own and the wash over it — in
  `src/ui/moireRowsField.test.ts`, which P161 split out of the same file to make its own room; a
  lane's, an instance's, a grown run's and the macro row's stay in `moireRows.test.ts`, at 590. A
  row added to every picture is seven counted assertions across them, which is what P146's own broad
  row cost, and `src/ui/moireRows.ts` now stands at 782 of the 800. A reading that belongs to no
  row at all is the third answer and costs neither set: it is answered by the per-frame read and spent over every row by the paint
  ([0213](decisions/0213-a-reading-of-the-output-belongs-to-the-field.md)). P167's is the fourth and
  the only one that is nobody's yard — a row for the master bus, in the run-free set of every
  picture at once, which is what a row of the whole session's is and is not the set 0212 calls "the
  session's". What it costs beyond the seven assertions is the room: the field's rows move to
  `src/ui/moireRowsField.ts` beside the test that has carried that name since P161.
- An audit step costs agents rather than lines, and the ceiling is the standing clause's six with a
  reason to be under it: P175 is five territories because five is where the line counts split evenly,
  and P176 is one at a time because it owns a clock (subagent-prompt.md). A finding agent gets
  Sonnet with fast thinking — the work is a hundred anchored `grep`s, not one argument — and the
  orchestrator, which reads the reports and does every write, is the model that lands them. An agent
  per file and a lens per agent over a whole tree are the two ways this shape gets expensive for
  nothing. The gate is what makes the landing cost real: one collapse, one `./scripts/fix` and
  `./scripts/check`, so an audit that finds forty things is forty gate runs and is scoped as such.
- Transport test cases go in `src/audio/playerLanding.test.ts`, since `createDeckVoice` may only be
  stood up in a test file
  ([0045](decisions/0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md), `scripts/arch`).
- Room in `src/lib/player.ts` is made by moving one family out to a file beside what reads it, the
  way `playerRest.ts`, `playerReverse.ts`, `playerSlots.ts`, `playerSpark.ts`, `playerClock.ts`,
  `playerRungs.ts`, `playerRepeats.ts` and `playerCharacter.ts` each took one. The file keeps the
  spec and the one validator.
- A new effect entry costs eight registrations beyond its own plugin file, each forced by a
  load-time throw, a compile error or a test rather than by review: a profile in `DRIFT_PROFILES`
  **and** its wave in `PROFILE_WAVES`, which is total, so a profile without a wave will not compile
  and all nine non-reserved profiles are already claimed
  ([0137](decisions/0137-an-effect-declares-the-wave-it-draws-with.md)); a `driftFrom` mapping per
  parameter or a written `because` in `driftUnreached`
  ([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)); a presence
  parameter that declares a lane ([0202](decisions/0202-an-effect-declares-how-present-it-is.md));
  an icon no other entry wears
  ([0056](decisions/0056-an-effect-carries-its-own-icon.md)); a pool parameter, weight,
  `driftUnreached` line and binding in `src/audio/effects/automator.ts` if it is growable; a tooltip
  per parameter in `src/lib/copyParams.ts`; twelve adjectives and twelve nouns in `EFFECT_NAMES`,
  now in `src/lib/copyNames.ts`, the nouns disjoint from every other pool
  ([0081](decisions/0081-an-effect-name-is-two-pools-multiplied.md)); and the entry's label in the
  list `scripts/smoke.d/picker.js` asserts the popover against, which is the one place the browser
  is told what the registry holds. Nothing in `chain.ts` or in any component changes — a new plugin
  appears in the picker by existing.
- A worklet costs two more: the processor in `src/audio/worklets/`, which imports nothing and
  duplicates its constants by hand, and its `?url` import and registered name in
  `src/audio/worklet.ts`, where each side names the other in a comment. And it costs one thing no
  native plugin does: the rack sits before the deck's own `StereoPanner`, whose law is -3dB on a
  mono input and unity on a stereo one, so a node built with `outputChannelCount: [2]` takes that
  law off the signal and is three decibels louder than the session without it. A worklet effect
  therefore takes the channel count that arrives (`channelCountMode: "max"`, no
  `outputChannelCount`) unless it genuinely needs two — the tape does force two, and its own smoke
  never compares it against a dry control, which is why nothing has said so before (P142).

## 2. Rules for every feature

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL call
  `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`. Command shapes do not grow independent time fields.
- Parameter facts derive from the parameter and effect registries. A new parameter is declared once
  and bound once, and a value lookup is (instance, param)
  ([0030](decisions/0030-effects-are-instances.md)).
- Raw files, audio nodes, functions, and browser permission objects never enter commands or the
  durable session.
- `buildDeckChain(BaseAudioContext)` remains the one production signal path for live, headless,
  offline, fingerprint, and export hosts.
- Durable edits participate in bounded history, persistence, portable archives, and graph restore
  unless a decision proves why they do not.
- Per-frame playheads, meters, cursors, and gesture drafts use refs and the existing frame loop,
  never React state or another RAF loop.
- Async work carries source or operation identity, so a stale completion cannot overwrite newer
  state.
- Analysis is not a pure function of stored bytes: `decodeAudioData` may resample to the device's
  rate, so onsets differ across machines. Nothing durable may rest on derived analysis.
- A view preference, such as snap, theme, or whether the debug console is open, is not session
  state: no command, nothing durable, no history entry.
- Durable shape changes freely while pre-release. Stored data that no longer validates is
  discarded, never migrated ([0026](decisions/0026-pre-release-has-no-migrations.md)).
- No new dependency is added without approval and a statement of what it replaces.

## 3. Proof and delivery

`./scripts/check` is the full gate. It may get slower as the instrument gets bigger, but no single
feature may move its mean by more than 250ms without asking the human first
([0012](decisions/0012-no-one-feature-jumps-the-gate.md)). Each feature adds the cheapest proof at
the layer that owns the behavior:

- pure normalization, analysis, and DSP assertions in colocated Vitest tests;
- command, event, history, and failure atomicity through `createInstrument` and its manual clock;
- graph scheduling and sound through the existing live and offline browser run;
- UI focus, pointer, and file handling in the existing preview smoke;
- export parity by comparing every encoded sample with the shared graph buffer.

One fact has one emitter. `probe()` reports durable and session state, the event log reports
discrete behavior, and `peek()` and `peaks()` stay allocation-free continuous and sample-derived
reads. A UI ring drop is loud. A sequence gap in `./scripts/drive` is always a bug.

**The gate's headroom is not where it looks, and 0012's line applies to about one step.**
`./scripts/check` runs eleven steps concurrently and its wall clock is one of them. Measured over 35
runs at `88173b2`, `drive` costs 7425ms of a 7471ms mean, and the second-slowest step, `test`,
finishes 4747ms earlier. Everything that is not a browser scenario therefore has about 4.7s of slack
before it moves the gate at all, so a feature may add two seconds of Vitest and cost nothing. A
browser scenario's cost lands on the mean one for one. Inside `drive` the chain is `vite build`
(465ms, serial) then the 41 scenarios of `scripts/smoke.d/browser.js`, driven in order on one page
(5967ms). The six parallel `./scripts/drive` subprocesses beside it are free, the slowest finishing
3.5s early.

Measure a change by stashing it and comparing means across several runs, **interleaved**. A single
run's spread is wider than most features cost, one lucky measurement has already produced a wrong
figure twice, and fourteen pristine runs of one unchanged commit, split into two windows fifteen
minutes apart, read 7506ms and 7920ms. That is a 414ms drift, 1.7 times 0012's own step size. Never
quote a mean measured in a different window from the one it is compared against.

The smoke was long thought to sit near a non-linear cliff, where browser work added _before_
`persistenceSmoke`'s `page.reload()` stalled the reloaded page's audio clock. It did not reproduce
at `88173b2`, at 4 times the threshold that was supposed to stall nearly always. The ordering rule
below is kept for a stall nobody can currently find, and the mechanism still needs Chromium-side
tracing.

A popover the driver clicks through is the other measured trap. Playwright waits out a popup's enter
and exit animations before it may click, which cost one scenario about 450ms after the reload and
1.68s before it. A popup whose entries `./scripts/drive` presses opens instantly
([0056](decisions/0056-an-effect-carries-its-own-icon.md)).

Offline `render()` calls are the cheap place to prove sound. They join underneath the deck fixture's
real-time waits and cost close to nothing. New browser work that cannot be a render belongs after
the reload, or on its own page, not on the pre-reload critical path.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and a
failing seam-level test before broad UI work. Do not turn the driver into a second application by
teaching it feature semantics.

A step run by a subagent gets the standing clauses in
[subagent-prompt.md](subagent-prompt.md): report to a path, watch the test fail, print no new
warnings, waive at the site, four review lenses, interleave base and head. Each is there because a
run paid for its absence, and the cost is named beside it. Paste them. A paraphrase drops the
sentence that made the clause work.

## 4. Not taken

What a step needed and did not get. An entry here is a step that was abandoned, narrowed, or landed
with a known cost, written as one paragraph: what was attempted, what blocked it, and what is true
now. A regression the profiler found and nobody fixed is recorded here too, with its suspected
cause. This section is a record, not a queue — nothing here is scheduled by being here, and a step
that comes back comes back through §1.

**P144 landed with a known cost: its own rule was not literally met.** The step's bar was written as
byte-equality — "the alpha byte is identical for every pixel of every geometry and every profile" —
and stated that both rewrites had been measured at zero differing bytes over a full 5.7Mpx tile.
They have not. Over 3024×1890 at all ten profiles, 86 alpha bytes of 5,715,360 differ by one step,
every one of them `swarm` at the contour where its block passes exactly `0.5`, which is `127.5` of
255, and none further than 1.6e-11 from that boundary. Neither rewrite is bit-exact, so a bar that
admits no difference at all admits neither of them and the 23% is not available.

What shipped instead is a stricter bar in the dimension that matters and an honest one in the
dimension that does not: the harness asserts the two spellings part by less than 1e-9 of an alpha
step **before** the round, and asserts byte-equality with a single exemption for a value within that
same slack of a rounding tie. A bar on the byte alone is the weaker of the two — a rewrite whose
error is too small to cross a boundary passes it while moving thousands of pixels at another tile
size — so the substitution is not a relaxation, but it is not what the step said, and the eighty-six
pixels are a real difference in a picture somebody could draw.
[0211](decisions/0211-the-pictures-kernel-is-gated-on-byte-equality.md) has the measurement.
