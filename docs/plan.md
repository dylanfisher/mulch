# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is an any-number-of-decks instrument with a durable session, portable
archives, bounded undo/redo, effect racks holding instances, a gesture-relative lane on every
continuous parameter but the read rate, beat-aware loop snapping and sliding, a waveform a click
seeks in without the deck reading as stopped — at the top of the loop when the press lands outside
the segment being performed ([0041](decisions/0041-a-seek-is-transport-not-durable.md)) — a loop shaped by labelled IN and OUT handles in
their own strip that draw the boundary each holds down through the peaks and by a Shift-held
sweep of the peaks themselves, Shift meaning the loop and nothing else
([0066](decisions/0066-shift-is-the-loop.md)), per-deck speed and pitch, a clip rack that draws
what it holds, a toggleable
debug console, imports in every format the browser decodes through a picker or a drop on the
waveform, a generator picked from one menu however long that list grows — one of them a tone
that draws its own wave live rather than its peaks
([0100](decisions/0100-a-tone-draws-itself.md)) and is pitched in hertz by a knob of its own,
one second of a reference buffer read at whatever rate that pitch asks for, so a move bends it
rather than reloading it and no loop handle is offered on a wave with no beginning
([0110](decisions/0110-a-tone-is-read-at-the-rate-its-own-parameter-sets.md)), a crop that makes the loop the deck's whole source and a flatten that plays a yard's loop
once through everything it is going through and makes that the yard's whole source
([0112](decisions/0112-a-flatten-is-a-spec-the-one-harness-already-accepts.md)), audio that leaves through a File
dialog as a named, faded .wav the one render harness produced, playing the whole session for the
whole length whatever the transport was doing when the dialog opened
([0068](decisions/0068-an-export-is-a-render-spec.md),
[0077](decisions/0077-an-export-plays-the-whole-session.md)), a shell whose
routes hang off a menubar, whose fixed header rides over a scrolled instrument, and whose width and
header height are declared once and read by every surface that wears it
([0074](decisions/0074-both-screens-read-the-one-shell-width.md)),
controls that carry the primitive their behavior implies and one icon per action from a single
vocabulary ([0055](decisions/0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)), a rack that
folds from its own heading ([0106](decisions/0106-a-fold-is-its-own-heading.md)), of one card per instance all the same height whatever their captions say
([0093](decisions/0093-a-knob-caption-reserves-two-line-boxes.md)), whose effects are added from a
popover the registry renders, each entry
carrying the icon its own plugin declares ([0056](decisions/0056-an-effect-carries-its-own-icon.md)),
each card declaring its own width, reading its type, its ordinal and its drawn name out of its own
durable id, switching its bypass, copying itself with one command whose reducer expands into the
add, the values and the bypass
([0092](decisions/0092-an-effect-copies-itself-with-one-command.md)), and reordered by a drag of its own handle onto a landing slot the
wrapped layout resolves — or by the arrow keys on it
([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md),
[0076](decisions/0076-a-card-reads-itself-out-of-its-own-id.md)) — the tape's card among them
drawing two reels in the room its knobs leave, turning at the rate the deck reads at and wound by the repeat
it is holding, out of numbers the interface already had
([0101](decisions/0101-a-tape-draws-its-reels.md)) —
a newest-first event feed both log surfaces read, decks the interface calls yards, each carrying
an emoji and a generated name of its own drawn when it was added
([0057](decisions/0057-a-deck-is-called-a-yard.md)) from the pool its kind of thing draws from
([0075](decisions/0075-every-kind-of-thing-draws-from-its-own-pool.md)) — an effect instance's
name from an adjective pool times a noun pool, folded out of its own id
([0081](decisions/0081-an-effect-name-is-two-pools-multiplied.md)) — and each carrying a letter the
session spends when it draws it and never hands out again
([0082](decisions/0082-a-deck-letter-is-spent-when-it-is-drawn.md)), each reached through its
own group of a grip, capture, duplicate and remove and folded by its own heading, moved among the
others by a drag of that grip or the arrow keys on it — the rack's gesture one list up
([0111](decisions/0111-a-yard-lands-on-an-index-and-a-copy-lands-under-its-original.md)) — a copy
being one command the reducer expands into the restoration stage list, landing under the yard it
was taken from, and a playing yard wearing a still recycle mark that is a decoration
rather than a frame subscriber ([0078](decisions/0078-a-yard-is-duplicated-by-one-command.md)),
sample kernels measured and left in JavaScript ([0058](decisions/0058-nothing-qualified-for-wasm.md)),
a header of File and View menus over an instrument whose every label is Titlecase
([0059](decisions/0059-every-label-is-titlecase.md)), an event log that leaves through File as the
JSONL the ring holds ([0060](decisions/0060-the-ring-is-the-whole-exported-log.md)) over one toast
provider at the shell that declares the timeout a toast takes itself away after, a stereo peak
meter on the master bus's own pre-ceiling tap whose two bars run left to right and whose clip
indicator holds for a couple of seconds rather than latching
([0061](decisions/0061-the-master-meter-taps-the-bus-input.md),
[0083](decisions/0083-an-indicator-clears-itself.md)), a clip rack above the yards, each
yard reaching its transport and knobs before its peaks and naming itself in the readout above
them, a debug console counting the audio thread's load, the JS heap and what the decode cache
holds, with a dash for anything the browser will not answer
([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)), a tooltip on everything that
does something — every knob's caption, every transport and rack control, the player's two walks
and the drift's estimate — saying what it is and in what unit, out of the one place the
instrument's prose lives, after a rest near a second, never taking the slot of the control it
annotates and never the only place a meaning exists
([0094](decisions/0094-a-tooltip-annotates-a-control-and-never-becomes-one.md)), a ⌘/Ctrl+K palette that is a
second way to send and never a second command, over gestures whose construction is shared by every
surface offering them ([0069](decisions/0069-the-palette-is-a-second-way-to-send.md)) and whose
endings include the two nobody sends an event for
([0114](decisions/0114-a-capture-lost-is-a-gesture-over.md)), a per-frame
path measured end to end rather than argued about — one loop, reads that refill their scratch
instead of clearing it, and paints that write only what moved
([0070](decisions/0070-a-per-frame-read-refills-and-never-clears.md)), a lane whose span the dial above
its preview stretches after it was played
([0079](decisions/0079-a-lane-is-stretched-after-it-is-played.md)), a strip on every yard drawing
one row per lane as a wave of that lane's own period, shape and values — and one per instance in its
rack, folded out of its own id, so an effect is drawn whether or not anything is automating it —
overlapping a reference row of its loop so the rows beat against each other, at a pitch, spread and
ink read against the band each row gets rather than fixed, so a folded-down strip is a denser moiré
and not a coarser one ([0098](decisions/0098-a-row-is-drawn-against-its-own-band.md)) — across the
one window whichever size it is drawn at, opened large under the shell's own header and closed from
there or with Escape, and drawn in a folded yard's own header where the body it usually sits in has
gone ([0109](decisions/0109-the-drift-is-one-picture-at-two-sizes.md)), beside an estimate — never on the frame loop — of
how long the whole pattern takes to come back round, in one unit that escalates past where a
duration is a duration and then keeps counting in powers of that unit
([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)), a module in the rack's
own language on every yard — a section whose heading is the toggle that folds it, with the switch
that clears the pattern under that fold along with everything else, the fold being refused while
there is nothing under it
([0107](decisions/0107-a-module-is-a-card-and-a-fold-never-silences-it.md)) — that jumps the read
position around its loop's own sixteenths under a pattern drawn from a durable seed, sounding a burst of its own length there — varied, rested between and read at a rate
a hold lets go of — stuttering the gate inside it and crossfading every seam at
equal power, so the same session renders the same file and two seeds render two different ones
([0089](decisions/0089-a-jump-is-the-transports.md)), whose numbers are heard where they are turned
because a move cancels the steps past the fade horizon and re-derives the tail of the pattern from
the seed rather than a clock ([0096](decisions/0096-a-moved-number-re-derives-the-tail.md)), and
whose next step waits, where the session holds one, for a tick of the one jump clock every yard
reads — counted from the context's own zero, so two yards land together, sound nothing alike and
render the same file whichever of them was played first
([0097](decisions/0097-yards-jump-on-one-session-clock.md)) and, ungated, waits for nothing at all
where it holds none, its burst as short as a slot's sixteenth of a sixteenth — drawn on a log
curve, because everything under the floor it used to stop at is the bottom fiftieth of a linear
one — and played at the seam floor below
that, which is five fades and moves only when the fade does
([0108](decisions/0108-the-only-wait-between-two-jumps-is-the-clock.md),
[0115](decisions/0115-the-burst-floor-is-the-seam-and-moves-with-it.md)), a loop whose handles can be dragged under a
playing deck without throwing the playhead back to the top of it
([0091](decisions/0091-a-loop-move-keeps-the-playhead-that-survives-it.md)) and whose strip takes no
position from React at all, so nothing arriving mid-drag rewrites what the gesture is drawing
([0103](decisions/0103-the-loop-overlay-has-one-writer.md)), a knob whose plugin
has a buffer to rebuild for it heard at the first move of a drag and again when the hand lets go,
never in between ([0090](decisions/0090-a-rebuild-is-declared-and-paid-at-the-gesture-end.md)),
a live move ramped over its own gap however short that gap is
([0104](decisions/0104-a-join-is-the-gap-however-short.md)), a decode that names
the blob and the size it refused, one transport over all the yards — Space, claimed ahead of
whatever has focus and taken out of the dispatch so nothing focused answers it too
([0105](decisions/0105-a-claimed-key-leaves-the-dispatch.md)), and three header buttons
sending the ordinary per-deck commands a person pressing every yard in turn would have sent
([0095](decisions/0095-a-global-transport-press-is-the-per-deck-commands.md)) — and a fast browser
gate.
Implementation history belongs in [`docs/decisions`](decisions/); this document contains only the
path forward.

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
- **P20** — the crop: the first edit that writes audio nobody imported
  ([0047](decisions/0047-a-crop-mints-audio-the-user-did-not-import.md)).
