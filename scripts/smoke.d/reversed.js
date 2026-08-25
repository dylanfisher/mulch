/**
 * @role What a jumping yard leaves in the heap after it has read its slots backwards: one reversed
 * copy of the deck's buffer, and not a second one per play (P121). A page of its own rather than
 * one more scenario on ./browser.js's, because that page is the gate's whole critical path and
 * this one counts buffers — it wants a heap nothing has decoded into and a wall clock nobody is
 * measuring on (plan §3).
 */
import { PLAYER_DEFAULTS } from "../../src/lib/playerCharacter.ts";
import { fail, liveCount, report } from "./harness.js";
import { openPage } from "./page.js";

/**
 * How many play/stop rounds, and how many buffers they may leave behind. One: a reversed landing
 * reads a reversed copy of the deck's buffer, and the copy is the deck's rather than the landing's
 * — made at the first landing that asks for one and held while the deck is playing that audio, so
 * a hundred rounds leave the same one.
 *
 * Five rather than one, and it is the whole assertion: at a single play a copy that accumulates
 * reads exactly like a copy that is held, so one round could not tell a leak from a cache.
 */
const CYCLES = 5;
const COPIES = 1;

/** How long a disposed buffer is given to actually go, and how often the poll asks (./leaks.js). */
const SETTLE_MS = 3_000;
const POLL_MS = 100;

/** The source the yard jumps around. Two seconds is 125ms a slot — a long way clear of the
 *  shortest slot that can carry a seam, so the deck jumps rather than playing its loop straight. */
const SOURCE_SECS = 2;

/**
 * The one buffer this instrument mints that no decode did. `AudioBuffer` is not counted in
 * ./leaks.js for the reason stated there — the decode cache holds buffers alive on purpose — and
 * here it can be: this page loads one generated source and then decodes nothing at all, so what
 * the count moves by across the rounds below is exactly what the player is *holding*.
 *
 * What that can see is a copy that accumulates — one kept per play, per step or per pass — and
 * what it cannot is a copy remade and dropped, since the collect before each count takes those
 * away again; that the copy is minted once per pass is asserted where the mints can be counted
 * (src/audio/playerLanding.test.ts). A yard that never jumped would move the count by none, which
 * is why the check is an equality rather than a ceiling.
 */
export const reversedBuffers = async (root) => {
  const session = await openPage(root);
  const { page } = session;
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.evaluate((secs) => {
      window.mulch.send({ t: "deck.load", deck: "a", source: { gen: "sine", hz: 440, secs } });
    }, SOURCE_SECS);
    await page.waitForFunction(() => window.mulch.probe().decks.a.duration > 0);
    const duration = await page.evaluate(() => window.mulch.probe().decks.a.duration);

    await cdp.send("HeapProfiler.collectGarbage");
    const before = await liveCount(cdp, "AudioBuffer.prototype");
    for (let cycle = 0; cycle < CYCLES; cycle += 1) {
      await page.evaluate(
        ({ player, out, seed }) => {
          // The whole clip as the loop, and the switch's own numbers with every landing reversed
          // — the defaults rather than a spec written here, so this asserts the pattern a hand
          // gets rather than one only the gate has ever played (principle 1). A fresh seed each
          // round, so what is measured is five patterns and not one re-armed.
          window.mulch.send({ t: "deck.loop", deck: "a", in: 0, out });
          window.mulch.send({
            t: "deck.player",
            deck: "a",
            player: { ...player, seed, reverse: 1 },
          });
          window.mulch.send({ t: "deck.play", deck: "a" });
        },
        { player: PLAYER_DEFAULTS, out: duration, seed: cycle + 1 },
      );
      await page.waitForFunction(() => window.mulch.probe().decks.a.playing === true);
      await page.evaluate(() => {
        window.mulch.send({ t: "deck.stop", deck: "a" });
      });
      await page.waitForFunction(() => window.mulch.probe().decks.a.playing === false);
    }

    let after = null;
    const settled = Date.now() + SETTLE_MS;
    for (;;) {
      await cdp.send("HeapProfiler.collectGarbage");
      after = await liveCount(cdp, "AudioBuffer.prototype");
      // Exactly, rather than at most: a count taken while some unrelated buffer's wrapper is still
      // on its way out reads low, and a low reading is what a settle is for. Only a delta that
      // stays wrong to the deadline is a failure.
      if (after - before === COPIES) break;
      if (Date.now() > settled) break;
      await page.waitForTimeout(POLL_MS);
    }
    if (after - before !== COPIES) {
      fail(
        `${CYCLES} plays of a reversed pattern left ${after - before} buffers alive, not ${COPIES}`,
        { before, after, cycles: CYCLES },
      );
    }
    report(
      `${CYCLES} plays of a pattern reading every landing backwards left the one reversed copy ` +
        `the deck holds (AudioBuffer ${before}→${after})`,
    );
  } finally {
    await cdp.detach();
    await session.close();
  }
};
