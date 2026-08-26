/**
 * @role The mulcher card in a real browser: its bypass switch pressed at the end of the heading it
 *   now stands on rather than in the card's own corner (P130), then the marker on the Hold dial
 *   opened and one amount moved — inline, in the same box, beside the dial it belongs to (P135) —
 *   and the door still in that corner, where a character name draws the whole spec at once and the
 *   amount under it travels the card back to plain (0152).
 */
import { fail, report } from "./harness.js";

/**
 * The one claim no unit test can make: the marker at the Hold dial's corner actually opens the
 * door, its amounts land in the same box and in the same row as the dial they belong to rather
 * than in a layer over it, and a dial among them patches the spec the card sends (0118, P135).
 * That is a claim about a laid-out page — two boxes measured against each other — and no renderer
 * without layout can make it. Everything else about the group — which field each dial moves, what
 * the marker says, that the four are not drawn until it opens — is `src/ui/PlayerRate.test.tsx`,
 * which is faster and does not need a page.
 *
 * After the reload for the reason the picker is, and last of the yard's own scenarios: a popover
 * opened before `reload()` stalls the reloaded page's audio clock (plan §3, 0056), and this one
 * plays a yard and arranges a song on it, which is more page state in flight than any measurement
 * beside it should have to settle around. What it leaves behind is a yard holding a pattern, which
 * nothing after it reads — `./leaks.js` takes its own deltas.
 */
