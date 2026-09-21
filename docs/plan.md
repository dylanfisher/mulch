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
that carry a choice. Decision numbers from 0383. The ideas group stays in docs/TODO.md until a
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

**Step 3 — lull rests a yard the mulcher is playing.** _Durable shape moved:_ none. "lull effect
doesn't appear to work when mulcher is activated". Lull asks the transport to rest on edges from
its own seed (0371, src/audio/effects/lull.ts) and the mulcher drives the transport by its own
plan (src/audio/player.ts); one of them ignores the other's hold. **Tests that must fail first:**
a render of a mulched yard under a lull is silent across the lull's rests, matching the same
render unmulched. **Refused:** a lull that only works on one transport.

**Step 4 — the popped-out picture opens on the grid.** _Durable shape moved:_ none. "when popping
open visualizer there's a underlying solid color, like orange, before the grid fills in." The
popup (src/ui/popupWindow.ts) wears the opener's sheets and renders one tree into its body; the
flash is the window's own body colour, or a canvas shown before its first bake. **Tests that must
fail first:** a headed run that opens the popup and reads its first painted frame; no new browser
scenario in the gate (0012). **Refused:** a fade that hides the flash rather than removing it.

**Step 5 — two small gestures: the knob's reset and the seed's dice.** _Durable shape moved:_
none. "double clicking a automated knob should always reset it" — src/ui/Knob.tsx already commits
`defaultValue` on double-click and the lane-bearing dial is the one path that refuses it; and
"randomize button next to yard seed input" — the reseed already stands on the card's front
(src/ui/PlayerBlend.tsx); it gets a twin beside the field in src/ui/PlayerSeed.tsx, or moves
there, one command either way. **Tests that must fail first:** a double-click on a dial holding a
lane commits the default; the button beside the seed sends the same reseed the front does.
**Refused:** a third seed source.

**Step 6 — the yard's header: mute, and a name it can be sorted by.** _Durable shape moved:_
`SessionDeck.muted`, a boolean, and `SessionDeck.tag`, a short string, both empty by default;
stored sessions without them are discarded (0026). "decks should have a mute option" — a gain
already sits at the chain's output (src/audio/chain.ts), so mute is a second scale on it, never on
`deck.gain`, and never a stop; "ability to name or tag decks, e.g. low end, high end, etc." — a
deck already carries an emoji and a name (0057), so a tag is one more word drawn in the header and
on the effect-move menu. **Tests that must fail first:** `deck.mute` and `deck.tag` land, undo,
survive a snapshot round-trip and ride a duplicate; a muted yard renders silent while its peek
still moves. **Refused:** mute as a stop; a tag vocabulary.

**Step 7 — the delay's beat is a setting the dial keeps.** _Durable shape moved:_ none, unless the
hold turns out to want to be durable — decide in the step and say so. "setting delay to beat mode
should change time to only toggle between set beat points" and "duplicate delay effect should also
copy the beat toggle". The hold lives in rack runtime (`beat.holds`, src/ui/ParameterBeat.tsx),
which is why a duplicate drops it; with it held, the dial's drag steps between the divisions
`beatBurst` already rounds onto (src/lib/playerBurst.ts) rather than sliding and rounding after.
**Tests that must fail first:** a duplicate of a held delay is held; a drag under the hold
commits only divisions of the beat. **Refused:** a second rounding.

**Step 8 — a burst may be sixteen seconds and cross the seam.** _Durable shape moved:_ none.
"increase mulcher burst timing to be up to 8 or 16 seconds. if a burst needs to wrap around a
loop to satisfy the length requirement it should do that, rather than get cut off at the end."
`PLAYER_BURST_MAX` (src/lib/player.ts) is two; the cap rises to sixteen, and a burst that outlives
the loop from where it starts continues from the loop's head through the seam
(src/audio/playerSeam.ts) instead of ending at the tail. Two halves, one step: the cap first,
then the wrap, so the second's test can ask for a burst longer than the loop. **Tests that must
fail first:** a sixteen-second burst is accepted and rounded by the beat hold; a render of a burst
longer than the remaining loop carries sound across the seam with no gap. **Refused:** a burst
longer than the loop that plays the loop twice as two bursts.

**Step 9 — the loop is set by a count of beats.** _Durable shape moved:_ none. "Add ability to set
loop based on beat count". Analysis gives a `bpm` (src/lib/analysis.ts) and the loop edge already
snaps to its candidates (src/ui/LoopHandles.tsx); a beat-count field beside the loop derives the
end from the start and the count, and sends the same `deck.loop`. Nothing durable rests on the
count: the loop is stored in seconds as now (§2, analysis is not a pure function of bytes).
**Tests that must fail first:** a count of four at a known `bpm` sends a loop of four beats; a
source with `bpm: 0` shows no field. **Refused:** a stored beat count.

**Step 10 — a second stop clears the tails.** _Durable shape moved:_ none. "if possible, make it
so pressing stop when already stops clears all noise (feedback, etc.)". The global Stop
(src/ui/GlobalTransport.tsx, `deck.stop` per yard) leaves every delay and reverb ringing on the
master's clock, which never stops (src/audio/masterEffects.ts). A Stop pressed with nothing
playing asks every rack, master included, to silence its tails — the same emptying and rebuilding
a restore already does to the master rack, or a ramp to nought and back. **Tests that must fail
first:** a render of a stop, a second stop and a window after it reads silence where the first
stop alone reads a tail. **Refused:** a third transport button.

