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
The pattern a yard jumps is arranged as songs of parts, each tier named, ordered and
saying how many times it goes round, with a part carrying the dials it was captured from — or drawn
by the pattern itself, which holds a hand's own run untouched meanwhile.
An automator grows a run of effects in a rack of its own, breathing between a floor and a ceiling at
the odds a turn lays anything, bounded by a window a hand may put on any parameter its pool draws —
read off the pool's own declarations, so a knob added to a plugin is bounded by construction, and
reached from a grid of buttons under its dials, one per entry in that entry's own icon, each
opening how often it is drawn and inside what (0233) — and kept alive by one Wander dial beside
Stray, which moves what is standing on a clock of its own, well under the run's turnover, each
moved value a ramp its row's dial travels rather than arrives ahead of (0234). Its run can be held still by hand — a Wait dial said in
seconds, and an hourglass at the head of the run that asks for that time again, up to a lock with no
end (0215). A yard running one, or jumping, is told its picture
never comes round rather than given a figure (0208, 0210).
Every continuous parameter except the read rate carries a gesture-relative lane. Audio leaves
through one render harness: the File dialog writes a folder holding the .wav and the session that
made it, or a crop, or a flatten, and a take begins where the ear is — warmed to the second the
button was pressed, or to a lookback behind it (0216). A render measures itself as it goes, so the
button counts a take down off the rate that render has observed and the dialog offers a figure
beforehand only where this session has measured one (0227). A ⌘/Ctrl+K palette sends the same
commands the screen sends.

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
rather than a feature nobody has asked for. All of them are done: the walk's lanes each
say which tier they are and the name of the row standing in them, copied per frame off the segment
the same painting lit (P163); the switch on the mulcher card is a bypass rather than a discard —
`PlayerSpec` carries `bypassed`, `playerSounding` is the one reader of it, and turning the module
off keeps the seed, the song, the kept grounds and every dial the hand turned (P164, 0225); and the
`+` on the kept row adds the ground the window is on and never takes one away, with `keepBed` and
`plantBed` as the two gestures' two arithmetics (P165, 0226); and the export door says how long it
is going to take, off a rate the harness measured rather than one anybody wrote down (P166, 0227).

The run then turns to **the picture, and what it is a picture of**. The first of the three is done:
every row in the drift was a picture of an input — a knob, one instance's meter, a clock — and now
one row in every picture is the sound that actually comes out, on the session's own clock, cut by
the level of the master bus and spaced by how bright the same window reads (P167). The second is done too: the picture's
sharpest feature, the rosette two crossing axes throw, no longer happens once in the middle and
holds still — a curved row rests where its own fold puts it and its anchor is carried around that
rest by its own phase and its own meter, along the ladder its tile is already keyed on (P168, 0229).
And the third is done: a rack six times busier no longer draws six times as many rows and never a
deeper one — every row an automator grew is drawn at as many scales as the run is holding, capped
at what the picture can carry, and the whole set's extra fills are shared out under one budget
(P169, 0230). All three are read off the same picture and were one subject: what the drift draws
when nobody is turning anything.

The subject the last run of steps had was **what an arrangement looks like
while it is playing**, and it is finished: a step carries `SongPlace` — which song, which round of
it, and the jumps still to come of the part and of that round — the two tiers' rows
wear a play mark and a countdown off it (P155) — a clock and no word, what the number counts being
the slot's own label written once at mount rather than a string a frame composes (P162,
`GROWTH_LEFT_LABEL`) — the walk's own picture says where it waits and draws
its run as two lanes and its boundaries as two weights of rule off that same place (P156), the
ground comes round on the song's round off it too (P158), both tiers wear names drawn off their own
ids rather than four characters of them (P160, 0223), and the drift now has a row per tier and a
field the ground turns and anchors (P161, 0224) — and travels to, over a fraction of the landing,
rather than arriving at (P174, 0235). The album that made those three is gone (P170,
0231).

The place is on the step, and every one of those reads it: nothing below may re-derive one.

The run then turns to **what the instrument asks a hand to do, and what it asks for twice**. The
tier that was the tier under it with a different word on it has gone (P170, 0231); what is left is a
picture of the walk, which is now only that and no longer a second road to two numbers not on it
(P171, 0232); the pool of eight that was drawn as eight numbers among the numbers shaping the run is
now eight buttons in its entries' own icons, each opening how often it is drawn and inside what
(P172, 0233); a run of dials that arrived where they were going before the sound did and then stood
still for two minutes now travels on the wander's own clock and is read off it at every frame
(P173, 0234); and a field that teleported on a jump whose whole meaning is a distance now travels
that distance, over a fraction of the landing the jump is timed by (P174, 0235). Three of the four
were subtractions, and that is the shape of the subject: every one of them was a second way of
saying something the instrument already says.

