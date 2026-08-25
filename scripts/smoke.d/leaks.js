/**
 * @role What a rack leaves in the heap after it has been emptied — nodes, DOM and listeners — and
 *   what a jumping yard leaves after it has read its slots backwards.
 */
import { fail, report } from "./harness.js";

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

/**
 * Counting live instances of a prototype is three CDP calls and one release that matters more than
 * the three: `Runtime.queryObjects` hands back an array holding every object it found, and that
 * array is itself a strong reference. Left unreleased it becomes the retainer that makes the next
 * count wrong — the answer is inflated by exactly the objects the previous question asked about.
 * Hence the `finally`.
 */
const liveCount = async (cdp, expression) => {
  const { result } = await cdp.send("Runtime.evaluate", { expression });
  let objects;
  try {
    ({ objects } = await cdp.send("Runtime.queryObjects", { prototypeObjectId: result.objectId }));
    const counted = await cdp.send("Runtime.callFunctionOn", {
      objectId: objects.objectId,
      functionDeclaration: "function () { return this.length }",
      returnByValue: true,
    });
    return counted.result.value;
  } finally {
    if (objects !== undefined) {
      await cdp.send("Runtime.releaseObject", { objectId: objects.objectId });
    }
    await cdp.send("Runtime.releaseObject", { objectId: result.objectId });
  }
};

/** Has everything the cycles built gone again? Declared here so the poll loop closes over nothing. */
const released = (before, after) => PROTOTYPES.every(([effect]) => after[effect] <= before[effect]);

const liveNodes = async (cdp) => {
  const counts = {};
  for (const [effect, expression] of PROTOTYPES) counts[effect] = await liveCount(cdp, expression);
  return counts;
};

/**
 * How many play/stop rounds the reversed pattern is asked for, and how many buffers it may leave.
 * One: a reversed landing reads a reversed copy of the deck's buffer, and the copy is the deck's
 * rather than the landing's — made at the first landing that asks for one and held while the deck
 * is playing that audio, so a hundred rounds leave the same one (P121).
 */
const REVERSE_CYCLES = 5;
const REVERSED_COPIES = 1;

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
 * `AudioBuffer` is deliberately not counted **over those cycles**. The decode cache holds buffers
 * alive on purpose (DECODE_CACHE_LIMIT, src/audio/decodeCache.ts), so asserting on them would
 * write that cache's eviction schedule into a leak test and fail the first time the limit changed.
 * Buffers are for ./scripts/profile, where a human reads a number rather than a gate tripping over
 * one. The reversed round at the end is the exception the same sentence allows: it decodes
 * nothing, so the count either side of it is the cache standing still and the difference is the
 * player's own copy (P121).
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

    /**
     * And the one buffer the instrument mints that no decode did. `AudioBuffer` is not in the
     * prototype list above for the reason stated there — the decode cache holds buffers alive on
     * purpose — but nothing decodes inside the rounds below, so what the count moves by across
     * them is exactly what the player is *holding*: the deck's one reversed copy. What this can
     * see is a copy that accumulates — one kept per play, per step or per pass — and what it
     * cannot is a copy remade and dropped, since the collect before each count takes those away
     * again; that the copy is minted once per pass is asserted where the mints can be counted
     * (src/audio/playerLanding.test.ts). A yard that never jumped would move the count by none,
     * which is why the check below is an equality rather than a ceiling (P121).
     */
    const yard = await page.evaluate(() => {
      const deck = window.mulch.probe().decks.a;
      return { duration: deck.duration, player: deck.player };
    });
    if (yard.player === null) {
      fail("the reversed-buffer round needs the yard ./playerRate.js leaves holding a pattern");
    }
    await cdp.send("HeapProfiler.collectGarbage");
    const buffersBefore = await liveCount(cdp, "AudioBuffer.prototype");
    for (let cycle = 0; cycle < REVERSE_CYCLES; cycle += 1) {
      await page.evaluate(
        ({ player, duration, seed }) => {
          // The whole clip, so the grid's slots are long enough to seam whatever the scenarios
          // before this one left the loop at, and a fresh seed each round so the pattern is not
          // the same one re-armed.
          window.mulch.send({ t: "deck.loop", deck: "a", in: 0, out: duration });
          window.mulch.send({
            t: "deck.player",
            deck: "a",
            player: { ...player, seed, reverse: 1, drop: 0, rest: 0 },
          });
          window.mulch.send({ t: "deck.play", deck: "a" });
        },
        { player: yard.player, duration: yard.duration, seed: cycle + 1 },
      );
      await page.waitForFunction(() => window.mulch.probe().decks.a.playing === true);
      await page.evaluate(() => {
        window.mulch.send({ t: "deck.stop", deck: "a" });
      });
      await page.waitForFunction(() => window.mulch.probe().decks.a.playing === false);
    }
    let buffersAfter = null;
    const copied = Date.now() + SETTLE_MS;
    for (;;) {
      await cdp.send("HeapProfiler.collectGarbage");
      buffersAfter = await liveCount(cdp, "AudioBuffer.prototype");
      // Exactly, rather than at most: a count taken while some unrelated buffer's wrapper is
      // still on its way out reads low, and a low reading is what a settle is for. Only a delta
      // that stays wrong to the deadline is a failure.
      if (buffersAfter - buffersBefore === REVERSED_COPIES) break;
      if (Date.now() > copied) break;
      await page.waitForTimeout(POLL_MS);
    }
    if (buffersAfter - buffersBefore !== REVERSED_COPIES) {
      fail(
        `${REVERSE_CYCLES} plays of a reversed pattern left ` +
          `${buffersAfter - buffersBefore} buffers alive, not ${REVERSED_COPIES}`,
        { before: buffersBefore, after: buffersAfter, cycles: REVERSE_CYCLES },
      );
    }
    report(
      `${REVERSE_CYCLES} plays of a pattern reading every landing backwards left the one ` +
        `reversed copy the deck holds (AudioBuffer ${buffersBefore}\u2192${buffersAfter})`,
    );
  } finally {
    await cdp.detach();
  }
};
