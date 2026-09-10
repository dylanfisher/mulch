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

bench-06 landed on 2026-09-09 as
[0329](decisions/0329-a-yards-picture-is-a-scene-its-name-names.md); `yardScene`
(src/lib/yardScene.ts) reads a name into a scene, a light and a wind by a table per bank, the
contract is src/lib/moireScene.ts and the four grounds are one file each under src/ui/scene/,
refused at load by src/ui/scene/scenes.ts. Four things moved off the step's own text and are in §4:
the scene is the tile's ground and its ramp while the film — the gratings, the beat, the three
channels and the band — stays where it was rather than going, so every alpha case the screen already
had still holds; the wind is two amplitudes and no rate, the screen having no clock; a light is one
token rather than a second row of five; and the tunable ids are `<scene>.<term>`, because an id is
`group.name` with one dot and the group per scene is what the step asked for. The registry's own
cases are src/ui/scene/scenes.test.ts rather than src/lib/moireScene.test.ts, `src/lib` not being
allowed to import `src/ui`, and the painter's four are src/ui/moireCanvasScene.test.ts, that file's
neighbour standing within forty lines of the hard cap. Review moved three things: the three banks
the reading keys on are now declared _as_ the grouping in src/lib/copyYard.ts and flattened from it,
so no yard word is written twice; `latticeAxis` was lifted into the contract as `sceneAxis`, the
scenes being its second caller; and a scene's tunables are read inside the bake, so the tile key
carries a count of how many times any tuning has moved and the tiles are cleared when one does —
without which every slider the bench argues a ground on was inert in the app. The next free decision
number is 0332.

1.  **A yard's picture is a scene its name names.** _(bench-06, landed 0329)_ **Durable shape
    moved: none.**
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

### Block: the name is the whole picture

The four scenes that landed in 0329 read as textures: a ground takes a sixth of a tile's alpha and
its five stops are read once a tile, so every yard is one colour at a sixth strength under one fine
grid. The four stills on the drift bench (`#/sketch`, entries 10–13, 0331) are the answer, and this
block ships them: a scene is read along its own five stops **per pixel**, at full strength, and a
field with no pitch in it is drawn with noise. A poppy field, black rippled water, backlit seed heads
and a canopy from under it are what a Foxglove, a Reed, a Heather and a Willow stand in.

And every phrase the mint writes reads into the picture. Today three of the seven banks read —
the plant, the air's noun and the adjective — and the place, the air's joining word and the detail
read nothing (src/lib/yardScene.ts). By the end of this block a name is read whole, one table per
bank and never a hash (0329):

| Phrase                              | Bank                        | Reading  | What it does to the picture                                             |
| ----------------------------------- | --------------------------- | -------- | ----------------------------------------------------------------------- |
| Windy, Hushed, Wild…                | `YARD_ADJECTIVES_BY_WIND`   | `wind`   | lean baked, sway on the frame — and a gust that travels (step 7)        |
| Foxglove, Reed, Heather, Willow…    | `YARD_PLANTS_BY_SCENE`      | `scene`  | which still the picture is                                              |
| by, beside · near, past · behind…   | `YARD_PLACE_WORDS_BY_REACH` | `reach`  | how close the frame stands: the marks' period and the structure's size  |
| the Old Wall, the Stairs, the Gate… | `YARD_PLACE_NOUNS_BY_STAND` | `stand`  | the one large thing standing in the field, as the shadow it casts       |
| in · through                        | `YARD_AIR_WORDS_BY_SPREAD`  | `spread` | whether the light is a wash or falls through the field from one edge    |
| Falling Dusk, Moonlight, Frost…     | `YARD_AIR_NOUNS_BY_LIGHT`   | `light`  | the token every stop is mixed toward                                    |
| with Moths, with a Bell…            | `YARD_DETAILS_BY_SPECKS`    | `specks` | the bright points: the still's own, a flock that comes and goes, or one |

