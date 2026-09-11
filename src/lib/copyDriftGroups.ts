/**
 * @role The drift's tuning panel by its groups: every tunable under the group its effect belongs
 *   to, with the label the panel calls it, the one line said of it on hover, and which end of its
 *   range a group's push drives it toward. Out of src/lib/copyDrift.ts because a table of sixty
 *   rows is a file of its own under the soft cap.
 * @instead The five scenes' own groups, which this splices in where they used to be written →
 *   src/lib/copyDriftScenes.ts, split off at the 800-line hard cap (0045).
 *   The panel's other words, and the sentence a tuning is copied as → src/lib/copyDrift.ts.
 *   The numbers themselves → `tunable(` under src/lib and src/ui, and the registry they are moved
 *   through → src/lib/moireTuning.ts. The panel that reads this table → src/ui/MoireTuning.tsx.
 */

import { MOIRE_SCENE_TUNE_GROUPS } from "@/lib/copyDriftScenes";

/**
 * One row of the panel: the tunable it moves, what the row is called, the one line said of it,
 * and — for a row a group's push may drive — which end of its range is the wilder picture. A row
 * with no wild end is one a push leaves alone: a phase, or a count the bake budget is sized on.
 */
export type TuningEntry = {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly wild?: "min" | "max";
};

/** One group of rows, by what the numbers do and not by the file they live in, and a line on the group. */
export type TuningGroup = {
  readonly title: string;
  readonly hint: string;
  readonly entries: readonly TuningEntry[];
};

/**
 * The panel, in the order it is read: every tunable under the group its effect belongs to, with
 * the label and the one line the panel says of it. The ids are the declarations' (`tunable(`
 * under src/), and the panel refuses a tunable with no row here or a row with no tunable, so the
 * two lists cannot drift apart silently.
 */
