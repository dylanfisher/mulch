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

A step is written in one shape: a bold title; its bench tag; **Durable shape moved** first; the
paragraphs of what it does, each opening bold; **Stands on**, the reading it was written against,
with a path per claim; **Outcome wanted**; **Tests that must fail first**; **Verification**;
**Refused**. A step that lands is marked in place with its decision numbers, not moved.

### Block: the picture is a scene

The drift becomes painterly: a yard's picture is an abstract closeup of a natural field — grass
leaning in wind, a field of flowers, blades standing in rippled water, a canopy — read off the
yard's own name. Gestural and digital, never literal: no sprites, no photographs, no petal drawn as
a petal. Every row, look, lattice and tunable the picture has today keeps its effect on whatever
scene is playing; a scene is what those are read _through_, not a replacement for them.

**Layout, before the first step.** One file per scene from the first: `src/ui/scene/<name>.ts`,
each with its `@role` line and its map.md row, under a contract in `src/lib/moireScene.ts` shaped
the way `src/lib/moireLook.ts` shapes a look — the names the picture has a scene for, the terms
each reads, and a registry that refuses at load a name no file holds. The reading of a name into a
scene is `src/lib/yardScene.ts`, beside `src/lib/copyYard.ts`. A scene's colours are tokens in
`src/ui/tokens.css` and nowhere else (0236). Adding a scene is one file, one name in the contract,
one entry per plant that names it, its tokens, and one group on the tuning panel.

