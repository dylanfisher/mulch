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
The pattern a yard jumps is arranged as albums of songs of parts, each tier named, ordered and
saying how many times it goes round, with a part carrying the dials it was captured from — or drawn
by the pattern itself, which holds a hand's own run untouched meanwhile.
An automator grows a run of effects in a rack of its own, breathing between a floor and a ceiling at
the odds a turn lays anything, bounded by a window a hand may put on any parameter its pool draws —
read off the pool's own declarations, so a knob added to a plugin is bounded by construction — and
kept alive by one Wander dial beside Stray. Its run can be held still by hand — a Wait dial said in
seconds, and an hourglass at the head of the run that asks for that time again, up to a lock with no
end (0215). A yard running one, or jumping, is told its picture
never comes round rather than given a figure (0208, 0210).
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

Six steps are scheduled, P149 through P154. The order is what each one costs and what it stands
on: P149 first, because it moves no durable shape at all — two fields of a dialog's own spec, which
is not session state (P40) — and because a run that can now be made to wait (0215) is what gives it
a part worth taking. Then the five that move no durable shape either, which is why they
come last however small they are: P150 and P151 are the mulcher card's ground — where the box is
drawn, then why a dial in it stutters. P152 is the burst,
which is that card a third time. P153 and P154 are the automator's card, and they are last because
they are the two nothing else is waiting on. P154 goes last of all because the row its control is
drawn in was settled by the hourglass (0215), and a control placed before its row is
laid is a control placed twice. A later one comes from
[`ideas.md`](ideas.md) or from something the instrument has not been asked for yet.

### Scheduled

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

**P150 — The ground is not a fine tune either.** The durable shape is none, and no dial moves: what
moves is where the Which Ground box is drawn. It comes out of the fine tune's fold in
`src/ui/PlayerCard.tsx` and stands beside it, on a fold of its own, above the arrangement's — which
is exactly the move [0200](decisions/0200-the-arrangement-is-not-a-fine-tune.md) made for the
arrangement, said for the ground.

The argument is already written in the file, as the reason the box sits at the end of that fold
rather than among the three a part carries: it is the one box under there that moves the window
rather than moving inside it (0183), and it is the song's and not a part's (0184). Both sentences
are arguments for it not being under that fold at all. The fine tune is where one of the dials a
press on the front already moved is moved on its own (0197); the front moves no ground, so the
ground was never one of them.

There is no box. A bordered box is what tells one of four questions from the next inside a stack of
them, and a lone box under its own eyebrow is a frame around the only thing there — 0200's own
sentence, and the reason `PlayerGroup` is dropped here rather than kept: the eyebrow becomes the
fold's own toggle and `PLAYER_GROUND_TOOLTIP` hangs off the `Says` on it, the way the arrangement's
does. The word is `PLAYER_GROUP_LABELS.ground`, already written, so the step adds none.

What it costs beyond the move: a third `useState(true)` in `src/ui/Deck.tsx` beside `fineFold` and
`arrangeFold`, shut to begin with on the same argument they are — the picture, the strip and the
kept grounds are a question a hand asks once it has a loop worth moving; the prop and its paragraph
on `PlayerCard`; and the row in `src/ui/PlayerCard.test.tsx`'s props, which already spells the other
two out.

Proof: `src/ui/PlayerCard.test.tsx` — the ground's controls drawn with the fine tune shut, gone with
the ground's own fold shut, and each fold moving only its own half; and the amendment to
`scripts/smoke.d/playerRate.js`, which already presses the Fine Tune fold and now finds the ground
outside it, rather than a browser scenario of its own (§3).

**P151 — A ground dial keeps up with the hand while the yard is playing.** The durable shape is
none. Dragging Every or Distance in Which Ground stutters while a deck plays, and the fix is
whichever one thing is actually costing the frame — so the step's first commit is the measurement
and not a change. `./scripts/profile --compare`
([0051](decisions/0051-the-profiler-remembers-its-own-runs.md)) and a base run interleaved with the
head, because a single run's spread is wider than most of what this could be (§3).

Three suspects, cheapest to rule out first, and exactly one of them gets fixed (principle 4). The
card hands every dial a per-frame `voice` read while a song is arranged and the deck is playing
(`voiced`, `src/ui/PlayerCard.tsx`), so a drag's own renders queue behind the frame loop's.
`PlayerGround`'s drag carries nothing but its pointer and commits the bed it reached on every move,
and each commit is a fresh spec through `usePeakCanvas` and `groundsAhead`. And `PlayerBeds` beside
it re-derives its row off the whole spec. Which one it is goes in the decision record with the
figure beside it, so nobody guesses these three again.

