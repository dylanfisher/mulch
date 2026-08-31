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

Nothing is scheduled. The subject the last run of steps had was **what an arrangement looks like
while it is playing**, and it is finished: a step carries `SongPlace` — which album, which round of
it, which song, which round of that, and the jumps still to come of each — the three tiers' rows
wear a play mark and a countdown off it (P155), the walk's own picture says where it waits and draws
its run as three lanes and its boundaries as three weights of rule off that same place (P156), the
ground comes round on the top tier off it too (P158), the three tiers wear names drawn off their own
ids rather than four characters of them (P160, 0223), and the drift now has a row per tier and a
field the ground turns and anchors (P161, 0224).

The place is on the step, and every one of those reads it: nothing below may re-derive one.
Document order is the run order.

### Scheduled

Nothing. The next step is written here before it is started.

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
- A tier above the song costs no command and no road: `deck.player` already carries the whole spec,
  so P147's album was a shape, a validator and a section, not a fourth command
  ([0214](decisions/0214-a-tier-is-the-tier-under-it-said-again.md)). What it cost was room — its
  shape and validator went in `src/lib/playerAlbum.ts` beside `src/lib/playerSong.ts` rather than
  into `src/lib/player.ts`, its words in `src/lib/copyAlbum.ts` the way `copyStrip.ts` did (0045),
  and its two walk cases in `src/lib/playerWalkAlbum.test.ts`, because `src/lib/playerWalk.test.ts`
  was within four lines of the hard cap.
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
  ([0213](decisions/0213-a-reading-of-the-output-belongs-to-the-field.md)).
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
