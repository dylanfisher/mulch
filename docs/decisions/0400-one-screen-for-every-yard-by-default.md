# 0400 — One screen for every yard by default, and each yard's scene behind a switch

- **Date:** 2026-09-22
- **Status:** accepted, amending [0329](0329-a-yards-picture-is-a-scene-its-name-names.md) (a yard's name picks
  its scene) so that it applies only under the scenes look, revisiting
  [0339](0339-the-films-share-is-one-dial.md)'s share for one field, and following
  [0397](0397-the-picture-has-a-switch-and-off-is-not-mounted.md) for the shape of a switch.

**The drift has two looks, and uniform is the default.** Under uniform, every yard draws the plain
screen whatever its name reads (`YARD_SCENE_UNIFORM`, handed out by `usePictureScene`,
src/ui/yardSceneRead.ts). Under scenes, each yard draws the place its name reads, as it did before.
The choice is a view preference under `mulch:drift-look`, like the drift's own switch
(src/ui/driftLook.ts): it sends no command and leaves no history entry. Each yard still moves by its
own lanes, rack and wind under either look: the screen is handed with the yard's own wind laid over
it (`yardSceneUniform`, src/lib/yardScene.ts), and the wind's sway and gust are terms on the tile's
transform. Only what the field is, and the colour baked into it, changes.

**The screen is a fifth scene, not a second painter.** src/lib/scene/plain.ts is a flat ground on
a neutral five-grey ramp, with no specks and no stand. Every scene now declares three facts rather
than leaving them to a default: `film`, the share the film spends over it; `stands`, whether what a
yard stands by casts a shade on it; and `shared`, whether every yard in it shares one tile. No name
reads as the screen. A hand may still pick it for one yard under scenes.

**The screen spends the film at 0.8, not 0.15.** At 0.15 the column gaps, the scan lines, the beat
and the rolling band move no pixel a whole stop of the ramp, so they are not drawn at all. That is
why the 0126 screen had vanished. Under a place they are a shade over the field. With no field they
are the picture. The share tops out at 0.8 because at 0.9, with every grating knob at its wild end,
the screen keeps 0.58 of its lightness. That is under `SCREEN_FLOOR`, and past it the screen is a
grille (0340).

**A shared field bakes one tile for every yard.** The rack's fringe, split, hue, saturation, cells
and second lattice are each yard's own, so a shared field bakes none of them and its key names none
of them (`screenOf`, src/ui/moireScreen.ts). Nor does it bake the yard's wind: a shared field is
baked in the screen's one wind, whose lean on a flat ground is nothing. Seven yards on the uniform
look are one bake, not seven. **The cost:** under uniform, a rack's colour split, its hue travel and
its second lattice no longer reach the picture. The hue is a per-pixel offset baked into the tile
(0332), so a yard's own would be a tile of its own. Its rows, looks, crawl and wind still do. Under
scenes nothing is lost.

**Refused:** a uniform look drawn by a null yard threaded through every bake. The screen as a
registered scene keeps one painter, one registry and one key shape, and the sharing comes from the
key rather than from a second cache.
