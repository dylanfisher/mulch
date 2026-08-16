/**
 * @role The browser half of the smoke: one preview server, one page, and the scenarios that ride
 * it in order — M6's storage path, the gestures around it, and the offline renders it can serve.
 */
import { chromium } from "playwright";

import { encodeWav } from "../../src/lib/wav.ts";
import { archive } from "./archive.js";
import { automation } from "./automation.js";
import { clips } from "./clips.js";
import { cropLoop } from "./crop.js";
import { cutoff } from "./cutoff.js";
import { debugKey } from "./debugConsole.js";
import { dropFile } from "./drop.js";
import { formats } from "./formats.js";
import { fail, WAIT_MS } from "./harness.js";
import { keyboardRoutes } from "./keyboard.js";
import { lanePreview } from "./laneMarks.js";
import { exportParity } from "./parity.js";
import { rackControls } from "./rack.js";
import { reload } from "./reload.js";
import { renderDecks } from "./renderDecks.js";
import { renderEq } from "./renderEq.js";
import { renderRack } from "./renderRack.js";
import { renderRate } from "./renderRate.js";
import { save } from "./save.js";
import { seek } from "./seek.js";
import { slide } from "./slide.js";
import { snap } from "./snap.js";

/**
 * The order the page is driven in, and the whole of it. Each scenario is one file holding its own
 * gestures, its own thresholds and its own assertions, so a behaviour lands in one place rather
 * than in four spread across a file too big to read beside the feature work.
 *
 * The order is load-bearing twice over. Everything from `reload` on is deliberately after it
 * rather than before: pre-reload browser work is what stalls the reloaded audio clock (plan §3).
 * And what one scenario leaves on the page — a second deck, a snapped loop, a bypassed filter —
 * is what the next one reads, which is why they share a page and pass what crosses between them
 * through `state` rather than re-establishing it.
 */
const SCENARIOS = [
  keyboardRoutes,
  automation,
  rackControls,
  cutoff,
  snap,
  save,
  reload,
  lanePreview,
  clips,
  debugKey,
  archive,
  slide,
  seek,
  exportParity,
  renderRack,
  renderEq,
  renderDecks,
  renderRate,
  formats,
  dropFile,
  cropLoop,
];

/**
 * 0036 says a failed assertion prints everything it had. A Playwright timeout is exempt from it:
 * `Timeout 30000ms exceeded` and `log: []` say only that time passed, never what the page actually
 * held — which is the one thing that would have fixed it. So every failure in the browser half
 * comes back through here, carrying the ring and the probe at the moment it gave up, and the
 * evidence a `fail()` in a scenario attached to it.
 */
const reported = new WeakSet();
const reportPageFailure = async (page, what, error) => {
  if (reported.has(error)) return;
  reported.add(error);
  const evidence = await page
    .evaluate(() => ({
      hash: window.location.hash,
      probe: "mulch" in window ? window.mulch.probe() : null,
      // The tail is the part a wait was watching for; the whole ring is mostly startup.
      ring: "mulch" in window ? window.mulch.ring().slice(-25) : null,
    }))
    .catch((problem) => ({ unreadable: String(problem) }));
  const where = (error.stack ?? "").split("\n").find((line) => line.includes("scripts/smoke"));
  console.error(`smoke: ${what} — ${String(error.message ?? error).split("\n")[0]}`);
  if (where !== undefined) console.error(` ${where.trim()}`);
  if (error.evidence !== undefined) {
    console.error(`  evidence: ${JSON.stringify(error.evidence)}`);
  }
  console.error(`  page: ${JSON.stringify(evidence)}`);
};

/**
 * M6's storage path in one browser profile: unchanged bytes into IndexedDB, ordinary blob-id
 * command into the real graph, atomic save/GC, then a same-origin reload and automatic restore —
 * and every gesture and render the scenarios above hang off that one page.
 */
export const browserSmoke = async (root) => {
  const vite = await import("vite");
  const priorEndListeners = new Set(process.stdin.listeners("end"));
  const server = await vite.preview({ root, preview: { port: 0 }, logLevel: "warn" });
  for (const listener of process.stdin.listeners("end")) {
    if (!priorEndListeners.has(listener)) process.stdin.off("end", listener);
  }
  const url = server.resolvedUrls?.local[0] ?? fail("persistence smoke: preview has no URL");
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

  try {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => "mulch" in window, undefined, { timeout: 15_000 });
    await page.locator('input[aria-label="Import audio for deck a"]').setInputFiles({
      name: "generated.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from(bytes.wav),
    });
    await page.waitForFunction(
      () => {
        const deck = window.mulch.probe().decks.a;
        return deck.source !== null && "blobId" in deck.source && deck.duration > 0;
      },
      undefined,
      { timeout: 5_000 },
    );
    // The blob every later scenario measures against: saved, restored, borrowed by a clip, and
    // carried through the archive as the same id it was imported under.
    const state = { kept: await page.evaluate(() => window.mulch.probe().decks.a.source.blobId) };

    const context = { page, browser, url, root, state, bytes, reportPageFailure };
    for (const scenario of SCENARIOS) await scenario(context);
  } catch (error) {
    await reportPageFailure(page, "the persistence page failed", error);
    throw error;
  } finally {
    await browser.close();
    await server.close();
  }
};
