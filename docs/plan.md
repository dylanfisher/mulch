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
field the ground turns and anchors (P161, 0224). The album that made those three is gone (P170,
0231).

The place is on the step, and every one of those reads it: nothing below may re-derive one.

The run then turns to **what the instrument asks a hand to do, and what it asks for twice**. The
tier that was the tier under it with a different word on it has gone (P170, 0231); what is left is a
picture of the walk, which is now only that and no longer a second road to two numbers not on it
(P171, 0232); the pool of eight that was drawn as eight numbers among the numbers shaping the run is
now eight buttons in its entries' own icons, each opening how often it is drawn and inside what
(P172, 0233); a run of dials that arrived where they were going before the sound did and then stood
still for two minutes now travels on the wander's own clock and is read off it at every frame
(P173, 0234); and a field that teleports on a jump whose whole meaning is a distance (P174). Three
of the four are subtractions, and that is the shape of the subject: every one of them is a second
way of saying something the instrument already says.

The run ends by turning on itself. **What no step has ever read is the tree.** Five territories read
`src/` for a fact declared twice, a behaviour nobody asserts and a cost on a per-frame path, and the
duplicates collapse and the tests get written (P175); one pass measures what the picture run actually
cost against the profiler's own history and pays down what it can attribute (P176). Both are steps
and not surveys: they land diffs, one gated landing at a time, and only what needs a durable shape or
a decision leaves as an entry below them.

Document order is the run order.

### Scheduled

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
P168, 0229). An eased centre walks exactly the ladder `stepped` already quantises to, the way P168's
drifting anchor already does, so a glide visits cache entries rather than baking new ones and the number of
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

**P173 landed with its browser proof unrun, and it did not pay the stream cost the step had
budgeted.** The drive step failed on the same gone audio device P170, P171 and P172 record — the
clock stood at ~0.006s in `scripts/smoke.d/keyboard.js` and the harness named the machine (0036) —
so a dial has not been watched creeping in a browser, which is the one reading of this step the unit
suite cannot take: the ramp and the two cadences are proved in `src/lib/effectGrowth.test.ts` and
`src/audio/effects/automator.test.ts`, and the row's columns in `src/ui/EffectRack.test.tsx`, but
"dials that creep, not dials that tick" is a thing seen and it was not seen. The step also budgeted
a cost it does not owe everywhere. It said a wander on its own cadence makes the same seed at two
`stays` values two performances. It does wherever a turnover falls inside the floor and the cap the
wander's clock is held between — under 32 seconds it is not a fixed fraction of the turnover, so two
lives draw differently — but above that the two clocks are locked at eight to one and the stream is
the seed's alone whatever Stays says. The discipline the step asked for is the one that
was kept and is proved: both clocks are spent through the one generator, in the order their instants
fall, with the stir at a shared instant going first.

**P172 landed with its browser proof unrun, and its rows' file crossed the soft cap.** The drive
step failed on the same gone audio device P170 and P171 record — the clock stood at 0.0058s in
`scripts/smoke.d/keyboard.js` and the harness named the machine (0036) — so the automator's card has
not been pressed in a browser since the weights left its knob row. No scenario queried a weight by
name (they set `auto.*` by command), so none needed rewriting and none was: the whole browser cost
is that the new grid, its popovers and the three icons have been asserted only in
`src/ui/EffectRack.test.tsx` — and one of them is a layout the browser is the only judge of: the
rack card's header gained an icon and a `gap-2`, and `scripts/smoke.d/narrow.js` is what fails on a
row whose right edge passes a 375px viewport. The instance name beside the label now truncates on
a `min-w-0` the way the run's own rows do (P24), which should be enough and has not been measured.
Every other step of the gate passes clean. **And the run's rows now
carry a `max-lines` waiver.** `src/ui/GrownRows.tsx` went from 385 lines to 431 with a picture per
pool entry mounted in every row, and the waiver says what is over: one box — the hourglass at its
head and the rows under it — mounted once and painted by one frame callback, which splitting would
put half a frame subscriber in a second file. `src/ui/EffectRack.tsx` fell back under the cap on its
own, at 386, because the pool moved out into `src/ui/PoolEntries.tsx`.

**P171 landed with its browser proof unrun, and its file did not fall under the soft cap.** The
drive step failed on the same gone audio device P170 records — the clock stood at 0.0058s and the
harness named the machine (0036) — so `scripts/smoke.d/playerRate.js`, which lost the drag it used
to assert across the walk's picture, has not been executed since. Every other step of the gate
passes clean. **And the negative has no executed proof at either layer.** The drag was the one case
that pressed the picture, and it was deleted rather than inverted: there is no DOM in the unit
suites — `renderToStaticMarkup` emits no handler to look for — so what stands is an assertion on the
whole of the surface's opening tag, which fails on any attribute added back to it. Pressing a
mounted picture and watching nothing arrive needs a DOM harness this repo does not have, and buying
one is a dependency nobody asked for. And the step predicted `src/ui/PlayerScope.tsx` would fall back under the 400-line
soft cap once the gesture went: it went from 624 lines to 548, so the `max-lines` waiver stays,
rewritten to say what is actually over the cap now — the fed window with a paragraph per ref, the
two lanes and the wait's own sentence. Splitting the window out into a file of its own would buy
it, and that is a step nobody has asked for.

**P170 landed with its browser proof unrun.** `./scripts/check`'s drive step could not run on the
machine the step landed on: Chromium reported the audio output device gone and the instrument's
clock stood at 0.0058s, which the harness names as the machine rather than the change (0036). It
fails identically on a stashed base, so nothing is attributed to this step — but
`scripts/smoke.d/playerRate.js` was rewritten around the two-tier shape (its song list, its labels
and its probe paths) and no run has executed those lines. Every other step of the gate passes clean.
The next step to reach a working audio device runs the gate whole before anything else.

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
count and not its arithmetic. P176 is where it is attributed if the picture run shows a regression.

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
one `turnsOf` and one `cosTurn` per drifting row, allocating nothing. P176 is where either is
attributed if the picture run shows a regression.

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
and exempting one row from the wash needs a per-row flag this step did not buy. P176 is where any of
this is attributed if the picture run shows a regression.

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
