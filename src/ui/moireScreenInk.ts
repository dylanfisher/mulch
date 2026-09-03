/**
 * @role The ink a picture is filmed through, which is one screen's and no row's: which row's claim
 *   about colour the whole picture takes (the boldest, and the same question the lens is asked),
 *   how saturated the standing rack's own looks ask it to be drawn, where the travel toward all
 *   four of those has got to, and the ladder each is rounded onto before it may key a tile (0266,
 *   0283).
 * @instead The screen those inks are laid in — its two grids, its three channels, its motions and
 *   the one tile they are written into → src/ui/moireScreen.ts, which this split out of at the
 *   800-line hard cap (0045) and which spends every export here. How a standing rack's looks make
 *   a saturation of themselves → `looksSaturate`, src/ui/moireLooks.ts.
 */
import {
  DRIFT_DISPERSE_REACH,
  DRIFT_FRINGE_REACH,
  DRIFT_HUE_REACH,
  DRIFT_REST,
  DRIFT_STEPS,
  easedToward,
  type MoireRow,
  type ScreenInk,
} from "@/lib/moire";
import { agedHue } from "@/lib/moireAge";
import { arrived } from "@/lib/moireArrival";
import { orbitHue } from "@/lib/moireColour";
import { washedToward } from "@/lib/moireSound";
import { snapToStep } from "@/lib/range";
import { tunable } from "@/lib/moireTuning";

/**
 * The row that says the most about one thing a picture can only say once — the ink's three
 * lattices, or the lens the finished field is bent through: those are one tile and one field over
 * the whole picture, so unlike a pitch or a depth they cannot be per row. **The boldest claim
 * wins** rather than the mean or the first — an effect that says nothing leaves the picture where
 * it rests, and a mean would let it dilute the one that does, which is exactly the knob whose
 * travel these dimensions exist to spend (0141, 0142). A row with no period is not drawn and does
 * not vote.
 */
export function boldestRow(
  rows: readonly MoireRow[],
  pick: (row: MoireRow) => number,
  rest: number,
): MoireRow | null {
  let bold: MoireRow | null = null;
  for (const row of rows) {
    if (row.period <= 0) continue;
    // Nor does a row that has wholly left, which is the third reader of the one test: what it
    // claimed about the ink or the lens would otherwise hold the whole picture there for as long
    // as the yard stood unrebuilt (`arrived`, src/lib/moireArrival.ts).
    if (!arrived(row.arrival)) continue;
    if (Math.abs(pick(row) - rest) > Math.abs((bold === null ? rest : pick(bold)) - rest)) {
      bold = row;
    }
  }
  return bold;
}

/**
 * That row's own claim, or where the picture rests when every row does. The row itself is what the
 * lens the painter draws its slices through asks for — a slide has a phase, so it needs the row and
 * not only the amount — and the three colour readings below need the number alone.
 */
const boldest = (
  rows: readonly MoireRow[],
  pick: (row: MoireRow) => number,
  rest: number,
): number => {
  const bold = boldestRow(rows, pick, rest);
  return bold === null ? rest : pick(bold);
};

// Named here rather than written at each call, which would allocate a closure a frame (0070).
const fringeOf = (row: MoireRow): number => row.fringe;
const disperseOf = (row: MoireRow): number => row.disperse;
const hueOf = (row: MoireRow): number => row.hue;

/** How far apart the three channel lattices of this picture's screen stand. */
export const screenFringe = (rows: readonly MoireRow[]): number =>
  boldest(rows, fringeOf, DRIFT_REST.fringe);

/**
 * How far those three lattices' own pitches and angles have diverged: the boldest row's claim,
 * carried toward the reach by however washed the field has become — the one dimension of the screen
 * that moves with a reading rather than with a parameter, and it moves with the depth of every row
 * at once rather than with any one of them (0128, 0213).
 */
export const screenDisperse = (rows: readonly MoireRow[], wash: number): number =>
  washedToward(boldest(rows, disperseOf, DRIFT_REST.disperse), DRIFT_DISPERSE_REACH, wash);

/** Where between the picture's cool ink and its hot one this picture is drawn. */
export const screenHue = (rows: readonly MoireRow[]): number =>
  boldest(rows, hueOf, DRIFT_REST.hue);

/**
 * A knob-driven key rounded onto the ladder every tile in the picture is keyed through
 * (`DRIFT_STEPS`, src/lib/moire.ts). Exported because the picture's own tiles are keyed the same
 * way and by the same argument (0142): one fact about what may reach a tile, declared once
 * (principle 1).
 */
export const stepped = (value: number, reach: number): number =>
  snapToStep(value, 0, reach, reach / DRIFT_STEPS);

/**
 * How many steps of its reach the hue alone is rounded onto. Finer than `DRIFT_STEPS` because the
 * hue is read along a ramp of five stops (0301) and eight steps across four spans is a visible jump
 * at each; thirty-two is under what the eye reads a hue shift at, and the orbit at its resting
 * seconds bakes a tile every few seconds rather than every frame. Bake-side, so a const (0299).
 */
