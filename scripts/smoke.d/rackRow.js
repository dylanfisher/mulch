/** @role Every card in a rack row measures one height, whatever its knob captions say (0093). */
import { fail, report } from "./harness.js";

/**
 * After the reload, with the rest of the rack's browser work, and for the same reason (plan §3).
 * The reverb is the card that proves it: "Pre-delay" is a caption that wraps onto a second line
 * at a knob's width, and before every caption spent both line boxes this card stood a line taller
 * than the cards beside it. It arrives by command and leaves the same way, so what ./picker.js
 * left on the page is what ./dragCard.js finds.
 */
export const rackRowHeights = async ({ page }) => {
  const rack = page.getByLabel("Yard A Effects");
  await rack.scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    window.mulch.send({ t: "effect.add", deck: "a", id: "row-reverb", effect: "reverb" }),
  );
  await rack.getByLabel("Reverb 1", { exact: true }).waitFor();

  const cards = await rack.evaluate((section) =>
    [...section.querySelectorAll("[data-drag-card]")].map((card) => ({
      label: card.getAttribute("aria-label"),
      height: card.getBoundingClientRect().height,
    })),
  );

  await page.evaluate(() =>
    window.mulch.send({ t: "effect.remove", deck: "a", instance: "row-reverb" }),
  );
  await page.waitForFunction(() =>
    window.mulch.probe().decks.a.effects.every((entry) => entry.id !== "row-reverb"),
  );

  const measured = cards.map((card) => `${card.label} ${card.height}`).join(", ");
  // Whatever the rack was holding plus this reverb, rather than a count this scenario does not
  // own: what it needs is the reverb and something to measure it against (./picker.js).
  const [first] = cards;
  if (cards.length < 2 || !cards.some((card) => card.label === "Reverb 1")) {
    fail(`rack row smoke: the reverb and a card beside it were not both there — ${measured}`);
  }
  if (cards.some((card) => card.height !== first.height)) {
    fail(`rack row smoke: a wrapped knob caption is making its card taller — ${measured}`);
  }
  report(
    `${cards.length} rack cards, one of them captioned onto a second line, measured ${first.height} high each`,
  );
};