Gestural and digital, never literal, as before: a wall is a band of shade and a wren is a speck.
The film — the gratings, the beat, the three channels, the band — stays exactly where 0329 left it,
because the one thing this block changes about `build` is what colour a pixel is, never how much of
it the gratings cut. **The scene becomes the colour and the film stays the alpha**, which is what
lets a canopy go as dark as its stops allow without touching `SCREEN_FLOOR`.

**Layout, before the first step.** `build` and the bake beside it leave src/ui/moireScreen.ts,
which stands at 739 lines, for `src/ui/moireScreenTile.ts` — a split and not a shave, and the first
step pays it (at-the-cap rule, docs/map.md). The noise two stills are made of is
`src/lib/moireNoise.ts` beside src/lib/moireGrain.ts, lifted from `streakAt` and `hash2` in
src/ui/sketch/sketchStill.ts and imported by both. Each still's field moves **into** its scene file
under src/ui/scene/ — the still is the scene, not a sketch of one — and the bench's entries 10–13 go
when their scene lands, the entries 06–09 drawing the shipped scene through its own stops (0247).
The structure a place noun names is one ground shared by every scene, `src/lib/moireStand.ts`, and
not a term per scene file. New readings go into src/lib/moireScene.ts as the three there did: a
`const` list, a type off it, a terms record, and the grouping of the bank in src/lib/copyYard.ts
flattened by `banked`. A new stop is a token in src/ui/tokens.css, registered with `@property`
like the twelve there, named `--scene-<name>-<stop>`, and there is no other file a colour may enter
(0236). Every number a scene declares stays a `tunable("<scene>.<term>")` in its own group in
src/lib/copyDriftGroups.ts, read inside the bake and so covered by `tuned` in the key (0329).

The order is decided: the contract first, on one scene, because every other step reads the ramp
per pixel; the two grating stills next and the two noise stills after them, each pair sharing its
maths; the place, then the air's word and the detail, because each adds a reading to a contract
that has to hold every scene already; and the gust last, because it is the one step whose cost lands
on the frame and the one that may not stand.

