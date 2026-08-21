/**
 * @role The player offline: the same session renders the same file, two seeds render two
 * different ones, and a pattern of jumps arrives without a click in it (0089).
 */
import { fail, report } from "./harness.js";

/** Long enough to hold a dozen slots and several jumps, short enough to join the other renders. */
const PLAYER_RENDER_SECS = 0.6;
/** The loop the grid divides: 0.8s over sixteen slots is 50ms a slot, well clear of the floor. */
const PLAYER_LOOP_SECS = 0.8;
/** A sine, so any seam the player failed to fade is a discontinuity the fingerprint counts. */
const PLAYER_SOURCE_SECS = 1;
/**
 * Clicks per second in the source the seeds are compared over. A sine reads the same in every
 * slot of the loop, so it can prove a render is reproducible and nothing about which slot was
 * read; a 20Hz click train puts a transient in some slots and silence in others, which is what
 * makes two seeds two different files rather than two spellings of one.
 */
const PLAYER_SEED_SOURCE_HZ = 20;
/**
 * How many clicks a faded pattern may leave. Zero: `CLICK_DELTA` is a quarter of full scale and
 * an unfaded jump between two phases of a 440Hz sine is most of it, so this is the assertion that
 * every jump is a crossfade and not a butt splice (src/lib/fingerprint.ts).
 */
const PLAYER_MAX_CLICKS = 0;

export const renderPlayer = async ({ page }) => {
  const rendered = await page.evaluate(
    async ({ secs, loop, source, clicks }) => {
      const session = (player, gen = "sine", hz = 440) => ({
        secs,
        envelopes: [
          { t: "deck.load", deck: "a", source: { gen, hz, secs: source } },
          { t: "deck.loop", deck: "a", in: 0, out: loop },
          ...(player === null ? [] : [{ t: "deck.player", deck: "a", player }]),
          { t: "deck.play", deck: "a" },
        ],
      });
      const pattern = (seed, gate) => ({
        seed,
        variation: "wander",
        distance: 5,
        repeats: 2,
        gate,
      });
      // Two runs of one session, one run of the same session on another seed, one with no player
      // at all, and one stuttering — all through the one render harness (0068).
      const grain = (player) => session(player, "click-train", clicks);
      const [first, second, other, straight, faded, stuttered] = await Promise.all([
        window.mulch.render(grain(pattern(11, 0))),
        window.mulch.render(grain(pattern(11, 0))),
        window.mulch.render(grain(pattern(12, 0))),
        window.mulch.render(grain(null)),
        window.mulch.render(session(pattern(11, 0))),
        window.mulch.render(session(pattern(11, 1))),
      ]);
      const held = straight.probes.at(-1).probe.decks.a;
      return {
        first: first.fingerprint,
        second: second.fingerprint,
        other: other.fingerprint,
        straight: straight.fingerprint,
        faded: faded.fingerprint,
        stuttered: stuttered.fingerprint,
        // A deck rendered with no player holds none, which is what makes it the control.
        control: held.player,
        // What the session ended up holding for the jumping one — the seed included, because the
        // seed is the field that makes the performance reproducible.
        player: first.probes.at(-1).probe.decks.a.player,
      };
    },
    {
      secs: PLAYER_RENDER_SECS,
      loop: PLAYER_LOOP_SECS,
      source: PLAYER_SOURCE_SECS,
      clicks: PLAYER_SEED_SOURCE_HZ,
    },
  );

  const asText = (print) => JSON.stringify(print);
  // The whole point of a seed: not "close enough", the same file. Every field, exactly.
  if (asText(rendered.first) !== asText(rendered.second)) {
    fail("two renders of one session did not fingerprint the same", {
      first: rendered.first,
      second: rendered.second,
    });
  }
  if (asText(rendered.first) === asText(rendered.other)) {
    fail("two seeds rendered the same file, so the seed reaches nothing", rendered.first);
  }
  // And the difference is the pattern rather than one window of it: the two seeds read from
  // different slots for most of the pass.
  const moved = rendered.first.rmsDb.filter(
    (db, index) => Math.abs(db - rendered.other.rmsDb[index]) > 0.5,
  );
  if (moved.length < 2) {
    fail("two seeds rendered nearly the same windows", {
      first: rendered.first.rmsDb,
      other: rendered.other.rmsDb,
    });
  }
  // The control: a session with no player renders something else again, so what is being measured
  // above is a deck that actually jumped rather than one that ignored the module.
  if (asText(rendered.first) === asText(rendered.straight)) {
    fail("a player changed nothing about the render", rendered.straight);
  }
  if (rendered.control !== null) {
    fail(`a deck rendered with no player held ${JSON.stringify(rendered.control)}`);
  }
  if (rendered.player?.seed !== 11) {
    fail(`the session did not hold the seed it rendered — ${JSON.stringify(rendered.player)}`);
  }
  // Every jump is a fade at the seam: a sine crossfaded at equal power leaves no first difference
  // a fingerprint reads as an edit, gated or not.
  for (const [name, print] of [
    ["a jumping", rendered.faded],
    ["a stuttering", rendered.stuttered],
  ]) {
    if (print.clicks > PLAYER_MAX_CLICKS) {
      fail(`${name} render left ${print.clicks} clicks in it`, print);
    }
  }
  report(
    `the same session rendered the same file twice (${rendered.first.rmsDb.length} windows, ` +
      `peak ${rendered.first.peakDb[0]}dBFS), seed 12 moved ${moved.length} of them, and ` +
      "neither the jumping nor the stuttering sine left a click at a seam",
  );
};
