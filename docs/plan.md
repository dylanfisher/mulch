# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The baseline is an any-number-of-decks instrument — decks the interface calls yards — with a
durable session, portable archives, bounded undo/redo, and a menubar shell over a scrolled
instrument. A yard holds a source (imported in any format the browser decodes, or drawn from the
generator list, both behind the one source control in its header), a beat-aware loop with its own
handles, a rack of effect instances, a jump module, and a moiré drift picture of everything
automating it — over a reference row cut by the clip's own analysis, and breathing with what its
meters read — which opens large in a browser window of its own. Every continuous parameter but the
read rate carries a gesture-relative lane. Audio leaves through one render harness — through the
File dialog as a folder holding the .wav and the session that made it, or as a crop or a flatten —
and a ⌘/Ctrl+K palette is a second way to send the same commands the screen sends.

What each of those is, and why it is that way, is one decision each in
[`docs/decisions`](decisions/), indexed by the step that landed it under §1's What ran. This
document contains only the path forward.

The product outcome guiding the next sequence is:

> A person can shape local samples into a beat-aware performance, recall its sounds and gestures
> exactly, and control it from either the screen or hardware without changing the instrument's
> underlying command model.

---

## 1. Ordered next work

Complete one step, including its full gate, before starting the next. Each step should deliver a
usable vertical slice rather than infrastructure for an unspecified future feature.

### What ran

One line per step, newest last. The reasoning is in the linked decision, not here.

- **P18, P19** — what a deck accepts as audio, and how it gets there.
- **P20** — the crop, the first edit that writes audio nobody imported ([0047](decisions/0047-a-crop-mints-audio-the-user-did-not-import.md)).
- **P21** — the parameters that should have been automatable all along.
- **P22** — a seek that no longer flickers. **P23** — a loop with handles.
- **P24** — the shell the rack redesign hangs off. **P25** — the primitive pass beside it: a state is a toggle and an action has one icon ([0055](decisions/0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)).
- **P26** — the rack itself. **P28** — the renaming, cheapest once those surfaces settled.
- **P27** — every WASM candidate measured, nothing moved ([0058](decisions/0058-nothing-qualified-for-wasm.md)).
- **P29** — the File/View header, and Titlecase everywhere ([0059](decisions/0059-every-label-is-titlecase.md)).
- **P30** — `#/log` deleted, the ring out through File as JSONL ([0060](decisions/0060-the-ring-is-the-whole-exported-log.md)).
- **P31** — a stereo peak meter on the master bus's pre-ceiling tap ([0061](decisions/0061-the-master-meter-taps-the-bus-input.md)).
- **P32** — the yard layout: clip rack over the yard list, transport and knobs above the peaks, a fold that is a view preference (§2).
- **P33** — a yard's emoji and drawn name, carried by `deck.add` ([0057](decisions/0057-a-deck-is-called-a-yard.md)).
- **P34** — one card per rack row, dragged by its own handle or the arrow keys, no dnd-kit ([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md)).
- **P35** — the debug counters P42 measures by, dashed where the browser will not answer ([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)).
- **P36** — the per-frame paint: two attributes a frame for a knob following a lane.
- **P37** — the four automation defects: one source of truth for Option, a live move joined over its own cadence ([0065](decisions/0065-a-live-move-is-joined-over-its-own-cadence.md)), every parameter declaring its precision ([0064](decisions/0064-a-parameter-declares-the-precision-it-reads-at.md)).
- **P38** — the loop's two surfaces agreeing, and Shift meaning the loop ([0066](decisions/0066-shift-is-the-loop.md), since superseded).
- **P39** — undo takes back a gesture, not a value ([0067](decisions/0067-a-gesture-is-one-history-entry.md)).
- **P40** — audio leaves through one door: an export is a render spec ([0068](decisions/0068-an-export-is-a-render-spec.md)).
- **P41** — the palette is a second way to send and never a second command ([0069](decisions/0069-the-palette-is-a-second-way-to-send.md)).
- **P42** — the five per-frame claims measured one at a time, the two that failed fixed ([0070](decisions/0070-a-per-frame-read-refills-and-never-clears.md)).
- **P43** — an export past the arming horizon: the offline pump arms the lanes the wall-clock tick cannot ([0071](decisions/0071-the-offline-pump-arms-the-lanes.md)).
- **P44** — the ride that recorded nothing, and the import of nothing that half-landed ([0072](decisions/0072-a-drag-ends-once-and-a-decode-of-nothing-is-refused.md)).
- **P45** — the palette remembers by order rather than a pinned highlight ([0073](decisions/0073-the-palette-remembers-by-order.md)).
- **P46** — one width and one fixed header, read by both screens ([0074](decisions/0074-both-screens-read-the-one-shell-width.md)).
- **P47** — every kind of thing draws its name from its own pool ([0075](decisions/0075-every-kind-of-thing-draws-from-its-own-pool.md)).
- **P48** — the rack card reads itself out of its own id, declares its own width, and resolves a drop against the layout that makes ([0076](decisions/0076-a-card-reads-itself-out-of-its-own-id.md)).
- **P49** — an export plays the whole session for its whole length, asserted at the seam ([0077](decisions/0077-an-export-plays-the-whole-session.md)).
- **P50** — the yard's own button group, and one `deck.duplicate` whose reducer expands the restoration stage list ([0078](decisions/0078-a-yard-is-duplicated-by-one-command.md)).
- **P51** — the meter's bars run left to right, and every debug label carries the sentence saying what it counts, in `src/lib/copy.ts` with the rest of the words.
- **P52** — the clip rack reads as cards: a quarter-width card per clip, renaming reached behind a pencil.
- **P53** — a lane is stretched after it is played: one `automation.span` per drag on the preview's own dial ([0079](decisions/0079-a-lane-is-stretched-after-it-is-played.md)).
- **P54** — the moiré strip, and how long the pattern takes as one escalating unit ([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)).
- **P55** — an effect name is two pools multiplied ([0081](decisions/0081-an-effect-name-is-two-pools-multiplied.md)); a deck letter is spent when it is drawn ([0082](decisions/0082-a-deck-letter-is-spent-when-it-is-drawn.md)).
- **P56** — a signal clears itself: the toast provider's declared timeout, and a clip indicator that holds rather than latches ([0083](decisions/0083-an-indicator-clears-itself.md)).
- **P57** — two controls that read the way they move: the lane's span dial and the rack's switch ([0085](decisions/0085-a-control-reads-the-way-it-moves.md)).
- **P58** — the export door: minutes and seconds over one number, and a render that hands its samples back ([0086](decisions/0086-a-render-hands-its-samples-back.md)).
- **P59** — the drift's rows became continuous waves and the estimate went logarithmic ([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)).
- **P60** — compressor and convolution reverb, over an impulse the app generates and rebuilds on change ([0087](decisions/0087-an-impulse-is-generated-and-rebuilt-on-change.md)).
- **P62** — the player: a jump moves where a deck reads from, so it is the transport's and not a rack plugin — a pure function of a durable seed, every seam an equal-power fade ([0089](decisions/0089-a-jump-is-the-transports.md)).
- **P63** — three defects: a decode failure that names its blob and its bytes, a loop move that keeps its playhead ([0091](decisions/0091-a-loop-move-keeps-the-playhead-that-survives-it.md)), and a rebuild declared and paid at the gesture end ([0090](decisions/0090-a-rebuild-is-declared-and-paid-at-the-gesture-end.md)).
- **P64** — the rack as one row: two line boxes per caption ([0093](decisions/0093-a-knob-caption-reserves-two-line-boxes.md)), an effect that copies itself with one command ([0092](decisions/0092-an-effect-copies-itself-with-one-command.md)).
- **P65** — one tooltip on everything that does something, keyed by the lists the controls already come from ([0094](decisions/0094-a-tooltip-annotates-a-control-and-never-becomes-one.md)).
- **P66** — one transport over all the yards, expanded into the ordinary per-deck commands ([0095](decisions/0095-a-global-transport-press-is-the-per-deck-commands.md)).
- **P67** — the player's own clock, and a moved number that re-derives the tail from the seed ([0096](decisions/0096-a-moved-number-re-derives-the-tail.md)).
- **P68** — yards jump on one session clock, counted from the context's own zero ([0097](decisions/0097-yards-jump-on-one-session-clock.md)).
- **P69** — the moiré is interference at every height: every row drawn against its own band ([0098](decisions/0098-a-row-is-drawn-against-its-own-band.md)).
- **P70** — one generator menu, and a tone that draws its own wave live ([0100](decisions/0100-a-tone-draws-itself.md)).
- **P71** — the tape draws its reels, out of numbers the interface already had ([0101](decisions/0101-a-tape-draws-its-reels.md)).
- **P72** — three defects: a claimed key leaves the dispatch ([0105](decisions/0105-a-claimed-key-leaves-the-dispatch.md)), the loop overlay has one writer ([0103](decisions/0103-the-loop-overlay-has-one-writer.md)), a join is the gap however short ([0104](decisions/0104-a-join-is-the-gap-however-short.md)).
- **P73** — a fold is its own heading ([0106](decisions/0106-a-fold-is-its-own-heading.md)), and the tape's picture moved into the room its knobs leave.
- **P74** — the player became a card in the rack's own language, and got a noun: Jumps ([0107](decisions/0107-a-module-is-a-card-and-a-fold-never-silences-it.md)).
- **P75** — the only wait between two jumps is the clock, and the burst floor is a musical range ([0108](decisions/0108-the-only-wait-between-two-jumps-is-the-clock.md)).
- **P76** — the drift is one picture at two sizes ([0109](decisions/0109-the-drift-is-one-picture-at-two-sizes.md)).
- **P77** — a tone is read at the rate its own parameter sets, so a move bends the wave rather than reloading it ([0110](decisions/0110-a-tone-is-read-at-the-rate-its-own-parameter-sets.md)).
- **P78** — a yard lands on an index and a copy lands under its original ([0111](decisions/0111-a-yard-lands-on-an-index-and-a-copy-lands-under-its-original.md)).
- **P79** — a flatten is a spec the one render harness already accepts ([0112](decisions/0112-a-flatten-is-a-spec-the-one-harness-already-accepts.md)).
- **P80** — one header, one height, declared where the bar is, so the title line stops moving.
- **P81** — a capture lost is a gesture over ([0114](decisions/0114-a-capture-lost-is-a-gesture-over.md)), and a press outside a loop asks for the top of it ([0041](decisions/0041-a-seek-is-transport-not-durable.md) amended).
- **P82** — the jumps module drawn the way the rack is, Drift renamed Hold in the durable spec, and a burst that can reach its floor ([0115](decisions/0115-the-burst-floor-is-the-seam-and-moves-with-it.md)).
- **P83** — what the instrument costs, on six instruments rather than by reading it: four cheap things taken, five per-sample kernels priced ([0116](decisions/0116-a-per-sample-kernel-is-priced.md)), everything else attributed and written into §4.
- **P84** — what is proven, read per file: proof lives at the layer that owns it ([0117](decisions/0117-proof-lives-at-the-layer-that-owns-it.md)) — seventeen files of new proof, 41 of 41 browser scenarios asserting, 1009 tests against 967, and the gate's mean inside its own spread ([0012](decisions/0012-no-one-feature-jumps-the-gate.md)).
- **P85** — what is said twice, read per tier: 22 collapses, and two rules that were prose in five files are a throw at load ([0122](decisions/0122-a-registry-answers-for-itself-at-load.md)). Three had already drifted.
- **P86** — a loop opens on the whole clip, and a release is a position rather than only an ending ([0123](decisions/0123-a-release-is-a-position.md)): the last frame of a drag reaches the page in the `pointerup` and nowhere else.
- **P87** — the jumps card finished: a bypass keeps the read position it was on ([0091](decisions/0091-a-loop-move-keeps-the-playhead-that-survives-it.md) extended), the card is one of the rack's with its switch in the corner every card's is in ([0107](decisions/0107-a-module-is-a-card-and-a-fold-never-silences-it.md) amended), and a drawn number carries the amounts that shape its draw ([0124](decisions/0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)).
- **P88** — a recording is the whole press: the lane runs press to release and holds its value across the stretches the hand did not move in ([0125](decisions/0125-a-recording-is-the-whole-press.md)).
- **P89** — a reel is a reel at every value: the tape's wound radius maps onto a floor rather than onto its hub, and the picture is as large as the room beside the knobs ([0101](decisions/0101-a-tape-draws-its-reels.md) extended).
- **P90** — the drift is a screen someone filmed: the screen's own gap, its scan line and one rolling band, in one tile the rows are inked through, riding the picture's own phase and never a clock of their own ([0126](decisions/0126-the-screen-rides-the-pictures-own-phase.md)).
- **P92** — that screen is a lattice of blobs: the beat two grids a pixel apart make, drawn a pixel at a time on the rebuild because neither a rotated pattern nor two gratings multiplied will draw it ([0129](decisions/0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md)), the monitor's three channels across every cell as the row's own ink ([0130](decisions/0130-the-fringe-is-the-rows-own-ink-split.md)), and four motions besides the roll, each owned by the parameter whose fold claims it ([0128](decisions/0128-every-motion-in-the-screen-belongs-to-a-parameter.md)).
- **P91** — an export is a folder, and the folder is one archive ([0127](decisions/0127-an-export-is-a-folder.md)): one gesture writes the audio and the session that made it, named off one function, and an imported file's own name rides on the id its bytes are stored under.
- **P93** — a row is a grating and the picture is their product: every lane, instance and loop is one grating across the whole canvas — angle from its fold, pitch from its period, phase from where the deck has read to — and the field is one minus what they block, so a yard's items are read off each other rather than drawn beside each other ([0131](decisions/0131-a-row-is-a-grating-and-the-picture-is-their-product.md)).
- **P94** — a copy is copied whole: an `effect.duplicate` carries the lanes ridden onto the instance it copies, in the restoration order the same expansion already runs in ([0092](decisions/0092-an-effect-copies-itself-with-one-command.md) amended).
- **P95** — two doors a file comes through: an accepted name is a container and not a promise, so `.m4a` stays and the import waits for the decode that refuses it ([0132](decisions/0132-an-accepted-name-is-a-container-and-the-import-waits-for-the-decode.md)); and a take is named after what it was made of and when ([0133](decisions/0133-a-take-is-named-after-what-it-was-made-of-and-when.md)).
- **P96** — a pattern plays the repeats it was set: the count was a ceiling on a draw no knob could turn off, so a pattern with every amount of variation at zero is arithmetic again ([0134](decisions/0134-a-pattern-plays-the-repeats-it-was-set.md)).
- **P97** — the repeats dial gets its own door, and a vary is said in the unit it varies: a chance, a spread and a keep behind the count's own framed plus, a vary in seconds of burst rather than a fraction of it, and the jumps amounts staying spec fields with no lanes, in writing ([0135](decisions/0135-the-repeats-dial-gets-its-own-door.md), [0124](decisions/0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md) amended).
- **P98** — every yard reads from its top: the generator menu absorbed the file field and moved into the header as the one Source control, wearing the name the bytes are stored under; the jumps heading and its seed left the card while its switch stayed in the corner; an empty clip rack draws nothing ([0136](decisions/0136-a-yard-reads-from-its-top.md), [0107](decisions/0107-a-module-is-a-card-and-a-fold-never-silences-it.md) amended).
- **P99** — the drift says which effect is doing it: an effect declares the wave its rows are cut to beside its icon, and the registry throws at load for two entries claiming one; and the screen's three channels part across a blob rather than across a subpixel, so a picture inked in one token stops reading as one hue ([0137](decisions/0137-an-effect-declares-the-wave-it-draws-with.md)).
- **P100** — the drift opens in a window of its own, driven by the instrument that opened it: one `window.open` per yard, one React root rendered into its body, and the three things a canvas asks — its density, its scheme, its observer — asked of the document it is actually in ([0138](decisions/0138-the-drift-opens-a-window-the-instrument-drives.md)).
- **P101** — the drift is what a yard is playing: each registry entry declares how its own values reach the picture beside the wave it is cut to, so a delay at 30ms and the same delay at two seconds are two rows; a bypassed instance draws neither its row nor its lanes'; and the strip's click zooms in place, where its header pays for a window ([0139](decisions/0139-a-row-is-what-an-effect-is-set-to.md), [0138](decisions/0138-the-drift-opens-a-window-the-instrument-drives.md) amended).
- **P102** — colour is something an effect turns: three dimensions that are colour rather than shape — how far the three channel lattices stand apart, whether they are one lattice at all, and where between a cool ink and a hot one the picture is drawn — each read off the row that says it loudest, over a second ink per scheme ([0141](decisions/0141-colour-is-something-an-effect-turns.md)).
- **P103** — a row is cut on a coordinate of its own: an entry declares the axis its rows run down beside the wave they are cut to, and three dimensions say where and how that axis lies — where a row is anchored, how hard its spacing is swept across the picture, and how far the finished field is bent back through a lens; a ring family is cut on the logarithm of its radius, so a picture-sized tile is written on a rebuild and moved by a matrix on every frame after it ([0142](decisions/0142-a-row-is-cut-on-a-coordinate-of-its-own.md)).
- **P104** — a row is drawn at more than one scale: a profile built out of octaves of itself, a row drawn N times an octave apart at what the regen is set to, the frame before this one laid back in under a hard ceiling and once per turn of the row that asked for it, and a grating on the whole yard's own recurrence wherever the picture is wide enough to show it coming round ([0143](decisions/0143-a-row-is-drawn-at-more-than-one-scale.md)).
- **P105** — the picture is of this sample, and it breathes with what is heard: the reference row is cut by the clip's own envelope and onset density out of a wave no effect may claim ([0145](decisions/0145-a-picture-may-rest-on-analysis.md)), the compressor's meter ducks the depth of its own row and nothing else ([0128](decisions/0128-every-motion-in-the-screen-belongs-to-a-parameter.md) amended), and a row's own gesture surges its phase where it used to crowd its pitch ([0146](decisions/0146-a-rows-own-gesture-moves-its-phase.md)).
- **P109** — the loop lands where the hand let go: the peaks' modifier is gone and a gesture there is one gesture decided on the release — it swept a loop, or it is the seek its press asked for — the press commits nothing, no gesture is answered with silence, and snapping starts off, so nothing pulls an edge onto a candidate the page never drew ([0147](decisions/0147-the-loop-lands-where-the-hand-let-go.md), superseding [0066](decisions/0066-shift-is-the-loop.md)).
- **P106** — every effect and every parameter is in the picture, or is written down as not: the eight values that reached it through nothing now claim a dimension whose meaning they match, `comp.output` is declared unreached with the reason, and an entry silent about one of its own throws at load ([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)).
- **P108** — a name is drawn out of more words: a pool is sized by the draw a repeat is expected at rather than by how many readings it holds, so a yard draws from 24 × 24 and an effect from 12 × 12 per kind, the emoji pool widens with them, and a draw still reads nothing but its own pools ([0149](decisions/0149-a-pool-is-sized-by-when-a-repeat-is-expected.md)).