- **P21** — the parameters that should have been automatable all along.
- **P22** — a seek that no longer flickers. **P23** — a loop with handles.
- **P24** — the shell the rack redesign hangs off. **P25** — the primitive pass beside it.
- **P26** — the rack itself. **P28** — the renaming, cheapest once those surfaces settled.
- **P27** — measured every WASM candidate and moved nothing
  ([0058](decisions/0058-nothing-qualified-for-wasm.md)).
- **P29** — the File/View header, and Titlecase everywhere
  ([0059](decisions/0059-every-label-is-titlecase.md)).
- **P30** — deleted `#/log`, sent the ring out through File as JSONL
  ([0060](decisions/0060-the-ring-is-the-whole-exported-log.md)), left the shell's toast provider.
- **P31** — a stereo peak meter on the master bus's pre-ceiling tap
  ([0061](decisions/0061-the-master-meter-taps-the-bus-input.md)).
- **P32** — the layout the yard steps rest on: clip rack over the yard list, transport and knobs
  above the peaks, a fold that is a view preference and nothing else (§2).
- **P33** — a yard's emoji and drawn name, carried by `deck.add`
  ([0057](decisions/0057-a-deck-is-called-a-yard.md)).
- **P34** — one card per rack row, dragged by its own handle or the arrow keys on it, no dnd-kit
  ([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md)).
