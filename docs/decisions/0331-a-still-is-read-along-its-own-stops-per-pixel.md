# 0331 — A still is read along its own stops, per pixel

- **Date:** 2026-09-09
- **Status:** accepted, amending
  [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md)'s "six surfaces
  distinguished by geometry and density and not by colour" for the drift bench only, and answering
  [0329](0329-a-yards-picture-is-a-scene-its-name-names.md), whose four grounds landed and read as
  too quiet

0329 gave a yard's picture a scene, and the verdict was **subtle** — for two reasons, both in
`build` (src/ui/moireScreen.ts): a ground is multiplied into the tile's alpha at a `depth` around
0.15, so it moves a sixth of how solid the picture is and nothing else, and the five stops are read
**once a tile** at `sceneHue`, so one tile is one colour. A field that is one colour at a sixth
strength is a texture.

**Four film stills stand on the bench, each read along five stops of its own, per pixel.** A poppy
field, rippled water, backlit seed heads and a canopy from under it — `poppies`, `glint`,
`seedheads` and `skylight` in `SKETCH_DRIFTS`, fields in `src/ui/sketch/sketchStillField.ts`, stops
and dials in `src/ui/sketch/sketchStill.ts`. Each answers **where on its own ramp a pixel is read**
rather than how much ink stands there: a head is scarlet and the ground between two heads is green
inside one tile. The stage already painted `ramp(stops, field(x, y))`, so an inking may now be a
picture's own list of stops rather than one of the two shared names, and nothing else moved.

**The bench may spend colour on a scene, and only on a scene.** `SketchDrifts.test.tsx` said exactly
one entry read through the five-stop ramp, which was right for a bench arguing one move at a time on
a one-hue instrument. It now says the reference ramp is the Ramp's alone and a picture drawn along
stops of its own holds those stops alone — walked over every entry, not over the four names. The
rule that mattered survives, because a still's palette **is** its move.

**A still names all five stops; none is the caller's ink.** A shipped scene's middle stop is `null`
and resolves to whatever ink its caller had; a bench picture has no caller, and drawing that stop as
the box's foreground would flip the middle of every ramp with the scheme. Every stop is an existing
token of `src/ui/tokens.css` in an order no scene declares, so nothing crosses the colour boundary
([0236](0236-the-colour-boundary-is-a-gate-rule.md)).

**A still with no pitch is drawn with noise, not gratings.** A mass of grass and a wall of leaf have
no spacing in them, and every attempt to cross gratings into one drew a comb, a beaded string or a
herringbone — `streakAt` (`src/ui/sketch/sketchStill.ts`) is four hashed corners smoothed between,
on a cell longer one way than the other. The poppies and the glint stay on gratings: a lattice of
heads and a ripple do have a pitch.

**A stop a picture must not reach is a stop it must not hold**, and a mass belongs where its colour
is, not at a stop. The seed heads' tan is a mix of two stops and sits two thirds up the ramp; the
same field carrying `--screen-green` for a draft came out as flames, a smooth field crossing a
saturated ink spending a wide band of itself being it.

**The print belongs to the film, not to the field.** All four are drawn through one `printed` — a
vignette and a deterministic grain, laid on the ramp position rather than on the finished pixel. It
is the one term here that would **not** land in `build` with the rest: a meadow has no lens. Both
are kept shallow, because a vignette scales a ramp position and so costs a picture whose mass sits
high several times what it costs one resting near its floor.

**Each entry says where it lands and what it costs, and the four costs differ.** The poppies move the
ramp read into the pixel loop; the glint is a second tile and a second full-canvas fill; the seed
heads are a noise ground baked and a gust that has to cut the screen fill into strips; the canopy
light is a ground deepened toward `SCREEN_FLOOR` against a case nothing paints yet. None is wired,
and the directory still goes when one wins (0247).
