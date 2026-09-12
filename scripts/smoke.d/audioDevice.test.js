import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AUDIO_DEVICE_ERROR,
  audioDeviceGone,
  clockIsStopped,
  clockReading,
  stoppedByDevice,
  STILL_MS,
  watchAudioDevice,
} from "./audioDevice.js";

/** A page that only does the two things this module asks of one: console events, and evaluate. */
const fakePage = (readings) => {
  const listeners = [];
  const left = [...readings];
  return {
    on: (event, listener) => {
      if (event === "console") listeners.push(listener);
    },
    say: (type, text) => {
      for (const listener of listeners) listener({ type: () => type, text: () => text });
    },
    evaluate: () =>
      left.length > 0 ? Promise.resolve(left.shift()) : Promise.reject(new Error("closed")),
  };
};

/**
 * Both reads of the clock, with the beat between them spent rather than waited out.
 * `advanceTimersByTimeAsync` flushes the microtask queue before it moves the clock, so the first
 * read's promise has resolved and the sleep is registered by the time the beat is spent.
 */
const spendTheBeat = async (asked) => {
  await vi.advanceTimersByTimeAsync(STILL_MS);
  return await asked;
};
const stoppedOrNot = (page) => spendTheBeat(clockIsStopped(page));

afterEach(() => vi.useRealTimers());

describe("audioDeviceGone", () => {
  it("names the machine, the reading, and what the wait was after", () => {
    expect(audioDeviceGone("the clock stopped at 0.0058s", 0.2558)).toBe(
      "the audio device is gone — the clock stopped at 0.0058s, short of 0.2558s, after Chromium " +
        "reported it lost the output device. This is the machine and not the change under test: " +
        "nothing that plays will advance until audio comes back.",
    );
  });

  it("says the same thing where nothing was waiting for a number", () => {
    expect(audioDeviceGone("the page stopped answering")).toBe(
      "the audio device is gone — the page stopped answering, after Chromium reported it lost " +
        "the output device. This is the machine and not the change under test: nothing that " +
        "plays will advance until audio comes back.",
    );
  });
});

describe("watchAudioDevice", () => {
  it("latches on the error Chromium prints when the device goes", () => {
    const page = fakePage([]);
    const lost = watchAudioDevice(page);
    expect(lost()).toBe(false);
    page.say("error", `The ${AUDIO_DEVICE_ERROR} from the audio device or the WebAudio renderer`);
    expect(lost()).toBe(true);
  });

  it("ignores every other thing a page says, however loudly", () => {
    const page = fakePage([]);
    const lost = watchAudioDevice(page);
    page.say("error", "Uncaught TypeError: probe is not a function");
    page.say("warning", `The ${AUDIO_DEVICE_ERROR} from the audio device or the WebAudio renderer`);
    expect(lost()).toBe(false);
  });
});

describe("clockIsStopped", () => {
  it("reports where a clock that read the same twice stopped", async () => {
    vi.useFakeTimers();
    expect(await stoppedOrNot(fakePage([0.0058, 0.0058]))).toBe(0.0058);
  });

  it("refuses to call a clock that moved stopped, device error or not", async () => {
    vi.useFakeTimers();
    expect(await stoppedOrNot(fakePage([0.0058, 0.5312]))).toBe(null);
  });
});

describe("stoppedByDevice", () => {
  it("asks the page nothing at all while the device is alive", async () => {
    const page = fakePage([]);
    expect(await stoppedByDevice(page, () => false)).toBe(null);
  });

  it("names where the clock stopped once the device is gone and it has", async () => {
    vi.useFakeTimers();
    const page = fakePage([0.0058, 0.0058]);
    expect(await spendTheBeat(stoppedByDevice(page, () => true))).toBe(
      "the clock stopped at 0.0058s",
    );
  });

  it("blames no live clock for a failure, whatever Chromium said about the device", async () => {
    vi.useFakeTimers();
    const page = fakePage([0.0058, 0.5312]);
    expect(await spendTheBeat(stoppedByDevice(page, () => true))).toBe(null);
  });

  it("leaves a page past answering to fail in its own words", async () => {
    vi.useFakeTimers();
    expect(await spendTheBeat(stoppedByDevice(fakePage([]), () => true))).toBe(null);
  });
});

describe("clockReading", () => {
  it("says where the clock stands", async () => {
    expect(await clockReading(fakePage([1.25]))).toBe("the clock stopped at 1.25s");
  });

  it("says so plainly when the page is past asking", async () => {
    expect(await clockReading(fakePage([]))).toBe("the page stopped answering");
  });
});
