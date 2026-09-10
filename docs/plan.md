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
without which every slider the bench argues a ground on was inert in the app.

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
| Windy, Hushed, Wild…                | `YARD_ADJECTIVES_BY_WIND`   | `wind`   | lean baked, sway on the frame — and a gust that travels (0338)          |
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
`src/lib/moireNoise.ts` beside src/lib/moireGrain.ts, lifted from the streaked noise and the hash
the two stills were drawn from and imported by both. Each still's field moves **into** its scene file
under src/ui/scene/ — the still is the scene, not a sketch of one — and each bench still goes when
its scene lands, the entries 06–09 drawing the shipped scene through its own stops (0247). The
poppies went with bench-12 and the glint with bench-13, so the two left are 10 and 11.
The structure a place noun names is one ground shared by every scene, `src/lib/moireStand.ts`, and
not a term per scene file. New readings go into src/lib/moireScene.ts as the three there did: a
`const` list, a type off it, a terms record, and the grouping of the bank in src/lib/copyYard.ts
flattened by `banked`. A new stop is a token in src/ui/tokens.css, registered with `@property`
like the twelve there, named `--scene-<name>-<stop>`, and there is no other file a colour may enter
(0236). Every number a scene declares stays a `tunable("<scene>.<term>")` in its own group in
src/lib/copyDriftGroups.ts, read inside the bake and so covered by `tuned` in the key (0329).

The order is decided: the contract first, on one scene, because every other step reads the ramp
per pixel; the two grating stills next and the two noise stills after them, each pair sharing its
maths; the place (0335), then the air's word and the detail (0336), because each adds a
reading to a contract that has to hold every scene already; and the gust last (0338), because it is
the one step whose cost lands on the frame and the one that may not stand. It stood: the frame at
eight strips costs thirty microseconds more than the frame at one, which is inside the spread of
the base runs against each other.

bench-12 landed on 2026-09-09 as
[0332](decisions/0332-a-scene-is-the-colour-and-the-film-is-the-alpha.md): `Scene.ground` answers
where on the scene's own ramp a device pixel is read, `build` reads that ramp per pixel into one ink
it refills, and the bloom is the poppies. The tile left src/ui/moireScreen.ts **whole** rather than
`build` alone — the bake needs the gratings, the beat, the channels and the band, so a split that
moved only the bake would have been a cycle between the two halves of one picture; src/ui/moireScreenTile.ts is what
a tile is made of and the pass that writes it, src/ui/moireScreen.ts is where a tile is put and what
moves it, and the import runs one way. Seven things moved off the step's own text. A scene that
wants the yard's own ink names `--primary`, which is registered as a `<color>` in src/ui/tokens.css
— no colour is minted (0236), but the layout paragraph's "one token per new stop" now also covers
registering one the theme already had. `--scene-bloom-ground` and `--scene-bloom-petal` went with
the lattice they were for, nothing else naming them. The three `<scene>.depth` tunables went with
`Scene.depth`, and the Bloom group is `bloom.far`, `bloom.near`, `bloom.head` and `bloom.stroke`.
The bench's chips are a literal class per token, because Tailwind reads source as text and a class
assembled at runtime is one it never generates — the scene still owns its ramp, and a stop with no
chip is refused. The recorder in src/ui/moireCanvasPainted.ts resolves a token to its own ink
(`resolvedInk`) rather than one colour to every token: with the ground out of the alpha, a stub that
answered one colour drew every scene as the same tile, which is the measurement that cannot fail
that file's own note warns about. The saturation case in src/ui/moireScreen.test.ts now measures how
much of a pixel stands on the channel its own third of the cell lights rather than the plain spread
between the three, the ink under the fringe no longer being one colour. And the poppies' bob is
refused as the step says, so `nearestHead` takes no phase and the heads stand. The next free
decision number is 0333.

bench-13 landed on 2026-09-09 as
[0333](decisions/0333-the-water-is-the-glint-and-the-beat-is-one-ground.md): both lattices are
computed inside one ground, so the beat is baked and the second tile is refused outright; the ten
blades are kept as written and reached through the shortest signed offset on a period `sceneRepeat`
snapped from the frame they were drawn in, which is the general answer for a mark placed by hand
rather than by a cosine; and `--scene-water-black` is the first stop this block mints. Six things
moved off the step's own text. The Water group is exactly the five the step named, which means
`water.wave` and `water.blade` go: the swell is one dial now and the blades are placed rather than
spaced, so a spacing nobody reads is a slider that lies. The bend, the swell's own banding, and how
much of a crest is dark before a glint lights are constants beside them, for the poppies' reason —
three more sliders under one field is three ways to say the same thing. The still's dial was a
phase and a bake has no clock (0126), so it is dropped rather than frozen: the flicker is the film
crawling over a standing beat, which is the step's own argument. The frame the blades were written
in is a declared constant of the scene — 330 by 110 device pixels, the still's own — because
src/ui/scene/ may not read src/ui/sketch/ and the import would run the wrong way. `--drift-cool`
leaves the water's ramp with the swell stop, nothing else in the scene naming it. And
`resolvedInk` (src/ui/moireCanvasPainted.ts) gained the new token, or the recorder would have read
a scene stop as its own default orange and the darkest picture in the app as the brightest. The
review then found a seventh: the Water group's own push drove both pitches to their shared floor and
took the beat out on its whole travel, so the second pitch names no wild end — the step's claim that
only a hand can tune this ground into nothing was false until it did.