export const MOIRE_TUNE_GROUPS: readonly TuningGroup[] = [
  {
    title: "Grating",
    hint: "The gratings the picture is made of: how much light the stack lets through, how far the rows fan, and the band their pitches are held in.",
    entries: [
      {
        id: "grating.floor",
        wild: "min",
        label: "Floor",
        hint: "How much light the whole stack of gratings lets through; lower is a darker picture.",
      },
      {
        id: "grating.fan",
        wild: "max",
        label: "Fan",
        hint: "How wide a fan the rows' gratings are spread through, in turns of a circle.",
      },
      {
        id: "pitch.px",
        wild: "min",
        label: "Pitch",
        hint: "The spacing a lattice reads best at, in CSS pixels.",
      },
      {
        id: "pitch.width",
        wild: "min",
        label: "Pitch width",
        hint: "The canvas width a row's spread of pitches is read against, in CSS pixels, so the strip and the pop-out draw one picture.",
      },
      {
        id: "pitch.compress",
        wild: "max",
        label: "Pitch compress",
        hint: "How much of the window's spread of pitches survives; less keeps the gratings close enough to beat into a slow moiré.",
      },
    ],
  },
  {
    title: "Lattice",
    hint: "The square lattice screened over the picture: how tight it stands, and how it leans, turns and breathes.",
    entries: [
      {
        id: "lattice.reach",
        wild: "min",
        label: "Reach",
        hint: "How many standing entries tighten the lattice all the way.",
      },
      {
        id: "lattice.lean",
        wild: "max",
        label: "Lean",
        hint: "How far the lattice leans with the output's tilt, in turns either way.",
      },
      {
        id: "lattice.quarters",
        wild: "max",
        label: "Quarters",
        hint: "How many quarter turns the lattice makes over one period of its row.",
      },
      {
        id: "lattice.breath",
        wild: "max",
        label: "Breath",
        hint: "How far the lattice breathes about its own scale over a period.",
      },
      {
        id: "screen.turn",
        wild: "max",
        label: "Turn",
        hint: "How far the lattice turns off the picture's axis, in turns, sweeping through square.",
      },
      {
        id: "screen.breath",
        wild: "max",
        label: "Pitch breath",
        hint: "How far the lattice's pitch breathes, in device pixels.",
      },
      {
        id: "screen.shear",
        wild: "max",
        label: "Shear",
        hint: "How far the whole lattice leans over the tile, in turns.",
      },
    ],
  },
  {
    title: "Wind",
    hint: "The lean the whole field takes under everything standing on it, blown by the rack's population.",
    entries: [
      {
        id: "wind.secs",
        wild: "min",
        label: "Turn",
        hint: "How long the wind takes to turn all the way round, in seconds.",
      },
      {
        id: "wind.veer",
        wild: "max",
        label: "Veer",
        hint: "The whole travel a direction has; two is a full reversal.",
      },
      {
        id: "wind.strips",
        wild: "max",
        label: "Gust",
        hint: "How many vertical strips the field is leaned in, so a gust can travel across it; one is a field that leans all at once.",
      },
    ],
  },
  {
    title: "Travel",
    hint: "How long each kind of change takes to arrive: a row joining, colour moving, the lattice answering a level.",
    entries: [
      {
        id: "arrival.secs",
        wild: "min",
        label: "Arrival",
        hint: "How long a row takes to join the picture, or to leave it, in seconds.",
      },
      {
        id: "ink.secs",
        wild: "min",
        label: "Ink",
        hint: "How long the picture takes to travel a whole reach of colour, in seconds.",
      },
      {
        id: "shape.heardSecs",
        wild: "min",
        label: "Heard",
        hint: "How long the lattice takes to lean and thicken with the output, in seconds.",
      },
    ],
  },
  {
    title: "Jolt",
    hint: "What a hit does to the picture: the crest that counts as one, how far it throws the field and how long it takes to settle.",
    entries: [
      {
        id: "jolt.crest",
        wild: "min",
        label: "Crest",
        hint: "The crest, as a multiple of its window's mean power, that jolts the picture wholly.",
      },
      {
        id: "jolt.secs",
        wild: "max",
        label: "Settle",
        hint: "How long a whole jolt takes to fall back, in seconds.",
      },
      {
        id: "jolt.reach",
        wild: "max",
        label: "Reach",
        hint: "The whole travel a jolt has; one is all the way.",
      },
    ],
  },
  {
    title: "Age",
    hint: "How a long performance widens the picture: how long it takes to mature, and how much a fresh picture is held back.",
    entries: [
      {
        id: "age.reachSecs",
        wild: "min",
        label: "Reach",
        hint: "How long a deck has to sound before the picture is most of the way to as old as it gets, in seconds.",
      },
      {
        id: "age.floor",
        wild: "max",
        label: "Floor",
        hint: "How much of each band a picture with nothing behind it is drawn in.",
      },
      {
        id: "age.runFeedback",
        wild: "max",
        label: "Run feedback",
        hint: "How much of the last frame a full run lays back in, on the oldest performance.",
      },
    ],
  },
  {
    title: "Colour",
    hint: "Where on the ramp of five inks the picture rests while it sounds: how long one swing takes, and how far it swings.",
    entries: [
      {
        id: "colour.orbitSecs",
        wild: "min",
        label: "Orbit",
        hint: "How many seconds of sounding one swing along the ramp and back takes.",
      },
      {
        id: "colour.wander",
        wild: "max",
        label: "Wander",
        hint: "How far either side of the picture's own ink the rest swings, as a share of the ramp.",
      },
      {
        id: "colour.wash",
        wild: "max",
        label: "Wash",
        hint: "How much of the band of the ramp lies over the picture's own ink at the loudest output.",
      },
      {
        id: "colour.level",
        wild: "min",
        label: "Level",
        hint: "How far a quiet output brings the wash down; lower washes a quiet yard as strongly as a loud one.",
      },
      {
        id: "colour.spread",
        wild: "min",
        label: "Spread",
        hint: "How many picture widths one pass of the ramp there and back spans; lower holds more of the ramp at once.",
      },
      {
        id: "colour.band",
        wild: "max",
        label: "Band",
        hint: "How wide the band one coloured row washes stands, as a share of the picture's width.",
      },
      {
        id: "colour.pulse",
        wild: "min",
        label: "Pulse",
        hint: "How far a coloured row at rest brings its own band down; lower washes a resting row as strongly as a surging one.",
      },
    ],
  },
  {
    title: "Feedback",
    hint: "The last frame laid back into this one: how it is scaled and turned before it lands.",
    entries: [
      {
        id: "feedback.zoom",
        wild: "max",
        label: "Zoom",
        hint: "How far a fed-back frame is scaled before it is laid back in.",
      },
      {
        id: "feedback.turns",
        wild: "max",
        label: "Turn",
        hint: "How far a fed-back frame is turned before it is laid back in, in turns.",
      },
    ],
  },
  {
    title: "Structure",
    hint: "Geometry that bends or breaks the finished field: the lens, the shatter and the warp.",
    entries: [
      {
        id: "lens.span",
        wild: "max",
        label: "Lens span",
        hint: "How far the widest claim slides one slice of the field, as a share of its width.",
      },
      {
        id: "shatter.ceiling",
        wild: "max",
        label: "Shatter",
        hint: "The most of the picture that may be drawn from somewhere else in it.",
      },
      {
        id: "warp.ceiling",
        wild: "max",
        label: "Warp",
        hint: "How far a whole warp bends the picture, as a fraction of its height.",
      },
      {
        id: "warp.down",
        wild: "max",
        label: "Warp down",
        hint: "How many cycles of the warp's first sine stand down the height.",
      },
      {
        id: "warp.across",
        wild: "max",
        label: "Warp across",
        hint: "How many cycles of the warp's second sine stand across the width.",
      },
    ],
  },
  {
    title: "Shards",
    hint: "How an automator tears the picture into pieces at unrelated offsets, how a fuller run tears finer, and what its own knobs make of the tear.",
    entries: [
      {
        id: "shards.reach",
        wild: "max",
        label: "Throw",
        hint: "How far one automator throws a piece, as a share of the height, either way.",
      },
      {
        id: "shards.ratio",
        wild: "max",
        label: "Ratio",
        hint: "The depth each further automator reads the count at, as a scale over the first's.",
      },
      {
        id: "shards.phase",
        wild: "max",
        label: "Phase",
        hint: "The turn each further automator adds on the throw's cosine.",
      },
      {
        id: "shards.step",
        wild: "min",
        label: "Step",
        hint: "How many cycles of the count one piece spans at a full run, the narrowest a piece gets.",
      },
      {
        id: "shards.widest",
        wild: "min",
        label: "Widest",
        hint: "How many times wider than the step a piece is for a run holding one effect.",
      },
      {
        id: "shards.down",
        label: "Down phase",
        hint: "The down throw's phase against the across, in turns.",
      },
      {
        id: "shards.hold",
        wild: "max",
        label: "Hold width",
        hint: "How many times wider a piece is for a run held still the longest a hand may hold one.",
      },
      {
        id: "shards.deepest",
        wild: "max",
        label: "Depth",
        hint: "How far into the plane a run whose floor is at the top of its range reads the count.",
      },
      {
        id: "shards.faded",
        wild: "min",
        label: "Faded throw",
        hint: "How much of the throw a run whose arrivals take the longest still stands at.",
      },
      {
        id: "shards.stir",
        wild: "max",
        label: "Stir",
        hint: "How many times the golden turn one piece takes on from the last at a full wander.",
      },
      {
        id: "shards.wait",
        wild: "max",
        label: "Hourglass",
        hint: "How far round the throw's cosine a run's whole layer is turned by a hold just asked for.",
      },
    ],
  },
  {
    title: "Fractal",
    hint: "The fractal structures: how they move, roam, breathe and dive over a performance.",
    entries: [
      {
        id: "fractal.travel",
        wild: "min",
        label: "Travel",
        hint: "The fraction of the window a whole move of the structure takes.",
      },
      {
        id: "fractal.roam",
        wild: "max",
        label: "Roam",
        hint: "How much of the wander band the structure roams through while the deck sounds.",
      },
      {
        id: "fractal.opening",
        wild: "max",
        label: "Opening",
        hint: "How wide the breath opens the zoom, as a ratio.",
      },
      {
        id: "fractal.zoomSteps",
        label: "Zoom steps",
        hint: "How many stops the breath's zoom is stepped onto; each is a bake.",
      },
      {
        id: "fractal.flight",
        wild: "max",
        label: "Flight",
        hint: "How many levels deep a whole performance dives.",
      },
      {
        id: "fractal.flightSecs",
        wild: "min",
        label: "Flight time",
        hint: "How long a whole flight takes on the sounding, in seconds.",
      },
    ],
  },
  {
    title: "Look ceilings",
    hint: "The most of itself each effect's pass may lay over the field or take out of it, at the effect's fullest.",
    entries: [
      {
        id: "look.bloom",
        wild: "max",
        label: "Bloom",
        hint: "The most of itself a reverb's halo lays back over the field.",
      },
      {
        id: "look.double",
        wild: "max",
        label: "Double",
        hint: "The most of itself a shifted second picture lays over the field.",
      },
      {
        id: "look.echo",
        wild: "max",
        label: "Echo",
        hint: "The most of itself a delay's first repeat stands at behind the field.",
      },
      {
        id: "look.band",
        wild: "max",
        label: "Band",
        hint: "The most an EQ/Filter's band lays over the field, or takes out of it.",
      },
      {
        id: "look.stagger",
        wild: "max",
        label: "Stagger",
        hint: "How far the outermost band slides when a panner is spread all the way.",
      },
      {
        id: "look.sharpen",
        wild: "max",
        label: "Sharpen",
        hint: "How much of the unsharp mask is added back to the field at the most.",
      },
      {
        id: "look.wobble",
        wild: "max",
        label: "Wobble",
        hint: "The furthest one band of a tape's swim slides sideways, as a share of the width.",
      },
      {
        id: "look.grain",
        wild: "max",
        label: "Grain",
        hint: "The most of the picture's ink the noise floor's grain takes out.",
      },
      {
        id: "look.squashFloor",
        wild: "max",
        label: "Squash floor",
        hint: "The most of the field's range a compressor's floor ever comes up by.",
      },
      {
        id: "look.squashLift",
        wild: "max",
        label: "Squash lift",
        hint: "The most of the field's range a compressor's makeup carries the squash back up by.",
      },
    ],
  },
  {
    title: "Look shapes",
    hint: "The shape of each effect's pass: how many repeats, edges and hardenings it draws, and how wide and fast it moves.",
    entries: [
      {
        id: "look.echoCap",
        wild: "max",
        label: "Echo repeats",
        hint: "The most repeats a delay draws behind the field; each is a whole draw.",
      },
      {
        id: "look.echoTimeFade",
        wild: "max",
        label: "Echo time fade",
        hint: "How far a long delay time lifts the fade's floor, so long echoes last longer.",
      },
      {
        id: "look.bandEdges",
        wild: "min",
        label: "Band edges",
        hint: "How many nested slices an EQ/Filter's band is laid in; more is a softer rim.",
      },
      {
        id: "look.blockHardenings",
        wild: "max",
        label: "Block hardenings",
        hint: "The most times a crushed field is composed with itself as its depth falls.",
      },
      {
        id: "look.sharpenScale",
        wild: "min",
        label: "Sharpen scale",
        hint: "The working size the unsharp mask's blur is drawn at, as a share of the field.",
      },
      {
        id: "look.wobbleHz",
        wild: "max",
        label: "Wobble rate",
        hint: "How fast a tape's swim goes round, in cycles a second.",
      },
      {
        id: "look.wobbleWaves",
        wild: "max",
        label: "Wobble waves",
        hint: "How many cycles of the swim stand down the picture at once.",
      },
      {
        id: "look.grainSweep",
        wild: "max",
        label: "Grain sweep",
        hint: "How fast the grain is swept across the picture, in its own pixels a second.",
      },
      {
        id: "look.staggerLag",
        wild: "max",
        label: "Stagger lag",
        hint: "How far down the field a band is read from while a panner's Time stage stands.",
      },
      {
        id: "look.staggerSlice",
        wild: "max",
        label: "Stagger slice",
        hint: "How much of its width a band gives up while a panner's Slice stage stands.",
      },
    ],
  },
  {
    title: "Pace",
    hint: "The painting budget: how long a chain still paints at the drift's whole rate, and the slowest it may ever go.",
    entries: [
      {
        id: "pace.fullRate",
        wild: "max",
        label: "Full rate",
        hint: "How many passes a chain may hold and still paint at the drift's whole rate.",
      },
      {
        id: "pace.slowHz",
        wild: "max",
        label: "Slowest",
        hint: "The slowest the picture is ever painted, in frames a second.",
      },
    ],
  },
  ...MOIRE_SCENE_TUNE_GROUPS,
  {
    title: "Film",
    hint: "The film laid over whichever field the yard names: the screen's own gratings, the lattice they beat into and the rolling band, and how much of the picture the whole of it may spend.",
    entries: [
      {
        id: "film.share",
        wild: "min",
        label: "Share",
        hint: "How much of the picture the film may take; at nothing the scene stands solid and at everything the film is the whole screen.",
      },
    ],
  },
  {
    title: "Cells",
    hint: "What moves the marks after the lattice is baked: the sound's own rows stamped back over the picture in the marks' own alphabet, where the cut has only holes.",
    entries: [
      {
        id: "cells.rows",
        wild: "max",
        label: "Rows",
        hint: "How deep the sound's rows are stamped over the picture as marks; at nothing the rows are holes in the lattice and at everything every strong cell carries a whole mark.",
      },
      {
        id: "cells.decay",
        label: "Decay",
        hint: "How much of the loop a landing's flare takes to settle; at a little a row lights and is out before the next lands, and at everything it is still lit when the walk comes round.",
      },
    ],
  },
  {
    title: "Glyph",
    hint: "The lattice of marks the picture is written in — a cell is the screen's own column pitch — where along the ten marks the ramp starts before it wraps, how hard a cell's read is pushed toward that ramp's ends, and how far the scene's five inks are pulled toward one of them.",
    entries: [
      {
        id: "glyph.phase",
        label: "Phase",
        hint: "Where along the marks the ramp starts, as a share of their count; at nothing the ground is blank and the ramp never wraps.",
      },
      {
        id: "glyph.push",
        label: "Push",
        hint: "How hard a cell's read is pushed toward the ends of its ramp before it is cut into marks; at nothing the field is as dense as it reads and at everything it is ground with a ribbon through it.",
      },
      {
        id: "glyph.flat",
        wild: "min",
        label: "Flat",
        hint: "How far the scene's five inks are pulled toward the ramp's middle stop — a mark is written in one of them and never a mix; at nothing they stand whole and at everything the picture is one ink.",
      },
    ],
  },
];
