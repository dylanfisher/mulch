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

The run below turns to **what the picture becomes as the sound becomes something else.** A loop left
running grows: an automator lays and lets go, a rack thickens, and forty minutes in the mood is not
the mood the first bar had. The drift draws none of that. Every row in it is current — it has no
reading of how long the yard has been sounding, so no term in it can widen with the performance
(P179). The three were read off the same picture and are one subject,
the way P167–P169 were: **the drift is a picture of the instrument's inputs, and what a long
performance actually does is change its character.** None of them moves a durable shape — all three
are readings, which is what 0145 and 0212 already permit the picture to rest on.

The first of them has landed. The picture is laid back into itself after the gratings are cut and
before the frame is fed back, once per run of effects an automator is growing: as deep as the summed
`presence` of every standing place, at a ratio and a turn folded off the holding instance's id, and
each pass doubling the levels the field holds so a linear number of blits buys a geometric depth
([0240](decisions/0240-the-picture-folds-into-itself.md), `src/lib/moireFractal.ts`,
`src/ui/moireFold.ts`). So a rack holding two automators is two spirals composed into one stack —
added to the rows and the octaves those runs already reach the picture through (0212, 0230) rather
than replacing either — and the profiler put the cost at frame p95 10.3ms against a band topping out
at 10.3.

And the second. **What the picture hears is no longer only how loud the output is.** P167 wrote its
own refusal down — "in the time domain and never a spectrum" — and that judgement was right about a
grating and wrong about a fold: a wash and a resonance are the same level and nearly the same tilt,
and the whole of the difference is how the energy is distributed. The bill is paid once a frame and
on the one channel the two peak reads already found louder, and what it buys is the fold's entire
character: a flatness and an edge (`spectralFlatness`, `spectralEdge`, `src/lib/peaks.ts`), spent as
**resonance tightens the fold and sharpness hardens it** (`heardTight`, `heardHard`,
`src/lib/moireSound.ts`). So the fold has three separable inputs saying three different things — the
population says how deep, the resonance says how tight, the sharpness says how hard
([0241](decisions/0241-the-picture-may-ask-for-one-spectrum-a-frame.md), P178). The profiler put the
whole of it at frame p95 10.3ms and 10.4ms over two runs against a band topping out at 10.4, green
both times.

And the last of it. **The picture ages while it sounds.** Nothing in the instrument knew how long it
had been playing, so a performance whose whole subject is that it went somewhere was drawn with the
same range in the fortieth minute as in the first. `DeckPeek.sounding` is now elapsed _continuous_
sounding off the instant the worklet already reports, halted back to nought (`src/audio/deck.ts`),
and `driftAge` turns it into a saturating age on 0..1 over a twenty-minute reach
(`src/lib/moireAge.ts`). Three named spends widen with it and nothing else does: the ceiling the
fold is held to, so an hour-old loop folds deeper and `DRIFT_FOLD_REACH` is the ceiling of that
ceiling; the band the picture's hue is carried across; and the band the reference row's spacing is
drawn in. Each is a reach with an end and a fresh picture is drawn in half of every one of them, so
the oldest picture the instrument can draw is a picture and not a smear
([0242](decisions/0242-the-picture-ages-while-it-sounds.md), P179).

Beside the picture, one number the repo did not have. **The export now says what it costs on the
workload someone waits on**, rather than on the two seconds of click-train through an empty rack
that was the only render figure anywhere. A second section renders sixteen seconds through a filter,
a reverb, a tape, a pop and a running automator over a looping deck, half of it the warm-up an
export renders and throws away, and it reports the split rather than only the rate: the render's own
clock off the last progress report, against everything on either side of it — the load and the
decodes in front, the fingerprint of the take behind — under a name that says so, because that tail
grows with the take and a row called preflight would hide it. It goes through
`window.mulch.render` like the section above it, so
`loadedFactor` is a tracked row of the trend file at a tolerance of its own — the automator's draws
move it, and that is meant to show — and a self-oscillating tape is priced beside it, because past
unity the loop never decays and it is the one rack no shortened warm-up could reproduce (P180, §4).