The repair is on the React side and nowhere else: nothing per-frame may go through state
(`docs/boundaries.md`, 0070), so a second clock, a throttle on the gesture or a value painted ahead
of the store are all the wrong answer — what is allowed is memoising what does not change, keeping
what does in a ref, and not re-running a paint that would draw the same pixels.

Proof: whichever of `src/ui/PlayerGround.test.tsx` and `src/ui/PlayerCard.test.tsx` owns the thing
that stopped happening, asserted as a count — renders, or canvas draws — that fails at the count
before the change; the before and after figures in the decision record; and the drag added to
`scripts/smoke.d/longTasks.js`, which already watches for a long task and is where a claim about
frames belongs, rather than a browser scenario of its own (§3).

**P152 — The burst is tapped, and it may be held to the beat.** The durable shape is none, and the
burst stays exactly what [0119](decisions/0119-a-burst-is-seconds-and-the-rest-is-slots.md) says it
is: one number in wall seconds, the one length on the card that is not a subdivision. What the step
adds is two more ways of arriving at that number, both of which write the same `deck.player` the
dial writes, and neither of which the walk ever hears about — `src/lib/playerSlots.ts` says the
player has no tempo of its own, and it still does not.

A tap first: a press repeated sets the burst to the mean interval between the last few presses, the
oldest dropped, clamped onto `PLAYER_BURST_MIN…PLAYER_BURST_MAX` and stepped by the dial's own step,
so a tap can name nothing the dial cannot. It is a press and not a dial, in the How It Is Timed box
beside the Burst dial with nothing to open first (0195) — the same shape the ground's Plant has.
Nought taps and one tap set nothing: an interval needs two.

And a hold: a toggle beside it that rounds whatever is written — the tap, the dial, a typed number
(0201) — to the nearest whole division of the beat, taking the closest of the halvings from a whole
beat down to a thirty-second of one, which is what "a sixteenth, or the equivalent for a burst that
long" means on a range spanning three orders of magnitude. The beat is the **sounding** one,
`analysis.bpm * deckRate(state.params)`, which is the figure the yard's own waveform already reads
out (principle 1): the burst is wall seconds and the sample is played at a rate, so a burst held to
the unscaled tempo would be held to a beat nobody hears. A deck whose analysis is `null` or whose
`bpm` is nought has no grid, so the toggle is refused rather than absent, the way every control
under an off switch is (0121, 0173).

The toggle is not a field of the spec. It changes no number the walk reads, it holds no value of its
own, and a burst it rounded is a burst — so it is the card's own state, held by the yard beside its
folds, and the session it is not part of stays the shape it is (P40, 0026). Snapping is already what
the waveform's own toggle does to a loop (`snapLoop`), and this is that gesture said for a length
instead of a place.

Proof: `src/lib/player.test.ts`'s neighbour rather than `player.test.ts` itself, which stands at 798
of the 800-line cap — the tap's mean and the hold's rounding are burst arithmetic, so they go in a
`src/lib/playerBurst.ts` beside `playerRepeats.ts` with its own test, which is the room the cap
wants made (0045, §"What a step costs"); the two controls and the refusal in
`src/ui/PlayerDials.tsx`'s own test; the words in `src/lib/copyCard.ts`, since `src/lib/copy.ts` is
at 774 and a gesture's label and sentence are six lines it does not have; and the gesture in
`scripts/smoke.d/playerRate.js`, which already drives this card's own box, rather than a browser
scenario of its own (§3).

**P153 — A window is worn by the knob that decides how often it is drawn.** The durable shape is
none: `EffectBounds` per instance is exactly what
[0208](decisions/0208-a-run-is-bounded-off-the-pool-it-draws-from.md) left it, and so is the command
that writes one. What moves is where the popover is opened from.

Today the automator's card draws the pool twice. Six weight knobs — `auto.filter` through
`auto.tape` — each saying how often that entry is drawn against the rest, and then a row of its own
under them, an eyebrow reading Bounds and six icon buttons keyed by the same six entries. A hand
reads the pool once, reads it again, and matches the two up by icon. So the trigger moves onto the
knob: each weight knob wears its entry's own icon in its top right corner, and pressing that badge
opens the window that entry's arrivals are drawn inside. One row: how often, and inside what.

The badge is placed off `WEIGHT_OF` in `src/audio/effects/automator.ts`, which is already the one
list saying which parameter is which entry's weight, and never off a second one here (principle 1) —
so an effect joining the pool tomorrow wears its badge by existing, the way 0208 made it bounded by
existing. `src/ui/ParameterKnob.tsx` grows one optional corner node, filled by nothing but the
automator's own branch in `src/ui/EffectRack.tsx`; `src/ui/BoundsMenu.tsx` keeps the popover and its
rows and loses the row, the eyebrow and the `POOL` map, exporting the entry instead of the menu.
`BOUNDS_MENU` stays as the popover's title and as the badge's own name, because a badge a keyboard
cannot reach by name is a window only a mouse can open.

