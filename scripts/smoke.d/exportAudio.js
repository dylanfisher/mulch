/**
 * @role P40's determinism: the file the Export Audio dialog produces, against the render harness
 * that produced it, and the fade the dialog puts on each end — and, after it, what an export
 * leaves in the heap once the file has left (P58).
 */
import { compareFingerprints, toDb } from "../../src/lib/fingerprint.ts";
import { WAV_BYTES_PER_SAMPLE, WAV_FULL_SCALE, WAV_HEADER_BYTES } from "../../src/lib/wav.ts";
import { fail, report } from "./harness.js";

/** Five fingerprint windows, so a fade at each end leaves the middle one untouched. */
const EXPORT_SECS = 0.5;
/** Longer than a window, so the drop at each end is well clear of the tolerance. */
const EXPORT_FADE_SECS = 0.15;
/** How much of the fade's own attenuation each end has to actually show. */
const FADE_DROP_DB = 3;
/** The yard this scenario adds, plays and takes away again, so the page is left as it was found. */
const EXPORT_DECK = "export";
/**
 * The yard the page imported a file into. It is exported alongside the generated one on purpose: a
 * stored source loads asynchronously, so an export that ran its commands in one synchronous pass
 * would refuse every command after that load and quietly render a take the yard is missing from.
 */
const IMPORTED_DECK = "a";
/** How loud the take has to be to count as a take rather than a file of silence. */
const AUDIBLE_PEAK_DB = -40;
/**
 * How far the export may sit from the harness's own render of the identical spec, as the level the
 * two files part by rather than as a count of grid steps ([0099](../../docs/decisions/0099-two-renders-of-one-spec-part-by-a-level.md)).
 * Two renders of one spec are not bit-identical: the browser's own float arithmetic is what sums
 * them, in an order that is the machine's business and not this repo's.
 *
 * Both bounds hold or the claim fails, because they catch different wrongs. The peak is the
 * ceiling on any one sample. The RMS is the energy of the whole difference, and it is the half
 * that discriminates — a render of a different graph parts by energy everywhere rather than at one
 * sample. 0099 holds the measurements both floors were read off, including the one wrong render
 * they no longer refuse; they are not restated here, so that there is one copy of them to move.
 */
const MAX_PARITY_PEAK_DB = -48;
const MAX_PARITY_RMS_DB = -80;

