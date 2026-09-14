/**
 * @role A yard's sequence offline: a looped tone rendered through the one chain fading in over a
 * second, playing one, and fading out over one — the level rises, holds and falls where the steps
 * say, two takes of one spec are the same file to the byte, and the same session with no sequence
 * plays level throughout (0379, 0204).
 */
import { fail, report } from "./harness.js";

/** How long the render runs: one step of a second each, and a second past the end. */
const SEQUENCE_RENDER_SECS = 4;
/** The level a window at full play is allowed to stand from the control's, in dB. */
const SEQUENCE_NEAR_DB = 0.5;
/** How much quieter than full the middle of a one-second fade must read, at least, in dB. */
const SEQUENCE_FADE_DB = 3;

export const renderSequence = async ({ page }) => {
  const rendered = await page.evaluate(
    async ({ secs }) => {
      const render = (steps) =>
        window.mulch.render({
          secs,
          envelopes: [
            { t: "deck.load", deck: "a", source: { gen: "sine", hz: 440 } },
            { t: "deck.loop.toggle", deck: "a" },
            { t: "deck.sequence", deck: "a", steps },
            { t: "deck.play", deck: "a" },
          ],
        });
      const breath = [
        { kind: "in", secs: 1 },
        { kind: "play", secs: 1 },
        { kind: "out", secs: 1 },
      ];
      const [faded, again, level] = await Promise.all([render(breath), render(breath), render([])]);
      const print = (result) => ({
        sampleRate: result.fingerprint.sampleRate,
        rmsDb: result.fingerprint.rmsDb,
        frames: result.fingerprint.frames,
      });
      return {
        faded: print(faded),
        same: JSON.stringify(faded.fingerprint) === JSON.stringify(again.fingerprint),
        level: print(level),
      };
    },
    { secs: SEQUENCE_RENDER_SECS },
  );

  const rmsAt = (print, secs) => {
    const window = print.rmsDb.length / (print.frames / print.sampleRate);
    return print.rmsDb[Math.round(secs * window)];
  };
  const full = rmsAt(rendered.level, 1.5);
  const rising = rmsAt(rendered.faded, 0.5);
  const held = rmsAt(rendered.faded, 1.5);
  const falling = rmsAt(rendered.faded, 2.5);
  const after = rmsAt(rendered.faded, 3.5);

  // Where the sequence plays, the yard is the control: the fade is a level of one there.
  if (Math.abs(held - full) > SEQUENCE_NEAR_DB) {
    fail(`the play step read ${held.toFixed(1)}dB against ${full.toFixed(1)}dB level`, rendered);
  }
  // Halfway up and halfway down it is quieter than full, and past the end it holds the fade
  // out's own end — silence — while the source goes on (0379).
  if (!(rising < full - SEQUENCE_FADE_DB) || !(falling < full - SEQUENCE_FADE_DB)) {
    fail(
      `the fades read ${rising.toFixed(1)}dB up and ${falling.toFixed(1)}dB down against ` +
        `${full.toFixed(1)}dB level`,
      rendered,
    );
  }
  if (!(after < falling)) {
    fail(
      `past its end the sequence read ${after.toFixed(1)}dB, louder than its fade out`,
      rendered,
    );
  }
  // A render is a spec: the same fade twice, to the byte (0068, 0204).
  if (!rendered.same) {
    fail("two renders of one sequence did not fingerprint identically", rendered);
  }
  report(
    `offline a sequence faded the yard in to ${held.toFixed(1)}dB — ${rising.toFixed(1)}dB ` +
      `halfway up, ${falling.toFixed(1)}dB halfway down, ${after.toFixed(1)}dB past its end — ` +
      `against ${full.toFixed(1)}dB with none, and rendered the same file twice`,
  );
};