bench-14 landed on 2026-09-10 as
[0334](decisions/0334-a-leaning-noise-comes-round-on-a-twisted-lattice.md): the meadow is the seed
heads and the canopy is the light through it, both drawn from `streakTiled` in src/lib/moireNoise.ts,
and the last two stills are gone with the two files behind them. **The one new piece of maths cost
more than the step priced it at.** The step said the noise is sampled on coordinates wrapped by
`sceneRepeat`'s constraint; that is true and is not enough. A grating repeats every period, so a
`sceneSlope` lean of a whole period per tile is invisible at the join; a noise repeats every _tile_,
so the same snap leaves it whole cells out of step down the picture and the only lean a plain wrap
admits is one whole tile per tile — no lean at all. The wrap leans with the field instead: the cell
lattice is generated by `(cols, 0)` and `(twist, rows)`, `twist` being the cells the snapped lean
carries the field over the tile's depth. Six more things moved off the step's own text. The Meadow
group is `meadow.fibre`, `meadow.awn`, `meadow.stalk` and `meadow.mass` and the Canopy group is the
five the step named, with the old `meadow.stroke`, `meadow.tuft`, `meadow.slant`, `canopy.gap` and
`canopy.through` gone: the grating meadow and the lattice canopy they turned no longer exist. The
mass rests **at** the tan stop rather than two thirds up a ramp without one, which is what minting
the token was for. Both stills' fall to the foot became a band once a tile (`sceneAxis(y / height)`),
because a fall down a picture that never repeats is a bright line at every join. `streakAt` went
with the still fields, `streakTiled` being its only caller's replacement and the plain read having
none left. The meadow's ramp drops `--screen-red` and the canopy's drops `--drift-cool`, so the way
down each passes through what that field is made of. And the hue-travel case in
src/ui/moireScreen.test.ts now measures the blue the sky stop brings against the red the ramp is
warm with for four stops of five, the old case having been written against a ramp that opened at
`--drift-cool`. The review then found two more. `resolvedInk` (src/ui/moireCanvasPainted.ts) named
neither new stop, so every painted-canvas case would have measured the canopy's floor and the
meadow's mass as the recorder's own amber default — the third registry of scene stops, and the same
miss 0333 caught one token earlier. And the count a tile is divided into was being rounded twice:
`sceneCells` is the snap stated as a count in src/lib/moireScene.ts and `sceneRepeat` is now
`across / sceneCells(…)`, which is what makes the noise's `twist` exactly integral rather than
coincidentally so — the bloom's columns and the water's rows read it too, and the four occurrences
are one declaration. And it found the step's own gust: the standing gust was written as a lean that
varied across the picture, and a lean is snapped by `sceneSlope`, which is a **step function** —
so the rounding tipped column by column and cut a hard vertical break at every column where it
tipped, standing in the same place in every tile. The ruled grid the snapping exists to prevent,
moved off the join and into the middle of the picture. The gust is a smooth offset on x now and the
lean is one number for the tile; the review's own figure of a whole stop was measured on a mass that
spans the ramp and the shipped one spends a sixth of it, so the break was 0.28 of the ramp rather
than 0.43 — real, and cut by construction rather than by a bar. Two smaller ones went with it: a
seed was hashed on a cell as long as an awn, which drew it as a one-pixel scratch eighteen pixels
tall at the brightest stop the ramp has rather than as a point; and a canopy's speck could be
jittered further off its cell's centre than its own radius, so it overhung a neighbour that never
lights and was chopped along the boundary.