The run ends by turning on itself. **What no step had ever read was the tree.** Five territories
read `src/` for a fact declared twice, a behaviour nobody asserts and a cost on a per-frame path, and
what came back was that every one of the five found the first of those nowhere: 85,255 lines and no
duplicate declaration to collapse (P175, §4). What landed instead was the coverage the same read
found — five modules and one memo nobody asserted — and the negative proof, which went to the
invariant two lenses had verified by hand rather than to a duplicate that did not exist
([0236](decisions/0236-the-colour-boundary-is-a-gate-rule.md)). The last pass measured what the
picture run cost against the profiler's own history, and what it found was that the run cost nothing
the instruments can see: across twenty rack cycles nothing the churn builds is retained, and no
metric the profiler tracks left its band (P176). What it also found is that two of its three
questions cannot be asked on this machine at all — one because the profiler samples its frames with
the rack back at zero, one because the gate's browser step had no audio device (it has one again,
and §4 says what running the six held-back proofs then found) — and that the one
allocation P175 left it is on a path no instrument here can reach, so it was recorded rather than
landed ([0237](decisions/0237-a-cost-no-instrument-can-price-is-not-paid-down.md), §4).

Document order is the run order. Nothing is scheduled: the run is finished, and the next one comes
in through this section.

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
  P169 made its own room the same way before landing: `src/lib/moire.ts` was at 790 and the grating
  maths — how deep a stack cuts, what one grating keeps, the fan a fold spreads a row through and
  the band every spacing is held inside — went to `src/lib/moireGrating.ts`, leaving 721.
- A tier above the song costs no command and no road — `deck.player` already carries the whole
  spec, so P147's album was a shape, a validator and a section, not a fourth command — and that
  cheapness is exactly why it was built and why P170 took it out again (0231). **What a tier has to
  earn is a fact of its own**, not a place in the nesting; the next one that cannot name one is not
  a tier. What the album actually cost was room, and the room came back: `src/lib/playerSongs.ts`
  lost the 400-line waiver it carried, `src/lib/playerWalkAlbum.test.ts` went entirely, and
  `src/ui/PlayerSongRow.tsx` draws one list where it drew the same one twice.
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
  ([0213](decisions/0213-a-reading-of-the-output-belongs-to-the-field.md)). P167's was the fourth and
  the only one that is nobody's yard — a row for the master bus, in the run-free set of every
  picture at once — and it cost the room as well as the assertions: the field's rows and the shape of
  the per-frame read now live in `src/ui/moireRowsField.ts`, which took 216 lines off `moireRows.ts`
  and left it at 596 of the 800.
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

**The audio device came back, the seven unrun proofs were run, and one of them failed.** On
2026-08-31 Chromium found an output device again — the instrument's clock reached 13.6s where it
had stood at 0.0058s — so `./scripts/check`'s drive step executed for the first time since P169.
It stopped in `scripts/smoke.d/narrow.js`: all six rows of a run ran 6px past their own right edge
at a 360px viewport. Attributed by running that one scenario against three worktrees — clean at
b6d0f6e (P171) and b58ac5a (P172), 6px over at 8752fff (P173) — and repaired in 047c700, which is
the paragraph on P173 below. With that fixed the gate passes whole, drive included, so the entries
below now say what each step's proof found rather than that it was not taken. One thing measured on
the way is not fixed and is not caught by any assertion: a row that is _holding_ something wears a
picture, and that picture and its gap are 20px the row has no budget for, so at 360px such a row
stands 2px past its edge with its name already at nothing. `narrow.js` adds an automator but grows
nothing, so no row it measures is wearing one. The row cannot hold six columns and an icon at that
width — which column dies is a design question and not a repair, so it is recorded here.

