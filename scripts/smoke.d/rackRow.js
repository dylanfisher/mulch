/**
 * @role Every card in a rack row measures one height, whatever its knob captions say (0093) — and
 * a card lands where the hand put it: a copy sits next to its original (P113).
 */
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

  // The other thing a rack has to get right about where a card is: a copy lands immediately after
  // the card it was copied from, not at the end of the row (0111, P113). The first instance is the
  // one that proves it — duplicating the last would land at the end either way.
  await page.evaluate(() => {
    const [first] = window.mulch.probe().decks.a.effects;
    window.mulch.send({
      t: "effect.duplicate",
      deck: "a",
      instance: first.id,
      id: "row-copy",
    });
  });
  await page.waitForFunction(() =>
    window.mulch.probe().decks.a.effects.some((entry) => entry.id === "row-copy"),
  );
  const landed = await page.evaluate(() =>
    window.mulch
      .probe()
      .decks.a.effects.map((entry) => entry.id)
      .join(","),
  );

  await page.evaluate(() => {
    for (const instance of ["row-copy", "row-reverb"]) {
      window.mulch.send({ t: "effect.remove", deck: "a", instance });
    }
  });
  await page.waitForFunction(() =>
    window.mulch
      .probe()
      .decks.a.effects.every((entry) => entry.id !== "row-reverb" && entry.id !== "row-copy"),
  );

  if (landed.split(",")[1] !== "row-copy") {
    fail(`rack row smoke: a duplicate landed away from its original — ${landed}`);
  }

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
    `${cards.length} rack cards, one of them captioned onto a second line, measured ${first.height} high each, and a copy landed beside its original`,
  );
};
