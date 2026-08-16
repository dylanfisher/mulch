/** @role The header's stereo peak meter: two bars that move while a yard plays and empty when it stops. */
import { fail, report } from "./harness.js";

/**
 * After the reload, like everything that drives the page (plan §3). Deck a is the restored sine,
 * so what the bus carries here is a known signal rather than whatever the last scenario left.
 */
const sample = (page) =>
  page.evaluate(() => {
    const bars = [...document.querySelectorAll('[data-slot="master-level"]')];
    return {
      channels: bars.map((bar) => bar.dataset.channel).join(","),
      scales: bars.map((bar) => bar.style.transform),
      clipped: document.querySelector('[data-slot="master-clip"]')?.dataset.clipped,
    };
  });

/** `scaleY(0.5)` → 0.5, and anything the meter has not painted yet → 0. */
const heightOf = (transform) =>
  Number(/scaleY\(([\d.]+)\)/u.exec(transform ?? "")?.[1] ?? Number.NaN);

export const masterMeter = async ({ page }) => {
  const still = await sample(page);

  await page.evaluate(() => {
    window.mulch.send({ t: "deck.play", deck: "a" });
  });
  const moving = await (
    await page.waitForFunction(
      () => {
        const bars = [...document.querySelectorAll('[data-slot="master-level"]')];
        const scales = bars.map((bar) => bar.style.transform);
        const risen = scales.every(
          (scale) => Number(/scaleY\(([\d.]+)\)/u.exec(scale)?.[1] ?? 0) > 0,
        );
        return bars.length === 2 && risen ? { scales } : null;
      },
      undefined,
      { timeout: 10_000 },
    )
  ).jsonValue();
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.stop", deck: "a" });
  });
  await page.waitForFunction(() => window.mulch.probe().decks.a.playing === false, undefined, {
    timeout: 5_000,
  });
  // The loop rides the output down rather than blanking the bars the instant the transport
  // stops, so the empty state is waited for and then asserted — a timeout here reports through
  // the assertion below, with the transforms it actually found.
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('[data-slot="master-level"]')].every(
          (bar) => bar.style.transform === "scaleY(0)",
        ),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {});
  const stopped = await sample(page);

  if (still.channels !== "left,right") {
    fail(`the header drew master bars for "${still.channels}", expected left and right`);
  }
  if (still.clipped !== "false") {
    fail(`the clip indicator was latched before anything played — ${still.clipped}`);
  }
  if (still.scales.some((scale) => heightOf(scale) !== 0)) {
    fail(`a master bar was filled with nothing playing — ${JSON.stringify(still.scales)}`);
  }
  if (moving.scales.some((scale) => !(heightOf(scale) > 0))) {
    fail(`a master bar did not move while a yard played — ${JSON.stringify(moving.scales)}`);
  }
  // Stopping empties them: the frame loop has stopped too, so anything left standing would be a
  // level nothing is producing (principle 5).
  if (stopped.scales.some((scale) => heightOf(scale) !== 0)) {
    fail(`a master bar stayed up after the yard stopped — ${JSON.stringify(stopped.scales)}`);
  }
  const risen = moving.scales.map((scale) => heightOf(scale).toFixed(2)).join(" / ");
  report(`the master bars rose to ${risen} while a yard played, and emptied when it stopped`);
};
