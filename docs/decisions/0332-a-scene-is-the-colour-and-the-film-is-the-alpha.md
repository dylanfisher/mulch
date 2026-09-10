# 0332 — A scene is the colour and the film is the alpha

- **Date:** 2026-09-09
- **Status:** accepted, amending
  [0329](0329-a-yards-picture-is-a-scene-its-name-names.md)'s scene contract and landing the first
  of [0331](0331-a-still-is-read-along-its-own-stops-per-pixel.md)'s four stills

**A ground answers where on the ramp a pixel is read, not how much of the tile's alpha it takes.**
`Scene.ground` (src/lib/moireScene.ts) returns nought to one on the scene's own five stops, read
**per pixel** in the tile's own loop (`build`, src/ui/moireScreenTile.ts). `depth` and `rest` are
gone: a ground that says where it rests needs neither, and the alpha is the film's alone — the
gratings, the beat, the blob and the band. That is what lets a canopy go as dark as its stops allow
without spending anything against `SCREEN_FLOOR`, and it is why every scene now keeps exactly the
share of the picture's ink a meadow does.

**A scene names all five stops and none of them is the caller's ink.** `SCENE_RAMP_INK` and the
registry's caller's-ink refusal go. A ramp read per pixel spends its whole length inside one tile,
so a stop that flipped with whatever token a surface resolved would flip the middle of every picture
with it. A scene that wants the yard's own ink names the token the surface resolves it from, which
is `--primary` — registered as a `<color>` in src/ui/tokens.css like every other stop the painter
reads, because an unregistered property arrives at the canvas as `light-dark(…)` text that
`fillStyle` drops without a word. No colour is minted (0236).

**A claim moves the read by one stop, not by the whole ramp.** `SCENE_HUE_REACH` is a half, so the
travel's own half either side of `DRIFT_REST.hue` carries the field a quarter of a ramp of five. It
was a whole ramp when a scene was read once a tile and the read was the picture's only colour; a
field that is already two hues at full strength has one stop of travel to spend and not four.

**`ramp` fills the ink it is handed.** It is read width × height times on a rebuild now rather than
once, and a build allocates a ramp and no more ([0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md),
[0070](0070-a-per-frame-read-refills-and-never-clears.md)). Every caller keeps one ink and refills it.

**The tile left `moireScreen.ts` whole.** src/ui/moireScreenTile.ts is what a tile is made of and
the one pass that writes it; src/ui/moireScreen.ts is where a tile is put and what moves it. The
split runs one way — the tile knows nothing of the pattern or the transform — which is what a split
at the cap has to be to avoid a cycle between the two halves of one picture (0045).

**The bloom is the poppies, and the still went with it.** `poppiesField` is now the bloom's ground
(src/ui/scene/bloom.ts) with its four numbers as `bloom.far`, `bloom.near`, `bloom.head` and
`bloom.stroke`; the hash it scatters heads by is src/lib/moireNoise.ts, beside the grain. The
perspective is one tile deep and comes round at its foot: the columns are snapped by `sceneRepeat`,
the rows stretched onto a whole number of them, and the head a hash places is looked up on the
wrapped index — the same constraint `sceneRepeat` is written under, one step on, because a hash
places these rather than a cosine. The bob is refused: the bake has no clock (0126), and the print
stays on the bench because a meadow has no lens (0331).

**The bench draws each scene through its own stops.** Entry 07 is the shipped bloom in the shipped
colours, so the four scene stages read `sceneOf(name).ramp` rather than the two-stop inking every
geometry direction shares. A chip class is a literal per token — Tailwind reads source as text, and
a class assembled at runtime is a class it never generates.