bench-15 landed on 2026-09-10 as [0335](decisions/0335-a-place-is-a-reach-and-a-shadow.md): the six
place words are grouped by reach and the twenty-four nouns by the four shapes of the shade they
cast, both banks flattened by `banked` as the adjectives are; `SCENE_REACH_TERMS` multiplies every
mark's period in all four grounds before each snaps it; and `standShade` (src/lib/moireStand.ts) is
one shadow spent over any scene. Five things moved off the step's own text. **The shade is spent
after the yard's own hue travel and not before it**, and its rest is 0.45 of the read rather than
the 0.72 it was drawn at: a shaded band sits at the foot of the ramp, the meadow's second stop is
the hot ink, and either the wrong order or a deeper rest swung the claim from the ramp's darkest
stop to its second — the travel repainting the field rather than sliding it, which
src/ui/moireScreen.test.ts already stood against. The bar is crossed just past 0.6, measured. The
reach scales a **mark's period** and a **shade's width**, which is not one rule stated twice: a
shadow has no spacing, so a far wall is a thinner band on the same field rather than the same band
drawn smaller — and it is what makes "a far shade is narrower than a close one" true of the grille
too, whose bars would otherwise scale with their own lattice and cover exactly as much. `sceneNear`
left src/ui/scene/water.ts for src/lib/moireScene.ts, the blades having gained a second caller in
the wall and the mass. The step's "two yards differing only in their noun lay down different tiles"
went to src/ui/moireCanvasScene.test.ts rather than src/ui/moireScreen.test.ts, which the case would
have pushed past the 800-line hard cap — that neighbour exists for exactly this (0045) and holds the
painter this step's key is read through. And the water's blades keep the size they were written at:
they are placed by hand rather than cut by a cosine, so there is no period on them for a reach to
multiply. The review then found four more. **A tile is not the picture**: `tilePx` rounds a tile up
to a whole beat cell, so the rack strip is 64 device pixels of a tile 210 tall and a wall placed two
thirds down that tile was a wall nobody ever saw — the roll that could carry it into view is nought
at rest (`bandTurns`). A stand's field is the tile snapped to what is shown of it (`standDown`), so
`SceneTerms` gains `seen` and the tile's key gains the canvas's own height; the cost is that two
canvases whose heights snapped to one tile now hold two, which is one warm-up painting in
src/ui/moireCanvasChain.test.ts where an index was counted off a cache they used to share. A close
flight of steps was falling 1.36 of a ramp that clamps at 1, so a flight of nine drew seven terraces
where the term said nine — the descent is floored, and the count is asserted at all three reaches
now rather than at the middle alone. `shapeOf` fell through to the terraces for a stand it did not
name, so a fifth stand would have drawn steps in silence; it refuses one instead, which is the same
check the scene registry runs and needed the dispatch read as a string to stay reachable. And the
meadow's gust was the one period snapped by `sceneRepeat` that the reach did not multiply. Three
more were refuted by measurement rather than argument: the four grounds hold on nought to one and
come round at both tile edges at every reach, not just the middle (src/ui/scene/scenes.test.ts walks
all three now); a far water's ripple snaps under two device pixels and the water is still black
under lit glints there, which is what that case now asserts at every reach; and the mass repeats
once a tile across, because a tile is one beat cell wide by construction — the same wrap the water's
blade bed is under (0333) — so the column is a colonnade at the strip's width and is left at that,
narrower than it was drawn. One known cost stands: the shade is multiplicative, so on a scene that
already rests at its first stop it shows only where that scene has light in it — a wall on water is
a band that comes and goes with the swell rather than one that crosses the whole field.

bench-16 landed on 2026-09-10 as
[0336](decisions/0336-the-air-falls-and-the-detail-is-the-bright-points.md): the air's joining word
is a spread and the detail is what the field's bright points are, both banks flattened by `banked`;
a wash mixes the ramp's stops toward the light's token as it always did and a fall mixes none of
them, sliding the read up the scene's own ramp instead; and every scene declares
`Scene.specks(x, y, terms)` beside its ground, drawn with the `speckTiled` the canopy's specks of
sky were already made of. Six things moved off the step's own text. **A fall's foot is the tile's
middle and not its bottom row**: the step said "from its top edge to nought at its foot", and a fall
stated down a picture that never repeats is a bright line at every join — the same thing 0334 found
for the meadow's and the canopy's own falls, so the fall is `sceneAxis(y / height)` like every other
band a tile carries. **A flock is drawn beside the ground rather than lifted out of it**: the step's
"the specks are the one shared term of a still that reads at the top stop" would have had the water's
glints leave its ground, and the water _is_ its glints — the ground keeps every bright point it has,
`own` reads nothing extra, and `Scene.specks` is what a name that says a creature adds. **A flock is
not seeded per yard.** "Hashed so no two yards' flocks agree" wants a seed off the name, and a tile
is keyed by what it is _of_ and never by whose it is (`screenOf`, and `TILE_CACHE` is spent across
the readings a page is showing): a seed per yard is a tile per yard. A flock is hashed apart from
the points its own ground places instead, so a bird is never one of the gaps it flies through, and
two yards read the same way share one tile as they always have. The canopy names a flock rarity of
its own, because `RARE` is the share of cells that could open _before_ the leaf is asked whether it
is thin enough, and tripling that filled a tenth of the tile with birds where the sky shows in a
handful of places. The two painter cases went to src/ui/moireCanvasScene.test.ts rather than
src/ui/moireScreen.test.ts for 0335's reason — that file stands eight lines under the 800-line hard
cap — and the kept speck is counted on a canvas exactly one beat cell tall, because a shorter strip
holds a fraction of a tile and the shade repeats inside it (`standDown`, 0335): one kept thing per
field the shade stands on, which on a rack strip is more than one island in the tile that is
written. And no number this step added is a tunable: a speck's size and rarity are constants beside
`SPARK` and `SPECK`, which are the constants the two scenes that already had specks state theirs as.
The next free decision number is 0337.