**P176 answered one of its three questions, and the other two cannot be asked on this machine.** The
one it answered is the first and cheapest: nothing the rack's churn builds is retained. Over five
interleaved `./scripts/profile` runs on 2026-08-31 between 06:07 and 06:20, at 20 and 60 cycles
alternately, all seven tracked prototypes settle to a delta of nought in every run; the JS heap grows
1.59–1.62 MB across 20 cycles and 1.86–1.91 MB across 60, which is 1.19 times the heap for three
times the churn and therefore boot residue rather than anything per cycle; and the DOM node growth,
which reads +9 twice and +190 once at 20 cycles against +191, +193 and +191 at 60, does not scale
with the churn at all and is the counter being read before Blink has torn the last cycle's rows down
— the un-polled column the profiler's own note warns about, and exactly what the gate's polled
`scripts/smoke.d/leaks.js` exists to assert instead. The comparison run at `3f93b54` reads a realtime
factor of 60.6x against a median of 53.3x and a band of 52.6x–71.4x, a churn wall clock of 242ms
against a median of 246ms and a band of 240–269ms, a frame p95 of 10.4ms against a median of 10.4ms
and a band of 9.3–10.4ms, and a heap delta of 1.34 MB against a median of 1.28 MB and a band of
1.27–1.32 MB, all read against the last ten runs at 20 cycles on this machine. Nothing is flagged.
The whole picture run — P161 through P175 — is inside that history, and across it the medians move
from a churn of 244ms and a heap delta of 1.25 MB on 2026-08-29 to 243ms and 1.30 MB on 2026-08-31,
with the frame p95 flat at 10.3–10.4ms throughout. So the run of picture steps cost nothing the
profiler can see, and there was nothing for this step to attribute or pay down.

**P176's second question was half asked: a stop's bake is measured and stops per second is not.**
What a stop costs came off `./scripts/bench` on 2026-08-31 at 06:22, seven timed runs per case after
one warm-up, at the dearest of the ten profiles: one `curvedField` bake is 3.8ms ± 0.0 to 5.5ms ± 0.0
at the strip a row is cut from, 48.8ms ± 0.1 to 56.5ms ± 0.4 at a yard's card, and 272.1ms ± 0.8 to
536.8ms ± 622.1 at the picture opened in its own window — against a `DRIFT_PAINT_MS` budget of
41.7ms, which the card-sized bake clears on its own and the window-sized one clears by seven to
thirteen times. That is the number 0144's one-bake-a-painting rule is holding back, and it is worth
saying in absolute milliseconds because 0058 rejected WASM on absolute cost on a path someone waits
on and this is the first kernel in the tree over that bar; nothing was done about it here, because a
port is a crate, a build step and a toolchain, and P176's own text forbids it building anything. What
is missing is the other half of the question — how many stops a second a busy rack actually asks
for — and nothing in the repo can answer it: `./scripts/profile` samples its 60 frames after the
churn loop with the rack back at zero effects, so it never has a curved row on screen while it is
timing, and counting bakes at runtime would mean a counter in the painter, which is an instrument
this step may not build.

**P176's third question could not be asked: the gate's mean is mostly `drive`, and `drive` cannot
run.** 0012's step size is 250ms and §3's figure is 7425ms of a 7471ms mean inside `drive` at
`88173b2`; whether the 4.7s of slack §3 describes is still there is a fact about fourteen interleaved
runs of a gate that completes, and this machine's audio device has been gone all day — the clock
stops at ~0.0058s of 0.2558s in `scripts/smoke.d/keyboard.js:42`, the same failure P170 through P175
record, verified at `c08dfbb` in a separate worktree before this step started. A mean taken with its
largest step dying at a fifth of a second is not the mean §3 measured, and comparing it to §3's
number would be comparing two different gates as well as two different windows, which §3 forbids
twice over. The device has since come back and the gate completes again, so the question is askable
now — it has not been asked, because asking it is fourteen interleaved runs and nothing since has
been a step that owns a clock.

