/**
 * @role One preview server, one Chromium, one page with the instrument attached — the setup both
 * the smoke's browser half and ./scripts/profile need, owned here so neither has a second copy of
 * it.
 */
import { chromium } from "playwright";

import { encodeWav } from "../../src/lib/wav.ts";
import { WAIT_MS } from "./harness.js";

/**
 * Opens the preview build in a real headless Chromium and waits for `window.mulch`. It stops
 * there deliberately: what gets loaded onto a deck is the caller's business, because the smoke
 * wants a known blob every later scenario measures against and the profiler wants whatever it is
 * about to profile. `close()` is the whole teardown, so a caller's `finally` is one line.
 */
export const openPage = async (root) => {
  const vite = await import("vite");
  // Vite's preview server registers a stdin "end" listener to close itself. scripts/smoke pipes
  // stdin to its drive subprocesses, so that listener would tear the server down mid-run; the
  // ones that were not there before this call are removed again.
  const priorEndListeners = new Set(process.stdin.listeners("end"));
  const server = await vite.preview({ root, preview: { port: 0 }, logLevel: "warn" });
  for (const listener of process.stdin.listeners("end")) {
    if (!priorEndListeners.has(listener)) process.stdin.off("end", listener);
  }
  const url = server.resolvedUrls?.local[0];
  if (url === undefined) throw new Error("preview has no URL");
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  page.setDefaultTimeout(WAIT_MS);
  await page.addInitScript(() => {
    window.__MULCH_DRIVE__ = true;
  });

  // A small generated mono WAV — real file bytes, no fixture and no codec dependency. The one
  // fixture more than one scenario needs; the rest each mint their own.
  const samples = Float32Array.from(
    { length: 4_800 },
    (_, index) => Math.sin((index * Math.PI * 2 * 440) / 48_000) * 0.25,
  );
  const bytes = { wav: [...encodeWav([samples], 48_000)] };

  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => "mulch" in window, undefined, { timeout: 15_000 });

  return {
    page,
    browser,
    url,
    bytes,
    close: async () => {
      await browser.close();
      await server.close();
    },
  };
};
