/**
 * @role How much of a row is in the picture at all: how long one takes to join it or to leave it,
 *   and the one step that carries it either way. The fourth accumulated number in the drift, beside
 *   the ground the rows stand on, the plane the structure travels across and the ink the picture is
 *   drawn in — and the one that says a row is *arriving* rather than where it has got to.
 * @instead What a row is once every dimension has reached it → src/lib/moire.ts, whose one eased
 *   motion this spends rather than restates. Where the share is actually spent — how deep a row
 *   cuts and what the picture weighs → `washedDepth` in src/lib/moireSound.ts and `drawnGratings`
 *   in src/ui/moireCanvas.ts. Keeping a share across a rebuilt set, and holding a row that has left
 *   in the picture until it has finished leaving → src/ui/moireCarry.ts.
 */
import { easedToward } from "./moire.ts";

/**
 * How long a row takes to join the picture, or to leave it, in seconds. **The same length the wind
 * takes to turn** (`DRIFT_WIND_SECS`, src/ui/moireWind.ts) and for the same reason: an effect
 * added or retired is one event, and the picture answers it with one motion — the field turns, and
 * the row fades up inside that turn rather than snapping in ahead of it. Declared rather than
 * derived because they are two facts that agree: a wind's is how long a whole reversal takes and
 * this is how long a whole row takes, and either may be tuned without the other.
 *
 * Six seconds is far outside a frame and well inside the twenty an automator's place stands for, so
 * a run laying and retiring places draws one continuous population rather than a picture that
 * restacks at every turnover.
 */
export const DRIFT_ARRIVAL_SECS = 6;

/**
 * The whole travel a share has: nothing to wholly. Named because `easedToward` is stated as a whole
 * reach in `over` seconds and the reach is what makes that sentence mean anything (0266).
 */
const ARRIVAL_REACH = 1;

/**
 * Where a row's share stands one step on: toward the whole of it while it is in the picture, and
 * toward nothing at all once it has left. One `easedToward` and nothing else, at the rate a whole
 * arrival takes `over` seconds — so a rack of six losing one loses a sixth of the picture's weight
 * over six seconds rather than between two frames.
 *
 * Rate and not a fraction of the gap, for `easedCentre`'s reason: an exponential never arrives, and
 * a row that never quite finished leaving would be carried through every rebuild for ever.
 *
 * **Arrives outright where there is no clock to travel against**, which is the answer the ink and
 * the wind both give a halted yard (0144, 0266): a picture nothing is sounding under is painted on
 * a commit, so a share timed against a clock that is not running would strand every row it had not
 * finished admitting.
 */
export const arrivedInto = (
  share: number,
  leaving: boolean,
  elapsed: number,
  over: number,
): number => easedToward(share, leaving ? 0 : 1, elapsed, over, ARRIVAL_REACH);

/**
 * And whether a row is in the picture at all. **The one test three readers share** — what the
 * picture weighs, how deep the row cuts and which row's claim carries the ink — because a row that
 * has wholly left may not weigh, cut or vote, and three spellings of "wholly left" could disagree
 * (principle 1).
 */
export const arrived = (share: number): boolean => share > 0;