**P176 declined `bandOf`, which P175 left it, and wrote the rule down rather than the fix.** The
allocation is real and was re-read: `bandOf` (`src/ui/playerScopeCanvas.ts:29`) returns a fresh
`{ top, deep }` from four sites in one painting, so a sheet of twenty-four landings allocates a
hundred-odd short-lived objects per painting at `PLAYER_SCOPE_PAINT_HZ` = 20 while a card plays. No
instrument in this repo can price it. The profiler never opens a player card and samples its frames
with the rack at zero; `./scripts/bench` is pure `src/lib` kernels and this needs a canvas; and the
gate may assert nothing continuous (0050). A hoist to one band per slot per painting is three
signature changes in one file and the eleven-case recording-context test P175 left would hold it
still, so the fix is cheap — and landing it would still be a change nobody had priced, which is the
one thing this step's own text refuses. Recorded as
[0237](decisions/0237-a-cost-no-instrument-can-price-is-not-paid-down.md) so the next reader does not
have to re-derive it. A Sonnet reading pass over the frame paths beside it found no second instance
of the same shape: the three per-frame string builds it did find — `order.key` and `order.slot` in
`placeCurved` and the swept key in `cutStraight` (`src/ui/moireCanvas.ts:283`, `:290`, `:452`), plus
`screenOf`'s key at `src/ui/moireScreen.ts:570` — are cache keys, so removing the string means
changing what the caches are keyed on rather than hoisting anything, and the three object literals in
`bedGround` are already weighed and accepted in `src/ui/moireRows.ts`'s own comment.

**P176 landed with its browser proof unrun, and nothing else was flagged by it. It is proven now
and it is clean.** The drive step failed on the same gone audio device the six entries above record,
in the step's one gate run, every other step passing clean; it has since run whole and passed.
Nothing this step landed could change what a browser draws in any case: it is `docs/` only — one
decision, this section, and §1.

**P175 read the whole tree and found nothing to collapse.** Five Sonnet territories — `src/lib`,
`src/audio`, `src/ui` twice and `src/app` with `src/state` and `src/workers` — ran one-source-of-truth
over all 388 files and all five came back empty, which is the step's own sanctioned result and is
written here because the report saying so is the record that the tree was read. Four near-misses were
refuted rather than landed. `20 * Math.log10(x)` is written three times — `src/lib/fingerprint.ts:64`
(`toDb`, which floors, rounds and throws), `src/lib/biquad.ts:83` (`magnitudeDbAt`, which must return
an unclamped `-Infinity` for a filter's response) and `src/lib/range.ts:58` (`meterFraction`, which
divides by `METER_FLOOR_DB`) — so the formula is shared and no two of the three behaviours are; the
collapse would be a behaviour change and is therefore not this step's. `48_000` sits at
`src/app/render.ts:37` as `RENDER_SAMPLE_RATE` and at `src/audio/deckDouble.ts:55` and `:121` as a
test double's default device rate, which is a different fact from "the rate a fingerprint is taken
at, fixed so two machines compare"; the audio tier may not import `src/app` either, so the only
collapse would be a hoist to `src/lib` of two numbers that merely coincide. `paramReachable`
(`src/audio/params.ts:236`) and both refusals in `src/app/refusals.ts:19,30` were reported as
unasserted and are not: `src/audio/params.test.ts:162` covers the first thoroughly, and the second
two are asserted by their exact strings at `src/app/decks.test.ts:698`, `src/app/facade.test.ts:157`,
`src/app/clips.test.ts:193` and `src/app/flatten.test.ts:347`, which is what that file's own comment
says covers them. Two coverage findings were judged not worth the line and are named here rather than
dropped: `routeOf` (`src/ui/routes.ts:24`), three lines of hash comparison, and `commitInput`
(`src/ui/LoadField.tsx:26`), which is not exported and would need a rendered blur path to reach.

**P175 declined its one cost finding, and it is P176's.** `bandOf` (`src/ui/playerScopeCanvas.ts:29`)
returns a fresh `{ top, deep }` and is called up to five times per block per painting of the scope —
`paintBlock:48`, `paintWait:82`, `paintThread:133-134` and the spark branch in `paintScope:180` — so
a sheet of twenty-four landings allocates a hundred-odd short-lived objects a frame while a card is
playing. The fix is local and behaviour-identical: compute the band once in `paintScope`'s per-block
loop and hand it down, which is three signature changes inside one file. It was not taken because
this step may not quote a timing and P176 owns the clocks: an allocation this small, against a paint
that is already writing rectangles into a canvas, is exactly the kind of change that is worth landing
only if something measured says so, and landing it here would have spent the measurement's baseline.
What this step left instead is the eleven-case `src/ui/playerScopeCanvas.test.ts` written against a
recording context, which is the proof any such rewrite would need and which did not exist before.