- **P35** — the counters P42 measures by, dashed wherever the browser will not answer
  ([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)).
- **P36** — the per-frame paint: two attributes a frame for a knob following a lane.
- **P37** — the four automation defects: one source of truth for Option, a live move joined over its
  own cadence ([0065](decisions/0065-a-live-move-is-joined-over-its-own-cadence.md)), and every
  parameter declaring its precision
  ([0064](decisions/0064-a-parameter-declares-the-precision-it-reads-at.md)).
- **P38** — the loop's two surfaces agreeing, and Shift meaning the loop
  ([0066](decisions/0066-shift-is-the-loop.md)).
- **P39** — undo takes back a gesture, not a value
  ([0067](decisions/0067-a-gesture-is-one-history-entry.md)).
- **P40** — audio leaves through one door: an export is a spec for the one render harness
  ([0068](decisions/0068-an-export-is-a-render-spec.md)).
- **P41** — the palette is a second way to send and never a second command
  ([0069](decisions/0069-the-palette-is-a-second-way-to-send.md)).
- **P42** — measured the five per-frame claims one at a time and fixed the two that failed
  ([0070](decisions/0070-a-per-frame-read-refills-and-never-clears.md)).
- **P43** — an export past the arming horizon: the offline pump arms the lanes the wall-clock tick
  cannot ([0071](decisions/0071-the-offline-pump-arms-the-lanes.md)).
