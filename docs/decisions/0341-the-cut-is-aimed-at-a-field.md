# 0341 — The cut is aimed at a field, and the ghost stands behind it

- **Date:** 2026-09-10
- **Status:** accepted, standing on
  [0340](0340-the-screen-is-a-shade-and-not-a-window.md) and
  [0339](0339-the-films-share-is-one-dial.md)

**Two numbers move and nothing else does.** `grating.floor` rests at **0.1** where it rested at
0.3 (`PICTURE_FLOOR`, src/lib/moireGrating.ts) and `DRIFT_FEEDBACK_CEILING` is **0.25** where it
was 0.5 (src/lib/moire.ts). `cutField` still takes one minus the rows' product out of the picture
with destination-out — a moiré that does not cut is not a moiré (0131) — and the ghost is still
laid a little larger and a little turned. What changed is what both are aimed at: since 0340 the
tile under them is solid at every pixel, so the rows' cut is the only thing left spending the
picture's alpha and the ghost doubles a field rather than a comb.

**The floor is a tenth because the window is cut in a field now.** Three tenths was balanced
against a screen that was itself mostly window — a third of the page gone before the rows took
anything — so a third taken out again read as a haze rather than as holes. At a tenth the same
count of rows cuts _deeper_ per grating, `gratingDepth` solving for the product, so the beat is
harder and what it removes is a sparse moiré of holes with the field standing between them.

**The ghost is a quarter because half of a solid field is a blur.** Half of a comb laid back
over itself, turned and enlarged, is a spiral of its own fringes; half of a scene is a smear
across every head in it. A quarter still spirals and no longer smears. The ceiling stays a hard
ceiling and not a tuning: what 0143 bounds is unchanged, only where it is set.

**The shots, interleaved, on the drift smoke's own rack of six.** A bloom yard (Quiet Foxglove by
the Shed) with a four-a-second click train playing, an automator holding a grown run, a full-wet
reverb, an eq, a panner, a sway at full mix and a second automator tearing the first's tear —
base and head alternated, each fixture read twice:

| fixture                                               | base  | base  | head  | head  |
| ----------------------------------------------------- | ----- | ----- | ----- | ----- |
| the strip, `./scripts/drive --shot`                   | 0.389 | 0.389 | 0.665 | 0.665 |
| the zoomed drift, headed Playwright on the dev server | 0.457 | 0.458 | 0.729 | 0.721 |

Every pair agrees to the digit. At the 1:1 crop the base is a pale blurred lattice with the scene
only guessable behind it; the head is scarlet heads over green stems with the beat crawling over
them. The dial was swept across its whole travel on the same fixture before the rest was chosen —
0.05 (0.830), 0.1 (0.726), 0.15 (0.648), 0.3 (0.458), 0.55 (0.253), 0.8 (0.130) — and a tenth is
the setting where the field reads and the beat is still a beat: at 0.05 the moiré has almost
nothing left to cut and the picture is a wallpaper. The ceiling was read at 0.5, 0.25 and 0.15
against the chosen floor (0.726, 0.732, 0.729): a quarter and an eighth read the same at the
crop, and a quarter is taken because the ghost is the instrument's and should be seen.

**A pair and a trio saturate, and that is the known cost.** `gratingDepth` never cuts past a
grating's own trough: below a floor of a quarter a pair cannot reach the floor even at depth one,
and below an eighth a trio cannot either. At a tenth a pair leaves 0.25 of the ink as window and a
trio 0.125, where the floor asks for 0.1; a quartet solves to a depth of 0.875 and reaches it
exactly, so the two counts are the whole of it. So the count says a little about the picture's
weight again, at two rows and at three, and in the safe direction — a sparse yard is _lighter_ than a full one, never darker, which is the
failure 0129 and `gratingDepth` exist to prevent. `moire.test.ts` asserts the identity where the
depth is under one and the saturation where it is not.

**Two readings are not comparable across decisions, and one pairing has parted.** 0340's 0.350
is a bare meadow's strip with no rack; the base column above is a bloom under a rack of six, so
the two numbers are of different pictures and only the interleaved pair is a comparison. And
`SHATTER_CEILING` (src/lib/moireGeometry.ts, 0250) was bounded "at the number the frame
feedback's happens to be": it stays at a half and the two have parted, which its own docstring
now says.

**The profile is flat**, interleaved base/head/base/head: frame mean 8.28, 8.18, 8.19, 8.29 ms and
p95 10.1, 10.2, 10.4, 10.4 — no cadence in it, the floor changing the depth of a cut and not the
number of draws.