export const HUE_STEPS = 32;

/** The hue's own key, on its own ladder — `stepped` for the one term read along a ramp. */
export const steppedHue = (value: number): number =>
  snapToStep(value, 0, DRIFT_HUE_REACH, DRIFT_HUE_REACH / HUE_STEPS);

/** Where a picture's ink stands before any row has claimed a thing about it. */
export const screenInkRest = (): ScreenInk => ({
  fringe: DRIFT_REST.fringe,
  disperse: DRIFT_REST.disperse,
  hue: DRIFT_REST.hue,
  // And unsaturated, which is where a picture with nothing in its rack stands: the fourth term is
  // the looks' and not a row's, so it rests at nothing rather than at a claim (0283).
  saturate: 0,
});

/**
 * How far a *look* may carry the same screen's colour: one, a share having no further to go. Stated
 * here and not beside the three reaches a row claims (`COLOUR_REACH`, src/lib/moire.ts) because no
 * row claims this one and nothing outside this file spends it — it is what the standing rack's own
 * looks make of the whole field (`looksSaturate`, src/ui/moireLooks.ts, 0283), eased on the ink's
 * own rate below and rounded onto the ink's own steps before it reaches a tile.
 */
export const SCREEN_SATURATE_REACH = 1;

/**
 * How long the picture takes to travel a whole reach of one of them, in seconds, on a yard whose
 * clock is running. Every claim above
 * is the *boldest* row's, so an automator retiring the instance holding it hands the picture another
 * ink between two frames and a hand dragging past a stop cuts to it — and every other travel in the
 * picture is rated rather than written (`easedToward`, 0235, 0248). This is that one rate spent on
 * colour: a whole reach in two seconds, so a claim that moves a little moves for a little.
 *
 * **Two seconds is what the ladder costs.** The travelled value is what `stepped` rounds, so a whole
 * reach walks `DRIFT_STEPS` stops and each stop is one bake: eight over two seconds, four a second,
 * and none of them twice, the travel running one way. Three terms travelling at once off each
 * other's step lines is three of those ladders and up to twenty-odd keys, which is what `TILE_CACHE`
 * below is sized against. Shorter spends the same bakes closer together; longer is a picture still
 * catching up with a knob the hand let go of.
 */
export const DRIFT_INK_SECS = tunable("ink.secs", 2, { min: 0.2, max: 10, step: 0.1 });

/**
 * One step of the picture's ink travel, from where it has got to toward what the rows claim now —
 * four `easedToward` calls and nothing else, in the shape the structure's own travel across its
 * plane is taken in (`fractalTravelInto`, src/lib/moireFractal.ts). Each in its own dimension's
 * units, so the four arrive together rather than `fringe` taking twice as long as `hue`.
 *
 * The whole reading and not the bare claim: how washed the field is carries `disperse`, and how old
 * the performance is and how far its rest has orbited the ramp carry `hue` (`orbitHue`,
 * src/lib/moireColour.ts, 0301). The age and the orbit crawl and the travel arrives on them every read; the
 * wash does not — `washAmount` is gated at a floor, so a deck falling under it moves `disperse`
 * half a reach between two frames and the travel now walks that too, a second at its widest. That
 * is the same kind of jump as a retiring place and it is walked for the same reason, not an
 * oversight: the alternative is one of the terms cutting while the rest travel (0266). The fourth is
 * the standing rack's own — how saturated its looks ask the picture to be drawn, which no row claims
 * and which is handed in already weighed by how present each look has become (`looksSaturate`,
 * src/ui/moireLooks.ts, 0283).
 *
 * `over` is how long a whole reach takes — `DRIFT_INK_SECS`, or nothing where there is no clock to
 * travel against, which arrives outright (`easedToward`).
 *
 * Written in place, because it is read once a picture on the frame path and allocates nothing
 * (0070).
 */
export function inkTravelInto(
  out: ScreenInk,
  rows: readonly MoireRow[],
  wash: number,
  age: number,
  sounding: number,
  saturate: number,
  elapsed: number,
  over: number,
): void {
  out.fringe = easedToward(out.fringe, screenFringe(rows), elapsed, over, DRIFT_FRINGE_REACH);
  const disperse = screenDisperse(rows, wash);
  out.disperse = easedToward(out.disperse, disperse, elapsed, over, DRIFT_DISPERSE_REACH);
  const hue = agedHue(screenHue(rows), age, orbitHue(sounding));
  out.hue = easedToward(out.hue, hue, elapsed, over, DRIFT_HUE_REACH);
  // And how saturated the standing rack asks the whole of it to be drawn, which no row claims and
  // which travels here anyway: a look arriving already eases its own presence over the wind's
  // seconds (`looksTravelInto`, 0279), and this is the second half of the same walk — the one that
  // rounds onto the ladder a tile may be keyed through, so a Sheen dragged across its range walks
  // the picture up eight stops rather than baking a tile a pointer move (0129, 0266).
  out.saturate = easedToward(out.saturate, saturate, elapsed, over, SCREEN_SATURATE_REACH);
}
