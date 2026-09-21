/** @role One rack card carried to another yard and back through its own Move To menu (0381). */
import { MOVE_TO_LABEL } from "../../src/lib/copy.ts";
import { fail, rackHolds, report } from "./harness.js";

/**
 * The gesture the human reported as a crash: the menu is a Base UI one, and a heading with no
 * group around it throws while the popup renders, so the menu never opens and the card never
 * goes anywhere (0381). Nothing below the UI could see that — the command chain carries the
 * instance between any two racks with no engine or store complaint at all — so the proof has to
 * be a real browser opening the real popup.
 *
 * It runs on what ./dragCard.js left and puts it back: the carried instance is seeded here and
 * removed at the end, so the rack this lane hands on is the one it was handed.
 */
export const moveCardBetweenRacks = async ({ page }) => {
  const rack = page.getByLabel("Yard A Effects");
  await rack.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  await page.evaluate(() =>
    window.mulch.send({ t: "effect.add", deck: "a", id: "carried", effect: "crush" }),
  );
  const holds = (deck, effects) => rackHolds(page, deck, effects);
  await holds("a", "panner,eq,crush");
  // The yard it is carried to is named on the item the way the session stored it (0057), so the
  // name is read off the session rather than restated here.
  const bee = await page.evaluate(
    () => window.mulch.probe().deckList.find((entry) => entry.id === "b").name,
  );

  // The trigger names the card and the rack it is standing on, so it is asked for by that whole
  // name: `.last()` would resolve against whatever the DOM held at that instant, and the wait
  // above is a wait on the store rather than on a painted card.
  const moveFrom = (rack, from) =>
    rack.getByRole("button", { name: `${MOVE_TO_LABEL} Crush 1 from ${from}`, exact: true });
  await moveFrom(rack, "Yard A").click();
  // Opening it at all is the assertion: the reported crash threw here, which left the trigger
  // pressed and no menu on the page.
  const toBee = page.getByRole("menuitem", { name: `${MOVE_TO_LABEL} ${bee}`, exact: true });
  await toBee.click();
  await holds("b", "crush");
  await holds("a", "panner,eq");

  // And back, from the yard it landed on: the menu on the arrived card is a menu that was built
  // on the other rack, and it offers the rack the instance came from by that rack's own name.
  const other = page.getByLabel("Yard B Effects");
  await other.scrollIntoViewIfNeeded();
  const home = await page.evaluate(
    () => window.mulch.probe().deckList.find((entry) => entry.id === "a").name,
  );
  await moveFrom(other, "Yard B").click();
  await page.getByRole("menuitem", { name: `${MOVE_TO_LABEL} ${home}`, exact: true }).click();
  await holds("a", "panner,eq,crush");
  await holds("b", "");

  const errors = await page.evaluate(
    (after) =>
      window.mulch
        .ring()
        .filter((event) => event.seq > after && event.t === "error")
        .map((event) => event.detail),
    before,
  );
  if (errors.length > 0) fail(`move smoke: the round trip logged ${errors.join(" | ")}`);
  // Out again, so the rack this lane hands on is the pair ./dragCard.js left.
  await page.evaluate(() =>
    window.mulch.send({ t: "effect.remove", deck: "a", instance: "carried" }),
  );
  await holds("a", "panner,eq");
  report("a rack card was carried to another yard and back through its own Move To menu");
};
