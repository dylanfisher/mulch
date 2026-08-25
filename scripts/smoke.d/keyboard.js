/**
 * @role The keyboard and the deck list through the visible affordances: what selects a deck,
 * what the transport keys do, and the two routes that have to ignore them.
 */
import { fail } from "./harness.js";
import { SURFACE_CLICK_HZ } from "./surface.js";

export const keyboardRoutes = async ({ page }) => {
  // P12: a fresh session boots with deck a alone, so the second deck is one this page adds
  // through the visible affordance — the same one that would add the first (0029). Everything
  // below that names deck b depends on this click having happened.
  await page.getByRole("button", { name: "Add Yard" }).click();
  await page.waitForFunction(
    () =>
      window.mulch
        .probe()
        .deckList.map((entry) => entry.id)
        .join(",") === "a,b",
  );

  // P16: touching a deck anywhere is what selects it, so this press on deck b's waveform is
  // the whole gesture — there is no select button left to aim at. M8's keyboard route rides
  // the same page: an editable field retains Space/L, and Space anywhere else is the whole
  // instrument's transport, whatever holds focus (0037, P66) — here only yard A is loaded, so
  // it is the only one that answers.
  await page.locator('canvas[aria-label="Yard B Waveform"]').click();
  await page.waitForFunction(() => window.mulch.probe().activeDeck === "b");
  const beforeEditable = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  await page.locator('input[aria-label="Import Audio for Yard A"]').focus();
  await page.keyboard.press("KeyL");
  const editableEvents = await page.evaluate(
    (after) => window.mulch.ring().filter((event) => event.seq > after),
    beforeEditable,
  );
  // Back onto deck a by touching it, which is still the whole gesture — on the readout beside
  // the heading rather than on the heading, because the heading is now the fold (P73).
  await page.locator('section[aria-label^="Yard A"] header span[title]').click();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press("Space");
  await page.waitForFunction(() =>
    window.mulch.ring().some((event) => event.t === "deck.started" && event.deck === "a"),
  );
  // The second press pauses rather than stops: the deck holds the playhead it had reached, and
  // the stop button beside it is what sends that playhead back to the start (0038).
  await page.keyboard.press("Space");
  await page.waitForFunction(() =>
    window.mulch
      .ring()
      .some(
        (event) => event.t === "deck.stopped" && event.deck === "a" && event.reason === "paused",
      ),
  );
  const heldAt = await page.evaluate(() => window.mulch.probe().decks.a.paused);
  if (!(heldAt > 0)) fail("pause: deck a held nothing", { heldAt });
  await page
    .locator('section[aria-label^="Yard A"]')
    .getByRole("button", { name: "Stop", exact: true })
    .click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.paused === null);
  await page.evaluate(() => {
    window.mulch.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.33 });
  });
  const beforeEditableUndo = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  await page.locator('input[aria-label="Import Audio for Yard A"]').focus();
  await page.keyboard.press("Control+Z");
  const editableUndoIgnored = await page.evaluate(
    (after) =>
      window.mulch.probe().decks.a.params["deck.gain"] === 0.33 &&
      !window.mulch.ring().some((event) => event.seq > after && event.t === "history.undone"),
    beforeEditableUndo,
  );
  await page.getByRole("button", { name: "undo" }).click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.params["deck.gain"] === 1);
  const redoEnabledAfterUndo = await page.getByRole("button", { name: "redo" }).isEnabled();
  await page.getByRole("button", { name: "redo" }).click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.params["deck.gain"] === 0.33);
  const redoDisabledAfterRedo = await page.getByRole("button", { name: "redo" }).isDisabled();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press("Control+Z");
  await page.waitForFunction(() => window.mulch.probe().decks.a.params["deck.gain"] === 1);
  await page.keyboard.press("Control+Shift+Z");
  await page.waitForFunction(() => window.mulch.probe().decks.a.params["deck.gain"] === 0.33);
  const beforeDevRoute = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  await page.evaluate(() => {
    window.location.hash = "#/dev";
  });
  await page.locator("#type").waitFor();
  await page.keyboard.press("Space");
  const devRouteEvents = await page.evaluate(
    (after) => window.mulch.ring().filter((event) => event.seq > after),
    beforeDevRoute,
  );
  await page.evaluate(() => {
    window.location.hash = "";
  });
  await page.locator('canvas[aria-label="Yard B Waveform"]').waitFor();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const globalAfter = await page.evaluate((hz) => {
    // A click train rather than a tone, because P7 measures this deck further down: four clicks
    // a second across the one length a drawn source has is sixteen onsets and, folded into
    // range, 120bpm. Loading it here rather than there lets the worker answer while the page
    // does other work. Its length is the surface's, because every gesture below reads that
    // canvas as this axis (SURFACE_SECS, ./surface.js).
    window.mulch.send({
      t: "deck.load",
      deck: "b",
      source: { gen: "click-train", hz },
    });
    return window.mulch.ring().at(-1).seq;
  }, SURFACE_CLICK_HZ);
  await page.keyboard.press("Space");
  await page.waitForFunction(
    (after) =>
      new Set(
        window.mulch
          .ring()
          .filter((event) => event.seq > after && event.t === "deck.started")
          .map((event) => event.deck),
      ).size === 2,
    globalAfter,
  );
  const globalStarts = await page.evaluate(
    (after) =>
      window.mulch
        .ring()
        .filter((event) => event.seq > after && event.t === "deck.started")
        .map((event) => event.at),
    globalAfter,
  );
  await page.keyboard.press("Space");
  await page.waitForFunction(
    (after) =>
      new Set(
        window.mulch
          .ring()
          .filter(
            (event) => event.seq > after && event.t === "deck.stopped" && event.reason === "paused",
          )
          .map((event) => event.deck),
      ).size === 2,
    globalAfter,
  );
  const keyboard = await page.evaluate(
    ({
      devRouteEvents,
      editableEvents,
      editableUndoIgnored,
      globalStarts,
      redoDisabledAfterRedo,
      redoEnabledAfterUndo,
    }) => ({
      editableIgnored: !editableEvents.some(
        (event) => event.t === "deck.loop.changed" || event.t === "error",
      ),
      editableUndoIgnored,
      devRouteIgnored: !devRouteEvents.some((event) =>
        ["deck.started", "deck.stopped", "error"].includes(event.t),
      ),
      activeDeck: window.mulch.probe().activeDeck,
      activatedBoth: ["a", "b"].every((deck) =>
        window.mulch.ring().some((event) => event.t === "deck.activated" && event.deck === deck),
      ),
      globalAligned:
        globalStarts.length === 2 && globalStarts.every((at) => at === globalStarts[0]),
      historyCommands:
        window.mulch.ring().filter((event) => event.t === "history.undone").length >= 2 &&
        window.mulch.ring().filter((event) => event.t === "history.redone").length >= 2,
      historyButtons: redoEnabledAfterUndo && redoDisabledAfterRedo,
      errors: window.mulch
        .ring()
        .filter((event) => event.t === "error")
        .map((event) => event.detail),
    }),
    {
      devRouteEvents,
      editableEvents,
      editableUndoIgnored,
      globalStarts,
      redoDisabledAfterRedo,
      redoEnabledAfterUndo,
    },
  );

  if (
    !keyboard.editableIgnored ||
    !keyboard.devRouteIgnored ||
    keyboard.activeDeck !== "a" ||
    !keyboard.activatedBoth ||
    !keyboard.globalAligned ||
    !keyboard.historyCommands ||
    !keyboard.historyButtons ||
    !keyboard.editableUndoIgnored ||
    keyboard.errors.length > 0
  ) {
    fail(`keyboard smoke: command path is wrong — ${JSON.stringify(keyboard)}`);
  }
};