1.  **A scene is read along its own stops, per pixel, and the bloom is the poppies.** _(bench-12)_
    **Durable shape moved: none.** A name is a reading and nothing about the reading is stored
    (0329).

    **The contract answers where, not how much.** `Scene.ground` (src/lib/moireScene.ts) returns
    where on the scene's own ramp a device pixel is read, nought to one, instead of a share of the
    tile's alpha; `depth` and `rest` go, since a ground that says where it rests needs neither. The
    ramp is five token names and **none of them is `null`**: a scene names all its stops, as every
    still does (0331), and `SCENE_RAMP_INK` and the registry's caller's-ink refusal go with it. The
    yard's own hue travel is an offset on the read — `sceneHue` becomes
    `clamp(ground + SCENE_HUE_REACH * (hue - DRIFT_REST.hue), 0, 1)` — so an effect claiming a hue
    still slides the whole field along its ramp, and `SCENE_HUE_REACH` is now sized so a claim moves
    the read by at most one stop, because a field that is already two hues has one stop of travel
    to spend and not four.

    **`build` reads the ramp in the pixel loop.** In `src/ui/moireScreenTile.ts`, the bake moved
    whole out of src/ui/moireScreen.ts: `sceneStops` resolves the five stops and the light once a
    tile as it does today, and the pixel loop reads `ramp` at the ground's position for every pixel,
    into an out-parameter — `ramp(stops, value, into)` in src/lib/moireColour.ts fills a four-element
    ink it is handed, because a build allocates one ramp and no more (0129, 0070) and the shape
    today hands back a fresh array on every call. The alpha of the pixel is the film's alone:
    `keep` is the row, the column, the blob and the band, and the scene's ground no longer appears
    in it. The channel fringe still pushes each third of a cell onto its own channel of whatever ink
    the ramp read.

    **The bloom is the poppies.** `poppiesField` (src/ui/sketch/sketchStillField.ts) moves into
    src/ui/scene/bloom.ts as its ground: heads at a period that grows down the tile, nine-cell
    nearest-head read, stems leaning by `terms.lean`, every number a tunable in the Bloom group —
    `bloom.far`, `bloom.near`, `bloom.head`, `bloom.stroke`. The period grows down the **tile** and
    comes round at its foot by `sceneRepeat`, so the perspective is one tile deep and repeats: a
    field seen in stripes a tile tall, each receding, which is the constraint every ground is under
    (0329) and is judged at the crop. The bob rides no dial in the app — the ground has no phase —
    and is refused below. The stops are the still's five, all existing tokens.

    **The bench draws a scene through its own stops.** `SceneStage` (src/ui/sketch/drift/
    SketchDriftScenes.tsx) hands `SketchDriftStage` the scene's `ramp` resolved as `SketchStop`s
    instead of `inking="ink"`, so entry 07 is the shipped bloom in the shipped colours; entry 10
    goes, with its field, its stops and its dial. `printed` stays on the bench for the three stills
    still there: the print is the film's and not the field's, and it does not land (0331).

    **The other three scenes hold under the new contract** by returning the value they return today
    as a ramp position — the meadow's strokes read as a swing about the middle stop, the water's
    and canopy's as they were — so this step ships one still and breaks nothing, and the next three
    steps replace each in turn.

    **Stands on:**
    - The bench already reads a still's own stops per pixel and paints `ramp(stops, field(x, y))`
      (src/ui/sketch/SketchDriftStage.tsx, 0331), so the app is catching up with a picture that
      exists.
    - `build` is one loop over the pixels and `sceneStops` is refilled in place
      (src/ui/moireScreen.ts:534, :623); `ramp` allocates (src/lib/moireColour.ts:26).
    - The floor is asserted on the tile's alpha (src/ui/moireScreen.test.ts:344, :615), and this
      step takes the scene out of the alpha altogether.
    - src/ui/moireScreen.ts is at 739 of 800 lines; the split is the layout paragraph's.
    - The registry refuses a ramp that is not five stops and holds the `null` stop at
      `SCENE_RAMP_INK` (src/ui/scene/scenes.ts).

    **Outcome wanted:** a yard named for a Foxglove is scarlet heads over green stems at full
    strength, under the same fine grid, fringe and band every yard has, and every other yard looks
    exactly as it did. A rack of six shows one red field among five textures. Adding a stop to a
    scene is one token and one name in its ramp.

    **Tests that must fail first:**
    - **src/lib/moireColour.test.ts**: `ramp` fills the ink it is handed and hands the same array
      back; a value between two stops is between them.
    - **src/ui/scene/scenes.test.ts**: a ramp holding `null` is refused; a ramp of four stops is
      refused; every scene's ground answers inside nought to one across a whole tile.
    - **src/ui/moireScreen.test.ts**: two pixels of one tile in different places on the bloom's
      ground are read in different inks; the tile's mean alpha is the same with the scene as
      without it, for every scene in the contract, and `SCREEN_FLOOR` holds for every scene — the
      case 0331's canopy said did not exist.
    - **src/ui/moireCanvasScene.test.ts**: through the recorder, the bloom lays down a tile whose
      pixels span more than one stop.
    - **src/ui/sketch/SketchDrifts.test.tsx**: the bench holds one stage per scene, each read
      through that scene's own stops, and no still by the name of a scene that has shipped.
    - **src/ui/MoireTuning.test.tsx**: the Bloom group holds the poppies' numbers.

    **Verification:**
    - `./scripts/fix`, `git diff --stat` for collateral, then `./scripts/check` read whole.
    - `./scripts/drive --shot` of one yard named for a Foxglove, read at the 1:1 crop, and one
      rack of six; and the bench at `--route '#/sketch'` to see 07 and 10 side by side before 10
      goes. A tile a hundred pixels tall makes the perspective a stripe; judge whether it reads as a
      field at the crop before tuning `bloom.near` down.
    - `./scripts/profile`: a per-pixel `ramp` on the bake must not move the rebuild past what a
      tint step costs today.

    **Refused:**
    - **A phase on the ground.** The bob is a dial on the bench and the bake has no clock (0126);
      the heads stand and the film moves over them. A motion that needs a phase is step 7's.
    - **The print.** A vignette and a grain are the lens, and a meadow has no lens (0331).
    - **Keeping the caller's ink as a stop.** It was the one-hue instrument's identity, and 0331
      already found a still cannot hold it; a scene that wants the yard's own ink names the token
      the surface resolves it from.
    - **Two tiles.** One bake, one `fillStyle`, one `fillRect` a frame (0070) is the rule this whole
      block keeps.