export const playerRate = async ({ page }) => {
  const player = page.getByLabel("Yard A Mulcher");
  await player.scrollIntoViewIfNeeded();
  // The module is off on this page until something turns it on, and turning it on is the switch a
  // person presses rather than a command written past the UI. It is pressed at the right-hand end
  // of the heading the fold is on, outside the card — which is the one claim about where it is
  // drawn that no unit test can make about a laid-out page (0107 amended, P130).
  const heading = player.locator('[data-slot="player-heading"]');
  const toggle = heading.getByLabel("Enable Mulcher on Yard A");
  if ((await toggle.count()) !== 1) {
    fail("player rate smoke: the mulcher switch was not on the card's heading");
  }
  const head = await heading.boundingBox();
  const box = await toggle.boundingBox();
  // A box is null for anything the page is not laying out, so the switch being invisible has to
  // fail as the placement claim it is rather than as a TypeError two lines further on (principle 5).
  if (head === null || box === null) {
    fail("player rate smoke: the mulcher heading or its switch was not laid out", { head, box });
  }
  if (box.x + box.width / 2 < head.x + head.width / 2 || box.y > head.y + head.height) {
    fail("player rate smoke: the mulcher switch was not drawn in the heading's right-hand half", {
      head,
      box,
    });
  }
  await toggle.click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player !== null);

  const marker = player.getByRole("button", { name: "Yard A Rate" });
  const spread = page.getByRole("slider", { name: /Spread/u });
  // Not drawn at all until the marker is pressed: the four amounts are behind it, and a shut door
  // renders none of them rather than hiding drawn ones (0093, P135).
  if (await spread.isVisible()) fail("player rate smoke: the spread dial was drawn before opening");
  await marker.click();
  await spread.waitFor();

  /**
   * And where they landed, which is the claim the popover version could not make: the Spread dial
   * stands in the *same box* as the Hold it belongs to, sharing that dial's row band and to the
   * right of it — an amount that opened where it lives rather than in a layer over the card (P135).
   */
  const inBox = await spread.evaluate((dial) => {
    const box = dial.closest('[data-slot="player-group"]');
    const hold = box?.querySelector('[data-slot="knob"][aria-label="Hold"]');
    if (!hold) return null;
    const one = hold.getBoundingClientRect();
    const two = dial.getBoundingClientRect();
    return { hold: { x: one.x, y: one.y, h: one.height }, spread: { x: two.x, y: two.y } };
  });
  if (inBox === null) {
    fail("player rate smoke: the spread dial did not open inside the hold's own box");
  }
  if (inBox.spread.x <= inBox.hold.x || Math.abs(inBox.spread.y - inBox.hold.y) > inBox.hold.h) {
    fail("player rate smoke: the spread dial did not open beside the hold it belongs to", inBox);
  }

  // Moved by the keyboard rather than by a drag: this scenario's claim is that the door opens and
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

  // Escape, which is the one thing the popover gave for free that an inline door had to be given
  // back: pressed while the door stands open it shuts it, and the amounts leave the box (0109,
  // P135). Click-outside is deliberately not offered — these stand in the card's own flow.
  await page.keyboard.press("Escape");
  if (await spread.isVisible()) fail("player rate smoke: Escape left the rate door open");

  /**
   * And the other door, in the card's own corner, where the character menu and the reseed stayed
   * when the switch left it (P130). What no unit test can say is that a name pressed in a real
   * popover reaches the same `deck.player` every dial sends — twenty fields at once — and that the
   * amount under those names travels the whole card back to what the switch leaves (0152).
   */
  const corner = player.locator('[data-slot="card-header"] [data-slot="card-action"]');
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
  // parts alike in every field are still two things a person can point at (0076, 0157) — and it is
  // called that badge until a hand types something else, because a part is never nameless (P134).
  const badge = await section.locator("[data-part]").first().getAttribute("data-part");
  if (badge === null) fail("player song smoke: the part carried no id of its own");
  const minted = await page.evaluate(() => window.mulch.probe().decks.a.player.song[0].name);
  if (minted !== badge.slice(-4).toUpperCase()) {
    fail("player song smoke: the added part was not named after its own badge", { badge, minted });
  }

  // The card's own Repeats put at the top of its range *after* the part was added, so the count the
  // part carries — the Stutter draw the character menu left on the dials above — cannot be the
  // number the hand leaves this dial on (0176).
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
        // The step the clock is inside, which is what the peek hands over (0180).
        const standing = window.mulch.peek("a").player.step;
        if (standing === null || standing.part === null) return null;
        const knob = [
          ...document.querySelectorAll('[aria-label="Yard A Mulcher"] [data-slot="knob"]'),
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

  /**
   * And the other half of what a part is: pointed at, this card's dials are that part's. Turning
   * one writes into the part and leaves the pattern the card holds exactly where the hand left it,
   * which is the second half of 0157 reversed and the whole of 0176. It is asserted here because
   * the two halves are one gesture on one card — no unit test can say that the dial a hand reaches
   * for is the dial the selection moved.
   */
  await section.getByLabel("Select Yard A Song Part 1").click();
  await repeats.focus();
  await page.keyboard.press("Home");
  const aimed = await (
    await page.waitForFunction((count) => {
      const held = window.mulch.probe().decks.a.player;
      const part = held.song[0];
      if (part === undefined || part.voice.repeats === count || held.repeats !== count) return null;
      return { part: part.voice.repeats, card: held.repeats };
    }, set)
  ).jsonValue();

  /**
   * And the three gestures a part's row grew when a part became a card (P134). What no unit test
   * can say is that the switch actually takes the part out of the *run*: a song whose every part
   * is skipped is no arrangement at all, so a playing yard stands in no part until it comes back.
   */
  const skipping = section.getByLabel("Skip Yard A Song Part 1");
  await skipping.click();
  await page.waitForFunction(
    () =>
      window.mulch.probe().decks.a.player.song[0]?.skip === true &&
      (window.mulch.peek("a").player.step?.part ?? null) === null,
    undefined,
    { timeout: 10_000 },
  );
  await skipping.click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.song[0]?.skip === false);

  // And that a copy is a second part with an id of its own, landing directly after the one it was
  // taken from: two parts alike in every other field are still two things a hand can point at
  // (0076, 0092).
  await section.getByLabel("Duplicate Yard A Song Part 1").click();
  const copied = await (
    await page.waitForFunction(() => {
      const song = window.mulch.probe().decks.a.player.song;
      if (song.length !== 2 || song[0].id === song[1].id) return null;
      return { name: song[0].name, copy: song[1].name };
    })
  ).jsonValue();
  if (copied.name === "" || copied.copy === copied.name) {
    fail("player song smoke: the copy carried the same name as the part it was taken from", copied);
  }

  /**
   * And the one gesture on the row that is transport rather than an edit: the audition winds the
   * pass to a part's own first jump and lays the pattern down from there (P137). Part 1 is
   * stretched to the longest a part may be and the pass begun again from the top of it, so the
   * walk would not reach part 2 on its own for sixteen seconds — what the press proves is that the
   * pass was wound, not that a song came round while a locator waited.
   */
  await page.evaluate(() => {
    const held = window.mulch.probe().decks.a.player;
    const song = held.song.map((part, at) => (at === 0 ? { ...part, length: 64 } : part));
    window.mulch.send({ t: "deck.player", deck: "a", player: { ...held, song } });
    window.mulch.send({ t: "deck.stop", deck: "a" });
    window.mulch.send({ t: "deck.play", deck: "a" });
  });
  await page.waitForFunction(
    () =>
      window.mulch.peek("a").player.step?.part === window.mulch.probe().decks.a.player.song[0].id,
    undefined,
    { timeout: 10_000 },
  );
  await section.getByLabel("Audition Yard A Song Part 2").click();
  const cued = await (
    await page.waitForFunction(
      () => {
        const song = window.mulch.probe().decks.a.player.song;
        const standing = window.mulch.peek("a").player.step?.part ?? null;
        return standing === song[1].id
          ? { standing, lengths: song.map((part) => part.length) }
          : null;
      },
      undefined,
      { timeout: 10_000 },
    )
  ).jsonValue();
  // Transport and never an edit: the press moved the pass and left the song exactly as it was.
  if (cued.lengths[0] !== 64 || cued.lengths[1] !== 8) {
    fail("player song smoke: the audition changed the song it was auditioning", cued);
  }

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
    `the mulcher switch at the end of the card's heading turned the module on, then the rate marker opened its four amounts into the hold's own box — spread at x ${Math.round(inBox.spread.x)} beside hold at x ${Math.round(inBox.hold.x)} — and its spread dial moved ${before}→${after.spread}, leaving the hold at ${after.hold}, with Escape shutting the door again; the character menu beside it drew Stutter onto the whole card at once — burst ${after.burst}s→${drawn.burst.toFixed(3)}s, gate ${after.gate}→${drawn.gate.toFixed(2)} — on the same seed ${plain.seed}, and none of it put every dial back at the switch's own burst ${plain.burst}s and gate ${plain.gate}; the song section then added part ${voiced.part} and played it, lighting that row and reading the Repeats dial off the voice at ${voiced.read} where the hand had left it at ${set}; selecting that row pointed the same dial at the part, so Home wrote ${aimed.part} into it and left the card's own at ${aimed.card}; skipping it took it out of the run and left the walk standing in no part at all, and copying it made ${copied.copy} beside ${copied.name}; auditioning that copy wound the pass into it — standing ${cued.standing} while part 1 still ran 64 jumps — without moving the song; stopping the yard emptied both`,
  );
};
