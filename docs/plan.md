# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device. A performance stays editable, portable, reproducible through commands,
and identical through the live and offline signal paths.

The instrument today is an any-number-of-decks instrument, with decks the interface calls yards, a
durable session, portable archives, bounded undo/redo, and a menubar shell over a scrolled
instrument. A yard holds a source, a beat-aware loop with its own handles, a rack of effect
instances, a jump module, and a moiré drift picture of everything automating it. The source is
imported in any format the browser decodes or drawn from the generator list, both behind the one
source control in the yard's header. The picture is drawn over a reference row cut by the clip's own
analysis, it is anchored where in the source the yard is reading, it breathes with what the meters
read, and it opens large in a browser window of its own.
An automator grows a run of effects in a rack of its own, bounded by a window a hand may put on any
parameter its pool draws — read off the pool's own declarations, so a knob added to a plugin is
bounded by construction — and kept alive by one Wander dial beside Stray; a yard running one, or
jumping, is told its picture never comes round rather than given a figure (0208).
Every continuous parameter except the read rate carries a gesture-relative lane. Audio leaves
through one render harness: the File dialog writes a folder holding the .wav and the session that
made it, or a crop, or a flatten. A ⌘/Ctrl+K palette sends the same commands the screen sends.

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

Eight steps are scheduled, P142 through P149. The order is what each one costs and what it stands
on: P142 first, then P143, which is the automator again while that file is open; then P144,
P145 and P146, the picture. P144 leads the three because it is the only one that changes no
behaviour at all and the other two both give its loop more to do; then P145 and P146 in that order,
because the second is the first one's field reading the output. Then P147, because it is the only
one that moves a durable shape a hand has already filled. P148 and P149 come after it because
neither moves a durable shape at all — P148 is one parameter declaration in the automator, and P149
is two fields of a dialog's own spec, which is not session state (P40). P148 goes first of the two:
it is the smaller, it is the automator file a third time, and a run that can be made to wait is what
gives P149 a part worth taking. A later one comes from
[`ideas.md`](ideas.md) or from something the instrument has not been asked for yet.

**P142 — A wash is given back its dynamics, its width and its air.** The durable shape it moves is
none, and that is the point: a rack entry is already `(instance, effect, params, automation)` and a
parameter is already declared once by its owning plugin
([0016](decisions/0016-effects-are-ordered-plugins.md),
[0030](decisions/0030-effects-are-instances.md)), so an eighth entry is durable, restorable,
automatable and portable by existing. What the step costs is the registrations a new entry owes,
below.

The entry is `pop`, and it is the three things a droned, washed yard has lost, in the order that
restores them. There is no stereo width in the instrument, no transient shaping and no saturation an
effect owns — the only width is the reverb's decorrelated impulse and the only saturation is inside
the tape's own feedback loop, so a yard that has been smeared has nothing to unsmear it with.
_Lift_ expands two-sidedly around a pivot the effect tracks itself, a slow running average of the
mid, so loud goes louder and quiet goes quieter and the knob adds range without moving the level or
caring what the level was. It is bounded twelve decibels either way, because an expander with no
ceiling is a runaway and one with no floor is a gate. _Snap_ is the follower's own speed, one knob
from a slow breath to a fast strike, since a fixed follower time is wrong on half of what a yard
holds. _Width_ is mid and side with the side high-passed, so the low end stays where the body is and
only what is above it opens. _Sheen_ splits the high band into a soft saturator and sums it back.
_Mix_ blends the whole against the untouched input, phase-aligned because nothing here looks ahead.

No native node computes a gain per sample, so it is a worklet, the second one an effect owns. The
processor holds the dry and the wet sample at once, so it crossfades in its own kernel and binds
`mix` as an a-rate worklet parameter rather than growing a fourth copy of the `ConstantSource` and
`mixCurve` pair the delay, the reverb and the tape each carry — that is the decision the step
records.

Proof: `src/audio/worklets/pop.test.ts` beside the processor, the way the tape's kernels are proved
beside theirs — the gain is one at the pivot and one at rest, clamped at both caps; the width is
identity at one and mono at nought; the bass survives the side high-pass; the sheen at nought is a
no-op. The registry, parameter and tooltip totals come free from `registry.test.ts`,
`params.test.ts` and `tooltips.test.ts`. No `rack.test.ts` block and no browser scenario of its own:
that fake context builds no `AudioWorkletNode`, which is why the tape has none either, and a render
added to `scripts/smoke.d/renderDynamics.js`'s existing work is cheaper than a scenario (§3).

