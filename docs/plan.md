# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device. A performance stays editable, portable, reproducible through commands,
and identical through the live and offline signal paths.

---

## 1. Ordered next work

Finish one step, including its full gate, before starting the next. A step delivers a usable
vertical slice, not infrastructure for a feature nobody has asked for.

An entry says what durable shape it moves before the step is started. That is what makes a step
expensive, so it is the first thing to state. A step is written against §2, §3, and the standing
clauses in [subagent-prompt.md](subagent-prompt.md).

A block that adds N of one thing — a look per effect, a sketch per question, a worklet per entry —
names the file layout before its first step: one file per thing from the first, with its `@role`
line and its map.md row, rather than one file that hits the 800-line cap and pays a split on four
consecutive steps.

### Block: the TODO list is worked down

docs/TODO.md holds the human's notes from playing the instrument, and on 2026-09-20 they were
triaged into three groups (tmp/mulch-todo-triage.md): the ones concrete enough to land as stated,
the bugs and the small asks that carry one design choice, and the ideas that want a block of
their own. This block is the first two groups. Each step below is one of the human's entries or a
few that share a home, quoted where the words matter, with what a read of the code found beside
it. The order is bugs first, since they block current use, then the smallest edits, then the ones
that carry a choice. Decision numbers from 0398. The ideas group stays in docs/TODO.md until a
block is written for it; an entry is deleted from docs/TODO.md when its step lands.