**P175's answer on `@vitest/coverage-v8`: no, and the reason is what the five reports agree on.**
The step asked whether the next one should add the instrument and what the number would decide, and
all five territories independently said no from what they had just read. Every gap any of them found
was a specific untested pure function — `mixCurve`/`fadeCurve`, the whole of `playerGrid.ts`,
`track`, `standingVoice`'s memo, `bandOf` — found by reading a file's exports against whether a
sibling `*.test.ts` exists, which is a `find` and not a percentage. A line number would have reported
four of those five as covered: `mixCurve` calls `mixGains` in a loop an instrumenter marks executed,
`playerGrid.ts` is imported and run by four UI tests that assert nothing about it, and
`standingVoice`'s memo has every line executed by any card test that renders a dial. It would
meanwhile have reported `src/ui/dev/**` and `src/ui/components/**` — a gallery and regenerated
shadcn, both correctly untested — as holes beside the real ones, and telling those apart is exactly
the file-by-file read the number was supposed to shortcut. The question the number would genuinely
answer is a different one: whether a _branch_ inside an already-tested function runs, such as the
`origin > now` split in `src/audio/ramp.ts` or the prune paths in `src/audio/effects/rack.ts`. That
is worth reopening the dependency for the day someone wants that answer (principle 7); it is not
worth it for "which files have tests", which `find src -name '*.ts' ! -name '*.test.ts'` answers for
free — and which says 39 modules still have no sibling, 20 in `src/lib` and 19 in `src/audio`, most
of them copy tables and effect plugins proved through their registry.

**P175 landed with its browser proof unrun. It is proven now and it is clean.** The drive step
failed on the same gone audio device P170 through P174 record — the clock stood at ~0.0058s in
`scripts/smoke.d/keyboard.js` and the harness named the machine (0036) — across all four of this
step's gate runs, every other step passing clean in each. The whole browser half has since run and
every scenario passed, which is what the step expected: nothing it landed changes what a browser
draws — five test files and two additions to existing ones, plus a `scripts/arch` rule that only
ever refuses.

**P174 landed with a known cost: at the fast end of the burst dial the travel outlasts the jump it
is about.** The step said the ease's own time is a fraction of `playerRowPeriod`, and that is the
_banded_ landing — `clamp(landingSecs(...), 0.75, 12)` — so every landing under three quarters of a
second resolves to the same 0.75 and travels for the same 0.375. A yard whose burst is a hundredth
of a second, with `bedEvery` at one so the ground moves every jump, is therefore a picture still
travelling when the next two grounds arrive, which is the smear the step's own second paragraph
forbids. It was left as the step wrote it rather than fixed: the row's period is the one length the
per-frame read has in hand, the raw `landingSecs` would need the spec plumbed into `refillRows`
where nothing else needs it, and the ground's own period is a third number (`bedPer`, `bedEvery`)
the picture has never read. The travel is still monotone and bounded at that end — it moves toward
the newest ground at a fixed rate rather than jittering — so what is lost is arrival, not direction.
`src/lib/playerDrift.test.ts` asserts the band's floor so the limit is written down rather than
implied. Two consequences were noted and left standing rather than fixed. The read cannot tell a
jump from any other way the ground moved, so dragging a loop handle on a jumping yard now drags the
field behind the hand at the travel's own rate — up to six seconds of crawl at the band's top, where
every other surface tracks the handle instantly; that is the same motion the step asked for, arriving
through a gesture it did not reason about. And the travel is timed on the session's clock, which
stops when the frame loop parks, so a stopped yard repainted on demand — a resize, a theme, a tile
landing — draws its field at the anchor the last frame left rather than back at rest. Every other
number the master hands that read is the last frame's too (`masterHeard`), and the next frame that
runs arrives outright.

**P174 landed with its browser proof unrun. Its scenarios pass now, and the reading by eye it
wanted is still not taken.** The drive step failed on the same gone audio device
P170, P171, P172 and P173 record — the clock stood at ~0.0058s in `scripts/smoke.d/keyboard.js` and
the harness named the machine (0036) — and this step's one reading by eye is worse off than theirs
for it: a jump is what the travel is _of_, nothing plays with no device, so nothing jumps and no
ground moves. A `./scripts/drive --shot` across a jump would have drawn a card with an empty run and
a field standing still, which is not the reading and would have been read as one. So the swing
between two shots either side of a jump has still not been seen — a `--shot` pair is a thing a
person asks for, not something the smoke takes, so a working device does not take it. Every
scenario of the browser half passes, this step's included. What is proved without it: the travel's
own time falling out of the landing at a fast jump and a slow one
(`src/lib/playerDrift.test.ts`), a centre walking toward a moved ground across frames and arriving
on it, with no allocation per frame (`src/ui/moireRowsField.test.ts`), and the load-bearing one — a
whole travel visiting at most `DRIFT_STEPS + 1` tile stops and baking at most that many, where the
raw centre bakes 31 in forty paintings (`src/ui/moireCanvas.test.ts`).