**P143 — The run is a size range, and a place may be left empty.** The durable shape is three
parameter declarations on one plugin and no session field: a value is already `(instance, param)`
([0030](decisions/0030-effects-are-instances.md)), so `Held` splitting into `Least` and `Most` with
`Odds` beside them is durable, restorable, automatable and portable by existing, and what no longer
validates is discarded rather than migrated
([0026](decisions/0026-pre-release-has-no-migrations.md)).

An automator holds exactly `Held` places today and its cursor fills every one, so the population is
a constant — which is wrong for the reason a fixed follower time is wrong: what makes a run feel
alive is that it is not always the same size. _Least_ and _Most_ are the run's floor and its
ceiling. _Odds_ is the chance a lay actually happens, default 1, which is exactly today's behaviour;
at a half, with a floor of two and a ceiling of six, the run breathes between them rather than
standing at six forever. An odds knob is the player's own precedent one module over — `varyChance`
is the odds a landing's length is varied at all — and the roll is spent through the caller's
generator in the order the draws it precedes are spent, so a seed still names one performance
([0204](decisions/0204-a-run-is-laid-on-the-automation-horizon.md)). The decision the step records
is that the floor beats the odds: a tick that would take the run below `Least` lays anyway rather
than rolling, because a bound is a promise and a chance is a texture.

Beyond the maths it costs a tooltip per new parameter in `src/lib/copyParams.ts` and, per new
parameter, a `driftFrom` mapping or a written `because` in `driftUnreached`
([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)) — `Held` reaches the
automator's own row depth today, and what a floor, a ceiling and a chance each reach is the question
that has to be answered in writing rather than left.

Proof: `src/lib/effectGrowth.test.ts` beside the cursor — at odds 1 the run is today's run exactly,
it never exceeds `Most`, the floor is honoured against a roll that said no, and one seed gives one
sequence of skips. The totals come free from `params.test.ts` and `tooltips.test.ts`, and a render
is added to `scripts/smoke.d/renderAutomator.js`'s existing work rather than a scenario of its own
(§3).

**P144 — The picture's one loop is priced, and made cheaper without being made different.** The
durable shape is none, and no behaviour moves either: this step is the one of the nine that must
leave every pixel exactly where it found it. `curvedField` in `src/lib/moireGeometry.ts` is the
largest loop in the instrument and the only one
[0116](decisions/0116-a-per-sample-kernel-is-priced.md) does not carry a row for — a kernel nobody
has measured, which is the one thing
[0058](decisions/0058-nothing-qualified-for-wasm.md)'s rule cannot be applied to. Measured off the
bench in plain Node, one picture-sized tile at 3024×1890 costs 278ms fan, 345ms radial and 407ms
spiral at the dearest profile, against 2.7ms to write the same alpha bytes and nothing else. The
kernel is ~100× its own memory floor, which is instruction throughput and not traffic.

It goes before P145 and P146 because both add per-pixel work to this picture — P146 lays a broad
slow row over the whole field — and a kernel gets its row before it gets more to do.

**The step's rule is byte-equality, and it is what makes the step safe.** A bake is spent through
`Math.round(255 * profileBlock(...))`, so a rewrite is a regression unless the alpha byte is
identical for every pixel of every geometry and every profile. Two rewrites are already measured
against that bar over the full 5.7Mpx tile and all nine profiles, and both differ in zero bytes:
`Math.log(Math.max(Math.hypot(u, v), MIN_RADIUS))` becomes
`0.5 * Math.max(Math.log(u * u + v * v), 2 * Math.log(MIN_RADIUS))`, since V8's `Math.hypot` pays
for overflow-safe scaling this kernel's operands cannot need; and `place.cover / ref` is hoisted out
of both loops. Worst turns disagreement is 5.7e-14, far under a byte. Together they take spiral to
313ms (23%), radial to 281ms (19%) and fan to 267ms (4%).

