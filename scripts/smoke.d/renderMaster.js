/**
 * @role The rack that is no yard's, offline: an effect addressed with null is heard on everything
 * the session puts out, and an instance moved onto it goes on being heard whole (0320, 0321).
 */
import { fail, RACK_RENDER_SECS, report } from "./harness.js";

/** How much a 733Hz sine has to drop through a 200Hz lowpass standing under all the yards. */
const MASTER_FILTER_DB = 10;
/** How closely two renders of one session have to agree to be the same performance twice. */
const SAME_TAKE_DB = 0.5;

export const renderMaster = async ({ page }) => {
  const takes = await page.evaluate(async (secs) => {
    const session = (envelopes) => ({
      secs,
      envelopes: [
        { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733 } },
        { t: "deck.loop.toggle", deck: "a" },
        ...envelopes,
        { t: "deck.play", deck: "a" },
      ],
    });
    // Nothing under the yards: the control every reading below is taken against.
    const bare = await window.mulch.render(session([]));
    // One low-pass EQ on the rack that is no yard's, closed onto the tone. It is not in any deck's
    // rack, so if the master rack were not in the signal path this would render the control.
    const master = await window.mulch.render(
      session([
        { t: "effect.add", deck: null, id: "flt", effect: "eq" },
        { t: "param.set", deck: null, instance: "flt", param: "eq.frequency", value: 200 },
        { t: "param.set", deck: null, instance: "flt", param: "eq.shape", value: 1 },
      ]),
    );
    // The same take again, so a difference below is the rack and not the machine.
    const again = await window.mulch.render(
      session([
        { t: "effect.add", deck: null, id: "flt", effect: "eq" },
        { t: "param.set", deck: null, instance: "flt", param: "eq.frequency", value: 200 },
        { t: "param.set", deck: null, instance: "flt", param: "eq.shape", value: 1 },
      ]),
    );
    // And the same EQ built on the yard and then carried onto the master: one instance, the
    // same id and the same value, heard from the rack it was moved into.
    const moved = await window.mulch.render(
      session([
        { t: "effect.add", deck: "a", id: "flt", effect: "eq" },
        { t: "param.set", deck: "a", instance: "flt", param: "eq.frequency", value: 200 },
        { t: "param.set", deck: "a", instance: "flt", param: "eq.shape", value: 1 },
        { t: "effect.move", from: "a", to: null, instance: "flt", index: 0 },
      ]),
    );
    const at = (result) => result.fingerprint.rmsDb[2];
    const probe = moved.probes.at(-1).probe;
    return {
      bareDb: at(bare),
      masterDb: at(master),
      againDb: at(again),
      movedDb: at(moved),
      // Where the instance ended up, and that it took its value with it.
      yard: probe.decks.a.effects.length,
      held: probe.master.effects.map((entry) => `${entry.id}:${entry.effect}`).join(","),
      cutoff: probe.master.effects[0]?.params["eq.frequency"],
    };
  }, RACK_RENDER_SECS);

  if (takes.bareDb - takes.masterDb < MASTER_FILTER_DB) {
    fail(
      `an effect on the rack that is no yard's did not reach the output: ${takes.bareDb}dB bare, ` +
        `${takes.masterDb}dB through the master EQ`,
      takes,
    );
  }
  if (Math.abs(takes.masterDb - takes.againDb) > SAME_TAKE_DB) {
    fail(
      `one session through a master rack rendered two different takes: ${takes.masterDb}dB and ` +
        `${takes.againDb}dB`,
      takes,
    );
  }
  if (takes.yard !== 0 || takes.held !== "flt:eq" || takes.cutoff !== 200) {
    fail(`a moved instance did not arrive whole — ${JSON.stringify(takes)}`);
  }
  if (Math.abs(takes.movedDb - takes.masterDb) > SAME_TAKE_DB) {
    fail(
      `an EQ moved onto the master sounded unlike one built there: ${takes.movedDb}dB moved, ` +
        `${takes.masterDb}dB built`,
      takes,
    );
  }
  report(
    `a low-pass under all the yards took ${(takes.bareDb - takes.masterDb).toFixed(1)}dB off the ` +
      `offline take and rendered twice within ${Math.abs(takes.masterDb - takes.againDb).toFixed(2)}dB; ` +
      `the same EQ dragged out of the yard's own rack onto it rendered within ` +
      `${Math.abs(takes.movedDb - takes.masterDb).toFixed(2)}dB of that, carrying its 200Hz with it`,
  );
};
