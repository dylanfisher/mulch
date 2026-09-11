/**
 * @role The one large thing a yard's place noun names, drawn as the shade it casts on the field: a
 *   wall is a band of shade across the tile, steps are the tile cut into terraces, a grille is a
 *   coarse open lattice and a mass is one upright column of shade to one side. **One shadow, four
 *   scenes** — a wall on water and a wall in a meadow are the same shade on different ink, and
 *   nothing here is ever the thing itself (0335). How dark it goes is the ground it stands on: the
 *   tile pulls its ramp position toward the scene's own first stop by what this answers.
 * @instead What a stand *is*, and the reaches that size one → src/lib/moireScene.ts. Which nouns
 *   read as which stand → src/lib/copyYard.ts and the reading of them → src/lib/yardScene.ts. The
 *   grounds the shade falls on → src/lib/scene/. Where the shade is spent → src/lib/moireScreenField.ts.
 */
import { wrap } from "./moire.ts";
import { type SceneTerms, sceneAxis, sceneNear, sceneRepeat } from "./moireScene.ts";
import { tunable } from "./moireTuning.ts";
import { clamp } from "./range.ts";

/**
 * How far the deepest shade pulls the field toward its own darkest ink. **Never the whole of it,
 * and short of half the ramp at rest.** A field's darkest stop is not always its coolest — the
 * meadow's first stop is a leaf dark and its second is the hot ink — so a shadow deep enough to
 * drop a band of the tile onto that stop puts the steepest part of the ramp under the yard's own
 * hue travel, and the claim that slides a field along its ramp begins repainting it instead
 * (`moireScreen.test.ts`: the travel slides the field rather than repainting it). Measured, the
 * bar is crossed just past a shade of 0.6.
 */
const SHADE = tunable("stand.shade", 0.45, { min: 0.1, max: 1, step: 0.02 });

/** How deep a wall's band of shade lies across the tile, as a share of the tile's own depth. */
const WALL = tunable("stand.wall", 0.12, { min: 0.04, max: 0.3, step: 0.01 });

/** How many terraces a stand of steps cuts the tile into. */
const STEPS = tunable("stand.steps", 4, { min: 2, max: 9, step: 1 });

/** How far apart a grille's bars stand, in device pixels: many times the film's own pitch. */
const GRILLE = tunable("stand.grille", 58, { min: 20, max: 160, step: 1 });

/** And how wide a mass's column stands, as a share of the tile's width. */
const MASS = tunable("stand.mass", 0.09, { min: 0.04, max: 0.3, step: 0.01 });

/**
 * Where down the tile a wall lies and where across it a mass stands, as shares of the tile.
 * Constants and not dials: what a hand argues about is how big the thing is, and where it stands
 * is what makes it the same thing in every picture.
 */
const WALL_AT = 0.68;
const MASS_AT = 0.24;

/**
 * How far a shade's edge is softened, in device pixels, and how wide a grille's bar is as a share
 * of its own spacing. **A riser is a hard edge and a tile is sampled once a pixel**, so an edge
 * that lands between two pixels aliases into a stair that crawls when the screen moves
 * (src/ui/sketch/sketchEntries.ts, `terrace`): every edge here is drawn over a pixel of its own.
 */
const SOFT = 1.5;
const BAR = 0.22;

/** How far a step's shade descends over the whole flight, before the reach scales it. */
const TREAD = 0.85;

/** A mark of `wide` device pixels either side of `off`, its edge softened by a pixel. */
const edged = (off: number, wide: number): number => clamp((wide - Math.abs(off)) / SOFT, 0, 1);

/**
 * The bar of a grille standing at `turn` of its own spacing, `wide` of that spacing across. The
 * cosine is `sceneAxis`, so the cut is where a bar of that width crosses it — a bar stated as a
 * share of its own spacing rather than as a power, because a power is a whole number and the reach
 * scales this continuously.
 */
const barred = (turn: number, wide: number, spacing: number): number => {
  const cut = sceneAxis(clamp(wide, 0, 1) / 2);
  const stands = sceneAxis(turn);
  return clamp(((stands - cut) * spacing) / SOFT, 0, 1);
};

/**
 * How much of the shade of whatever stands in this field falls at (`x`, `y`), nought to one.
 *
 * **Every stand comes round at both edges of the tile.** The tile is laid as a repeating pattern,
 * so a shadow stated in absolute pixels would step at every join exactly as a ground would: the
 * wall and the mass are reached through `sceneNear`, the grille is snapped by `sceneRepeat`, and
 * the flight of steps rises back to its own top over the last pixel of the tile rather than
 * dropping there.
 *
 * The reach scales the shade rather than its spacing: close is a wide soft shadow and far a thin
 * one, which is what standing further off a thing does to the shadow it casts across a whole field.
 */
export function standShade(x: number, y: number, terms: SceneTerms): number {
  const { width, height, seen, reach, stand } = terms;
  if (width <= 0 || height <= 0) return 0;
  return SHADE.value * clamp(shapeOf(x, y, width, standDown(height, seen), reach, stand), 0, 1);
}

/**
 * How wide the one kept thing a name can end on is drawn, in device pixels, and where across the
 * tile it stands. **Larger and sharper than any speck a scene has of its own**: a bell is one
 * object left at the foot of a wall, and what tells it from a seed catching the light is that it is
 * bigger, harder-edged and there is exactly one of it. Constants and not dials, for the reason
 * `WALL_AT` is one: where a kept thing stands is what makes it the same thing in every picture.
 */
const KEPT = 3.2;
const KEPT_AT = 0.62;

