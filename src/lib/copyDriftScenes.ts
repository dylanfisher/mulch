/**
 * @role The five scenes' own rows of the drift's tuning panel — meadow, bloom, water, canopy and
 *   stand — each with the label the panel calls it, the one line said of it on hover, and which end
 *   of its range a group's push drives it toward. Out of src/lib/copyDriftGroups.ts at the 800-line
 *   hard cap (0045): the scenes are the half of that table that grows with the scene registry.
 * @instead Every other group of the panel, and the two types a row and a group are →
 *   src/lib/copyDriftGroups.ts, which splices these into its own list. The scenes themselves →
 *   src/lib/scene/scenes.ts. The panel that reads the table → src/ui/MoireTuning.tsx.
 */
import type { TuningGroup } from "@/lib/copyDriftGroups";

/**
 * The scenes' groups, in the order the panel reads them — one per scene a yard may name, spliced
 * into `MOIRE_TUNE_GROUPS` where they used to be written. The ids are the declarations' (`tunable(`
 * under src/), and the panel refuses a tunable with no row here or a row with no tunable.
 */
export const MOIRE_SCENE_TUNE_GROUPS: readonly TuningGroup[] = [
  {
    title: "Meadow",
    hint: "The field a yard named for a grass stands in: backlit seed heads, an amber-tan mass of fibre with dark stalks threading it and a seed here and there catching the light outright.",
    entries: [
      {
        id: "meadow.fibre",
        wild: "min",
        label: "Fibre",
        hint: "How wide one fibre of the mass is across the stroke, in device pixels.",
      },
      {
        id: "meadow.awn",
        wild: "max",
        label: "Awn",
        hint: "And how long one is along it: the further these two stand apart, the more the mass is grass and the less it is cloud.",
      },
      {
        id: "meadow.stalk",
        wild: "max",
        label: "Stalk",
        hint: "How wide the dark stalks rising through the mass stand, in the same pixels.",
      },
      {
        id: "meadow.mass",
        wild: "max",
        label: "Mass",
        hint: "And where on its own ramp the mass rests: at the tan stop is a field of seed heads, and above it a field of straw.",
      },
    ],
  },
  {
    title: "Bloom",
    hint: "The field a yard named for a flower stands in: a poppy field, scarlet heads over green stems, small and dense at the top of a tile and large and few at its foot.",
    entries: [
      {
        id: "bloom.far",
        wild: "min",
        label: "Far",
        hint: "How far apart the heads stand at the top of the picture, in device pixels.",
      },
      {
        id: "bloom.near",
        wild: "max",
        label: "Near",
        hint: "And how far apart they stand at its foot: the difference between the two is the whole of the perspective.",
      },
      {
        id: "bloom.head",
        wild: "max",
        label: "Head",
        hint: "How wide a head is, as a share of its own cell; past one they overlap their neighbours.",
      },
      {
        id: "bloom.stroke",
        wild: "min",
        label: "Stem",
        hint: "How far apart the stems the heads stand in run, in the same pixels.",
      },
    ],
  },
  {
    title: "Water",
    hint: "The field a yard named for a reed stands in: black water under a lattice of short glints, with a few tall blades standing in it and their reflections broken under them.",
    entries: [
      {
        id: "water.ripple",
        wild: "min",
        label: "Ripple",
        hint: "How far apart the ripples run down the picture, in device pixels.",
      },
      {
        id: "water.beat",
        label: "Beat",
        hint: "And the pitch of the second lattice they beat against: how far apart the lit rows stand, is how far these two stand apart, and two pitches dragged onto one number stop beating. No wild end, because the push drives every driven row the same way and a second pitch driven onto the first is the one setting this field has nothing left to say at.",
      },
      {
        id: "water.dash",
        wild: "min",
        label: "Glint",
        hint: "How long one glint is across the ripple it lies on, in the same pixels.",
      },
      {
        id: "water.swell",
        wild: "min",
        label: "Swell",
        hint: "How wide the slow swell that bends the ripples and lights them in bands is, in the same pixels.",
      },
      {
        id: "water.deep",
        wild: "min",
        label: "Deep",
        hint: "How far up its own ramp the water reads under all of it; near the floor is black water.",
      },
    ],
  },
  {
    title: "Canopy",
    hint: "The field a yard named for a tree stands in: a wall of leaf seen from under it, whole crowns light against dark, with a handful of pale specks of sky where the leaf has thinned.",
    entries: [
      {
        id: "canopy.crown",
        wild: "max",
        label: "Crown",
        hint: "How wide one whole crown is, in device pixels: the coarsest of the four scales of leaf, and the shape.",
      },
      {
        id: "canopy.leaf",
        wild: "min",
        label: "Leaf",
        hint: "And how wide one leaf clump inside it is; the two finer scales are read as fractions of this.",
      },
      {
        id: "canopy.mass",
        wild: "min",
        label: "Mass",
        hint: "How far up its own ramp the closed mass may reach. Low, or the picture is not a canopy.",
      },
      {
        id: "canopy.thin",
        wild: "max",
        label: "Thin",
        hint: "How thin the leaf has to be before a speck of sky is let through it at all.",
      },
      {
        id: "canopy.rare",
        wild: "min",
        label: "Rare",
        hint: "And how few of the places a speck could fall hold one: a break is rare, or the canopy is a net.",
      },
    ],
  },
  {
    title: "Stand",
    hint: "The one large thing a yard's place noun names, drawn as the shade it casts on whichever field it stands in: a wall is a band of shade, steps cut the tile into terraces, a grille is a coarse open lattice and a mass is a column of shade to one side.",
    entries: [
      {
        id: "stand.shade",
        wild: "max",
        label: "Shade",
        hint: "How far the deepest shade pulls the field toward its own darkest ink.",
      },
      {
        id: "stand.wall",
        wild: "max",
        label: "Wall",
        hint: "How deep a wall's band of shade lies across the tile, as a share of the tile.",
      },
      {
        id: "stand.steps",
        wild: "max",
        label: "Steps",
        hint: "How many terraces a flight of steps cuts the tile into.",
      },
      {
        id: "stand.grille",
        wild: "max",
        label: "Grille",
        hint: "How far apart a grille's bars stand, in device pixels — snapped, like every mark, to a whole number across the tile, so what a drag moves through is that handful of spacings.",
      },
      {
        id: "stand.mass",
        wild: "max",
        label: "Mass",
        hint: "And how wide a mass's column stands, as a share of the tile's width.",
      },
    ],
  },
];