- **P44** — the ride that recorded nothing and the import of nothing that half-landed
  ([0072](decisions/0072-a-drag-ends-once-and-a-decode-of-nothing-is-refused.md)).
- **P45** — the palette remembers what you last ran, as an order rather than a pinned highlight
  ([0073](decisions/0073-the-palette-remembers-by-order.md)).
- **P46** — one width and one fixed header, read by both screens
  ([0074](decisions/0074-both-screens-read-the-one-shell-width.md)).
- **P47** — every kind of thing draws its name from its own pool
  ([0075](decisions/0075-every-kind-of-thing-draws-from-its-own-pool.md)).
- **P48** — the rack card: both halves of its reading derived from its own id, a width it declares
  itself, and a drop resolved against the two-dimensional layout that makes
  ([0076](decisions/0076-a-card-reads-itself-out-of-its-own-id.md)).
- **P49** — an export plays the whole session for its whole length, and the offline pump's agreement
  with the live tick is asserted at the seam rather than only in a browser
  ([0077](decisions/0077-an-export-plays-the-whole-session.md)).
- **P50** — the yard's own button group: capture where the thing being captured is, one
  `deck.duplicate` command whose reducer expands the restoration stage list, and a recycle mark
  that is a decoration rather than a frame subscriber
  ([0078](decisions/0078-a-yard-is-duplicated-by-one-command.md)).
- **P51** — the master meter's bars run left to right, and every debug counter's label carries the
  sentence saying what it counts, in what unit, and what its dash means — copy in `src/lib/copy.ts`
  with the rest of the words.
- **P52** — the clip rack reads as cards: a quarter-width card per clip inside the one card the rack
  is, its name text in the header and the field that changes it behind a pencil, so renaming is
  reached rather than displayed.
- **P53** — a lane is stretched after it is played: one `automation.span` command per drag on the
  preview's own span dial, which is the one editable thing on that picture
  ([0079](decisions/0079-a-lane-is-stretched-after-it-is-played.md)).
- **P54** — the moiré strip: one row per lane over a reference row of the loop, and how long the
  whole thing takes as one estimated unit that escalates past where a duration is a duration
  ([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)).
- **P55** — a name is two draws and a letter never comes back: an effect instance's name is an
  adjective pool times a noun pool, still folded out of its own id
  ([0081](decisions/0081-an-effect-name-is-two-pools-multiplied.md)), and the session carries the
  deck letters it has spent so a removed one is never handed out again
  ([0082](decisions/0082-a-deck-letter-is-spent-when-it-is-drawn.md)).
- **P56** — a signal clears itself: the one toast provider declares the timeout a toast takes
  itself away after, and the master clip indicator holds for a couple of seconds after the peak
  that lit it rather than latching until it is pressed
  ([0083](decisions/0083-an-indicator-clears-itself.md)).
- **P57** — two controls that read backwards, read forwards: the lane's span is an `xs` dial in the
  preview's top right that lengthens upwards, and the rack's switch is on for an effect that is
  running, with the caption gone ([0085](decisions/0085-a-control-reads-the-way-it-moves.md)).
- **P58** — the export door: a length typed as minutes and seconds over one number, defaulting to
  ten minutes, and a render that hands its samples back instead of leaving them in a context the
  browser will not let go of ([0086](decisions/0086-a-render-hands-its-samples-back.md)).
- **P59** — the drift picture is a moiré and the scale keeps counting: rows are continuous waves
  carrying the lane's own identity, and the estimate leaves the exact integers for logarithms
  rather than the flat last unit
  ([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)).
- **P60** — the two effects the browser already has nodes for: a compressor whose gain reduction is
  a meter read and never a durable value, and a convolution reverb over an impulse the app
  generates from its own decay and tone and rebuilds only when they change
  ([0087](decisions/0087-an-impulse-is-generated-and-rebuilt-on-change.md)).
- **P62** — the player: a jump moves where a deck reads from, which is the transport's, so it is
  the deck's own module beside the loop and not a rack plugin
  ([0089](decisions/0089-a-jump-is-the-transports.md)). The pattern is a pure function of a durable
  seed, every seam is an equal-power fade, and the same session renders the same file twice.
