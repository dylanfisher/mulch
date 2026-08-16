/**
 * @role Rate and seek offline: what each of them moves about a pass, and what neither of them is
 * allowed to.
 */
import { fail, report } from "./harness.js";

/** Above this an RMS window still holds the source rather than the silence after it. */
const RATE_SOUNDING_DB = -60;
/** How far the peak may move across a rate change. Reading faster is not reading louder. */
const RATE_PEAK_DB = 0.5;
/** Six fingerprint windows, so a source that ends at 0.1s and one that ends at 0.4s differ. */
const RATE_RENDER_SECS = 0.6;
/** Short enough that 2x empties it inside one window and 0.5x is still sounding at the end. */
const RATE_SOURCE_SECS = 0.2;
/** Long enough that a seek at 0.15s has plenty left to move, in either direction. */
const SEEK_SOURCE_SECS = 0.3;

export const renderRate = async ({ page }) => {
  // P14's offline half: the same source, the same commands, at three speeds. Length and peak
  // are the two things a rate is supposed to move and not move — a 2x deck consumes its buffer
  // in half the wall time and comes out exactly as loud (0031). The loop render is the cycle
  // time tracking rate, including a speed change made while the loop is going round.
  const rateRender = await page.evaluate(
    async ({ secs, source }) => {
      const at = (speed) => ({
        secs,
        envelopes: [
          { t: "deck.load", deck: "a", source: { gen: "sine", hz: 440, secs: source } },
          { t: "param.set", deck: "a", param: "deck.speed", value: speed },
          { t: "deck.play", deck: "a" },
        ],
      });
      const [half, one, two] = await Promise.all([
        window.mulch.render(at(0.5)),
        window.mulch.render(at(1)),
        window.mulch.render(at(2)),
      ]);
      const loop = async (speed, change) => {
        const rendered = await window.mulch.render({
          secs,
          envelopes: [
            { t: "deck.load", deck: "a", source: { gen: "sine", hz: 440, secs: source } },
            { t: "deck.loop", deck: "a", in: 0, out: 0.1 },
            { t: "param.set", deck: "a", param: "deck.speed", value: speed },
            { t: "deck.play", deck: "a" },
            ...(change === null
              ? []
              : [
                  {
                    at: change.at,
                    cmd: { t: "param.set", deck: "a", param: "deck.speed", value: change.to },
                  },
                ]),
          ],
        });
        const started = rendered.events.find((event) => event.t === "deck.started");
        return {
          started: started?.at ?? null,
          cycles: rendered.events
            .filter((event) => event.t === "deck.looped")
            .map((event) => ({ cycle: event.cycle, at: event.at })),
        };
      };
      return {
        peakDb: [half.fingerprint.peakDb[0], one.fingerprint.peakDb[0], two.fingerprint.peakDb[0]],
        rmsDb: [half.fingerprint.rmsDb, one.fingerprint.rmsDb, two.fingerprint.rmsDb],
        speed: two.probes.at(-1).probe.decks.a.params["deck.speed"],
        slowLoop: await loop(0.5, null),
        fastLoop: await loop(2, null),
        changedLoop: await loop(1, { at: 0.25, to: 2 }),
      };
    },
    { secs: RATE_RENDER_SECS, source: RATE_SOURCE_SECS },
  );

  // P17's offline half: a seek mid-pass, which is the same command a click on the waveform
  // sends. The control is the identical session without one, so what is measured is only what
  // the seek moved — how much of the source is left to sound, and where the restart began.
  const seekRender = await page.evaluate(
    async ({ secs, source }) => {
      const seeking = (moves) =>
        window.mulch.render({
          secs,
          // Inside the restart the seek causes: the old source is halted and the new one is
          // still in the lookahead, which is the one window where a held position written over
          // a restart would make a playing deck read as paused (0041).
          probes: [0.17],
          envelopes: [
            { t: "deck.load", deck: "a", source: { gen: "sine", hz: 440, secs: source } },
            { t: "deck.play", deck: "a" },
            ...moves.map((position) => ({
              at: 0.15,
              cmd: { t: "deck.seek", deck: "a", position },
            })),
          ],
        });
      const [straight, back, forward] = await Promise.all([
        seeking([]),
        seeking([0]),
        seeking([0.25]),
      ]);
      return {
        rmsDb: [straight.fingerprint.rmsDb, back.fingerprint.rmsDb, forward.fingerprint.rmsDb],
        // What the session held mid-restart: a deck moving to a new offset, not a held one.
        restarting: forward.probes[0].probe.decks.a.paused,
        // Every start the graph reported, in order: the play, then the restart the seek caused.
        offsets: [straight, back, forward].map((rendered) =>
          rendered.events
            .filter((event) => event.t === "deck.started")
            .map((event) => event.offset),
        ),
      };
    },
    { secs: RATE_RENDER_SECS, source: SEEK_SOURCE_SECS },
  );

  // P14: a rate is the one thing that changes how long a buffer takes and not how loud it is.
  // Windows are 0.1s (src/lib/fingerprint.ts); the source is 0.2s and starts after the lookahead,
  // so it is spent by window 1 at 2x, by window 2 at 1x, and still sounding at window 3 at 0.5x.
  const rate = rateRender;
  const sounding = (windows) => windows.filter((db) => db > RATE_SOUNDING_DB).length;
  const [halfWindows, oneWindows, twoWindows] = rate.rmsDb;
  if (
    !(sounding(twoWindows) < sounding(oneWindows) && sounding(oneWindows) < sounding(halfWindows))
  ) {
    fail(`rate did not change how long the buffer took — ${JSON.stringify(rate.rmsDb)}`);
  }
  if (rate.speed !== 2) fail(`deck.speed did not reach the session — saw ${rate.speed}`);
  const [halfPeak, onePeak, twoPeak] = rate.peakDb;
  if (Math.abs(halfPeak - onePeak) > RATE_PEAK_DB || Math.abs(twoPeak - onePeak) > RATE_PEAK_DB) {
    fail(`rate changed the peak: ${JSON.stringify(rate.peakDb)}`);
  }

  /** The wall-clock seconds between consecutive boundaries, which is period / rate. */
  const cycleGaps = (loop) =>
    loop.cycles.slice(1).map((entry, index) => entry.at - loop.cycles[index].at);
  for (const [name, loop, expected] of [
    ["0.5x", rate.slowLoop, 0.2],
    ["2x", rate.fastLoop, 0.05],
  ]) {
    loop.cycles.forEach((entry, index) => {
      if (entry.cycle !== index + 1) {
        fail(`${name} loop cycles are not consecutive — saw ${entry.cycle} at ${index}`);
      }
    });
    if (loop.cycles.length < 2) fail(`${name} loop reported ${loop.cycles.length} cycles`);
    for (const gap of cycleGaps(loop)) {
      if (Math.abs(gap - expected) > 0.001) {
        fail(`${name} loop reported a ${gap.toFixed(4)}s cycle, expected ${expected}s`);
      }
    }
  }

  // The rate changed while the loop was going round: the boundaries keep counting up without a
  // repeat or a gap, and they simply start arriving twice as often (0031).
  const spedUp = rate.changedLoop;
  spedUp.cycles.forEach((entry, index) => {
    if (entry.cycle !== index + 1) {
      fail(`a loop sped up mid-flight lost its count — ${JSON.stringify(spedUp.cycles)}`);
    }
  });
  const changedGaps = cycleGaps(spedUp);
  if (Math.abs(changedGaps[0] - 0.1) > 0.001 || Math.abs(changedGaps.at(-1) - 0.05) > 0.001) {
    fail(`a loop sped up mid-flight did not track the new rate — ${JSON.stringify(changedGaps)}`);
  }
  report(
    `the same 0.2s source spent ${sounding(twoWindows)}, ${sounding(oneWindows)} and ` +
      `${sounding(halfWindows)} windows at 2x, 1x and 0.5x, at one peak within ${RATE_PEAK_DB}dB; ` +
      `a 0.1s loop reported cycles every ${cycleGaps(rate.fastLoop)[0].toFixed(3)}s at 2x and ` +
      "kept counting through a speed change made while it was going round",
  );

  const seekPasses = seekRender;
  const [straightWindows, backWindows, forwardWindows] = seekPasses.rmsDb;
  if (
    !(
      sounding(forwardWindows) < sounding(straightWindows) &&
      sounding(straightWindows) < sounding(backWindows)
    )
  ) {
    fail(`a seek did not move the playhead — ${JSON.stringify(seekPasses.rmsDb)}`);
  }
  if (
    seekPasses.offsets[0].length !== 1 ||
    JSON.stringify(seekPasses.offsets[1]) !== JSON.stringify([0, 0]) ||
    JSON.stringify(seekPasses.offsets[2]) !== JSON.stringify([0, 0.25])
  ) {
    fail(`a seek did not restart from its own offset — ${JSON.stringify(seekPasses.offsets)}`);
  }
  // Seeking a playing deck is not pausing it: the restart's own stop and start reports are what
  // move `paused`, so nothing is held while the new source waits out the lookahead (0041).
  if (seekPasses.restarting !== null) {
    fail(`a seek held a playing deck's playhead — saw ${seekPasses.restarting}`);
  }
  report(
    `a seek mid-pass restarted from ${seekPasses.offsets[2][1]}s and left ` +
      `${sounding(forwardWindows)} windows sounding against ${sounding(straightWindows)} untouched ` +
      `and ${sounding(backWindows)} seeked back`,
  );
};
