/**
 * @role The rack offline: a scheduled bypass, an effect-owned lane, and one lane cycling on its
 * own length against a shorter loop.
 */
import { fail, RACK_RENDER_SECS, report } from "./harness.js";

/** Two 0.2s loop passes plus the transport lookahead, so the second pass is fully rendered. */
const LANE_RENDER_SECS = 0.9;
/** How closely two passes of one lane have to agree to be the same gesture played twice. */
const PASS_MATCH_DB = 1.5;
/** How much louder an unfiltered 733Hz sine has to be than the same sine through a 200Hz lowpass. */
const RACK_BYPASS_DB = 10;

export const renderRack = async ({ page }) => {
  // P4's offline half, on the existing page: the same rack commands through the same chain,
  // with an automation lane running, and a scheduled bypass that has to change the samples.
  // The render is its own control — the window before the bypass is the filtered one.
  const rackRender = await page.evaluate(async (secs) => {
    const result = await window.mulch.render({
      secs,
      envelopes: [
        { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs: 0.35 } },
        {
          t: "automation.set",
          deck: "a",
          param: "deck.gain",
          points: [
            { at: 0, value: 0.5 },
            { at: secs, value: 0.5 },
          ],
        },
        { t: "effect.add", deck: "a", id: "flt", effect: "filter" },
        { t: "effect.add", deck: "a", id: "dly", effect: "delay" },
        { t: "effect.reorder", deck: "a", instance: "dly", index: 0 },
        { t: "effect.remove", deck: "a", instance: "dly" },
        { t: "param.set", deck: "a", instance: "flt", param: "filter.cutoff", value: 200 },
        { t: "deck.play", deck: "a" },
        { at: 0.2, cmd: { t: "effect.bypass", deck: "a", instance: "flt", bypassed: true } },
      ],
    });
    const deck = result.probes.at(-1).probe.decks.a;
    return {
      effects: deck.effects.map((entry) => entry.effect).join(","),
      bypassed: deck.effects
        .filter((entry) => entry.bypassed)
        .map((entry) => entry.effect)
        .join(","),
      events: result.events.map((event) => event.t),
      // 0.1s fingerprint windows: [1] is fully filtered, [2] is after the bypass landed.
      windows: result.fingerprint.rmsDb,
      filteredDb: result.fingerprint.rmsDb[1],
      openDb: result.fingerprint.rmsDb[2],
    };
  }, RACK_RENDER_SECS);

  // P5's offline half: the same effect-owned lane through the same chain and the same
  // scheduling, proving a scheduled effect parameter renders as sound and not just as state.
  const cutoffRender = await page.evaluate(async (secs) => {
    const result = await window.mulch.render({
      secs,
      envelopes: [
        { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs } },
        { t: "effect.add", deck: "a", id: "flt", effect: "filter" },
        {
          t: "automation.set",
          deck: "a",
          instance: "flt",
          param: "filter.cutoff",
          // A lane exactly as long as the render, so what this measures is one cycle of it:
          // its own length is what it would otherwise repeat on (0035).
          points: [
            { at: 0, value: 60 },
            { at: 0.1, value: 60 },
            { at: 0.2, value: 18000 },
            { at: secs, value: 18000 },
          ],
        },
        { t: "deck.play", deck: "a" },
      ],
    });
    return {
      lane: result.probes.at(-1).probe.decks.a.effects[0].automation["filter.cutoff"].length,
      // 0.1s windows: [0] is under the closed filter, [3] is after the lane opened it.
      windows: result.fingerprint.rmsDb,
      closedDb: result.fingerprint.rmsDb[0],
      openDb: result.fingerprint.rmsDb[3],
    };
  }, RACK_RENDER_SECS);

  // P10's offline half: one lane against a loop four times shorter than it. The lane repeats on
  // its own length and on nothing else, so the windows below shut once every 0.4s while the
  // source goes round every 0.1s — armed per pass, the head of the lane would shut every pass
  // and the open windows would never open at all (0035).
  const cycleRender = await page.evaluate(async (secs) => {
    const session = (points) => ({
      secs,
      envelopes: [
        { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs: 0.4 } },
        { t: "deck.loop", deck: "a", in: 0, out: 0.1 },
        { t: "effect.add", deck: "a", id: "flt", effect: "filter" },
        { t: "param.set", deck: "a", instance: "flt", param: "filter.cutoff", value: 18000 },
        ...(points.length === 0
          ? []
          : [{ t: "automation.set", deck: "a", instance: "flt", param: "filter.cutoff", points }]),
        { t: "deck.play", deck: "a" },
      ],
    });
    const automated = await window.mulch.render(
      // Shut across the first 0.2s of the lane, open across the rest of it, and 0.4s long —
      // its own period, four times the loop's.
      session([
        { at: 0, value: 60 },
        { at: 0.2, value: 60 },
        { at: 0.22, value: 18000 },
        { at: 0.4, value: 18000 },
      ]),
    );
    const cleared = await window.mulch.render(session([]));
    return {
      // Reported whole, because a window that lands on an edge is the first thing to suspect.
      windows: automated.fingerprint.rmsDb,
      clearedWindows: cleared.fingerprint.rmsDb,
      // 0.1s windows, each one deep inside a state of the lane rather than on a boundary: the
      // master bus delays what is rendered against what was scheduled by a few hundred frames
      // (src/audio/deck.ts), so an edge lands inside the window after the one holding it.
      // [3] and [7] are the same offset into two cycles and have to agree; [5] is the middle of
      // the second cycle's shut half, five loop passes after the first, and has to be shut.
      openDb: automated.fingerprint.rmsDb[3],
      closedDb: automated.fingerprint.rmsDb[5],
      openAgainDb: automated.fingerprint.rmsDb[7],
      clearedDb: cleared.fingerprint.rmsDb[5],
      cycles: automated.events.filter((event) => event.t === "deck.looped").length,
    };
  }, LANE_RENDER_SECS);

  if (
    rackRender.effects !== "filter" ||
    rackRender.bypassed !== "filter" ||
    !rackRender.events.includes("effect.reordered") ||
    !rackRender.events.includes("effect.removed") ||
    !rackRender.events.includes("effect.bypass.changed")
  ) {
    fail(`offline rack does not match the live one — ${JSON.stringify(rackRender)}`);
  }

  if (cutoffRender.lane !== 4 || cutoffRender.openDb - cutoffRender.closedDb < RACK_BYPASS_DB) {
    fail(
      `a scheduled cutoff lane did not change the offline signal: ${cutoffRender.closedDb}dB ` +
        `closed, ${cutoffRender.openDb}dB open`,
      cutoffRender,
    );
  }
  report(
    "automation targets followed the rack: a knob recorded under Option on the filter's own lane, " +
      `which opened the offline render by ` +
      `${(cutoffRender.openDb - cutoffRender.closedDb).toFixed(1)}dB`,
  );
  // P10: a lane cycles on its own length, so the same offset into two of its cycles sounds alike
  // while the loop underneath goes round three times as often — and unlike the same session with
  // nothing scheduled at all (0035).
  if (cycleRender.cycles < 1) {
    fail(`the lane render never crossed its loop point — ${JSON.stringify(cycleRender)}`);
  }
  if (Math.abs(cycleRender.openDb - cycleRender.openAgainDb) > PASS_MATCH_DB) {
    fail(
      `one lane did not repeat on its own length: ${cycleRender.openDb}dB first cycle, ` +
        `${cycleRender.openAgainDb}dB second`,
      cycleRender,
    );
  }
  if (cycleRender.openDb - cycleRender.closedDb < RACK_BYPASS_DB) {
    fail(
      `the lane's second cycle did not close the filter again: ${cycleRender.closedDb}dB ` +
        `closed, ${cycleRender.openDb}dB open`,
      cycleRender,
    );
  }
  if (cycleRender.clearedDb - cycleRender.closedDb < RACK_BYPASS_DB) {
    fail(
      `the lane did not change the second cycle against the cleared session: ` +
        `${cycleRender.closedDb}dB automated, ${cycleRender.clearedDb}dB cleared`,
      cycleRender,
    );
  }
  report(
    `one gesture repeating on its own 0.4s against a 0.1s loop: ${cycleRender.openDb.toFixed(1)}dB ` +
      `and ${cycleRender.openAgainDb.toFixed(1)}dB open two cycles apart, ` +
      `${cycleRender.closedDb.toFixed(1)}dB shut between them against ` +
      `${cycleRender.clearedDb.toFixed(1)}dB cleared`,
  );

  if (rackRender.openDb - rackRender.filteredDb < RACK_BYPASS_DB) {
    fail(
      `a bypassed filter did not leave the offline signal path: ${rackRender.filteredDb}dB ` +
        `filtered, ${rackRender.openDb}dB after the bypass`,
      rackRender,
    );
  }
  report(
    `offline the same rack rose ` +
      `${(rackRender.openDb - rackRender.filteredDb).toFixed(1)}dB when its ` +
      "filter was bypassed",
  );
};
