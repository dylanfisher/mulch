/**
 * @role The session archive: exported through the header's File menu and imported into a
 * repository that has seen nothing but those bytes.
 */
import { SESSION_ARCHIVE_FILE } from "../../src/lib/sessionArchive.ts";
import { fail, report, sameLoop, WAIT_MS } from "./harness.js";

export const archive = async ({ page, browser, url, state, bytes, reportPageFailure }) => {
  // P1 rides this existing browser launch: export through the File menu, then import through
  // the archive picker in a fresh browser repository. The menu opens instantly (0056), so the
  // extra gesture is a click and not an animation Playwright has to wait out — and it lands
  // after `reload()`, where browser work does not stall the reloaded audio clock (plan §3).
  await page.locator('[data-slot="menubar-trigger"]', { hasText: "File" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-slot="menubar-item"]', { hasText: "Export Session" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const archiveChunks = [];
  for await (const chunk of stream) archiveChunks.push(chunk);
  const archiveBytes = Buffer.concat(archiveChunks);
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  freshPage.setDefaultTimeout(WAIT_MS);
  await freshPage.addInitScript(() => {
    window.__MULCH_DRIVE__ = true;
  });
  let portable;
  let clipApplied;
  try {
    await freshPage.goto(url, { waitUntil: "load" });
    await freshPage.waitForFunction(() => "mulch" in window, undefined, { timeout: 15_000 });
    await freshPage.locator('input[aria-label="Import Session Archive"]').setInputFiles({
      name: `round-trip${SESSION_ARCHIVE_FILE.extension}`,
      mimeType: SESSION_ARCHIVE_FILE.mediaType,
      buffer: archiveBytes,
    });
    await freshPage.waitForFunction(() =>
      window.mulch.ring().some((event) => event.t === "session.imported"),
    );
    await freshPage.waitForFunction(
      () => window.mulch.probe().decks.b.analysis?.onsets.length === 8,
      undefined,
      { timeout: 15_000 },
    );
    portable = await freshPage.evaluate(
      async ({ kept, bytes }) => {
        const probe = window.mulch.probe();
        const database = await new Promise((resolve, reject) => {
          const request = indexedDB.open("mulch", 1);
          request.addEventListener(
            "success",
            () => {
              resolve(request.result);
            },
            { once: true },
          );
          request.addEventListener(
            "error",
            () => {
              reject(request.error);
            },
            { once: true },
          );
        });
        const stored = await new Promise((resolve, reject) => {
          const request = database.transaction("blobs").objectStore("blobs").get(kept);
          request.addEventListener(
            "success",
            () => {
              resolve(request.result);
            },
            { once: true },
          );
          request.addEventListener(
            "error",
            () => {
              reject(request.error);
            },
            { once: true },
          );
        });
        const storedBytes = [...new Uint8Array(await stored.arrayBuffer())];
        return {
          importedSession:
            probe.decks.a.source?.blobId === kept &&
            // Yard A, because the capture above was pressed inside Yard A's own group and a
            // press anywhere in a yard selects it — the archive carries what was selected (0019,
            // 0078).
            probe.activeDeck === "a" &&
            probe.decks.a.automation["deck.gain"].length > 1 &&
            probe.decks.a.effects.map((entry) => entry.effect).join(",") === "filter" &&
            probe.decks.a.effects.every((entry) => entry.bypassed),
          bytesEqual:
            storedBytes.length === bytes.length &&
            storedBytes.every((byte, index) => byte === bytes[index]),
          loop: probe.decks.b.loop,
          imported: window.mulch.ring().some((event) => event.t === "session.imported"),
          clip: probe.clips[0],
          errors: window.mulch.ring().filter((event) => event.t === "error"),
        };
      },
      { kept: state.kept, bytes: bytes.wav },
    );
    // P8's other half: a clip that travelled inside the archive, applied in a repository that
    // only ever saw those imported bytes. One click, one grouped durable edit, and deck b ends
    // up exactly the captured preset — borrowing the very same blob id, never a copy (0027).
    const deckB = () =>
      freshPage.evaluate(() => {
        const { duration, analysis, playing, paused, ...preset } = window.mulch.probe().decks.b;
        return preset;
      });
    await freshPage
      .getByLabel("Clips")
      .getByRole("button", { name: "Apply intro to Yard B" })
      .click();
    await freshPage.waitForFunction(() =>
      window.mulch.ring().some((event) => event.t === "clip.applied"),
    );
    // Undo of an application is left to the seam test in src/app/clips.test.ts: a whole-session
    // graph rebuild per press costs the gate more than a browser adds to a claim already proved
    // at the layer that owns it (plan §3).
    clipApplied = {
      applied: await deckB(),
      clip: await freshPage.evaluate(() => window.mulch.probe().clips[0].deck),
      undoable: await freshPage.getByRole("button", { name: "undo" }).isEnabled(),
      errors: await freshPage.evaluate(() =>
        window.mulch.ring().filter((event) => event.t === "error"),
      ),
    };
  } catch (error) {
    // Reported here rather than by the outer catch, which only runs once this context — and
    // with it everything the imported session held — has already been closed.
    await reportPageFailure(freshPage, "the imported-archive page failed", error);
    throw error;
  } finally {
    await freshContext.close();
  }

  if (
    !portable.importedSession ||
    !portable.bytesEqual ||
    !portable.imported ||
    portable.errors.length > 0
  ) {
    fail(`portable session smoke: fresh import failed — ${JSON.stringify(portable)}`);
  }
  report("portable session round-tripped through download and file input into a fresh repository");

  if (!sameLoop(portable.loop, state.beat)) {
    fail(`an archive round trip lost the chosen loop — ${JSON.stringify(portable.loop)}`);
  }
  report(
    `the worker measured ${state.beats.bpm}bpm and ` +
      `${state.beats.onsets.length} onsets, and a drag snapped the loop to ` +
      `${state.beat.in}–${state.beat.out}s; the toggle turned that snapping ` +
      "off and on, undo/redo/save/reload/archive kept it exactly",
  );

  if (JSON.stringify(portable.clip) !== JSON.stringify(state.capturedClip)) {
    fail(
      `a clip did not survive the archive round trip exactly — captured ` +
        `${JSON.stringify(state.capturedClip)}, imported ${JSON.stringify(portable.clip)}`,
    );
  }
  if (JSON.stringify(clipApplied.applied) !== JSON.stringify(clipApplied.clip)) {
    fail(
      `applying a clip did not leave the deck as the preset — deck ` +
        `${JSON.stringify(clipApplied.applied)}, clip ${JSON.stringify(clipApplied.clip)}`,
    );
  }
  if (!clipApplied.undoable) {
    fail("applying a clip left nothing to undo; it must be one durable transaction");
  }
  if (clipApplied.errors.length > 0) {
    fail(`clip smoke: ${JSON.stringify(clipApplied.errors)}`);
  }
  report(
    "a clip captured and named through its rack travelled inside that archive and applied to a " +
      "deck exactly, borrowing the same blob, as one undoable edit",
  );
};
