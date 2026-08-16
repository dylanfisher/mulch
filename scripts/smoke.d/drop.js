/** @role The same load, reached by dragging a file onto a deck's waveform instead of picking it. */
import { fail, report } from "./harness.js";

export const dropFile = async ({ page, bytes }) => {
  const wav = bytes.wav;
  // P19: the same load, reached by dragging a file onto a deck's waveform instead of picking
  // it. Deck b is made active first so the drop lands on one that is not — the affordance has
  // to select the deck the hand is on, which no pointer press announced (P16). The surface is
  // located by the highlight attribute it owns, because that attribute is the affordance.
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.activate", deck: "b" });
  });
  const dropSurface = page.locator('section[aria-label^="Yard A"] [data-dropping]');
  const dropped = await page.evaluateHandle((bytes) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)], "dropped.wav", { type: "audio/wav" }));
    return transfer;
  }, wav);
  const beforeDrop = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  await dropSurface.dispatchEvent("dragover", { dataTransfer: dropped });
  await page
    .locator('section[aria-label^="Yard A"] [data-dropping="true"]')
    .waitFor({ timeout: 5_000 });
  await dropSurface.dispatchEvent("drop", { dataTransfer: dropped });
  await page.waitForFunction(
    (after) =>
      window.mulch
        .ring()
        .some((event) => event.seq > after && event.t === "deck.loaded" && event.deck === "a"),
    beforeDrop,
    { timeout: 5_000 },
  );
  // Refused the same way it arrived the other way: one declaration, one refusal, both routes.
  const refusedDrop = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["not audio"], "dropped.txt", { type: "text/plain" }));
    return transfer;
  });
  await dropSurface.dispatchEvent("drop", { dataTransfer: refusedDrop });
  const dropRefusal = await page
    .locator('section[aria-label^="Yard A"] [role="alert"]')
    .textContent();
  const drop = await page.evaluate((after) => {
    const probe = window.mulch.probe();
    return {
      // Exactly one load: a drop is one command, not one per file-ish thing the event carried.
      loads: window.mulch
        .ring()
        .filter((event) => event.seq > after && event.t === "deck.loaded" && event.deck === "a")
        .length,
      blobId: probe.decks.a.source.blobId,
      duration: probe.decks.a.duration,
      activeDeck: probe.activeDeck,
      // Cleared on drop, so the surface is not left lit with nothing being dragged.
      highlighted: document.querySelector('section[aria-label^="Yard A"] [data-dropping]').dataset
        .dropping,
    };
  }, beforeDrop);

  if (drop.loads !== 1 || !(drop.duration > 0)) {
    fail("a file dropped on a waveform did not load that deck exactly once", drop);
  }
  if (drop.activeDeck !== "a") {
    fail("a drop on an inactive deck did not select it", drop);
  }
  if (drop.highlighted !== "false") {
    fail("the drop target stayed highlighted after the file landed", drop);
  }
  if (!/dropped\.txt/u.test(dropRefusal ?? "")) {
    fail(`a dropped file the declaration refuses said nothing visible — ${dropRefusal}`);
  }
  report(
    `a wav dropped on an inactive deck's waveform lit the target, loaded it once to ` +
      `${drop.duration.toFixed(2)}s and selected that deck; a dropped .txt was ` +
      "refused in the same words the picker refuses one",
  );
};