2.  **The water is the glint.** _(bench-13)_ **Durable shape moved: none.**

    **Black water under a lattice of short glints, with blades and their broken reflections.**
    `glintField` moves into src/ui/scene/water.ts as its ground: the ripple row, the second lattice
    it beats against, the dash cut across at a phase of the row's own, the slow diagonal swell, and
    the ten blades written by hand in the tile's own pixels — kept as written, because a still
    argued at 1:1 has to be the same picture twice (0247), placed in the tile by
    `sceneRepeat` so they come round. Tunables in the Water group: `water.ripple` and `water.beat`
    (the two pitches, and the beat is their difference), `water.dash`, `water.swell`, `water.deep`.

    **The beat is one ground, not a second tile.** 0331 costed the glint as a second tile and a
    second full-canvas fill, so a crest lit at one setting is dark at the next. It is refused: a
    ground is a function of a pixel and both lattices are computed in it, so the beat is baked, and
    what flickers is the film's own gratings crawling and breathing over it on the frame — the
    instrument's subject read at the scale of a ripple, which is what the sketch said it was for.

    **A darker water is one token.** The deepest stop the instrument holds is `--scene-water-deep`
    at a lightness of 0.42 (src/ui/tokens.css:106), and the still is near black. This step mints
    `--scene-water-black` in tokens.css, registered like the rest — the layout paragraph's one door,
    and the first time a scene opens it — and the water's ramp is black, deep, blue, blade, lit.

    **Stands on:**
    - Step 1's contract, and the ground reading both lattices in one call
      (src/ui/sketch/sketchStillField.ts, `glintField`).
    - `sceneRepeat` snaps a mark's period onto the tile (src/lib/moireScene.ts), and a hand-placed
      blade is a mark like any other.
    - Every scene stop is a registered `@property` (src/ui/tokens.css:162).

    **Outcome wanted:** a yard named for a Reed or a Rush is dark water at full strength with a few
    green blades and glints along the ripples, and the glints shimmer as the film crawls.

    **Tests that must fail first:**
    - **src/ui/scene/scenes.test.ts**: every token a scene names resolves in tokens.css, the new
      one included; the water's ground reads at its first stop over most of the tile and at its top
      stop somewhere.
    - **src/ui/moireScreen.test.ts**: a water tile's median pixel is darker than a bloom's.
    - **src/ui/sketch/SketchDrifts.test.tsx**: entry 11 is gone and 08 draws the shipped water.

    **Verification:** as step 1; the crop is judged at the ripple's own pitch, where the dash
    either reads as a glint or as woven cloth.

    **Refused:**
    - **A second tile and a second fill** (above).
    - **A scattered blade.** Placed, or two shots disagree.