1.  **A yard's picture is a scene its name names.** _(bench-06)_ **Durable shape moved: none.**
    The name is already durable — minted once by `mintYardName` and carried in `deck.add`
    (src/ui/actions.ts:44) — and a scene is a reading of it, the way a picture may rest on a
    reading precisely because nothing about it is stored (0145). Two tabs on one session draw the
    same scene; a restore draws it again.

    **The name's banks say what the scene is.** The plant names the subject: every entry of
    `YARD_PLANTS` (src/lib/copyYard.ts) gains the scene it stands in, and the first four scenes
    cover the bank — **meadow** (Heather, Bracken, Gorse, Thistle, Clover…: fine tall strokes
    leaning as one), **bloom** (Foxglove, Campion, Cowslip, Primrose, Mallow…: a lattice of soft
    warm blobs over a cool ground), **water** (Reed, Rush, Sedge…: a fine rippled grating with a few
    sparse tall blades standing in it), **canopy** (Willow, Birch, Alder, Cedar, Rowan, Hazel,
    Aspen…: dense dark mass with scattered light breaking through). The air names the light —
    Falling Dusk, Moonlight, Frost, Soft Rain, Low Sunlight each shift the scene's ramp toward its
    own tokens,
    and a name with no air reads as day. The adjective names the wind's rest — Windy, Wild, Still,
    Quiet, Hushed set how far the field leans and how fast it recovers. The place and the detail
    read nothing in this step. The reading is a table per bank, not a hash of the string: a hand
    can predict what "Windy Reed past the Water Butt in Falling Dusk" will look like before it is
    added.

    **A scene is what the screen lays down.** Today `inkThrough` (src/ui/moireScreen.ts) writes one
    tile of a filmed monitor — two grids beating into blobs, three channels a lag apart, one rolling
    band — and the painter cuts every grating out of that ink. That call stays the one seam: the
    painter asks the yard's scene for its ground tile and its ramp, and every scene writes its
    tile the way the screen writes its own — a pixel at a time on the rebuild, never on a frame
    (0129, 0141), so a frame still costs one `fillStyle`. The monitor tile goes; its motions —
    the lean, the band on the reference row's phase, the channel lag — become terms every scene
    reads, so a parameter that moved the screen moves the scene. `INK_RAMP_TOKENS` becomes each
    scene's own five stops, and the air is a second row of stops the ramp is mixed toward.

    **The rows are the marks.** A row is still one grating at its own pitch, angle, depth and
    profile; a scene changes what a grating reads as — a blade, a ripple, a bough — by the ground it
    is cut out of and the ramp its depth is read along, not by a second painter. The looks
    (src/ui/moireLooks.ts), the lattice, the tint, the wind and the jolt reach a scene untouched.

    **The numbers are tunable, and argued on the bench first.** Every constant a scene declares is
    a `tunable("scene.<name>.…")` with a group per scene in src/lib/copyDriftGroups.ts. Each scene
    is drawn on the drift bench (`#/sketch`, 0247, 0253) beside the other three before it lands in
    the painter, and judged at 1:1 crop and not from the whole canvas.

    **Stands on:**
    - The name is seven banks and a deterministic join (src/lib/copyYard.ts, 0317, 0324); there is
      no rename command, so a scene is fixed at the yard's birth.
    - `inkThrough` is the screen's only export the painter cuts through, and src/ui/moireCanvas.ts
      is its only caller (both files' `@role`).
    - The ramp is five token names resolved in one file (`INK_RAMP_TOKENS`,
      src/ui/moireScreen.ts:114) and read by `ramp` (src/lib/moireColour.ts).
    - A look is a contract the registry refuses at load (src/lib/moireLook.ts), which is the shape
      a scene contract copies.
    - A colour literal outside src/ui/tokens.css fails the gate (0236).
    - The painter has a recorder (src/ui/moireCanvasPainted.ts), so what a scene laid down is
      testable without a canvas.

    **Outcome wanted:** a rack of six yards reads as six different fields — a red bloom, dark
    water with three blades, a leaning meadow at dusk — each still visibly moving with its lanes,
    its rack and its jumps; and adding a fifth scene touches the files the layout above names and
    nothing else.

    **Tests that must fail first:**
    - **src/lib/yardScene.test.ts** (new): every plant names a scene, every air a light, every
      adjective a wind; the same name reads the same scene; a name with no air reads day.
    - **src/lib/moireScene.test.ts** (new): every name in the contract has a file and every file a
      name; an unknown name is refused at load; every token a scene names exists in tokens.css.
    - **src/ui/moireCanvas.test.ts**: through the recorder, two yards named for different plants
      lay down different tiles; every row still cuts a grating whatever the scene; a scene's tile
      is written on a rebuild and not on a frame.
    - **src/ui/MoireTuning.test.tsx**: the panel holds one group per scene.
    - **src/ui/sketch/SketchDrifts.test.tsx**: the bench draws all four scenes.

    **Verification:**
    - `./scripts/fix`, `git diff --stat` for collateral, then `./scripts/check` read whole. A new
      directory needs a build before a shot, not the dev server.
    - One shot per scene through `./scripts/drive --shot`, read at the 1:1 crop, and one of a rack
      of six yards. That is what a test cannot answer: whether it reads as a field.

    **Refused:**
    - **Storing the scene.** It is a reading of the name; stored, it is a second fact that can
      disagree with the first.
    - **Hashing the name.** A hash is a scene nobody can predict; the banks are already structure.
    - **A scene picker.** The name is the picker in this step. A later step may add a rename, and
      a rename is then how a scene is chosen.
    - **Literal imagery.** No sprites, no images, no petal drawn as a petal: the marks are gratings
      and blobs, or the parameters stop meaning anything.
    - **A second painter per scene.** Rows, looks and lattice stay one painter's; a scene is a
      ground and a ramp.

### Block: the instrument says more

Five steps that each widen one thing a hand already has: the yard's name, the EQ card, the delay
card, the motion menu and the spark row. None adds a tier, a command or a file outside the layout
the thing already lives in. The order is decided: the name first, because bench-06 reads the air
bank by its entries and should read the shape this step leaves; the two effect cards next, because
the second reuses the choice control the first introduces nothing of but the delay's tap reuses the
burst's arithmetic; the character and the sparks last, each alone in its module.

bench-07 landed on 2026-09-08 as
[0324](decisions/0324-a-place-and-an-air-are-a-word-drawn-against-a-noun.md); `YARD_PLACE_WORDS` ×
`YARD_PLACE_NOUNS` and `YARD_AIR_WORDS` × `YARD_AIR_NOUNS` are joined by `joinedName` at the one
mint site, over `twoPartName`; 24 places became 144 and 16 airs 32. The rule that a joining word
must read against every noun of its family is what sized the two word banks: six for the place (by,
beside, near, past, behind, beyond) and two for the air (in, through). Review read the product aloud
and caught the air's first bank saying "through Frost" and "toward Low Sun", so the air is a medium
now — its words are the two that cross the whole bank, and the two nouns that were moments are
spelled as mediums, "Falling Dusk" and "Low Sunlight". bench-06 still reads the air by its nouns,
and its own paragraph names those two by their new spelling. The next free decision number is 0325.

1.  **A yard's place and its air are joined by a word drawn on its own.** _(bench-07, landed 0324)_ **Durable
    shape moved: none.** A name is durable text bounded by `DURABLE_TEXT_MAX` (src/lib/guards.ts)
    and stays so; only what the draw is made of changes, and every name already minted stays the
    name it is.

    **Two banks become four.** `YARD_PLACES` and `YARD_AIRS` (src/lib/copyYard.ts) are each a
    joining word and a noun drawn together: "beneath the Stairs" becomes a draw of one word from
    `YARD_PLACE_WORDS` — by, beneath, beside, under, behind, along, at, near, past, over, beyond,
    within… — and one noun from `YARD_PLACE_NOUNS` — the Old Wall, the Stairs, the Stone Path…;
    "at Dusk" a draw of one from `YARD_AIR_WORDS` — at, in, under, before, after, toward, through,
    against — and one from `YARD_AIR_NOUNS` — Dusk, Soft Rain, Moonlight… Every joining word must
    read against every noun of its own family: a word that reads with half the nouns ("over the
    Stairs") is not in the bank, and the bank is chosen by reading the whole product aloud, not by
    listing prepositions. The nouns are the entries the scene reads (bench-06), so a scene keys on
    `YARD_AIR_NOUNS` and never on a joined phrase. The joining word opens lowercase and the noun
    Titlecase, as the phrases do now (0059).

    **The draw is the same draw.** `mintYardName` joins the same three-then-two sequence on the same
    coins; a place or an air is now two picks instead of one. The bound check stays where it is, and
    the longest joining word plus the longest noun of each family is what the three-that-always-speak
    proof is recomputed over.

    **Stands on:**
    - The five banks and the join are one file, and the join is called from the mint site only
      (src/lib/copyYard.ts, src/ui/actions.ts:44, 0317).
    - The tests already prove the banks' shape: no entry twice, Titlecase words, lowercase phrases,
      the bound, and all five banks over enough runs (src/lib/copyYard.test.ts).
    - bench-06 reads "Dusk, Moonlight, Frost, Soft Rain, Low Sun" as entries of the air bank, so the
      noun bank is the one it should key on.

    **Outcome wanted:** a rack of eight yards whose places and airs repeat a noun without repeating
    a phrase — "past the Stairs at Dusk", "beneath the Stairs toward Dusk" — and no pair of joining
    word and noun that a reader stumbles on.

    **Tests that must fail first:**
    - **src/lib/copyYard.test.ts**: the two joined families each have a words bank and a nouns
      bank, the words all lowercase and the nouns all Titlecase after their article; over enough
      runs one noun is seen under more than one joining word; the bound proof holds over the
      longest word plus the longest noun of each family.

    **Verification:** `./scripts/fix`, `git diff --stat`, `./scripts/check` read whole. Then mint
    forty names in a test log and read every one: this is the check a count cannot do.

    **Refused:**
    - **A word that only some nouns take.** Per-noun word lists are structure the name does not
      need; a word that does not read everywhere is left out.
    - **Joining the adjective or the plant.** Those two are one word each and already multiply.
    - **A rename command.** A minted name stays what it is (0317).

2.  **The EQ is the EQ/Filter, its shape is a choice a hand picks by name, and it ships as a
    low-pass.** _(bench-08)_ **Durable shape moved: the default of `eq.shape` moves from peaking
    to low-pass.** A stored value is still a whole number over `EQ_SHAPES`; a session built before
    this step holds the same numbers and is read as it is (0026). Nothing else durable changes: the
    id `eq` and the ids `eq.*` are keys and stay.

    **What the words say.** Everywhere a reader sees "EQ" they see "EQ/Filter": the entry's `label`
    (src/audio/effects/eq.ts), the automator's weight label `auto.eq`
    (src/audio/effects/automatorParams.ts), and the sentence under it (src/lib/copyParams.ts:112).
    "EQ Gain" becomes "Gain". The name pools an instance is drawn from (src/lib/copyNames.ts) are
    about shaping already and stay.

    **A choice is drawn as a choice.** `ParamDeclaration` (src/audio/effects/contract.ts) gains
    `choices?: readonly string[]`: the name of each step from `min`, exactly `(max - min) / step +
1` long, refused at `defineEffect` otherwise. A parameter with choices is drawn by the rack as
    a select (src/ui/components/select.tsx) in the knob's place, its items the names, its value the
    number — through the same `param.set` a knob sends, so it undoes, persists, archives and drives
    exactly as a turn does (0089). It keeps the knob's label, its hover sentence and its
    `data-automation` marks so ./scripts/smoke reads it as it reads a knob. `eq.shape` declares the
    four names — Peak, Low-pass, High-pass, Band-pass — in `EQ_SHAPES`' own order, spelled once
    beside the shapes in src/lib/biquad.ts so the picture and the card agree.

    **A low-pass by default, and the presence follows it.** `default` becomes the index of
    `lowpass`. The presence pair is then wrong as it stands: a gain of nought is silent for the
    peaking shape alone (0322), and the held shape is now a low-pass at 1 kHz, which is not a wire.
    The presence moves to the frequency — `{ param: "eq.frequency", silent: 20_000, full: …,
held: ["eq.shape"] }` — a low-pass whose edge stands above hearing is transparent, and an
    automator-grown EQ/Filter now arrives as a sweep closing down from open, which is the sound a
    filter is grown for. The `full` value is argued on the card and stated in the ADR. `eq.gain`
    keeps its default of nought. The drift reading (`driftFrom`, `lookFrom`) is unchanged: the band
    look already reads the shape (0322).

    **Stands on:**
    - A discrete choice is a number stepped by one, and the shape is written onto the node's own
      `type` (src/audio/effects/contract.ts:25, src/audio/effects/eq.ts, 0322).
    - The four shapes are `EQ_SHAPES` in src/lib/biquad.ts, in the knob's order; `eqShapeAt`
      refuses a value that names none.
    - A face is keyed on what the plugin declares and never on its id (src/ui/EffectRack.tsx:172,
      0055, 0205); a choice control keyed on a declaration is that rule kept.
    - The presence names one parameter, its silent value and the parameters it holds
      (src/audio/effects/contract.ts:165, 0202); the automator holds `held` parameters at their
      default (src/audio/effects/automator.ts:100).
    - A select exists and is in the gallery (src/ui/components/select.tsx,
      src/ui/dev/InputsSection.tsx); a durable key stays what it is while the words change
      (src/lib/copy.ts `@instead`).

    **Outcome wanted:** the picker offers an EQ/Filter; a fresh one is a low-pass at 1 kHz, its
    shape a dropdown reading "Low-pass" that a hand switches to "Peak" by name; an automator grows
    one as a filter sweep; the old shape knob is nowhere.

    **Tests that must fail first:**
    - **src/audio/effects/registry.test.ts**: an entry whose `choices` length disagrees with its
      steps is refused at `defineEffect`.
    - **src/audio/effects/eq.test.ts**: the shape declares four choices in `EQ_SHAPES`' order and
      defaults to low-pass; the presence is silent at the top of the frequency with the shape held;
      a built instance at defaults passes a low frequency and cuts a high one (through
      `magnitudeDbAt`).
    - **src/ui/EffectRack.test.tsx**: a parameter with choices is drawn as a select carrying the
      knob's label and marks and sends `param.set` with the chosen index; one without is still a
      knob.
    - **src/ui/tooltips.test.ts** or the copy total it already keeps: every user-facing "EQ" reads
      "EQ/Filter".

    **Verification:** `./scripts/fix`, `git diff --stat`, `./scripts/check` read whole; the browser
    smoke's EQ windows still pass at the moved default; one `./scripts/drive --shot` of a rack with
    an EQ/Filter open, read at 1:1, so the select sits where the knob sat.

    **Refused:**
    - **Turning the panner's three 0/1 knobs into switches.** A second occurrence; a choice of two
      is a knob until a third asks (principle 3).
    - **A lane on the shape.** It is written to a string and takes no lane (0322).
    - **A migration of stored shapes.** The numbers still name the same shapes; only the default
      moved (0026).

3.  **A delay's time is tapped, and held to the beat.** _(bench-09)_ **Durable shape moved:
    none.** The time stays `delay.time` in seconds; a tap and a hold are two more writers of it,
    and the hold is runtime state the yard keeps beside its folds, as the burst's is.

    **The declaration says it can be tapped.** `ParamDeclaration` gains `beat?: true`: this
    parameter is a length of time in seconds a hand may tap out or hold to the beat. `delay.time`
    declares it and nothing else does. A rack draws, beside any parameter that declares it, the
    same tap and the same hold the mulcher's burst row draws (src/ui/PlayerDials.tsx,
    src/ui/playerBurstControls.ts) — keyed on the declaration and never on the effect's id, the
    rule every face already keeps.

    **The arithmetic is the burst's.** `tapPress` and `tapBurst` are the tap; `beatBurst` with
    `PLAYER_BEAT_DIVISIONS` is the hold — the beat and its halvings to a thirty-second, which at
    any tempo an analysis produces lie inside the delay's own range (0.01…2 s). All four are
    imported from src/lib/playerBurst.ts as they are; its `@role` line grows to say the delay
    reads it too. A value written with the hold on is rounded before it is sent, through one place
    in front of the card's `param.set`, the shape `heldPatch` already has; the knob, the readout
    and the tap all pass through it.

    **The beat is the yard's.** The sounding tempo is the analysis's bpm at the deck's rate
    (src/ui/PlayerCard.tsx:283); it reaches the effect card through the rack's `whose`, and the
    rack that is no yard's has none (0320, 0321), so on the master rack the hold is refused and
    the tap offered, exactly as on a deck with no grid.

    **Stands on:**
    - The tap and the hold are one hook with one rounding in front of the patch
      (src/ui/playerBurstControls.ts); the arithmetic is pure (src/lib/playerBurst.ts).
    - The sounding beat is computed once in the mulcher card (src/ui/PlayerCard.tsx:283) and would
      be a second occurrence here: lift it to the yard's own read if the two would disagree.
    - `delay.time` is one AudioParam with a log curve and a lane (src/audio/effects/delay.ts).
    - The hold refuses a deck with no grid and offers the tap anyway
      (src/ui/PlayerDials.test.tsx:107).

    **Outcome wanted:** four presses on the delay card's tap set its time to the interval tapped;
    with the hold on, the time snaps to a sixteenth or an eighth of the yard's beat and stays there
    when the knob is turned; on the master rack the tap works and the hold is greyed.

    **Tests that must fail first:**
    - **src/audio/effects/registry.test.ts**: `beat` is accepted on a time parameter and refused
      on a parameter with `choices` or without a seconds range.
    - **src/audio/effects/delay.test.ts** (new): `delay.time` declares `beat` and the other two do
      not.
    - **src/ui/EffectRack.test.tsx**: a card whose parameter declares `beat` draws a tap and a hold
      after the knob; the tap sends one `param.set` with the mean interval; with the hold on, a
      turn of the knob sends the nearest division of the beat; on the master rack the hold is
      disabled and the tap is not.

    **Verification:** `./scripts/fix`, `git diff --stat`, `./scripts/check` read whole; one
    one-off Playwright run against the dev server that taps four times and reads the knob.

    **Refused:**
    - **A `delay.sync` parameter.** A durable division would be a second fact about the time that
      can disagree with the seconds the graph plays (principle 1); the hold rounds what is written.
    - **A tempo of the session's own.** The beat is the deck's analysis at its rate (0031).
    - **Re-rounding on a rate change.** The burst does not; a held value is rounded when written.

4.  **A sixth character glides like Smooth and varies like Pulse.** _(bench-10)_ **Durable shape
    moved: the set of names a stored `MotionDrawn.character` may hold gains one.** No field changes
    (0314).

    **The region.** `MOTION_CHARACTERS` (src/lib/motion.ts) gains **wander**, between smooth and
    pulse in the list: always a glide and never a step — `glide: [0.7, 1]`, `flurry: [0, 0.1]` — at
    a pace and a reach that change move to move, `pace: [0.4, 2.5]`, `jitter: [0.5, 0.9]`,
    `reach: [0.3, 0.9]`. What smooth lacks is variety and what pulse lacks is curve; this is the
    curve with the variety. The numbers are the first draw, argued by ear on a filter frequency
    and a delay time before they land; the bounds stay inside each dial's range so the arithmetic
    never clamps.

    **The words.** `MOTION_CHARACTER_LABELS` and `MOTION_CHARACTER_TOOLTIPS` (src/lib/copyMotion.ts)
    gain "Wander" and one sentence in the shape the five have. The menu offers it by being total
    over the list (src/ui/MotionMenu.tsx); the validator accepts it by the same list
    (`isMotionCharacter`).

    **Stands on:**
    - A character is a region over five dials, drawn fresh per lane (src/lib/motion.ts:661).
    - The labels and tooltips are total records checked in src/ui/tooltips.test.ts.
    - A stored character is asserted against the list (src/lib/motion.ts:606, 0314).

    **Outcome wanted:** a lane drawn in Wander on a filter frequency reads as a hand riding it —
    slow here, quick there, never a step — where Smooth reads as one metronome of glides.

    **Tests that must fail first:**
    - **src/lib/motion.test.ts**: wander lays no step (no two points a gap apart at different
      values without a ramp between); its waits vary more across a lane than smooth's do on the
      same seed.
    - **src/ui/MotionMenu.test.tsx**: the row offers six names.

    **Verification:** `./scripts/fix`, `git diff --stat`, `./scripts/check` read whole; the lane
    preview (src/ui/AutomationPreview.tsx) of one wander lane beside one smooth lane, by eye.

    **Refused:**
    - **A dial for variety.** A character is a name for a region, not a knob (0152, 0309).
    - **Reordering the five.** Their order is the row's order.

5.  **A landing throws as many sparks as its Count says.** _(bench-11)_ **Durable shape moved:
    `PlayerSpec` gains `sparkCount`, a whole number 1…`PLAYER_SPARK_COUNT_MAX`, default 1.** The
    wire validator's exact keys grow by one; a stored session of the old shape is discarded, not
    repaired (0026).

    **The dial.** `PLAYER_SPARK_COUNT_MIN = 1`, `PLAYER_SPARK_COUNT_MAX = 4` in
    src/lib/playerSpark.ts, with the family's `SparkSpec` growing the field; a stepped range in
    src/lib/playerKnobs.ts; "Count" and its sentence in src/lib/copyKnobs.ts; the fourth dial on
    the spark row after Delay (src/ui/PlayerDials.tsx), carried like the level and the delay
    rather than drawn (0124).

    **The roll.** A landing that sparks throws `sparkCount` companions, each at a slot of its own
    from `travelFrom` (src/lib/playerWalk.ts:325): `sparked` becomes a list of slots beside one
    level and one delay, still null where the roll fails, so a pattern that sparks nothing rolls
    nothing and draws the stream it drew (P123). The odds are rolled once per landing, not once per
    spark: the Spark dial says whether, the Count says how many.

    **The sound.** Each spark is one more source through its own level gain into the landing's own
    fader (src/audio/player.ts:383), stopped by the landing's stop, so every one of them stays
    inside the entry it rides (0166, 0175). Where they begin: the delay says how far into the
    landing the **last** spark begins, and the rest stand evenly between the landing's start and
    it — at a delay of nought all sound together as a chord of regions, at a delay of one they are
    a ratchet across the window. That keeps the one bound the dial has and gives the count a
    rhythm rather than a pile.

    **The read.** `sparkPosition` in the per-frame read becomes the positions of every spark, so
    the waveform (src/ui/Waveform.tsx:116) draws each; `sparkPositionOf` (src/audio/player.ts:589)
    answers per spark.

    **Stands on:**
    - The spark is rolled per landing with the drop and the reverse (src/lib/playerWalk.ts:642) and
      rides the landing's entry (src/audio/player.ts:45, 0166).
    - Its delay is a fraction of the window so no value can outlive the landing
      (src/lib/playerSpark.ts:40, 0175).
    - The level is carried and not drawn (src/lib/playerWalk.test.ts:653, 0124).
    - The spec's exact keys are one list (src/lib/playerWire.ts:298) and the knobs one record
      (src/lib/player.ts:373).

    **Outcome wanted:** Spark all the way, Count at three, Delay at half: every landing is
    followed by three quieter reads of three other regions spaced across its first half, in rhythm
    with it, and the waveform shows all three cursors.

    **Tests that must fail first:**
    - **src/lib/playerWalk.test.ts**: a landing that sparks carries as many slots as the count,
      none equal to its own; a count of one draws exactly the stream drawn before the field.
    - **src/audio/player.test.ts** and **src/audio/playerLanding.test.ts**: a count of three builds
      three sources into the landing's fader, begins them evenly up to the delayed fraction, and
      stops all three with the landing; the read answers three positions.
    - **src/ui/PlayerDials.test.tsx**: the spark row draws four dials.
    - **src/lib/player.test.ts**: a spec without `sparkCount` is refused.

    **Verification:** `./scripts/fix`, `git diff --stat`, `./scripts/check` read whole; the
    keyboard smoke on a sparking pattern; one headed listen at count four.

    **Refused:**
    - **A count of nought.** Whether a landing sparks is the Spark dial; the count begins at one.
    - **A per-spark level or delay.** One level, one delay, spaced by rule (0124).
    - **Sparks with a rhythm of their own.** Each takes the landing's window, count and seams
      (P123); the spacing is arithmetic on the landing's delay, never a second clock.

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

Everything abandoned, narrowed, or landed with a known cost, one paragraph each. Nothing here is
scheduled by being here.

**The air keeps two joining words, and six of the place's twelve are out** (bench-07, 0324). The
step listed eight air words — at, in, under, before, after, toward, through, against — and twelve
for the place; the rule that every word must read against every noun left two and six. An air is a
medium, so in and through cross the bank and every word of time or direction fails somewhere in it:
"at Moonlight", "through Frost", "toward Low Sun". Two nouns were respelled to be mediums rather
than moments — "Falling Dusk" for Dusk, "Low Sunlight" for Low Sun — which is a change bench-06
reads, and its paragraph is updated to the new spelling. The place lost the six that ask something
of the noun: "over" and "within" outright, "beneath" and "under" for wanting an overhang the Fence
has not got, "along" for wanting a line, "at" for wanting a locus — so the step's own example
reading, "beneath the Stairs toward Dusk", cannot be minted, and neither can a noun walked along
rather than stood behind ("the Stone Path"). The air multiplies by two rather than eight, 32
readings against 16. Widening either family again means splitting it in two, which is a per-noun
word list by another name and is what the step refused.