- **P63** — the three defects: a decode that fails says which blob and how many bytes it was
  handed, a loop move keeps the playhead that survives it
  ([0091](decisions/0091-a-loop-move-keeps-the-playhead-that-survives-it.md)), and a parameter
  whose plugin rebuilds something declares it, so a run of moves on it is held rather than built
  sixty times a second ([0090](decisions/0090-a-rebuild-is-declared-and-paid-at-the-gesture-end.md)).
- **P64** — the rack as one row: every knob caption spends two line boxes so a card is never
  taller than its neighbour ([0093](decisions/0093-a-knob-caption-reserves-two-line-boxes.md)), the
  compressor takes half a rack, an instance copies itself with one command
  ([0092](decisions/0092-an-effect-copies-itself-with-one-command.md)), the effects section folds
  as a view preference, and the recycle mark stopped moving.
- **P65** — one tooltip, on everything that does something: the words keyed by the lists the
  controls already come from, so a control with nothing written for it is a hole one test finds,
  after a delay near a second, handed the control rather than wrapping it — no slot of its own, no
  press it can swallow, and a trigger a keyboard reaches
  ([0094](decisions/0094-a-tooltip-annotates-a-control-and-never-becomes-one.md)).
- **P66** — one transport over all the yards: Space and three header buttons expand into the
  ordinary per-deck commands, one per yard, and the all-decks command is gone
  ([0095](decisions/0095-a-global-transport-press-is-the-per-deck-commands.md)).
- **P67** — the player's own clock: a burst with a length, a variance, a rest and a drifting read
  rate, and knobs heard where they are turned because a move re-derives the tail of the walk from
  the seed and a step count ([0096](decisions/0096-a-moved-number-re-derives-the-tail.md)).
- **P68** — yards that jump together: one session-level clock every player begins its next step
  on, counted from the context's own zero so a render never depends on which yard was played
  first, and everything else left per-deck
  ([0097](decisions/0097-yards-jump-on-one-session-clock.md)).
- **P69** — the moiré is interference at every height: the pitch, the spread and the two alphas are
  read against the band a row gets, and every instance in the rack draws a row of its own whether or
  not a lane bends it ([0098](decisions/0098-a-row-is-drawn-against-its-own-band.md)).
- **P70** — the generators became one menu, and one of them became an instrument: a tone whose
  pitch is dialled in hundredths of a hertz and which draws its own wave live, out of the same
  function that renders it ([0100](decisions/0100-a-tone-draws-itself.md)).
- **P71** — the tape draws its reels: two of them, turning at the rate the deck reads at and wound
  by the repeat it is holding, out of numbers the interface already had and none the graph had to
  start reporting ([0101](decisions/0101-a-tape-draws-its-reels.md)).
- **P72** — three defects: a key the registry claims leaves the dispatch entirely, so no focused
  control answers it as well ([0105](decisions/0105-a-claimed-key-leaves-the-dispatch.md)), the
  loop overlay has one writer — the other two suspects measured in Chromium
  and refuted ([0103](decisions/0103-the-loop-overlay-has-one-writer.md)) — and a live move is
  joined over its own gap however short that gap is
  ([0104](decisions/0104-a-join-is-the-gap-however-short.md)).
- **P73** — a card's whole heading is the control that folds it, the words inside the toggle and
  the caret beside them ([0106](decisions/0106-a-fold-is-its-own-heading.md)), and the tape's
  picture moved into the room its knobs leave, to the right of them and centred against them.
- **P74** — the player became a card in the rack's own language: a heading that folds it, dials at
  the rack's size and caption box, a sentence on every one of them, and a noun that names what it
  does — Jumps, decided in copy with the rest of the instrument's words
  ([0107](decisions/0107-a-module-is-a-card-and-a-fold-never-silences-it.md)).
- **P75** — the player's own timing, measured: an ungated yard with no clock already waits for
  nothing between two jumps, so every wait left is a knob's — the clock's tick or the gate — and
  the burst floor is a musical range, a slot's own sixteenth, with the seam floor left where it
  belongs, in the transport
  ([0108](decisions/0108-the-only-wait-between-two-jumps-is-the-clock.md)).
- **P76** — the drift is one picture at two sizes: one window whichever height it is drawn at, the
  large one under the shell's own header and closed by Escape, and a folded yard's own in the slack
  its header already had ([0109](decisions/0109-the-drift-is-one-picture-at-two-sizes.md)).
