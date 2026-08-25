/**
 * @role The tone offline: a session holding one at a fraction of a hertz renders the same file
 * twice, and a pitch moved mid-render is a bend rather than a restart. The pitch is `deck.tone`
 * now, a declared parameter read as a rate against the reference buffer (0110) — so the two
 * claims are one fingerprint twice over, and a move that neither restarts the source nor leaves
 * a discontinuity in the samples.
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
/**
 * The bend: an octave and a fifth up, low enough that the wave's own slew stays well under
 * CLICK_DELTA at either end, so the click count measures the seam and not the brightness.
 */
const BEND_FROM = 110;
const BEND_TO = 330;
/** Where the move lands, and how long the bend render runs: windows either side of the move. */
const BEND_AT = 0.3;
const BEND_SECS = 0.6;

export const renderTone = async ({ page }) => {
  const rendered = await page.evaluate(
    async ({ secs, hz, deck, from, to, at, bendSecs }) => {
      const envelopes = [
        { t: "deck.add", deck, emoji: "🌵", name: "Still Sorrel" },
        { t: "deck.load", deck, source: { gen: "tone" } },
        { t: "param.set", deck, param: "deck.tone", value: hz },
        { t: "deck.play", deck },
      ];
      const first = await window.mulch.render({ secs, envelopes });
      const second = await window.mulch.render({ secs, envelopes });
      const bending = (moves) =>
        window.mulch.render({
          secs: bendSecs,
          envelopes: [
            { t: "deck.add", deck, emoji: "🌵", name: "Still Sorrel" },
            { t: "deck.load", deck, source: { gen: "tone" } },
            { t: "param.set", deck, param: "deck.tone", value: from },
            { t: "deck.play", deck },
            ...moves.map((value) => ({
              at,
              cmd: { t: "param.set", deck, param: "deck.tone", value },
            })),
          ],
        });
      const [held, bent] = await Promise.all([bending([]), bending([to])]);
      return {
        first: first.fingerprint,
        second: second.fingerprint,
        source: first.probes.at(-1).probe.decks[deck].source,
        pitch: first.probes.at(-1).probe.decks[deck].params["deck.tone"],
        loop: first.probes.at(-1).probe.decks[deck].loop,
        held: { clicks: held.fingerprint.clicks, rmsDb: held.fingerprint.rmsDb },
        bent: {
          clicks: bent.fingerprint.clicks,
          rmsDb: bent.fingerprint.rmsDb,
          pitch: bent.probes.at(-1).probe.decks[deck].params["deck.tone"],
          starts: bent.events.filter((event) => event.t === "deck.started").length,
        },
      };
    },
    {
      secs: PARITY_RENDER_SECS,
      hz: TONE_HZ,
      deck: TONE_DECK,
      from: BEND_FROM,
      to: BEND_TO,
      at: BEND_AT,
      bendSecs: BEND_SECS,
    },
  );

  // The pitch left the load and is the deck's own parameter, and the fraction survived the wire,
  // the reducer and the restore — a render that had rounded it would be perfectly reproducible
  // and perfectly wrong. The load carries no `hz` at all any more, and it loads looped.
  if (rendered.source?.gen !== "tone" || rendered.source?.hz !== undefined) {
    fail(`the rendered session was not holding the tone it was asked for`, rendered.source);
  }
  if (rendered.pitch !== TONE_HZ) {
    fail(`the tone's pitch did not reach the session — saw ${rendered.pitch}`);
  }
  if (rendered.loop === null) fail(`a tone rendered unlooped, so it would simply stop`);
  if (!(Math.max(...rendered.first.peakDb) > AUDIBLE_DB)) {
    fail(`a tone rendered nothing audible: peaked at ${rendered.first.peakDb}dBFS`, rendered.first);
  }
  const differences = compareFingerprints(rendered.first, rendered.second);
  if (differences.length > 0) {
    fail(`two renders of one tone were two different files:\n  ${differences.join("\n  ")}`);
  }

  // The bend: one start and no second one, so the source that was playing kept playing; no click
  // the held control did not also have, so the wave went on from the phase it had reached; and a
  // different render from the held one, so the pitch actually moved (0110).
  if (rendered.bent.starts !== 1) {
    fail(`a pitch move restarted the tone — the graph reported ${rendered.bent.starts} starts`);
  }
  if (rendered.bent.clicks > rendered.held.clicks) {
    fail(
      `a pitch move left a discontinuity: ${rendered.bent.clicks} clicks against ` +
        `${rendered.held.clicks} in the same render held still`,
    );
  }
  if (rendered.bent.pitch !== BEND_TO) {
    fail(`the moved pitch did not reach the session — saw ${rendered.bent.pitch}`);
  }
  if (JSON.stringify(rendered.bent.rmsDb) === JSON.stringify(rendered.held.rmsDb)) {
    fail(`a pitch move changed nothing about the render — ${JSON.stringify(rendered.held.rmsDb)}`);
  }
  report(
    `a yard holding a ${TONE_HZ}Hz tone rendered the same file twice, peaking at ` +
      `${Math.max(...rendered.first.peakDb).toFixed(1)}dBFS; bending ${BEND_FROM}Hz to ${BEND_TO}Hz ` +
      `mid-render kept one start and left ${rendered.bent.clicks} clicks`,
  );
};
