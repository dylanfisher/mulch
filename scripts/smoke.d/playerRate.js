/**
 * @role The jumps card in a real browser: its bypass switch pressed in the corner every card's is
 *   in, then the marker on the Hold dial opened and one amount moved — and the other door in that
 *   corner, where a character name draws the whole spec at once and the amount under it travels
 *   the card back to plain (0152).
 */
import { fail, report } from "./harness.js";

/**
 * The one claim no unit test can make: the marker at the Hold dial's corner actually opens the
 * popup, and a dial inside it patches the spec the card sends (0118). Everything else about the
 * group — which field each dial moves, when the marker lights, that the three are not drawn until
 * it opens — is `src/ui/PlayerRate.test.tsx`, which is faster and does not need a page.
 *
 * After the reload for the reason the picker is, and last of the yard's own scenarios: a popover
 * opened before `reload()` stalls the reloaded page's audio clock (plan §3, 0056), and this one
 * plays a yard and arranges a song on it, which is more page state in flight than any measurement
 * beside it should have to settle around. What it leaves behind is a yard holding a pattern, which
 * nothing after it reads — `./leaks.js` takes its own deltas.
 */
export const playerRate = async ({ page }) => {
  const player = page.getByLabel("Yard A Jumps");
  await player.scrollIntoViewIfNeeded();
  // The module is off on this page until something turns it on, and turning it on is the switch a
  // person presses rather than a command written past the UI. It is pressed where every other
  // card's is: in the card's own action corner, at the top right of its header — which is the one
  // claim about the corner no unit test can make about a laid-out page (P87).
  const corner = player.locator('[data-slot="card-header"] [data-slot="card-action"]');
  const toggle = corner.getByLabel("Enable Jumps on Yard A");
  if ((await toggle.count()) !== 1) {
    fail("player rate smoke: the jumps switch was not in the card's top-right corner");
  }
  const head = await player.locator('[data-slot="card-header"]').boundingBox();
  const box = await toggle.boundingBox();
  // A box is null for anything the page is not laying out, so the switch being invisible has to
  // fail as the corner claim it is rather than as a TypeError two lines further on (principle 5).
  if (head === null || box === null) {
    fail("player rate smoke: the jumps card's head or its switch was not laid out", { head, box });
  }
  if (box.x + box.width / 2 < head.x + head.width / 2 || box.y > head.y + head.height) {
    fail("player rate smoke: the jumps switch was not drawn in the head's right-hand half", {
      head,
      box,
    });
  }
  await toggle.click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player !== null);

  const marker = player.getByRole("button", { name: "Yard A Rate" });
  const spread = page.getByRole("slider", { name: /Spread/u });
  // Not drawn at all until the marker is pressed: the three amounts are behind it, which is what
  // keeps the card's row one height (0093).
  if (await spread.isVisible()) fail("player rate smoke: the spread dial was drawn before opening");
  await marker.click();
  await spread.waitFor();

  // Moved by the keyboard rather than by a drag: this scenario's claim is that the popup opens and
  // its dials reach the same `deck.player` the card sends, not how a knob reads a pointer (0064).
  const before = await page.evaluate(() => window.mulch.probe().decks.a.player.spread);
  await spread.focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    (was) => window.mulch.probe().decks.a.player.spread === was - 1,
    before,
  );

  const after = await page.evaluate(() => window.mulch.probe().decks.a.player);
  if (after.hold !== 0) fail("player rate smoke: moving the spread moved the hold", after);

  /**
   * And the other door in that corner. What no unit test can say is that a name pressed in a real
   * popover reaches the same `deck.player` every dial sends — twenty fields at once — and that the
   * amount under those names travels the whole card back to what the switch leaves (0152).
   */
  await page.keyboard.press("Escape");
  const character = corner.getByLabel("Character on Yard A");
  await character.click();
  const stutter = page.getByRole("button", { name: "Stutter", exact: true });
  await stutter.waitFor();
  await stutter.click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.gate > 0);

  const drawn = await page.evaluate(() => window.mulch.probe().decks.a.player);
  // The seed is the one field a character may not touch: it says which performance this is, and
  // the control that draws a new one is the button beside this menu (0089).
  if (drawn.seed !== after.seed) {
    fail("player rate smoke: pressing a character redrew the seed", { was: after, now: drawn });
  }
  if (drawn.burst >= after.burst) {
    fail("player rate smoke: Stutter did not shorten the burst", { was: after, now: drawn });
  }

  const amount = page.getByRole("slider", { name: "Yard A Character Amount" });
  await amount.focus();
  await page.keyboard.press("Home");
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.gate === 0);
  const plain = await page.evaluate(() => window.mulch.probe().decks.a.player);

  /**
   * And the arrangement, which is a section of this card rather than a third door in its corner:
   * a song changes what every dial above it means, so it is read and edited where those dials are
   * (0157). What no unit test can say is that a played song reaches the dials — the card goes on
   * drawing the values the parts are a distance from until one stands, and then paints what the
   * pattern is actually reading, which is the whole of clause (d).
   */
  await page.keyboard.press("Escape");
  // Exactly that name: every control inside the section is named for the yard's song too, so a
  // substring match would find the section and its own contents.
  const section = player.getByLabel("Yard A Song", { exact: true });
  if ((await section.count()) !== 1) fail("player song smoke: the jumps card drew no song section");
  if ((await corner.getByLabel(/Song/u).count()) !== 0) {
    fail("player song smoke: a song control was still in the card's corner");
  }
  await section.getByLabel("Add Yard A Song Part").click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.song.length === 1);
  // A part wears a badge of its own, drawn off the id minted at the gesture that added it: two
  // parts alike in every field are still two things a person can point at (0076, 0157).
  const badge = await section.locator("[data-part]").first().getAttribute("data-part");
  if (badge === null) fail("player song smoke: the part carried no id of its own");

  // The card's own Repeats put at the top of its range, so the count a riff draws — two to six —
  // cannot be the number the hand left the dial on, whatever the draw says.
  const repeats = player.getByRole("slider", { name: "Repeats", exact: true });
  await repeats.focus();
  await page.keyboard.press("End");
  const set = await page.evaluate(() => window.mulch.probe().decks.a.player.repeats);

  // A loop to jump around and a deck playing it: without a grid the pass plays straight through
  // and no part ever stands (0089). Whatever loop this page came with is kept and put back below:
  // this scenario borrows the yard rather than keeping it.
  const found = await page.evaluate(() => {
    const deck = window.mulch.probe().decks.a;
    window.mulch.send({ t: "deck.loop", deck: "a", in: 0, out: deck.duration });
    window.mulch.send({ t: "deck.play", deck: "a" });
    return deck.loop;
  });
  const voiced = await (
    await page.waitForFunction(
      (dial) => {
        const standing = window.mulch.peek("a").player;
        if (standing.part === null) return null;
        const knob = [
          ...document.querySelectorAll('[aria-label="Yard A Jumps"] [data-slot="knob"]'),
        ].find((slider) => slider.getAttribute("aria-label") === "Repeats");
        const read = knob?.parentElement?.querySelector("output")?.textContent ?? "";
        const lit = document.querySelector('[data-standing="true"]')?.dataset.part;
        return read !== "" && read !== String(dial) && lit === standing.part
          ? { part: standing.part, read, lit }
          : null;
      },
      set,
      { timeout: 10_000 },
    )
  ).jsonValue();

  // Stopped first, and asked what the card says then: a halted yard stands in no part at all, and
  // both surfaces are written straight into the page by a frame loop that has just been turned
  // off — so nothing but the render's own put-back empties them (0040, 0157).
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.stop", deck: "a" });
  });
  await page.waitForFunction(() => window.mulch.probe().decks.a.playing === false);
  const halted = await page.evaluate(() => ({
    lit: document.querySelectorAll('[data-standing="true"]').length,
    header: document.querySelector('[data-slot="player-standing"]')?.textContent ?? null,
  }));
  if (halted.lit !== 0 || halted.header !== "") {
    fail("player song smoke: a stopped yard was still showing a part playing", halted);
  }

  // Left as it was found: the song goes back to none, the count goes back to where the character
  // menu left it and the loop to the one this page came with.
  await page.evaluate(
    ([loop, count]) => {
      const held = window.mulch.probe().decks.a.player;
      window.mulch.send({
        t: "deck.player",
        deck: "a",
        player: { ...held, repeats: count, song: [] },
      });
      if (loop !== null) window.mulch.send({ t: "deck.loop", deck: "a", ...loop });
    },
    [found, plain.repeats],
  );
  // Waited out to the last of those commands rather than to the first: they are pumped a few
  // milliseconds apart, and a loop that landed while the next scenario was already reading the
  // page would rebuild a picture under it (0131, plan §3).
  await page.waitForFunction((loop) => {
    const deck = window.mulch.probe().decks.a;
    return (
      deck.playing === false &&
      deck.player.song.length === 0 &&
      (loop === null || (deck.loop?.in === loop.in && deck.loop?.out === loop.out))
    );
  }, found);
  // And the pointer taken off the last control it pressed, then waited out: a click leaves the
  // mouse where it landed, so that control's popup stands until the pointer leaves and its own
  // close delay runs out, and one open popup puts the whole tooltip group into its no-delay phase
  // (0056, 0094).
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () => document.querySelectorAll('[data-slot="tooltip-content"]').length === 0,
  );

  report(
    `the jumps switch in the card's top-right corner turned the module on, then the rate marker opened and its spread dial moved ${before}→${after.spread}, leaving the hold at ${after.hold}; the character menu beside it drew Stutter onto the whole card at once — burst ${after.burst}s→${drawn.burst.toFixed(3)}s, gate ${after.gate}→${drawn.gate.toFixed(2)} — on the same seed ${plain.seed}, and none of it put every dial back at the switch's own burst ${plain.burst}s and gate ${plain.gate}; the song section then added part ${voiced.part} and played it, lighting that row and reading the Repeats dial off the voice at ${voiced.read} where the hand had left it at ${set}, and stopping the yard emptied both`,
  );
};