export const exportAudioFile = async ({ page }) => {
  // The export is not a second renderer (plan §2): what it does is turn the live session into the
  // ordinary restoration commands and hand them to `renderOffline`. So the claim to prove is that
  // the file it hands back is the harness's own render of the very same spec, to within the level
  // two renders of one spec can part by (MAX_PARITY_PEAK_DB, MAX_PARITY_RMS_DB) — and, because
  // the harness is what the live/offline pair is already proved through, that the exported ten
  // minutes are the ten minutes that would have played.
  const run = await page.evaluate(
    async ({ deck, fade, imported, scale, secs, WAV_BYTES_PER_SAMPLE, WAV_HEADER_BYTES }) => {
      const active = window.mulch.probe().activeDeck;
      try {
        window.mulch.send({ t: "deck.add", deck, emoji: "🏡", name: "Export Yard" });
        window.mulch.send({ t: "deck.load", deck, source: { gen: "sine", hz: 440, secs: 2 } });
        // Nothing is started, and nothing is waited for. This is the page a performer reaches the
        // File menu from having stopped everything, and the take is still the whole session: the
        // spec carries the intent to play rather than a reading of the transport (0077).
        if ([deck, imported].some((id) => window.mulch.probe().decks[id].playing)) {
          throw new Error("this scenario exports a session with nothing playing");
        }
        const spec = { name: "Take One", secs, fadeInSecs: 0, fadeOutSecs: 0 };
        const exported = await window.mulch.exportAudio(spec);
        // The same envelopes and the same bytes, straight through the harness. `snapshot()` is
        // where the export got the bytes too: a session whose sources were imported cannot be
        // rendered by a host that was not handed them.
        const { blobs } = await window.mulch.snapshot();
        const direct = await window.mulch.render({
          secs,
          envelopes: exported.envelopes,
          blobs,
          wav: true,
        });
        const faded = await window.mulch.exportAudio({
          ...spec,
          fadeInSecs: fade,
          fadeOutSecs: fade,
        });
        const bytes = new Uint8Array(await exported.file.arrayBuffer());
        const rendered = Uint8Array.fromBase64(direct.wav);
        return {
          name: exported.file.name,
          type: exported.file.type,
          bytes: bytes.length,
          renderedBytes: rendered.length,
          // The difference between the two files as a signal of its own: its loudest sample and
          // its energy, both as magnitudes the caller reads in dBFS. Null unless the pair is two
          // files of one length carrying samples, which is its own failure asserted below — a
          // difference of no samples has no level, and would reach `toDb` as a NaN.
          parted: (() => {
            if (rendered.length !== bytes.length || bytes.length <= WAV_HEADER_BYTES) return null;
            const exportedPcm = new DataView(bytes.buffer);
            const renderedPcm = new DataView(rendered.buffer);
            let peak = 0;
            let energy = 0;
            let samples = 0;
            for (let at = WAV_HEADER_BYTES; at < bytes.length; at += WAV_BYTES_PER_SAMPLE) {
              const step = Math.abs(
                exportedPcm.getInt16(at, true) - renderedPcm.getInt16(at, true),
              );
              if (step > peak) peak = step;
              energy += step * step;
              samples += 1;
            }
            return { peak: peak / scale, rms: Math.sqrt(energy / samples) / scale };
          })(),
          plays: exported.envelopes.filter((cmd) => cmd.t === "deck.play").map((cmd) => cmd.deck),
          exported: exported.fingerprint,
          direct: direct.fingerprint,
          faded: faded.fingerprint,
        };
      } finally {
        window.mulch.send({ t: "deck.remove", deck });
        if (active !== null) window.mulch.send({ t: "deck.activate", deck: active });
      }
    },
    {
      deck: EXPORT_DECK,
      fade: EXPORT_FADE_SECS,
      imported: IMPORTED_DECK,
      scale: WAV_FULL_SCALE,
      secs: EXPORT_SECS,
      WAV_BYTES_PER_SAMPLE,
      WAV_HEADER_BYTES,
    },
  );

  if (!run.name.endsWith(".wav") || run.type !== "audio/wav") {
    fail(`the export is not a named wav — ${JSON.stringify({ name: run.name, type: run.type })}`);
  }
  if (!run.plays.includes(EXPORT_DECK) || !run.plays.includes(IMPORTED_DECK)) {
    fail(`the export did not start both loaded yards — ${JSON.stringify(run.plays)}`);
  }
  // The whole point of starting them: a take of a stopped session is a take, not silence.
  const peak = Math.max(...run.exported.peakDb);
  if (!(peak > AUDIBLE_PEAK_DB)) {
    fail(
      `an export of a session with nothing playing peaked at ${peak.toFixed(1)}dB — silence`,
      run.exported.peakDb,
    );
  }
  const differences = compareFingerprints(run.direct, run.exported);
  if (differences.length > 0) {
    fail(`the exported file does not sound like the harness render of its own spec`, differences);
  }
  if (run.parted === null) {
    fail(
      `the export is ${run.bytes} bytes against the harness's own ${run.renderedBytes} for the ` +
        `same spec — a pair to compare is two files of one length carrying samples`,
      run,
    );
  }
  const partedPeakDb = toDb(run.parted.peak);
  const partedRmsDb = toDb(run.parted.rms);
  if (!(partedPeakDb <= MAX_PARITY_PEAK_DB) || !(partedRmsDb <= MAX_PARITY_RMS_DB)) {
    fail(
      `the exported ${run.bytes} bytes stand ${partedPeakDb}dBFS at their loudest and ` +
        `${partedRmsDb}dBFS in energy off the harness's own render of the same spec, past the ` +
        `${MAX_PARITY_PEAK_DB}dBFS and ${MAX_PARITY_RMS_DB}dBFS two renders of one spec may part by`,
      run,
    );
  }

  const plain = run.exported.rmsDb;
  const faded = run.faded.rmsDb;
  const middle = Math.floor(plain.length / 2);
  const first = plain[0] - faded[0];
  const last = plain.at(-1) - faded.at(-1);
  if (!(first >= FADE_DROP_DB) || !(last >= FADE_DROP_DB)) {
    fail(
      `a ${EXPORT_FADE_SECS}s fade at each end dropped ${first.toFixed(1)}dB in and ` +
        `${last.toFixed(1)}dB out, under the ${FADE_DROP_DB}dB it owes`,
      { plain, faded },
    );
  }
  // The one window neither ramp reaches: a fade shapes the ends and leaves the take alone.
  if (plain[middle] !== faded[middle]) {
    fail(
      `a fade at the ends changed the middle of the take — ${plain[middle]} to ${faded[middle]}`,
    );
  }
  report(
    `the Export Audio dialog's ${EXPORT_SECS}s spec of a session with nothing playing peaked at ` +
      `${peak.toFixed(1)}dB and rendered ${run.bytes} bytes parting from the harness's own by ` +
      `${partedPeakDb}dBFS at one sample and ${partedRmsDb}dBFS in energy, and a ` +
      `${EXPORT_FADE_SECS}s fade took ${first.toFixed(1)}dB off the head and ` +
      `${last.toFixed(1)}dB off the tail`,
  );
};

/**
 * How long the release scenario renders. Long enough that the samples it allocates — stereo float
 * at the render rate — are megabytes rather than noise in the number this reports, short enough
 * that the gate does not wait on it.
 */
const RELEASE_SECS = 20;

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
          fadeInSecs: 0,
          fadeOutSecs: 0,
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
    report(
      `a ${RELEASE_SECS}s export handed back all ${run.frames} frames of its ${run.channels} ` +
        `rendered channels and let go of its ${run.fileBytes} encoded bytes, leaving ` +
        `${(after - before).toFixed(1)}MB of array backing store behind`,
    );
  } finally {
    await page.evaluate(() => {
      delete window.mulchExportedBytes;
    });
    await cdp.detach();
  }
};
