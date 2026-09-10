/**
 * @role What a scene is: the names the picture has a scene for, the terms every scene reads off a
 *   yard's name, the lights an air shifts a scene's ramp toward, the winds an adjective sets, and
 *   the one axis every scene's marks are cut with. The whole of the contract a scene file declares
 *   itself into — the registry refuses at load a name this file does not hold, and a file that
 *   holds a name this one does not (0329).
 * @instead The scenes themselves — the ground each one lays down and the five stops it is read
 *   along → src/ui/scene/, one file per name, and the registry that refuses them →
 *   src/ui/scene/scenes.ts. The reading of a yard's name into one of these →
 *   src/lib/yardScene.ts. The tile a scene's ground is written into, and the film over it →
 *   src/ui/moireScreenTile.ts. The shape this contract copies → src/lib/moireLook.ts.
 */
import { cosTurn } from "./moire.ts";

/** Every scene the picture has a ground for. One name per field a yard's plant stands in. */
export const SCENE_NAMES = ["meadow", "bloom", "water", "canopy"] as const;

export type SceneName = (typeof SCENE_NAMES)[number];

/**
 * Every light an air puts a scene under. `day` is the one a name with no air reads as, and the one
 * that shifts nothing: a yard that says nothing about its air is drawn in its own ink (0317).
 */
export const SCENE_LIGHTS = ["day", "dusk", "moon", "frost", "rain", "sun"] as const;

export type SceneLight = (typeof SCENE_LIGHTS)[number];

/** Every wind an adjective sets, from the one that stands still to the one that lays the field over. */
export const SCENE_WINDS = ["still", "quiet", "breeze", "windy", "wild"] as const;

export type SceneWind = (typeof SCENE_WINDS)[number];

/**
 * How far the field leans and how far it sways, per wind. **Two amplitudes and no rate**: the
 * screen carries no clock of its own and every motion in it rides a row's phase (0126), so "how
 * fast it recovers" is how far the sway swings rather than how quickly it comes back — the lean is
 * baked into the scene's ground on the rebuild, and the sway scales the screen's own shear and
 * breath on the frame.
 */
export const SCENE_WIND_TERMS: Readonly<Record<SceneWind, { lean: number; sway: number }>> = {
  still: { lean: 0, sway: 0.35 },
  quiet: { lean: 0.25, sway: 0.6 },
  breeze: { lean: 0.5, sway: 1 },
  windy: { lean: 0.75, sway: 1.4 },
  wild: { lean: 1, sway: 1.8 },
};

/**
 * The token a light mixes every stop of a scene's ramp toward, and how far. A light of no token
 * mixes nothing and is the day: a picture nobody said an air of is the scene's own ramp, and a
 * `null` here is that fact rather than a token nobody registered (principle 5).
 */
export type SceneLightTerms = { readonly token: string | null; readonly amount: number };

/**
 * Each light as one token and one share. One and not five, unlike the ramp it is mixed into: what a
 * light does to a field is push the whole of it one way — a frost cools every stop of a meadow and
 * of a canopy alike — and five stops per light would be five chances to say that inconsistently.
 */
export const SCENE_LIGHT_TERMS: Readonly<Record<SceneLight, SceneLightTerms>> = {
  day: { token: null, amount: 0 },
  dusk: { token: "--light-dusk", amount: 0.4 },
  moon: { token: "--light-moon", amount: 0.5 },
  frost: { token: "--light-frost", amount: 0.35 },
  rain: { token: "--light-rain", amount: 0.4 },
  sun: { token: "--light-sun", amount: 0.35 },
};

/**
 * How many stops a scene's ramp has. **None of them is the caller's own ink**: a scene names all
 * five, as every still on the bench does (0331), because a ground that answers where on the ramp a
 * pixel is read spends the whole of that ramp inside one tile — and a stop that flipped with
 * whatever token a surface resolved would flip the middle of every picture with it (0332). A scene
 * that wants the yard's own ink names the token the surface resolves it from.
 */