bench-17 landed on 2026-09-10 as
[0337](decisions/0337-a-reading-is-said-in-the-pictures-own-words.md): one table per bank in
src/lib/copyScene.ts, keyed by the contract's own readings, and `sceneReading` joining them in the
order the mint writes a name — "a wind, poppies, close, by a grille, a wash of dusk, a flock". Both
surfaces call that one function: the yard header says the field out loud beside the name and the
whole sentence on hover, and the tuning panel's Scene card is the one card in it with no slider.
Three things moved off the step's own text. **The wind is said too**: the step's example named five
readings of the seven and the sentence names all seven, because a wind is a reading like the rest
and a name's own adjective is the first thing it says. A reading that rests is said rather than
dropped — "a wash of daylight", "its own points" — for the reason the day and the scene's own
points are not banks a name can draw (0336): a sentence naming only what a name said out loud would
read as a picture with nothing in those places. And a word is the picture's rather than the bank's:
a yard named for a hedge reads "by a wall", four shadows being what the picture draws of
twenty-four nouns (0335), and `bloom` is said as "poppies". One known cost stands: `DriftTuning`
and `TuningFields` now take the yard's name, which is a required prop on a panel that had none —
the strip and the zoomed header both had it in hand, so nothing was threaded, but a fourth surface
wearing the panel will have to hold a name to open it. The review then found three more. The
hint over the card enumerated the sentence and left the wind out of it — the one reading the
sentence leads with — so a hand using the hint to check the reading was told there was no wind term
to check. `still` was said as "no wind" against a wind that leans nothing and sways 0.35, which
src/ui/moireScreen.ts calls "all but stands"; every word here is an amount now and the smallest of
them is a breath. And `useYardScene` was the third reading of a name in a render body: the strip
had memoized it since 0329 and the two new surfaces called `yardScene` raw, which is a triple loop
over the air bank and two walks of the place and detail banks on every tuning slider move — it left
src/ui/MoireStrip.tsx for src/ui/yardSceneRead.ts, because the panel that needed it is worn by the
strip and the import would have run in a circle. One finding was declined: the header says the
reading of a yard whose rack is empty and which therefore draws no picture at all, which is a
reading of the name and true of what will be drawn the moment anything runs — gating it would have
the deck's header read the rack's rows, which the strip owns and the header deliberately does not.
bench-18 landed on 2026-09-10 as
[0338](decisions/0338-a-gust-is-a-lean-per-strip-of-the-fill.md): the screen fill is cut into
`tunable("wind.strips")` vertical strips, each placing the one tile under the sway's own shear plus
one strip further on into a wave that comes round once across the picture, and `SCENE_WIND_TERMS`
gains `gust` — nought at the stillest wind, which is filled once as every frame was before this.
**The step stood on its own measurement.** Six interleaved `./scripts/profile` runs put the frame
mean at 8.215 / 8.252 / 8.268 ms base against 8.255 / 8.272 / 8.298 ms at eight strips, p95
10.3–10.4 either side and no long task on any run: thirty microseconds a frame, orders below a step
of the tint ladder, which bakes a picture-sized tile. **The knob's ceiling is that eight and not one
more**, because a group's own push drives every knob in it to its wild end and a ceiling above the
measurement is a gesture that spends a frame nobody timed — the step's own refusal, found by the
review reading `wild: "max"` against a `max` of sixteen. Five things moved off the step's own text.
**The fill left the caller**: `paintMoire` cannot hold a `fillRect` that has one lean in it and let
this file give the frame six, so `inkThrough` fills the rectangle now — the flat-ink path an engine
with no pattern draws included, or that engine's picture would have gone from one fill to none.
**The gust is bowed about the picture's middle and not its top row**: a shear carries a point by its
own depth, so two strips leaned differently read the tile a step apart at the boundary and that step
is widest wherever the pivot is furthest — anchored at the top it is a vertical break standing at
the foot of every picture, which is the artefact 0334's snapping exists to keep out. Pivoted at half
the height the neighbours agree across the middle and part by half as much at either edge; the break
does not go, and the strip count rather than the amplitude is what shrinks it, which is why the
count is the tunable. **And the swing is bounded by the tile and not by the wind alone**: the break
is measured in a beat cell and the picture is not always the same size, so the wildest wind that
parts two strips by a thirtieth of a cell on a 64-pixel rack strip parts them by most of one on a
full-bleed overlay — the review's own finding. The wave swings as far as the reading asks or as far
as `GUST_BREAK` of a beat cell allows, whichever is less, at the known cost that the biggest picture
leans a little less than the reading asked for. **A flock's specks do not ride the strip's phase.** The step said they come and
go with it; a speck's brightness is written into the tile and a strip is a transform over that one
tile, so a speck that lit and unlit per strip is a tile per strip — a picture-sized bake per frame,
which is the one thing 0070 and 0129 forbid outright. A flock is carried by the gust like everything
else the tile holds and is not lit by it. And **the two cases the step named for
src/ui/moireScreen.test.ts went to src/ui/moireCanvasScene.test.ts**, src/ui/moireScreen.test.ts
standing at the 800-line hard cap with no room for a case: the same move 0335 and 0336 made, and it
needed the painter's own recorder
(src/ui/moireCanvasPainted.ts) to keep every placement of the screen rather than the last, which it
could do because there is more than one now.
The next free decision number is 0339.

