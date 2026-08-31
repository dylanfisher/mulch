/**
 * @role P40's determinism: the file the Export Audio dialog produces, against the render harness
 * that produced it, the fade the dialog puts on each end, and where behind the ear a take begins.
 * @instead What an export leaves in the heap once the file has left → ./exportRelease.js, which
 * runs after this one on the same page (P58).
 */
// Over the 400-line soft cap by one claim: P166's countdown is measured off a render, and the
// render it is measured off is this scenario's, which is already paying for a page and a whole
// live session. A second file for it would pay both again for four assertions
// (docs/plan.md §3). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { AUTOMATION_REARM_SECS } from "../../src/audio/transport.ts";
import { EXPORT_BUSY, exportBusySaid } from "../../src/lib/copy.ts";
import {
  EXPORT_NAME_BASE,
  EXPORT_NAME_SEPARATOR,
  exportNameField,
} from "../../src/lib/exportName.ts";
import { compareFingerprints, toDb, TOLERANCE_DB, WINDOW_SECS } from "../../src/lib/fingerprint.ts";
import { SESSION_ARCHIVE_FILE } from "../../src/lib/sessionArchive.ts";
import { SETTLE_FLOOR_SECS } from "../../src/lib/settle.ts";
import { WAV_BYTES_PER_SAMPLE, WAV_FULL_SCALE, WAV_HEADER_BYTES } from "../../src/lib/wav.ts";
import { fail, report } from "./harness.js";

/** Five fingerprint windows, so a fade at each end leaves the middle one untouched. */
const EXPORT_SECS = 0.5;
/** Longer than a window, so the drop at each end is well clear of the tolerance. */
const EXPORT_FADE_SECS = 0.15;
/** How much of the fade's own attenuation each end has to actually show. */
const FADE_DROP_DB = 3;
/**
 * How long P149's warmed take actually warms for. It is not what the take asks for — a take begun
 * at the ear asks for the whole performance behind it — it is what the export shortens that ask
 * to: the longest memory in this lane's rack, which is a filter and a sine and so is the floor
 * every rack gets (0239). It has to be whole fingerprint windows, so that the windows of that take
 * land on the windows of a longer render of the same commands and the two can be compared window
 * for window; the assertions below refuse a settle that is not, rather than report the
 * misalignment as a parity break.
 */
const SETTLE_SECS = SETTLE_FLOOR_SECS;
/**
 * How old the performance has to be before the warmed take is asked for. Twice the settle, so the
 * ask and what the export shortens it to are unmistakably different numbers — a take begun at the
 * ear of a performance barely past its own settle asks for nearly what it would be shortened to,
 * and the claim would pass on a difference too small to read.
 */
export const SETTLE_ASK_SECS = SETTLE_SECS * 2;
/**
 * The Regen a self-oscillating tape is set to for the claim that the window refuses to shorten it.
 * Past one the loop never decays, so what it holds is the whole performance and no window
 * reconstructs it — the one rack an export still warms end to end.
 */
const SELF_OSC_REGEN = 1.2;
/** The instance that tape is added as, on the yard this scenario brought and takes away again. */
const REGEN_ID = "regen";
/** How far past the take that longer render goes, so that it is longer at both ends of it. */
const PAST_SECS = WINDOW_SECS * 3;
/** The yard this scenario adds, plays and takes away again, so the page is left as it was found. */
const EXPORT_DECK = "export";
/** What that yard is called on screen, and what it plays — the last two fields of its name. */
const EXPORT_DECK_NAME = "Export Yard";
const EXPORT_DECK_GEN = "sine";
/** The four fields the offered default arrives in — a shape, because a second derivation of it
 * would disagree across a minute boundary (P114). */
const OFFERED_NAME = new RegExp(
  `^\\d{4}-\\d{2}-\\d{2}${EXPORT_NAME_SEPARATOR}${EXPORT_NAME_BASE}-\\d{4}` +
    `${EXPORT_NAME_SEPARATOR}${exportNameField(EXPORT_DECK_NAME)}` +
    `${EXPORT_NAME_SEPARATOR}${EXPORT_DECK_GEN}$`,
  "u",
);
/**
 * The yard the page imported a file into. It is exported alongside the generated one on purpose: a
 * stored source loads asynchronously, so an export that ran its commands in one synchronous pass
 * would refuse every command after that load and quietly render a take the yard is missing from.
 */
