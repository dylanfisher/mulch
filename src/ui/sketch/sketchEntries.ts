/**
 * @role The two lists the sketch bench mounts, and the shape of one entry: eight readings of when
 *   the ground shifts under a hand's gesture, and ten directions the drift picture could be
 *   pushed in. The argument lives here and the page that draws it lives next door — split off when
 *   the two together passed the file cap, because a list that grew by four entries is not a page
 *   that grew (docs/map.md).
 * @instead The page that mounts these, its nav and its two introductions →
 *   src/ui/sketch/SketchPage.tsx, and the frame one entry is drawn in →
 *   src/ui/sketch/SketchFrame.tsx. The pictures themselves → src/ui/sketch/ground/ and
 *   src/ui/sketch/drift/, and the fields they draw → src/ui/sketch/sketchDrift.ts and the four
 *   grounds themselves under src/ui/scene/. None of them is wired to anything (0247).
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
import { SketchDriftFilm } from "@/ui/sketch/drift/SketchDriftFilm";
import { SketchDriftRamp } from "@/ui/sketch/drift/SketchDriftRamp";
import {
  SketchDriftBloom,
  SketchDriftCanopy,
  SketchDriftMeadow,
  SketchDriftWater,
} from "@/ui/sketch/drift/SketchDriftScenes";
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
 * Ten directions the drift picture could be pushed in, none of them exclusive of another. The
 * picture today is a product of gratings cut out of one ink and filmed through three channels
 * (src/ui/moireCanvas.ts, src/ui/moireScreen.ts), and its structure is two fractal rows whose
 * levels were meant to read as a lattice of cells (0268) and still read as a weave. Each of these
 * is one move a shader would make — a fold, a ramp, a warp, a mirror, a feedback, a terrace, a
 * union, a per-cell read, a share of the picture the film may spend — drawn on a stand-in weave in the instrument's own inks, under the one
 * dial that direction turns. Every one carries where it would land and what side of the bake line
 * it falls on (docs/plan.md, "a tile is a bake and a frame is a `fillStyle`").
 *
 * There were eleven: four of them were film stills, drawn along five stops of their own and read
 * **per pixel** to argue that a ground is the picture rather than a sixth of its alpha (0331), and
 * every one of the four has since become the scene it was arguing for — the poppies as the bloom
 * (0332), the glint as the water (0333), the seed heads as the meadow and the canopy light as the
 * canopy (0334). A bench entry that lands is a bench entry that goes, which is what one is for.
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
      "in build at src/ui/moireScreenTile.ts, where every pixel is multiplied by one row ink today: read the tile's own value through a ramp of the ground, --drift-cool, --screen-green, the primary and --drift-hot, each resolved through inkOf as the channel tokens already are. hue slides the rest along the ramp and disperse widens the reach, both already stepped onto DRIFT_STEPS, so it is bake-side: the ramp is baked into the screen tile and the frame still costs one fillStyle.",
    Content: SketchDriftRamp,
  },
  {
    id: "tunnel",
    label: "The Tunnel",
    thesis:
      "The picture fed back into itself through a zoom: what the ghost the painter already lays back would settle to if every frame were laid a little larger about the middle. The one term that is free per frame is a transform, and this is nothing but one.",
    trades:
      "the fine weave's legibility. A tunnel carries everything toward the middle and smears the fringes into rays on its way, so at any zoom worth seeing the picture is the tunnel and the rows are what it is made of; and it is only ever as sharp as the ghost it sums, which is a quarter of the ink (DRIFT_FEEDBACK_CEILING).",
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
      "The picture is a field, and which field it is, is already written on the yard: the plant names the scene. Backlit seed heads — an amber-tan mass of fibre, feathery and soft, with dark stalks threading it and a seed here and there catching the light outright, which is what a Heather, a Bracken or a Thistle stands in. Noise and not gratings: a mass of grass has no pitch in it, and everything with a pitch drew a comb, a beaded string or a herringbone.",
    trades:
      "the one picture every yard drew, and four hash reads a pixel. A rack of six is six fields rather than six settings of one, so nothing on the page reads as a family any more except by its ramp; and a hash does not repeat where a tile does, so every scale of the noise is sampled on cells wrapped onto the tile or a seam runs down the picture at full contrast, once a tile.",
    built:
      "the ground in src/ui/scene/meadow.ts over streakTiled in src/lib/moireNoise.ts, read by build in src/ui/moireScreenTile.ts where the tile's every pixel is written: the film's gratings, blobs and band shade the read the ground gives (0340) and the lean is baked with the tile. Bake-side entirely — the ground runs on the rebuild and a frame still costs one fillStyle, which is the precedent grainTile in src/lib/moireGrain.ts set for reading a hash a pixel at a time.",
    Content: SketchDriftMeadow,
  },
  {
    id: "bloom",
    label: "The Bloom",
    thesis:
      "The second scene, and the one that says a scene is a colour as well as a ground: a lattice of soft warm heads over a cool ground, which is what a Foxglove, a Campion or a Mallow stands in. It rests past the middle stop of its own ramp, so it is warm before it has played a note.",
    trades:
      "the picture at rest being the caller's own resolved ink. A scene names all five of its own stops and is read along them per pixel, so a yard is coloured by its name before anything has claimed a hue — which is the point, and which is one more thing between the token a surface asked for and what it sees (0332).",
    built:
      "the ground and the five stops in src/ui/scene/bloom.ts, resolved by sceneStops in src/ui/moireScreenTile.ts and read at sceneHue. Bake-side: the stops are read once a tile and the ramp is read at every pixel of it, which is what a poppy head standing scarlet over a green stem costs (0332).",
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
      "the ground in src/ui/scene/water.ts, its four numbers declared as tunables under one group in src/lib/copyDriftGroups.ts. Bake-side, like every scene: src/ui/moireScreenTile.ts writes it a pixel at a time on the rebuild.",
    Content: SketchDriftWater,
  },
  {
    id: "canopy",
    label: "The Canopy",
    thesis:
      "A wall of leaf seen from under it: clumps at four scales with the coarsest reading as whole crowns light against dark, and a handful of pale specks of sky where the leaf has thinned — which is what a Willow, a Birch or a Hazel stands in. It takes the most of the picture's ink of the four: what a canopy is, is the light it does not let past. Noise and not lattices, for the meadow's reason turned round: lattices crossed leave their gaps on a grid however they are turned, and a canopy whose holes stand in rows is a net.",
    trades:
      "the dark, and one more token. A ground says where on its ramp a pixel is read and spends none of the tile's alpha (0332), so how dark a canopy goes is how dark its own stops are and nothing to do with SCREEN_FLOOR — and --scene-canopy-dark at a lightness of 0.38 turned out to be a lit leaf rather than the shade under one, so the ramp got --scene-canopy-shade under it.",
    built:
      "the ground in src/ui/scene/canopy.ts over streakTiled in src/lib/moireNoise.ts, read as a ramp position in the pixel loop of build, src/ui/moireScreenTile.ts. Bake-side, and the registry that refuses a scene with no file is src/ui/scene/scenes.ts.",
    Content: SketchDriftCanopy,
  },
  {
    id: "film",
    label: "The Film",
    thesis:
      "The scene is the body of the picture and the film is a shade over it — and how much of the picture the film may spend is one number a hand can see and move, film.share, not a depth buried in four terms. At nothing the bloom stands solid, which is the bench's own picture of it; at everything it is the deepest shade the dial admits; between, the beat between the gratings survives at every setting and only its depth moves.",
    trades:
      "the film's own strength at the settings a hand will choose. One dial over the product of the four terms cannot say which of them a picture could spare, so a share that leaves the lattice legible leaves the band and the two gratings shallower than they were argued at — and a share per term is four dials for one question (0333). The rows' cut and the ghost are outside it: this is the screen's share and not the film's whole cost, and so are the three channels' fringe and gain, which are a lattice on the ink and not a depth on the read — so the bench at nothing is flatter than the app at nothing, which still carries that chromatic lattice.",
    built:
      "one tunable, film.share, declared in src/ui/moireScreenTile.ts beside SCREEN_FLOOR and eased over the product of the four keep terms in build, `1 - share * (1 - keep)`, with its row in a Film group in src/lib/copyDriftGroups.ts. Spent on the read and not on the alpha since 0340: the eased product pulls the pixel toward the scene's own first stop the way standShade does, and the tile is written at the caller's own alpha at every pixel. Bake-side: it is read once a tile and tuneStamp() already keys the tile, so a drag rebakes the ground and no frame reads it (0126, 0129).",
    Content: SketchDriftFilm,
  },
];