1.  **A scene is read along its own stops, per pixel, and the bloom is the poppies.** _(bench-12,
    landed 0332)_ **Durable shape moved: none.** A name is a reading and nothing about the reading
    is stored (0329).

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
    whole out of src/ui/moireScreen.ts (which landed as the whole tile, not the bake alone):
    `sceneStops` resolves the five stops and the light once a
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
      block keeps — until step 7, which keeps the one bake and spends a `fillStyle` and a `fillRect`
      per strip of the gust, measured before it was kept (0338).

2.  **The water is the glint.** _(bench-13, landed 0333)_ **Durable shape moved: none.**

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
    - **src/ui/sketch/SketchDrifts.test.tsx**: entry 10 is gone and 08 draws the shipped water.

    **Verification:** as step 1; the crop is judged at the ripple's own pitch, where the dash
    either reads as a glint or as woven cloth.

    **Refused:**
    - **A second tile and a second fill** (above).
    - **A scattered blade.** Placed, or two shots disagree.

3.  **The meadow is the seed heads and the canopy is the light through it.** _(bench-14, landed 0334)_ **Durable shape moved: none.**

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
    - **src/ui/sketch/SketchDrifts.test.tsx**: the last two stills are gone; `sketchStill.ts` and
      `sketchStillField.ts` go with them, and the bench's second introduction says nine.

    **Verification:** as step 1, and the crop at a tile join — the seam is the thing a whole-canvas
    view cannot show.

    **Refused:**
    - **A travelling gust** (step 7).
    - **The print** (0331).

4.  **The place reads: how close the frame stands, and what stands in the field.** _(bench-15,
    landed 0335)_
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
    _(bench-16, landed 0336)_ **Durable shape moved: none.**

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
    - Every scene but the bloom already has specks read near its top stop (`spark` in
      src/ui/scene/meadow.ts, `sky` in src/ui/scene/canopy.ts, `lit` in src/ui/scene/water.ts),
      which is what a detail lifts rather than invents (0334).
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
      then. It stands: a speck's brightness is written into the tile and a strip is a transform
      over that one tile, so a flock lit per strip is a tile per strip (0338).
    - **A sound for a bell.** The name reads into the picture and nothing else.

6.  **The reading is said on the yard.** _(bench-17, landed 0337)_ **Durable shape moved:
    none.**

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

7.  **The wind gusts.** _(bench-18, landed 0338)_ **Durable shape moved: none.** The step that may
    not stand — and stood.

    **The lean travels across the picture as a wave.** The meadow and the canopy carry a standing
    gust since 0334 — a lean that is a function of where a stroke stands, frozen at one phase
    (`GUST`, `GUSTED` in src/ui/scene/meadow.ts) — and 0331 said where the travel can and cannot go:
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

### Block: the scene is the body and the film is the shade

The four scenes stand on the bench at full strength and read as pictures: heads over stems, blades
in black water, seed heads against the light. In the app the same ground — the same function, the
same stops — reads as a pale comb with colour in the gaps. Measured on 2026-09-10 with a click
train playing and no rack: the strip's mean alpha over a white page is 0.227, the zoomed picture is
a vertical grating at the grid pitch with the poppies a stipple between its teeth, and the bench
draws the identical ground at alpha 1 with no grating over it. Nothing the scenes do is missing;
what is over them takes most of the picture. This block reverses the last block's one standing
premise — "the one thing this block changes about `build` is what colour a pixel is, never how much
of it the gratings cut" — and says instead: **the scene is the body of the picture, solid on its
surface, and the film is a shade laid over it and a cut the sound makes through it, each spending a
share a hand has seen and chosen.** Gestural and digital, as before: the moiré stays the
instrument's subject, and a field with no beat in it is a wallpaper. What changes is which of the
two is the figure and which is the ground.

Where the ink goes today, in the order the frame spends it (`paintMoire`, src/ui/moireCanvas.ts):

| Pass                                     | Where                                 | What it costs the scene                                                         |
| ---------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| the screen's own gratings, blob and band | `build`, src/ui/moireScreenTile.ts    | alpha × keep, held above `SCREEN_FLOOR` on average and nowhere else             |
| the rows' gratings, taken back out       | `cutField`, destination-out           | one minus their product: a window wherever the sound's gratings agree           |
| the feedback ghost                       | `feedFrame`, `DRIFT_FEEDBACK_CEILING` | the last frame laid under this one at up to half strength, blurring the field   |
| the strip's height                       | src/ui/MoireStrip.tsx, 32 CSS px      | a head is under a device pixel; the overlay pulls back rather than zooms (0109) |

