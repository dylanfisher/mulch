/**
 * @role The browser half of the smoke: the scenarios that ride one page in order — M6's storage
 * path, the gestures around it, and the offline renders it can serve. The page itself is opened
 * by ./page.js, which ./scripts/profile opens the same way.
 */
import { archive } from "./archive.js";
import { automation } from "./automation.js";
import { clips } from "./clips.js";
import { cropLoop } from "./crop.js";
import { cutoff } from "./cutoff.js";
import { debugKey } from "./debugConsole.js";
import { dropFile } from "./drop.js";
import { formats } from "./formats.js";
import { fixedHeader } from "./header.js";
import { keyboardRoutes } from "./keyboard.js";
import { lanePreview } from "./laneMarks.js";
import { leaks } from "./leaks.js";
import { longTasks, watchLongTasks } from "./longTasks.js";
import { masterMeter } from "./masterMeter.js";
import { narrowShell } from "./narrow.js";
import { exportAudioFile, exportReleasesSamples } from "./exportAudio.js";
import { dragCardAcrossRow } from "./dragCard.js";
import { effectPicker } from "./picker.js";
import { commandPalette } from "./palette.js";
import { openPage } from "./page.js";
import { exportParity } from "./parity.js";
import { rackControls } from "./rack.js";
import { reload } from "./reload.js";
import { renderDecks } from "./renderDecks.js";
import { renderDynamics } from "./renderDynamics.js";
import { renderEq } from "./renderEq.js";
import { renderLanes } from "./renderLanes.js";
import { renderRack } from "./renderRack.js";
import { renderRate } from "./renderRate.js";
import { save } from "./save.js";
import { seek } from "./seek.js";
import { slide } from "./slide.js";
import { snap } from "./snap.js";
import { sweepLoop } from "./sweep.js";

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
  masterMeter,
  clips,
  debugKey,
  archive,
  watchLongTasks,
  slide,
  seek,
  sweepLoop,
  longTasks,
  exportParity,
  exportAudioFile,
  exportReleasesSamples,
  renderRack,
  renderEq,
  renderDynamics,
  renderLanes,
  renderDecks,
  renderRate,
  formats,
  dropFile,
  cropLoop,
  effectPicker,
  dragCardAcrossRow,
  narrowShell,
  fixedHeader,
  commandPalette,
  leaks,
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
  const session = await openPage(root);
  const { page, browser, url, bytes } = session;

  try {
    await page.locator('input[aria-label="Import Audio for Yard A"]').setInputFiles({
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
    await session.close();
  }
};