**Layout, before the first step.** No new directory. A new effect entry is one file under
src/audio/effects/ with its `@role` line and map.md row, the way scatter is. A view preference
that outlives a reload (a fold, the picture's off switch) is one module beside src/ui/theme.ts
following its pattern: `localStorage`, no command, nothing durable (§2). A new deck fact (mute, a
tag) is a `SessionDeck` field and a command, through history, persistence and restore like any
other.

**Step 1 — an effect moves between racks without crashing
([0381](decisions/0381-a-menu-heading-stands-inside-its-group.md), landed).** _Durable shape
moved:_ none.
"fix move effect from one to another (crashes)". `effect.move` (src/ui/EffectMove.tsx) expands in
src/app/effects.ts into a removal and an arrival; reproduce first through `createInstrument`,
then in the browser, since the crash is most likely in the graph rewire's ordering rather than the
store's. **Tests that must fail first:** the reproduction, at whichever layer it lands — a move
between two yards, a move onto the master rack and back, a move of an entry holding lanes. The
decision records the cause. **Refused:** a guard that swallows the crash; a second way to move.
_Landed:_ the cause was neither the store nor the rewire — the Move To menu's heading stood
outside a group, so Base UI threw while the popup rendered and the menu never opened. Every
reproduction below the UI came back clean — a move between two yards, onto the master and back,
and one holding lanes, through `createInstrument` and through the real engine over a fake
context — and the yard-to-yard one, which no suite held, is now a case in
src/app/effectMaster.test.ts. The fix is one `DropdownMenuGroup`; the browser proof is
`scripts/smoke.d/moveCard.js`, in the renders lane.

**Step 2 — a duplicated yard's ground moves from the first jump
([0382](decisions/0382-a-ground-clock-is-about-the-ground-it-is-handed.md), landed).** _Durable
shape moved:_ none.
"when duplicating a deck, the 'which ground' where it wanders setting doesn't take affect. i have
to toggle a change before it starts going to other locations." `duplicatedDeckPreset`
(src/app/restore.ts) clones the player spec whole, so the spec arrives intact and something
downstream is not re-armed on the copy — the same fact a session restore must already get right,
so read the restore stages first. **Tests that must fail first:** through `createInstrument`, a
duplicate of a yard whose ground wanders reports the same next grounds as its source on the first
walk. **Refused:** a synthetic toggle on duplicate; a fix that restore does not also get.
_Landed:_ the duplicate was clean at every layer — the copy walks its source's grounds jump for
jump through `createInstrument`, through the real engine over a fake context, and in the browser
through the card's own Duplicate, with a gen source and a stored one, on its own ground and on the
session's, and a reload restores a wandering ground too. What is not re-armed is the _restore_: a
prepared voice was handed the ground coming back beside a clock built from the ground going out,
so a session restored onto a led shared ground named a leader no voice was reporting for and the
ground stood still until a gesture touched it — the reported sentence, one door along. The fix is
one argument in src/app/engine.ts; the pin for the copy is a case in src/app/decks.test.ts and the
failure is one in src/app/engine.test.ts.

**Step 3 — lull rests a yard the mulcher is playing
([0383](decisions/0383-a-rest-on-a-jumping-pass-is-a-gap-in-its-pattern.md), landed).** _Durable
shape moved:_ none. "lull effect
doesn't appear to work when mulcher is activated". Lull asks the transport to rest on edges from
its own seed (0371, src/audio/effects/lull.ts) and the mulcher drives the transport by its own
plan (src/audio/player.ts); one of them ignores the other's hold. **Tests that must fail first:**
a render of a mulched yard under a lull is silent across the lull's rests, matching the same
render unmulched. **Refused:** a lull that only works on one transport.
_Landed:_ neither ignored the other — the deck refused the ask outright, because 0371 had ruled
that only the ordinary pass could be rested. The ask now reaches the pattern: the player drops the
steps ahead of the instant, stops the one it falls inside there, lays nothing until the release and
then carries the same walk on from the ordinal the rest found. Nothing of the deck's transport
moves, so a rest on a jumping pass is a gap in its pattern rather than a halt (0383). The proof is
five cases in src/audio/deckRest.test.ts, driven on the fake context rather than through a render:
silence across the rest with nothing laid inside it, the walk continued rather than redrawn, the
read head parked, the second rest refused with a hand's play taking the one standing, a bypass
letting it go in place at the lookahead, and the two the review found: a re-arm inside a pending
rest laying its steps again rather than silencing the yard early, and a redraw's clear counting the
rack again so the fresh run's own edges are not spent unapplied. The rest put src/audio/player.ts past the 800-line hard
cap, so the queue entry a step is and the two cursor reads over it moved whole into
src/audio/playerCursor.ts, beside src/audio/playerWindow.ts and for its reason.

**Step 4 — the popped-out picture opens on the grid
([0384](decisions/0384-a-picture-with-no-screen-yet-draws-nothing.md), landed).** _Durable shape
moved:_ none. "when popping
open visualizer there's a underlying solid color, like orange, before the grid fills in." The
popup (src/ui/popupWindow.ts) wears the opener's sheets and renders one tree into its body; the
flash is the window's own body colour, or a canvas shown before its first bake. **Tests that must
fail first:** a headed run that opens the popup and reads its first painted frame; no new browser
scenario in the gate (0012). **Refused:** a fade that hides the flash rather than removing it.
_Landed:_ neither the body nor the sheets — the flash is the picture itself. A popped-out canvas
is a slot the screen shop has never baked for, and `inkThrough` (src/ui/moireScreen.ts) filled a
canvas with no screen behind it flat in the resolved `--primary`, which on a 720×480 window is
the whole picture in one solid orange. A headed run reading the popup's first painted frame found
it opaque `rgb(225,113,0)` at all five points for ~40ms, twice; with the fix it reads transparent
at all five, twice, and the grid arrives at ~90ms. The shop having nothing at all is now told
apart from an engine that will build no pattern (`BAKING`), and the first is the bail every late
tile already takes (0144, 0384). The pin is a case in src/ui/moireCanvas.test.ts. The guard put
src/ui/moireCanvas.ts past the 800-line hard cap, so the frame the picture lays back into itself
moved whole into src/ui/moireCanvasFeedback.ts, beside the test file already named for it.

**Step 5 — two small gestures: the knob's reset and the seed's dice
([0385](decisions/0385-a-reset-is-about-the-lane-not-the-number.md), landed).** _Durable shape
moved:_ none. "double clicking a automated knob should always reset it" — src/ui/Knob.tsx already commits
`defaultValue` on double-click and the lane-bearing dial is the one path that refuses it; and
"randomize button next to yard seed input" — the reseed already stands on the card's front
(src/ui/PlayerBlend.tsx); it gets a twin beside the field in src/ui/PlayerSeed.tsx, or moves
there, one command either way. **Tests that must fail first:** a double-click on a dial holding a
lane commits the default; the button beside the seed sends the same reseed the front does.
**Refused:** a third seed source.
_Landed:_ the lane-bearing dial did not refuse the reset — the knob did, and only for the lane
ridden from the parameter's own default, which is the ordinary way one is recorded. `commit`
(src/ui/Knob.tsx) dropped a value landing where the dial already stood, and a dial a lane is
painting is not standing at its value at all, so the move that clears the lane was never sent and
the dial went on following it. The dial is now told when a reset must go out regardless
(`resetsAnyway`), which is every dial holding a lane and no other (0385); the pins are three cases
in src/ui/Knob.test.tsx and three in src/ui/ParameterKnob.test.tsx, two of them the review's: a
reset with Option still held was recording a lane of one point at the default rather than clearing
the one it was pressed on — Option is the reveal, so the hand that can see the lane is holding it —
and the reset's own group was left open behind the pointer's ending, so a turn of the same dial a
moment later joined its entry. The wrapper now hears the double-click going past in the capture
phase, which is what tells a reset from a ride and from a drag. The die beside the seed is a
twin rather than a move: the front's stays beside the six names (0259) and this one stands beside
the field above the fold, both handed the card's own `onReseed`, named apart so two controls on
one card can be told from each other. Its pins are a case each in src/ui/PlayerSeed.test.tsx and
src/ui/PlayerCard.test.tsx, and P130's folded-card claim is retargeted rather than dropped: the
front's die still goes away with the body, and the seed's does not.

**Step 6 — the yard's header: mute, and a name it can be sorted by
([0386](decisions/0386-a-mute-is-a-scale-above-the-tap.md), landed).** _Durable shape moved:_
`SessionDeck.muted`, a boolean, and `SessionDeck.tag`, a short string, both empty by default;
stored sessions without them are discarded (0026). "decks should have a mute option" — a gain
already sits at the chain's output (src/audio/chain.ts), so mute is a second scale on it, never on
`deck.gain`, and never a stop; "ability to name or tag decks, e.g. low end, high end, etc." — a
deck already carries an emoji and a name (0057), so a tag is one more word drawn in the header and
on the effect-move menu. **Tests that must fail first:** `deck.mute` and `deck.tag` land, undo,
survive a snapshot round-trip and ride a duplicate; a muted yard renders silent while its peek
still moves. **Refused:** mute as a stop; a tag vocabulary.
_Landed:_ the mute is a gain of its own at the end of the chain, and the meter's tap moved above
it — the pan feeds both, and only the mute reaches what the yard is heard through, so a silenced
yard goes on reading its own level and drawing its own picture (0386). Never `deck.gain`: the
fader keeps the level a hand set and the unmute hands it back, and both ramps go through the one
`rampTo` so neither is a click (0102). Both commands carry the state to be in rather than a
toggle, which is what lets a press, a replayed line, a clip and a duplicate say the same thing;
both are restored unconditionally, unlike the loop or the player, because a flag and a word always
have a value — which is what makes a clip put back over a muted yard unmute it (0027). A flatten
renders at one and keeps both, since neither is in the samples. The tag is drawn as a field beside
the yard's name and again on the Move To menu, where a yard now reads "North Willow (low end)"
through one `taggedLabel` in src/lib/copy.ts. The pins are six cases in src/app/deckHeader.test.ts,
one in src/audio/chain.test.ts, one in src/app/engine.test.ts for the graph a restore rebuilds,
three in src/ui/DeckTag.test.tsx, three in src/ui/DeckMute.test.tsx and one in
src/ui/EffectMove.test.tsx. The mute's control moved out of src/ui/Deck.tsx into
src/ui/DeckMute.tsx beside src/ui/DeckRemove.tsx, because Deck.test.tsx is at the hard cap and a
control with a gesture wants a file a test can hold.

**Step 7 — the delay's beat is a setting the dial keeps
([0387](decisions/0387-a-held-dial-steps-and-its-copy-is-held.md), landed).** _Durable shape
moved:_ none — the hold stays runtime, decided in the step and recorded in 0387. "setting delay to beat mode
should change time to only toggle between set beat points" and "duplicate delay effect should also
copy the beat toggle". The hold lives in rack runtime (`beat.holds`, src/ui/ParameterBeat.tsx),
which is why a duplicate drops it; with it held, the dial's drag steps between the divisions
`beatBurst` already rounds onto (src/lib/playerBurst.ts) rather than sliding and rounding after.
**Tests that must fail first:** a duplicate of a held delay is held; a drag under the hold
commits only divisions of the beat. **Refused:** a second rounding.
_Landed:_ the rounding was already in front of every command, so what was missing was the
picture: the dial painted every value the hand dragged through on its way to a number the store
would not keep. A dial can now be handed a landing — the places it may stand at all — and while it
has one it steps between them (`land`, src/ui/Knob.tsx); the held parameter hands over the
rounding it already had, so one function is both the rule and the set of places (0387). The hand's
travel is kept and the dial's is not: a drag goes on accumulating above the landing and the keys
go on adding their step to it, which is what makes the dial step on the crossing and what keeps an
arrow key on a held dial from being permanently dead; a gesture's ending hands that travel back to
the place, or a press that crossed nothing would seed the next one from where the dial never was —
three cases of the review's, one per ending. The hold stays runtime rather than becoming
a `SessionEffect` field — it is a way of writing a number, not a number — so no stored session
changes shape (0026), and the copy carries it by hand: `duplicateEffectCommand` returns its
narrowed command so the press that mints the id hands both ids to the rack (`copyHolds`), off the
registry's own `beat` declarations rather than a list. The pins are two cases in
src/ui/Knob.test.tsx, one in src/ui/ParameterKnob.test.tsx and two in src/ui/ParameterBeat.test.tsx.

**Step 8 — a burst may be sixteen seconds and cross the seam
([0388](decisions/0388-a-burst-that-outlives-the-loop-wraps-it.md), landed).** _Durable shape
moved:_ none.
"increase mulcher burst timing to be up to 8 or 16 seconds. if a burst needs to wrap around a
loop to satisfy the length requirement it should do that, rather than get cut off at the end."
`PLAYER_BURST_MAX` (src/lib/player.ts) is two; the cap rises to sixteen, and a burst that outlives
the loop from where it starts continues from the loop's head through the seam
(src/audio/playerSeam.ts) instead of ending at the tail. Two halves, one step: the cap first,
then the wrap, so the second's test can ask for a burst longer than the loop. **Tests that must
fail first:** a sixteen-second burst is accepted and rounded by the beat hold; a render of a burst
longer than the remaining loop carries sound across the seam with no gap. **Refused:** a burst
longer than the loop that plays the loop twice as two bursts.
_Landed:_ the cap is sixteen and the clamp is gone: the window a source loops is the burst where
the bed has room for it and the **whole bed** where it has not, entered at the slot the landing
fell on, so a burst that outlives the loop plays its slot, runs off the tail and carries on from
the head (`slotRead`, src/audio/playerWindow.ts — out of src/audio/player.ts, which is at the hard
cap). Nothing was ever cut to silence: what was cut was the window, so a landing near the top of
the grid stuttered a fragment of the tail, which is exactly what a sixteen-second burst would have
been good for (0388). The bed's own end and never the buffer's, which is the clamp's reason kept
(0183); read backwards the wrap enters at the bed's end, since a burst covering the bed has no
slot left to begin at and entering where the clamped read already entered leaves the one
subtraction that can land before frame zero untouched (P121). The queue entry carries how far into
its window the slot is (`enters`), so the playhead crosses the seam with the source rather than
snapping back to the slot. The pins are one case in src/lib/playerBurst.test.ts, one in
src/audio/playerPeek.test.ts and two rewritten in src/audio/player.test.ts, which held the clamp.

**Step 9 — the loop is set by a count of beats
([0389](decisions/0389-a-beat-count-sets-the-loops-end.md), landed).** _Durable shape moved:_
none. "Add ability to set loop based on beat count". Analysis gives a `bpm`
(src/lib/analysis.ts) and the loop edge already snaps to its candidates (src/ui/LoopHandles.tsx);
a beat-count field beside the loop derives the end from the start and the count, and sends the
same `deck.loop`. Nothing durable rests on the count: the loop is stored in seconds as now (§2,
analysis is not a pure function of bytes).
**Tests that must fail first:** a count of four at a known `bpm` sends a loop of four beats; a
source with `bpm: 0` shows no field. **Refused:** a stored beat count.
_Landed:_ the count is derived both ways and stored nowhere: `beatsLoop` and `loopBeats`
(src/lib/analysis.ts) turn a whole count of beats into the loop that begins where the yard's
already begins, and a loop back into the count a hand could have typed, both in the buffer's own
seconds rather than the sounding ones (0031). The field is src/ui/LoopBeats.tsx, beside the snap
toggle in src/ui/Waveform.tsx and withdrawn — not drawn dead — where the analysis found no tempo,
the way a tone is offered no loop toggle (0110). A count that is not whole, or whose end would run
past the source, is refused and the field put back rather than clamped (principle 5), and so is a
field still reading what it was handed, because the read is a rounding and a blur that typed
nothing must not square the loop up behind the hand (0389). The field is remounted on the loop
itself and never on the count, so a half-typed number cannot outlive the start it was typed at —
both of those the review's finding. The blur-or-Enter commit and the seconds in a beat each became one — `useFieldCommit`
(src/ui/InlineField.tsx) and `beatSecs` (src/lib/analysis.ts), read now by src/ui/DeckTag.tsx,
src/ui/LoadField.tsx and src/ui/PlayerSeed.tsx, and by src/lib/lull.ts and src/lib/playerBurst.ts
(0389). The pins are six cases in src/lib/analysis.test.ts and ten in
src/ui/LoopBeats.test.tsx, two of them the step's own.

**Step 10 — a second stop clears the tails
([0390](decisions/0390-a-second-stop-clears-the-tails.md), landed).** _Durable shape moved:_ none.
"if possible, make it so pressing stop when already stops clears all noise (feedback, etc.)". The
global Stop (src/ui/GlobalTransport.tsx, `deck.stop` per yard) leaves every delay and reverb
ringing on the master's clock, which never stops (src/audio/masterEffects.ts). A Stop pressed with
nothing playing asks every rack, master included, to silence its tails — the same emptying and
rebuilding a restore already does to the master rack, or a ramp to nought and back. **Tests that
must fail first:** a render of a stop, a second stop and a window after it reads silence where the
first stop alone reads a tail. **Refused:** a third transport button.
_Landed:_ the emptying and rebuilding, because nothing else makes a delay line forget: `rebuildRack`
and `silenceRacks` (src/app/rackRebuild.ts) stand every rack back up out of the entries the session
already holds, and `restoreMaster` now reads the first of them rather than spelling the same walk a
second time (0390). The press decides at the gesture, from the pair one yard's own Stop button is
disabled on — not playing and holding no playhead (src/ui/DeckTransport.tsx), so Pause then Stop is
a first Stop — and sends one more command behind the per-deck stops and the rewind:
`session.silence`, durable in nothing and told to no deck. The clocks go down again behind the
rebuild, because a rack remembers neither and a lull rebuilt at nought lays no rests — the review's
finding, from all three lenses.
The proof is the render the step asked for, in scripts/smoke.d/renderMaster.js: a 0.9s take with a
90% feedback delay on the master, stopped at 0.4s, reads -15.5dB across the windows past 0.6s with
one stop and -120.0dB with two. The pins are five cases — four in src/app/rackRebuild.test.ts, one
in src/ui/GlobalTransport.test.tsx, plus two there rewritten around a session that is playing.

**Step 11 — the header counts the mulch
([0391](decisions/0391-the-header-counts-the-mulch.md), landed).** _Durable shape moved:_ none. "in header, add a effects
count, and yard count, and any other funny interesting statistics about how the sound is
manipulated. push the mulch idea - e.g. the sound is really getting put through a lot of
distortion." The counts are one read of the store beside the meter (src/ui/App.tsx); the words
are copy in src/lib/copy.ts, drafted plainly and left for the human to tune. Later statistics are
added to this one readout, not beside it. **Tests that must fail first:** the header's markup
carries the yard and effect counts and follows an add and a remove. **Refused:** a count that
needs a peek per frame.
_Landed:_ one readout on the bar beside the meter, not four things loose in the row:
src/ui/MulchTally.tsx draws the yards standing, the effect instances over every rack, the
parameters moving on their own and the deepest chain one yard's sound crosses, with a word grading
that depth after them (0391). Every number is a fact the store already holds — `tallyMulch`
(src/state/mulchTally.ts), derived on the read and stored nowhere (0025), the master's instances
counted with the yards' because the master is a rack (0321), and a session holding no yards graded
by the master's rack alone rather than reading "untouched" over a full one — so nothing here peeks
and nothing here runs per frame. The subscription is the four numbers as one string (`mulchKey`, `mulchOfKey`):
a snapshot has to be its own identity or `useSyncExternalStore` spins, and the `decks` record is
replaced on every `param.set`, so reading objects would re-render for the whole of a knob drag —
the shape src/ui/EffectMove.tsx already reads its tags in. The words are src/lib/copyMulch.ts,
beside src/lib/copy.ts because that file is at the cap (0045), with the two nouns the counts are
named by read back from `YARD` and `EFFECTS_LABEL` rather than retyped, and the grade a ladder from
Untouched to Pulverized for a hand to tune. The group the readout joined wraps now rather than
pushing the row out, which is what the 360px shell asked for (scripts/smoke.d/narrow.js). The pins
are fourteen cases — eight in src/state/mulchTally.test.ts, five in src/ui/MulchTally.test.tsx and
one in src/ui/App.test.tsx, the last of them the step's own header markup, read up to the
header's own close.

**Step 12 — a fold is remembered, and the master's starts open when it is full
([0392](decisions/0392-a-fold-is-remembered.md), landed).** _Durable shape
moved:_ none — a fold is a view preference (§2). "master effects should not collapse by default if
any effects are present (or better yet, remember collapse state of each deck/module in local
browser session)". src/ui/MasterRack.tsx hard-codes its fold shut and src/ui/Deck.tsx its own
open; both read the remembered fold first, keyed by rack, and the master's default is open when
its rack holds anything. **Tests that must fail first:** a master rack with one entry mounts open;
a fold set on one mount is read on the next. **Refused:** a fold in the session, a command, a
history entry.
_Landed:_ one module beside src/ui/theme.ts — src/ui/rackFold.ts, whose
`useRackFold(rack, whenUnset)` reads what a hand last left this rack as and falls back to the
caller's own default only where no hand has said (0392). Both racks read it, keyed by the
`DeckId | null` every control on a rack is already addressed by: the master's (src/ui/MasterRack.tsx)
and every yard's (src/ui/Deck.tsx, in place of the `useHeld(false)` beside its siblings). The
default is read on every render rather than frozen at mount, because the master's is a fact about
the rack — shut over nothing — and the rack is filled by a restore that can land after the first
render. Nothing durable moved: no command, no history entry, no field of the session, and the
store's own failures are the theme's — junk is not a choice, an access that throws is a line on
the console. That guard was its third spelling, so the review's Reuse lens took it out of all three:
src/ui/preference.ts is the one guarded read and write now, and the theme, the sequencer view and a
fold keep only their key, their parse and their default. The pins are fourteen cases: nine in
src/ui/rackFold.test.ts and five in the new src/ui/MasterRack.test.tsx, which had no suite of its
own before this step.

**Step 13 — an automation has a floor and a ceiling
([0393](decisions/0393-a-lane-has-a-floor-and-a-ceiling.md), landed).** _Durable shape moved:_ a
lane's bounds on the deck's and the instance's `automation` record, absent by default — discard, no
migration (0026). "effect automations need ability to set min/max values for automations". A lane's
values are read through its parameter's range (`AutomationRange`, src/lib/automation.ts); a lane may
now carry its own sub-range, drawn on the preview (src/ui/AutomationPreview.tsx) and honoured by
the one reading of a lane, so a recorded or drawn lane can be squeezed after the fact. **Tests
that must fail first:** a lane with bounds normalises inside them; the bounds ride a snapshot, an
undo and a duplicate; a render with bounds differs from one without exactly by the squeeze.
**Refused:** a second reading of a lane.
_Landed:_ `laneBounds` is the lane's own window, beside the lane and never inside it — `drawn`'s
sibling in every respect 0314 set: one command (`automation.bounds`), one restoration stage after
the lanes, carried by a duplicate, and cleared by the lane's own reducer (0393). The squeeze is
`squeezeLane` in src/lib/automation.ts, which is one call of `rescaleLane` and so a squeeze rather
than a clamp — a floor that flattened every point beneath it onto itself would answer a quieter
gesture with a different one. It lands once, on the way to the host, at the three places a lane
reaches it, so the session keeps the gesture and a window can be widened or taken off afterwards.
The preview draws the squeezed gesture and the window's two rules under it, and the control is
src/ui/LaneBoundsRow.tsx — a two-ended slider in the picture's own linear space, because a lane's
values ignore the curve its dial is drawn on. src/app/execute.ts crossed the 800-line hard cap on
the way, so the three lane commands and the address rule they share left for
src/app/automationEdit.ts. The pins are sixteen cases: five in src/lib/automation.test.ts, five in
src/app/automation.test.ts, two in src/ui/AutomationPreview.test.tsx, three in the new
src/ui/LaneBoundsRow.test.tsx and one in src/state/session.test.ts.

**Step 14 — the automator may throw between a few states
([0394](decisions/0394-a-run-may-be-thrown-between-a-few-states.md), landed).** _Durable shape
moved:_ none — `auto.states` is a knob on the automator's declaration
(src/audio/effects/automatorParams.ts), so an instance's values record already carries it. "effect
automator needs a way to set a random 0/1 style value change, so you can do something like toggle
between two random states, and set duration of automator to get interesting effects. you could set
1/2/3/4 etc different states on a knob." A count of states, one to four, drawn from the seed the
way the population is (0203); at one it is today's automator. **Tests that must fail first:** the
growth maths with a state count yields exactly that many distinct values per parameter across a
long run, same seed same run. **Refused:** a stored draw.
_Landed:_ `auto.states`, one to four, at one by default — and one is the run as it was rather than
one state, which is the only reading of the floor that leaves every run drawn before this knob
untouched (0394). `stateDraw` (src/lib/effectGrowth.ts) reads which of that many equal shares of a
parameter's window a draw landed in and takes that share at a phase drawn off the run's own
generator, one per parameter, when the cursor is built: the states are the seed's, not a lattice
every run shares, and nothing is stored. Only a value's own draw is snapped, so which entry a place
lays and whether a standing value moves stay free. The count is a ceiling — a presence, or any
window a hand has closed, takes one value however many states the run is thrown between. It reaches
the picture as the rows it grows, the way a pool weight does, so it is the twelfth line of
`AUTO_UNREACHED` rather than a drift claim: the review's Seam lens showed that the obvious claim,
`fringe`, is one of the five dimensions the whole picture shares by boldest claim, and the knob's
own default would have stood at the far end of it and flattened every picture in the instrument.
The pins are seven cases: six in the new src/lib/effectGrowthStates.test.ts — which is where they
went because the existing suite crossed the 400-line soft cap — and one in
src/audio/effects/automator.test.ts, that the knob reaches the maths at all.

**Step 15 — the ground moves under a yard the mulcher is not on
([0395](decisions/0395-the-ground-moves-under-a-yard-with-no-pattern.md), landed).** _Durable shape
moved:_ none — the motion spec stays on the `PlayerSpec`, which the switch already keeps whole
(P164), so a yard switched off is holding everything a crawl needs. "which ground should be able to
set how it moves without enabling the mulcher". The strip already moves the
loop itself with the mulcher off (src/lib/copyGround.ts's tooltip); this lets the wander, its
distance and its direction (0277) drive that loop on the pattern's clock without a pattern. Read
how much of src/lib/playerWalk.ts the ground needs before deciding. **Tests that must fail
first:** a yard with the mulcher off and a wandering ground reports a moved loop after one
period. **Refused:** a hidden mulcher.
_Landed:_ what the walk needed was its move and nothing else, so the crawl is the walk's three
amounts spent on a walker of its own — `crawlBedAt` (src/lib/playerCrawl.ts), which is what the
session's shared ground already was and now the one walker both grounds spend (0313). The clock is
the loop coming round, counted as reports arrive rather than off the reporter's cycle number, since
a move the playhead does not survive restarts the pass and sends that number to zero. `playerCrawling`
is `playerSounding`'s exact complement, and `createDeckCrawl` (src/audio/deckCrawl.ts) holds the
loop the hand set as the ground it counts from and hands the transport the window to play next —
the deck's own loop moves, the session's does not, so nothing durable drifts and the playhead
reports where it is reading. The ground fold's two controls are live with the switch off and read
the held spec, which is the half of the ask a working transport alone would not have delivered; it
narrows P164 by exactly those two, and its suite says so. The pins are ten cases: four in the new
src/lib/playerCrawl.test.ts, six in the new src/audio/deckCrawl.test.ts, and one retargeted in
src/ui/PlayerCardSwitch.test.tsx.

**Step 16 — a play/pause effect
([0396](decisions/0396-a-play-pause-effect-is-the-lull-held-loosely.md), landed).** _Durable shape
moved:_ none; one knob on an entry that already exists. "play/pause
effect, kinda like scatter". Scatter's shape (src/audio/effects/scatter.ts) with a gate instead of
a cut: a seeded schedule of holds and releases asked of the transport the way lull asks (0371), so
it is lull with a shorter grain and a second knob, or lull grows the knob — decide by reading lull
first, and if lull grows, this is a step on lull and not a new file. **Tests that must fail
first:** a render under it is silent exactly on its scheduled holds. **Refused:** two entries
that rest a transport differently.
_Landed:_ the lull grows the knob, so there is no new file. Its two lengths already reach a
hundredth of a second, so the shorter grain was there and what was missing was scatter's Stray:
every rest exactly as long as its dial is a square wave, and a square wave is a tremolo rather than
a performance. `lull.loose` is that draw on a lull's two lengths — the dial is the ceiling, the
knob says how far under it a draw may fall, the length is drawn before the beat rounds it and
floored at the dial's own bottom — and it takes a lane read at the instant the length it draws is
spent, reaching the picture as `bend`. The draws are spent whatever it is worth, one per length and
one per roll, the check's taken when the edge it counts from is laid, so the list stays a function
of the horizon alone and a knob does not move what a seed promises (0396). That the render is
silent exactly on its holds is scripts/smoke.d/renderLull.js, which stands untouched because the
knob's default is nought; the pins are five cases, four in src/lib/lull.test.ts and one retargeted
in src/audio/effects/rackPlugins.test.ts, which now also proves the lane and the drawn rest through
the rack.

**Step 18 — the picture can be switched off, and the rest is an interview
([0397](decisions/0397-the-picture-has-a-switch-and-off-is-not-mounted.md), landed).** _Durable
shape moved:_ none; the switch is a view preference. "add a way to completely disable visualizer for
slow computers, free up space. interview me about other ways to add a low resource mode when e.g.
many items are automated over 7+ decks. ask if collapsing a deck frees up resources (e.g. we don't
have to draw the knob moving.)" The switch lands; then the step reports what a folded yard already
skips (its knobs' animation, its strip) and what it still pays, with numbers from
`./scripts/measure` on a seven-yard rack, and asks the human which of the remaining costs to
switch — those become steps of their own. **Tests that must fail first:** with the picture off no
bake runs and no canvas mounts. **Refused:** a mode that guesses the machine is slow.
_Landed:_ the switch is `src/ui/driftShown.ts` beside the sequencer view, and `MoireStrip` is a
read of it over a body that is mounted only where it says so — off there is no canvas, no surface
asked of the tile shop, no bake, no frame callback and no second window, which is the pin in
src/ui/MoireStrip.test.tsx, beside four cases on the preference itself (0397). Landing it put
src/lib/copy.ts and src/ui/MoireStrip.tsx over the 800-line hard cap, so the pop-out's two words
went to src/lib/copyDrift.ts, where the drift's other controls already speak, and the zoom, the
window and the press that chooses between them went to src/ui/driftZoom.tsx whole. The interview
half was not held — there was no human in this run — so what it would have asked is written out as
candidate switches in §4, measured rather than guessed: `./scripts/measure --yards 7 --runs 1`, an
instrument this step added to the harness rather than forking it (0375), reads 48.2 frames a second
and a 69.6 ms rAF p95 on seven yards against 104.2 and 24.9 ms on two, with the same rack and the
same walk on each of them.

**Step 19 — the picture as the card's ground, looked at.** _Durable shape moved:_ none. "try
seeing what it looks like if the visualizer is the background of the entire card." An experiment
and not a feature: a shot, or a headed run, of the strip drawn under the whole yard card with the
controls over it, kept as a branch or a sketch for the human to look at — landed only if they say
so, and then as its own step. No new browser scenario (0012).

---

## 2. Rules for every feature

The invariants in [boundaries.md](boundaries.md) hold for every step. These are the rules about the
shape of a _change_ rather than the shape of the code.

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL call
  `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`. Command shapes do not grow independent time fields.
- Raw files, audio nodes, functions, and browser permission objects never enter commands or the
  durable session.
- Durable edits participate in bounded history, persistence, portable archives, and graph restore
  unless a decision proves why they do not.
- Async work carries source or operation identity, so a stale completion cannot overwrite newer
  state.
- Analysis is not a pure function of stored bytes: `decodeAudioData` may resample to the device's
  rate, so onsets differ across machines. Nothing durable may rest on derived analysis.
- A view preference, such as snap, theme, or whether the debug console is open, is not session
  state: no command, nothing durable, no history entry.

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

**0012's line is a rule about browser work.** `./scripts/check` runs its steps concurrently and
`drive` is nearly the whole wall clock, with the second-slowest step finishing seconds early: a
feature may add two seconds of Vitest and cost the gate nothing, while a browser scenario's cost
lands on the mean one for one. Offline `render()` calls are the cheap place to prove sound — they
join underneath the deck fixture's real-time waits and cost close to nothing. New browser work that
cannot be a render picks one of the browser half's three lanes and states what that lane's page must
already hold in its prelude, rather than reading what a neighbouring scenario happened to leave
([0238](decisions/0238-the-browser-smoke-runs-in-lanes.md)). Two traps are measured: a popup whose
entries `./scripts/drive` presses opens instantly, because Playwright waits out enter and exit
animations before it may click, which has cost one scenario up to 1.68s
([0056](decisions/0056-an-effect-carries-its-own-icon.md)); and browser work added _before_ the
chain lane's `page.reload()` — the only reload in the smoke — is kept after it instead, for a
reloaded-audio-clock stall that has not reproduced since `88173b2` and was never explained.

Measure a change by stashing it and comparing means across several runs, **interleaved**. A single
run's spread is wider than most features cost: the same unchanged commit read 414ms apart across two
windows fifteen minutes apart, 1.7 times 0012's own step size. Never quote a mean measured in a
different window from the one it is compared against.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and a
failing seam-level test before broad UI work. Do not turn the driver into a second application by
teaching it feature semantics.

## 4. Not taken

**Step 2 did not reproduce as reported.** A duplicated yard's ground walks its source's grounds
from the first jump on this build, at every layer a reproduction can reach — the stage list carries
the whole spec and the walk is a pure function of it — so the step's named test landed as a pin
that never failed rather than as proof. What it cost was the hunt: seven reproductions before the
defect turned up in the restore beside it (0382), which produces the same sentence the entry does.
Whether the human met it through a duplicate or through the undo beside one is not knowable from
the note, and a second guess at their session was refused.

**Step 1's crash has no proof below the browser.** The Move To popup is a portal that renders
nothing outside one, so no colocated Vitest case can watch Base UI throw; what the suite holds is
the structural rule — every heading inside the group it heads — and the throw itself is caught by
`scripts/smoke.d/moveCard.js`, which the local gate alone runs (0380). The alternative was an
error boundary around the menu, which the step refused: a guard there leaves a control that opens
onto nothing.

**Step 4's proof is a headed run outside the gate, and one fallback narrowed.** The flash is a
frame, so nothing below a browser could read it: the reading is a one-off headed Playwright script
in a scratchpad, sampling the popup's canvas at 8ms from the document's first tick, base and head
interleaved twice each — and the gate keeps no browser scenario for it (0012). Nothing was running
on 5173 or 4173 for it to drive, and worklet modules are fetched off the page's own route table,
so interception could not serve a built `dist/`; the script stood up Vite's dev server in its own
process and closed it in a `finally` rather than leaving one listening. What the fix costs is in
0384: a canvas whose engine would never build a screen draws no picture where it used to draw a
flat rectangle of ink. The two are told apart at the source, so only the never-baked canvas is
affected, and a canvas that cannot make a pattern cannot draw the picture anyway. The guard also
put src/ui/moireCanvas.ts past the hard cap, and the feedback pass moved out whole rather than the
file being shaved.

**Step 3's proof is the schedule, not a render.** The step named a render of a mulched yard under
a lull held against the same render unmulched. Nothing below the browser can host one — a render
is an `OfflineAudioContext` and the suite runs on the fake context — so the silence is proved
where it is scheduled instead: every step of the pass is stopped by the rest's instant, no tick
inside the rest lays another, and the first step laid again begins at the release. The fake
context records exactly the starts and stops a render would sound, so what is untested is the
sample and not the schedule. The rest also stops the step it lands inside hard, with no seam,
which is what an ordinary pass's rest already does to its source; one rule for both transports was
worth more than a fade that would move the rest a seam off where the lull drew it. Two costs are
taken knowingly, and are in 0383: a bypass arriving before the rest's instant still cuts the pass
there, because a stop already scheduled cannot be taken back; and an arming that cannot reach the
instant — `MAX_PLAYER_STEPS` at the shortest slot — rests where the queue ends instead of where the
lull drew it, which is the transport's own horizon margin (0120) rather than this rest's.

**Step 5's reset is narrowed to the dials a lane drives, and the die is a twin.** Making a
double-click commit unconditionally on every dial would send a patch from every dial carrying a
live read — the voice a song moves, the draft of a span drag — for a gesture that changes nothing
there, so the knob is told per call site and only the automated one is told (0385). The seed's die
could have moved off the card's front instead of being twinned there; moving it would have broken
the pair of draws 0259 stands on, so the card now carries two controls sending one command, named
apart. Its cost is P130's line: a folded yard's heading now holds the seed, the switch and a die,
rather than the seed and the switch.

**Step 5 left two sentences standing that have drifted.** `RESEED_LABEL`'s doc in src/lib/copy.ts
still calls the reseed "the one gesture on the card that is neither a state nor a number", which
is true of the command and no longer of the presses; and `InlineField`'s `self-start` (0306) now
resolves against the seed's own row rather than the heading, which changes nothing while every
item in that heading is `h-7`. Both were reported by the review and both were left: neither is a
duplication or a reachable failure, and principle 4 is the smallest change that solves the
problem.

**Step 6's mute reaches a rebuilt graph by two roads, and its control left the yard's own file.**
The restore's stage list sends `deck.mute` like every other durable field, and src/app/engine.ts
sets it again on each prepared voice — because an undo swaps a session onto voices prepared before
the swap and replays no commands at all, which is the arrangement the sequence beside it already
uses (0379). Both were kept rather than picking one: dropping the stage would leave a JSONL replay
and a clip silent about the mute, and dropping the prepare would leave an undone session muted in
the store and heard in the graph. The cost is one fact written in two places, held together by the
case in src/app/engine.test.ts. The mute's Toggle also moved out of src/ui/Deck.tsx into
src/ui/DeckMute.tsx: src/ui/Deck.test.tsx is at the 800-line hard cap, so a control with a gesture
in it had nowhere in that file to be pressed from — the split is the one at-the-cap move, not a
shave. And `taggedLabel` has one caller today, which is a second occurrence and not a third: it is
in src/lib/copy.ts rather than in the menu because the word it composes is copy, and copy is
declared there (principle 1). Three of the review's findings landed: the Move To menu reads the
yards' words as one joined string rather than subscribing to the whole `decks` record, which
`param.set` replaces per pointer move — the wide read would have re-rendered every card's menu for
the length of a knob drag; the flatten's two claims got the case that pins them, since the kind
list alone stayed green with both of them inverted; and the chain's sentence about what the
fingerprint measures, which the mute had made half false, was rewritten. Two were declined: the
tag is not drawn under the sequencer face, where the yard's own name is not drawn either, and a
tag of one space renders as an empty pair of brackets, which a hand can clear and the instrument
should not quietly rewrite.

**Step 7's hold is copied by the rack and not by the reducer, so a copied yard starts loose.**
Keeping the hold out of `SessionEffect` (0387) is what keeps stored sessions the shape they are,
and it puts the copy in the hand that mints the new id — the press on a card's head, in the rack
that is about to hold both cards. A whole yard duplicated (`deck.duplicate`) mounts a new rack
with its own runtime, which opens holding nothing, so the copy's delay is on the same time as its
source and no longer rounding to it; the same is true of a reload, which is what the hold has
always cost. The step's words are about the card's own copy, and that is what landed. A yard's
copy, a clip and a restore would all come free from a durable hold, which is the trade 0387 names
and refuses.

**Step 7 left two things standing that the review found and this step is not the place for.** The
delay's Time declares no step, so its dial takes the knob's default 0.01 over a log range of
0.01–2, and a key's own move below about 0.1s is finer than that: `commit` snaps it back and the
arrow keys are dead there, hold or no hold — P82's collision at the burst's floor, at a second
call site, and true at HEAD before this step. The landing does not cause it and cannot fix it; a
step of `delay.time`'s own would. And the mulcher card's burst still slides under a held hand and
is corrected once the store answers (`heldPatch`, src/ui/playerBurstControls.ts): it is the same
hold and the same `beatBurst`, now two gestures on two cards. Step 8 did not open that file after
all — the cap is a number in src/lib/player.ts and the wrap is in the transport, so nothing in the
step reached the card's gestures — and handing its dial the same `land` is a change of its own,
left for the step that has a reason to be in there.

**Step 8's review found the ceiling had broken the burst readout, and it was fixed here.** Three
lenses named the same thing: `burstValue` told milliseconds from seconds by the dial's own top, a
rule that worked only while that top sat below the smallest reading the box draws, so at sixteen
the band `5`…`16` was ambiguous and typing back the floor's own `5` set five seconds. The unit is
now read off the spelling, with a whole number under the floor in milliseconds taken as seconds;
`burstLabel` drops its hundredth by measuring the reading rather than by comparing the value,
since `(9.996).toFixed(2)` is five characters; and `tapPress` takes the bounds `tapBurst` already
took. The pins are two cases in src/ui/KnobReadout.test.tsx — where the burst's format and its
parser moved, because src/ui/Knob.test.tsx reached the 800-line cap — and one in
src/lib/playerBurst.test.ts.

**Step 8 proves the wrap at the window and not at the samples.** "A render of a burst longer than
the remaining loop carries sound across the seam with no gap" is pinned as the window the source
loops and the playhead that crosses it: with `loop = true` a window is continuous by the graph's
own definition, and the unit suite has no sample-accurate host to hear it in — `./scripts/check`'s
offline renders are the browser's, through scripts/smoke.d. The wrap rides the smoke scenarios
that already render a jumping yard rather than taking one of its own, because what would be new
there is a burst length and not a behaviour the harness cannot already reach. The divisions a hold
rounds onto were left where they are, so a sixteen-second burst held to the beat lands on the beat
itself: multiples of a beat are a vocabulary of their own (0388).

**Step 9 collapsed two duplications and declined one reuse.** The blur-or-Enter commit was about
to be written a fourth time, so it became `useFieldCommit` (src/ui/InlineField.tsx) and
src/ui/DeckTag.tsx, src/ui/LoadField.tsx and src/ui/PlayerSeed.tsx were moved onto it; `60 / bpm`
and the refusal in front of it was about to be written a third time, so it became `beatSecs`
(src/lib/analysis.ts) and src/lib/lull.ts and src/lib/playerBurst.ts were moved onto it. Both are
principle 3 on the occurrence that earns it, and both came out of the review's Reuse lens, which
found the fourth field and the third beat this step had counted as one fewer. `masterTempo`
(src/app/engine.ts) is left alone: it derives a tempo from a sync interval, which is the inverse
fact. Reusing src/ui/LoadField.tsx outright was declined for a reason rather than a preference — its skip guard compares the input against the
number it displays, and here the displayed count is a rounding of the loop that must still be
committable, so the comparison has to be against the derived loop (0389).

**Step 10 cuts the tail rather than fading it, and pays 205ms for its render.** A rebuild is
instantaneous, so what was ringing stops between one sample and the next — the same cut a restore
already makes when the rack it comes back to differs, and the gesture's own meaning, since a hand
pressing Stop twice is asking for silence now. A fade would want a gain per rack that no rack has,
and a ramp to nought and back would only cover the tail while it was down: the feedback loop goes
on circulating behind it (0390). The render the step named went into
scripts/smoke.d/renderMaster.js rather than into a scenario of its own, since it is the same rack
the file is already about; interleaved base and head runs of `./scripts/check` measured
10.59/10.84s against 10.69/11.15s, a mean delta of 205ms and inside 0012's 250ms. The walk a
restore makes over one prepared deck's rack (src/app/engine.ts, inside `prepareRestore`) was left
where it is: it is interleaved across four per-deck passes for the crossfade's sake, so it is not
the same walk `rebuildRack` is. A yard whose source ran out by itself reads as stopped and takes
the clearing on the next single press, which the review raised and this step declined: the step's
words are "a Stop pressed with nothing playing", and there is nothing for that press to stop. A
paused yard is the other way round and was fixed — it has a playhead to stop, so Pause then Stop
is a first Stop (0390).

**Step 11's counting left `src/lib`, its words left `src/lib/copy.ts`, and the header's right-hand
group learned to wrap.** The step put the read "beside the meter" and the words "in
src/lib/copy.ts"; neither is where they landed. A tally is a read of `SessionState` and `src/lib`
may import nothing (docs/map.md's tiers), so `tallyMulch` is a selector in src/state/mulchTally.ts
— the tier the store is in — and the words are src/lib/copyMulch.ts, since copy.ts stands three
lines under its hard cap (0045, and the reason copyLoop.ts exists). The readout also made the
header overflow at 360px: the `narrow` smoke named the `ml-auto` group as the surface running past
the viewport, so that group and the readout inside it wrap on a second line rather than pushing the
row out, which is the reflow the shell already claims (P24). A count of bypassed instances was
drafted and cut: it says a card is switched off, not what the sound is crossing, and the step's own
refusal is against statistics that cost more than they say (0391). Three review findings landed
with tests: a list entry with no yard behind it is refused through the store's own `deckIn` rather
than skipped past, a session holding no yards is graded by the master's rack rather than reading
"untouched" over a full one, and the header pin now reads up to `</header>` by index and follows a
remove as well as an add. Three were declined. The header's 4rem scroll reserve at 360px is not
this step's: `SHELL_HEADER_ROW` has carried `flex-wrap` since P46 and that row is already several
lines tall at a phone's width, with or without this readout. `lanesIn` stays `Object.keys(...)
.length` — it runs per store notification rather than per frame, and the loop forms that avoid the
array need a binding this repo's lint refuses. And the readout is plain text under a `Says` rather
than a focusable trigger, which is how a readout is written here (src/ui/MoireTuning.tsx,
src/ui/PlayerCharacter.tsx); what did move is its `aria-label`, deleted because a name on an
element with no role names nothing, and each number is captioned in the markup already.

**Step 12 remembered the two rack folds and not every fold on the screen, and remembers them per
view rather than per tab.** The entry's parenthesis says "each deck/module"; the step's own words
name src/ui/MasterRack.tsx and src/ui/Deck.tsx's rack, and that is what landed — a yard carries
nine folds (the card, the jumps, the fine tune, the ground, the arrangement, the song, the part's
dials and two more), every one of them shut or open for a reason written beside it, and
remembering all nine is a different question from the one the entry is complaining about. Any of
them can read `useRackFold` later without the module moving. Two costs are known and taken. A
yard's fold is keyed by its id, and although a letter is never reused inside one session (P55), a
session started fresh begins at A again and that yard reads whatever the last A was left as — one
caret in the wrong position, corrected by one press, and nothing durable follows it. And the fold
does not sync between tabs the way the theme does: two tabs showing different colours is one
instrument contradicting itself, two tabs with different sections folded is two views (0392).
Two review findings were declined. The master's default moves both ways while no hand has touched
it — a rack standing open on the default alone folds when its last card goes, and opens again on
the undo that brings it back — which is the entry's own rule read in both directions and settled for
good by one press of the caret (State lens, 0392). And the `localStorage` test double is now spelled
three times, which the Reuse lens is right about: it stays spelled three times because a shared one
needs `vi.fn` spies for the calls src/ui/theme.test.ts asserts, no `*Double` module in this repo
imports the test runner, and the three fixtures are not one shape — two hold a single key's value
and the third is keyed by rack.

**Step 13 squeezes where the lane leaves the session, not inside the one reading, and left the
clipboard alone.** The step said the window is "honoured by the one reading of a lane" and refused
a second reading. `automationValueAt` is that reading, but it is not the only road out: a
scheduled lane is laid on an AudioParam by `scheduleAutomation` (src/audio/ramp.ts), which reads
the points directly, so a squeeze applied inside the reading would move the picture and leave the
sound where it was. What landed keeps the refusal by being one function — `squeezeLane` — called
at the three places a lane reaches the host and once where the preview draws it, rather than a
second interpolator; the reading itself is untouched. Three things were left out. A motion copied
off a knob carries the lane, its range and what drew it (src/ui/motionClipboard.ts) and still
does: a window is a fact about the knob it was put on, and 0067's paste already rescales onto the
target's range, so carrying a window would be carrying a squeeze twice. The field is `laneBounds`
rather than `bounds`, which on a rack entry already means the window a run draws inside (0208) —
two windows on one entry that mean different things need two names. And the cost is paid in one
place: src/app/execute.ts crossed the 800-line hard cap, so the three lane commands and the
`targetOf` rule they share with `param.set` moved to src/app/automationEdit.ts, which is the
second subject to leave that file (0007, 0045) and not a slice of it.

**Step 13's review found the squeeze missing from every road to the graph that never sees a
command, and declined four duplications.** Contract and Seam both landed on the same hole, from
different ends: the reducer squeezed, and `prepareRestore` (src/app/engine.ts) and
`armInstanceLanes` (src/app/rackRebuild.ts) armed the stored gesture — so an undo, a redo, a
grouped-edit rollback, a `session.import` or a second Stop left the picture drawing a squeeze the
sound had come out of, until the lane or the window was touched again. `drawn` had never forced
anyone to think about those two, because nothing `drawn` holds reaches the graph (0314); a window
does. The fix is `playedLane` in src/lib/automation.ts, read by all six roads, and the pin is
src/app/rackRebuild.test.ts — the deck half lives inside `prepareRestore`, which needs a real
AudioContext and is the browser lane's, exactly as src/app/restoreMaster.test.ts already says of
it. Contract also found a window on a stepped parameter snapping off that parameter's own grid,
because the squeeze counts its steps from the floor: `automation.bounds` now snaps both ends the
way `param.set` snaps a value, pinned on `shift.interval`, whose step exists to keep it in whole
semitones. One Contract finding is declined and carried as a cost in 0393: a squeeze re-phases a
playing lane, because `deckLanes` keeps an anchor only where the points are the same gesture _by
value_ and a squeeze moves every value — teaching it otherwise changes what "the same gesture"
means for every writer of a lane. The Reuse lens found six duplications and was right about the
count on each: two were collapsed — the three projections of a record kept beside the lanes are
now one `besideLanes` in src/state/session.ts, and the "dragged wide open is no window" rule is
`wholeRange` in src/lib/range.ts, read by both window controls instead of four spellings — and it
also caught a tooltip constant with no reader, now wired. Four were declined. `laneBoundsCommands`
is honestly the third restoration expansion, and it stays: the three build three different command
types and the deck-side stages a fourth shape, so the collapse trades a typed command literal at
each site for a builder callback, inside the one list whose order five steps of this block have
depended on. `validateLaneBounds` beside `validateBounds`, `LaneBoundsRow` beside
`PoolEntries.tsx`'s `BoundRow`, and the preview's own `bounds === null` conditional are each the
_second_ occurrence, and principle 3 says the second is not a finding. `BOUNDS_STEP` is the second
declaration of a slider step and stays local rather than importing a constant out of the pool
menu's own component file.

**Step 14 shipped its states seeded, and declined a shared bin helper.** The first cut snapped a
draw to the middle of its share — a quantizer, the same two values on every seed — which the
review's Contract lens read against the step's own "drawn from the seed the way the population is";
the phase per parameter is what answers it, and the cost is that turning States up is a different
run rather than the same run quantized. Two claims the first cut made were narrowed on evidence:
"exactly that many distinct values per parameter" is exactly that many only where the window has
width and the stray is above nothing (a presence takes one value at any count), and the `fringe`
drift claim came out entirely — the Seam lens traced it to `boldestRow`, where the knob's own
shipped default would have stood at the far end of a dimension the whole picture shares. The Reuse
lens's one finding — that indexing a unit draw into N bins is now the fourth site of that
arithmetic, and wants `binOf` in src/lib/range.ts — is declined for this step: a helper with one
caller removes nothing, and the three existing sites (src/lib/moireGlyph.ts, src/lib/playerSong.ts,
src/lib/playerCharacter.ts) are three modules this step has no business editing (principle 4). It
is a real third occurrence and belongs to a step of its own.

**Step 15 left the picture, the planted grounds and the offline render out of the crawl.** The
ground moves the window a switched-off yard reads, which the playhead reports and the waveform
draws, but the strip above the dials still draws the hand's loop with no window over it, and the
drift does not travel to the moved ground the way `loopStand` travels to a dragged loop (0274,
src/ui/moireRows.ts) — the picture is handed a spec and the crawl's offset is a per-frame fact of
the transport, so drawing it wants a peek field and a reader for it, and no surface asked for one
this step. The review's Seam lens read the phase that reference row is painted at as a second cost
and it is not: `refillRows` wraps `into` and says in its own prose that a deck sitting outside its
loop still lands on the row. The grounds a hand
kept (0194) come round on counts of parts and songs a yard with no pattern does not have, so the
crawl reads only the three words, the period, the bed and the zone; a kept ground under a switched
off yard is a step of its own. And the crawl is the live transport's: an offline render arms a
prepared voice with the crawl set, but nothing ticks its loop there, so an export of a switched-off
crawling yard renders the loop standing still — the one place in this build where the live and
offline paths part, and the price of clocking it on the loop rather than on the wall. A forward move
the playhead cannot survive restarts the pass, which is a stop-and-start pair on the log per period,
exactly as a hand dragging the loop there produces one, and every rest the rack had laid ahead goes
with it. And src/audio/deck.ts now stands at exactly its 800-line hard cap: the step's seam there is
five lines and the prose behind them is in src/audio/deckCrawl.ts, so the next step that touches
that file splits it rather than shaving anything.

**Step 16 refused a second entry and left the render proof where it stood.** The step offered a new
file or a knob, and the knob won on the step's own refusal: two entries that rest a transport
differently cannot both be right about what a yard already resting owes, and the lull's dials reach
a hundredth of a second, so the "shorter grain" half of the ask needed nothing built. What the knob
costs is the draw order: a lull now spends a draw on every length as well as every roll, so a lull
stored before this step lays a different run under the same seed — a shape this build discards
rather than repairs (0026). The named proof, a render silent exactly on its scheduled holds, is
scripts/smoke.d/renderLull.js already, and it passes untouched because `lull.loose` defaults to
nought; a browser take of a _loose_ run would be a new scenario to measure (0012) for a fact the
cursor's own cases pin, so it was not added. And the knob draws the length down and never up: a
Loose of one is every rest somewhere under its dial rather than scattered around it, which keeps
the dial the ceiling a hand sets and leaves "loose either way" to whoever asks for it.

**Step 17 waits on the human's list, and this run had no human.** The step's own text opens by
asking which gestures and which keys, and refuses a shortcut nobody asked for; an autonomous run
cannot answer that question, and a list invented in its place would be exactly the refused thing. So
no key was landed, no decision number was spent, and the entry stays in docs/TODO.md. The registry
(src/ui/shortcuts.ts) and its palette rows are the landing site when the human names the list; the
step's tests are then the ones its text already states — each named key sends its command and none
fires in an editable control — and it can be scheduled as a step of its own block.

**Step 18's interview was not held, and the remaining costs are written down instead of chosen.**
The entry asks for an interview about a low-resource mode, and an autonomous run has nobody to
interview; inventing the human's answer is the same refused thing Step 17 stopped at. So the switch
landed and the question was measured. What `./scripts/measure --yards 7 --runs 1` reads, against
the same harness at the budget's own two yards, is that the drift is where the frame budget goes —
one run of each rather than the harness's own three, because this is a reading to choose from and
not a verdict on a regression:
104.2 frames a second and a 24.9 ms rAF p95 at two yards, 48.2 and 69.6 ms at seven, 0 rAF gaps
over 50 ms against 82, and one painting per yard per frame either way — five more strips, and the
mean cost of a painting rose from 1.41 ms to 2.68 ms because every one of them is a
picture-sized `drawImage` pair. What a folded yard skips is read off src/ui/Deck.tsx: its dials and
their animation, its peaks, its mulcher card and its whole rack all unmount. What it still pays is
the picture — `StripFollowing` moves into the header and paints at the same cadence, only narrower
— so the answer to "does collapsing a deck free up resources" is yes for everything except the
expensive thing. The candidates, none of them landed and the choice the human's:
(a) **a fold takes the picture with it**, which is one line at the folded call site and would make
the sequencer view a low-resource mode on its own;
(b) **one picture at a time** — only the yard a hand is on paints, the rest hold their last frame —
which needs a per-yard "is this the one" the strip does not have today;
(c) **a cadence under load**, `DRIFT_PAINT_MS` scaled by how many strips are standing, which
`looksPaintMs` already does for a long chain and would generalise;
(d) **the tile shop shared across yards**, since at seven yards eight canvases bake the same
picture-sized tiles independently;
(e) **the strip off and the pop-out kept**, so a yard says nothing until it is asked to.
Whichever is chosen, note what the switch itself does not do: the worker and the tile caches in
src/ui/driftTiles.ts are the module's, so a page that has already drawn keeps them until a reload —
switching off frees the frames, and only a page booted off frees the memory too.
None of these is a step yet: each is a different trade between what a glance tells a performer and
what the frame costs, and that trade is the human's to make.