**Layout, before the first step.** The share the film spends is one number, `tunable("film.share")`,
in a new **Film** group in src/lib/copyDriftGroups.ts (700 lines; the group is under twenty and the
cap is 800), read inside the bake so `tuneStamp()` already keys it — no second dial anywhere, and
no constant beside it that means the same thing. The bench entry that argues it is
`src/ui/sketch/drift/SketchDriftFilm.tsx`, entry 10, with its `@role` line and its row in
sketchEntries.ts, drawn through `SketchDriftStage` like the four scenes and reading `columnKeep`,
`rowKeep`, `blobKeep` and `bandKeep` from src/ui/moireScreenTile.ts rather than restating a
grating (principle 1). Every new case goes in src/ui/moireCanvasScene.test.ts (328 lines):
src/ui/moireScreen.test.ts stands at 799 and has no room for one, the same move 0335, 0336 and
0338 made. A shade is spent the way `standShade` spends one — a pull toward the scene's own first
stop, after the hue travel and before the air — because that is the one mechanism the tile already
has for darkening a pixel without spending its alpha (0335), and a second one is a second place a
colour can enter. Decision numbers from 0339; bench tags from bench-19.

The order is decided: **the dial first (landed 0339)**; the screen's shade next, because it is
the largest single spend and the one that turns a comb into a picture; the sound's cut after it, because it is the instrument's subject
and is re-aimed against what the shade left rather than against a white page; and the two sizes
last, because whether the strip needs anything of its own is only knowable once the overlay reads.

bench-19 landed on 2026-09-10 as
[0339](decisions/0339-the-films-share-is-one-dial.md): `tunable("film.share")` is declared beside
`SCREEN_FLOOR` in src/ui/moireScreenTile.ts, read once a tile in `build`, and eases the four keep
terms toward one over their product; entry 10 on the bench draws the shipped bloom under the
shipped film with the handle's own range, step and rest as its dial. **The rest is 0.15 and the
shots are why.** Two yards with a click train playing, the zoomed drift read twice at each of 1,
0.5, 0.35, 0.25, 0.15 and 0 with the settings interleaved: at one the bloom is the pale comb this
block was opened over, mean strip alpha 0.227, and it is still a comb at a half (0.287) and at a
quarter (0.319); at 0.15 the heads stand in scarlet over green with the beat crawling over them,
0.331 on the bloom and 0.332 on the canopy against 0.350 with the film off outright. The dial's
whole useful travel is in its bottom fifth, because four terms multiply. **And the strip's alpha
barely moves across the dial's top half**, which is the measurement the next two steps are
against: the screen's film is not what spends most of it — the rows' cut and the ghost are, and
0.350 at nought is the ceiling they leave. Two things moved off the step's own text. **The rest
is not one**: the step wrote the dial as resting at its shipped value and the shots argued a rest
that changes the app's own picture on the first step of the block, which is what "the number is
chosen by looking" asks for. **And the bench's dial is the app's handle**, not a `SketchDial`
written beside it: the range, the step and the rest are read off `FILM_SHARE`, so the bench opens
at the picture the app ships and the two cannot drift (principle 1).
The next free decision number is 0340.

1.  **The film's share is a dial, on the bench and in the app.** _(bench-19, landed 0339)_
    **Durable shape moved: none.** A tunable is a session preference and never durable (0329).

    **One number says how much of the picture the film may spend.** `tunable("film.share", 1, {
min: 0, max: 1, step: 0.05 })`, wild at `min`, in the Film group. At one the tile is exactly
    what 0332 bakes; at nought the film spends nothing and the tile is the scene solid, which is the
    bench's picture. Between, the four keep terms are eased toward one by the share:
    `1 - share * (1 - keep)`, applied once to their product in `build` and nowhere per term, so the
    beat between the gratings survives at every setting and only its depth moves. The rows' cut and
    the ghost are untouched by this step — the dial is the screen's and the measurement is of the
    screen alone.

    **The bench argues it under the dial.** Entry 10, "The Film": the shipped bloom under the
    shipped film, `columnKeep × rowKeep × blobKeep × bandKeep` at the bench's own pitch, composited
    over the page's ground as the app composites it — the dial is the share, and the readout says
    how much of the field's alpha stands. A picture with a dial is what a hand decides on; a number
    in a file is not (0247).

    **The number is chosen by looking and written down.** Three shots of the overlay with a
    click train playing, one per setting — nought, a half, one — on the bloom and on the canopy,
    the lightest and the darkest scene; `./scripts/drive --shot` for the strip and a headed
    Playwright for the overlay (the memory of shooting a grown run). The rest the dial lands at is
    the one the shots argue for, recorded in the step's decision with the shots' mean alphas, and
    it is the rest every later step in this block is measured against.

    **Stands on:** the tile's four keep terms and their product in `build`
    (src/ui/moireScreenTile.ts:554–562); `tuneStamp()` in the screen's key
    (src/ui/moireScreen.ts:188); the bench's stage and its dial (src/ui/sketch/SketchDriftStage.tsx,
    src/ui/sketch/sketchDrift.ts, `SCENE_DIAL`); the tuning panel's groups
    (src/lib/copyDriftGroups.ts, `MOIRE_TUNE_GROUPS`).

    **Outcome wanted:** the Tune button shows a Film group with one slider; dragging it from one to
    nought turns the zoomed drift from the comb into the bench's poppies with the beat still
    crawling over them; entry 10 on `#/sketch` shows the same thing under the same dial.

    **Tests that must fail first:** **src/ui/moireCanvasScene.test.ts**: through the recorder, a
    tile baked at share nought has the caller's own alpha at every pixel and a tile at share one is
    pixel-identical to today's; a tile at a half keeps more than a tile at one at every pixel the
    film cuts and the same at every pixel it does not. **src/ui/sketch/SketchDrifts.test.tsx**: the
    bench holds ten entries and the tenth names `film.share` in its build note.

    **Verification:** `./scripts/check` clean; the six shots; the chosen rest and its two mean
    alphas in the decision.

    **Refused:** a share per scene — the film is one film (0329); a share per term — four dials for
    one question is the water group's lesson (0333); a share that moves on the frame — a bake has no
    clock (0126).

