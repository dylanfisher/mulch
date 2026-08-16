/** @role The effect rack edited through its own controls, then undone and redone one press each. */
import { fail, report } from "./harness.js";

export const rackControls = async ({ page }) => {
  // P4 rides the same browser: bypass, reorder and remove through the visible rack controls,
  // each an ordinary command, then undo and redo of that whole sequence. What it leaves behind
  // — one bypassed filter — is what the save, reload and archive assertions below carry.
  const rack = page.getByLabel("Deck a effects");
  await rack.scrollIntoViewIfNeeded();
  const beforeRack = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  // A rack entry is an instance, so the probe reads the effect each one is of and the bypass
  // flag each one carries; the visible controls are numbered by slot, because two instances of
  // one effect would otherwise share a name (0030).
  const rackIs = (effects, bypassed) =>
    page.waitForFunction(
      ({ effects, bypassed }) => {
        const entries = window.mulch.probe().decks.a.effects;
        return (
          entries.map((entry) => entry.effect).join(",") === effects &&
          entries
            .filter((entry) => entry.bypassed)
            .map((entry) => entry.effect)
            .join(",") === bypassed
        );
      },
      { effects, bypassed },
    );
  await rack.getByRole("button", { name: "add Filter" }).click();
  await rack.getByRole("button", { name: "add Delay" }).click();
  await rackIs("filter,delay", "");
  await rack.getByRole("button", { name: "Bypass Filter 1 on deck a" }).click();
  await rackIs("filter,delay", "filter");
  await rack.getByRole("button", { name: "Move Delay 2 earlier on deck a" }).click();
  await rackIs("delay,filter", "filter");
  await rack.getByRole("button", { name: "Remove Delay 1 from deck a" }).click();
  await rackIs("filter", "filter");
  // One press per operation, both ways: a rack edit is one durable transaction (0023).
  await page.getByRole("button", { name: "undo" }).click();
  await rackIs("delay,filter", "filter");
  await page.getByRole("button", { name: "undo" }).click();
  await rackIs("filter,delay", "filter");
  await page.getByRole("button", { name: "redo" }).click();
  await rackIs("delay,filter", "filter");
  await page.getByRole("button", { name: "redo" }).click();
  await rackIs("filter", "filter");
  // P13's browser half: the add button is never spent, so a second filter joins the first and
  // the two are bypassed one at a time (0030).
  await rack.getByRole("button", { name: "add Filter" }).click();
  await rackIs("filter,filter", "filter");
  await rack.getByRole("button", { name: "Bypass Filter 2 on deck a" }).click();
  await rackIs("filter,filter", "filter,filter");
  await rack.getByRole("button", { name: "Bypass Filter 1 on deck a" }).click();
  await rackIs("filter,filter", "filter");
  await rack.getByRole("button", { name: "Remove Filter 1 from deck a" }).click();
  await rackIs("filter", "filter");
  const rackOps = await page.evaluate(
    (after) =>
      window.mulch
        .ring()
        .filter((event) => event.seq > after)
        .map((event) => event.t),
    beforeRack,
  );

  // One press, one durable event, both ways — a rack operation that emitted twice or emitted an
  // error would mean the UI is doing something the command model is not (0023).
  const rackCount = (t) => rackOps.filter((kind) => kind === t).length;
  if (
    // Three additions and three bypasses: the last of each belongs to P13's second filter, which
    // the same button added and the same controls bypassed on its own (0030).
    rackCount("effect.added") !== 3 ||
    rackCount("effect.bypass.changed") !== 3 ||
    rackCount("effect.reordered") !== 1 ||
    rackCount("effect.removed") !== 2 ||
    rackCount("history.undone") !== 2 ||
    rackCount("history.redone") !== 2 ||
    rackCount("error") > 0
  ) {
    fail(`rack smoke: operations did not each emit one durable event — ${rackOps}`);
  }
  report(
    "rack bypassed, reordered and removed through its controls, undone and redone one press each",
  );
};
