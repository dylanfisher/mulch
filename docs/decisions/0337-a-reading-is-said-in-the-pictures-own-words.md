# 0337 — A reading is said in the picture's own words

- **Date:** 2026-09-10
- **Status:** accepted, landing the sixth step of the block that reads a yard's whole name into the
  picture, over [0336](0336-the-air-falls-and-the-detail-is-the-bright-points.md)

**Every reading has one word, and the word is the picture's rather than the name's.**
`src/lib/copyScene.ts` holds one table per bank — wind, scene, reach, stand, spread, light, specks
— each keyed by the contract's own reading (src/lib/moireScene.ts), so a reading added to a
contract list is a table entry the type demands and never a phrase nobody wrote. The word says
what the tile holds: a name drawn for a hedge reads "by a wall", because a wall is the shade the
picture draws of it (0335), and `bloom` is said as "poppies", because "bloom" is the entry's name
and poppies are what is on the screen. `sceneReading` joins them in the order the mint writes a
name, and both surfaces that say it — the yard header's hover and the tuning panel's Scene card —
call that one function.

**A reading is said, never offered.** The name is the only thing that sets it (0329), so the Scene
card is the one card in the tuning panel with no slider in it, and nothing here is a command, a
durable field or session state: it is a view preference in the sense plan §2 means, which is to
say it is nothing at all — the sentence is derived on the render from the name the surface was
already handed.

**No reading is dropped for resting.** A name that says no air is drawn in daylight and a name
that says no detail is drawn with the field's own points, and the sentence says both. A sentence
that named only what a name said out loud would read as a picture with nothing in those places,
which is the opposite of what is drawn (principle 5).