**P173's browser proof was unrun and it was hiding a broken row, which is fixed; and the step did
not pay the stream cost it had budgeted.** The drive step failed on the same gone audio device P170,
P171 and P172 record — the clock stood at ~0.006s in `scripts/smoke.d/keyboard.js` and the harness
named the machine (0036). Run at last, it stopped in `scripts/smoke.d/narrow.js`: this step floored
the run's bar at 32px where it had been 8px, which put the row's fixed columns at 244px of the 238px
a 360px phone gives them, so all six rows ran 6px past their own right edge with the name already
truncated to nothing. The scenario is clean at b6d0f6e and b58ac5a and fails at 8752fff, so the
floor is this step's and so is the overflow. The floor is not what gives, though: the countdown
beside it reserved 80px for "59m 59s", which measures 52px, so 24px of the row was air no column was
drawing in — exactly what the floor had asked for. It reserves 56px now, in the automator's rows and
in `ROW_LEFT`'s arrangement rows that are declared to be the same width, and the name is back to
being the only column that gives (047c700, `src/ui/GrownRows.test.tsx`). What is still not seen is a
dial creeping: the ramp and the two cadences are proved in `src/lib/effectGrowth.test.ts` and
`src/audio/effects/automator.test.ts` and the row's columns in `src/ui/GrownRows.test.tsx`, but
"dials that creep, not dials that tick" is a thing seen and no scenario watches for it. The step also budgeted
a cost it does not owe everywhere. It said a wander on its own cadence makes the same seed at two
`stays` values two performances. It does wherever a turnover falls inside the floor and the cap the
wander's clock is held between — under 32 seconds it is not a fixed fraction of the turnover, so two
lives draw differently — but above that the two clocks are locked at eight to one and the stream is
the seed's alone whatever Stays says. The discipline the step asked for is the one that
was kept and is proved: both clocks are spent through the one generator, in the order their instants
fall, with the stir at a shared instant going first.

**P172's browser proof was unrun; it is proven now, and the risk it named is half real. And its
rows' file crossed the soft cap.** The drive step failed on the same gone audio device P170 and P171
record — the clock stood at 0.0058s in `scripts/smoke.d/keyboard.js` and the harness named the
machine (0036) — so the automator's card had not been pressed in a browser since the weights left
its knob row. No scenario queried a weight by name (they set `auto.*` by command), so none needed
rewriting and none was. Run at last, every scenario passes, this step's header and its grid
included, and `scripts/smoke.d/narrow.js` is clean at b58ac5a — the `min-w-0` on the instance name
was enough for the header the step worried about. The half that is real is the other icon it added:
a picture per pool entry in every row of the run. Measured at 360px, a row _wearing_ one stands 2px
past its own edge, because the picture and its gap are 20px the row has no budget for and the name
is already at nothing. No assertion catches it — `narrow.js` adds an automator but grows nothing,
so every row it measures is bare — and it is recorded at the head of this section rather than
repaired, because which of six columns dies at that width is a design question. **And the run's rows now
carry a `max-lines` waiver.** `src/ui/GrownRows.tsx` went from 385 lines to 431 with a picture per
pool entry mounted in every row, and the waiver says what is over: one box — the hourglass at its
head and the rows under it — mounted once and painted by one frame callback, which splitting would
put half a frame subscriber in a second file. `src/ui/EffectRack.tsx` fell back under the cap on its
own, at 386, because the pool moved out into `src/ui/PoolEntries.tsx`.