const IMPORTED_DECK = "a";
/** P166: past one automation re-arm — the stop the pump already makes — so the reports this
 *  render makes are a mid-render one and the final one rather than the final one alone. */
const PACED_SECS = AUTOMATION_REARM_SECS + EXPORT_SECS;
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
    async ({
      deck,
      deckName,
      fade,
      gen,
      imported,
      paceSecs,
      past,
      regen,
      scale,
      secs,
      selfOsc,
      WAV_BYTES_PER_SAMPLE,
      WAV_HEADER_BYTES,
    }) => {
      const active = window.mulch.probe().activeDeck;
      try {
        window.mulch.send({ t: "deck.add", deck, emoji: "🏡", name: deckName });
        window.mulch.send({ t: "deck.load", deck, source: { gen, hz: 440 } });
        // The offered name is the active yard's and only its (0133), and a page holding yards
        // already does not hand the active one over to a yard added after them.
        window.mulch.send({ t: "deck.activate", deck });
        // Nothing is started, and nothing is waited for. This is the page a performer reaches the
        // File menu from having stopped everything, and the take is still the whole session: the
        // spec carries the intent to play rather than a reading of the transport (0077).
        if ([deck, imported].some((id) => window.mulch.probe().decks[id].playing)) {
          throw new Error("this scenario exports a session with nothing playing");
        }
        // The checkbox left alone: an export writes the session beside the audio unless someone
        // clears it (P91). And under the name the dialog would offer rather than one this
        // scenario made up: `defaultExportName` through the one function that writes a folder.
        const offered = window.mulch.exportName();
        /**
         * A lookback further back than this page has been running, which is the performance's own
         * beginning (P149): the takes these claims are made through are cold ones, so what is
         * compared is the export and not the warm-up in front of it.
         *
         * Read at every call site rather than once into `spec`: the live clock is the audio
         * context's, and it goes on running through the renders below — a lookback captured
         * before them is a second of grace and then a warm-up nobody asked for, which would make
         * the fade comparison at the end a comparison of two different parts of the performance.
         */
        const fromTheStart = () => window.mulch.stats().at + 1;
        const spec = {
          name: offered,
          secs,
          backSecs: fromTheStart(),
          fadeInSecs: 0,
          fadeOutSecs: 0,
          session: true,
        };
        const exported = await window.mulch.exportAudio(spec);
        // The same envelopes and the same bytes, straight through the harness. `snapshot()` is
        // where the export got the bytes too: a session whose sources were imported cannot be
        // rendered by a host that was not handed them. Warmed exactly as the export warmed —
        // which is nothing here, and is why this render is the length the spec asked for.
        const { blobs } = await window.mulch.snapshot();
        const direct = await window.mulch.render({
          secs: exported.take.warmSecs + secs,
          fromSecs: exported.take.warmSecs,
          envelopes: exported.envelopes,
          blobs,
          wav: true,
        });
        // P149's own take, at the lookback P181 made interesting: nought, which is where the ear
        // is, so the whole performance so far is what stands behind it. What that costs is no
        // longer a render of the whole performance — the export shortens the warm-up to what this
        // rack remembers and renders that (0239) — and what it hands back is still a file of the
        // length that was asked for. The clock is read here so the assertions below can say the
        // performance was older than the warm-up it got, which is the whole claim.
        const settleAt = window.mulch.stats().at;
        const warmed = await window.mulch.exportAudio({ ...spec, backSecs: 0 });
        // The same commands warmed twice: once through the export door and once straight through
        // the harness. What makes a warmed take a re-performance of the part a person heard rather
        // than a fresh one is that everything time-varying counts from its own start and is drawn
        // from a seed, so the two stand where each other stood.
        const mirror = await window.mulch.render({
          secs: warmed.take.warmSecs + secs,
          fromSecs: warmed.take.warmSecs,
          envelopes: exported.envelopes,
          blobs,
        });
        // And the same take as the tail of a render longer than it at both ends, measured across
        // the seconds the two share. This is the one that reads the export's own warm-up back: a
        // take that skipped it would carry the transport's lookahead silence at its head and the
        // wrong seconds behind it.
        const whole = await window.mulch.render({
          secs: warmed.take.warmSecs + secs + past,
          envelopes: exported.envelopes,
          blobs,
        });
        const faded = await window.mulch.exportAudio({
          ...spec,
          backSecs: fromTheStart(),
          fadeInSecs: fade,
          fadeOutSecs: fade,
        });
        // P166: the harness measures itself. Nothing here is told a rate — a report is the
        // render's own clock read against the wall clock at a stop the pump was already making.
        const paced = [];
        await window.mulch.render({
          secs: paceSecs,
          envelopes: exported.envelopes,
          blobs,
          onProgress: (at) => paced.push(at),
        });
        // The case the window must not shorten, and the last thing this yard does before it is
        // taken away: a tape past unity never decays, so the same ask that the rack above settled
        // in a second warms the whole performance instead (0239). Removed immediately afterwards
        // so the exports built below are of the session every claim above was made against.
        window.mulch.send({ t: "effect.add", deck, id: regen, effect: "tape" });
        window.mulch.send({
          t: "param.set",
          deck,
          instance: regen,
          param: "tape.feedback",
          value: selfOsc,
        });
        const refusedAt = window.mulch.stats().at;
        const refused = await window.mulch.exportAudio({ ...spec, backSecs: 0 });
        window.mulch.send({ t: "effect.remove", deck, instance: regen });
        const bytes = new Uint8Array(await exported.file.arrayBuffer());
        const rendered = Uint8Array.fromBase64(direct.wav);
        return {
          offered,
          name: exported.file.name,
          type: exported.file.type,
          folder: exported.folder,
          // The two files the one gesture produced, as the pair a person is handed together.
          sessionName: exported.session === null ? null : exported.session.name,
          sessionType: exported.session === null ? null : exported.session.type,
          sessionBytes: exported.session === null ? 0 : exported.session.size,
          // Cleared, the same export is the audio alone — no archive built and nothing to pair.
          alone:
            (
              await window.mulch.exportAudio({
                ...spec,
                backSecs: fromTheStart(),
                session: false,
              })
            ).session === null,
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
          rate: exported.rate,
          paced,
          cold: exported.take,
          fadedWarm: faded.take.warmSecs,
          settleAt,
          warmed: warmed.take,
          warmedFingerprint: warmed.fingerprint,
          mirror: mirror.fingerprint,
          whole: whole.fingerprint.rmsDb,
          refusedAt,
          refused: refused.take,
        };
      } finally {
        window.mulch.send({ t: "deck.remove", deck });
        if (active !== null) window.mulch.send({ t: "deck.activate", deck: active });
      }
    },
    {
      deck: EXPORT_DECK,
      deckName: EXPORT_DECK_NAME,
      fade: EXPORT_FADE_SECS,
      gen: EXPORT_DECK_GEN,
      imported: IMPORTED_DECK,
      scale: WAV_FULL_SCALE,
      paceSecs: PACED_SECS,
      past: PAST_SECS,
      regen: REGEN_ID,
      secs: EXPORT_SECS,
      selfOsc: SELF_OSC_REGEN,
      WAV_BYTES_PER_SAMPLE,
      WAV_HEADER_BYTES,
    },
  );

  // P114: the offered default is four fields, and is exactly the folder — a name already made of
  // words survives its own cleaning unchanged.
  if (!OFFERED_NAME.test(run.offered)) {
    fail(`the Export Audio dialog offered a name that is not four fields — ${run.offered}`, run);
  }
  if (run.folder !== run.offered) {
    fail(`the offered name did not land as the folder — ${run.offered} became ${run.folder}`, run);
  }
  if (!run.name.endsWith(".wav") || run.type !== "audio/wav") {
    fail(`the export is not a named wav — ${JSON.stringify({ name: run.name, type: run.type })}`);
  }
  // P91: one gesture, two files, one folder — and both named after it, so the pair says where it
  // came from without anyone having to pair them up.
  if (
    run.name !== `${run.folder}.wav` ||
    run.sessionName !== `${run.folder}${SESSION_ARCHIVE_FILE.extension}` ||
    run.sessionType !== SESSION_ARCHIVE_FILE.mediaType ||
    run.sessionBytes <= 0
  ) {
    fail(`the export did not hand back both files of one folder`, run);
  }
  if (!run.alone) {
    fail("an export with the session cleared still built one");
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

  // P166: an export knows how fast it went, because it watched itself go. A rate is a fact about
  // this machine, so what is asserted is that one was measured at all and that it is a speed —
  // never a figure, which would be this laptop's number written into the repo (0051).
  if (!(run.rate > 0)) {
    fail(`an export rendered ${EXPORT_SECS}s and measured no rate — ${String(run.rate)}`, run.rate);
  }
  // The pump reports at the stop it already makes and once more at the end, so a render past one
  // re-arm has two: a countdown that only ever arrived at the end would be a countdown of nothing.
  if (run.paced.length < 2) {
    fail(
      `a ${PACED_SECS}s render reported ${run.paced.length} times — a countdown needs a report ` +
        `before the render it is counting down has finished`,
      run.paced,
    );
  }
  const firstPace = run.paced[0];
  const lastPace = run.paced.at(-1);
  if (
    firstPace.renderedSecs !== AUTOMATION_REARM_SECS ||
    !(lastPace.renderedSecs >= PACED_SECS) ||
    !(firstPace.wallSecs > 0) ||
    !(lastPace.wallSecs >= firstPace.wallSecs) ||
    run.paced.some((at) => at.totalSecs < PACED_SECS)
  ) {
    fail(`a ${PACED_SECS}s render did not report its own clock against the wall clock`, run.paced);
  }
  // And the words the button wears off that first report: a clock with a rate behind it, which is
  // what the dialog says instead of `EXPORT_BUSY` from a second into the press.
  const busy = exportBusySaid(firstPace);
  if (busy === EXPORT_BUSY || !busy.endsWith(" left")) {
    fail(`the export button said "${busy}" off a report it had measured a rate from`, firstPace);
  }

  // P149: a lookback past the beginning of the performance is the beginning of it, and that is
  // the take the parity claim above was made through.
  // Both of them: the fade claim below holds two takes against each other window for window, and
  // two takes that began at different seconds of the performance are not a pair to compare.
  if (run.cold.warmSecs !== 0 || run.cold.clamped || run.fadedWarm !== 0) {
    fail(`a lookback past the start of the performance warmed anyway`, run.cold);
  }
  // P181: the take begins at the ear, so the whole performance stands behind it — and the
  // performance is older than the warm-up it got. Without the ask being the longer of the two
  // there is no shortening here to observe and every claim under this one is about a take nobody
  // bounded.
  if (!(run.settleAt > SETTLE_ASK_SECS)) {
    fail(
      `the performance was ${run.settleAt}s old when the warmed take was asked for, not past the ` +
        `${SETTLE_ASK_SECS}s that makes the ${SETTLE_SECS}s it settles in a shortening worth ` +
        `reading`,
      run.warmed,
    );
  }
  // And what it warmed is what this rack remembers rather than what it asked for, in the unit the
  // render actually drops it in: a head is `Math.round(fromSecs * sampleRate)` frames
  // (src/app/render.ts), and frames are what the windows below are cut from.
  const rate = run.warmedFingerprint.sampleRate;
  const warmedFrames = Math.round(run.warmed.warmSecs * rate);
  if (warmedFrames !== Math.round(SETTLE_SECS * rate) || run.warmed.clamped) {
    fail(
      `a take begun at the ear of a ${run.settleAt}s performance warmed ` +
        `${run.warmed.warmSecs}s — ${warmedFrames} frames against the ` +
        `${Math.round(SETTLE_SECS * rate)} this rack settles in`,
      run.warmed,
    );
  }
  // The rack that remembers everything is the one the window must not touch: the identical ask,
  // with a tape past unity in the chain, warms the whole performance it asked for (0239).
  if (!(run.refused.warmSecs >= run.refusedAt) || run.refused.clamped) {
    fail(
      `a tape at Regen ${SELF_OSC_REGEN} warmed ${run.refused.warmSecs}s of a ${run.refusedAt}s ` +
        `performance — a loop past unity never decays, so no window may shorten it`,
      run.refused,
    );
  }
  // Rendered in front of the take and dropped from it: a warmed take is the same length as the
  // cold one, and it is still a take rather than the silence a lookahead would leave.
  if (run.warmedFingerprint.frames !== run.exported.frames) {
    fail(
      `a warmed take is ${run.warmedFingerprint.frames} frames against the ` +
        `${run.exported.frames} of the same ${EXPORT_SECS}s spec taken cold — a warm-up is ` +
        `dropped, not added`,
      run.warmed,
    );
  }
  const warmedPeak = Math.max(...run.warmedFingerprint.peakDb);
  if (!(warmedPeak > AUDIBLE_PEAK_DB)) {
    fail(`a take warmed ${SETTLE_SECS}s behind the ear peaked at ${warmedPeak}dB — silence`, run);
  }
  // The same commands warmed twice — once through the export door, once through the harness —
  // fingerprint the same. This is what a re-performance of the part a person heard means.
  const twice = compareFingerprints(run.mirror, run.warmedFingerprint);
  if (twice.length > 0) {
    fail(`the same commands warmed ${SETTLE_SECS}s twice did not sound the same`, twice);
  }
  // And that take is the tail of a render longer than it at both ends, measured across the
  // seconds the two share. A take that did not render its own warm-up would sit at the head of
  // this one, carrying the transport's lookahead silence that the warmed windows are past.
  // Whole windows or the comparison below is comparing two different parts of the render and
  // reporting the offset as a parity break. `SETTLE_FLOOR_SECS` has no relation to `WINDOW_SECS`,
  // so this is the one thing standing between a change to that floor and a mystery.
  const from = run.warmed.warmSecs / WINDOW_SECS;
  if (!Number.isInteger(Math.round(from * 1e9) / 1e9)) {
    fail(
      `a warm-up of ${run.warmed.warmSecs}s is ${from} of the ${WINDOW_SECS}s windows this take ` +
        `is compared in — not whole ones, so no window of it lands on a window of the render below`,
      run.warmed,
    );
  }
  const windows = Math.round(EXPORT_SECS / WINDOW_SECS);
  const shared = run.whole.slice(Math.round(from), Math.round(from) + windows);
  const rms = run.warmedFingerprint.rmsDb;
  if (rms.length !== windows || shared.length !== windows) {
    fail(
      `a ${EXPORT_SECS}s take is ${rms.length} windows of the ${run.whole.length} rendered`,
      run,
    );
  }
  const worst = Math.max(...rms.map((db, at) => Math.abs(db - shared[at])));
  if (!(worst <= TOLERANCE_DB)) {
    fail(
      `a take warmed to ${SETTLE_SECS}s parts from the same window of a longer render by ` +
        `${worst.toFixed(2)}dB, past the ${TOLERANCE_DB}dB two renders of one spec may part by`,
      { take: rms, shared },
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
    `the Export Audio dialog's ${EXPORT_SECS}s spec landed ${run.name} and ${run.sessionName} in ` +
      `one folder, and a session with nothing playing peaked at ` +
      `${peak.toFixed(1)}dB and rendered ${run.bytes} bytes parting from the harness's own by ` +
      `${partedPeakDb}dBFS at one sample and ${partedRmsDb}dBFS in energy, and a ` +
      `${EXPORT_FADE_SECS}s fade took ${first.toFixed(1)}dB off the head and ` +
      `${last.toFixed(1)}dB off the tail, and a take begun at the ear of a ${run.settleAt.toFixed(1)}s ` +
      `performance warmed the ${warmedFrames} frames this rack settles in — ${SELF_OSC_REGEN} Regen ` +
      `refused that and warmed ${run.refused.warmSecs.toFixed(1)}s — peaked at ${warmedPeak.toFixed(1)}dB, ` +
      `fingerprinted identically warmed twice and stood ` +
      `${worst.toFixed(2)}dB off the same window of a render ${PAST_SECS.toFixed(1)}s longer, ` +
      `and a ${PACED_SECS}s render reported ${run.paced.length} times — the first at ` +
      `${firstPace.renderedSecs}s of it, ${firstPace.wallSecs.toFixed(2)}s in, which the button ` +
      `says as ` +
      `"${busy}"`,
  );
};