Proof: `src/ui/EffectRack.test.tsx` — a badge per weight knob and none on a knob that is not one,
the badge naming its own entry, and the popover it opens holding that entry's parameters and not
another's; the corner slot drawn and empty in `src/ui/ParameterKnob`'s own test; and nothing in the
browser, because no scenario presses Bounds today and a popover the driver clicks through is the one
trap §3 measures.

**P154 — A place can be let go of by hand, and it still leaves the way every place leaves.** The
durable shape is none, and it cannot be one: the run is drawn from a seed and never stored (0204,
0205), so a place a hand dismissed is not a fact a session could carry. What the step adds is one
non-durable command in the `Command` union beside `deck.seek` and `deck.play` — not a
`DurableEditCommand` — naming the deck, the automator instance and the place. No history entry, no
undo, no storage: letting go of a place is as undoable as a seek is, which is to say it is not, and
saying so in the type is cheaper than a transaction that would have nothing to put back.

It leaves the way the clock takes one. The command performs the plugin's own retire — the same fade
`auto.fade` gives every departure, followed by the same teardown — because nothing this entry holds
is ever cut off ([0202](decisions/0202-an-effect-declares-how-present-it-is.md)), and a hand asking
for it sooner is asking for sooner and not for a click. It is therefore the one gesture that works
while a wait stands (0215): the wait is the clock held, and this is a hand.

**The vacated slot stays empty until its own tick comes round.** That is the whole of the step's
argument and the one thing to get right — and an empty slot is a shape the run already has, since a
tick the odds leave unlaid makes one (0210). `createGrowth` lays into slot `tick % most` and every
draw a lay makes is spent whenever it is due, so the stream is a function of the spec and the tick
count alone (0134, 0204). Laying a replacement at the moment of the dismissal would spend a draw out of turn and
every place after it would be a different effect — the seed would no longer promise anything, and
`scripts/smoke.d/renderAutomator.js`'s two-renders-of-one-seed assertion would be asserting a
coincidence. So the dismissal retires and lays nothing: a hole for at most one turn of the run, then
the slot's own tick fills it with exactly the effect it was always going to.

The row's `×` is drawn at the end of the effect's name, mounted with the row rather than added to it
— every row is already mounted once whether or not it is holding anything, and nothing per-frame may
go through state (`docs/boundaries.md`, 0070). Shown on hover **and** on focus, because a control
only a hovering pointer can reach is one no keyboard and no `./scripts/drive` can press (§4). It is
in the column the hourglass settled (0215), so it is written after it.

Which place it names is read off `peek()` at the press and never off a prop, the way the card's own
plant and keep already are: a row addressed by its slot alone would dismiss whatever had rolled into
that slot while the pointer travelled. The press carries the place's `born` with it, and a command
whose place has already gone is refused rather than applied to its successor (principle 5).

Proof: `src/audio/effects/automator.test.ts` — a dismissal that fades over `auto.fade` rather than
stopping, one during a wait, a slot that lays nothing until its own tick and then lays exactly what
an undismissed run laid at that tick, and a stale `born` refused; the command's absence from history
in `src/app/effects.test.ts`, which is where the rack's own commands are checked; the row's control
in `src/ui/EffectRack.test.tsx` mounted, named and reachable by keyboard; and the sound in
`scripts/smoke.d/renderAutomator.js`, where the existing same-seed pair proves the stream did not
move — a render takes no live gestures, so what that scenario has to keep saying is that adding this
command changed nothing about what a seed grows.

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
  the pair lives in `src/ui/Deck.tsx` beside `fineFold` and `arrangeFold`, because a fold held by
  the card is forgotten every time the card's own fold closes (0157); a prop and its paragraph on
  `PlayerCard`; and a row in `src/ui/PlayerCard.test.tsx`'s props. Whether it keeps its bordered box
  is a written answer, not a default: a lone box under its own eyebrow is a frame around the only
  thing there (0173's argument run the other way, 0200).
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
  React state. The module's row is measured in `src/ui/moireRowsSong.test.ts`, which
  `src/ui/moireRows.test.ts` reached the hard cap and split into (0045); every other row stays in
  the latter, at 765 — and a row added to every picture is seven counted assertions in it, which is
  what P146's own broad row cost. A reading that belongs to no row at all is the third answer and
  costs neither set: it is answered by the per-frame read and spent over every row by the paint
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
  and all eight non-reserved profiles are already claimed
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
