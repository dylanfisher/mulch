# 0331 — A still is read along its own stops, per pixel

- **Date:** 2026-09-09
- **Status:** accepted, amending
  [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md)'s "six surfaces
  distinguished by geometry and density and not by colour" for the drift bench only, and answering
  [0329](0329-a-yards-picture-is-a-scene-its-name-names.md), whose four grounds landed and read as
  too quiet

0329 gave a yard's picture a scene, and the verdict on it was **subtle**. It is subtle for two
reasons, and both are in `build` (src/ui/moireScreen.ts): a scene's ground is multiplied into the
tile's alpha at a `depth` around 0.15, so it moves a sixth of how solid the picture is and nothing
else; and the scene's five stops are read **once a tile**, at `sceneHue`, so however many hues the
ramp holds, one tile is one colour. A field that is one colour at a sixth strength is a texture.

**Four film stills stand on the bench, each read along five stops of its own, per pixel.** A poppy
field, rippled water, backlit seed heads and a canopy from under it — `poppies`, `glint`,
`seedheads` and `skylight` in `SKETCH_DRIFTS`, fields in `src/ui/sketch/sketchStillField.ts`,
stops and dials in `src/ui/sketch/sketchStill.ts`. Each field answers **where on its own ramp a
pixel is read** rather than how much ink stands there, which is the whole move: a head is scarlet
and the ground between two heads is green inside one tile. The stage already painted `ramp(stops, field(x, y))`, so the bench needed one change and not a
rewrite — an inking may now be a picture's own list of stops rather than one of the two shared
names.

**The bench may spend colour on a scene, and only on a scene.** `SketchDrifts.test.tsx` said exactly
one entry read through the five-stop ramp, and that was right for a bench arguing one move at a time
on a one-hue instrument. It now says two things: the reference ramp is still read by the Ramp and by
nothing else, and each of the four stills is read along its own five, no two lists alike. The rule
that mattered — nobody argues about the palette instead of the move — survives, because a still's
palette **is** its move.

**A still names all five stops; none of them is the caller's ink.** A shipped scene's middle stop is
`null` and resolves to whatever ink its caller had. A bench picture has no caller, and drawing that
stop as the box's own foreground would flip the middle of every ramp with the scheme. Every stop is
an existing token of `src/ui/tokens.css` in an order no scene declares, so nothing here crosses the
colour boundary ([0236](0236-the-colour-boundary-is-a-gate-rule.md)) and none of the four is
`src/ui/scene/`'s palette wearing a new name.

**The print belongs to the film, not to the field.** All four are drawn through one `printed` — a
vignette and a deterministic grain, laid on the ramp position rather than on the finished pixel, so
an underexposed corner goes warm rather than merely dark. It is the one term of these pictures that
would **not** land in `build` with the rest of them: a meadow does not have a lens.

**Each entry says where it lands and what it costs, and the four costs are different.** The poppies
move the ramp read into the pixel loop (bake-side; `sceneStops` still runs once a tile, the read runs
`width × height` times). The glint is a second bake drawn over the first at the row's own phase
(frame-side; one `drawImage`). The seed heads make `sway` spatial as a shear gradient over slices
(frame-side; the lean stops being baked). The canopy light is a ground at a depth near
`SCREEN_FLOOR`, which is asserted (bake-side; either that floor moves or a film term gives way).
None of them is wired, and the directory still goes when one wins (0247).
