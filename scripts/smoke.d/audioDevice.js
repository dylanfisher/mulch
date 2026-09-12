/**
 * @role The machine's own fault, declared once: how Chromium says the audio output device is
 * gone, the one sentence every harness prints when it is, and the read that tells a stopped clock
 * from a slow one. Imported by the transport (../drive) and by the browser half (./browser.js) so
 * that a reader of the gate sees one cause, in one wording, once (0376).
 */

/**
 * What Chromium prints, once, when the output device or the WebAudio renderer errors — "The
 * AudioContext encountered an error from the audio device or the WebAudio renderer". Matched on
 * the middle of it: the sentence around it has been reworded between Chromium versions.
 */
export const AUDIO_DEVICE_ERROR = "AudioContext encountered an error";

/**
 * How long a clock is watched before it is called stopped. Long enough that a render quantum
 * (2.7ms at 48k) and a busy main thread cannot both hide inside it, short enough that finding out
 * costs a fraction of the minute the wait would otherwise run to.
 */
export const STILL_MS = 500;

/**
 * The one sentence. `wanted` is the clock reading a wait was after, where there is one — the
 * transport waits for a number and the browser half's lanes do not, and both say the same thing
 * about the machine either way.
 */
export const audioDeviceGone = (stopped, wanted) =>
  `the audio device is gone — ${stopped}${wanted === undefined ? "" : `, short of ${wanted}s`}, ` +
  `after Chromium reported it lost the output device. This is the machine and not the change ` +
  `under test: nothing that plays will advance until audio comes back.`;

/**
 * Whether Chromium has told this page its output device is gone. Attached before the page is
 * navigated — the error arrives as the app creates its context, which is before any caller of
 * this gets its hands on the page. The flag only ever goes up: the device does not come back
 * inside one run, and a run that saw it once has nothing left that can play.
 */
export const watchAudioDevice = (page) => {
  let lost = false;
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes(AUDIO_DEVICE_ERROR)) lost = true;
  });
  return () => lost;
};

/**
 * The instrument's clock, read twice a beat apart: the same reading both times is a clock that
 * has stopped, and the reading is returned so the failure can say where it stopped. A clock that
 * moved returns null — Chromium having reported the device once is not by itself proof that
 * nothing is rendering, and only a clock that is not moving makes a wait on it hopeless.
 */
export const clockIsStopped = async (page) => {
  const before = await page.evaluate(() => window.mulch.stats().at);
  await new Promise((slept) => {
    setTimeout(slept, STILL_MS);
  });
  const after = await page.evaluate(() => window.mulch.stats().at);
  return after === before ? after : null;
};

/** Where the clock stands, in the words a failure uses — including when the page is past asking. */
export const clockReading = (page) =>
  page
    .evaluate(() => window.mulch.stats().at)
    .then(
      (at) => `the clock stopped at ${at}s`,
      () => "the page stopped answering",
    );

/**
 * Whether this page's clock has stopped under a device Chromium says it lost, and where it
 * stopped — the one question the browser half asks about the machine, asked the same way by every
 * page that asks it: before a lane starts, after one fails, and by the reversed-buffer page beside
 * them. Both halves matter. The error alone is not a stopped clock, and a page that blames a live
 * device sends a reader to look at their sound card instead of at the diff — a hosted runner that
 * merely ran out of clock (0330) included. A live device pays a boolean and no round trip; a page
 * past answering reads as null and fails in its own words, as it always did.
 */
export const stoppedByDevice = async (page, deviceLost) => {
  if (!deviceLost()) return null;
  const at = await clockIsStopped(page).catch(() => null);
  return at === null ? null : `the clock stopped at ${at}s`;
};

/**
 * A page abandoned because the machine's audio went away rather than because it read the page and
 * disagreed with it. It carries the whole sentence, and `browser.js` prints no page beside it:
 * a probe of a page whose clock is stopped says the same thing in three hundred lines.
 */
export class AudioDeviceGone extends Error {}
