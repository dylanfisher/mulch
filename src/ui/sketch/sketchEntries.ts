/**
 * @role The two lists the sketch bench mounts, and the shape of one entry: eight readings of when
 *   the ground shifts under a hand's gesture, and thirteen directions the drift picture could be
 *   pushed in. The argument lives here and the page that draws it lives next door — split off when
 *   the two together passed the file cap, because a list that grew by four entries is not a page
 *   that grew (docs/map.md).
 * @instead The page that mounts these, its nav and its two introductions →
 *   src/ui/sketch/SketchPage.tsx, and the frame one entry is drawn in →
 *   src/ui/sketch/SketchFrame.tsx. The pictures themselves → src/ui/sketch/ground/ and
 *   src/ui/sketch/drift/, and the fields they draw → src/ui/sketch/sketchDrift.ts and
 *   src/ui/sketch/sketchStillField.ts. None of them is wired to anything (0247).
 */

// The dependency count is the sketch count, for the reason the gallery's is: this file exists to
// name every sketch, and a barrel would trade a visible import list for an invisible one.
// oxlint-disable import/max-dependencies

import type { ReactNode } from "react";

import {
  PLAYER_BED_REACH_LABEL,
  PLAYER_BED_WANDERS_LABEL,
  PLAYER_BED_WAY_LABEL,
} from "@/lib/copyGround";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { SketchDriftBands } from "@/ui/sketch/drift/SketchDriftBands";
import { SketchDriftBlobs } from "@/ui/sketch/drift/SketchDriftBlobs";
import { SketchDriftGlint } from "@/ui/sketch/drift/SketchDriftGlint";
import { SketchDriftPoppies } from "@/ui/sketch/drift/SketchDriftPoppies";
import { SketchDriftRamp } from "@/ui/sketch/drift/SketchDriftRamp";
import {
  SketchDriftBloom,
  SketchDriftCanopy,
  SketchDriftMeadow,
  SketchDriftWater,
} from "@/ui/sketch/drift/SketchDriftScenes";
import { SketchDriftSeedHeads } from "@/ui/sketch/drift/SketchDriftSeedHeads";
import { SketchDriftSkylight } from "@/ui/sketch/drift/SketchDriftSkylight";
import { SketchDriftTerrace } from "@/ui/sketch/drift/SketchDriftTerrace";
import { SketchDriftTunnel } from "@/ui/sketch/drift/SketchDriftTunnel";
import { SketchGroundClock } from "@/ui/sketch/ground/SketchGroundClock";
import { SketchGroundCut } from "@/ui/sketch/ground/SketchGroundCut";
import { SketchGroundLadder } from "@/ui/sketch/ground/SketchGroundLadder";
import { SketchGroundLane } from "@/ui/sketch/ground/SketchGroundLane";
import { SketchGroundPips } from "@/ui/sketch/ground/SketchGroundPips";
import { SketchGroundQueue } from "@/ui/sketch/ground/SketchGroundQueue";
import { SketchGroundRing } from "@/ui/sketch/ground/SketchGroundRing";
import { SketchGroundThrow } from "@/ui/sketch/ground/SketchGroundThrow";
import { SKETCH_EVERY_SAID } from "@/ui/sketch/sketchGround";
// oxlint-enable import/max-dependencies

/**
 * One entry: the id is the nav's anchor, the heading's, and the attribute its own picture carries,
 * and the two sentences are the argument — written here so the argument cannot drift away from the
 * drawing that makes it. None of them is wired to anything (0247).
 */
export type SketchEntry = {
  id: string;
  label: string;
  thesis: string;
  trades: string;
  /** Where it would land in the real thing and what it costs there — the drift bench's third
   *  sentence, because its entries are directions to build and not surfaces to pick between. */
  built?: string;
  Content: () => ReactNode;
};