**Step 11 — the header counts the mulch.** _Durable shape moved:_ none. "in header, add a effects
count, and yard count, and any other funny interesting statistics about how the sound is
manipulated. push the mulch idea - e.g. the sound is really getting put through a lot of
distortion." The counts are one read of the store beside the meter (src/ui/App.tsx); the words
are copy in src/lib/copy.ts, drafted plainly and left for the human to tune. Later statistics are
added to this one readout, not beside it. **Tests that must fail first:** the header's markup
carries the yard and effect counts and follows an add and a remove. **Refused:** a count that
needs a peek per frame.

**Step 12 — a fold is remembered, and the master's starts open when it is full.** _Durable shape
moved:_ none — a fold is a view preference (§2). "master effects should not collapse by default if
any effects are present (or better yet, remember collapse state of each deck/module in local
browser session)". src/ui/MasterRack.tsx hard-codes its fold shut and src/ui/Deck.tsx its own
open; both read the remembered fold first, keyed by rack, and the master's default is open when
its rack holds anything. **Tests that must fail first:** a master rack with one entry mounts open;
a fold set on one mount is read on the next. **Refused:** a fold in the session, a command, a
history entry.

**Step 13 — an automation has a floor and a ceiling.** _Durable shape moved:_ a lane's bounds on
the deck's and the instance's `automation` record, absent by default — discard, no migration
(0026). "effect automations need ability to set min/max values for automations". A lane's values
are read through its parameter's range (`AutomationRange`, src/lib/automation.ts); a lane may
now carry its own sub-range, drawn on the preview (src/ui/AutomationPreview.tsx) and honoured by
the one reading of a lane, so a recorded or drawn lane can be squeezed after the fact. **Tests
that must fail first:** a lane with bounds normalises inside them; the bounds ride a snapshot, an
undo and a duplicate; a render with bounds differs from one without exactly by the squeeze.
**Refused:** a second reading of a lane.

**Step 14 — the automator may throw between a few states.** _Durable shape moved:_ none if it is
a knob on the automator's declaration (src/audio/effects/automatorParams.ts); say so. "effect
automator needs a way to set a random 0/1 style value change, so you can do something like toggle
between two random states, and set duration of automator to get interesting effects. you could set
1/2/3/4 etc different states on a knob." A count of states, one to four, drawn from the seed the
way the population is (0203); at one it is today's automator. **Tests that must fail first:** the
growth maths with a state count yields exactly that many distinct values per parameter across a
long run, same seed same run. **Refused:** a stored draw.

**Step 15 — the ground moves under a yard the mulcher is not on.** _Durable shape moved:_ to be
decided in the step — whether the ground's motion spec leaves the `PlayerSpec`. "which ground
should be able to set how it moves without enabling the mulcher". The strip already moves the
loop itself with the mulcher off (src/lib/copyGround.ts's tooltip); this lets the wander, its
distance and its direction (0277) drive that loop on the pattern's clock without a pattern. Read
how much of src/lib/playerWalk.ts the ground needs before deciding. **Tests that must fail
first:** a yard with the mulcher off and a wandering ground reports a moved loop after one
period. **Refused:** a hidden mulcher.

**Step 16 — a play/pause effect.** _Durable shape moved:_ none; one registry entry. "play/pause
effect, kinda like scatter". Scatter's shape (src/audio/effects/scatter.ts) with a gate instead of
a cut: a seeded schedule of holds and releases asked of the transport the way lull asks (0371), so
it is lull with a shorter grain and a second knob, or lull grows the knob — decide by reading lull
first, and if lull grows, this is a step on lull and not a new file. **Tests that must fail
first:** a render under it is silent exactly on its scheduled holds. **Refused:** two entries
that rest a transport differently.

**Step 17 — the shortcuts the human names.** _Durable shape moved:_ none. "keyboard shortcuts".
The registry exists (src/ui/shortcuts.ts) and the entry names none, so the step opens by asking
the human for the list — which gestures, which keys — and lands them on the registry with their
palette rows. **Tests that must fail first:** each named key sends its command and none fires in
an editable control. **Refused:** a shortcut nobody asked for.

**Step 18 — the picture can be switched off, and the rest is an interview.** _Durable shape
moved:_ none; the switch is a view preference. "add a way to completely disable visualizer for
slow computers, free up space. interview me about other ways to add a low resource mode when e.g.
many items are automated over 7+ decks. ask if collapsing a deck frees up resources (e.g. we don't
have to draw the knob moving.)" The switch lands; then the step reports what a folded yard already
skips (its knobs' animation, its strip) and what it still pays, with numbers from
`./scripts/measure` on a seven-yard rack, and asks the human which of the remaining costs to
switch — those become steps of their own. **Tests that must fail first:** with the picture off no
bake runs and no canvas mounts. **Refused:** a mode that guesses the machine is slow.

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
