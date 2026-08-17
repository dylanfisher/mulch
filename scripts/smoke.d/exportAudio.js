/**
 * @role P40's determinism: the file the Export Audio dialog produces, against the render harness
 * that produced it, and the fade the dialog puts on each end.
 */
import { compareFingerprints } from "../../src/lib/fingerprint.ts";
import { WAV_BYTES_PER_SAMPLE, WAV_HEADER_BYTES } from "../../src/lib/wav.ts";
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
 * How far the export may sit from the harness's own render of the identical spec: one step of the
 * 16-bit grid the file is written on, and no more. Not zero, because two renders of one spec are
 * not bit-identical — the same `window.mulch.render` call, made twice in a row on this page,
 * differs on a couple of samples in fifty thousand, which is a float summing order inside the
 * browser and not a second renderer. A whole step of the grid is still four orders of magnitude
 * tighter than any difference a different graph could make.
 */
const MAX_PCM_STEPS = 1;

export const exportAudioFile = async ({ page }) => {
  // The export is not a second renderer (plan §2): what it does is turn the live session into the
  // ordinary restoration commands and hand them to `renderOffline`. So the claim to prove is that
  // the file it hands back is the harness's own render of the very same spec, to within the one
  // step of the 16-bit grid two renders of one spec can part by (MAX_PCM_STEPS) — and, because
  // the harness is what the live/offline pair is already proved through, that the exported ten
  // minutes are the ten minutes that would have played.
  const run = await page.evaluate(
    async ({ deck, fade, imported, secs, WAV_BYTES_PER_SAMPLE, WAV_HEADER_BYTES }) => {
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
        return {
          name: exported.file.name,
          type: exported.file.type,
          bytes: bytes.length,
          steps: (() => {
            const rendered = Uint8Array.fromBase64(direct.wav);
            if (rendered.length !== bytes.length) return Number.POSITIVE_INFINITY;
            const exportedPcm = new DataView(bytes.buffer);
            const renderedPcm = new DataView(rendered.buffer);
            let worst = 0;
            for (let at = WAV_HEADER_BYTES; at < bytes.length; at += WAV_BYTES_PER_SAMPLE) {
              const step = Math.abs(
                exportedPcm.getInt16(at, true) - renderedPcm.getInt16(at, true),
              );
              if (step > worst) worst = step;
            }
            return worst;
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
  if (!(run.steps <= MAX_PCM_STEPS)) {
    fail(
      `the exported ${run.bytes} bytes stand ${run.steps} steps of the 16-bit grid off the ` +
        `harness's own render of the same spec`,
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
      `${peak.toFixed(1)}dB and rendered ${run.bytes} bytes within ${run.steps} step of the ` +
      `harness's own, and a ${EXPORT_FADE_SECS}s fade took ${first.toFixed(1)}dB off the head and ` +
      `${last.toFixed(1)}dB off the tail`,
  );
};