export const SCENE_RAMP_STOPS = 5;

/**
 * What a scene reads to write one device pixel of the tile: the tile's own size, and how far the
 * yard's own wind leans the field. The size, because the tile is laid down as a repeating pattern
 * and every mark in it has to come round at its edges — a ground stated in absolute pixels would
 * ride a seam down the picture once a tile, which is the one artefact the film's own terms are
 * built to avoid (`beatPx`, `tilePx`, src/ui/moireScreenTile.ts). Neither of them is a clock: the
 * ground is written on a rebuild and never on a frame (0129).
 */
export type SceneTerms = {
  readonly width: number;
  readonly height: number;
  readonly lean: number;
};

/**
 * One scene: the five stops its ink is read along, and the ground that says **where on them** a
 * device pixel of the tile is read, nought to one.
 *
 * A stop is a token name and never a colour, for the reason `CHANNEL_TOKENS` are (0130,
 * docs/boundaries.md). The ground answers *where*, not *how much*: how solid a pixel is belongs to
 * the film alone — the gratings, the beat, the blob and the band — so a canopy goes as dark as its
 * own stops allow without spending a thing against `SCREEN_FLOOR` (0332). Neither a rest nor a
 * depth stands beside it, because a ground that says where it rests needs neither.
 */
export type Scene = {
  readonly ramp: readonly string[];
  readonly ground: (x: number, y: number, terms: SceneTerms) => number;
};

/**
 * How bright one axis of a mark is at `turn` of its own repeat: half of `cosTurn`, which is the one
 * cosine this app's gratings are built out of and not a painter's private copy of it. **Every
 * lattice in the picture reads it**, the film's blobs and channel fringes included — it is
 * `latticeAxis` from src/ui/moireScreen.ts, lifted here when the scenes became its second caller,
 * so a ground and the film it is cut through cannot disagree about what a soft crest is
 * (principle 1).
 */
export const sceneAxis = (turn: number): number => 0.5 + 0.5 * cosTurn(turn);

/**
 * The repeat a mark of `period` device pixels actually stands at, so that a whole number of them
 * span `across`. **This is the constraint rather than a choice**, and the same one `beatPx` is
 * written under: the tile is laid as a pattern, so a mark whose period did not divide the tile
 * would step by a fraction of itself at every join — a ruled grid across the picture, at full
 * amplitude, once a tile. The asked-for period is what a hand tunes; this is what is drawn.
 */
export const sceneRepeat = (across: number, period: number): number =>
  across > 0 && period > 0 ? across / sceneCells(across, period) : period;

/**
 * The same snap stated as a count: how many whole marks of `period` span `across`. **One
 * declaration and two readings of it**, because a mark placed by a hash needs the count where a
 * mark cut by a cosine needs the period — a poppy's column, a ripple's row, a cell of noise — and
 * two roundings of one quotient are two chances to disagree about where a tile comes round
 * (principle 1).
 */
export const sceneCells = (across: number, period: number): number =>
  across > 0 && period > 0 ? Math.max(1, Math.round(across / period)) : 1;

/**
 * The slope a mark of `period` leans at over a tile `down` pixels deep, for the same reason: the
 * lean a hand asked for, rounded to the nearest whole number of the mark's own repeats across the
 * whole of the tile. A field leans as far as its wind says to within one mark, and it comes round.
 */
export const sceneSlope = (down: number, period: number, lean: number): number =>
  down > 0 && period > 0 ? (Math.round((lean * down) / period) * period) / down : 0;

/**
 * A mark sharpened toward its own crests: the axis above raised to a whole power, which narrows a
 * grating into blades or a lattice into scattered gaps without a second cosine. Whole, because a
 * fractional power of a value that reaches nought is a curve with a vertical tangent at every
 * trough, and that reads as a hard edge in a picture whose every other mark is soft.
 */
export const sceneSharp = (value: number, power: number): number => {
  let out = value;
  for (let at = 1; at < power; at += 1) out *= value;
  return out;
};