**P171 landed with its browser proof unrun. It is proven now and it is clean; and its file did not
fall under the soft cap.** The drive step failed on the same gone audio device P170 records — the
clock stood at 0.0058s and the harness named the machine (0036) — so `scripts/smoke.d/playerRate.js`,
which lost the drag it used to assert across the walk's picture, had not been executed since. It has
now, whole and green, so the deletion left a scenario that still runs and still asserts. **And the negative has no executed proof at either layer.** The drag was the one case
that pressed the picture, and it was deleted rather than inverted: there is no DOM in the unit
suites — `renderToStaticMarkup` emits no handler to look for — so what stands is an assertion on the
whole of the surface's opening tag, which fails on any attribute added back to it. Pressing a
mounted picture and watching nothing arrive needs a DOM harness this repo does not have, and buying
one is a dependency nobody asked for. And the step predicted `src/ui/PlayerScope.tsx` would fall back under the 400-line
soft cap once the gesture went: it went from 624 lines to 548, so the `max-lines` waiver stays,
rewritten to say what is actually over the cap now — the fed window with a paragraph per ref, the
two lanes and the wait's own sentence. Splitting the window out into a file of its own would buy
it, and that is a step nobody has asked for.

**P170 landed with its browser proof unrun. It is proven now and it is clean.** `./scripts/check`'s
drive step could not run on the machine the step landed on: Chromium reported the audio output
device gone and the instrument's clock stood at 0.0058s, which the harness names as the machine
rather than the change (0036). It failed identically on a stashed base, so nothing was attributed to
this step — but `scripts/smoke.d/playerRate.js` had been rewritten around the two-tier shape (its
song list, its labels and its probe paths) and no run had executed those lines. They have now:
the scenario runs whole and passes, songs, parts, labels, probe paths and all. The instruction this
paragraph left — that the next step to reach a working audio device runs the gate whole before
anything else — is discharged.

**P169 landed with a known cost: a busy rack draws more fills per painting than it did.** A row an
automator grew is now up to `DRIFT_OCTAVES_REACH` fills where it was one, so one automator holding
six straight effects asks for twelve fills past the rows themselves — which is `DRIFT_SCALES_BUDGET`
exactly, and the deepest rack the picture already carried when six instances each claimed every
scale. Past that the budget shares out and the counts fall back toward one evenly, so the ceiling on
what the picture asks for is fixed and the number of automators no longer multiplies it; what a very
large rack loses is depth, which is the direction 0144 says the error must run in. The one thing
the budget does not bound is the painter's _tile keys_ — a swept row is keyed by the cycles its
pitch comes to, so each octave of a chirping row is a picture-wide bake of its own — and the review
found five grown filters asking twenty keys of a `TILE_CACHE` of twelve, which age-only eviction
turns into a miss on every lookup of every painting. That cap now refuses a key wanted lately, the
way the curved shop's already did (`heldStraight`, 0144, 0230), so a rack over it goes over it
rather than rolling. It was not measured against the profiler's history before landing: the step
asked for the budget and the budget is what the proof holds. Nothing here is per frame — the counts are set where the row set is built
and rebuilt when the population turns over (0212) — so what is unmeasured is the painter's fill
count and not its arithmetic. P176 read the picture run against the profiler's own history and found
no metric outside its band, so the fill count was never attributed to anything.

**P168 landed with a known cost: a curved row is up to four tiles in the shop where it was one, and
one cosine a frame more.** The anchor's travel is bounded to a step and a half of the ladder its
tile is keyed on, so a whole period visits at most four stops — but each of those stops is a
picture-sized tile the shop has to hold, against a `CURVED_CACHE` of eight. One or two curved rows
fit; a rack of four reverbs — or of reverbs and automators, whose `fan` row drifts on the same rule
— asks for more slots than the shop has, and past that the oldest stop is
evicted and rebaked next time the anchor comes back round to it. That is a bake a period rather than
a bake a frame, and the painter takes at most one a painting either way (0144), so what it costs is
paintings where a row draws its previous tile rather than its current one — which is exactly what
0144 says a late tile costs. It was not measured against the profiler's history before landing: the
step asked for the key count and the key count is what the proof holds. The per-frame arithmetic is
one `turnsOf` and one `cosTurn` per drifting row, allocating nothing. P176 found no metric outside
its band across the picture run, so neither was ever attributed to anything.

**P167 landed with a known cost: two more scans of each master window every frame, and one more
grating in every picture.** The row of the whole session is read off the two windows
`createMasterBus` already fetches for the meter, but each is now scanned three times rather than
once — `peakMagnitude`, `rmsMagnitude` and the difference pass inside `spectralTilt`, over 1024
samples a channel — which is about 4k more float operations a frame at the top of the graph, paid
whether or not a drift is open, because the meter is the caller that is always mounted. Every caller
comes through one memo (`masterHeard`, 0218), so the cost does not scale with yards or with the
meter; what does scale is the grating, which every open picture now draws one more of and shares its
ink out over. Neither was measured against the profiler's history before landing: the step's own
text asked for both, and the alternative to the scans is the FFT it forbids. Landed with it, too:
the field's wash rises the session's row along with every other row in the picture (0213), so a
quiet yard smeared through a full-wet reverb draws that layer deeper than its own reading asked for
— the row is counted exactly as deep as it is drawn, so nothing about the picture's weight moves,
and exempting one row from the wash needs a per-row flag this step did not buy. P176 found no metric
outside its band across the picture run, so none of this was ever attributed to anything.