/**
 * Eight readings of one seam: a hand's gesture, and when the ground shifts and where to. `bedEvery`
 * is a period and `bedPer` counts it in jumps, parts or whole rounds of the song (0192,
 * src/lib/playerBed.ts) — and the unit a hand actually reasons in, every Nth time the walk finishes
 * its sequence, is in none of the three. Every one of these lights the ground the loop is standing
 * on, because a picture of a clock that never says what it moves is a picture of a clock.
 */
export const SKETCH_GROUNDS: readonly SketchEntry[] = [
  {
    id: "clock",
    label: "The Lap",
    thesis:
      "The walk's own sequence is the clock face: sixteen landings round a dial, the hand where the walk is standing, and the shift falling on every Nth time round. The period is laps, and the dial's number is how many.",
    trades:
      "the file. A clock says when the ground moves and nothing at all about where it goes, so the sample it is moving over is not on this picture.",
    Content: SketchGroundClock,
  },
  {
    id: "queue",
    label: "The Queue",
    thesis:
      "The source itself, with the next grounds queued ahead of the playhead and each carrying how many laps until it arrives. What comes next and when, which is the only form the period is ever felt in.",
    trades:
      "the odds. A queue is a list somebody wrote, so nothing that wanders — the Lean, the Home, a move that surprises you — has anywhere to be drawn.",
    Content: SketchGroundQueue,
  },
  {
    id: "ring",
    label: "The Ratchet",
    thesis:
      "The beds of the file as a ring the walk advances one notch on when the count is up. One number survives: how long a notch takes.",
    trades: `three rows of words. A notch is a whole ${PLAYER_KNOB_LABELS.bed}, so ${PLAYER_BED_REACH_LABEL}, ${PLAYER_BED_WAY_LABEL} and ${PLAYER_BED_WANDERS_LABEL} are all gone — and with them the crawl that lands part-way into a bed, which is the thing the fold exists for.`,
    Content: SketchGroundRing,
  },
  {
    id: "ladder",
    label: "The Ladder",
    thesis:
      "A rung per lap, newest at the foot, with the ground stepping across every Nth. Two whole periods on one picture, so the period reads as a rhythm rather than as a number.",
    trades:
      "the future. A ladder is a record of what has happened, and a hand asking when the next move lands has to count rungs to find out.",
    Content: SketchGroundLadder,
  },
  {
    id: "cut",
    label: "The Cut",
    thesis:
      "The beds as a deck and the period as the cut: a hand already knows what cutting a deck every so often means, and the count runs along under it.",
    trades:
      "the walk. A deck says nothing about what is playing over it, so the one thing being counted — a lap of the walk — is a number on this picture and never a shape.",
    Content: SketchGroundCut,
  },
  {
    id: "lane",
    label: "The Lane",
    thesis:
      "A lane of laps drawn over the walk's own strip, where a mark is a move and a stretch is a ground held. The two clocks on one picture, which is the only place the question is ever really asked.",
    trades:
      "the file again. A lane names the ground it holds but draws no sample under it, so which ground was worth holding is unanswerable here.",
    Content: SketchGroundLane,
  },
  {
    id: "throw",
    label: "The Throw",
    thesis: `The ground as a place a hand throws the loop to, with the throw landing at the next lap boundary rather than under the hand. The period stops being a number and becomes the lag between asking and arriving. The one gesture on this bench: ${SKETCH_EVERY_SAID.toLowerCase()}, so the wait is felt.`,
    trades:
      "the crawl. A throw lands on a whole bed, and part-way into one is precisely what the fold's own unit was chosen to reach.",
    Content: SketchGroundThrow,
  },
  {
    id: "pips",
    label: "The Count",
    thesis:
      "The count as the whole drawing: N pips filling one per lap, the one under way filling as the walk goes round it, and the ground named underneath. The setting is how many pips there are.",
    trades:
      "everything else. This is the period and nothing but the period — no file, no beds, no walk — which is either the argument or the reason to reject it.",
    Content: SketchGroundPips,
  },
];

