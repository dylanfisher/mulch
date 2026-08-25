/** @role What a rack leaves in the heap after it has been emptied — nodes, DOM and listeners. */
import { fail, liveCount, report } from "./harness.js";

/** How many add/remove rounds. Enough that a per-round leak is unmistakable, few enough to be free. */
const CYCLES = 5;
/**
 * How long a disposed node is given to actually go. A Web Audio node's wrapper is released by
 * Blink, not by the JS heap alone, so the drop can trail the `effect.remove` by a render quantum
 * or two — measured here as converging on the very first sample, but polled rather than asserted
 * once so a slower machine reads as slow instead of as broken. Only a real leak pays the whole
 * deadline, and only when it is already failing.
 */
const SETTLE_MS = 3_000;
const POLL_MS = 100;
/**
 * How many DOM nodes and listeners the run may differ by. Not zero: React keeps its own pooled
 * bookkeeping and the page paints between the two reads, so a couple either way is the page being
 * a page. A leak is per-cycle and shows up as tens, not as two.
 */
const SLACK = 8;

/**
 * The two effects the cycles build with, and the prototypes each one puts in the heap. `filter`
 * builds a BiquadFilterNode and `delay` a DelayNode (src/audio/effects/), so counting instances of
 * those two prototypes counts the graph those effects left behind — without the rack, the engine
 * or `window.mulch` having to expose a handle that exists only for this test.
 */
const PROTOTYPES = [
  ["filter", "BiquadFilterNode.prototype"],
  ["delay", "DelayNode.prototype"],
];

/** Has everything the cycles built gone again? Declared here so the poll loop closes over nothing. */
const released = (before, after) => PROTOTYPES.every(([effect]) => after[effect] <= before[effect]);

const liveNodes = async (cdp) => {
  const counts = {};
  for (const [effect, expression] of PROTOTYPES) counts[effect] = await liveCount(cdp, expression);
  return counts;
};

/**
 * Every disposal path in the instrument is written to release, and until now nothing proved any of
 * them does. A leaked node is invisible to every other assertion here — the fingerprint still
 * matches, the probe still agrees, the ring is still gapless — and it is the one failure that
 * only shows up after an hour of use, as drift and then as underruns. So: fill a rack, empty it,
 * five times, and ask the heap what is left.
 *
 * The cycles are driven by commands rather than by the rack's own buttons. `rack.js` already
 * proves the controls send what they claim; what is under test here is the graph underneath, and
 * the rows still mount and unmount either way because the UI is derived from the same state. It
 * is also much the cheaper of the two, which is what keeps this inside the gate's step size
 * ([0012](../../docs/decisions/0012-no-one-feature-jumps-the-gate.md)).
 *
 * `AudioBuffer` is deliberately not counted here. The decode cache holds buffers alive on purpose
 * (DECODE_CACHE_LIMIT, src/audio/decodeCache.ts), so asserting on them would write that cache's
 * eviction schedule into a leak test and fail the first time the limit changed. Buffers are for
 * ./scripts/profile, where a human reads a number rather than a gate tripping over one — and for
 * ./reversed.js, which counts them on a page of its own, where nothing has decoded since the one
 * source it loaded (P121).
 */
export const leaks = async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Performance.enable");
    const performanceBefore = await cdp.send("Performance.getMetrics");
    await cdp.send("HeapProfiler.collectGarbage");
    const before = await liveNodes(cdp);
    // This runs last, on the page every scenario before it has been building on, so deck a's rack
    // arrives holding whatever they left. It is emptied first, deliberately: removing the last
    // effect in a rack is a different path from removing one of several — the rack goes back to
    // passing its input straight through — and a churn that never empties never walks it. Nothing
    // runs after this scenario, so there is no state left for it to disturb.
    await page.evaluate(() => {
      for (const entry of window.mulch.probe().decks.a.effects) {
        window.mulch.send({ t: "effect.remove", deck: "a", instance: entry.id });
      }
    });
    await page.waitForFunction(() => window.mulch.probe().decks.a.effects.length === 0);
    const held = 0;

    for (let cycle = 0; cycle < CYCLES; cycle += 1) {
      const ids = ["filter", "delay"].map((effect) => `leak-${cycle}-${effect}`);
      await page.evaluate((round) => {
        for (const effect of ["filter", "delay"]) {
          window.mulch.send({ t: "effect.add", deck: "a", effect, id: `leak-${round}-${effect}` });
        }
      }, cycle);
      await page.waitForFunction(
        (expected) => window.mulch.probe().decks.a.effects.length === expected,
        held + 2,
      );
      await page.evaluate((instances) => {
        for (const instance of instances) {
          window.mulch.send({ t: "effect.remove", deck: "a", instance });
        }
      }, ids);
      await page.waitForFunction(
        (expected) => window.mulch.probe().decks.a.effects.length === expected,
        held,
      );
    }

    let after = null;
    const settled = Date.now() + SETTLE_MS;
    for (;;) {
      await cdp.send("HeapProfiler.collectGarbage");
      after = await liveNodes(cdp);
      if (released(before, after)) break;
      if (Date.now() > settled) break;
      await page.waitForTimeout(POLL_MS);
    }

    const leaked = PROTOTYPES.filter(([effect]) => after[effect] > before[effect]);
    if (leaked.length > 0) {
      fail(
        `${CYCLES} rack add/remove cycles left ${leaked
          .map(([effect]) => `${after[effect] - before[effect]} ${effect}`)
          .join(" and ")} nodes alive in the heap`,
        { before, after, cycles: CYCLES },
      );
    }
    report(
      `${CYCLES} rack add/remove cycles left no filter or delay nodes alive in the heap ` +
        `(filter ${before.filter}→${after.filter}, delay ${before.delay}→${after.delay})`,
    );

    const performanceAfter = await cdp.send("Performance.getMetrics");
    const metric = (metrics, name) => metrics.metrics.find((entry) => entry.name === name)?.value;
    // Nodes and listeners, not bytes. A heap-size threshold in a gate is a false-positive machine
    // — it moves with the collector's mood — while a listener that was added and never removed is
    // a discrete count that only ever grows for one reason.
    const counters = ["Nodes", "JSEventListeners", "Documents"].map((name) => ({
      name,
      before: metric(performanceBefore, name),
      after: metric(performanceAfter, name),
    }));
    const grown = counters.filter((entry) => entry.after - entry.before > SLACK);
    if (grown.length > 0) {
      fail(
        `${CYCLES} rack add/remove cycles left ${grown
          .map((entry) => `${entry.after - entry.before} extra ${entry.name}`)
          .join(" and ")} behind`,
        counters,
      );
    }
    report(
      "and nothing the DOM kept: " +
        counters.map((entry) => `${entry.name} ${entry.after - entry.before}`).join(", "),
    );
  } finally {
    await cdp.detach();
  }
};