**P166 landed with a known cost: the countdown's first figure arrives at the pump's first stop, not
within a second of the press.** The step asked for a real countdown "arriving within a second of the
press", and the reports come off the stops `renderOffline` already makes — the automation re-arm,
every `AUTOMATION_REARM_SECS` = 4 seconds of rendered audio. So the first figure lands after four
rendered seconds and the button says only `Exporting…` until then, and a render shorter than that
never counts down at all: its one report is the final one. In the browser scenario this machine
reached that stop 0.03s into the render — 133x realtime, well inside the second — so the claim holds
wherever a render is faster than 4x, which is every measurement this repo has of one. It is not held
by construction, and the reason it was not bought is that the only way to buy it is a stop the pump
was not already making: an extra `pump()` and `armAutomation()` at a time nothing is due, inside the
one function every determinism proof in §2 is taken through. The words are the honest half — a
button that has measured nothing says so. The rate excludes the preflight on purpose — the worklet
load, the snapshot and the serial decodes are not rendering — so the figure is about the render and
under-reports the wall clock from the press on a session of many imported sources.

Two further costs, both waivers rather than gaps. `src/app/render.ts` (387 lines) and
`src/app/exportAudio.ts` (390) were each within thirteen lines of the 400-line soft cap before this
step and crossed it, so both took a file-level `oxlint-disable max-lines` with the paragraph 0007
requires, as `scripts/smoke.d/exportAudio.js` did for the same reason; splitting three files that
were already at the cap is the drive-by refactor principle 4 refuses. And the wiring from the
dialog's `setProgress` through `AsyncButton`'s `busyLabel` is proved in vitest only —
`window.mulch.exportAudio` takes no progress argument, so the browser asserts the harness's reports
and the words built off them rather than the label on the real button.

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

**P164 landed with one of its two graph seams unproven.** The step named `setPlayer` as "the one
place a pattern reaches the engine", and there are two: the command, and the arming of a session
restored, undone, redone or imported (`prepareRestore`, src/app/engine.ts). Both were written to go
through `playerSounding`, so a bypassed spec is handed to no voice either way — but only the
command's road has a test. Deleting the wrapper at the second one leaves the whole suite green,
which means an undo back onto a bypassed pattern could start it jumping again and nothing would
say so. Nothing in the repo constructs the real engine's restore: `src/app/engine.test.ts` is the
only caller of `createAudioEngine` and it never restores a session, and every other suite
substitutes `src/app/engineDouble.ts`, which has no prepared graph to arm. What covers the risk in
the meantime is the shape rather than a case — one exported function, unit-tested for all three of
its answers, called as a one-liner at both sites, so the two roads cannot disagree without somebody
editing one of them on purpose. Closing it properly means a fixture that drives a real
`createAudioEngine` through a restore against the fake context `engine.test.ts` already builds, with
a way to read back what each prepared voice was handed — which is a harness the whole `prepareRestore`
stage wants and not P164's to build. Until it exists, every step arming the graph from a session
carries the same hole.

**P165 left the kept row a disabled prop nothing can set.** `PlayerCard` draws `<PlayerBeds>` inside
`{live !== null && …}` and hands it `disabled={off}`, where `off` is `live === null` — so the prop is
provably always `false`, and `PlayerBeds`'s own `disabled` default and every branch reading it are
unreachable from the only call site. Two review lenses found it independently. It is P164's, not this
step's: 0225 nulled `live` on a bypassed module, and what had been "the row drawn dead over a
switched-off pattern" became "the row not drawn at all". Nothing is wrong on screen — a bypassed
module unrenders its row rather than greying it — and this step's `+` refusals are live state a hand
can actually reach, so the dead prop costs a reader a wrong impression and nothing else. Removing it
means deciding whether the ground's fold should draw a dead row for a bypassed pattern the way the
dials do, which is a question about 0225's shape and not about the plus.