/**
 * How much of that one kept thing stands at (`x`, `y`), nought to one — read in place of a scene's
 * own specks when the yard's detail names an object rather than a creature, and lifted to the top
 * of the ramp by the tile (src/lib/moireScreenField.ts).
 *
 * **At the foot of the shade and not on the field**: the detail is the last thing a name says and
 * the place is what it is left by, so the thing stands where the shade the place casts ends. It
 * comes round on the same field the shade does, so a tile shows one of it wherever it is cut.
 */
export function standSpeck(x: number, y: number, terms: SceneTerms): number {
  const { width, height, seen, reach, stand } = terms;
  if (width <= 0 || height <= 0) return 0;
  const down = standDown(height, seen);
  const at = footOf(stand, width, down, reach);
  const off = Math.hypot(sceneNear(x - at.x, width), sceneNear(y - at.y, down));
  // Sharper than a scene's own speck: its edge is one pixel wide however big the thing is, which is
  // what makes an object read as an object rather than as a bright patch of the field.
  return clamp((KEPT * reach - off) / SOFT, 0, 1);
}

/**
 * Where the foot of the shade stands, refilled in place and handed back: this is read once per
 * device pixel of a bake, and a build allocates a ramp and no more (0129, 0070, and `nearestHead`
 * in src/lib/scene/bloom.ts, which is the same shape). A caller that keeps it copies it.
 */
const foot = { x: 0, y: 0 };

/**
 * Where the shade each stand casts has its foot, in the tile's own pixels. Named per stand for
 * `shapeOf`'s reason and refusing an unnamed one for the same: a fifth stand is a kept thing
 * standing wherever the last branch happened to put it.
 */
function footOf(
  stand: string,
  width: number,
  down: number,
  reach: number,
): { x: number; y: number } {
  foot.x = KEPT_AT * width;
  foot.y = FOOT_DOWN * down;
  // Just under the band the wall lays across the tile, which is where a thing left against a wall
  // stands: below its shade rather than inside it.
  if (stand === "wall") foot.y = WALL_AT * down + WALL.value * down * reach;
  // Beside the column rather than under it, the mass being the one shade that stands upright.
  else if (stand === "mass") foot.x = MASS_AT * width + MASS.value * width * reach + KEPT;
  else if (stand !== "steps" && stand !== "grille")
    throw new Error(`No foot for a stand at "${stand}".`);
  return foot;
}

/** How far down its own field the foot of a flight of steps and of a grille is. */
const FOOT_DOWN = 0.92;

/**
 * How far down the tile a stand's own field runs: the tile snapped to what the surface actually
 * shows of it. **A tile is not the picture.** `tilePx` rounds the tile *up* to a whole beat cell,
 * so a rack strip 64 device pixels tall is drawn from a tile 210 tall and shows its top third —
 * a wall placed two thirds down that tile is a wall nobody sees until the band happens to roll it
 * into view, and at rest the roll is nought (`bandTurns`, src/ui/moireScreen.ts). Snapped rather
 * than taken raw, so a whole number of them still span the tile and the shade comes round at the
 * join like every other mark (`sceneRepeat`). On a surface as tall as its tile — the yard's own
 * drift window — this is the tile, and there is one wall.
 */
const standDown = (height: number, seen: number): number =>
  seen > 0 && seen < height ? sceneRepeat(height, seen) : height;

/**
 * Which of the four shapes the shade takes, before the depth a hand tunes it to. Every stand the
 * contract holds is named here and a name it does not hold throws, rather than falling through to
 * whichever shape happens to be written last: a fifth stand added to `SCENE_STANDS` is a picture
 * nobody declared, and a picture is the one place a mistake looks deliberate (principle 5).
 */
function shapeOf(
  x: number,
  y: number,
  width: number,
  down: number,
  reach: number,
  // Read as a plain string and not as the contract's own union, for the reason the scene registry
  // is a `Map<string, Scene>` rather than its record (`held`, src/lib/scene/scenes.ts): a type that
  // says the four are all there is makes the refusal below unreachable, and the refusal is the
  // whole point — a fifth stand, or a cast, is exactly what it catches.
  stand: string,
): number {
  if (stand === "wall")
    return edged(sceneNear(y - WALL_AT * down, down), WALL.value * down * reach);
  if (stand === "mass")
    return edged(sceneNear(x - MASS_AT * width, width), MASS.value * width * reach);
  if (stand === "steps") return terraced(y, down, reach);
  if (stand === "grille") {
    const across = sceneRepeat(width, GRILLE.value);
    const bars = sceneRepeat(down, GRILLE.value);
    return Math.max(barred(x / across, BAR * reach, across), barred(y / bars, BAR * reach, bars));
  }
  throw new Error(`No shade for a stand at "${stand}".`);
}

/**
 * The tile cut into terraces: one flight of `STEPS` treads, each deeper in shade than the one above
 * it, and the last rising back to the first over a pixel so the flight comes round with the tile.
 * The count is what the term says and the softening never eats a whole tread, because a flight
 * whose risers met would be a ramp.
 */
function terraced(y: number, height: number, reach: number): number {
  const flight = Math.max(2, Math.round(STEPS.value));
  // The whole descent, never past the ramp: a flight that fell further than the ramp is deep would
  // land its lowest treads on the same clamped shade and read as one terrace where the term says
  // three. So the reach is spent on how far the flight falls up to that floor and no further.
  const deep = Math.min(1, TREAD * reach) / (flight - 1);
  const tread = height / flight;
  const at = (wrap(y, height) / height) * flight;
  const on = Math.min(flight - 1, Math.floor(at));
  // The riser: the last pixel of a tread, carrying it into the next — and the last tread of all
  // back to the first, which is the join.
  const over = clamp(((at - on) * tread - (tread - SOFT)) / SOFT, 0, 1);
  const next = (on + 1) % flight;
  return deep * (on + over * (next - on));
}
