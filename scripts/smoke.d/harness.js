/**
 * @role What every scenario of the browser half shares: the failure they raise, the claims they
 * make, and the two tolerances more than one of them reads.
 */

/**
 * How long anything in the browser half waits before it is a failure. Playwright's own default is
 * 30s, which is thirty seconds of nothing per blind round trip; every wait here is sub-second in
 * a passing run, and the ones that legitimately take longer — attach, decode, the analysis worker
 * — carry their own longer timeout at the call.
 */
export const WAIT_MS = 15_000;

/** How long the parity render is, and the two-deck render that shares its windows. */
export const PARITY_RENDER_SECS = 0.25;
/** How long a render that arranges a rack is: long enough for a scheduled bypass to land. */
export const RACK_RENDER_SECS = 0.4;

/**
 * A failed assertion inside the browser half. Thrown rather than exited on: the six drive runs
 * beside this browser have already finished, and taking the process down here would lose their
 * assertions too — six results nobody asked to lose, for one failure. `browser.js` prints this
 * whole thing, and the sentinel it returns fails the run where the browser claims are read.
 *
 * `evidence` is everything the failing assertion had, printed whole. A dB threshold names the two
 * numbers that tripped it, and those two never say whether a window simply landed on an edge —
 * the master bus delays rendered audio against the schedule that made it (DeckReport,
 * src/audio/deck.ts), so a boundary reads shallow while the gesture is perfectly correct.
 */
export class SmokeFailure extends Error {
  constructor(message, evidence) {
    super(message);
    this.evidence = evidence;
  }
}

/** The `fail()` a scenario asserts with: everything it had, and out of the browser half. */
export const fail = (message, evidence) => {
  throw new SmokeFailure(message, evidence);
};

/** Two animation frames that put a control in the same place — Playwright's own stability test. */
const atRest = (locator) =>
  locator.evaluate(
    (element) =>
      new Promise((rest) => {
        let last = null;
        const frame = () => {
          const { x, y } = element.getBoundingClientRect();
          const here = `${x},${y}`;
          if (here === last) {
            rest();
            return;
          }
          last = here;
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );

/**
 * Where a control is, once it has stopped moving. A gesture driven through `page.mouse` aims at
 * coordinates measured earlier, and nothing promises they still point at the control: a
 * `locator.click()` waits for the box to hold still, raw mouse input cannot. The viewport is what
 * moves — Chromium animates a keyboard scroll, and Space pressed on a route that does not claim
 * the key starts one that outlives the route change, so it is still running when the next
 * scenario measures. Rest is read on both sides of the scroll into view, because scrolling
 * interrupts such an animation without ending it: Chromium resumes what is left of it afterwards.
 *
 * It scrolls, so it is the FIRST measurement a scenario takes and not the third: boxes taken
 * before it are measured against a viewport it may still move, and a second call for a control
 * already on screen is a no-op that cannot put the first one back. Settle once, then measure the
 * rest of the geometry plainly against the viewport this left at rest.
 *
 * `what` names the control in the failure, because a scenario that cannot find its own target
 * should say which one rather than that some control was missing (0036).
 */
export const settledBox = async (locator, what = "a settled control") => {
  await atRest(locator);
  await locator.scrollIntoViewIfNeeded();
  await atRest(locator);
  const box = await locator.boundingBox();
  if (box === null) fail(`${what} has no browser bounds`);
  return box;
};

/**
 * One line of the summary a passing run prints, written where the assertions that earned it are.
 * The browser half's claims are collected here rather than in `scripts/smoke`'s own list because
 * these are made while the six drive runs are still going: the entry point appends them where it
 * reads the browser's result, so the summary stays in the order the assertions read in.
 */
/**
 * The same loop, read back somewhere else. Every recall path — the saved snapshot, the reload, the
 * archive round trip — has to bring back exactly the loop that was chosen (0025).
 */
export const sameLoop = (a, b) => a !== null && b !== null && a.in === b.in && a.out === b.out;

export const browserClaims = [];
export const report = (claim) => browserClaims.push(claim);
