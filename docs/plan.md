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

## Context

Six things a hand found while performing, gathered on 2026-09-08. They touch six surfaces and
share no code, and they are one step because each is a handful of lines against a shape that is
already right — except the two automation ones, which are one shape change that both of them
wait on, and which is what makes this step expensive.

What the reading found, and what the step stands on:

- **A knob's redraw and the character it drew in are not durable, and that is why a copy loses
  them.** `const [every, setEvery] = useState<MotionRedraw>(0)` at src/ui/ParameterKnob.tsx:244
  and `const drawn = useRef<MotionCharacter | null>(null)` at line 123 —
  [0311](decisions/0311-a-drawn-lane-is-drawn-again.md) says so in as many words: "the knob's,
  like the latch: no command, nothing durable". `duplicateEffect` (src/app/effects.ts:88-134)
  copies exactly what is durable — params, bypass, bounds, then the lanes — so what a knob holds
  in React cannot ride along, and there is nowhere for it to be read from. The same absence is
  why the character row (src/ui/MotionMenu.tsx:36-62) is five plain Buttons: nothing outside the
  knob can say which one is standing, and the ref that knows is not a render input.
- **A lane is durable per (instance, param) already, and it has a sibling to sit beside.**
  `automation: Partial<Record<EffectAutomationParamId, AutomationLane>>` on an effect entry
  (src/state/session.ts:68) and the same on the deck for player params (line 93), validated by
  `validateLanes` (lines 356, 372) and expanded in restoration order at the end of the duplicate
  group. `AutomationLane` is points and only points, which is what the audio host schedules.
- **Where an export begins is one number, and the dialog collects it.** `ExportSpec.backSecs`
  (src/app/exportAudio.ts:69-84): nought is from the ear, positive is that many seconds ago, and
  longer than the run has been going is its beginning. `exportTake(at, spec, settleSecs)`
  (line 195) reads `instrument.stats().at` for `at`, and the settle only shortens a take begun at
  the ear or past it (line 203-211).
- **A stop forgets a playhead and nothing else.** src/audio/deck.ts:86-87 — "a stop forgets it, a
  pause writes it" — is about one deck's position in its buffer. The session's own elapsed run,
  `probe().at`, is the audio clock and has never gone back to nought, so a performance stopped and
  begun again exports as one long take with silence in the middle of it.
- **Failure is said in the header, and success is already said in a toast.** `fileError` state at
  src/ui/App.tsx:162, drawn as a `<span role="alert">` at line 225 that clears only when something
  sets it null; `ReportError` (src/ui/shell.ts:61) is the prop chain that fills it, through
  src/ui/FileMenu.tsx, src/ui/CommandPalette.tsx and src/ui/ExportAudioDialog.tsx — which already
  imports `toast` from src/ui/components/toast.tsx for the render's own progress. Two ways to say
  one kind of thing, and the older one never goes away.
- **Every fold of a card is shut to begin with except this one.** src/ui/Deck.tsx:230-244:
  `fineFold`, `groundFold` and `arrangeFold` are `useHeld(true)` on
  [0217](decisions/0217-the-ground-is-not-a-fine-tune-either.md)'s argument — what stands open is the front —
  and `songFold` alone is `useHeld(false)`.
- **The name pools are twelve by twelve and twenty-four by twenty-four, and one of the two files
  is full.** `EFFECT_NAMES` over twelve effect kinds (src/lib/copyNames.ts:32-161) and
  `TIER_NAMES` over song and part (line 163); `YARD_ADJECTIVES` and `YARD_PLANTS`
  (src/lib/copy.ts:174-180) with `mintYardName` at line 204. src/lib/copy.ts is at 776 lines
  against a hard cap of 800, which it reached once before ([0045](decisions/0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md));
  the yard's banks do not fit in it and must not be shaved into it.

**Decided before planning** (2026-09-08): one step, six items, in the order below — the shape
change first, because two of the items are unreadable without it, and the vocabulary last, because
it is the only one that is only words. The redraw and the character become durable per (instance,
param), amending 0311. The export's checkbox sits above the seconds field rather than replacing
it. The global Stop returns the session's elapsed run to nought; a yard's own Stop does not. Every
report becomes a toast and the header span goes. Yard names are drawn from five banks, two of them
optional. Pools double. bench-01 landed on 2026-09-08 as
[0314](decisions/0314-a-drawn-lane-says-what-drew-it.md),
[0315](decisions/0315-a-performance-begins-where-a-hand-says-and-ends-where-it-stops.md),
[0316](decisions/0316-a-failure-is-a-toast.md) and
[0317](decisions/0317-a-yard-is-named-for-a-small-scene.md); the shot of six yards read as six
scenes on one line each, and two files reached the hard cap on the way (src/app/facade.ts split to
src/app/stats.ts, src/state/session.test.ts to src/state/sessionStored.test.ts). The next free
decision number today is 0318.

