/** @role The same origin reloaded, and the session that comes back to it by itself. */
import { fail, report, sameLoop } from "./harness.js";
import { SURFACE_ONSETS } from "./surface.js";

export const reload = async ({ page, state }) => {
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => "mulch" in window, undefined, { timeout: 15_000 });
  // Analysis is re-derived by the restored load, not read back from storage (0025).
  await page.waitForFunction(
    (onsets) => window.mulch.probe().decks.b.analysis?.onsets.length === onsets,
    SURFACE_ONSETS,
    { timeout: 15_000 },
  );
  const restored = await page.evaluate(async () => {
    const instrument = window.mulch;
    const probe = instrument.probe();
    const before = probe.decks.a;
    const started = Promise.race([
      new Promise((resolve) => {
        const off = instrument.on((event) => {
          if (event.t !== "deck.started" || event.deck !== "a") return;
          off();
          resolve(event);
        });
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("timed out waiting for restored deck.started"));
        }, 5_000);
      }),
    ]);
    instrument.send({ t: "deck.play", deck: "a" });
    await started;
    instrument.send({ t: "deck.stop", deck: "a" });
    const ring = instrument.ring();
    return {
      before,
      activeDeck: probe.activeDeck,
      restored: ring.some((event) => event.t === "session.restored"),
      discarded: ring.filter((event) => event.t === "session.discarded"),
      gapless: ring.every((event, index) => event.seq === index),
      automation: before.automation["deck.gain"],
      loop: probe.decks.b.loop,
      bpm: probe.decks.b.analysis?.bpm,
    };
  });

  if (
    restored.before.source?.blobId !== state.kept ||
    restored.before.duration <= 0 ||
    restored.before.playing !== false ||
    restored.before.params["deck.gain"] !== 0.4 ||
    restored.before.effects.map((entry) => entry.effect).join(",") !== "filter" ||
    !restored.before.effects.every((entry) => entry.bypassed) ||
    restored.automation?.length <= 1
  ) {
    fail(`persistence smoke: restored deck is wrong — ${JSON.stringify(restored.before)}`);
  }
  if (!restored.restored) fail("persistence smoke: session.restored was not emitted");
  if (restored.discarded.length > 0) {
    fail(`persistence smoke: stored session was discarded — ${JSON.stringify(restored.discarded)}`);
  }
  if (restored.activeDeck !== "b") {
    fail("persistence smoke: active deck was not restored");
  }
  if (!restored.gapless) fail("persistence smoke: restored event ring has a seq gap");
  report(
    "session blob bytes persisted, garbage collected, restored stopped, and played after reload",
  );

  if (!sameLoop(restored.loop, state.beat)) {
    fail(`a fresh-browser restore lost the chosen loop — ${JSON.stringify(restored.loop)}`);
  }
  if (restored.bpm !== state.beats.bpm) {
    fail(`analysis was not re-derived on restore — ${restored.bpm}bpm`);
  }
};