**What the same bar rejects is the more interesting half, and it is written down rather than
attempted.** Mirroring a radial field into its quadrants is exact only if the anchor sits on a
pixel, and `centreAcross` returns a float. Accumulating `u` by a step instead of multiplying drifts
over three thousand columns. A lookup table on the radius, a bake below device resolution, and the
WASM SIMD port [0058](decisions/0058-nothing-qualified-for-wasm.md) would otherwise be the
candidate for — vectorised `log` and `atan2` are polynomials, not `Math.log` — all change pixels.
None of them ships here. The decision the step records is that this kernel's optimisations are
gated on byte-equality, so the next person to want one has a harness that answers rather than an
argument.

Proof: the equality harness beside the maths in `src/lib/moireGeometry.test.ts`, where that file's
ring and fan cuts already are — the shipped `curvedField` against a reference transcription of the
current arithmetic, every geometry × every profile, asserting zero differing bytes, at a tile small
enough to stay well inside §3's Vitest slack. The row itself joins `./scripts/bench` at the three
sizes a picture is actually asked for, which is what 0116 requires and what makes the 23% a number
somebody can check rather than a claim. No browser scenario is added: nothing about the picture's
output changes, so `scripts/smoke.d/drift.js` proving it still draws is the existing scenario doing
its existing job.

**P145 — What is grown is drawn, and the part standing changes the picture's shape.** The durable
shape is none. This is the answer to a picture that barely moves while the yard changes underneath
it, and both causes are structural rather than a matter of the reaches being too small.

`moireRows` walks the session's rack, and an automator's run is not in the session: it is drawn from
its seed and never stored ([0204](decisions/0204-a-run-is-laid-on-the-automation-horizon.md),
[0205](decisions/0205-a-cards-face-is-declared.md)). Six grown effects therefore arrive as no rows
at all — the automator contributes the one row its own knobs reach — so a run turning over
completely changes nothing about the picture. The read is already in place: `DeckPeek.growth`
carries what each automator is holding, refilled in place every frame, and it is what
`src/ui/GrownRows.tsx` paints from. So a grown effect gets a row of its own, cut to its plugin's
profile and geometry and reaching through its plugin's own `driftFrom` the way a rack instance's
does, filled from the read rather than from the session. That is the decision: the picture's rows
stop being a function of the session alone, which
[0145](decisions/0145-a-picture-may-rest-on-analysis.md) already permits — a picture may rest on
what is not stored precisely because nothing about the picture is stored.

The second cause is one tier up. A song is the picture's one stepped row
([0159](decisions/0159-a-song-is-the-pictures-one-stepped-row.md)), and the part standing moves
three things about it: its identity, its spacing and its tint (`src/lib/playerDrift.ts`). Playing a
different song therefore recolours one row out of a dozen. The part standing gets that row's profile
and its geometry too, so a new part changes what the row _is_ — a comb becomes a ring — and not only
what colour it is.

Widening a `DRIFT_*_REACH` is the last thing to try and not the first: a reach is one number every
row already spends, so moving one moves every picture the instrument draws. Any reach that moves
here moves with a `./scripts/drive --shot` swing beside it, read at 1:1 rather than off the whole
canvas.

Proof: `src/ui/moireRows.test.ts` for the grown rows — a yard whose automator is holding three draws
three rows more than one holding none, each cut to its own plugin's profile — and the same file for
whatever the player's row grows, since that is where its rows are already measured. A render added
to `scripts/smoke.d/drift.js`'s existing work, which already holds the picture (§3).

**P146 — The picture hears how washed the yard has become.** The durable shape is none, and none is
possible: a reading is not a parameter and nothing about the picture is stored, which is exactly
what lets a picture rest on one
([0128](decisions/0128-every-motion-in-the-screen-belongs-to-a-parameter.md),
[0145](decisions/0145-a-picture-may-rest-on-analysis.md)).

A yard that has been smeared looks much like a yard that has not. What "washed" is, measurably, is
the crest of the output window — its peak over its RMS — which falls as reverb, delay and saturation
fill the gaps between the transients. `buildDeckChain` already hangs a dead-end analyser off the pan
for `level()`, and the window it reads is the window this needs, so the step is one more
allocation-free read on the node that is already there and one more number on the peek beside the
meters (§3). It is the deck's own end rather than the master bus because the picture is a yard's;
the master's taps in `src/audio/context.ts` are where this would live if the picture were ever the
session's.

