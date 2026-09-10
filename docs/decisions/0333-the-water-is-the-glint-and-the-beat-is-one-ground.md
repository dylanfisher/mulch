# 0333 — The water is the glint, and the beat is one ground

- **Date:** 2026-09-09
- **Status:** accepted, landing the second of
  [0331](0331-a-still-is-read-along-its-own-stops-per-pixel.md)'s four stills under
  [0332](0332-a-scene-is-the-colour-and-the-film-is-the-alpha.md)'s contract

**The beat is one ground and never a second tile.** 0331 costed the glint as a second full-canvas
pattern and a second fill a frame, which [0070](0070-a-per-frame-read-refills-and-never-clears.md)
forbids. It is refused: a
ground is a function of a pixel, so both lattices — the ripple's pitch and the one it beats against
— are computed inside `water.ground` (src/ui/scene/water.ts) and the beat is baked with the tile.
Nothing flickers on the frame from the water's own side; what flickers is the film's gratings
crawling and breathing over a standing beat, which is the instrument's own subject read at the scale
of a ripple. Both pitches are snapped onto the tile separately (`sceneRepeat`), so a hand that drags
them onto one number, or onto two that snap to one period, has a grating and no beat. That is the
one state this ground has nothing to say at, and it is stated in the Beat row's own words rather
than refused — but only a hand may reach it. **The second pitch names no wild end**, because the
group's own push drives every driven row the same way and both pitches are wildest at their floor:
a push would have converged them on its whole travel, which is a single control whose entire journey
is "remove the subject". A row with no wild end is one a push leaves alone, and this is what that is
for.

**A hand-placed mark comes round by wrapping, not by fitting.** The ten blades are kept exactly as
they were written for the still, in device pixels, and the tile reaches them through the shortest
signed offset on each axis (`near`, on a period `sceneRepeat` snapped from the frame they were drawn
in). A blade at one edge of the tile therefore reaches across to the other, and a tile narrower than
that frame holds the whole bed at once rather than losing the blades that fall outside it. This is
the general answer for any ground whose marks are placed by hand rather than by a cosine: `sceneRepeat`
says what the period is, and wrapping the delta is what makes the mark obey it.

**A darker water is one token, and that door opens once per stop.** `--scene-water-black` is minted
in src/ui/tokens.css and registered as a `<color>` beside the rest. The deepest ink this instrument
held was `--scene-water-deep` at a lightness of 0.42 and the picture is near black, so the ramp gets
a floor under its old one rather than the picture being lifted to meet it — the water's ramp is
black, deep, blue, blade, lit. Minting is the layout paragraph's one door and this is the first
scene to walk through it (0236): a colour still enters the app in exactly one file.

**A still leaves the bench when its scene lands.** Entry 10 and `glintField` are gone, and the four
scene stages draw the shipped water at 08 in the shipped colours. A still exists to argue a field
the painter does not have; once the field ships, two entries of one picture are two places to keep
in step and one of them is not what runs.
