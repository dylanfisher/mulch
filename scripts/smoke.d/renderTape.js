/**
 * @role P61's seam and its sound: a worklet effect that survives into an export, an offline tail
 * whose repeats darken as they compound, and two renders of one session that are one file.
 */
import { compareFingerprints } from "../../src/lib/fingerprint.ts";
import { fail, report } from "./harness.js";

/** Long enough for eight repeats of the tap below, and a fingerprint window every 0.1s. */
const TAPE_RENDER_SECS = 1.2;
/** The tap the render is built around. Eight of them fit, and none straddles a window edge. */
const TAPE_TIME_SECS = 0.12;
/** How much of its sample-to-sample movement the late tail has to have lost to the loop's
 * filter pair. A loop that band-limited nothing would repeat the burst unchanged. */
const DARKENING = 0.8;
/** How far above the floor a repeat has to sit to be a repeat rather than nothing. */
const AUDIBLE_DB = -60;
/** The yard this scenario adds and takes away again, so the page is left as it was found. */
const TAPE_DECK = "tape-yard";

/** The session, as commands: a burst of noise into a full-wet tape with most of it fed back.
 * Noise rather than a tone on purpose — what darkens is the top of a broadband repeat, and a
 * sine has nothing up there for the loop's filter pair to take away. Seeded, like the loop. */
const session = (mix, noise = 0) => [
  { t: "deck.add", deck: TAPE_DECK, emoji: "📼", name: "Tape Yard" },
  { t: "deck.load", deck: TAPE_DECK, source: { gen: "noise", secs: 0.05 } },
  { t: "effect.add", deck: TAPE_DECK, id: "tape", effect: "tape" },
  { t: "param.set", deck: TAPE_DECK, instance: "tape", param: "tape.time", value: TAPE_TIME_SECS },
  { t: "param.set", deck: TAPE_DECK, instance: "tape", param: "tape.feedback", value: 0.85 },
  { t: "param.set", deck: TAPE_DECK, instance: "tape", param: "tape.tone", value: 1400 },
  { t: "param.set", deck: TAPE_DECK, instance: "tape", param: "tape.drive", value: 3 },
  { t: "param.set", deck: TAPE_DECK, instance: "tape", param: "tape.wow", value: noise },
  { t: "param.set", deck: TAPE_DECK, instance: "tape", param: "tape.hiss", value: noise },
  { t: "param.set", deck: TAPE_DECK, instance: "tape", param: "tape.amount", value: mix },
  { t: "deck.play", deck: TAPE_DECK },
];