2.  **The screen shades the field and no longer cuts a window in it.** _(bench-20)_ **Durable
    shape moved: none.** Amends 0332: the film stays what says how much of a pixel stands, but the
    screen's own gratings are no longer part of that — they are a shade.

    **What the screen spends, it spends as darkness and not as transparency.** The four keep terms
    leave the alpha and enter the read: after the hue travel and the stand's shade and before the
    air, `stood` is pulled toward the scene's first stop by `share × (1 - keep)`, exactly as
    `standShade` pulls it (src/ui/moireScreenTile.ts:570). The alpha is then the caller's own,
    `own[3]`, at every pixel of the tile — solid — and what the screen was doing to a white page
    it now does to the field: a canopy's grille is dark leaf between lit leaf, a bloom's comb is
    shade between heads, and the three channels' fringe stays where it is because it already
    multiplies colour and never alpha. The step 1 dial is the shade's depth from here on.

    **The floor is re-aimed at what it now guards.** `SCREEN_FLOOR` was the least of the tile's
    alpha the screen could leave; with the screen out of the alpha it is the least of the tile's
    lightness the shade may leave on average — the same number, the same test shape, asserted on
    the read rather than on the alpha, so a term pushed to its wild end still cannot turn a field
    into a grille. The saturation and fringe cases in src/ui/moireScreen.test.ts hold unchanged,
    the fringe never having been in the alpha.

    **The recorder reads it.** `resolvedInk` in src/ui/moireCanvasPainted.ts already resolves each
    stop to its own ink (0332); the cases below read a tile's pixels through it and never a mean of
    the canvas, because a shade and a cut can leave the same mean and are not the same picture.

    **Stands on:** the pixel loop (src/ui/moireScreenTile.ts:552–589) and the shade's own pull
    (src/lib/moireStand.ts, `standShade`, 0335); the floor and its case
    (src/ui/moireScreenTile.ts:86, src/ui/moireScreen.test.ts:321–332); 0332's own words, "the
    scene is the colour and the film is the alpha", which this step amends and does not repeal —
    the sound's film is still the alpha, step 3.

    **Outcome wanted:** the zoomed bloom with a click train playing reads as heads over stems with
    a comb of shade crawling over them; the canopy reads dark; the strip's mean alpha with no rack
    is the caller's own, and the beat is still visible in both as a lattice of light and shade.

    **Tests that must fail first:** **src/ui/moireCanvasScene.test.ts**: a tile's alpha is the
    caller's at every pixel whatever the share; at share one, a pixel under a grating's trough
    reads nearer the scene's first stop than the same pixel at share nought and the two are the
    same colour at a crest; the mean lightness of a tile at every scene stays above `SCREEN_FLOOR`
    with every Film and Grating knob at its wild end.

    **Verification:** as step 1, the same six shots against the same rest, judged at the 1:1 crop
    — a whole-canvas view of a fine pattern is the thing that lies (drive's own note).

    **Refused:** taking the beat out — the blob is what the two gratings make together and it
    stays, as shade (0131); a shade toward black or toward the page — the pull is toward the
    scene's own dark stop, which is what keeps a canopy a canopy and a meadow a meadow (0335).

3.  **The sound's cut is aimed at the field, and the ghost stands behind it.** _(bench-21)_
    **Durable shape moved: none.**

    **The rows keep cutting, because the rows are the instrument.** `cutField` still takes one
    minus the rows' product out of the picture with destination-out — a row is a grating and the
    picture is their product (0131) — but the product was balanced against a screen that already
    took a third of the page, and it is now over a solid field. `grating.floor`'s rest is
    re-chosen by the same six shots against step 1's rest, and `DRIFT_FEEDBACK_CEILING` with it:
    a ghost that was a ghost of a comb is now a ghost of a field, and half the ink laid twice is a
    blur across every head. Both stay the tunables they are; what moves is where each rests, and
    the decision carries the before-and-after mean alphas of the strip and the overlay.

    **A rack of six is the case.** A bare deck draws few rows; a grown run draws a dozen
    at several octaves each, and the product of a dozen gratings over a field is nothing left of
    the field — which is the block's whole question, asked at its worst. `./scripts/drive` on the
    drift smoke's own rack (scripts/smoke.d/drift.js, `LATTICE_IDS`, `SWAY_ID`, `SHARD_ID`), shot
    at the overlay, headed; if the field does not read under six, the floor is what moves and not
    the count, because a row that cuts nothing is a row nobody hears.

    **Stands on:** the cut and the ghost (src/ui/moireCanvas.ts:585–603, `feedFrame`,
    `DRIFT_FEEDBACK_CEILING` in src/lib/moire.ts:518); `grating.floor` and its wild end
    (src/lib/copyDriftGroups.ts:42); `drawnGratings` (src/ui/moireCanvas.ts:264), which is what
    holds the picture's weight as rows come and go (0244).

    **Outcome wanted:** the six-yard rack's overlay reads as six fields under six moirés rather
    than six moirés; a yard with nothing loaded is the field solid, as it is today a blank.

    **Tests that must fail first:** **src/ui/moireCanvas.test.ts** (770 lines; a case over its
    cap goes to src/ui/moireCanvasScene.test.ts): the field's product under a dozen rows at rest
    leaves at least the floor's share of the ink standing, measured off the recorder; the ghost's
    alpha at full feedback is the new ceiling.

    **Verification:** `./scripts/profile` interleaved before and after, because a change to the
    floor is a change to how many rows count and the walk's cadence reads off that
    (`looksPaintMs`); the shots; the rack.

    **Refused:** dropping the cut for a shade — a moiré that does not cut is not a moiré, and the
    step 2 shade is the screen's and not the rows' (0131); a floor per scene (0329).

4.  **The overlay is the field and the strip is its film.** _(bench-22)_ **Durable shape moved:
    none.** The step that may not stand, and the one that says which of two decisions holds.

    **A head is under a pixel on the strip and a bench's-worth on the overlay.** The bench draws
    a scene at 110 device pixels of field and it reads; the strip is 32 CSS pixels and the overlay
    is the viewport, and 0109 says they are one picture at two sizes, the overlay pulled back
    rather than zoomed in. Under steps 1–3 the overlay already reads: `seen` (src/lib/moireScene.ts)
    is the canvas's own height, so the reach's period and the stand's size are read at the
    overlay's scale and the field is the bench's. The question is the strip. Three shots of it —
    no rack, the click train, the six-yard rack — at 1:1. If a strip at the chosen rest reads as a
    band of the field's colour with a beat crawling over it, the step lands as a measurement and
    0109 stands. If it reads as noise, the strip reads the scene at the overlay's `seen` and not
    its own — one number in the terms, so the marks the overlay shows are the marks the strip cuts
    across — and 0109 is amended to say the two sizes share their marks and not their cycles.

    **Stands on:** `seen` and the tile key that carries the canvas's height
    (src/ui/moireScreen.ts:174–188); the strip's size (src/ui/MoireStrip.tsx:731); 0109 and 0098.

    **Outcome wanted:** the strip on the rack reads as which field the yard stands in — a hand
    can tell a bloom from a canopy from a water at a glance without opening either.

    **Tests that must fail first:** none if 0109 stands; if it is amended,
    **src/ui/moireCanvasScene.test.ts**: two canvases of different heights on one yard bake tiles
    whose marks stand at the same period.

    **Verification:** the three strip shots, and the drift smoke (scripts/smoke.d/drift.js) still
    green — it counts shades and asserts the strip has drawn.

    **Refused:** a second picture for the strip — one picture at two sizes is the reading and a
    strip drawn from its own set is two frame loops for one yard (0070, 0139); a strip taller than
    it is — the rack's height is the rack's (0045).

---

## 4. Not taken

**The film's share does not rest at one (bench-19, 0339).** The step wrote the dial as
`tunable("film.share", 1, …)`, which would have landed the first step of the block with the app's
picture unchanged. The shots argued otherwise: at one, and at a half, and at a quarter, the zoomed
bloom is the pale comb the block was opened over, and only at 0.15 do the heads stand in their own
colour — so the rest is 0.15 and the app's picture changed on the first step. Two costs are known
and kept. The screen's four terms now spend a sixth of what they were argued at, until the next
step moves them out of the alpha and into the read where their depth is a shade rather than a
hole; and the strip's mean alpha moves by two hundredths across the dial's whole top half, because
the rows' cut and the ghost — untouched here — are what spend most of it. **And `SCREEN_FLOOR` is slack for one step.** The two cases that read the floor off the painted
tile (src/ui/moireScreen.test.ts:634, :739) now measure `1 - share * (1 - keep)`, which at a rest
of 0.15 is above 0.85 whatever the terms do; the case that multiplies the terms directly (:332)
still bounds them, and the file stands at 799 of its 800 lines with no room to re-aim the other
two. Step 2 re-aims the floor at the read, which is where it is repaired. A share per term and a
share per scene were refused by the step and stay refused.
