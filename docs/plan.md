# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The baseline is an any-number-of-decks instrument — decks the interface calls yards — with a
durable session, portable archives, bounded undo/redo, and a menubar shell over a scrolled
instrument. A yard holds a source (imported in any format the browser decodes, or drawn from the
generator menu), a beat-aware loop with its own handles, a rack of effect instances, a jump
module, and a moiré drift picture of everything automating it. Every continuous parameter but the
read rate carries a gesture-relative lane. Audio leaves through one render harness — a .wav
through the File dialog, a crop, a flatten — and a ⌘/Ctrl+K palette is a second way to send the
same commands the screen sends.

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
- **P38** — the loop's two surfaces agreeing, and Shift meaning the loop ([0066](decisions/0066-shift-is-the-loop.md)).
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

None of them got a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

### Scheduled, in order

Four steps. Each states what durable shape it moves before it is started; that is what makes a step
expensive and it is the first thing to state, and none of these four moves any — P87 spent the one
durable move this sequence had. All three sweeps have now run: what it costs, what is proven, and
what is said twice. These four come from a session at the instrument and are ordered defects
first: what is wrong where a hand already goes, then the two pictures, then the door audio leaves
by. §4 still holds what is deliberately not scheduled and why, and nothing in it becomes work by
being read.

**P88 — A recording is the whole press, not the moving part of it.** Holding Option and pressing a
knob begins the recording; releasing ends it. Today only movement is captured, so a press held
still for four seconds, moved quickly, then held still for another four records the quick move and
nothing else — an eight-second gesture stored as a fraction of a second, replayed on a span that
was never performed. The lane runs from press to release and holds its value across the still
stretches, which is what [0065](decisions/0065-a-live-move-is-joined-over-its-own-cadence.md)'s
own cadence already implies and what [0114](decisions/0114-a-capture-lost-is-a-gesture-over.md)
makes the end of. Watch the thinning §4 already prices: a still press must not write a point per
frame it did nothing in. Durable shape: none — a lane holds the shape it always held; what changes
is where it starts and stops. Proof: a test that a press held still, moved, then held still again
produces one lane spanning the whole press, with the value flat across each still stretch and the
point count bounded.

**P89 — The tape draws two reels at every value.** `src/ui/TapeReels.tsx`, the picture
[0101](decisions/0101-a-tape-draws-its-reels.md) made out of numbers the interface already had.
At the bottom and the top of Amount one reel's circle collapses to nothing and the drawing loses
half of what it is; a reel is a reel at every value, so its radius maps onto a floor rather than
onto zero. The picture also wants to be larger, filling the room P73 left it beside the knobs.
Durable shape: none. Proof: a canvas test asserting both reels have a radius above the floor at
each end of the amount range, and at the midpoint.

**P90 — The moiré as a screen someone filmed.** The drift strip draws true interference
([0098](decisions/0098-a-row-is-drawn-against-its-own-band.md)); what a camera pointed at a
monitor adds is what makes the pattern read as glitch. The reference is on the human's desktop and
is watched before anything is written — `~/Desktop/moire.mov` and the five stills
`~/Desktop/Screenshot 2026-08-22 at 11.42.{24,27,30,34,38} AM.jpg` — and what comes out of
watching it is a short list of named effects (a rolling shutter band, fringing on the subpixel
grid, a beat between the scan rate and the frame rate, whatever else is actually there), each one
either had inside `src/ui/moireCanvas.ts`'s existing per-row band drawing and the one window's
frame budget §4 measured, or written into §4 as not had and why. No second RAF loop, no shader
dependency, no new dependency at all without asking (principle 7). Durable shape: none — the
drift picture is a view and nothing about it is stored. Proof: `moireCanvas` tests over whatever
term lands, and the window's churn measured against the figure §4 already holds.

**P91 — An export is a folder, named after what it came from.** The Export Audio dialog gets one
checkbox, checked by default, to write the session beside the audio; both files land in a single
directory rather than as two downloads a person has to pair up themselves. The session file takes
the descriptive naming the audio export already has, and when a yard's source was an imported file
its name is carried into both — so a session built on `birds.wav` exports as audio and session
that say so. One naming function producing both names, declared once and imported by both callers
(principle 1), with its words in `src/lib/copy.ts`; nothing about a render spec changes
([0068](decisions/0068-an-export-is-a-render-spec.md)), only what the door writes and what it
calls it. Durable shape: none in the session — the archive's filename and the export's layout
change, and pre-release nothing reads the old names
([0026](decisions/0026-pre-release-has-no-migrations.md)). Proof: a unit test of the naming over
its cases — no import, one import, several yards importing different files, a name the filesystem
will not take — and the export browser scenario asserting both files arrive together with the
checkbox left alone.

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
  (0051), and 0.25ms a repaint for a 12× finer strip may simply be the price.

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