- **P77** — the generator is an instrument: a tone's pitch left the stored `SourceRef` and became
  `deck.tone`, a declared parameter read as a rate against a reference buffer, so it is turned on
  a knob and bends the wave instead of reloading it — and the menu that picks between generators
  says what its entries are ([0110](decisions/0110-a-tone-is-read-at-the-rate-its-own-parameter-sets.md)).
- **P78** — the yards are in an order the session holds: one `deck.reorder` naming the index a
  yard lands on, reached by the rack's own drag of a grip or the arrow keys on it — one module
  now, because sharing it bent nothing — and `deck.duplicate` carrying where its copy goes, so a
  copy arrives under the yard it was taken from
  ([0111](decisions/0111-a-yard-lands-on-an-index-and-a-copy-lands-under-its-original.md)).
- **P79** — a clip that carries the sound its effects made: one yard's loop for one pass is a
  spec the one render harness already accepts, handed a head to drop and a repository to land in,
  and the flattened yard is the bytes at rest
  ([0112](decisions/0112-a-flatten-is-a-spec-the-one-harness-already-accepts.md)).
- **P80** — one header, one height: the shell declares how tall its header row stands, at the
  measure the menubar already sets, so the instrument, the primitives page and the drift's overlay
  no longer stand 56px, 52px and 52px and the title line stops moving when the overlay opens.
- **P81** — a gesture nobody reported the end of is over anyway: the pointer skeleton wires the
  lost capture itself and reads a move or a press with no button down as the ending, so four
  surfaces stopped stating that rule and two that never stated it now have it
  ([0114](decisions/0114-a-capture-lost-is-a-gesture-over.md)) — and a press outside a loop asks
  for the top of it instead of for nothing, which is
  [0041](decisions/0041-a-seek-is-transport-not-durable.md)'s clause amended rather than
  contradicted.

- **P82** — the jumps module drawn the way the rack under it is drawn, its switch under its own
  fold ([0107](decisions/0107-a-module-is-a-card-and-a-fold-never-silences-it.md) amended); the
  knob that was called Drift renamed Hold, in the durable spec and not only on the caption; and a
  burst that can reach its floor, the fade halved to move it
  ([0115](decisions/0115-the-burst-floor-is-the-seam-and-moves-with-it.md)).

None of them got a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

### Scheduled, in order

Three steps, none of which depends on another and none of which moves a durable shape — the one
that did has run. Each states what durable shape it moves before it is started; that is what makes
a step expensive and it is the first thing to state. None of them is a new capability: all three
are a sweep of the whole of `src/` rather than of one surface — what it costs, what is proven, and
what is said twice. §4 still holds what is deliberately not scheduled and why, and nothing in it
becomes work by being read.

P83, P84 and P85 are wide rather than deep, so each fans out: up to six subagents, one
non-overlapping territory each, run concurrently, every one of them handed the standing clauses in
[subagent-prompt.md](subagent-prompt.md) verbatim — report to a path outside the repo, watch the
test fail, print no new warnings, waive at the site, four review lenses, interleave base and head.
Six is a ceiling and not a target: a territory that is one file does not get an agent. A fan-out
agent **finds and reports; it does not merge** — the orchestrator reads the report files, decides
what lands, and does the writing wherever a change crosses two territories, because a shared
constant edited by two agents at once is the one thing this shape can get wrong. Each of the three
runs the gate once at the end, whole (`./scripts/fix` then `./scripts/check`), rather than six
times in parallel against one working tree.