What it does to the picture is what a wash actually looks like: the rows stop being separable. Depth
and disperse rise together across every row at once, and one broad slow row is laid over the whole
field at the loop's own period — a larger moiré over the small ones, which is a picture blending
rather than a picture with one more thing in it. The decision the step records is that this reading
belongs to the field and not to a row: every reading the picture takes today is one item's own meter
(0128), and an output has no item to belong to.

Proof: the maths beside the meter pulse it sits next to in `src/lib/moireSound.ts`, measured in
`src/ui/moireRows.test.ts` where that file's cuts and pulses already are — a struck dry window reads
nought, a smeared one reads near one, the reading is bounded at both ends, and silence is not a
wash. The read itself is proved where `level()` is, through the existing offline render, and the
picture through a render added to `scripts/smoke.d/drift.js` (§3).

**P147 — A song is one of many, and an album is the run they stand in.** The durable shape is the
largest of the six and the reason this step is last: `PlayerSpec.song`, one run of parts, becomes
`PlayerSpec.albums`, a run of albums, each holding a run of songs, each holding the parts a song is
made of today. Three tiers of one shape — a named thing, in an order a hand chose, carrying how many
times it plays and whether it is skipped — because that is what a part already is
([0153](decisions/0153-a-song-is-a-run-of-parts-the-walk-plays-back.md),
[0176](decisions/0176-a-part-is-the-dials-it-was-captured-from.md),
[0178](decisions/0178-a-part-is-a-card-and-it-carries-a-name-it-was-given.md)), and a tier shaped
like the tier under it costs one editor rather than three. Nothing is migrated: today's single song
becomes one song of one album and every stored spec that is not this shape is discarded
([0026](decisions/0026-pre-release-has-no-migrations.md)).

The walk reads them in order — an album plays its songs, a song plays its parts, and each says how
many times it goes round before the next one, wrapping past the last album. Album one four times,
then album two once, then album three three times, then round again. A count of nought is the skip
the part row already carries. While `arrange` is non-zero none of it is walked: which author is live
is a rule and not a second field, so a hand's albums survive a spell of drawing untouched, exactly
as its song does today
([0158](decisions/0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md)).

There is no new command. `deck.player` carries the whole spec, so an album edit is the one gesture
every other control on that card already sends (0089), and undo, the log, the archive and graph
restore come free.

The screen is one section rather than two. The song area is where a song is arranged now; it becomes
a view onto whichever album is selected, so clicking another album fills the same area with its
songs — and which album is open is a view preference, no command and nothing durable (§2), while
which one is _playing_ is the walk's. Both tiers wear the gestures a part row already wears: add,
duplicate, the drag off `src/ui/listDrag.ts`, and one dial for how many times it plays. That is the
decision the step records — an album is not a new kind of thing, so it gets no new kind of row.

Proof: the walk in `src/lib/playerWalk.test.ts` — four times round one album before the next, a
count of nought passed over, and the wrap at the end — the shape and its one validator beside the
new file in `src/lib/playerAlbum.test.ts`, `src/state/session.test.ts` and `src/app/restore.test.ts`
for the field, and the gestures asserted in `scripts/smoke.d/playerRate.js`, which already adds,
duplicates, skips and selects a part, rather than a browser scenario of its own (§3).

**P148 — A run can be made to wait, and the waiting runs out.** The durable shape is one
parameter declaration, `auto.wait`, in the automator's own `params` — a value per (instance,
parameter) in the map every knob already fills, so there is no new field, no new command and no new
road ([0030](decisions/0030-effects-are-instances.md)). It is said in seconds, because that is what
a hand is asking for; nought is not waiting; and the top of its range is a wait with no end, the
lock, held until the knob is turned back down. `auto.count` is already labelled _Held_, so this one
is _Wait_.

While a wait stands the run does not turn over: no place is let go and none is laid. What is
already arriving or leaving finishes rather than being cut, because nothing this entry holds is
ever cut off ([0202](decisions/0202-an-effect-declares-how-present-it-is.md)). The ticks the wait
covers are not realized late — the run's own clock is pushed out by exactly the wait, so a released
run lays its next place a full turnover later rather than catching up in one pump
([0204](decisions/0204-a-run-is-laid-on-the-automation-horizon.md)).

