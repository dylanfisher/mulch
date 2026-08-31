/**
 * @role The mulcher card in a real browser: its bypass switch pressed at the end of the heading it
 *   now stands on rather than in the card's own corner (P130), the fine tune opened from the fold
 *   it is drawn shut behind (0198) and the ground opened from the fold beside it, which is not one
 *   of that fold's boxes and wears none of its own (0217), then one of the Hold dial's own
 *   amounts moved where it stands — in the same box, beside the dial it belongs to, with nothing
 *   to open first (0195) — the six names on the card's own front, where a character draws the whole
 *   spec at once and the amount beside them travels the card back to plain (0152), and the picture
 *   above them dragged, which writes the distance and the count it draws (0197).
 */
import { fail, report } from "./harness.js";

/**
 * The one claim no unit test can make: the Hold dial's four amounts are laid out in the same box
 * and in the same row as the dial they belong to rather than somewhere a hand has to open, and a
 * dial among them patches the spec the card sends (0118, 0195). That is a claim about a laid-out
 * page — two boxes measured against each other — and no renderer without layout can make it.
 * Everything else about the group — which field each dial moves, what each of them is named — is
 * `src/ui/PlayerRate.test.tsx`, which is faster and does not need a page.
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

  /**
   * And the fine tune opened, which is the one fold on this card that opens shut (0198). The claim
   * a unit test cannot make is that it is shut on a real page a person just switched the module on
   * — the fold is the yard's state and the card only draws it — and that the dials under it are
   * gone from the page rather than merely unmarked. Everything below this line turns one of them.
   */
  const fine = player.getByRole("button", { name: "Fine Tune", exact: true });
  await fine.waitFor();
  if ((await player.locator('[data-slot="player-group"]').count()) !== 0) {
    fail("player rate smoke: the fine tune was open on a card nobody had opened");
  }
  // And the arrangement beside it, which is a fold of the card and wears no box of its own: its
  // word is on the page and its own dial is not, on a card nobody has opened either (0200).
  await player.getByRole("button", { name: "How It Is Arranged", exact: true }).waitFor();
  const composed = await player.getByRole("slider", { name: "Compose", exact: true }).count();
  if (composed !== 0) {
    fail("player rate smoke: the arrangement was open on a card nobody had opened", { composed });
  }
  // And the ground beside them, on the same terms: it is a fold of the card and not one of the
  // fine tune's boxes, so its word is on the page and the Bed dial under it is not (0217).
  const ground = player.getByRole("button", { name: "Which Ground", exact: true });
  await ground.waitFor();
  const bed = player.getByRole("slider", { name: "Bed", exact: true });
  if ((await bed.count()) !== 0) {
    fail("player rate smoke: the ground was open on a card nobody had opened");
  }
  await fine.click();

  // Named for the dial it shapes, which is what tells it from the wait's own spread and the
  // count's two boxes along — every amount on this card is on screen at once (0195, `runName`).
  const spread = page.getByRole("slider", { name: "Rate Spread", exact: true });
  await spread.waitFor();

  // Opening the fine tune opens the fine tune and nothing else: the ground is beside that fold
  // rather than under it, so its dial is still off the page until its own word is pressed — the
  // claim a renderer without a laid-out card cannot make about two folds standing side by side.
  // Read after that wait and not before it, so the absence is the fold's and not the frame's.
  if ((await bed.count()) !== 0) {
    fail("player rate smoke: the fine tune's fold brought the ground open with it");
  }
  await ground.click();
  await bed.waitFor();
  // And the ground wears no box of its own, so opening it adds none: what a box is for is telling
  // one of the fine tune's questions from the next inside its stack (0200, 0217).
  const boxed = await bed.evaluate((dial) => dial.closest('[data-slot="player-group"]') !== null);
  if (boxed) fail("player rate smoke: the ground drew a bordered box of its own");
  await ground.click();

  /**
   * The burst's own two gestures, standing beside the dial they write with nothing to open first
   * (0195, P152). Two claims no renderer without a laid-out page can make: that the tap is in the
   * *same box* as the Burst dial and to the right of it, and that a press repeated in a real
   * browser reaches the same `deck.player` every dial on this card sends — which is the one number
   * here a hand arrives at by playing it rather than by turning anything.
   */
  const tap = player.getByLabel("Tap Mulcher on Yard A", { exact: true });
  await tap.waitFor();
  const beside = await tap.evaluate((press) => {
    const box = press.closest('[data-slot="player-group"]');
    // The dial's whole column and not the knob alone: a dial is the disc, its caption and its
    // reading, and what a press stands beside is the column (src/ui/Knob.tsx).
    const dial = box?.querySelector('[data-slot="knob"][aria-label="Burst"]')?.parentElement;
    if (!dial) return null;
    const one = dial.getBoundingClientRect();
    const two = press.getBoundingClientRect();
    return {
      dial: { x: one.x, top: one.top, bottom: one.bottom },
      tap: { x: two.x, top: two.top, bottom: two.bottom },
    };
  });
  if (beside === null) {
    fail("player rate smoke: the tap did not stand in the burst's own box");
  }
  // To the right of that column and on the same line of the box: the two spans overlap, which is
  // what "beside" means on a row that wraps and what a renderer without layout cannot say.
  if (
    beside.tap.x <= beside.dial.x ||
    beside.tap.top >= beside.dial.bottom ||
    beside.tap.bottom <= beside.dial.top
  ) {
    fail("player rate smoke: the tap did not stand beside the burst it writes", beside);
  }

  // Two presses, because an interval needs two: the first names nothing and the second is the
  // whole answer. Four hundred milliseconds apart, and the claim is the interval and not the
  // millisecond — a click through a real browser carries its own overhead, and what is being
  // asserted is that the burst became the length of the gesture rather than a number off a dial.
  const TAPPED_MS = 400;
  const untapped = await page.evaluate(() => window.mulch.probe().decks.a.player.burst);
  await tap.click();
  await page.waitForTimeout(TAPPED_MS);
  await tap.click();
  await page.waitForFunction((was) => window.mulch.probe().decks.a.player.burst !== was, untapped);
  const tapped = await page.evaluate(() => window.mulch.probe().decks.a.player.burst);
  // A press cannot land sooner than the wait, so the floor is that wait less one step of the dial
  // and a little for the clock; the ceiling is the whole gesture again, which no click overhead
  // reaches.
  if (tapped < TAPPED_MS / 1000 - 0.05 || tapped > (TAPPED_MS * 2) / 1000) {
    fail("player rate smoke: the tapped burst was not the interval that was tapped", {
      untapped,
      tapped,
    });
  }

  /**
   * And where it is laid out, which is the claim no renderer without layout can make: the Spread
   * dial stands in the *same box* as the Hold it belongs to, sharing that dial's row band and to
   * the right of it — an amount that lives where it is turned rather than behind a press (0195).
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

  // Moved by the keyboard rather than by a drag: this scenario's claim is that a dial in the run
  // reaches the same `deck.player` the card sends, not how a knob reads a pointer (0064).
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
   * And the six names on the card's own front, where they stand in the open rather than behind the
   * corner's icon (0197). What no unit test can say is that a name pressed in the real card reaches
   * the same `deck.player` every dial sends — twenty fields at once — and that the amount beside
   * those names travels the whole card back to what the switch leaves (0152).
   *
   * Found by its own word and nothing else: the arrangement's cast wears the same six, and its
   * toggles are named for the yard and the box they are in, so the plain name is the front's
   * (0174, `PLAYER_CAST_LABEL`).
   */
  const stutter = player.getByRole("button", { name: "Stutter", exact: true });
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
   * And the arrangement, which is a section of this card rather than a third menu in its corner:
   * a song changes what every dial above it means, so it is read and edited where those dials are
   * (0157). What no unit test can say is that a played song reaches the dials — the card goes on
   * drawing the values the parts are a distance from until one stands, and then paints what the
   * pattern is actually reading, which is the whole of clause (d).
   */
  await page.keyboard.press("Escape");
  // Exactly that name: every control inside the section is named for the yard's song too, so a
  // substring match would find the section and its own contents.
  const section = player.getByLabel("Yard A Albums", { exact: true });
  if ((await section.count()) !== 1) {
    fail("player song smoke: the jumps card drew no arrangement section");
  }
  // And the corner those menus stood in is gone entirely: both of its gestures are on the card's
  // front now, so a header kept for nothing would be a shape claiming room it does not use (0197).
  if ((await player.locator('[data-slot="card-action"]').count()) !== 0) {
    fail("player song smoke: the jumps card still drew a corner of actions");
  }
  /**
   * The two tiers over the parts, which are one list drawn twice: an album holds songs, a song
   * holds the parts, and every gesture on either is the ordinary `deck.player` carrying the whole
   * spec (P147). What no unit test can say is that the area under the albums is a *view* onto the
   * one that is open — the parts a hand adds land in the song the lists are showing.
   */
  await section.getByLabel("Add Yard A Album", { exact: true }).click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.albums.length === 1);
  await section.getByLabel("Add Yard A Album Song", { exact: true }).click();
  await page.waitForFunction(
    () => window.mulch.probe().decks.a.player.albums[0].songs.length === 1,
  );
  // A copy is a second album with an id of its own, all the way down, landing directly after the
  // one it was taken from — and taken away again, so what follows runs on one album (0092, 0121).
  await section.getByLabel("Duplicate Yard A Album 1").click();
  const albums = await (
    await page.waitForFunction(() => {
      const held = window.mulch.probe().decks.a.player.albums;
      if (held.length !== 2 || held[0].id === held[1].id) return null;
      return { songs: held[1].songs.length, same: held[0].songs[0].id === held[1].songs[0].id };
    })
  ).jsonValue();
  if (albums.songs !== 1 || albums.same) {
    fail("player song smoke: the copied album did not carry songs of its own", albums);
  }
  await section.getByLabel("Remove Yard A Album 2").click();
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.albums.length === 1);
  // And the one dial either tier carries, whose nought is the skip: durable like every other
  // number on this card, so what the knob leaves is what the session holds (P147).
  const plays = section.getByRole("slider", { name: "Yard A Album 1 Plays", exact: true });
  await plays.focus();
  await page.keyboard.press("Home");
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.albums[0].plays === 0);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => window.mulch.probe().decks.a.player.albums[0].plays === 1);

  await section.getByLabel("Add Yard A Song Part").click();
  await page.waitForFunction(
    () => window.mulch.probe().decks.a.player.albums[0].songs[0].parts.length === 1,
  );
  // A part wears a badge of its own, drawn off the id minted at the gesture that added it: two
  // parts alike in every field are still two things a person can point at (0076, 0157) — and a name
  // drawn off that same id, two words off the part pools, because a part is never nameless and the
  // four characters of an id are not a name (P134, 0081).
  const badge = await section.locator("[data-part]").first().getAttribute("data-part");
  if (badge === null) fail("player song smoke: the part carried no id of its own");
  const minted = await page.evaluate(
    () => window.mulch.probe().decks.a.player.albums[0].songs[0].parts[0].name,
  );
  if (!/^[A-Z][a-z]+ [A-Z][a-z]+$/u.test(minted) || minted === badge.slice(-4).toUpperCase()) {
    fail("player song smoke: the added part was not named off its own id", { badge, minted });
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
        // Keyed on a part row and not on whatever the page lit first: the two tiers over a part
        // now wear the same standing mark, and a first match landing on an album row would read
        // an undefined part forever rather than failing (src/ui/PlayerAlbum.tsx).
        const lit = document.querySelector('[data-part][data-standing="true"]')?.dataset.part;
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
      const part = held.albums[0].songs[0].parts[0];
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
      window.mulch.probe().decks.a.player.albums[0].songs[0].parts[0]?.skip === true &&
      (window.mulch.peek("a").player.step?.part ?? null) === null,
    undefined,
    { timeout: 10_000 },
  );
  await skipping.click();
  await page.waitForFunction(
    () => window.mulch.probe().decks.a.player.albums[0].songs[0].parts[0]?.skip === false,
  );

  // And that a copy is a second part with an id of its own, landing directly after the one it was
  // taken from: two parts alike in every other field are still two things a hand can point at
  // (0076, 0092).
  await section.getByLabel("Duplicate Yard A Song Part 1").click();
  const copied = await (
    await page.waitForFunction(() => {
      const song = window.mulch.probe().decks.a.player.albums[0].songs[0].parts;
      if (song.length !== 2 || song[0].id === song[1].id) return null;
      return { name: song[0].name, copy: song[1].name };
    })
  ).jsonValue();
  if (copied.name === "" || copied.copy === copied.name) {
    fail("player song smoke: the copy carried the same name as the part it was taken from", copied);
  }

  /**
   * And the one gesture on the row that is transport rather than an edit: the audition plays one
   * part on its own, over and over, for as long as it is pressed — and hands the song back when it
   * is let go (0190). Part 1 is stretched to the longest a part may be and the pass begun again
   * from the top of it, so the walk would not reach part 2 on its own for sixteen seconds: what the
   * press proves is that the pass was wound, not that a song came round while a locator waited.
   */
  await page.evaluate(() => {
    const held = window.mulch.probe().decks.a.player;
    const parts = held.albums[0].songs[0].parts.map((part, at) =>
      at === 0 ? { ...part, length: 64 } : part,
    );
    const songs = [{ ...held.albums[0].songs[0], parts }];
    window.mulch.send({
      t: "deck.player",
      deck: "a",
      player: { ...held, albums: [{ ...held.albums[0], songs }] },
    });
    window.mulch.send({ t: "deck.stop", deck: "a" });
    window.mulch.send({ t: "deck.play", deck: "a" });
  });
  await page.waitForFunction(
    () =>
      window.mulch.peek("a").player.step?.part ===
      window.mulch.probe().decks.a.player.albums[0].songs[0].parts[0].id,
    undefined,
    { timeout: 10_000 },
  );
  await section.getByLabel("Audition Yard A Song Part 2").click();
  const cued = await (
    await page.waitForFunction(
      () => {
        const song = window.mulch.probe().decks.a.player.albums[0].songs[0].parts;
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
  // And it *holds*, which is the whole difference between a solo and a cue: part 2 lasts eight
  // jumps of a 0.4s loop, so a pass that had merely been wound into it would have moved on to part
  // 1 several times over by now (0190).
  await page.waitForTimeout(1_000);
  const held = await page.evaluate(() => {
    const song = window.mulch.probe().decks.a.player.albums[0].songs[0].parts;
    const standing = window.mulch.peek("a").player.step?.part ?? null;
    return {
      standing,
      part: song[1].id,
      lit: document.querySelectorAll('[data-standing="true"]').length,
    };
  });
  if (held.standing !== held.part) {
    fail("player song smoke: the audition let the song move on instead of soloing the part", held);
  }
  // Let go, and the song carries on from the part that was being heard: part 2 runs out its eight
  // jumps and part 1 stands again, which is a run rather than one part repeating.
  await section.getByLabel("Audition Yard A Song Part 2").click();
  await page.waitForFunction(
    () =>
      window.mulch.peek("a").player.step?.part ===
      window.mulch.probe().decks.a.player.albums[0].songs[0].parts[0].id,
    undefined,
    { timeout: 10_000 },
  );

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

  /**
   * And the row a part is written as, which is the one thing about it no unit test can reach: the
   * cells are durable, they travel in `deck.player` like every other field, and what proves the
   * road end to end is a *playing* yard landing only on the slots the row names (0188). Written on
   * the part's own fold, which is where a part is edited.
   */
  await section.getByLabel("Open Yard A Song Part 1").click();
  const adding = section.getByLabel("Add Cell Yard A Song Part 1");
  await adding.click();
  await adding.click();
  // The second cell is the one the row lit when it was added, so this steps that one alone —
  // leaving a row of two cells reading two different slots.
  await section.getByLabel("Slot up Yard A Song Part 1").click();
  const written = await (
    await page.waitForFunction(() => {
      const row = window.mulch.probe().decks.a.player.albums[0].songs[0].parts[0].steps;
      return row.length === 2 && row[1].slot === 1 ? row.map((cell) => cell.slot) : null;
    })
  ).jsonValue();
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.play", deck: "a" });
  });
  // Only the row's own slots, for as long as part 1 stands: a walk that was still drawing its own
  // would reach the other fourteen within a jump or two of a distance of four.
  const played = await (
    await page.waitForFunction(
      (slots) => {
        const step = window.mulch.peek("a").player.step;
        const song = window.mulch.probe().decks.a.player.albums[0].songs[0].parts;
        if (step === null || step.part !== song[0].id) return null;
        return slots.includes(step.slot) ? step.slot : "off";
      },
      written,
      { timeout: 10_000 },
    )
  ).jsonValue();
  if (played === "off") {
    fail("player song smoke: a written part landed on a slot its row never named", { written });
  }
  await page.evaluate(() => {
    window.mulch.send({ t: "deck.stop", deck: "a" });
  });
  await page.waitForFunction(() => window.mulch.probe().decks.a.playing === false);

  // Left as it was found: the song goes back to none, the count goes back to where the character
  // menu left it and the loop to the one this page came with.
  await page.evaluate(
    ([loop, count]) => {
      const held = window.mulch.probe().decks.a.player;
      window.mulch.send({
        t: "deck.player",
        deck: "a",
        player: { ...held, repeats: count, albums: [] },
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
      deck.player.albums.length === 0 &&
      (loop === null || (deck.loop?.in === loop.in && deck.loop?.out === loop.out))
    );
  }, found);
  /**
   * And the picture above those names, which is a control and not only a readout: a drag across it
   * writes how far a jump travels and how many bursts a landing is cut into (0197). What no unit
   * test can say is that a real pointer crossing a laid-out canvas reaches the same `deck.player`
   * every dial sends — `scopeAim` is the mapping, and this is the gesture.
   *
   * Dragged from the bottom-left corner to the top-right: both numbers rise together, so a surface
   * that had wired only one axis, or had wired the vertical the wrong way up, fails here.
   */
  const scope = player.locator('[data-slot="player-scope"]');
  // Scrolled to first: a bounding box is in viewport coordinates, and the song section below this
  // card has taken the picture off screen by now — a mouse moved to a box that is not in the
  // viewport presses whatever is, which is a drag that silently does nothing.
  await scope.scrollIntoViewIfNeeded();
  // Read here rather than taken from `plain`: this stands after the restore above, and the claim
  // is that a drag moves both numbers from wherever the card actually left them.
  const stood = await page.evaluate(() => window.mulch.probe().decks.a.player);
  const sheet = await scope.boundingBox();
  if (sheet === null) fail("player scope smoke: the walk's picture was not laid out");
  await page.mouse.move(sheet.x + 4, sheet.y + sheet.height - 4);
  await page.mouse.down();
  await page.mouse.move(sheet.x + sheet.width - 4, sheet.y + 4, { steps: 8 });
  await page.mouse.up();
  const dragged = await page.evaluate(() => window.mulch.probe().decks.a.player);
  if (dragged.distance <= stood.distance) {
    fail("player scope smoke: dragging across the picture did not widen the distance", {
      was: stood,
      now: dragged,
    });
  }
  if (dragged.repeats <= stood.repeats) {
    fail("player scope smoke: dragging up the picture did not raise the count", {
      was: stood,
      now: dragged,
    });
  }
  // And the seed is untouched: a drag says what the pattern is like and never which one it is
  // (0089), which is the same claim the character press above it makes.
  if (dragged.seed !== stood.seed) {
    fail("player scope smoke: dragging the picture redrew the seed", { was: stood, now: dragged });
  }

  // And the pointer taken off the last control it pressed, then waited out: a click leaves the
  // mouse where it landed, so that control's popup stands until the pointer leaves and its own
  // close delay runs out, and one open popup puts the whole tooltip group into its no-delay phase
  // (0056, 0094).
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () => document.querySelectorAll('[data-slot="tooltip-content"]').length === 0,
  );

  report(
    `the mulcher switch at the end of the card's heading turned the module on, the ground opened from a fold of its own beside the fine tune and wearing no box, the hold's own four amounts stood in its box with it — spread at x ${Math.round(inBox.spread.x)} beside hold at x ${Math.round(inBox.hold.x)} — and its spread dial moved ${before}→${after.spread}, leaving the hold at ${after.hold}; the front's six names drew Stutter onto the whole card at once — burst ${after.burst}s→${drawn.burst.toFixed(3)}s, gate ${after.gate}→${drawn.gate.toFixed(2)} — on the same seed ${plain.seed}, and none of it put every dial back at the switch's own burst ${plain.burst}s and gate ${plain.gate}; the song section then added part ${voiced.part} and played it, lighting that row and reading the Repeats dial off the voice at ${voiced.read} where the hand had left it at ${set}; selecting that row pointed the same dial at the part, so Home wrote ${aimed.part} into it and left the card's own at ${aimed.card}; skipping it took it out of the run and left the walk standing in no part at all, and copying it made ${copied.copy} beside ${copied.name}; auditioning that copy played it alone — standing ${cued.standing} a second later, while part 1 still ran 64 jumps — without moving the song, and letting go handed the run back to part 1; stopping the yard emptied both, and a row of two cells written on part 1's own fold — slots ${written.join(", ")} — played back on slot ${played} and nowhere else; and a drag across the walk's own picture, from its bottom-left corner to its top-right, carried the distance ${stood.distance}\u2192${dragged.distance} and the count ${stood.repeats}\u2192${dragged.repeats} on the same seed ${dragged.seed}`,
  );
};