- **P110** — the jumps walk got a memory, and it remembers only where: a run of slots laid down, played back for as many passes as its keep asks, one slot of it moved on a chance, and let go either onto a new branch or back to the run the pass started from — so the four-passes-slow-then-eight-fast shape is a hold that does not divide the figure rather than a second set of dials ([0151](decisions/0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md)).

- **P111** — the jumps card can be arranged as a song: a part names a character and how far into it to go, lasts as many jumps as its dial says, and is either drawn again every time it comes round or is the chorus that comes back unchanged — so "a new riff every eight jumps" is one part and "a chorus with riffs between it" is three ([0153](decisions/0153-a-song-is-a-run-of-parts-the-walk-plays-back.md)). The card's dials are what every part is a distance from, the pressed character's own knobs now appear in the menu that pressed it, and the walk moved to `src/lib/playerWalk.ts` so the two could see each other without a cycle.

None of them got a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

### Scheduled, in order

An entry states what durable shape it moves before it is started — that is what makes a step
expensive and it is the first thing to state. §4 holds what is deliberately not scheduled and why,
and **nothing in it becomes work by being read** — each paragraph names the decision that would
have to be taken first. The rules a new step is written against are §2, §3 and the standing clauses
in [subagent-prompt.md](subagent-prompt.md).

Thirteen steps, in four groups. The first three are wrong behaviour in the hand — a popup that is
open only while a pointer is travelling to it, a card that lands somewhere nobody put it, and two
takes that are one filename — and none of them moves a durable shape. The next three are the jumps
module's song growing into the thing it was arranged for: what is playing said on the card that is
playing it, an arrangement that writes itself, and both of those in the picture. Of those six **P116
is the only one that moves durable shape**, and P115 moves one only if it takes the id its own
clause argues for; the rest are view, derivation and per-frame reads. P115 goes before P116 and P117
because both read the live cursor it adds; the first three go first because they are cheap and
nothing waits on them.

