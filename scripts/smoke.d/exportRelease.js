/**
 * @role P58's second half: what an audio export leaves in the heap once the file has left.
 * @instead What the file itself is, against the harness that rendered it → ./exportAudio.js,
 * which this scenario runs after on the same page and depends on having run (MAX_RESIDUE_MB).
 */
import { fail, report } from "./harness.js";

/**
 * How long the release scenario renders. Long enough that the samples it allocates — stereo float
 * at the render rate — are megabytes rather than noise in the number this reports, short enough
 * that the gate does not wait on it.
 */
const RELEASE_SECS = 20;

/**
 * How many megabytes of array backing store an export may leave behind it. Not zero, because the
 * page collects between the two reads and a fraction either way is the page being a page — and
 * signed, because the reads bracket a collection that usually frees a little more than the export
 * asked for. Set from observed runs rather than from taste, and the claim below prints the real
 * number every time so the day it creeps up is the day it is visible rather than the day it trips.
 *
 * It is the only thing here that watches `releaseHost` (src/app/render.ts). The two assertions
 * above it cover the other two releases — the rendered channels are detached, and the encoded
 * bytes clear — but a render's own instrument decodes each of the session's sources onto a context
 * Blink keeps rooted, and nothing else on this page can see those stay. Measured with that release
 * taken out: 0.4MB against −0.1MB with it in, three runs each, identical to the tenth.
 *
 * The number depends on this scenario's slot in browser.js's SCENARIOS: it runs after the two
 * exports above it, so the first export's one-time allocations — the worklet module, the render
 * host's decode caches — are already warm when `before` is read. Move it ahead of them and the
 * first export's permanent allocations land between the two reads and trip the bound. The list is
 * an order, not a set; this entry is one of the ones that knows it.
 */
const MAX_RESIDUE_MB = 0.25;

/**
 * P58's second half: what an export leaves behind. An export holds four things at once — the
 * OfflineAudioContext's output, the rendered AudioBuffer, the encoded wav bytes and the File — and
 * the first of those is the one nothing could reach: a context that has loaded a worklet module is
 * retained by Blink itself, so the buffer it rendered outlived every reference in src/ and every
 * further export stacked another one behind it.
 *
 * A `WeakRef` to that buffer is therefore not the proof the plan hoped for and never can be: the
 * wrapper is rooted by the browser, so such a ref would never clear whatever this code did, and a
 * test written on it would only ever assert the browser's own bookkeeping. What is provable is the
 * thing that actually costs the megabytes — the samples — and the two claims here are the honest
 * pair: the rendered buffer's channels are handed back (detached, so `length` is 0 while the
 * buffer still reports its frames), and a `WeakRef` to the encoded bytes does clear, because those
 * are ordinary JS and the File took its own copy.
 */
export const exportReleasesSamples = async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("HeapProfiler.enable");
    // Twice: the first collection frees what the previous one made unreachable.
    const collect = async () => {
      for (let round = 0; round < 2; round += 1) {
        await cdp.send("HeapProfiler.collectGarbage");
        await page.waitForTimeout(100);
      }
    };
    const backingMb = async () => {
      await collect();
      const { backingStorageSize } = await cdp.send("Runtime.getHeapUsage");
      // The one number that counts float samples and ArrayBuffers; the JS heap counter does not.
      // A Chromium that does not report it would otherwise have this scenario print NaN and pass.
      if (typeof backingStorageSize !== "number") {
        fail("Runtime.getHeapUsage did not report a backing store size");
      }
      return backingStorageSize / (1024 * 1024);
    };
    const before = await backingMb();
    const run = await page.evaluate(async (secs) => {
      // The two things under test are inside the render and inside the export, so they are taken
      // where they are made: the buffer as `startRendering` hands it over, the encoded bytes as
      // they reach `new File`. Both hooks are put back in the `finally` — this page has scenarios
      // after it.
      const startRendering = OfflineAudioContext.prototype.startRendering;
      const NativeFile = window.File;
      let buffer = null;
      let bytes = null;
      try {
        OfflineAudioContext.prototype.startRendering = async function renderAndHold(...args) {
          buffer = await startRendering.apply(this, args);
          return buffer;
        };
        window.File = function HoldBytes(parts, name, options) {
          // The backing store, not the view over it: collecting a `Uint8Array` says nothing about
          // the megabytes behind it, and the megabytes are the claim.
          bytes = new WeakRef(parts[0].buffer);
          return new NativeFile(parts, name, options);
        };
        window.File.prototype = NativeFile.prototype;
        const { file } = await window.mulch.exportAudio({
          name: "Release",
          secs,
          // From the performance's own beginning: what this measures is the megabytes one take
          // leaves behind, and a warm-up would put a second render's worth of them in the number
          // without changing what it is watching (P149).
          backSecs: window.mulch.stats().at + 1,
          fadeInSecs: 0,
          fadeOutSecs: 0,
          // Cleared, deliberately: what this measures is the one File the samples become, and an
          // archive built beside it would be the last File the hook above holds a ref to.
          session: false,
        });
        return {
          fileBytes: file.size,
          frames: buffer.length,
          channels: buffer.numberOfChannels,
          // 0 once the samples have been handed back; `frames` above says how many there were.
          held: buffer.getChannelData(0).length,
        };
      } finally {
        OfflineAudioContext.prototype.startRendering = startRendering;
        window.File = NativeFile;
        buffer = null;
        window.mulchExportedBytes = bytes;
      }
    }, RELEASE_SECS);

    if (run.held !== 0) {
      fail(
        `a ${RELEASE_SECS}s export left its ${run.frames} rendered frames in the heap — the ` +
          `buffer's first channel still holds ${run.held} samples`,
        run,
      );
    }
    await collect();
    const cleared = await page.evaluate(() => window.mulchExportedBytes.deref() === undefined);
    if (!cleared) {
      fail(`the ${run.fileBytes} encoded bytes are still alive after the File took its own copy`);
    }
    const after = await backingMb();
    const residue = after - before;
    if (residue > MAX_RESIDUE_MB) {
      fail(
        `a ${RELEASE_SECS}s export left ${residue.toFixed(2)}MB of array backing store behind, ` +
          `over the ${MAX_RESIDUE_MB}MB an export may keep — its ${run.frames} frames are ` +
          `detached and its ${run.fileBytes} encoded bytes are gone, so what is still held is ` +
          "the host the render built on a context Blink keeps rooted",
        { before, after, residue, frames: run.frames, fileBytes: run.fileBytes },
      );
    }
    report(
      `a ${RELEASE_SECS}s export handed back all ${run.frames} frames of its ${run.channels} ` +
        `rendered channels and let go of its ${run.fileBytes} encoded bytes, leaving ` +
        `${residue.toFixed(2)}MB of array backing store behind, under the ${MAX_RESIDUE_MB}MB it owes`,
    );
  } finally {
    await page.evaluate(() => {
      delete window.mulchExportedBytes;
    });
    await cdp.detach();
  }
};