The run's last step has landed. **The export renders the seconds it needs and no more.** A take now
warms for the longest memory in the session's rack rather than for the whole elapsed performance,
which the browser reads back on a page two seconds old: a take asked from that performance's start
warmed the second the rack settles in, and stood where it always stood against a render longer than
it at both ends. The rack no window may shorten is asserted beside it — a tape at Regen 1.2 given
the identical ask warmed the whole performance, because past unity the loop never decays. What the
review found is that the bound had been applied to every take and not only to the one it is sound
for: a lookback names a window of the performance, a render is a replay with no seek into it, and a
shortened warm-up hands back the first thirty seconds under the name of the last. A take now carries
`beginsSecs` — its subject, which is what the box says out loud — beside the `warmSecs` actually
rendered, and only a take begun at the ear is shortened. The box reads the settle off the same
session the door does, so the figure it prints is still a claim about exactly the render underneath
it ([0239](decisions/0239-a-warm-up-is-bounded-by-what-a-rack-remembers.md), P180, P181, §4).

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
real-time waits and cost close to nothing. New browser work that cannot be a render picks one of the
browser half's three lanes and states what that lane's page must already hold in its prelude, rather
than reading what a neighbouring scenario happened to leave
([0238](decisions/0238-the-browser-smoke-runs-in-lanes.md)). The reload ordering rule above is a rule
about the chain lane, which is the only one that reloads.

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

**P180 landed with a known cost, and the cost is the section's own price.** `./scripts/profile` now
renders sixteen seconds through a full rack and eight more through a self-oscillating tape, which is
about a second of a command no gate waits on (0051) — the price of the figure, and cheaper than
every account of an export's minutes staying inference. Read by hand on this machine: 628ms for
those sixteen seconds, 25.5x realtime and 39ms a rendered second, against 54.1x for the two-second
click-train through an empty rack, so a full rack costs roughly twice what the graph alone does —
and half of the sixteen is warm-up an export discards. **The cost is strictly linear in the render's
own length**: inside one sixteen-second render through the same rack, `./scripts/drive --render 16`
timed three rendered seconds at 124.0ms and the next three at 123.7ms, off the wall stamp the event
bus puts on each loop crossing. The tape at Regen 1.2 was 173ms for eight seconds — 22ms a second,
on the same render clock as the figures above it, which is the only reason it may be set beside
them. What sits outside that clock was 29ms, and it is two costs and not one: the worklet load and
the decodes in front, and the reports, the fades and the fingerprint of the whole take behind, which
grows with the take. So the row is named for the gap and not for the press's half of it.

**What P180 did not establish is everything else P181's entry credits to it.** Of the six candidates
that entry was drafted around, this record carries the linearity and the per-second rate; the
per-effect breakdown, the reporter's messages, `mixCurve` and `cubicTap`'s modulos were read off a
run nobody wrote down, and they are not here. Two per-sample kernels the loaded render implicates —
the `pop` worklet in its rack and the `scatter` worklet in the pool its automator draws from — had
no `scripts/bench` row until this step added them, and pop's is not small: 1328ms of a ten-minute
stereo take, against the tape loop's 1917ms per channel (0116, amended to say which worklets it
covers). Nothing here is asserted on anywhere (0050) and no rate is written in source (0227).

**P181's source landed inside P180's commit, and its own run was the proof.** `src/lib/settle.ts`,
the `settle` field on every registry entry, `sessionSettleSecs`, the bound in `exportTake` and
[0239](decisions/0239-a-warm-up-is-bounded-by-what-a-rack-remembers.md) were all already in the tree
at 0ba44d9 — the step before this one wrote them while writing the record that made them necessary.
What P181 found missing was two of the four proofs its own entry names: the scatter, whose settle is
its whole capture whatever Reach is set to, had no case; and the browser, which is the only thing
that proves the sound, still asked its warmed take for a lookback shorter than the floor and so
never exercised the shortening at all. Both are now in `src/app/exportAudio.test.ts` and
`scripts/smoke.d/exportAudio.js`. What it also found, through its Seam lens, is that the landed
bound reached takes it is not sound for and that `src/ui/ExportAudioDialog.tsx` was pricing an
unbounded render — a box saying an hour of a four-second one — both fixed here rather than recorded.
The fifth thing that entry asked for does not exist: the gate's
only golden is `fixtures/golden/render-smoke.json`, which is a fixture render and never goes through
the export door, so there was nothing to re-baseline and nothing was.