The last seven are the jumps module's **vocabulary** — what a landing may do, and where the next one
may be — taken out of [`ideas.md`](ideas.md#jumps) and written here with the proof that is the only
thing turning an idea there into work. All seven move `PlayerSpec` by design, which is what makes
them expensive relative to their size, and every knob any of them adds costs the same four things: a
bound, a fineness and a curve in `src/lib/playerKnobs.ts`, a caption and a sentence in
`src/lib/copy.ts` — `src/ui/tooltips.test.ts` totals both against `PLAYER_KNOBS` and a missing one
is a failure, not a hole — and an answer to whether any character's region names it
(`src/lib/playerCharacter.ts`); a knob no region names stands where the switch left it, which is a
good answer and has to be a written one
([0152](decisions/0152-a-character-is-a-region-of-the-spec.md)). They are independent of each other
and of P115–P117, so they may be taken in any order; the sequence below is cheapest first.
Pre-release none of the thirteen gets a migration
([0026](decisions/0026-pre-release-has-no-migrations.md)). Every new browser scenario here lands on
the gate one for one (§3), so each of these asserts in a scenario that already exists wherever one
will hold it — for the last seven that is `scripts/smoke.d/renderPlayer.js` and `playerRate.js`.

**P112 — A marker holds where it was pressed.** The dot in an automated knob's corner opens its lane
preview `openOnHover` and closes it the moment the pointer leaves (`src/ui/ParameterKnob.tsx`), so
the one gesture the preview exists for — dragging its time axis to stretch the lane's span after the
fact ([0079](decisions/0079-a-lane-is-stretched-after-it-is-played.md)) — is performed on a popup
that is open only while the pointer is on its way somewhere else. Make the marker a control: a press
latches it open, a second press, Escape or a press outside closes it, and hover keeps the peek it
already gives. Every automated parameter's marker behaves the same way, including the ones on the
jumps card and in the rack, because it is one component and this is one change to it. What it is
not: a second preview, a second command, or a lane editor
([0028](decisions/0028-automation-is-gesture-relative.md)) — what is inside the popover is
untouched. The one question it must answer in writing rather than in passing: the marker exists only
while Option is held, which is 0028's reveal and not this step's to reopen — if a latched popup must
survive Option coming up, that is the sentence to write, and it is written before the code. Durable
shape: none — whether a popup is open is a view preference (§2). Proof: the automation browser
scenario, which already holds Option, presses the marker, moves the pointer off it, finds the
preview still drawn, and closes it.

**P113 — A card lands where the hand put it.** Two defects in one rack, both about where an instance
ends up. (a) `effect.duplicate` appends: the copy is built by the restoration expansion —
`effect.add`, its values, its bypass, its lanes — and `effect.add` has only ever meant _at the end_
(`src/app/execute.ts`), so duplicating the first of six cards puts the copy six slots from the thing
it is a copy of. The copy belongs immediately after its original, and the road is already paved: a
yard's copy lands under the yard it came from by putting one more ordinary command in the group its
own expansion runs in
([0111](decisions/0111-a-yard-lands-on-an-index-and-a-copy-lands-under-its-original.md)), so this is
`effect.reorder` onto the original's index plus one and not an index field on `effect.add`, which
would be a second way to say where an instance goes. That a rack and a yard list agree about this is
the point: it is one behaviour said twice, and it has been right in one of them since P83. (b)
reorder resolves a drop by nearest slot _centre_ (`src/ui/listDrag.ts`), measured on the layout as
it stood at the press. That reads correctly for a column of equal cards and wrongly for a rack of
mixed widths: a half-width card dragged in front of a full-width one has to travel past that card's
midpoint — half the rack's width — before its own centre is nearest, so the drop the hand asks for
is refused and the one it did not ask for is taken. 0111 saw the neighbouring half of this — an item
shifting corner to corner onto a differently-sized neighbour's slot leaves a gap in the live picture
— and recorded it rather than taking it, on the grounds that it lasts as long as a finger is down.
The landing is the half that does not: it survives the release, as the wrong order. Diagnose it as
P109 was diagnosed — reproduce it in `./scripts/drive` as a person performs it, both directions,
both widths — then land it against the insertion point in reading order rather than against a box
centre, so what the card is measured against is the seam it would go into and not the middle of what
is already there. Durable shape: none — a duplicate is the same expansion and a reorder is the same
`effect.reorder` ([0092](decisions/0092-an-effect-copies-itself-with-one-command.md),
[0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md)). Proof: an `effects.test.ts`
case that the duplicate of index 0 in a rack of three is at index 1 with the original at 0, failing
today; a `listDrag` case over mixed widths; and the rack row scenario asserting the landed order.
P115 hangs a third list off this gesture, which is the second reason it goes first.

**P114 — A take's name is fields, and a field is one word.** The offered export name is `2026-08-24
1911 Old Thicket birds` — space-joined, and spaces, commas, apostrophes, parentheses and `&` all
survive into a filename (`UNWRITABLE`, `src/app/exportAudio.ts`). Make it
`2026-08-24_mulch-export-1911_Old-Thicket_Dont-Stop-til-You-Get-Enough`: four fields joined by
underscore — the local day, the app's own name with the local minute on it, the yard, and what it
was made of — a hyphen wherever a field holds a space, and nothing else surviving at all. An
apostrophe is dropped rather than replaced, which is why `Don't Stop 'til` is `Dont-Stop-til` and
not `Don-t-Stop--til`. That narrows the permitted set to letters, digits, `-` and `_`, and it puts
`EXPORT_AUDIO_FILE.base` into every name rather than only into the name of a session holding no
yards. Everything 0133 decided about the _order_ stands and is the reason the stamp still leads: one
reader cuts this to a filesystem's byte cap and cuts from the end. What that cut now has to answer
for is new — a name cut mid-field must not end on a separator, and a field cut to nothing must not
leave two underscores against each other. Durable shape: none — a name is derived at the dialog and
stored nowhere (P40) — and
[0133](decisions/0133-a-take-is-named-after-what-it-was-made-of-and-when.md) is amended rather than
replaced. Proof: `copy.test.ts` over the four fields, the punctuation the format drops, and a name
long enough to be cut; the export scenario reading the offered default.

**P115 — A song is a section of the card, and the card says which part is playing.** A song is the
one thing on the jumps card that changes what every dial on it means, and it is the one thing behind
a popover: the parts are edited in a menu in the corner
([0153](decisions/0153-a-song-is-a-run-of-parts-the-walk-plays-back.md)), and while one plays the
card's dials go on drawing the values the parts are a _distance_ from rather than the values being
walked. Four clauses, in this order. (a) The menu becomes a section: a full-width fold inside the
jumps card, below the dials, wearing the fold every other module wears
([0107](decisions/0107-a-module-is-a-card-and-a-fold-never-silences-it.md),
[0055](decisions/0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)); the corner trigger goes,
and the popover's contents move across unchanged but for two things. The first is a gesture the list
has never had: a song's parts are reorderable, by the drag-and-arrow-keys handle both of the
instrument's ordered lists already wear — this is its third wearer, and it is written against the
version P113 leaves behind rather than the one there today
([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md),
[0111](decisions/0111-a-yard-lands-on-an-index-and-a-copy-lands-under-its-original.md)). It lands in
one `deck.player` carrying the whole spec, the way every other gesture on this card does, so an
arrangement moved is undone, logged and replayed like any other durable edit (0089). The second is a
defect on those contents rather than a feature added to them: a part's controls say what they are,
and today the jumps count does not. It already wraps in a `Says` (`PLAYER_PART_LENGTH_TOOLTIP`,
`src/ui/PlayerSong.tsx`) and shows nothing on a rest, and the reason is worth the reading: `Says`
works by rendering the control _as_ its trigger rather than wrapping it (0094), and `Knob` takes a
declared prop list and spreads nothing onto its root (`src/ui/Knob.tsx`), so the trigger's handlers
land nowhere. A knob's own `says` is the road that works, and it draws the sentence on the caption —
which a compact dial does not draw at all. So this is one seam and not one tooltip: every `xs` dial
in the instrument is explained the same way, and the Amount beside this one has no sentence at all
(P65). (b) A part is identifiable: it wears a short badge of its own, so two parts drawn as one
character for one length are two things a person can point at — today nothing tells them apart but
their place in the list, which is exactly what an arrangement being edited moves. The step decides
whether that badge is derived from the pattern's seed and the part's place — free, and it shuffles
the moment a part is dragged or inserted — or is an opaque id minted at the gesture that adds a
part, the way an effect instance's is
([0076](decisions/0076-a-card-reads-itself-out-of-its-own-id.md)); the second is the recommendation,
and the reorder above is most of the argument for it: a badge that moves when the part it names does
not is a name for a place rather than for a part. It is the durable shape this step would move.
Either way the id is identity and never a second generator: a part's voice goes on being drawn from
the walk's own stream in the order it always was, because that stream is the whole of what a seed
reproduces ([0089](decisions/0089-a-jump-is-the-transports.md)). (c) The walk says where it is:
`DeckPeek` grows one player read — which part is standing and the voice it is being walked under —
filled by `src/audio/player.ts` and read once a frame through `peek()`. Per-frame and nothing else:
no command, nothing durable, no React state (§2), which is the same seam an automated knob's live
read already runs on ([0035](decisions/0035-a-lane-runs-on-its-own-clock.md)). (d) What that read
buys, on the two surfaces that need it: the standing part lights up in the section and is named in
the card's header beside the seed, where `songLabel` already reads the arrangement out; and every
dial the song is overriding paints the voice rather than the spec, the way an automated dial paints
its lane, saying that it is doing so — a dial standing somewhere the hand did not leave it must
never be readable as one the hand moved. Turning a dial during a song still patches the spec the
parts are a distance from, which is what a part is measured against; it does not silently become an
edit of the part standing, and that sentence is part of the decision. Proof: a `playerSong.test.ts`
case that the cursor names the part it hands a voice for; a `player.test.ts` case that the peek
reports the standing part across a boundary; and one browser scenario that opens the section, plays
a song and reads a dial off the voice.

**P116 — A song that writes itself.** An arrangement is typed in today, part by part. Make it
drawable: a mode in which the song is not a list a hand wrote but one the pattern draws — parts
appearing, being kept for some rounds, one of them redrawn, the run either let go onto a new
arrangement or returned to the one the round started from. That is `playerFigure`'s own shape one
tier up ([0151](decisions/0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md)), and saying so is
what keeps this small: the four amounts a figure is shaped by are the four an arrangement is, said
in parts and rounds instead of slots and passes. **The drawn song is not stored.** It is a function
of the seed and those amounts at walk time, re-derived by replaying the way the figure and the song
cursor already are — a durable list that rewrote itself while it played would be a session that
changes without a command and a performance no seed reproduces (0089,
[0096](decisions/0096-a-moved-number-re-derives-the-tail.md)). Durable shape: `PlayerSpec` grows the
amounts, and the written list stays exactly what it is for a hand that wants one — the step decides
whether a drawn song and a written one can both be held or whether the mode chooses between them,
and one of those is a field and the other is a rule. What is shown is P115's section unchanged: a
drawn arrangement is drawn in the same list, with the standing part lit, so how it is evolving is
read where an arrangement is already read rather than in a second display. Proof: pure cases that
one seed and one set of amounts is one arrangement twice, that a kept round is the same parts and a
let-go one is not, and that nothing about it reaches the session.

**P117 — What a song is doing is in the picture.** The jumps module reaches the drift through
nothing: `moireRows` builds one row per lane, one per unbypassed instance and one for the loop, and
the thing actually moving where the deck reads from draws nothing at all. Give the module its own
row, and give it the dimension that suits what a song is: a song is the one thing on a yard that
changes in _steps_ rather than continuously, so a part boundary is a discontinuity the picture can
show as one — pitch off the part's own length, identity off the badge P115 gives it, so a part
coming round is visibly a different field and the same part coming round again is the same one. The
opportunity that is worth taking here is colour: 0141's three colour dimensions are each read off
the row that says them loudest ([0141](decisions/0141-colour-is-something-an-effect-turns.md)), and
a stepped change has a stronger claim on a split or a tint than any continuously-turned knob does.
Two constraints the step is written against. The player has no registry entry to declare a reach
through — 0148's rule belongs to the effect registry
([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)) — so the player's
own declaration is new, and it goes beside the module rather than inside a registry it is not in.
And a colour a knob turns is rounded onto its own steps precisely so it is a rebuild and not a frame
(0141, `src/ui/moireScreen.ts`): a part boundary is already a step, and this must not put a screen
rebuild on every jump. Durable shape: none — a row is read off the session, off the live cursor P115
adds and off nothing else, with nothing about a picture stored
([0131](decisions/0131-a-row-is-a-grating-and-the-picture-is-their-product.md)). Proof: a painted
case that two parts are two fields and one part twice is one; a case that the row moves at a
boundary and not per frame; and `./scripts/profile --compare`, because this is on the frame the hand
is on.

**P118 — A landing that shrinks, and a landing that is a hole.** Two draws inside one landing,
neither of them sayable today, and both reaching the same two functions. **Ratchet**: the repeats of
one landing shrink geometrically instead of standing equal, so a hold accelerates into the jump
after it. `windowOf`'s `ends = at + step.repeats * burstSecs` becomes a geometric sum and `seam`'s
per-repeat loop walks those partial sums instead of `at + repeat * burstSecs`
(`src/audio/player.ts`) — the only two places a repeat's length is computed, which is why one field
reaches all of it. **Drop**: the odds a landing is silent while keeping its place in the grid. It is
not `rest`, which is a wait _between_ two landings measured in slots
([0119](decisions/0119-a-burst-is-seconds-and-the-rest-is-slots.md)) and moves everything after it;
it is not `gate`, which cannot reach silence at all because `PLAYER_GATE_FLOOR` floors what a shut
gate leaves. A hole is what lets a pattern say a figure with a gap in it, and the figure is most of
the argument for it: the same run of slots with one of them silent is
[0151](decisions/0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md)'s memory heard as
syncopation rather than as repetition. The one thing the drop must answer in writing: `armStep`
hangs `release` off the source's own `ended` and `position()` reads the deck's read head off
whichever queue entry the clock is inside, so a landing with no source is an entry nothing reaps and
a cursor nothing answers for. A dropped step is a scheduled step whose fader never opens — same
source, same teardown, same position — unless the step proves that cannot work. Durable shape:
`PlayerSpec` grows two. The ratchet is an amount of the count and belongs behind the Repeats dial's
own framed plus ([0135](decisions/0135-the-repeats-dial-gets-its-own-door.md)); the drop shapes no
drawn number, so where it is drawn is a sentence to write rather than a preference. Proof: a
`player.test.ts` case over the deck double that a ratcheted landing's repeats are scheduled at
shrinking spacings and end where the sum says, one that a dropped landing schedules a source that
never opens and leaves the following step's start where it was, and the `renderPlayer` scenario
asserting a pattern with both at zero renders exactly what it renders today.

**P119 — A jump leans, strides and comes home.** Distance says how far a jump may travel and
`travelFrom` (`src/lib/playerWalk.ts`) draws uniformly inside it, then signs that draw off
`variation`. Three amounts behind the Distance dial's own framed plus, which is where a drawn
number's amounts belong
([0124](decisions/0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)): **Bias**, which
way the walk leans; **Stride**, the odds a jump travels the full distance rather than a drawn one —
at a stride of one a distance of three closes into a rotating cycle, which is the cheapest rhythm
the module currently cannot say; and **Home**, the odds a jump returns to the top of the loop
instead. Bias is settled in writing before any code is written: `PLAYER_VARIATIONS` is documented as
the one field of this spec that is a kind rather than an amount, and a bias of −1…1 is that same
axis said as an amount — bias at +1 and `variation: "forward"` would be one instruction arriving
from two fields, which principle 1 forbids. Either the bias replaces the toggle and the two named
variations become two points on it, or the bias is bounded short of ±1 and the toggle keeps the
choice; the step says which and why. Home owes a second answer: `createFigure` is handed this same
`travelFrom`, so a homing jump is also how a kept figure evolves — either that is the point and it
is written down as the point, or the figure's evolution takes the move and not the return
([0151](decisions/0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md)). Neither clause moves the
stream: one draw per field per step, in the order it is already in, is what a seed reproduces
([0089](decisions/0089-a-jump-is-the-transports.md),
[0096](decisions/0096-a-moved-number-re-derives-the-tail.md)). Durable shape: `PlayerSpec` grows
three, and whether it loses `variation` is the bias clause's to decide. Proof: `playerWalk.test.ts`
cases that a stride of one over a distance of three is a three-slot cycle, that a bias and its
negation walk one seed in mirrored directions, and that home lands on slot 0 at the odds its dial
says; `player.test.ts` over the bounds; and the `renderPlayer` scenario asserting a pattern with all
three at their switch values renders what it renders today.

**P120 — The rests are placed rather than rolled.** A rest is drawn today: `drawRest`
(`src/lib/playerWalk.ts`) takes the dial, refuses the wait on `restChance` and strays it by
`restSpread`, so where the pattern breathes is a roll per jump and the shape of that breathing is
never the same twice. A Bjorklund pattern places them instead — pulses spread as evenly as whole
numbers allow over a span, which is the deterministic emergent rhythm this module has no way to ask
for. About twenty lines of pure maths in `src/lib`, and the twenty lines are not the step: a placed
rest is a **second author of one field**, and `restChance` and `restSpread` mean nothing while it is
authoring. So the step decides whether the pattern is a mode that takes the field over, or a third
amount the roll consults — one of those is a rule and the other is a field — and it says what the
two rolled amounts read as while a pattern is live, because a dial that is drawn and does nothing is
worse than a dial that is not drawn. Durable shape: `PlayerSpec` grows the pattern's own numbers —
pulses over a span, both whole — and whatever the mode clause decides says which author is live.
Proof: pure cases that the generator returns the known patterns (E(3,8) and E(5,8) are the two worth
naming in the test), a `playerWalk.test.ts` case that a placed run repeats exactly over one seed,
and one that the rolled amounts leave the stream untouched while the pattern is off.

**P121 — A landing that plays backwards.** The odds one landing reads its slot in reverse. There is
no negative rate on an `AudioBufferSourceNode`, so what a reversed landing plays is a reversed copy
of the deck's buffer, and the step is mostly about where that copy lives: one per deck, made from
the buffer the deck already holds, dropped when that buffer is, and durable nowhere — audio nobody
imported is a crop's business ([0047](decisions/0047-a-crop-mints-audio-the-user-did-not-import.md))
and a reversed read is not a crop. The second thing it moves is the cursor: `position()` answers
`grid.in + step.slot * grid.slot + into % step.span`, and a reversed landing walks that span the
other way, so the read head the playhead and the picture are drawn from has to run backwards with it
or the instrument shows one thing and plays another. Durable shape: `PlayerSpec` grows one chance;
the reversed buffer is a cache and nothing in the session. Proof: a `player.test.ts` case over the
deck double that a reversed landing starts on the mirrored offset of the reversed buffer, a
`position()` case that its cursor runs the other way inside the same slot, and the `leaks` scenario,
because a second buffer per deck is a second thing to let go of.

**P122 — A pattern lands where the sample does.** Which of the sixteen slots a pattern may land on,
as durable numbers a hand can see and turn off. The rule that shapes the whole step is §2: analysis
is not a pure function of stored bytes — `decodeAudioData` may resample — so nothing durable may
rest on it, and a mask that were a live read of `src/lib/analysis.ts` would be a spec that means one
thing on the machine that made it and another on the machine that replays it. The road is a one-shot
action: a command a hand sends, which reads the onsets once and writes the mask as ordinary durable
numbers, undone and replayed like any other edit
([0089](decisions/0089-a-jump-is-the-transports.md)). Two things the mask itself has to answer.
`playerWalk` opens on `let slot = 0` because a play begins at the top of the loop, so a mask that
excludes slot 0 contradicts the walk's first line — either the first landing is exempt or the mask
is required to hold it. And `travelFrom` wraps a drawn distance onto the grid and is the same
function `createFigure` evolves a figure with, so a mask applies to a figure's slots too: the step
says whether a masked jump is re-drawn or snapped to the nearest permitted slot, and snapping is the
one that keeps `distance` meaning what its caption says. Durable shape: `PlayerSpec` grows the mask
— `PLAYER_SLOTS` booleans, or the whole number they pack into, and the step picks whichever reads in
a command log. Proof: pure cases that a masked walk lands only on permitted slots over a long run
and that an empty mask is refused by `assertPlayer`; a command test that the action writes the mask
once and reads nothing at walk time; and the `renderPlayer` scenario over a masked pattern.

**P123 — A landing throws a spark.** A landing may throw a second, quieter one at another slot, so
two regions of the loop sound at once and in rhythm. `PlayerStep` grows an optional companion and
`armStep` builds a second source through a level gain — that much is additive. What is not additive
is the queue: `position()` scans it for the latest entry the clock is at or past and answers the
deck's read head off that one (`src/audio/player.ts`), so a companion sitting in the same list would
win that scan and the cursor would follow the spark instead of the landing. The queue stops being a
flat list of steps, and the step's job is to say what it is instead — an entry that names which of
the two it is, or a companion held on the landing's own entry — and to keep `position()` answering
off the landing, which is where the pattern actually is. A spark **across yards** is not this step
and is not reached by it: [0097](decisions/0097-yards-jump-on-one-session-clock.md) considered a
follower and refused it, so the shared clock stays the sanctioned road and reopening it is a
decision before it is work. Durable shape: `PlayerSpec` grows the odds a landing throws one and how
far under the landing it sounds; where the spark lands is drawn from the same stream the jump is,
and never from a second generator. Proof: a `playerWalk.test.ts` case that a spec that never sparks
lays down the stream it laid before the field existed; a deck-double case that a sparking landing
schedules two sources and that `position()` answers off the landing; and the `renderPlayer`
scenario, which is where two sources at once is audible in a rendered file.

**P124 — The rate moves inside a landing.** The rung ladder moves per hold today — `hold` counts
jumps, and a step reads at one ratio for its whole length
([0118](decisions/0118-the-rate-walk-is-the-performers.md)). Letting it step between the repeats of
one landing is an arpeggio rather than a speed change, and it is the most expensive item on this
list by some distance, which the step states before it starts rather than discovers. `armStep`
writes the rate once — `source.playbackRate.value *= step.rate` — `Scheduled` carries one `rate` per
step on purpose, and `position()` computes `(at - step.at) * step.rate` off that one number. A rate
that moves inside the landing means one source can no longer carry it: either a source per repeat,
which multiplies the node count of the busiest thing in the instrument and puts another seam inside
every landing, or a scheduled `playbackRate` ramp, which leaves `position()` integrating a rate
rather than multiplying by one. Both answers are real; neither is one field. The step is written
only after it says which, and what the cursor arithmetic becomes under it. Durable shape:
`PlayerSpec` grows the amount saying how far the ladder moves between repeats — the rung walk's own
three amounts are already declared and are not duplicated for this. Proof: a `playerWalk.test.ts`
case that a landing's repeats carry the rungs the walk says; a deck-double case over whichever of
the two roads is taken; a `position()` case across a repeat boundary; and
`./scripts/profile --compare`, because a source per repeat is a node count and not a number.

A next step comes from §4 or from something the instrument has not been asked for yet, and it is
written here — durable shape first — before it is started. P110 came from the second road, and so do
P118–P124: the jumps module is the one the instrument's author most wants to grow, and
[`ideas.md`](ideas.md#jumps) held nine directions for it. Seven are written above with their proof
and are work; the two left there are not, and each names the decision that would have to be taken
first — a burst locked to the grid reverses
[0119](decisions/0119-a-burst-is-seconds-and-the-rest-is-slots.md) rather than extending it, and a
spark across yards reopens [0097](decisions/0097-yards-jump-on-one-session-clock.md)'s refused
follower.

## 2. Rules for every feature

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL
  call `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`; command shapes do not grow independent time fields.
- Parameter facts derive from the parameter/effect registries. A new parameter is declared once
  and bound once; a value lookup is (instance, param)
  ([0030](decisions/0030-effects-are-instances.md)).
- Raw files, audio nodes, functions, and browser permission objects never enter commands or the
  durable session.
- `buildDeckChain(BaseAudioContext)` remains the one production signal path for live, headless,
  offline, fingerprint, and export hosts.
- Durable edits participate in bounded history, persistence, portable archives, and graph restore
  unless a decision explicitly proves why they do not.
- Per-frame playheads, meters, cursors, and gesture drafts use refs and the existing frame loop,
  never React state or another RAF loop.
- Async work carries source or operation identity so stale completion cannot overwrite newer
  state.
- Analysis is not a pure function of stored bytes: `decodeAudioData` may resample to the device's
  rate, so onsets differ across machines. Nothing durable may rest on derived analysis.
- A view preference — snap, theme, whether the debug console is open — is not session state: no
  command, nothing durable, no history entry.
- Durable shape changes freely while pre-release: stored data that no longer validates is
  discarded, never migrated ([0026](decisions/0026-pre-release-has-no-migrations.md)).
- No new dependency is added without approval and a statement of what it replaces.

## 3. Proof and delivery

`./scripts/check` remains the full gate. It is allowed to get slower as the instrument gets bigger,
but no single feature may move its mean by more than 250ms without the human being asked first
([0012](decisions/0012-no-one-feature-jumps-the-gate.md)). Each feature adds the cheapest proof at
the layer that owns the behavior:

- pure normalization, analysis, and DSP assertions in colocated Vitest tests;
- command, event, history, and failure atomicity through `createInstrument` and its manual clock;
- graph scheduling and sound through the existing live/offline browser run;
- UI focus, pointer, file in the existing preview smoke;
- export parity by comparing every encoded sample with the shared graph buffer.

One fact has one emitter. `probe()` remains durable/session state, the event log remains discrete
behavior, and `peek()`/`peaks()` remain allocation-free continuous/sample-derived reads. A UI ring
drop is loud; a sequence gap in `./scripts/drive` is always a bug.

**The gate's headroom is not where it looks, and 0012's line applies to about one step.**
`./scripts/check` runs eleven steps concurrently and its wall clock is one of them: measured over 35
runs at `88173b2`, `drive` costs 7425ms of a 7471ms mean and the second-slowest step, `test`,
finishes 4747ms earlier. So everything that is not a browser scenario has ~4.7s of slack before it
moves the gate at all — a feature may add two seconds of Vitest and cost nothing — while a browser
scenario's cost lands on the mean one for one. Inside `drive` the chain is `vite build` (465ms,
serial) then the 41 scenarios of `scripts/smoke.d/browser.js` driven in order on one page (5967ms);
the six parallel `./scripts/drive` subprocesses beside it are free, the slowest finishing 3.5s early.
Measure a change by stashing it and comparing means across several runs, **interleaved**: a single
run's spread is wider than most features cost, one lucky measurement has already produced a wrong
figure twice, and fourteen pristine runs of one unchanged commit split into two windows fifteen
minutes apart read 7506ms and 7920ms — a +414ms drift, 1.7× 0012's own step size. Never quote a mean
measured in a different window from the one it is compared against.

The smoke was long thought to sit near a non-linear cliff: browser work added _before_
`persistenceSmoke`'s `page.reload()` stalling the reloaded page's audio clock. **It did not
reproduce at `88173b2`, at 4× the threshold that was supposed to stall nearly always** (§4, which
holds the measurement and the instrument for it). The ordering rule below is therefore kept for a
stall nobody can currently find, and the mechanism still needs Chromium-side tracing.

A popover the driver clicks through is the other measured trap: Playwright waits out a popup's
enter and exit animations before it may click, which cost one scenario ~450ms after the reload and
1.68s before it. A popup whose entries `./scripts/drive` presses opens instantly
([0056](decisions/0056-an-effect-carries-its-own-icon.md)).

Offline `render()` calls are the cheap place to prove sound: they join underneath the deck
fixture's real-time waits and cost close to nothing. New browser work that cannot be a render
belongs after the reload, or on its own page — not on the pre-reload critical path.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and
a failing seam-level test before broad UI work. Do not turn the driver into a second application
by teaching it feature semantics.

A step run by a subagent gets the standing clauses in
[subagent-prompt.md](subagent-prompt.md) — report to a path, watch the test fail, print no new
warnings, waive at the site, four review lenses, interleave base and head. Each is there because a
run paid for its absence, and the cost is named beside it. Paste them; a paraphrase drops the
sentence that made the clause work.

## 4. Not scheduled

- **The tape's picture wraps under its knobs 48px sooner, and no scenario has a tape in a rack to
  see it.** P89's box is `h-20 w-40` against `h-12 w-28`, and a rack card's content is
  `flex-wrap`: measured on the running page with a tape, a filter and a reverb on one yard, the
  picture drops onto its own line at 769px of viewport where it used to drop at 721, and in that
  48px band the tape card stands 243 high against its neighbours' 155. Below 721 both wrap and the
  new box costs a constant +32px, which is `h-20` and not `w-40` — the width was cut from `w-56`
  to the drawing's own aspect precisely to buy the first threshold back from 819px. Nothing in the
  gate can see any of it: `scripts/smoke.d/rackRow.js` measures Yard A's rack, `rack.js` seeds it
  with filter, delay and reverb, and the only tape in the suite lives on the `tape-yard` deck that
  `renderTape.js` removes in its own `finally`. Not scheduled: a picture that is larger is a
  picture that wraps sooner, 0093's one-height rule is about a caption's line boxes rather than
  about a card that carries a drawing, and closing it means either a second box size at a
  breakpoint or a tape in the rack row scenario — a decision about what a rack card owes a
  picture, not a patch.

- **A recorded lane is now as long as the press, and three things downstream read a span they
  used to be handed a shorter one of.** P88's lane runs press to release
  ([0125](decisions/0125-a-recording-is-the-whole-press.md)), which is the point; what rides along
  is that the span is a wall clock rather than the length of the moving part. **A flick** — press,
  one move, release inside 60ms — used to commit one point and a span of 0, which `armLanes` plays
  through its explicit one-shot path, and now commits a span under the transport's real floor of
  `AUTOMATION_REARM_SECS / MAX_AUTOMATION_CYCLES`, where a re-arm tick runs out of cycles and
  stutters. `automation.set` has never clamped a span — `stretchLane` is the only thing that does —
  so two moves 30ms apart could already reach that band, which is why this is a widening rather than
  a new hazard; closing it means a floor on what a recording may commit, and that is a decision
  about what a fast gesture means rather than a patch. **`laneBend`** (`src/lib/moire.ts`) samples
  16 points across the span, so a press that is still for the first fifteen sixteenths reads as
  flat and draws a moiré row with no bend in it. **And history's `GESTURE_IDLE_MS`** is 2s of wall
  clock: the `automation.set` is sent at the release, so a press held still for longer than that
  after its last move opens a second undo entry, and the lane and the value it replaced come back
  one press at a time against 0067. All three predate P88 and all three are ordinary on the gesture
  it makes ordinary. Not scheduled: each is a different owner — the transport's floor, the
  picture's sampling, the history's idle — and none of them is what "a recording is the whole
  press" was about.

- **The gate is one serial browser chain, and 8% of it is a fixed sleep.** §3 has the measurement:
  `drive` is the gate's wall clock and the 41 browser scenarios are `drive`. Two terms inside it
  are removable and neither was taken. `exportReleasesSamples`
  (`scripts/smoke.d/exportAudio.js`) costs 821ms of which 600ms is six unconditional
  `page.waitForTimeout(100)` calls after `HeapProfiler.collectGarbage` — its sd over 35 runs is 8ms,
  so the scenario _is_ its sleeps; deleting them outright, interleaved base/head over three pairs,
  took it to 212ms and the whole browser chain from 6365ms to 5658ms, 2.4× 0012's step size, with 6/6
  runs still green. And `scripts/smoke`'s `vite build` is 465ms, serial, ahead of the parallel phase
  and therefore wholly on the critical path. What would close the first is the poll
  `scripts/smoke.d/leaks.js` already uses — collect, read, break when the backing store has settled,
  poll to a deadline otherwise — which trades a settle that fails the same way every time for one
  that fails only on the machine that needed another round, so the deadline has to be generous enough
  that a slow machine reads as slow rather than as a leak. What would close the second is the mtime
  check `./scripts/drive` already makes, which spends exactly the guarantee
  [0050](decisions/0050-the-gate-counts-things-and-the-profiler-measures-them.md) demands: a
  diagnostic reusing `dist/` must prove the build is not stale, and a leaky build left there reported
  a healthy rack as leaking three times, convincingly. Not scheduled: 707ms is real, and neither
  repair is one a step called "what it costs" should have made to the instrument it was measuring
  with. Splitting the browser half across concurrent pages is the larger lever and trades what
  `browser.js` is built on — that what one scenario leaves on the page is what the next one reads.

- **Two more surfaces commit where the pointer had been, not where it was let go.** P86 put the
  release's own position into the gesture skeleton ([0123](decisions/0123-a-release-is-a-position.md))
  and spent it on the two surfaces it named. `src/ui/Knob.tsx` and `src/ui/listDrag.ts` are the same
  shape: both read the pointer only in their move handler, so a drag whose last frame Chromium
  coalesced into the `pointerup` lands short, and a flick inside one frame commits nothing at all —
  a card dropped on the slot it passed rather than the slot under the hand. Neither can call `track`
  as it stands: the dial accumulates travel and commits every move, so only the last frame is lost,
  and the list commits a slot index from a nearest-slot scan rather than a `Tracked.current`, which
  would have to come out of its move handler first. Not scheduled: P86 was two defects on the loop
  surface, and widening it to a dial and a rack row is a different step against different proof.

- **One global Space is N plays, and the smoke asserts they are one.** `Space` produces one
  `deck.play` per reachable yard (`playToggleAllCommands`, `src/ui/actions.ts`), each resolving its
  own start against the clock as it runs, and `scripts/smoke.d/keyboard.js`'s `globalAligned` asserts
  every resulting `deck.started.at` is identical. Seen failing once in ~62 runs of the browser half
  at `88173b2`, with deck a at 1.16455782 and deck b at 1.16746032 — 128/44100 apart, one render
  quantum, from a batch that straddled a boundary. Two repairs, and they say different things: a
  one-quantum tolerance admits a global start is not sample-aligned, while giving the batch one
  resolved start time makes it so, which is the honest reading of P66's one transport over all the
  yards and the more expensive, since it means a play command that carries its time rather than
  reading it. Not scheduled: it is 1.6% and it could not be made to fail on demand, so there is no
  seen-failing proof to attach to either repair yet.

- **A stretched lane schedules more ramps than the render has quanta.** A recorded gesture keeps
  every point the pointer produced — nothing thins it, and `stretchLane` scales the times and keeps
  the count — so a ten-second gesture is ~600 points, and shortening its span to `MIN_LANE_SPAN`
  leaves it repeating forty times per re-arm tick. Counted on a counting `AudioContext`: 10,217
  `AudioParam` calls for the first arming and 23,439 for each steady four-second tick of one such
  lane, against 13 and 601 for the same gesture on a two- and a ten-second span. At that span the
  points are 0.167ms apart against a render quantum of 2.667ms, so sixteen of every seventeen
  `linearRampToValueAtTime` calls land inside a block that can only produce one value. Closing it
  means decimating a lane against its own span — one point per quantum is inaudible by construction —
  which trades two things: what a stored lane replays changes, so every fingerprint over an automated
  render moves, and the replayed shape starts depending on the span it is stretched to, which
  [0079](decisions/0079-a-lane-is-stretched-after-it-is-played.md)'s "the shape is untouched and only
  the cycle it repeats on changes" forbids. Not scheduled: it becomes work the day a stretched lane
  is measured to cost a clock.

- **A ten-minute export spends most of a second of the paint thread in two `src/lib` kernels, and
  what is left of that is the fingerprint.** `renderOffline` is called from `src/app/exportAudio.ts`,
  which is where a person's export goes (`ExportAudioDialog`), and from `src/main.tsx`, which is the
  harness hook — so both kernels are on the thread that paints. `./scripts/bench` prices them over
  220MB of decoded stereo against 36.7ms for a scalar scan of the same samples. P83 took `encodeWav`:
  walking a channel at a time and striding over the interleave, the shape `peaks` already used, put
  the array iterator once per channel instead of once per frame and dropped the per-sample layout
  test `assertChannels` had already refused — 291.6ms ± 0.9 against 409.1ms ± 5.6 over nine
  interleaved rounds, byte for byte the same file, and still written little-endian a sample at a time
  through the `DataView`, so nothing assumes the host's byte order. The row now reads 414.0ms against
  the 493.8ms the same bench read before it. What is left is `fingerprint` at 333.3ms, and it is a
  price: it runs on every render whether or not a wav was asked for and no app caller reads the
  result — `ExportAudioDialog` takes only the file, `flatten.ts` only the events and the bytes — but
  its consumers are `scripts/smoke.d/exportAudio.js`, `renderDynamics.js` and `renderTape.js`, where
  it is the export-parity assertion §3 names, so a render that skipped it is a render nothing can
  check. Its own frame-major channel walk was measured and left: indexing it buys 3.6ms of 351.6, and
  paying a per-sample test for 1% is the trade `encodeWav` just stopped making. Not scheduled: the
  export already renders at 50–51× realtime, so what remains is under 3% of a wait the person has.

- **Every command projects the durable session twice and serialises it twice.** A `param.set` costs
  two full `sessionSnapshot` projections and two whole-session `JSON.stringify` calls — counted at
  2.00 and 2.00 per command over a hundred-move drag, and 32KB of JSON per pointer event on a
  sixteen-yard, six-effect session. One of each belongs to `fingerprint()` inside `observeDurable`,
  which is subscribed to the store and is how a durable change reaches the autosave debounce; the
  other belongs to `run()` handing `sessionSnapshot(store.getState())` to `history.record`. They
  project identical state microseconds apart. Closing it means taking the durable-change check out of
  the store subscription and into `run` so one projection serves both, which trades the subscription's
  reach: `replaceSession` on an undo, an import and a restore, `spendDeckIds`, and the graph's own
  `playing` report all reach the autosave sentinel through the store rather than through a command,
  and each would need an explicit call — the sort of "remember to also do this" the subscription
  exists to make impossible. The deep clone beside them stays for a different reason: `record` taking
  ownership of its argument is the invariant `src/app/history.test.ts` pins. Not scheduled: these are
  the floor of the current shape, and P83 took the four serialisations that were free.

- **The one moiré window costs 10ms of churn, and the strip may be drawing below the aliasing
  bound.** P76 collapsed `MOIRE_STRIP_CYCLES` and `MOIRE_OVERLAY_CYCLES` onto one `MOIRE_CYCLES`
  of 48 (0109), which is what the step asked for, and `./scripts/profile --compare` flagged churn
  wall clock at 128ms against a 112–122ms band. It was interleaved sixteen pairs against `beb3693`
  and then bisected inside the commit by patching the constant alone: +8–12ms (~8%), attributable
  to the constant and to nothing else in P76. It is not JS — `paintMoire` samples by canvas width,
  so the loop counts, the vertex counts and the `rowInk` calls are identical at 4 cycles and at 48.
  It is rasterizer time: a 12× wider window at the same pixels makes the out-and-back ribbon far
  more self-intersecting, and the churn loop rebakes it forty times. Nothing else moved — frame
  p95, longest task, heap delta and every live-object column are flat, and the profiled scenario
  never mounts the folded-yard strip or the overlay. The one lever is the `Math.max(1, …)` floor in
  `affordableDensity` ([`src/ui/moireCanvas.ts`](../src/ui/moireCanvas.ts)), which P76's contract
  lens reached independently from the other side: at the narrow header width the fastest rows now
  draw cycles of about 4px against a `MIN_CYCLE_PX` of 8, so the floor is holding the picture below
  the bound that file's own comment calls aliasing rather than interference. Letting the density
  decline would return both numbers at once, but it coarsens the pitch and narrows the rows of the
  picture 0109 was just written about, and it needs an eye on the pixels rather than a profiler —
  so it is recorded here rather than taken. This paragraph is the reading
  [0113](decisions/0113-an-accepted-cost-is-where-the-past-starts.md) requires before a baseline is
  reset, and **P83 ran the `./scripts/profile --accept` it was waiting for**, so the band starts from
  the accepted run rather than rediscovering this for ten commits. The profiler blocks nothing
  (0051), and 0.25ms a repaint for a 12× finer strip may simply be the price. **P90 re-measured it**
  after moving every row's fill from a flat colour to a tiled `CanvasPattern`: 141ms against a
  131ms–146ms band, inside it. A later run read 159ms and was flagged, so it was interleaved three
  pairs against the same tree with the painter stashed — base 157/180/168, head 156/172/171 — which
  is the machine climbing across the run and not the tile: the two are indistinguishable at every
  pair, and both sit above the band on a loaded machine. Frame p95, heap delta and longest task were
  unflagged throughout. The rasterizer reading a 6-device-pixel-wide tile instead of one colour is
  inside the noise this paragraph already accepted.

- **~~The screen draws the reference's lattice; the picture underneath is too busy to show it.~~**
  **Closed by P93.** The finding was right and its diagnosis was half right: the picture was drawn
  finer than it could carry, but the fix was not a smaller `MOIRE_CYCLES`. There is no ribbon left
  to be a barcode — the rows are the lattice now, and the window's spread of pitches is compressed
  into the band two gratings beat in
  ([0131](decisions/0131-a-row-is-a-grating-and-the-picture-is-their-product.md)). `MOIRE_CYCLES` is
  untouched and 0109 stands.

- **Folding a yard closes its drift window, and `./scripts/drive` cannot see that window at all.**
  Two costs of P100 ([0138](decisions/0138-the-drift-opens-a-window-the-instrument-drives.md)), both
  named rather than paid. `src/ui/Deck.tsx` mounts `MoireStrip` twice — once in the header under
  `collapsed`, once in the body under `!collapsed` — because a fold is its own heading
  ([0106](decisions/0106-a-fold-is-its-own-heading.md)), so folding unmounts the strip that owns the
  window and the teardown closes it. That is continuous with the overlay P76 shipped, whose `open`
  flag was lost the same way; what changed is the weight, because a window the browser has sized and
  placed is not free to reopen. Closing it means the window outliving the fold — the hook lifted into
  `Deck` and handed down, or the two sites made one element — which is a decision about what the fold
  owns rather than a patch. And nothing in the gate reaches inside it: `scripts/drive` creates one
  `page`, and `writeShots` enumerates the canvases of that page, so a Playwright popup is never
  attached — the swing-and-crop discipline AGENTS.md requires for exactly this picture is available
  for the strip and not for the large form. P101's `scripts/smoke.d/drift.js` attaches to the popup
  as a second Playwright page and reads its title and its one canvas, so the seam is asserted; what
  is still unreachable is the picture itself, because `writeShots` enumerates one page's canvases
  and a throw while painting the second document would be invisible to `drive`. It was photographed
  by hand for P100, in both schemes and against the preview build. Not scheduled: teaching `drive`
  a second page is a change to what `drive` is, and it belongs with whatever step first needs to
  photograph that window.

- **A drift window in front of a hidden instrument freezes.** P100's second window is painted from
  the opener's one frame loop ([0138](decisions/0138-the-drift-opens-a-window-the-instrument-drives.md)),
  which is the boundary plan §2 states and also the price: Chromium throttles `requestAnimationFrame`
  in a backgrounded document, so a person who leaves the picture in front and puts the instrument
  behind sees the phases stop. Nothing is lost — the picture is a pure function of what `peek()`
  reports, so it catches up the moment the opener is visible again — and every other way of watching
  it, the strip and the covering overlay, is in the opener itself. Closing it means a loop driven by
  whichever document is visible, which is a change to what "the one RAF loop" means rather than a
  patch: `src/ui/frame.ts` would have to hold a window as well as a callback set, and decide what a
  frame is when two documents are visible at once. Not scheduled: it becomes work the day someone
  performs with the picture on a second screen.

- **A profile's harmonics fall under the pitch band's own floor on the fastest rows.** P99 gives
  each effect the shape of its own wave ([0137](decisions/0137-an-effect-declares-the-wave-it-draws-with.md)),
  and three of the six carry a second or third harmonic. `gratingPitch` floors at
  `PITCH_PX / PITCH_SPREAD`, which is 3.5 device pixels at a device ratio of one: a second harmonic
  is 1.75 pixels there and a third is 1.17, both under Nyquist, so a delay, a
  reverb and a tape fold back toward the plain wave exactly where a yard's rows are finest.
  **P105 narrowed it**: a lane used to pull that floor further down through `gratingBend`, to 2.89
  and a third harmonic of 0.96, and a row's own gesture now moves its phase rather than its pitch
  ([0146](decisions/0146-a-rows-own-gesture-moves-its-phase.md)), so nothing reaches under the band
  any more and what is left is the floor itself. The floor
  was sized for one cosine and is the band 0131 measured the whole picture's beats into, so raising it
  is a change to every row's pitch and not to these three. Not scheduled: the profiles are distinct at
  every pitch above the floor, which is where 0131 already says a grating shimmers rather than beats,
  and closing it means either a coarser band for everything or a profile set with no harmonics in it.

- **The reference's fringe families bow and ours are straight.** In the stills the lattice curves
  and swirls, because the camera is at an angle to a screen that is not flat to it, so the beat
  cell changes size across the frame. Ours is one affine matrix on one repeating tile, so its cell
  is the same everywhere. Having it means the tile can no longer repeat at all — a cell that varies
  across the canvas is a field the size of the canvas, rebuilt whenever any motion moves it, which
  is the per-frame pass over the pixels 0129 exists to avoid. **Still open after P93, and now it is
  the picture's own gratings it is about** rather than only the screen's: those are affine patterns
  too, so a yard's fringe families are straight everywhere. Not scheduled: the picture reads as
  filmed without it.

- **A flatten bakes one pass of the master bus, and playing it makes a second.** The render
  harness renders the destination, so a flattened yard's samples have already been through the
  limiter and the soft clip, and playing them puts them through again — measured in Chromium at
  +1.65dB on a yard 14dB below the limiter's threshold, which is Blink's fixed compressor makeup
  gain applied twice rather than anything the limiter is doing at that level. It is not the
  panner: a mono yard's own 0.7071 is already in the file, and the stereo file passes at unity, so
  those two cancel exactly. Closing it means rendering a yard before the bus, which is a second
  graph the one-signal-chain boundary forbids and which would also write audio nothing bounds into
  a 16-bit file. The bus's other mark is already paid for: it delays what it is handed by 444
  frames, so a flatten renders two passes and keeps the second rather than storing that much
  silence at the head, which leaves the clip rotated 9ms against its loop's own start. Not
  scheduled: both become work the day the bus stops being a fixed gain and a fixed delay, or the
  day a decision says a render may tap somewhere other than the destination
  ([0112](decisions/0112-a-flatten-is-a-spec-the-one-harness-already-accepts.md)).

- **A flatten defers every command behind it, and a second press is taken.** `deck.flatten` is a
  command that expands into a group, so the facade parks the queue on its promise the way it does
  for `clip.apply` and `deck.duplicate` — but those are sub-second and a render of a long loop is
  not, so a play, a stop or a knob moved during one waits for it and then lands at once. Nothing
  says a flatten is running: `send()` returns void by design, so the button cannot await its own
  command, and a second press is accepted, deferred, and flattens the yard the first one already
  flattened — a second blob, a second history entry, and the master's pass paid twice. Closing it
  means an in-flight signal the UI can read, which is either a probe field or an event the button
  subscribes to, and neither is a thing a yard's transport has ever had. Not scheduled: it becomes
  work the first time a flatten is slow enough for a person to press it twice.

- **The dry/wet crossfade is written out three times.** `delay.ts`, `reverb.ts` and now `tape.ts`
  each build the same eight lines — one `ConstantSourceNode`, the two `mixCurve` shapers, two gains
  at zero — which is the third occurrence principle 3 fires on. It was extracted and put back.
  Extracting it moves node construction inside a helper, which reorders the fake context's
  creation-indexed nodes and invalidates fifteen assertions in `src/audio/effects/rack.test.ts`;
  rewriting those to accommodate a refactor is the drive-by principle 4 forbids, and the risk of
  silently weakening one of them is not worth removing eight lines that hold no behaviour — the law
  itself already lives once, in `src/lib/crossfade.ts`. Not scheduled: it becomes work the day a
  fourth plugin wants it, or the day those assertions stop being indexed by creation order.
- **The tape's extra heads were not built, and the loop is not oversampled.** P61 offered extra
  heads as further read taps at fixed ratios of the base delay, "if it earns its knob". It did not:
  seven knobs already reach the rack card, a second head at a fixed ratio is a `tape.time` a
  performer can already dial, and a rack holds any number of instances of one entry (0030) — two
  tapes in a rack are two heads with independent times, which is strictly more than a ratio knob
  would have bought. The aliasing question was measured rather than argued: `./scripts/bench` prices
  the same loop three ways over 10 minutes of mono at 48kHz — 2080ms ± 115 with the shipped
  antiderivative-antialiased tanh, 1769ms ± 246 with a plain `Math.tanh`, and 3139ms ± 40 with the
  loop run at 2× and resampled either side. ADAA buys the antialiasing for 18% over doing nothing,
  where oversampling costs 77%; at 3.5ms per second of audio per channel the shipped loop is 0.7%
  of a stereo realtime budget, so nothing is near a deadline a port could rescue and §4's WASM rule
  keeps its standing answer — nothing qualified (0058). Not scheduled: the heads are a knob nobody
  asked for and the oversampling is a cost with no audible payer.
- **An export that writes the session holds the imported bytes several times over, and the one
  scenario that measures an export's heap measures the other path.** P91's default writes two files
  into one archive ([0127](decisions/0127-an-export-is-a-folder.md)), and every step of that copies:
  `createSessionArchive` allocates one contiguous buffer holding a second copy of every blob the
  session names, the `File` around it takes a third, and `downloadFolder` then reads both files back
  out with `arrayBuffer()`, allocates the whole zip, and wraps that in a `File` again — roughly three
  live copies of (wav + archive) at the instant the download starts, on top of the 331MB the
  paragraph below calls inherent. For a session built on a few hundred MB of imported audio that is
  most of a gigabyte of transient allocation. Nothing in the gate reads it:
  `exportReleasesSamples` (`scripts/smoke.d/exportAudio.js`) passes `session: false` on purpose,
  because its `window.File` hook holds the _last_ File constructed and an archive built beside the
  wav would silently change what its `WeakRef` proves. Not scheduled: what would close it is
  `zipFolder` taking Blob-backed entries and assembling the outer `File` from parts, which trades a
  synchronous, testable pure function over bytes for an async one over Blobs, and the measurement
  would need a second heap scenario rather than a flag on the one that exists — a browser scenario
  costs the gate's mean one for one (§3). What is real today is that the recorded peak below is the
  peak of the path the checkbox is _cleared_ for.

- **A ten-minute export peaks at 331MB and that peak is inherent.** Measured on the render path
  through the CDP's `Runtime.getHeapUsage` (`backingStorageSize`, which is where float samples and
  `ArrayBuffer`s live — the debug console's `heap` counter reads the V8 heap and stays under 7MB
  throughout, so it is not the instrument for this). 331MB is what the counter read at the peak; the
  arithmetic behind it is 345MB — ten minutes of stereo at 48kHz is 230MB of rendered samples and
  115MB of encoded 16-bit PCM, and the encode needs both at once. The two are the measurement and
  the sum, not two peaks: the counter is sampled off a live heap and reads a little under what the
  two allocations add up to. The sum is the one that cannot come down, because `encodeWav`
  already writes into the one buffer it allocates and returns a view of it, so there is no second
  copy left to remove, and nothing can be freed part-way through a file whose frames interleave
  every channel. What was reducible was the residue, not the peak — 220MB stayed alive after every
  export and stacked, which P58 fixed ([0086](decisions/0086-a-render-hands-its-samples-back.md));
  after it the same export settles back to 0.7MB. Not scheduled: the remaining peak is the samples
  themselves, and cutting it would mean a strided per-channel encode to release one channel early,
  which trades a third of the peak for a cache-hostile pass over 115MB.
- **An offline render is about 13% slower since P43.** `./scripts/profile --compare` reads 50–51x
  realtime against a median of 58x, twice in a row, on the run that landed
  [0071](decisions/0071-the-offline-pump-arms-the-lanes.md). Frame p95, heap delta and the longest
  task are all unmoved, so nothing per-frame regressed — the cost is entirely in the offline pump,
  which now arms the lanes the wall-clock tick could never reach. That is the work the old path was
  skipping and the reason the export was wrong, so it is a price rather than a defect: an export
  still renders about fifty times faster than it plays. Not scheduled unless a longer export makes
  the absolute number land somewhere a person waits ([0051](decisions/0051-the-profiler-remembers-its-own-runs.md)).
- **The Option arm attaches from an effect, and a pointerdown can beat it.** `subscribeAlt` in
  `src/ui/shortcuts.ts` attaches its `document` listeners lazily, on the first subscriber, and a
  knob subscribes from a React effect (`useAltHeld` in `src/ui/ParameterKnob.tsx`). A `pointerdown`
  landing before that effect has run would find nothing armed, and the ride would degrade to a
  plain parameter write with no error — the failure mode is silence, which is what makes it worth
  naming. `onAltPointer` reads the modifier off the pointer in the capture phase and exists to
  cover exactly this, so the window may already be closed; it was investigated while chasing the
  persistence-smoke flake ([0084](decisions/0084-a-measured-gesture-waits-for-the-viewport.md)) and
  ruled out as that flake's cause — on every failing run the knob read `armed` and the pointer was
  simply elsewhere. What was not done is a test of the cold-start ordering itself, so the race is
  unproven in both directions. Not scheduled: no observed user-facing failure, and closing it
  blind risks moving the one source of truth for Option that P37 established. It becomes work the
  moment a ride is seen recording nothing.
- **A lane re-bases once per pointer event.** A knob that already holds a lane, Option-dragged
  while the deck is playing, re-bases that lane on every `param.set`: `setParam` in
  `src/app/execute.ts` re-arms it, and `scheduleAutomation` cancels the joined ramp once per
  event. Carried out of P37 and confirmed still live after P39, which coalesced the drag's
  _history_ into one entry and left the command stream exactly as long — every `param.set` still
  reaches `execute`. It is inaudible in that state, because the parameter is following the
  scheduled lane rather than the live move, so it is a behaviour question about what a move over
  a playing lane should mean, not a defect to patch: it belongs with the automation work and
  needs a named outcome before it is scheduled.
- **What the player deliberately does not do.** P62 shipped four variations — a jump distance, both
  ways or forward only, how hard the gate stutters, and how many times a slot repeats before the
  next jump — and left four things out on purpose, each recorded here rather than half-built. One
  of them left: P67 promoted "moving the numbers is heard from the next play" against the outcome
  that a person shaping a burst pattern cannot hear what they are shaping
  ([0096](decisions/0096-a-moved-number-re-derives-the-tail.md)). Three stay.
  **Neither a pause nor a seek resumes into a
  pattern** — both begin it again at its first step, because the walk is drawn from the seed at
  every play and nothing durable carries a cursor, which is the same property that makes two
  renders of one session the same file. The cost is that `deck.seek` on a jumping deck returns and
  holds a position the next play does not read from; closing it means letting the walk begin at the
  slot a position lands in, which is a change to what the first step of a pattern is and wants its
  own decision. **A loop whose slots are shorter than `PLAYER_MIN_SLOT_SECS` does not jump at all**:
  two fades have to fit inside a gated repeat and a third has to overlap the seam, and a deck with
  no loop has no grid to jump around, so both play their loop straight — and **a burst that comes
  to less than `PLAYER_MIN_SLOT_SECS` is played at it** for the same reason, so shortening the
  knob past there stops shortening the sound
  ([0108](decisions/0108-the-only-wait-between-two-jumps-is-the-clock.md)). **A gated repeat with less
  than three fades of room is played whole** rather than cut, because two automation curves that
  touch are one rounding error from the overlap Web Audio throws on. None of these is a defect;
  each becomes work the day a performance wants it
  ([0089](decisions/0089-a-jump-is-the-transports.md)).
- **The player pays two costs the chain's one bound source imposes.** `chain.bindSource` keeps a
  pointer to the last source it was handed (0031), and a jumping deck hands it one per armed step,
  so the chain's `deck.speed` target is whichever step was armed last — and `write` puts an
  _absolute_ rate on it. P67's hold multiplies that same `playbackRate` by a ratio the chain knows
  nothing about, so a `deck.speed` write can strip the ratio off a step reading at its own rate.
  Reachable two ways, both needing `hold > 0`: a `param.set` that re-sends the value the deck is
  already on, which returns before `player.rearm` and so is never repaired; and a step long enough
  to span the whole arming horizon — `repeats × burst` past it — which is
  therefore the last-armed step _and_ the sounding one, so the re-arm keeps it. **P96 made that
  second route deterministic rather than lucky** ([0134](decisions/0134-a-pattern-plays-the-repeats-it-was-set.md)):
  a step is now exactly its count of bursts, so any spec whose product clears the horizon spans it
  on every step where it used to need the draw to land high — and every source-count figure below,
  which was counted against a mean of `(repeats + 1) / 2` bursts, is now that much too high. P97
  gave the count a spread of its own ([0135](decisions/0135-the-repeats-dial-gets-its-own-door.md)),
  so the longest step a spec can lay down is `repeats + repeatsSpread` bursts rather than `repeats`
  — clipped to `PLAYER_REPEATS_MAX`, which is what these figures were already counted against. The
  second cost is
  the re-arm itself: it drops and rebuilds every step across the horizon, up to `MAX_PLAYER_STEPS`
  sources and gains, and a knob sends one `deck.player` per pointer event. Measured on the fake
  graph before P82: ~25,600 sources built across a hundred-event drag of a deck set to its
  shortest bursts. P82 halved the floor, which doubles both halves of that — the steps alive
  across the horizon at the floor, and the tail a drag rebuilds — and `MAX_PLAYER_STEPS` doubled
  with it ([0115](decisions/0115-the-burst-floor-is-the-seam-and-moves-with-it.md)); the 5ms floor
  halves it again and doubles all three terms again, `MAX_PLAYER_STEPS` with them
  ([0120](decisions/0120-the-seam-is-a-millisecond.md)).
  Neither is new in kind — `deck.speed` has re-armed per pointer event since
  ([0089](decisions/0089-a-jump-is-the-transports.md)) and the single binding is
  [0031](decisions/0031-rate-is-in-the-plan.md)'s. Not scheduled: the first closes by changing what
  source the chain holds and the second by the player's knobs declaring a gesture end the way a
  plugin's rebuild parameter does ([0090](decisions/0090-a-rebuild-is-declared-and-paid-at-the-gesture-end.md)),
  which is where they meet — one decision, taken once, rather than two patches. A third term rides on
  the same re-arm and nothing bounds it: `rearm` rebuilds the cursor with `playerWalk(spec, laid)`,
  which winds forward by re-running every step from the seed, and `laid` counts every step the pass
  has ever drawn and is reset only by `begin` — so the wind is O(how long the deck has been playing),
  paid once per pointer event. Counted: a hundred-event drag replays 4,502 pattern steps immediately
  after a `begin`, 604,020 one minute into the pass and 3,004,020 five minutes in at the burst floor;
  24,211 and 120,211 at the default burst. It is not skippable — the drawn sequence is a function of
  the spec being turned, so the tail cannot be continued from a cursor and has to be re-derived from
  the seed, which is the reproducibility 0089 is about — and it closes where the other two close, at
  the gesture end. P82's floor also put a second knob on the same door: the header's sync dial sends
  one `session.sync` per pointer event and `engine.setSync` fans it out to every voice, so its 4,687
  sources per drag multiply by the number of jumping yards where the player knob's do not.
- **`clip.apply` does not clear a field the clip does not carry.** The restoration stage list emits
  nothing for a `null` loop or a `null` player, and relies on `deck.load` — which every apply leads
  with — to clear both. That holds for the two fields that have one, and it is why P62 made a load
  clear the player the way it already cleared the loop. It does not generalise: a stage for a field
  no load resets would leave the applied deck holding something the clip does not, against 0027's
  "one deck rewritten to be exactly one clip". Not scheduled because no such field exists; it
  becomes work the day one is added, and the fix is a total stage rather than a wider `deck.load`.
- **The two structural splits.** `src/app/facade.ts` (798 lines) holds six cohabiting subjects, and
  `src/audio/deck.ts` (800, on the hard cap) holds a lane subsystem that is its own thing. Neither is a tidy-up: each
  moves where a boundary sits, so each needs a decision written before the move, and the human picks
  whether either happens at all. `facade.ts` is the one where the three
  `oxlint-disable max-lines-per-function` waivers (`:191`, `:328`, `:482`) read as a symptom of the
  cohabitation rather than a judgement about a long function; `deck.ts` carries one (`:143`).
  Two others went the other way under P62, forced rather than chosen: the hard 800-line cap
  ([0045](decisions/0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)) is not waivable, so the player's own
  transport left `deck.ts` for `src/audio/player.ts` and the four clip commands left `execute.ts`
  for `src/app/clips.ts` — the cohabitation `execute.ts`'s own header had already named.
- Live recording remains out of scope. Offline export is how audio leaves the app: the dialog P40
  landed, which is a spec for the render harness and never a second renderer
  ([0068](decisions/0068-an-export-is-a-render-spec.md)).
- Rearranger and paulstretch still wait until beat-aware looping and clips expose a concrete
  workflow. **The WASM rule lives here and nowhere else**, so there is one copy to edit: begin as
  pure JavaScript, measure with `./scripts/bench`, and move a kernel only when its absolute cost
  lands on a frame deadline or on a path someone is waiting through. Headroom is not the test —
  every sample loop in this instrument has headroom, and P27 measured all of it and moved nothing
  ([0058](decisions/0058-nothing-qualified-for-wasm.md)). A second language in the build is a
  stack decision and is asked about first ([0012](decisions/0012-no-one-feature-jumps-the-gate.md)).
  Stretching starts from what P14's key lock learned: WSOLA with a correlation search, never the
  two-tap kernel again ([0031](decisions/0031-rate-is-in-the-plan.md)).
- Destructive source editing beyond the crop P20 shipped: no trim history inside a source, no
  splice ([0047](decisions/0047-a-crop-mints-audio-the-user-did-not-import.md)).
- Per-deck routing, sends and a mixer are out of scope: every deck lands in the one master bus
  until a named outcome says otherwise.
- Vocoder, spectral-space variants, Twister-specific modes, and other narrow/high-cost effects
  require a named user outcome and must arrive one plugin at a time.
- Collaboration, accounts, cloud storage, and uploads conflict with the local-first product unless
  that product constraint is deliberately revisited.
- **The reload cliff, and why it is still ordered around.** The shape it was measured to have,
  once: browser work added before `persistenceSmoke`'s `page.reload()` stalls the reloaded page's
  audio clock, turning a ~70ms play into ~920ms — under ~175ms of added pre-reload work reliably
  safe, ~190ms stalling sometimes, past ~250ms stalling nearly always, probabilistic rather than a
  fixed threshold, and reproducing with the concurrent browser runs stubbed out. Then P65's
  tooltips cost the gate
  +180..+224ms on the stratified measure and were accepted on it, but the unstratified mean was
  +333ms, and the whole gap is `reload` stalling more often at head than at base: pooled over 62
  interleaved pairs, roughly 8 stalls against 19. That shape says ~175ms is reliably safe and P65
  adds ~24ms of render there, so either that is chance at n=62 or the cliff
  responds to something the measured shape does not yet name. Not scheduled as work because the
  mechanism is the unidentified one §3 sends to Chromium-side tracing; recorded so the
  next measurement starts from two data points rather than one. Anyone measuring the gate should
  record `reload`'s own duration and stratify on it, which is how both P65 numbers were obtained.
  **P83 did, and found no stalls at all.** An instrument was added for it — the scenario loop timed
  and printed, so `reload`'s entry is the whole of `scripts/smoke.d/reload.js` and a stall lands near
  ~950ms against an unstalled ~127ms, seven standard deviations apart. In 50 unmodified runs of the
  browser half `reload` took 122–138ms, mean 127, sd 3, with an empty stalled population: at n=50 and
  0 events the 95% upper bound on the stall rate is 5.8%, already under the ~13% the shape above implies.
  The cliff was then attacked directly by injecting 300, 600 and 1000ms of work immediately before
  `page.reload()`, as a main-thread busy spin and as a requestAnimationFrame layout thrash; at
  1000ms — 4× the "stalls nearly always" threshold — the six readings were 1126–1129ms, sd 1, every
  millisecond over the injection accounted for by the ordinary reload. And this sits on a baseline
  that already does 2021ms of real pre-reload scenario work. Elapsed pre-reload work is therefore not
  the trigger at any magnitude tested, which fits the observation above that P65's trigger was ~24ms
  of render — two orders of magnitude under what fails to trigger anything now. What is not proven is
  that the phenomenon never existed, so the ordering rule stands and is being paid for a stall nobody
  can currently find: `browser.js`'s scenario list is ordered around it and §3 tells every future
  feature that new browser work belongs after the reload. Retiring it needs the Chromium-side tracing
  §3 already asks for; keeping it costs every future browser scenario the cheaper pre-reload slot.
- **A dead audio device reads as a frozen clock, not as a failure.** Partway through P68 this
  machine's audio device went out and every headless `AudioContext` died with it: the clock froze
  at `0.005804988662131519`, no `deck.started` fired, and `scripts/smoke.d/keyboard.js` timed out
  while the page itself kept running — commands executed, events fired, the session autosaved. It
  was not the commit and not the dev server: `./scripts/check` failed identically at `1266bd5`,
  which had passed green an hour before, `drive` was serving its own preview at the time, and
  `./scripts/drive --stop` found no strays. It cleared on its own; `coreaudiod` was never
  restarted. Recorded because the symptom points at the wrong layer — a live page with a stopped
  clock looks like a scheduling bug and is a device. The gate has since passed at `ecee1c4`.

- **A second effect now sweeps its row, and the straight-tile shop evicts by age alone.** P106 maps
  `comp.knee` onto `chirp` ([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)),
  and a compressor at its own default knee of 30 of 40 reads a chirp of 0.45, which `stepped` leaves
  where it is — so every stock compressor takes the swept branch of `cutStraight`
  (`src/ui/moireCanvas.ts`) and asks for a tile as wide as the picture, keyed
  `profile|span|cycles|chirp`, instead of sharing the 64-pixel tile its profile alone used to name.
  Before this step only `filter.cutoff` could mint such a key. What that presses on is `tiles`:
  `straightTile` calls `hold(tiles, key, made, TILE_CACHE)` with no `used` predicate, so it evicts by
  age where the curved shop passes `curvedLately` for exactly this reason (`src/ui/driftTiles.ts`).
  A key varies per instance with its own `cycles` and per surface with its `span`, so three chirping
  instances with the strip and the overlay both up is six swept keys beside the resting profiles'
  own, which crosses the cap of 12 and makes every lookup miss on every painting — the state
  `TILE_CACHE`'s own comment says the number must not produce. Not scheduled: the fix is the
  `wantedLately` predicate the curved shop already has, passed to one `hold` call, and that is a
  change to the painter's cache policy rather than to a mapping — it belongs with whichever step
  next measures the picture's paintings ([0144](decisions/0144-the-picture-may-fall-behind-the-hand-may-not.md)),
  not with the sweep that declared the values.

- **Two of the drift's larger shapes are a decision before they are a step, and P106 leaves both
  where they are.** **Symmetry** — an effect claiming `symmetry: 2 | 4 | 6` and the field mirrored
  into quadrants or sextants — changes the silhouette of the picture rather than its texture, which
  is exactly why it is the cheapest big change on offer and exactly why P103 left it out: it fights
  [0131](decisions/0131-a-row-is-a-grating-and-the-picture-is-their-product.md)'s "a yard's items
  are read off each other rather than drawn beside each other", because a mirror is a second copy of
  the field placed next to the first. **Ink groups** — the product built in two or three passes,
  each holding a subset of rows and each cut out of a different token, so where the groups' fringes
  cross there is genuine two-colour interference rather than one hue everywhere — is the structural
  version of the colour ask and the one P102 stopped short of, because one canvas resolving one ink
  is assumed end to end, from `canvasSurface`'s single `getComputedStyle(canvas).color` to
  `inkThrough`'s one `fillStyle`. The narrower version of the same wall is written into
  [0141](decisions/0141-colour-is-something-an-effect-turns.md): a row cannot be cut once per
  channel either, because `destination-out` reads a source's alpha and discards its colour, so the
  moiré's own chromatic aberration wants a colour-carrying field rather than three more fills. Not
  scheduled: each needs the decision named above taken first —
  what a mirrored field is read against, and what a canvas is when it has more than one ink — and
  neither is a patch to a painter.