1.  **A drawn lane says what drew it, an export says where it begins, and a report says itself
    once.** _(bench-01, landed 0314, 0315, 0316, 0317)_ **Durable shape moved: a lane gains a
    sibling.** Six items, one gate.

    **The drawn fact becomes durable** (0314, amending 0311). Beside `automation` on both the
    effect entry and the deck (src/state/session.ts:68,93) sits `drawn: Partial<Record<param,
MotionDrawn>>`, where `MotionDrawn = { character: MotionCharacter; redraw: MotionRedraw }` is
    declared in src/lib/motion.ts beside `MOTION_REDRAW_PASSES`. One value per (instance, param),
    which is the rule a param value already obeys ([0030](decisions/0030-effects-are-instances.md)).
    One new command, `{ t: "automation.drawn"; deck; instance?; param; drawn: MotionDrawn | null }`,
    because the count is set without redrawing and the character is set only by a draw: they are
    two writers of one fact and the command carries the whole of it. `automation.set` with empty
    points clears the sibling in the same reducer, and a recording committing over a drawn lane
    sends `drawn: null` — 0311's rule that a hand's lane is never redrawn, now written where the
    fact lives rather than in a ref. Validated by name in `validateLanes`' neighbour and in
    `exactKeys` (session.ts:344,366). src/ui/ParameterKnob.tsx loses `every` and `drawn.current`
    and reads the store instead; the redraw's frame read (line 357-383) reads the same. It is
    durable, so it is in history, in the archive, and in a restore — and a knob that was redrawing
    when the tab closed is redrawing when it opens.

    **Duplicating an effect carries it.** `duplicateEffect` (src/app/effects.ts:88-134) gains one
    more mapped expansion after the lanes, in restoration order for
    [0027](decisions/0027-clips-are-borrowed-deck-presets.md)'s reason: an `automation.drawn` per
    param the original holds one for. Nothing else about the function moves — this is the fact it
    was already trying to copy.

    **The character row shows which character is standing.** src/ui/MotionMenu.tsx's five Buttons
    become a `ToggleGroup` of `ToggleGroupItem`s, the way the redraw row beneath them already is
    (line 28), pressed on the stored character and pressing again to redraw in the same one. One
    control, one shape, on the one surface.

    **A double-click on a knob puts the drawing away.** `handleDoubleClick`
    (src/ui/Knob.tsx:483-485) commits the default value, and the move that follows already clears
    the lane (src/ui/ParameterKnob.tsx:200-210). What it does not do is turn the redraw off, so a
    knob reset while redrawing is a knob that draws itself a new lane on the next pass. The reset
    sends `automation.drawn: null` in the same history group as the clear and the set — one
    gesture, one entry ([0067](decisions/0067-a-gesture-is-one-history-entry.md)).

    **An export begins at the start or where the ear is** (0315). `ExportSpec` gains
    `fromStart: boolean`; the dialog draws a `Checkbox` above the length fields, and while it is
    checked the seconds field is disabled and `backSecs` is not read. `exportTake` takes the whole
    run when it is set — `backSecs` at `at`, which is the beginning the field's own doc already
    describes — so there is one arithmetic and the checkbox is a way of saying a number, not a
    second path through the take. Unchecked is exactly today.

    **Stop returns the run to nought** (0315). `transportAllCommands` (src/ui/actions.ts) for the
    stop gesture gains a session-level `{ t: "session.rewind" }` after the per-deck stops, which
    returns the elapsed run `probe().at` reads to nought. The global press only: one yard stopping
    is not the session ending, and the per-deck row is unchanged (P66 — the global press is the
    per-deck ones a hand would have sent, plus the one thing that is the session's).

    **Every report is a toast** (0316). `ReportError` (src/ui/shell.ts:61), the `fileError` state
    and its header span (src/ui/App.tsx:162,225) and the `onError` prop through FileMenu,
    CommandPalette and ExportAudioDialog all go; each site calls the `toast` manager
    src/ui/ExportAudioDialog.tsx already imports, at the failure's own type, timing out the way
    the render's progress does. One way to say something did not go, and it goes away by itself.

    **The songs section opens shut.** src/ui/Deck.tsx:240 `useHeld(false)` becomes `useHeld(true)`
    with the comment its three siblings carry: what stands open on a card is the front (0217).

    **The pools double, and a yard's name is a small scene** (0317). Every pool in
    src/lib/copyNames.ts goes from twelve to twenty-four — twelve kinds of effect and two tiers,
    both halves each — with the nouns still disjoint across every pool in the file, which is what
    `registry.test.ts` already checks and what makes a name say which kind of thing it names. A
    yard's name moves to **src/lib/copyYard.ts**, because src/lib/copy.ts is 24 lines from the
    hard cap and this is a split rather than a shave (0045): five banks —
    `YARD_ADJECTIVES` and `YARD_PLANTS` at forty-eight each, `YARD_PLACES` ("by the Old Wall",
    "beneath the Stairs", "beside the Stone Path"), and two **optional** banks, `YARD_AIRS` (time,
    weather, light: "at Dusk", "in Soft Rain", "in Moonlight") and `YARD_DETAILS` (small animals
    and quiet objects: "with Moths", "with a Bell"). `mintYardName` draws the first three always
    and each optional bank on its own coin, so names run from "Gentle Moss beneath the Stairs" to
    "Gentle Moss beneath the Old Stairs at Dusk with Moths" and a rack of yards reads as a set of
    tiny scenes rather than a list of usernames. `twoPartName` (src/lib/copy.ts:195) stays what it
    is — the effect and tier draw still join two halves — and the yard's join is its own.

**The outcome wanted:** a knob set to redraw that is still redrawing after a reload, whose
character button is visibly the one standing, that a duplicate of its effect redraws the same way,
and that a double-click puts back to plain; an export that begins at the top of a performance on
one press; a Stop that means the next performance starts at nought; a failed import that says so
and then stops saying so; a card whose front is what is open; and a session of yards named
"Pale Ivy near the Open Window in Soft Rain".

## The two things this step turns on

1.  **A fact the interface can copy is a fact the session holds.** The redraw and the character
    were knob-local because 0311 could not see past one knob; a duplicate, a reload and a visibly
    pressed button are three readers, and three readers of a ref is the shape that has to move.
    The command carries the whole of it, one value per (instance, param).
2.  **One kind of thing is said one way.** A failure is a toast, not a toast and a header span; an
    export's beginning is `backSecs`, not `backSecs` and a second path; a knob's redraw is durable
    state, not durable state and a ref.

## Tests that must fail first

- **src/app/automation.test.ts**: `automation.drawn` writes and clears the sibling; an
  `automation.set` with empty points clears it; a set with points leaves it; it survives a
  round-trip through the archive and a restore; an undo puts it back.
- **src/app/effectDuplicate.test.ts**: a copy of an instance holding a drawn, redrawing lane holds
  the same character and count, expanded after the lanes.
- **src/ui/ParameterKnob.test.tsx**: the knob reads the count off the store, not its own state; a
  double-click on a redrawing knob sends the clear, the default and `drawn: null` as one history
  entry; the character row's stored character is the pressed item (**src/ui/MotionMenu.test.tsx**).
- **src/app/exportAudio.test.ts**: `fromStart` takes the whole run whatever `backSecs` says, and
  agrees exactly with `backSecs` set to the run's length; unchecked is unchanged.
  **src/ui/ExportAudioDialog.test.tsx**: the checkbox disables the seconds field.
- **src/app/clock.test.ts** (or bus): the global stop returns `probe().at` to nought and a yard's
  own stop does not.
- **src/ui/App.test.tsx** / **src/ui/FileMenu.test.tsx**: a failed import raises a toast and leaves
  no header span; nothing imports `ReportError`.
- **src/ui/PlayerCardFolds.test.tsx**: the song section is shut on a fresh yard.
- **src/lib/copyNames.test.ts** / **src/lib/copyYard.test.ts** (new): twenty-four in every pool,
  nouns disjoint across all of them, `mintYardName` draws all five banks over enough runs and
  never fewer than three, every reading Titlecase and one line.

## Verification

- `./scripts/fix`, `git diff --stat` for collateral, then `./scripts/check` read whole.
- Browser proof in the existing smoke: draw a lane, set a count, duplicate the effect, and read
  both knobs redrawing through `probe()`; press the global stop and read the run at nought.
- A shot of a rack of six yards, to see that the long names do not break the card headings. That
  is the one thing in this step a test cannot answer.

## Refused

**Making the count a view preference.** It changes what is heard — a lane replaced every four
passes is a different performance from one that stands — and §2's line is about snap, theme and
whether a console is open. A thing you can hear is not a view preference.

**Putting the character and the count inside `AutomationLane`.** The lane is what the audio host
schedules, and every reader of it would grow a field it never reads. A sibling map keyed the same
way costs one validation and no reader.

**A per-yard stop resetting the run.** The elapsed run is the session's, and one yard is not the
session (P66). A hand that wants nought presses the one on the bar.

**Keeping the header span for failures only.** Two surfaces for one kind of thing is what the item
is about; a failure that never goes away is a header that is wrong for the rest of the session.

**Writing yard names as whole phrases in one pool.** Charming, and finite: a hundred hand-written
scenes run out where five banks multiplied do not, and the banks are the shape every other name in
the instrument already has.

## Context: the six a hand asked for

Six things asked for on 2026-09-08, after the six above. They fall into four steps, because two
pairs are one shape each: the master rack and the move between racks are both "an effect's address
is a rack and not a yard", and the EQ's shape and the panner are both the registry's own list of
what an effect is. The other two stand alone — the ground's zone, which is one field and one fold,
and the motion clipboard, which is nothing durable at all and waits on bench-01's `drawn`.

What the reading found, and what these stand on:

- **There is exactly one place a ground is bounded, and one place an offset is folded onto it.**
  `bedBounds(loopIn, span, duration)` (src/lib/playerBed.ts:282) answers the lowest and highest
  offset in the loop's own sixteenths, and `bedWrap` (line 309) folds any raw offset onto that
  range. Everything that lands a ground on a buffer goes through the pair: `bedGround` (line 331)
  for every picture and gesture, and `gridOf` (src/audio/playerGrid.ts:84) for the sounding
  transport. A crawl, a planted bed and the session ground a yard reads with Together on are three
  authors of an offset and one resolver of where it lands — which is what makes a bound cost one
  field and not three rules.
- **`bedBounds` claims offset zero is always reachable, and the shared ground rests on it.**
  Its own doc says so ("the loop is inside the buffer by construction"), and
  src/lib/sessionGround.ts:36 spends the claim: a shared ground has no bed to come home to, so
  staying put comes home to zero, "the one ground every yard has, whatever it loaded".
- **An effect's address is a deck id, in every tier.** `{ t: "effect.add"; deck: DeckId; … }` and
  its eight siblings (src/app/commands.ts:83-106,178), the reducers that read them
  (src/app/effects.ts), the engine's rack calls (src/app/engine.ts:155-172), the voice contract
  under them (src/audio/deckVoice.ts:77-84), and `SessionDeck.effects` itself
  (src/state/session.ts:91). A rack is built by `createEffectRack` (src/audio/effects/rack.ts) and
  the deck chain is where the one call sits (src/audio/chain.ts:7).
- **The output side is already a graph nothing owns.** src/audio/context.ts is the master bus every
  deck lands in — limiter then soft clip — with no deck id anywhere in the file, which is where a
  rack every yard runs through would sit.
- **The picture already has rows that are the field's rather than a yard's.**
  src/ui/moireRowsField.ts is "the rows that belong to the whole field rather than to anything on
  the yard", and src/ui/moireLooks.ts opens "the looks a standing rack gives the whole picture".
- **A discrete choice is a number with a step, and a presence is one parameter at one value.**
  `step?: number` on `ParamDeclaration` — "discrete choices remain numbers, quantized to this
  interval from `min`" (src/audio/effects/contract.ts:25). `eqEffect` declares
  `presence: { param: "eq.gain", silent: 0, full: 12 }` (src/audio/effects/eq.ts:59) and
  `filterEffect` declares `{ param: "filter.cutoff", silent: 20_000 }` — the pair an automator
  fades an entry in and out on, and the one thing that keeps an entry in the growable pool
  (src/audio/effects/registry.ts:37-49).
- **Two entries answer one question.** `filterEffect` is a lone low-pass cutoff
  (src/audio/effects/filter.ts) and `eqEffect` is one peaking band over the same
  `BiquadFilterNode`, whose `type` neither of them sets from a parameter.
- **A lane's points carry values in the parameter's own units.** `AutomationPoint = { at, value }`
  (src/lib/automation.ts:14), normalized against the target's declared range by
  `normalizeAutomationLane` (line 113) — so a lane is meaningful only beside the range it was drawn
  in, which is what a paste onto another parameter has to answer for.
- **Nothing in the interface holds runtime state above a component except the toast manager.**
  src/ui/components/toast.tsx is the one module-level manager surfaces subscribe to; folds are
  `useHeld` in src/ui/Deck.tsx:84 and the session store (src/state/store.ts) is written only by
  `send()`.

**Decided before planning** (2026-09-08): four steps, in the order below — the ground's zone first
because it is one field, one fold and no new tier; the motion clipboard second because bench-01
makes it possible and it is the smallest of the four; the rack address third because it is the
expensive one and every later effect step is cheaper once an effect's address is a rack; the
registry's own list last. A zone is **one span, two edges, the yard's own**, in that yard's own
sixteenths, and it narrows `bedBounds` — so the crawl, the planted beds and the session ground all
fold inside it with no second rule. The master rack is **a rack the session holds**, addressed by
`deck: null`. A panner splits by band, with time and slice as toggles that stack over it, and
declares a look of its own. The EQ gains a shape, that shape steers the band it draws, and the
filter entry goes — taking the `soften` look with it, because nothing else declares one. The
clipboard is runtime and dies with the tab. bench-02 landed on 2026-09-08 as
[0318](decisions/0318-a-ground-is-bounded-by-a-zone-the-hand-marked.md); the zone came out of
src/lib/playerBed.ts into src/lib/playerZone.ts and its picture out of src/ui/PlayerGround.tsx into
src/ui/PlayerGroundZone.tsx, both at the 400-line warning, and src/lib/player.test.ts gave its zone
case to src/lib/playerZone.test.ts at the hard cap. bench-03 landed on 2026-09-08 as
[0319](decisions/0319-a-motion-is-carried-between-knobs-and-dies-with-the-tab.md); the clipboard is
src/ui/motionClipboard.ts, `rescaleLane` sits beside `stretchLane` in src/lib/automation.ts, and
the two presses are a row of src/ui/MotionMenu.tsx. bench-04 landed on 2026-09-08 as
[0320](decisions/0320-an-effects-address-is-a-rack-not-a-yard.md) and
[0321](decisions/0321-the-session-holds-one-rack-under-all-the-yards.md); `RackId` is
`DeckId | null`, `session.master` is a rack and nothing else, `createEffectRack` is called once
inside `createMasterBus`, and `effect.move` carries an instance between two racks as one history
entry. bench-05 landed on 2026-09-08 as
[0322](decisions/0322-an-eq-band-has-a-shape-and-the-filter-goes.md) and
[0323](decisions/0323-a-panner-walks-a-sound-across-the-field-in-pieces.md); `EQ_SHAPES` is
src/lib/biquad.ts's, the shape is held by the EQ's own presence, src/audio/effects/filter.ts is gone
with the `soften` look and the `slope` wave, and src/audio/effects/panner.ts is three stages a
toggle builds and takes away again over one plain pan, looking through `staggerLook` in
src/lib/moirePanner.ts. Review caught four things and each has its own test: the panner's dispose
let go of the spread source before the stages that tap it, which throws on a real node and left the
rest of the graph wired; its declared silence was not transparent with a stage standing, so the three
toggles are held; its position walked a whole picture width, which a wrapping draw reads as no move
at all at both ends and which left a column of the picture blank; and the fake context's own
`disconnect` shrugged at a destination it was not connected to, which is what hid the first of them.
The next free decision number is 0324.

2.  **A ground is bounded by a zone the hand marked.** _(bench-02, landed 0318)_ **Durable shape moved: a
    yard's ground gains a zone.** One item, one gate.

    **The zone is one span in the loop's own sixteenths** (0318). `BedSpec`
    (src/lib/playerBed.ts:221) gains `zone: { from: number; to: number } | null` beside `beds` —
    the song's, like every other field of that spec (0184) — bounded by
    `PLAYER_BED_MIN * PLAYER_SLOTS`…`PLAYER_BED_MAX * PLAYER_SLOTS`, which is the unit `bedBounds`
    already answers in, with `from <= to`, both whole. **Null is no zone**, which is this module
    exactly as it stands, and is the whole of "unbounded" — no second flag beside it (principle 1,
    the shape `bedEvery: 0` already has). Validated beside `bedsOf` (line 189) and named in
    `PLAYER_FIELDS`' `exactKeys` (src/lib/player.ts).

    **It narrows the bounds, and nothing else changes.** `bedBounds` intersects the zone with the
    room the buffer answers for and never widens it: a zone reaching past the file is the file.
    Because the one fold (`bedWrap`) reads what that returns, a drawn crawl, a planted bed and the
    session ground a yard reads with Together on all land inside the zone through the same
    arithmetic — one place changed, no rule stated twice, and no reader of a ground that has to
    ask whether a zone exists.

    **Zero is no longer promised** (0318, amending `bedBounds`' own claim). A zone marked at the
    far end of a file does not contain the loop's own ground, so `bedWrap` folds a home roll — a
    yard's own `bed`, or the shared ground's zero (src/lib/sessionGround.ts:36) — onto the zone the
    way it folds anything else. That is the honest reading of a hand that said "only here": coming
    home means the nearest home inside the zone, and the doc that promised otherwise is amended
    rather than worked around.

    **A hand marks it by dragging on the ground strip.** src/ui/PlayerGround.tsx grows two edges
    dragged the way the loop's own are (src/ui/LoopHandles.tsx) and one press that clears them,
    with its words in src/lib/copyGround.ts. Not a dial: two edges are a place and not an amount,
    so there is no `PLAYER_SONG_KNOBS` row (src/lib/playerKnobs.ts:339) and no `copyKnobs` caption.

    **The outcome:** landed as written. A Shift-drag on the strip sweeps the zone out of its own
    two ends, its two edges drag it narrower or wider, and a Shift press that never travelled
    clears it — the plain drag still moves the window and the Option press still keeps a ground.
    `bedBounds` is the one place the zone is read, so the sounding grid, the drawn crawl, the
    planted beds and the shared ground all fold inside it through the arithmetic they already came
    through — and the transport re-answers those bounds where the field is turned rather than at
    the next play, which review caught. The loop's own window on the strip is deliberately not
    folded, and the drift picture's anchor is the one reader left unzoned (§4).

    **Tests that must fail first.** src/lib/playerBed.test.ts: a zone narrows what `bedBounds`
    answers and never widens it; `bedGround` inside a zone folds every offset into it, including a
    planted bed outside it and a home roll of zero. src/audio/playerGrid.test.ts: a sounding pass
    reads the narrowed grid. src/lib/player.test.ts: a spec with `from > to`, a fractional edge or
    an out-of-range one is refused; `null` round-trips. src/ui/PlayerGround.test.tsx: a drag writes
    the two edges as one history entry (0067) and the press clears them.

    **Refused.** _Several zones._ A list is a second arrangement beside the planted beds, which are
    already the list of places a ground returns to; one span is the bound, and the beds are the
    itinerary. _The session's zones._ Asked for and answered the other way once the units were
    read: a zone is counted in a yard's own sixteenths, and a yard's loop is its own — so a shared
    zone would mean a different region of every file, which is not what "only here" says.

3.  **A drawn motion is copied off one knob and pasted onto another.** _(bench-03, landed 0319)_ **Durable shape
    moved: none — the clipboard dies with the tab.** One item, one gate. **Waits on bench-01**,
    whose `drawn` sibling (0314) is the half of a motion that is not the lane.

    **The clipboard is a module-level manager, the way a toast is** (0319). One in
    src/ui/motionClipboard.ts holding at most one `{ lane: AutomationLane; range:
AutomationRange; drawn: MotionDrawn | null }`, subscribed to with `useSyncExternalStore` — not
    in the session store, which src/app's `send()` alone writes, and not durable: a clipboard is a
    gesture half-finished, like a selection or a drag, and nothing half-finished is in history, in
    the archive or in a restore.

    **Copy takes the whole motion, paste rescales it.** Two presses in src/ui/MotionMenu.tsx, under
    the character row: Copy stores the lane, the range it was drawn in and the `drawn` beside it;
    Paste, shown only while the clipboard holds something, sends one `automation.set` and one
    `automation.drawn` as one history entry (0067). A lane pasted onto another parameter is
    rescaled from the source's declared range onto the target's by `rescaleLane` — a new pure
    function beside `stretchLane` (src/lib/automation.ts:44), because a lane means one thing only
    beside the range it was drawn in and clamping it into the new one would flatten every point
    past the edge (principle 5).

    **The outcome wanted:** a knob redrawing a jagged lane every four passes, copied, and pasted
    onto a knob in another yard — where it redraws jaggedly every four passes, in that knob's own
    range.

    **The outcome:** landed as written (0319). The clipboard is src/ui/motionClipboard.ts, read
    with `useSyncExternalStore` and holding at most one clip; `rescaleLane` sits beside
    `stretchLane` and hands its result to `normalizeAutomationLane`, so the target's step and
    bounds are stated once rather than twice. The two presses are a row of their own at the foot of
    the menu, under the count rather than between it and the characters, because the characters and
    the count are one pairing and a press that carries a whole motion is not part of it. A press is
    its own small component, the way a character's item is, which is what holds the row inside the
    50-line function warning. `turns` — the promise drain a group needs before it is read — moved
    out of src/ui/ParameterKnob.test.tsx into src/ui/parameterKnobDouble.ts, which is where both
    knob suites already share their mount.

    **Tests that must fail first.** src/lib/automation.test.ts: `rescaleLane` maps both ends of the
    source range onto both ends of the target's and holds a point's fraction exactly; an empty lane
    stays empty. src/ui/motionClipboard.test.ts: a copy replaces what was held, and a subscriber is
    told once. src/ui/MotionMenu.test.tsx: Paste is absent on an empty clipboard; a paste sends the
    set and the drawn as one history entry; a copy of a hand-recorded lane pastes with no `drawn`.

    **Refused.** _A durable clipboard._ It would ride the archive and the history ledger for a fact
    a hand holds for two seconds. _Copying only the character and the count._ A hand that pressed
    Copy on a lane it likes means the lane.

4.  **An effect's address is a rack, not a yard.** _(bench-04, landed 0320, 0321)_ **Durable shape moved: the session
    holds a rack of its own, and every effect command names a rack.** Two items, one gate. The
    expensive step of the four.

    **`deck: null` names the rack that is no yard's** (0320). Every `effect.*` command
    (src/app/commands.ts:83-106,178) takes `deck: DeckId | null`, and null is the master. A
    reserved id string cannot do it: a `DeckId` is opaque and caller-supplied and the session
    spends its own (`spentDeckIds`, 0029), so any literal is one a hand could be handed. Null is
    not an id at all, and the narrowing is one guard at each reducer's top rather than a check at
    every reader.

    **The session holds `master: { effects: SessionEffect[] }`** (0321), beside `decks`
    (src/state/session.ts:119-147). It is exactly a rack and nothing else — an instance already
    carries its own params, lanes, bounds and bypass (0030), and `SessionDeck`'s other fields are a
    yard's: a source, a loop, a pattern and the deck parameters. So there is no automation map
    here, because there is no parameter here that is not an instance's.

    **It is built where the master bus is.** `createEffectRack` is called once inside
    `createMasterBus` (src/audio/context.ts:144), between the sum of the decks and the limiter, so
    nothing downstream of a deck is written against an unbounded output and nothing in that file
    learns what a deck is. The engine's rack calls (src/app/engine.ts:155-172) take the same
    `DeckId | null` and dispatch to that rack instead of `voice(deck)`; `deckVoice.ts`'s contract is
    untouched, because a voice still holds exactly one rack. **The offline render gets it for
    free** — `createMasterBus` is the one call both hosts make, through `createAudioEngine`
    (src/app/engine.ts:361, reached from src/app/render.ts:27) — and a take that skipped the master
    rack would be the second signal path the chain boundary forbids.

    **Its rows are the field's.** A master instance is running over everything, so its row is built
    in src/ui/moireRowsField.ts beside the loop's own and the session's, not in src/ui/moireRows.ts
    where a yard's rack is read — and its look already applies to the whole picture, which is what
    src/ui/moireLooks.ts has always said a standing rack's look does.

    **The box sits under all the yards.** One `EffectRack` in src/ui/App.tsx addressed with null,
    below the rack of yards, folded shut like every other card fold but the front (0217).
    src/ui/EffectRack.tsx and src/ui/EffectPicker.tsx take a rack address rather than a deck id.

    **An instance moves between racks** (0320). One command,
    `{ t: "effect.move"; from: DeckId | null; to: DeckId | null; instance; index }`, which removes
    from one rack and inserts into the other at an index, carrying the instance whole — its id, its
    params, its lanes, its bounds and its bypass. It is a move and not a copy, so
    `duplicateEffect` (src/app/effects.ts:88-134) is untouched; a move to the rack it is already in
    is `effect.reorder` and is refused here, so there are not two commands that reorder
    (principle 1). **Two gestures, one command**: the drag that already reorders inside a rack
    (src/ui/listDrag.ts, src/ui/EffectRack.tsx) carries an entry across into another rack and drops
    it at an index, and a "Move to" item on the effect's own menu lists the other yards by their
    emoji and name (0057) and the master under them, landing at the end of that rack.

    **The outcome wanted:** a tape and a compressor under all the yards, heard on everything and
    riding lanes of their own; and a delay dragged out of one yard's rack into another's, still
    bypassed, still automated, still the same instance.

    **The outcome:** landed as written, in two decisions rather than the one the ordering sentence
    named: `RackId = DeckId | null` and `effect.move` are [0320](decisions/0320-an-effects-address-is-a-rack-not-a-yard.md),
    and the session's own rack is [0321](decisions/0321-the-session-holds-one-rack-under-all-the-yards.md).
    `param.set` and the automation trio widened with the rack operations, which the step's own text
    did not name: a master instance holds exactly the parameters and lanes its plugin declares, and
    a second set of commands for that pair is what principle 1 refuses — the cost is one guard, at
    the reducer's top, refusing `deck: null` with no instance beside it. The meter moved to the far
    side of the master rack, because a master effect can make the output too hot and that is the one
    thing the meter exists to say. `rackRestorationCommands` came out of the per-deck stage list and
    is now the one declaration of a rack's restoration order, replayed onto a yard's and the
    master's alike; a rollback rebuilds the master rack in place inside `prepareRestore`'s commit,
    because there is one bus and it cannot be prepared beside itself. The rack contract came out of
    src/app/engine.ts into src/app/audioEngine.ts at the hard cap, and the per-instance row builder
    out of src/ui/moireRows.ts into src/ui/moireRack.ts — the field module could not host it without
    closing the loop moireRowsField → moireGrown → moireRowsField. The browser proof is
    scripts/smoke.d/renderMaster.js: 21.8dB off an offline take, the same take twice to the digit,
    and a filter moved off a yard's rack rendering within 0.00dB of one built on the master; the
    parity lane now carries a master instance too, so the rack that is no yard's is inside the one
    graph both hosts render through. Review caught four things and each has its own test: a flatten
    was baking the master rack into a yard's samples and then playing them through it again, a move
    onto a rack already holding that id destroyed the source's copy, `automation.span` was the one
    rack reducer that threw at its caller instead of refusing on the log, and the master's arming
    tick neither stopped on a closed context nor restarted when a bypass put its only growing
    instance back.

    **Tests that must fail first.** src/state/session.test.ts: a session validates with a master
    rack, and one holding a master instance of an unregistered entry is discarded (0026).
    src/app/effects.test.ts: every effect command reaches the master with `deck: null`; a move
    carries params, lanes, bounds and bypass and lands at the index asked for; a move to the same
    rack throws; a move naming a yard the session does not hold throws (0029). src/app/render.test.ts
    and src/app/exportAudio.test.ts: a take through a master rack differs from one without it, and
    a fingerprint of the live path and the offline path agree. src/ui/EffectRack.test.tsx: a drag
    across racks sends one `effect.move`; the menu item sends the same command.
    src/ui/moireRowsField.test.ts: a master instance makes a field row and no yard's row.

    **Refused.** _A yard with no source._ It would make the master a deck everywhere and pay for it
    with a guard at every place a deck is assumed to hold a buffer, a loop and a pattern — and it
    would put the master in `deckList`, which is the list of yards a hand made (0029). _A master
    rack with no automation._ An effect that cannot be automated is a different effect from the one
    in a yard's rack, and there is one registry.

5.  **The registry gains a shape and a panner, and loses the filter.** _(bench-05, landed 0322, 0323)_ **Durable shape
    moved: an entry leaves the registry and one arrives.** Two items, one gate. A stored session
    holding a filter instance no longer validates and is discarded (0026) — which is free, and is
    why this is one step and not a migration.

    **The EQ's band has a shape** (0322). `eq.shape` is a fourth parameter on
    src/audio/effects/eq.ts — a discrete choice, which on this instrument is a number with a
    `step` of one (src/audio/effects/contract.ts:25) — over peaking, low-pass, high-pass and
    band-pass, written straight onto the `BiquadFilterNode.type` the entry already builds. `eq.gain`
    is read only by the peaking shape, which the node itself already does; the knob's own sentence
    says so (src/lib/copyParams.ts:29, beside the new one the shape takes) rather than a second rule
    hiding it. **`presence` is unchanged** — `eq.gain` at nought, `full` at twelve — and `eq.shape`
    declares no `automation`, so an automator-grown EQ grows in the one shape whose silence that
    pair describes, and the entry stays in the growable pool it is in today
    (src/audio/effects/registry.ts:37-49).

    **The shape steers the band it draws** (0322). The entry keeps its one look, `band`
    (src/audio/effects/eq.ts:75), and `eq.shape` joins its `lookFrom` terms: peaking is the band as
    it is drawn today, lifted or cut at the frequency by the gain that is also its presence (0286,
    src/lib/moireBand.ts), and a pass shape is the band drawn as everything past its edge taken
    out. Without this a low-pass EQ would draw a lift off a gain knob that is not being heard,
    which is a picture saying something the sound is not (0128).

    **The filter entry goes, and `soften` goes with it** (0322). src/audio/effects/filter.ts is
    deleted, out of the growable pool, out of `EFFECTS`, out of the registry's imports, and its name
    pool leaves src/lib/copyNames.ts — a low-pass EQ is exactly what it was, and two entries
    answering one question is the duplication principle 1 exists to refuse. Its look is its own and
    nothing else declares it, so the `soften` name, its radius term and its draw leave
    src/lib/moireLook.ts with it: a look no entry names is maths nothing can reach, and the registry
    is where that is refused (0148). The arrival its 0202 note describes is now the EQ's.

    **A panner moves a sound across the field in pieces** (0323). A new entry,
    src/audio/effects/panner.ts, whose face is Position, Spread and Rate over three toggles that
    stack: **Band** splits the signal at crossovers and sits each band at its own point in the
    field, so the lows arrive on one side while the highs are still on the other; **Time** gives
    the two sides their own short delay and gain, so a move is heard arriving rather than
    switching; **Slice** lands successive short slices at their own positions, so the sound crosses
    in grains. All three off is a plain pan, which is the entry's silence. It sits in the rack,
    before the deck's own `StereoPanner` (src/audio/chain.ts:142), and declares
    `channelCount: 2, channelCountMode: "explicit"` for the reason src/audio/effects/tape.ts does.
    Its presence is Spread at nought — no spread is no field, whatever the toggles say — which is
    what puts it in the growable pool. **Its look is a new one**, declared whole — terms and draw
    together — in a file of its own the way the last five were (0287-0296): the picture's rows
    displaced across the field in bands, by the spread, at the position. A look and a drift profile
    are what an entry is (0148), and a new entry means new maths rather than a name borrowed off
    another's. It takes a pool of twenty-four names in src/lib/copyNames.ts, disjoint from every
    other pool there, which `registry.test.ts` already checks.

    **The outcome wanted:** one EQ entry that sweeps, cuts and passes; and a panner that takes a
    loop apart and walks it across the field a band at a time rather than sliding the whole of it.

    **Tests that must fail first.** src/audio/effects/registry.test.ts: no filter entry, no
    `soften` in `LOOKS`, a panner entry with its own look, a profile, a presence and a full name
    pool, nouns still disjoint. src/audio/effects/eq.test.ts (new): each shape sets the node's
    `type`; `eq.shape` quantizes to whole numbers and refuses one out of range; `eq.shape` is not an
    automation target. src/lib/moireBand.test.ts (new): a pass shape draws the band past its edge
    and a peaking one draws it at the frequency, off the same gain.
    src/state/session.test.ts: a stored session holding a `filter` instance is discarded with
    `session.discarded`. src/audio/effects/panner.test.ts (new): each toggle builds the nodes it
    names and takes them away again; all three off passes the signal at the position asked for;
    Spread at nought is silence. src/lib/biquad.test.ts: the maths says what each new shape does
    to a spectrum, to the precision the browser smoke cannot reach.

    **Refused.** _Keeping the filter as the quick one-dial low-pass._ Two ways to say low-pass is
    the thing the shape parameter removes. _Keeping `soften` for a later entry to claim._ A look
    with no declarer is maths no rack can reach, held against a use nobody has asked for; git
    remembers it (principle 6). _One mode of three on the panner._ A hand asked for the
    three to stack, and a band split whose grains also move is the sound the effect is for. _An
    LFO on the panner._ `deck.pan` takes a lane already, and a rate that is not a lane is a second
    kind of motion on an instrument that has one (0128).

---

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

Everything abandoned, narrowed, or landed with a known cost, one paragraph each. Nothing here is
scheduled by being here.

**A grown panner is a plain pan, and a hand stacks the stages on it** (bench-05, 0323). The step
said all three toggles stack and refused offering only one of three. They do, for a hand — but the
presence contract is that silence passes the input through unchanged (0202), and a band split at no
spread is three crossovers summed rather than a wire: −17dB at 500Hz on this repo's own maths. So
the toggles are `held`, which takes them out of what a run draws (`growthEntryOf`). What is lost is
an automator that grows a slicing, band-split panner; what is kept is an entry whose fade in and out
is silent, which is what puts it in the pool at all. A run that could draw a stage needs a presence
that reads its own `held` parameters, which is a change to `effectHeard` and every entry with one.

**The `radius` term stayed, and the `slope` wave left with the filter instead** (bench-05, 0322).
The step said the `soften` name, its radius term and its draw all leave src/lib/moireLook.ts. The
name and the draw did; the term did not, because the bloom declares `radius` too (`LOOKS.bloom`,
src/lib/moireLook.ts) and a term two looks read is not the departing entry's to take. What did leave
by the step's own argument is the `slope` drift profile: the filter was the only entry claiming that
wave, and "maths nothing can reach" is the sentence the step wrote about the look. The panner's
`cross` took the slot it vacated, so the profile list is the same length it was.

**The stagger's position walks a quarter of the picture, not the whole of it** (bench-05, 0323). The
step said the rows are displaced "by the spread, at the position". Read as the whole width, the
position was unreadable: the pass wraps each band round the edge, so hard left, the middle and hard
right drew the same picture, and a slide past a width left a column of it blank. `STAGGER_PLACE`
bounds the walk at a quarter, which with the spread's own ceiling keeps every slide inside one width
— which is exactly the condition the wrap needs.

**A pass-shape band is weighed by the gain it does not hear** (bench-05, 0322). The band's alpha is
the entry's presence, which is `eq.gain`'s distance from flat — and a low-pass does not read the
gain, so an EQ switched to a pass shape with its gain at nought draws nothing. Weighing a pass band
at the look's ceiling instead was tried and refused: every pass in the chain draws the field once
and leaves it exactly as it was at no presence (0285, asserted over `LOOKS` in
src/ui/moireCanvasChain.test.ts), and a pass that ignored its presence would break that property for
every look at once. What the shape buys is the _draw_ — a cut past the edge rather than a lift at
the frequency, which is the picture 0128 was about. The honest fix is a presence that reads its
entry's `held` parameters, which is a change to `effectHeard` and every entry that declares one.

**The panner's toggles rewire at the move rather than at the gesture's end** (bench-05, 0323). They
declare no `rebuild`, so a stage is built or disposed as the value lands. A `rebuild` toggle would
also be held out of the growable pool (`growthEntryOf`, src/audio/effects/automator.ts), and a hand
asked for three stages that stack in a grown run. The cost is that a toggle dragged rather than
clicked can rewire twice, and a rewire is a disconnect and a connect on a live graph rather than a
crossfade; the move that lands on the value already standing rewires nothing, which bounds it at two.

**The band-pass reads Q as a quality factor** (bench-05, 0322). src/lib/biquad.ts states the RBJ
constant-peak band-pass, `alpha = sin(w0) / 2Q`, rather than the octave-bandwidth form written with
a sinh. The two disagree about which direction Q narrows in, and this file exists to say what the
node does — the browser smoke measures the real node and would catch a disagreement in dB, but no
case here does, so what is asserted is the arithmetic this file states.

**The discard case is in src/app/persistence.test.ts** (bench-05, 0322). The step named
src/state/session.test.ts, which holds `validateSession`'s refusals and cannot see a
`session.discarded` event at all — the event is emitted where a stored session meets a boot. The
refusal itself is already covered there by the unregistered-effect case.

**The filter was the instrument's generic test effect, and the EQ took the job** (bench-05, 0322).
Fifty-odd files named `filter` because it was the cheapest entry to add — one knob, one native node
— and every one of them now names `eq`, whose four values they have to spell. Three smoke scenarios
that depended on a low-pass now set `eq.shape` to reach it, and the picker and drag scenarios seed
the panner instead, so the browser still exercises two half-width cards abreast.

**A card is carried between racks by a menu and not yet by a drag** (bench-04, 0320). The step
asked for two gestures on one command, and the "Move to" item is the one that landed. `useListDrag`
measures one list's slots at the press and captures the pointer on that list; carrying a card into
another rack means a hit test against every other rack's list on each move and a second measurement
of the list under the pointer, and the same hook is worn by the yard list in src/ui/App.tsx, which
must not grow a cross-list drop. What is lost is reach, not capability: the command, the reducer,
the graph and the undo are all in, and the menu sends exactly the command a drag would.

**The picture reads a master instance's row and not its run** (bench-04, 0321). A master instance
gets a row of the field in every yard's picture, cut and reached the way a yard's rack instance is;
what it does not get is a row per effect a master automator has _grown_, nor its meter breathing the
row. Both are per-frame reads of one yard's `DeckPeek`, and a master automator's population would
have to travel into every open picture at once. The master's own card reads both through
`peek(null)`, which is the whole of the read this step gave it, so nothing is dark — the yard's
picture is simply silent about what a master automator is standing.

**A master lane's clock is a second copy of the deck's cycle walk** (bench-04, 0321).
`createMasterEffects` arms its lanes against `ctx.currentTime` with the same
`MAX_AUTOMATION_CYCLES` / `AUTOMATION_HORIZON_SECS` arithmetic `src/audio/deck.ts` uses. Lifting the
one out of the other was refused on principle 3: it is the second occurrence, and the deck's version
is entangled with a plan, a lane hold across silence and a player — none of which a rack with no
transport under it has. A third rack that arms lanes is where the abstraction is owed.

**A carried motion keeps the span it was drawn at** (bench-03, 0319). `rescaleLane` moves a lane's
values onto the range it lands in and leaves its times exactly where they were, so a motion pasted
onto a knob whose dial last chose another length arrives at the source's length rather than the
target's. That is the honest reading of "copy takes the whole motion": the span is part of the
gesture, and a lane silently sped up on arrival is a different gesture. A hand that wants another
length has the preview's own time axis, which is the one place a span is decided (0079). The same
holds for the dial's curve: `rescaleLane` reads a value's fraction of the range linearly, where
`drawMotionLane` walks a character along the curve — so a mid-range point off a linear gain lands
mid-_value_ on a log cutoff rather than mid-travel. That is what "a lane's values ignore the curve"
already says (src/lib/automation.ts), and reading a paste along the curve would make the same lane
mean two things depending on which knob it was drawn on; the cost is a pasted gesture that sits
higher on a log dial than the hand that drew it would expect.

**The drift picture's anchor reads the ground unzoned** (bench-02, 0318). `playerRowStand`
(src/lib/playerDrift.ts) folds the standing bed with no zone, so a yard with one marked anchors its
moire rows where the walk would have stood without it. The zone reaches every other reader — the
sounding grid, the ground strip, the waveform's rectangle and the plant on the card — because each
of those has the spec at hand; this one is read off a per-frame `DeckPeek` that carries no spec, and
threading it would have meant a further argument through `refillRows` (already sixteen, with 66
call sites in the suite) and every row helper under it. The cost is a picture whose ground row can
disagree with the sound while a zone is marked; the site says so in a comment naming this paragraph.
The honest fix is the peek reporting the folded bed rather than the raw offset, which is a change to
what a step reports and belongs to a step of its own.

**A zone on the session's ground** (bench-02, 0318). Asked for and answered the other way once the
units were read: a zone is counted in a yard's own sixteenths, and a yard's loop is its own, so a
shared zone would mean a different region of every file. A Together yard is still bounded — by its
own zone, which narrows the bounds the shared offset is folded onto — so "only here" holds per yard
even while the crawl is the session's.

**Several zones** (bench-02, 0318). A list is a second arrangement beside the planted beds, which
are already the list of places a ground returns to. One span is the bound and the beds are the
itinerary; two lists would be two answers to where the loop goes.

**A redraw count that outlives the lane it counts for** (bench-01, 0314). The knob's own `every`
was a `useState` that survived a clear, so a knob cleared and drawn again came back at the count it
had been set to. Durable `drawn` is one value per (instance, param) and an emptied lane clears it,
so the count goes with the lane it was about — and the redraw row is disabled on a knob holding no
drawn lane, because there is nothing there to redraw. What was lost is a small convenience; what
was bought is that the count cannot outlive the thing it describes, which is the whole reason it
left the knob.

**A `MotionDrawn` a hand can set a character on without drawing** (bench-01, 0314). The character
is set only by a draw, so the character row's press always sends a new lane — there is no way to
say "this lane is a smooth one" about a lane a hand rode. That is the rule 0311 wanted and it is
now unstateable rather than merely unwritten.

**A yard's name that says all five banks whatever its length** (bench-01, 0317). A name is
`deck.add`'s durable text and capped like any other, and five banks at their longest run well past
that. The two optional banks are dropped in turn where the reading would not fit, so a long place
costs a hand its time and its detail rather than its yard. Cutting the phrase was the alternative
and would have left names that stop halfway through a place.

**Folding a yard's own import refusal into the toast** (bench-01, 0316). Two review lenses read
0316's "one way to say something did not go" as covering `src/ui/Deck.tsx`'s own `importError`
span, which is the same never-dismissed shape the header's was. It is not in the step's text, and
taking it retargets two browser scenarios (`formats.js`, `drop.js`) onto a portalled toast that
then sits over the bottom-right corner every later scenario in that lane clicks in. Declined and
0316 narrowed to say why: the header's span was wrong because it was nowhere near the gesture, and
a yard's own refusal is beside the control the file went into.

**A yard's whole name in an export's filename** (bench-01, 0317). A field of a take's name is one
word (P114) and the folder's byte cap cuts from the end, so a sixty-character scene in the yard
field pushed the source field clean off — an export of "Wide Rowan behind the Compost Heap at First
Light with Swifts" stopped saying what it was made of. The offered name takes the yard's first two
words, which are its identity; the rest is the reading of it. Found by a flaky case, because the
first yard's name is a live draw.

**Two files split at the hard cap, paid for by this step** (bench-01). `src/app/facade.ts` reached
804 lines and `src/state/session.test.ts` 801. The counters `stats()` answers with moved to
`src/app/stats.ts` — a file of its own for the reason `src/app/runtime.ts` is one, the piece with
no coordination in it — and the hand-written stored session and its clip matrix moved to
`src/state/sessionStored.test.ts`. Neither split was in the step's text; both are what 0045
requires where no waiver reaches.