**P83 — What it costs, measured before it is argued about.** A performance review of the whole
instrument, run the way §3 says numbers are obtained and not by reading code and guessing.
`./scripts/profile --compare` against `.profile-history.jsonl`, `./scripts/bench` for the pure
kernels, and the gate's own mean are the three instruments; nothing here asserts, and nothing here
gets a golden ([0050](decisions/0050-the-gate-counts-things-and-the-profiler-measures-them.md),
[0051](decisions/0051-the-profiler-remembers-its-own-runs.md)). Six territories, one agent each:
the per-frame path (the one loop, `peek`/`peaks`, every ref-driven paint — 0070's rule is that a
read refills and never clears, so the finding is any allocation on the frame); the audio graph's
build and rebuild cost (chain construction, rack add/remove churn, the player's re-arm, ramp
scheduling); the offline render and export path, where §4 already records a 13% cost and a 331MB
peak that are prices rather than defects and must not be re-reported as news; the store, the
reducer and the command stream (how many `execute` calls a pointer drag sends, what re-renders
under one); the sample kernels in `src/lib` under `./scripts/bench`, against 0058's rule that
headroom is not the test; and the gate itself, whose reload cliff §3 and §4 both describe and where
any measurement stratifies on `reload`'s own duration. Every finding lands as a number with the
command that produced it beside it, and a run's spread is wider than most of what is being
measured, so a single lucky run is not a finding (§3). What comes back sorts into three piles: a
cost with a fix cheap enough to take in this step and prove; a cost that is real and expensive,
which becomes a §4 entry naming what would close it and what that trades; and a cost that was
measured, attributed and kept, which is `./scripts/profile --accept WHY` and a new baseline
(0051). Durable shape: none. Proof: the numbers themselves, plus a test for any fix that lands —
and `--compare` twice in a row at the end, because that is the shape that caught the last two
regressions.

**P84 — Every behaviour has proof at the layer that owns it.** 83 test files against 146 modules,
and 71 of those modules have no colocated test at all — which is not 71 gaps, because the seams
prove most of them from above through `createInstrument` and its manual clock. The step is to find
out which of the 71 are actually unproven, and the answer is per-file rather than per-count. Six
territories, one agent each, drawn on the tiers `docs/map.md` already declares: `src/lib`
(pure — anything unproven here is unproven, there is no seam above it); `src/audio` (graph
lifecycle and sound, proven by offline `render()`, which §3 names as the cheap place); `src/app`
(commands, events, history, failure atomicity — `execute.ts` is the largest module with no
colocated test in the repo and is reached only from above); `src/state` (persistence, archives,
the repository, and what 0026 says happens to data that no longer validates); `src/ui` (focus,
pointer and gesture, where the skeleton is the thing to prove and not each surface over it); and
the browser runs — `scripts/smoke.d` and `./scripts/drive` — where the question is which
scenarios assert and which merely visit. Each agent reports, per file, whether the behaviour is
proven from above, and if not, the one cheapest test that would fail without the code. Then the
tests get written, and the standing clause applies to every one of them: revert the source, watch
it fail, keep the failure message. A test nobody saw fail is not proof. Two things this step does
not do — it adds no coverage tool and no coverage threshold, because a percentage is a number
nobody can act on and the gate counts things rather than measuring them (0050); and it writes no
test that only restates the implementation, which is cost in the gate and proof of nothing. New
browser work obeys §3's cliff: after the reload, or a render instead. Durable shape: none. Proof:
the gate, and its mean, which this step is the most likely of the three to move — 250ms is the
line and the human is asked before it is crossed
([0012](decisions/0012-no-one-feature-jumps-the-gate.md)).

**P85 — One fact, one place.** A sweep for principle 1 across all of `src/`: a constant, type,
config value or copy string that is declared twice, and a rule stated in more than one place so
that the two can drift. P81 is the shape to look for — one rule about ending a gesture, written
in four surfaces and missing from two ([0114](decisions/0114-a-capture-lost-is-a-gesture-over.md))
— and it was found by reading a defect, not by looking. This
step looks. Six territories, one agent each, matching P84's tiers so the two steps' reports can be
read side by side; `./scripts/map` is where each starts, because searching before creating is the
same discipline as finding what was already created twice. What counts as a finding: the same
number in two files; a derived value re-derived rather than imported; a copy string that exists
outside `src/lib/copy.ts`; a validator and a knob range that each state a bound; a rule about
behaviour spelled out per call site instead of held by the thing they all call. What does not:
a second occurrence, which is not yet an abstraction (principle 3), and anything whose de-duplication
would move a tier boundary. The two structural splits §4 names — `facade.ts` and `deck.ts`, both at
the hard 800-line cap — stay out of this step by name: each moves where a boundary sits, each needs
a decision written first, and the human picks whether either happens at all. So does any rename
that reaches a durable key, which is the kind of work a step of its own states its durable shape
for, the way P82's Drift-to-Hold did. The orchestrator
does the landing, one collapse at a time, each with the gate run after it, because a shared
constant is exactly where six concurrent agents collide. A collapse that turns out to constrain
future changes gets its decision written, as long as the decision is and not a line longer.
Durable shape: none — anything that would move a stored key is out of scope above. Proof: the gate
green after each collapse, `./scripts/arch` unmoved, and for any rule that was stated N times and
is now held once, a test on the thing that now holds it.

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