export const renderTape = async ({ page }) => {
  const run = await page.evaluate(
    async ({ commands, deck, secs }) => {
      // The rendered samples themselves, taken the way ./parity.js takes them: what darkening
      // means is a spectral claim, and a fingerprint carries level rather than colour. Copied,
      // because a render hands its samples back before it returns (`releaseSamples`).
      const original = OfflineAudioContext.prototype.startRendering;
      let tail;
      OfflineAudioContext.prototype.startRendering = async function () {
        const rendered = await original.call(this);
        // Sample-to-sample movement over level, across two halves of the tail: the same claim a
        // spectral centroid makes, at one pass and no FFT. Measured after the burst is gone, so
        // what is compared is repeats against repeats.
        const half = (fromSecs, toSecs) => {
          let energy = 0;
          let difference = 0;
          for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
            const data = rendered.getChannelData(channel);
            const from = Math.round(fromSecs * rendered.sampleRate);
            const to = Math.round(toSecs * rendered.sampleRate);
            for (let frame = from; frame < to; frame++) {
              energy += Math.abs(data[frame]);
              difference += Math.abs(data[frame] - data[frame - 1]);
            }
          }
          return energy > 0 ? difference / energy : 0;
        };
        tail = { early: half(0.2, 0.55), late: half(0.75, 1.1) };
        return rendered;
      };

      const active = window.mulch.probe().activeDeck;
      try {
        const wet = await window.mulch.render({ secs, envelopes: commands.wet });
        const rendered = tail;
        // The same session with the tape mixed out: the control that says the tail above is the
        // effect and not the source. A render that had silently lost the worklet would look
        // exactly like this one, which is the failure 0068 says an export may not have.
        const dry = await window.mulch.render({ secs, envelopes: commands.dry });
        // Twice, unchanged — and with the wow and the hiss turned up, because that is the only
        // render in which any noise reaches the output at all: with both at zero the deviation
        // and the injected hiss are multiplied out and the comparison would hold whatever the
        // source of the noise was.
        const noisy = await window.mulch.render({ secs, envelopes: commands.noisy });
        const again = await window.mulch.render({ secs, envelopes: commands.noisy });

        // The export seam. The tape is added to the live session, exported through the ordinary
        // dialog path, and the file's own fingerprint held against the harness's render of the
        // very same spec — which is the assertion a worklet registered on only one of the two
        // contexts fails, loudly on the offline one and silently in the file (0088).
        for (const command of commands.wet) window.mulch.send(command);
        const exported = await window.mulch.exportAudio({
          name: "Tape",
          secs,
          fadeInSecs: 0,
          fadeOutSecs: 0,
          // The audio alone: what this scenario compares is samples, and it renders them twice.
          session: false,
        });
        const { blobs } = await window.mulch.snapshot();
        const direct = await window.mulch.render({
          secs,
          envelopes: exported.envelopes,
          blobs,
        });
        return {
          tail: rendered,
          wet: wet.fingerprint,
          dry: dry.fingerprint,
          noisy: noisy.fingerprint,
          again: again.fingerprint,
          exported: exported.fingerprint,
          direct: direct.fingerprint,
          effects: exported.envelopes
            .filter((command) => command.t === "effect.add")
            .map((command) => command.effect),
        };
      } finally {
        OfflineAudioContext.prototype.startRendering = original;
        window.mulch.send({ t: "deck.remove", deck });
        if (active !== null) window.mulch.send({ t: "deck.activate", deck: active });
      }
    },
    {
      commands: { wet: session(1), dry: session(0), noisy: session(1, 0.6) },
      deck: TAPE_DECK,
      secs: TAPE_RENDER_SECS,
    },
  );

  // 0.1s windows. [2] is the second repeat, [9] is most of a second of feedback later.
  const early = run.wet.rmsDb[2];
  const late = run.wet.rmsDb[9];
  const control = run.dry.rmsDb[9];
  if (!(early > AUDIBLE_DB) || !(late > AUDIBLE_DB)) {
    fail(`the tape render has no tail: ${early}dB early, ${late}dB late`, run.wet.rmsDb);
  }
  if (!(late < early)) {
    fail(`the tape tail did not decay: ${early}dB early, ${late}dB late`, run.wet.rmsDb);
  }
  if (!(control < late - 20)) {
    fail(
      `the same session with the tape mixed out rendered the same tail — the effect is not in ` +
        `the offline graph: ${late}dB wet, ${control}dB dry`,
      { dry: run.dry.rmsDb, wet: run.wet.rmsDb },
    );
  }
  if (!(run.tail.late < run.tail.early * DARKENING)) {
    fail(
      `the repeats did not darken as they compounded: ${run.tail.early.toFixed(4)} early, ` +
        `${run.tail.late.toFixed(4)} late`,
      run.tail,
    );
  }
  report(
    `an offline tape tail decayed ${(early - late).toFixed(1)}dB over eight repeats and lost ` +
      `${(100 - (100 * run.tail.late) / run.tail.early).toFixed(0)}% of its movement to the loop's ` +
      "filter pair, against a mixed-out control " +
      `${(late - control).toFixed(1)}dB below it`,
  );

  const drift = compareFingerprints(run.noisy, run.again);
  if (drift.length > 0) {
    fail(
      "two renders of one tape session are not one file — the loop's noise is not seeded",
      drift,
    );
  }
  // The noise has to have reached the output, or the comparison above held two silences of the
  // same shape against each other: a wobbling, hissing tape does not fingerprint like a still one.
  if (compareFingerprints(run.wet, run.noisy).length === 0) {
    fail("wow and hiss at 0.6 rendered the same file as at 0 — neither reached the loop");
  }

  if (!run.effects.includes("tape")) {
    fail(`the export's own commands do not carry the tape — ${JSON.stringify(run.effects)}`);
  }
  const differences = compareFingerprints(run.direct, run.exported);
  if (differences.length > 0) {
    fail(
      "an exported file holding a worklet effect does not sound like the harness render of its " +
        "own spec — the processor is not on both contexts",
      differences,
    );
  }
  report(
    "a worklet effect survived the export: the file's fingerprint matches the harness render of " +
      "its own spec, and two renders of one wobbling, hissing session are identical",
  );
};
