/**
 * @role P70's offline half: a session holding a tone at a fraction of a hertz renders the same
 * file twice. A pitch that is not a whole number is the one thing about this source that could
 * have arrived rounded, resampled or re-derived per render — so the claim is bit-for-bit the same
 * fingerprint, from two renders of one spec, and a tone that is actually sounding.
 */
import { compareFingerprints } from "../../src/lib/fingerprint.ts";
import { fail, PARITY_RENDER_SECS, report } from "./harness.js";

/** The pitch. A quarter of a hertz off 440 — the fraction a whole-number field would step over. */
const TONE_HZ = 440.25;
/** How far above silence a sounding tone has to peak to be a tone rather than nothing. */
const AUDIBLE_DB = -20;
/** The yard this scenario renders in. It exists only inside the render, which builds its own
 * instrument on its own context, so nothing here reaches the page's session. */
const TONE_DECK = "tone-yard";

export const renderTone = async ({ page }) => {
  const rendered = await page.evaluate(
    async ({ secs, hz, deck }) => {
      const envelopes = [
        { t: "deck.add", deck, emoji: "🌵", name: "Still Sorrel" },
        { t: "deck.load", deck, source: { gen: "tone", secs, hz } },
        { t: "deck.play", deck },
      ];
      const first = await window.mulch.render({ secs, envelopes });
      const second = await window.mulch.render({ secs, envelopes });
      return {
        first: first.fingerprint,
        second: second.fingerprint,
        source: first.probes.at(-1).probe.decks[deck].source,
      };
    },
    { secs: PARITY_RENDER_SECS, hz: TONE_HZ, deck: TONE_DECK },
  );

  // The fraction survived the wire, the reducer and the restore — a render whose session had
  // rounded the pitch would be perfectly reproducible and perfectly wrong.
  if (rendered.source?.hz !== TONE_HZ || rendered.source?.gen !== "tone") {
    fail(`the rendered session was not holding the tone it was asked for`, rendered.source);
  }
  if (!(Math.max(...rendered.first.peakDb) > AUDIBLE_DB)) {
    fail(`a tone rendered nothing audible: peaked at ${rendered.first.peakDb}dBFS`, rendered.first);
  }
  const differences = compareFingerprints(rendered.first, rendered.second);
  if (differences.length > 0) {
    fail(`two renders of one tone were two different files:\n  ${differences.join("\n  ")}`);
  }
  report(
    `a yard holding a ${TONE_HZ}Hz tone rendered the same file twice, peaking at ` +
      `${Math.max(...rendered.first.peakDb).toFixed(1)}dBFS`,
  );
};