/**
 * Thirteen directions the drift picture could be pushed in, none of them exclusive of another. The
 * picture today is a product of gratings cut out of one ink and filmed through three channels
 * (src/ui/moireCanvas.ts, src/ui/moireScreen.ts), and its structure is two fractal rows whose
 * levels were meant to read as a lattice of cells (0268) and still read as a weave. Each of these
 * is one move a shader would make — a fold, a ramp, a warp, a mirror, a feedback, a terrace, a
 * union, a per-cell read — drawn on a stand-in weave in the instrument's own inks, under the one
 * dial that direction turns. Every one carries where it would land and what side of the bake line
 * it falls on (docs/plan.md, "a tile is a bake and a frame is a `fillStyle`").
 *
 * The last four are the answer to the four before them being too quiet: one film still each, drawn
 * along five stops of its own and read **per pixel**, so a ground is the picture rather than a
 * sixth of its alpha. They are the only pictures here that spend a colour on a field (0331).
 */
export const SKETCH_DRIFTS: readonly SketchEntry[] = [
  {
    id: "ramp",
    label: "The Ramp",
    thesis:
      "The same picture read through a ramp of five inks rather than laid down in one. The reference's black to blue to cyan to green to yellow to red is one scalar through a palette, and this instrument's field is already one scalar. Hue and disperse become where on the ramp the rest sits and how much of it the picture reaches.",
    trades:
      "the one-hue instrument. The picture becomes the most coloured thing on the page by a distance, in tokens the page already has but never in this order, and every other surface reads as its grey frame. Five stops out of existing tokens spend no new colour; a ramp that wants a sixth is a colour-boundary crossing with its own record (0236).",
    built:
      "in build at src/ui/moireScreen.ts, where every pixel is multiplied by one row ink today: read the tile's own value through a ramp of the ground, --drift-cool, --screen-green, the primary and --drift-hot, each resolved through inkOf as the channel tokens already are. hue slides the rest along the ramp and disperse widens the reach, both already stepped onto DRIFT_STEPS, so it is bake-side: the ramp is baked into the screen tile and the frame still costs one fillStyle.",
    Content: SketchDriftRamp,
  },
  {
    id: "tunnel",
    label: "The Tunnel",
    thesis:
      "The picture fed back into itself through a zoom: what the ghost the painter already lays back would settle to if every frame were laid a little larger about the middle. The one term that is free per frame is a transform, and this is nothing but one.",
    trades:
      "the fine weave's legibility. A tunnel carries everything toward the middle and smears the fringes into rays on its way, so at any zoom worth seeing the picture is the tunnel and the rows are what it is made of; and it is only ever as sharp as the ghost it sums, which is half the ink (DRIFT_FEEDBACK_CEILING).",
    built:
      "aimFeedback in src/ui/moireCanvas.ts already scales the ghost by FEEDBACK_ZOOM.value at three percent and turns it a fraction; the zoom goes to the dial's band and the centre moves with the wind's veer. Frame-side entirely — one drawImage transform, no bake, no key — and feedbackAlpha's ceiling is what keeps the sum from blowing out, which the closed form in sketchField.ts states as the geometric series it is.",
    Content: SketchDriftTunnel,
  },
  {
    id: "terrace",
    label: "The Terrace",
    thesis:
      "The smooth field cut into terraces with every riser lit, so the picture is contour lines rather than fringes. An escape count is banded by nature and the rest of the field is not; the banding is the thing about the reference's cells that reads as depth.",
    trades:
      "smoothness on the strip. A riser is a hard edge and thirty-two pixels alias it, so the profile has to soften every riser by a pixel or the strip shimmers; and a terraced row cannot beat, because a staircase has no second spacing to beat against — it reads as contours and never as a moiré.",
    built:
      "a wave in src/lib/moireProfiles.ts beside stair, which already quantises a cosine onto three steps for the crusher: a staircase with a lit riser, its step count a stepped key. Any row can be cut to it, so it is bake-side for a curved row and a pattern tile for a straight one; the fractal rows would take it first, since their level count is already the terrace.",
    Content: SketchDriftTerrace,
  },
  {
    id: "blobs",
    label: "The Blobs",
    thesis:
      "Rows as distances merged with a smooth minimum, and one grating cut along the merged distance so the fringes wrap the union. The product of gratings is one way to combine rows; the union of shapes is another, and the second reads as one thing instead of as a stack.",
    trades:
      "the rows' independence. Once distances are merged a single effect's row cannot be picked out of the shape — the picture is one thing and its parts have no edges — which is the opposite of what the product buys, where every row is still a row; and a straight row has no distance to merge.",
    built:
      "a sibling of the product in src/lib/moireGrating.ts: where through multiplies each row's grating, a union takes each curved geometry's coordinate as a distance, merges them with smin over a k stepped off the wash, and cuts one grating along the result inside one tile. Bake-side, and one tile for the whole union rather than one per row, which is fewer bakes and one bigger one — the shatter's slices and the feedback stay as they are over it.",
    Content: SketchDriftBlobs,
  },
  {
    id: "bands",
    label: "The Cells Hear",
    thesis:
      "The lattice with every cell lit by its own band of the spectrum the picture already reads for the spiral (0240): a cell's interior slides by its band's level and brightens with it, and the gutter stands still. Twelve cells each hearing a band is the picture hearing the sound rather than reading a number off it.",
    trades:
      "the field's unity. Cells moving on their own read as a meter, and a meter dressed as a lattice is still a meter; the slide has to be held under a cell's own pitch or the picture is twelve VU bars. And it needs the lattice first — this is the lattice with a per-frame read, not a direction of its own without it.",
    built:
      "beside the shatter's slices in src/ui/moireCanvasField.ts: the finished field is already taken back out through LENS_SLICES bands, and a cell is a rectangular slice drawn with its own drawImage offset per frame, its offset the band's level off the analyser the wash already reads. Frame-side — no bake, no key — and bounded like the shatter at a ceiling under one cell; the lattice underneath is the first entry's bake.",
    Content: SketchDriftBands,
  },
  {
    id: "meadow",
    label: "The Meadow",
    thesis:
      "The picture is a field, and which field it is, is already written on the yard: the plant names the scene. Fine tall strokes clumped into tufts and leaning as one, which is what a Heather, a Bracken or a Thistle stands in.",
    trades:
      "the one picture every yard drew. A rack of six is six fields rather than six settings of one, so nothing on the page reads as a family any more except by its ramp; and a scene is fixed at a yard's birth, because there is no rename.",
    built:
      "the ground in src/ui/scene/meadow.ts, read by build in src/ui/moireScreen.ts where the tile's alpha is written: the film's gratings, blobs and band multiply into it and the lean is baked with the tile. Bake-side entirely — the ground runs on the rebuild and a frame still costs one fillStyle.",
    Content: SketchDriftMeadow,
  },
  {
    id: "bloom",
    label: "The Bloom",
    thesis:
      "The second scene, and the one that says a scene is a colour as well as a ground: a lattice of soft warm heads over a cool ground, which is what a Foxglove, a Campion or a Mallow stands in. It rests past the middle stop of its own ramp, so it is warm before it has played a note.",
    trades:
      "the picture at rest being the caller's own resolved ink. Every scene but the meadow rests somewhere else on its ramp, so a yard is coloured by its name before anything has claimed a hue — which is the point, and which is one more thing between the token a surface asked for and what it sees.",
    built:
      "the ground and the five stops in src/ui/scene/bloom.ts, resolved by sceneStops in src/ui/moireScreen.ts and read at sceneHue. Bake-side: the stops are read once a tile and the ramp is read once, not per pixel.",
    Content: SketchDriftBloom,
  },
  {
    id: "water",
    label: "The Water",
    thesis:
      "A fine rippled grating with a few sparse tall blades standing in it, which is what a Reed, a Rush or a Sedge stands in — three plants of forty-eight, and the smallest of the four fields on purpose: a scene nobody draws is a scene nobody argues about.",
    trades:
      "legibility on the strip at the finest ripple. A ripple near the film's own row pitch beats with it, which is the instrument's whole subject at the field's scale and a shimmer at this one — the dial for it is water.ripple and it is judged at the 1:1 crop.",
    built:
      "the ground in src/ui/scene/water.ts, its four numbers declared as tunables under one group in src/lib/copyDriftGroups.ts. Bake-side, like every scene: src/ui/moireScreen.ts writes it a pixel at a time on the rebuild.",
    Content: SketchDriftWater,
  },
  {
    id: "canopy",
    label: "The Canopy",
    thesis:
      "A dense dark mass with scattered light breaking through it, which is what a Willow, a Birch or a Hazel stands in. It takes the most of the picture's ink of the four: what a canopy is, is the light it does not let past.",
    trades:
      "the floor. The screen keeps SCREEN_FLOOR of the picture's ink averaged over a tile and a scene spends against that, so the deepest ground is the one closest to being a grille — canopy.depth is the dial that says how close, and the floor is asserted against the meadow, which is the scene the film's own cases paint.",
    built:
      "the ground in src/ui/scene/canopy.ts, multiplied into the tile's alpha beside the blob lattice in build, src/ui/moireScreen.ts. Bake-side, and the registry that refuses a scene with no file is src/ui/scene/scenes.ts.",
    Content: SketchDriftCanopy,
  },
  {
    id: "poppies",
    label: "The Poppies",
    thesis:
      "The four scenes are subtle because a ground takes a sixth of a tile's alpha and the ramp is read once for the whole of it. Read the ramp per pixel instead and the field answers where on it a point stands: a head is scarlet and the ground between two heads is green, inside one tile, at full strength. The perspective is in the mark's own period — small and dense at the top, large and few at the foot — and the dial is the bob, every head on its own phase. The soft focus and the grain over it belong to the film and not to the field — a meadow has no lens — so the print is one term all four of these share and the one thing on them that would not land in build with the rest.",
    trades:
      "the one read a tile. Today a scene resolves five stops once and reads them once, so a tile costs one lerp; a per-pixel read costs one for every pixel of it, and the ink a surface asked for stops being one colour the picture is dimmed toward. It also spends the picture's whole hue travel on the field, since a ground that is already two hues has nowhere left to carry an effect's claim.",
    built:
      "the scene contract in src/lib/moireScene.ts gains a second answer: a ground says where on the ramp a pixel is read as well as how much of the tile's alpha it takes, and build in src/ui/moireScreen.ts moves the ramp call out of rampInk and into the pixel loop. Bake-side — it still runs on a rebuild and a frame still costs one fillStyle — but sceneStops stays once a tile while the ramp is read width times height times rather than once, and ramp in src/lib/moireColour.ts hands back a fresh four-element ink on every call, so the read has to take an out-parameter first or a rebuild allocates one array a pixel, against the one array a build is allowed.",
    Content: SketchDriftPoppies,
  },
  {
    id: "glint",
    label: "The Glint",
    thesis:
      "Near-black water under a dense lattice of short horizontal glints, with slow diagonal swells darkening it and a few sparse blades standing in it, each with its reflection broken underneath. The glint is a second fine lattice beating against the first, which is this instrument's own subject read at the scale of a ripple: the dial is the phase, and a crest lit at one setting is dark at the next. The vignette and the grain are the film's and not the water's, which is why all four carry the same print and none of them owns it.",
    trades:
      "a second tile in memory and a second thing to keep in step. The two lattices have to stay within a pixel of each other in pitch or they stop beating and become one grating; and a picture this dark spends nearly all of the tile's alpha, so whatever the surface underneath was saying, it is not saying it here. It also cannot be as dark as the still: the deepest stop the instrument holds is --scene-water-deep at a lightness of 0.42, so near-black here means the bottom of this ramp and not the bottom of a screen — a darker water is a token nobody has minted, which is a colour-boundary crossing with its own record (0236).",
    built:
      "a second tile beside the first in build, src/ui/moireScreen.ts, at a pitch a fraction off the ground ripple's — the beat is two pitches and not one lattice slid, so the second pitch is the whole of it — laid down in src/ui/moireCanvas.ts as its own pattern shifted by the row's phase, the way the band is already shifted (0126). It costs on both sides and the frame side is the one 0070 counts: a screen tile is a fillStyle and a fillRect, never a drawImage, so a second one is a second createPattern, a second setTransform and a second full-canvas fill — two fills a frame, not one. Bake-side it is a second width-by-height loop on the rebuild and a second key against TILE_CACHE.",
    Content: SketchDriftGlint,
  },
  {
    id: "seedheads",
    label: "The Seed Heads",
    thesis:
      "Thousands of feathery strokes, dark olive at the root and amber at the tip, with a seed here and there catching the light outright. The lean is a function of where a stroke stands and of the phase rather than one number baked over a whole tile, so a gust travels across the picture as a wave and the strokes a wavelength apart are at opposite ends of it. The warm grain is the stock and not the grass: the print belongs to the film, and every one of the four draws it.",
    trades:
      "the lean being part of what a tile is of. A baked lean is one number in the tile key and free forever after; a travelling one has to be a transform, so the ground can no longer be laid as a single repeating pattern and the seam every scene term exists to avoid comes back at the join of each slice.",
    built:
      "the sway half of SCENE_WIND_TERMS in src/lib/moireScene.ts made spatial. Not in src/ui/moireCanvasField.ts, which slices the gratings that are cut back out of the picture and never the screen the ground is baked into: what a shear applied there moves is the holes, and the grass under them stands still. The ground reaches a frame once, as the pattern transform in inkThrough, src/ui/moireScreen.ts, and a DOMMatrix is affine, so it cannot hold a shear that varies with x. The honest landing is the screen fill in src/ui/moireCanvas.ts cut into vertical strips, each filled with the same pattern under one more turn of the gust. Frame-side, and the cost is 0070 itself: a frame stops costing one fillStyle and starts costing one per strip.",
    Content: SketchDriftSeedHeads,
  },
  {
    id: "skylight",
    label: "The Canopy Light",
    thesis:
      "Leaf clumps at three scales, very dark and darkest at the foot, with specks of sky breaking through the gaps in the upper half. A speck is a gap through every octave at once, which is why they are rare and why they sit where the mass thins. The dial is the gust: it shimmers the finest leaves and opens and closes the gaps behind them. The fall away into the corners is the lens and not the canopy — the print is the film's half of a film still, and the only term here that a scene would not carry.",
    trades:
      "the floor, and the dark. Three octaves at a depth near the floor is the closest of the thirteen to being a grille with a picture behind it, and the specks are read at the top stop, so the one place the picture is bright is the one place it is not the yard's own ink. Three lattices where the shipped canopy has one is three times the arithmetic on every pixel of the bake. And the mass is held near the first stop rather than drawn dark, because --scene-canopy-dark is a lightness of 0.38: the still is darker than any ink this instrument owns, so what is argued here is the shape of the light a canopy keeps out, not how black it is.",
    built:
      "the ground in src/ui/scene/canopy.ts deepened toward what SCREEN_FLOOR leaves, with the specks read as a ramp position at the top stop in build, src/ui/moireScreen.ts — which is the Poppies' contract change and not a thing build can do today, so this one lands after that one or not at all. Bake-side. And the cost is a case that does not exist yet: the floor in src/ui/moireScreen.test.ts is asserted against a tile painted at the resting yard, which is the meadow, so nothing in the suite would notice this ground going deep. The first work is a canopy tile in that file; the second is finding out whether the floor or a film term gives way.",
    Content: SketchDriftSkylight,
  },
];