3.  **The meadow is the seed heads and the canopy is the light through it.** _(bench-14)_ **Durable
    shape moved: none.**

    **Two stills that are noise, not gratings.** `hash2` and `streakAt` leave the bench for
    `src/lib/moireNoise.ts` — the precedent for a painter reading a hash a pixel at a time is
    `grainTile` (src/lib/moireGrain.ts:40), and this is its second occurrence, so it is lifted rather
    than copied. `seedheadsField` becomes the meadow's ground — four scales of streaked noise, the
    stalks, the sparks, the mass held between two warm stops — and `skylightField` the canopy's —
    four scales of leaf, the fall to the foot, the specks of sky where the leaf has thinned. Their
    numbers are the Meadow and Canopy groups: `meadow.fibre`, `meadow.awn`, `meadow.stalk`,
    `meadow.mass`; `canopy.crown`, `canopy.leaf`, `canopy.mass`, `canopy.thin`, `canopy.rare`.

    **The lean is `terms.lean` and the gust is not here.** Both stills carry a gust that travels
    across the picture as a wave under their dial. A bake has no phase, so both grounds take the
    wind's lean as the meadow's grating did and a standing gust — the wave frozen at one phase, so a
    field leans more here than there — and the travel is step 7's.

    **Noise comes round at the tile.** A hash does not repeat, and the tile does: the noise is
    sampled on coordinates wrapped by `sceneRepeat`'s constraint — a cell count that divides the
    tile on each axis, the way a grating's period is snapped — or a seam runs down the picture once
    a tile at full contrast. This is the one new piece of maths in the step and it is in
    moireNoise.ts, tested on its own.

    **Two tokens.** A tan is a mix of two stops today and reads scarlet on its way down (0331); a
    canopy's shade is `--scene-canopy-dark` at 0.38 and the still is darker. `--scene-meadow-tan`
    and `--scene-canopy-shade` are minted in tokens.css and registered, and each ramp is rewritten
    to hold what its picture uses and nothing it must not reach.

    **Stands on:**
    - The two fields as drawn (src/ui/sketch/sketchStillField.ts) and the argument that a mass
      has no pitch (0331).
    - `grainTile` bakes a hash a pixel at a time and holds it (src/lib/moireGrain.ts).
    - The floor is asserted on alpha and the scene no longer touches alpha (step 1), so a canopy
      may sit on its darkest stop.

    **Outcome wanted:** a yard named for a Heather is a warm tan mass with dark stalks through it,
    one named for a Willow a dark green wall of leaf with pale specks in its upper half, both at full
    strength, neither showing a seam at any tile join, and the four scenes together read as four
    different photographs.

    **Tests that must fail first:**
    - **src/lib/moireNoise.test.ts** (new): a value at the tile's right edge equals the value at
      its left; the noise is in nought to one; the same coordinates read the same value twice.
    - **src/ui/scene/scenes.test.ts**: the meadow's median read sits between its second and fourth
      stops; the canopy's sits at its lowest two.
    - **src/ui/moireScreen.test.ts**: `SCREEN_FLOOR` holds on a canopy tile.
    - **src/ui/sketch/SketchDrifts.test.tsx**: 12 and 13 are gone; `sketchStill.ts` and
      `sketchStillField.ts` go with them, and the bench's second introduction says nine.

    **Verification:** as step 1, and the crop at a tile join — the seam is the thing a whole-canvas
    view cannot show.

    **Refused:**
    - **A travelling gust** (step 7).
    - **The print** (0331).