**The gate's headroom is not where it looks.** Measure a change by stashing it and comparing means
across several runs; a single run's spread is wider than most features cost, and one lucky
measurement has already produced a wrong figure twice. More importantly, the smoke sits near a
non-linear cliff: adding browser work _before_ `persistenceSmoke`'s `page.reload()` stalls the
reloaded page's audio clock, turning a ~70 ms play into ~920 ms and costing the gate most of a
second. Measured shape — under ~175 ms of added pre-reload work is reliably safe, ~190 ms stalls
sometimes, and past ~250 ms it stalls nearly always. It is probabilistic, not a fixed threshold.
Contention with the concurrent browser runs was ruled out by stubbing them: the stall reproduces
alone, at zero delay. The mechanism is unidentified and needs Chromium-side tracing.

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
  reset, so the cost is `./scripts/profile --accept`'s to carry whenever someone runs it — until
  then the band keeps flagging the three commits after it for a change none of them made. The
  profiler blocks nothing (0051), and 0.25ms a
  repaint for a 12× finer strip may simply be the price.

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
  Reachable two ways, both narrow and both needing `hold > 0`: a `param.set` that re-sends the value the deck is
  already on, which returns before `player.rearm` and so is never repaired; and a step long enough
  to span the whole arming horizon — `burst` and `repeats` both near their maxima — which is
  therefore the last-armed step _and_ the sounding one, so the re-arm keeps it. The second cost is
  the re-arm itself: it drops and rebuilds every step across the horizon, up to `MAX_PLAYER_STEPS`
  sources and gains, and a knob sends one `deck.player` per pointer event. Measured on the fake
  graph before P82: ~25,600 sources built across a hundred-event drag of a deck set to its
  shortest bursts. P82 halved the floor, which doubles both halves of that — the steps alive
  across the horizon at the floor, and the tail a drag rebuilds — and `MAX_PLAYER_STEPS` doubled
  with it ([0115](decisions/0115-the-burst-floor-is-the-seam-and-moves-with-it.md)).
  Neither is new in kind — `deck.speed` has re-armed per pointer event since
  ([0089](decisions/0089-a-jump-is-the-transports.md)) and the single binding is
  [0031](decisions/0031-rate-is-in-the-plan.md)'s. Not scheduled: the first closes by changing what
  source the chain holds and the second by the player's knobs declaring a gesture end the way a
  plugin's rebuild parameter does ([0090](decisions/0090-a-rebuild-is-declared-and-paid-at-the-gesture-end.md)),
  which is where they meet — one decision, taken once, rather than two patches.
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
- **The reload cliff may be more sensitive than §3 describes.** P65's tooltips cost the gate
  +180..+224ms on the stratified measure and were accepted on it, but the unstratified mean was
  +333ms, and the whole gap is `reload` stalling more often at head than at base: pooled over 62
  interleaved pairs, roughly 8 stalls against 19. §3 says under ~175ms of added pre-reload work is
  reliably safe and P65 adds ~24ms of render there, so either that is chance at n=62 or the cliff
  responds to something the measured shape does not yet name. Not scheduled as work because the
  mechanism is the same unidentified one §3 already sends to Chromium-side tracing; recorded so the
  next measurement starts from two data points rather than one. Anyone measuring the gate should
  record `reload`'s own duration and stratify on it, which is how both P65 numbers were obtained.
- **A dead audio device reads as a frozen clock, not as a failure.** Partway through P68 this
  machine's audio device went out and every headless `AudioContext` died with it: the clock froze
  at `0.005804988662131519`, no `deck.started` fired, and `scripts/smoke.d/keyboard.js` timed out
  while the page itself kept running — commands executed, events fired, the session autosaved. It
  was not the commit and not the dev server: `./scripts/check` failed identically at `1266bd5`,
  which had passed green an hour before, `drive` was serving its own preview at the time, and
  `./scripts/drive --stop` found no strays. It cleared on its own; `coreaudiod` was never
  restarted. Recorded because the symptom points at the wrong layer — a live page with a stopped
  clock looks like a scheduling bug and is a device. The gate has since passed at `ecee1c4`.