The wait is armed by the set and not by the value: the plugin takes the command's own instant and
holds until `at + wait`, so turning the knob to the number it already reads adds the time again.
That is what _add more time_ means, and it is what makes the hourglass a control rather than a
display. The step's one thing to check before it is written is whether a repeat of the same value
survives the whole road — the store, history coalescing and `setSync` each get a look; where one
drops it, the gesture nudges by a step instead of restating the number, and that is written down
rather than discovered twice.

How long is left is derived and never stored: a durable value that counted itself down would be a
command a second (§2). The card reads it off the per-frame `peek()` where the grown rows already
read theirs — one number per automator instance beside `grown` in `src/audio/deckPeek.ts` — and
`src/ui/GrownRows.tsx` paints it as an hourglass at the head of the run, emptying to nothing and
then turning over. Pressing the hourglass sends the same `param.set` the knob sends. `auto.wait`
takes a `driftUnreached` line, not a `driftFrom` mapping: a wait is _when_, and a row's shape is
_what_ ([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)).

Proof: `src/audio/effects/automator.test.ts` — a run that lays nothing across a waiting turnover,
one that lays exactly one place a full turnover after the wait ends, a second set that adds the
time again, and the lock that never ends; the tooltip in `src/lib/copyParams.ts`, which
`src/ui/tooltips.test.ts` totals against the registry so a missing one fails the gate; the sound
through the offline render already in `scripts/smoke.d/renderAutomator.js`, where a held run and a
free one over the same seed and the same seconds fingerprint differently; and the hourglass gesture
asserted in `scripts/smoke.d/rack.js`, which already edits a rack through its own visible
controls and undoes it, rather than in a browser scenario of its own (§3).

**P149 — A take begins where the ear is.** The durable shape is none. What moves is `ExportSpec` in
`src/app/exportAudio.ts`, which is what a dialog collects and not session state (P40): it grows one
field, `backSecs` — how far behind the live performance the take starts — beside the length, the
two fades and the name it already carries. Nought is _from here_, and a number is _from that many
seconds ago_.

It is realized with the render harness exactly as it stands. `RenderSpec.fromSecs` already drops
seconds from the head of a result before anything measures, fades or encodes it, which is how a
flatten loses the transport's lookahead
([0112](decisions/0112-a-flatten-is-a-spec-the-one-harness-already-accepts.md)).
A take is therefore one render of `warm + secs` seconds with `warm` dropped, where `warm` is the
live performance's own elapsed seconds less `backSecs`. Nothing new renders, nothing new fades, and
the file is the same one file in the same folder beside the same session archive (P91).

What makes that a re-performance of the part a person actually heard, rather than a fresh one, is
that everything time-varying here counts from its own start and is drawn from a seed: a grown run's
population is a function of its seed and its tick index
([0204](decisions/0204-a-run-is-laid-on-the-automation-horizon.md)), a jumping pattern's steps are a
function of the same one stream ([0089](decisions/0089-a-jump-is-the-transports.md)), and a lane
is a function of time. Warm the same commands for the same seconds and the run stands where it
stood. This is the reason the step is cheap and the sentence to write in its decision record.

One honest limit, stated rather than discovered: a render's origin is where its restoration
commands land, so every run in a take begins together, while live an automator added five minutes
late is five minutes younger than the yard under it. One warm-up cannot be right for two runs of
different ages. The take is warmed once, whole, which is exactly what today's export, a restored
session and an archive already are; if a run's own age turns out to matter, the fix is to stamp
each restoration command at the age the thing actually has, since an envelope already carries `at`
— and that is a second step, not this one.

The other limit is what an offline context costs. It allocates its whole output up front — stereo
float at 48kHz is 23MB a minute — so a warm-up is as expensive as a take of the same length even
though none of it is kept, and the hour `EXPORT_MAX_SECS` already names is the bound on `warm +
secs` together rather than on the length alone. A performance older than that warms to the cap, and
the dialog says which seconds it is about to render rather than silently giving back a different
part.

A live tap on the master bus — a ring of the last N seconds, handed straight over — is the other
way to reach backwards, and it is not taken. It is a second thing that produces audio, it cannot be
compared against the fingerprint that proves every other export (§3), it can only reach forward at
realtime, and it costs its memory whether or not anybody ever asks for a take.