4.  **The place reads: how close the frame stands, and what stands in the field.** _(bench-15)_
    **Durable shape moved: none.**

    **The joining word is the reach.** `SCENE_REACHES = ["close", "middle", "far"]` in
    src/lib/moireScene.ts, and `YARD_PLACE_WORDS` becomes `YARD_PLACE_WORDS_BY_REACH` in
    src/lib/copyYard.ts — by and beside are close; near and past are middle; behind and beyond are
    far — flattened by `banked` like the adjectives, so a word exists in one place. `SCENE_REACH_TERMS`
    is one number per reach, a scale on every mark's period: close multiplies the poppies' `near`
    and the seed heads' cells up, far down. The reading rides `terms.reach` into every ground,
    which is one multiply on the period each ground already snaps with `sceneRepeat`.

    **The noun is the stand.** `SCENE_STANDS = ["wall", "steps", "grille", "mass"]` and
    `YARD_PLACE_NOUNS_BY_STAND`: the Old Wall, the Fence, the Hedge, the Low Bridge, the Garden
    Seat are a **wall** — a band of shade across the tile at one height; the Stairs, the Cold Frame,
    the Potting Bench, the Log Store, the Woodpile are **steps** — the tile cut into terraces
    (sketch 03's move, landing here); the Greenhouse, the Gate, the Chicken Run, the Ivy Arch are a
    **grille** — a coarse open lattice at many times the film's pitch; and the Shed, the Water Butt,
    the Rain Barrel, the Old Pump, the Stone Trough, the Beehive, the Coal Bunker, the Compost
    Heap, the Back Door, the Apple Tree are a **mass** — one upright column of shade standing to
    one side. Each is a **shadow**: `standShade(x, y, terms)` in `src/lib/moireStand.ts` answers
    nought to one and `build` pulls the ramp position toward the scene's first stop by it, so the
    thing a yard stands by is drawn as the shade it casts on the field, in the field's own darkest
    ink, and never as an object. The reach scales it: close is a wide soft shadow, far a thin one.

    **`yardScene` reads both** the way it reads the plant, first match wins, and the mint's order
    holds: the place word is drawn after the plant and before the air. `YardScene` gains `reach` and
    `stand`, both in the tile's key.

    **Stands on:**
    - The banks and the join (src/lib/copyYard.ts, 0324): six words that each read against every
      noun, and the nouns solid enough to stand on one side of — which is what a shadow needs.
    - `readingOf` refuses a word read two ways (src/lib/yardScene.ts).
    - The terrace's profile argument (src/ui/sketch/sketchEntries.ts, `terrace`), and its own
      note that a riser aliases unless softened by a pixel.
    - `TILE_CACHE` is spent across `(scene, light, wind)` triples (§4); this step multiplies the
      triples by twelve and does not raise the cap.

    **Outcome wanted:** "Quiet Reed behind the Old Wall" is dark water with a band of deeper shade
    across its lower third, small and far; "Bright Foxglove by the Greenhouse" is poppies close up
    under a coarse open lattice; and a hand can say which before it is added.

    **Tests that must fail first:**
    - **src/lib/copyYard.test.ts**: every place word has a reach and every noun a stand, and the
      flattened banks are the grouped ones.
    - **src/lib/yardScene.test.ts**: every word reads a reach and every noun a stand; a noun's
      adjective does not rename the wind; "past the Apple Tree" reads mass and middle.
    - **src/lib/moireStand.test.ts** (new): each stand shades part of a tile and not all of it; a
      far shade is narrower than a close one; steps have as many risers as their term says.
    - **src/ui/moireScreen.test.ts**: two yards differing only in their noun lay down different
      tiles; the key carries reach and stand.
    - **src/ui/MoireTuning.test.tsx**: a Stand group.

    **Verification:** as step 1; four shots, one per stand, on one scene.

    **Refused:**
    - **A stand per scene.** One shadow, four scenes; a wall on water and a wall in a meadow are the
      same shade on different ink, which is the point.
    - **Drawing the thing.** A bench is a band of shade, never a bench.
    - **Raising `TILE_CACHE`** without measuring it (§4).

5.  **The air's word and the detail read: how the light falls, and what the bright points are.**
    _(bench-16)_ **Durable shape moved: none.**

    **"in" is a wash and "through" falls from one edge.** `SCENE_SPREADS = ["wash", "fall"]`,
    `YARD_AIR_WORDS_BY_SPREAD` (in is a wash, through a fall), and `SCENE_LIGHT_TERMS` is spent
    two ways: a wash mixes every stop toward the light's token by `amount`, as today; a fall mixes by
    `amount` scaled down the tile from its top edge to nought at its foot — light seen _through_
    the field, strongest where the field is thinnest. The mix moves from `sceneStops`, once a tile,
    into the pixel loop, on the position rather than the ink: a fall slides the read toward the top
    stop by the light's amount at that height, so the light is read along the scene's own ramp and
    no second interpolation is paid. A name with no air is the day and spreads nothing.

    **A creature is a flock and an object is one kept thing.** `SCENE_SPECKS = ["own", "flock",
"kept"]` and `YARD_DETAILS_BY_SPECKS`: Moths, Bees, a Wren, Snails, Sparrows, Beetles, Swifts,
    Spiders, Blackbirds are a **flock**; a Bell, a Watering Can, a Wind Chime, a Wheelbarrow, a
    Cracked Saucer, a Rope Swing, a Rusted Trowel are **kept**; and a name with no detail is the
    scene's **own** specks — the sparks, the glints and the sky the stills already carry. The specks
    are the one shared term of a still that reads at the top stop, and every scene declares them as
    `Scene.specks(x, y, terms)` the way it declares its ground; `build` reads it after the shade,
    lifting the position to the top stop where a speck stands. A flock is the scene's own specks at
    three times their count, hashed so no two yards' flocks agree; kept is one speck, larger and
    sharper, at the foot of the stand's shade.

    **Stands on:**
    - The air's two words are a medium stood in and moved through (src/lib/copyYard.ts, 0324),
      which is exactly wash and fall.
    - Each still already has specks read at its top stop (`spark`, `sky`, `lit` in
      src/ui/sketch/sketchStillField.ts).
    - The detail is on its own coin and the last thing drawn (`mintYardName`), so `yardScene`
      reads it last and its words collide with no bank before it.

    **Outcome wanted:** "Damp Heather through Falling Dusk" is a tan mass lit warm at its top and
    tan at its foot; "with Sparrows" fills a field with bright points; "with a Bell" puts one at the
    foot of the wall.

    **Tests that must fail first:**
    - **src/lib/yardScene.test.ts**: every air word reads a spread and every detail reads specks;
      no air reads wash and no detail reads own.
    - **src/ui/scene/scenes.test.ts**: every scene declares specks; a flock stands on more pixels
      than own and kept on fewer.
    - **src/ui/moireScreen.test.ts**: a fall reads a top row nearer the light than its bottom row,
      a wash reads both alike; a tile with a kept speck has one bright island.

    **Verification:** as step 1, and one rack of six with every reading in play.

    **Refused:**
    - **A speck that moves.** A flock comes and goes in step 7 if the gust lands, and stands until
      then.
    - **A sound for a bell.** The name reads into the picture and nothing else.

6.  **The reading is said on the yard.** _(bench-17)_ **Durable shape moved: none.**

    The name is now seven readings, and a hand should be able to see them. The yard's header shows
    its name as it does; beside it, on hover or in the tuning panel's Scene group, the reading is
    said in the scene contract's own words — "poppies, close, by a grille, a wash of dusk, a flock"
    — so a hand can check what a name was read as against what was drawn. Copy in src/lib/copy.ts
    or, that file being at its cap (0045), in `src/lib/copyScene.ts`; no command, no durable field,
    no session state (§2, a view preference).

    **Tests that must fail first:** **src/ui/MoireTuning.test.tsx**: the Scene group says every
    reading of the active yard; **src/lib/copyScene.test.ts**: every reading in every contract list
    has a word.

    **Refused:** a rename, and a scene picker — the name is the picker (0329).

7.  **The wind gusts.** _(bench-18)_ **Durable shape moved: none.** The step that may not stand.

    **The lean travels across the picture as a wave.** Two stills carry a gust — a lean that is a
    function of where a stroke stands and of the phase — and 0331 said where it can and cannot go:
    not in `cutField`, which slices the gratings and never the screen, and not as a pattern
    transform, a `DOMMatrix` being affine. It is the screen fill in src/ui/moireCanvas.ts:596 cut
    into vertical strips, each under one more turn of the shear the sway already writes
    (src/ui/moireScreen.ts:736), so a frame goes from one `fillStyle` to one per strip.
    `SCENE_WIND_TERMS` gains `gust`, the wave's amplitude per wind, still at nought and wild at
    the most; the strip count is `tunable("wind.strips")`, and a flock's specks ride the strip's
    phase so they come and go.

    **The cost is 0070 and it is measured before it is kept.** `./scripts/profile` before and
    after, interleaved, on a rack of six grown yards; and `./scripts/drive` at the measured drag
    (headed, per the memory of measuring a drag on the dev server). If a frame at eight strips
    costs more than a tint step, the step lands as a **standing** gust — the wave baked at one phase,
    which steps 3 and 5 already draw — and §4 records the measurement.

    **Tests that must fail first:** **src/ui/moireScreen.test.ts**: the fill is cut into as many
    strips as the term says and each strip's shear differs from its neighbour's by one turn of
    the gust; **src/ui/moireCanvasScene.test.ts**: through the recorder, a still yard fills once and
    a wild one fills the strip count.

    **Refused:** a clock of the gust's own (0126); a strip count above what the profile allows.
