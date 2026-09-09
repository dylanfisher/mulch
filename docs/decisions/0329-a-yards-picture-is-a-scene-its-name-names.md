# 0329 — A yard's picture is a scene its name names

**2026-09-09.** The drift picture is a field, and which field is read off the yard's own name.
`yardScene` (`src/lib/yardScene.ts`) takes a name and answers with three readings: the **plant**
names the scene, one of `meadow`, `bloom`, `water` and `canopy`; the **air** names the light, one of
`dusk`, `moon`, `frost`, `rain`, `sun`, and a name with no air reads as `day`; the **adjective**
names the wind, one of `still`, `quiet`, `breeze`, `windy`, `wild`. A table per bank and never a
hash: a hand can predict what "Windy Reed past the Water Butt in Falling Dusk" looks like before it
is added.

**Nothing is stored, and nothing needs to be.** A name is already durable text minted once at
`deck.add` (0057, 0317), so the reading is a function of it — two tabs on one session draw the same
scene and a restore draws it again, which is what a picture resting on a reading buys (0145). There
is no rename, so a yard's field is fixed at its birth.

**The first match wins, because the mint's order is the reading's order.** A name opens with its
adjective and its plant, and the banks after them are not disjoint from those two: "beside the Old
Wall" carries an adjective and "by the Ivy Arch" a plant. Taking the last match would let a place
noun rename the field. A string the banks do not know at all — durable text may be any (0026) —
reads as `YARD_SCENE_REST`, a named rest and not a silent fallback.

**A scene is a ground and a ramp; the film is everything else.** The contract is
`src/lib/moireScene.ts` and each scene is one file under `src/ui/scene/`, refused at load by
`src/ui/scene/scenes.ts` the way the registry refuses a look (0122). A scene declares five stops
— token names, never colours (0130, 0236) — with the caller's own resolved ink at the middle; where
on them it rests; how much of the tile's alpha its ground may take; and the ground itself, a
function of a device pixel. `build` in `src/ui/moireScreen.ts` multiplies that ground into the
tile's alpha beside the blob lattice and reads the row's ink along the scene's ramp at
`sceneHue`. The gratings, the beat they make, the three channels a lag apart and the rolling band
stay exactly where they were: they are the terms every scene reads, so a parameter that moved the
screen still moves the scene, and every row still cuts one grating out of what the tile lays down.

**A ground comes round at the tile's edges, and that is a constraint rather than a choice.** The
tile is laid down as a repeating pattern, so every mark in it is snapped onto the tile's own size:
`sceneRepeat` puts a whole number of a mark's repeats across the tile and `sceneSlope` leans it by a
whole number of them down it. A ground stated in absolute pixels — which is how a hand tunes one —
would step by a fraction of a mark at every join, which is a ruled grid across the whole picture at
full amplitude, once a tile: the artefact `beatPx` and `tilePx` are written to avoid, arriving by a
different door.

**A tunable read inside the bake is in the key, as a counter.** Every number a scene declares is a
`tunable` argued on the drift bench, and every one of them is read inside `build` — the first
numbers in this picture that are both. A tile is held by what it is of, so a slider that moved one
would otherwise be answered out of the cache and be inert everywhere but the bench, and a revisited
key would hand back a tile baked under the value before the move. `moireScreen.ts` keeps a count of
how many times any tuning has moved, clears its tiles when one does, and writes that count into the
key. A count and not the values, because the key is written on the frame path and reading a dozen
handles there would allocate (0070).

**The wind is two amplitudes and no rate.** The screen carries no clock and every motion in it rides
a row's phase (0126), so "how far the field leans and how fast it recovers" is a `lean` baked into
the ground on the rebuild — what leans in a field is the field, not the light on it — and a `sway`
scaling the screen's own shear and breath on the frame.

`sceneAxis` is `latticeAxis` lifted out of `moireScreen.ts` when the scenes became its second
caller: one half-cosine for the film's blobs and channel fringes and for every ground cut through
them, so the two cannot disagree about what a soft crest is.

**The meadow rests on the caller's own ink and the other three do not.** That is what makes a bloom
warm and a water dark before either has played a note, and it is why the film's own cases paint
through the meadow: at its rest the picture is exactly the one the instrument drew before it had
scenes (0141, 0301).

**Durable shape moved: none.** Every name already minted stays the name it is, and no session field
is added.