Proof: `src/app/exportAudio.test.ts` for the arithmetic — that `backSecs` of nought renders the
length asked for, that a lookback renders the warm-up and drops it, and that the sum is clamped at
the cap with the clamp reported rather than hidden (principle 5); `src/app/render.test.ts` for the
one assertion that carries the whole claim — the same commands warmed twice fingerprint the same,
and a take warmed to `t` fingerprints as the tail of a longer render measured across the same
window; the field and its two states in `src/ui/ExportAudioDialog.test.tsx`; and the gesture in
`scripts/smoke.d/exportAudio.js`, which already opens this dialog and saves what comes back, rather
than a browser scenario of its own (§3).

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
- Two files sit at the 800-line hard cap: `src/lib/copy.ts` at 767 and `src/lib/player.test.ts` at
  798 — the kept ground's own validator cases went to `src/lib/playerBed.test.ts` beside `bedsOf`
  rather than in there (0194). Make room before landing
  at a cap, not after: the drop family moved out to `src/lib/playerDrop.ts` to make the room 0194
  needed. P142's name pool is about ten lines of `copy.ts`, so the room comes first — `EFFECT_NAMES`
  moves out to `src/lib/copyNames.ts`, the way `copyParams.ts` and `copyKnobs.ts` each took one,
  rather than the pools being shaved, since 0081's odds are the twelves multiplied.
- A tier above the song costs no command and no road: `deck.player` already carries the whole spec,
  so P147's album is a shape, a validator and a section, not a fourth command. What it does cost is
  room — `src/lib/copy.ts` is at 767, so the album's words take a file of their own the way
  `copyStrip.ts` did (0045), and its shape and validator go in `src/lib/playerAlbum.ts` beside
  `src/lib/playerSong.ts` rather than into `src/lib/player.ts`, which holds the spec and its one
  validator and nothing else.
- A new automator parameter costs three things beyond the behaviour: the declaration in that
  file's own `params`, a tooltip in `src/lib/copyParams.ts` which `src/ui/tooltips.test.ts` totals,
  and a `driftFrom` mapping or a written `because` in `driftUnreached`
  ([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)). Its label has to
  be one no sibling wears: `auto.count` is already _Held_, so P148's is _Wait_.
- Transport test cases go in `src/audio/playerLanding.test.ts`, since `createDeckVoice` may only be
  stood up in a test file
  ([0045](decisions/0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md), `scripts/arch`).
- Room in `src/lib/player.ts` is made by moving one family out to a file beside what reads it, the
  way `playerRest.ts`, `playerReverse.ts`, `playerSlots.ts`, `playerSpark.ts`, `playerClock.ts`,
  `playerRungs.ts`, `playerRepeats.ts` and `playerCharacter.ts` each took one. The file keeps the
  spec and the one validator.
- A new effect entry costs seven registrations beyond its own plugin file, each forced by a
  load-time throw, a compile error or a test rather than by review: a profile in `DRIFT_PROFILES`
  **and** its wave in `PROFILE_WAVES`, which is total, so a profile without a wave will not compile
  and all seven non-reserved profiles are already claimed
  ([0137](decisions/0137-an-effect-declares-the-wave-it-draws-with.md)); a `driftFrom` mapping per
  parameter or a written `because` in `driftUnreached`
  ([0148](decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)); a presence
  parameter that declares a lane ([0202](decisions/0202-an-effect-declares-how-present-it-is.md));
  an icon no other entry wears
  ([0056](decisions/0056-an-effect-carries-its-own-icon.md)); a pool parameter, weight,
  `driftUnreached` line and binding in `src/audio/effects/automator.ts` if it is growable; a tooltip
  per parameter in `src/lib/copyParams.ts`; and twelve adjectives and twelve nouns in
  `EFFECT_NAMES`, the nouns disjoint from every other pool
  ([0081](decisions/0081-an-effect-name-is-two-pools-multiplied.md)). Nothing in `chain.ts` or in
  any component changes — a new plugin appears in the picker by existing.
- A worklet costs two more: the processor in `src/audio/worklets/`, which imports nothing and
  duplicates its constants by hand, and its `?url` import and registered name in
  `src/audio/worklet.ts`, where each side names the other in a comment.

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
