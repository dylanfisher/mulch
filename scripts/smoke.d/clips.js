/** @role A clip captured and named through its rack, and the thumbnail it draws of its own source. */
import { fail, report } from "./harness.js";

export const clips = async ({ page, state }) => {
  // P8 rides the same restored page, deliberately after the reload rather than before it: this
  // is browser work, and pre-reload browser work is what stalls the reloaded audio clock
  // (plan §3). Capture through the visible control, name it through the visible field — one
  // durable rename on Enter, not one per keystroke — and let the export below carry it.
  const clipRack = page.getByLabel("Clips");
  await clipRack.scrollIntoViewIfNeeded();
  const beforeClips = await page.evaluate(() => window.mulch.ring().at(-1)?.seq ?? -1);
  // Captured from the yard's own button group, not from the rack: the gesture is about one yard,
  // so it sits where the thing being captured is (0078).
  await page.getByRole("button", { name: "Capture Yard A" }).click();
  await page.waitForFunction(() => window.mulch.probe().clips.length === 1);
  // P52: the card wears its name as text, so the field is opened from the pencil beside it — the
  // rename is still one command on Enter, it just no longer sits on the card looking like a form.
  await clipRack.getByRole("button", { name: "Rename clip 1" }).click();
  const nameField = page.getByRole("textbox", { name: "New name for clip 1" });
  await nameField.fill("intro");
  await nameField.press("Enter");
  await page.waitForFunction(() => window.mulch.probe().clips[0]?.name === "intro");
  // Enter closes what Enter finished, so nothing below is pressing through an open popover: a
  // popover still open would hold the field under the name the rename just gave it.
  await page.getByRole("textbox", { name: "New name for intro" }).waitFor({ state: "detached" });
  // P15: the row draws what the clip holds. The thumbnail asks for its source's columns by blob
  // id — through the same decode cache the restored load already filled, so nothing is decoded
  // twice — and paints them with the waveform's own painter. "Painted" therefore means ink on
  // its canvas, not merely a mounted element.
  const thumbnailSelector = '[aria-label="intro Waveform"]';
  const thumbnail = await (
    await page.waitForFunction((selector) => {
      const canvas = document.querySelector(selector);
      if (canvas === null || canvas.width === 0) return null;
      const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
      let inked = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) inked++;
      }
      return inked === 0 ? null : { width: canvas.width, inked };
    }, thumbnailSelector)
  ).jsonValue();

  const clip = await page.evaluate(
    (after) => ({
      captured: window.mulch.probe().clips[0],
      events: window.mulch
        .ring()
        .filter((event) => event.seq > after && event.t.startsWith("clip."))
        .map((event) => event.t),
    }),
    beforeClips,
  );

  // P8: capture, rename, export, import, apply — a clip is durable data that borrows a blob, and
  // applying one is a single grouped edit that leaves the deck exactly the captured preset (0027).
  if (clip.events.join(",") !== "clip.captured,clip.renamed") {
    fail(`the clip rack emitted ${clip.events.join(",")} for one capture and one rename`);
  }
  if (clip.captured.deck.source?.blobId !== state.kept) {
    fail(`a captured clip did not borrow the deck's blob — ${JSON.stringify(clip.captured)}`);
  }
  // What the archive round trip has to bring back byte for byte, and apply to a deck exactly.
  state.capturedClip = clip.captured;

  // P15: a clip shows what it holds. Every column of the thumbnail's canvas is drawn, so a source
  // that really was decoded and reduced leaves at least one inked pixel per pixel of width; an
  // empty canvas, or one drawn from a source the row does not hold, does not.
  if (thumbnail.inked < thumbnail.width) {
    fail(
      `a clip's thumbnail painted ${thumbnail.inked} pixels across ` +
        `${thumbnail.width} columns of canvas`,
    );
  }
  report(
    `that clip drew its own source: ${thumbnail.inked} inked pixels across ` +
      `${thumbnail.width} canvas columns, decoded once through the shared cache`,
  );
};
