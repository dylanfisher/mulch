/** @role A file the browser decodes but no encoder here writes, and a name the declaration refuses. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { AUDIO_FILE_ACCEPT } from "../../src/lib/audioFile.ts";
import { fail, report } from "./harness.js";

export const formats = async ({ page, root }) => {
  // The one audio fixture in the repo, and the reason it exists: no encoder here writes a
  // compressed format, and P18's claim is that the browser decodes one it never converted.
  const flac = [...readFileSync(join(root, "fixtures", "tone.flac"))];
  // P18, end to end and last: a file that is not a wav goes in through the picker every other
  // import uses, the browser decodes it, and what IndexedDB holds afterwards is the file's own
  // bytes rather than a conversion of them (0043). A name the shared declaration does not
  // accept is refused before the blob store is touched, and the deck keeps what it had.
  // It rides here rather than before the reload for the reason P8 does (plan §3).
  const beforeRefusal = await page.evaluate(() => window.mulch.probe().decks.b.source);
  await page.locator('input[aria-label="Import Audio for Yard B"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not audio"),
  });
  const refusal = await page.locator('section[aria-label^="Yard B"] [role="alert"]').textContent();
  const afterRefusal = await page.evaluate(() => window.mulch.probe().decks.b.source);
  // Refused before the blob store was touched: the deck holds exactly what it held.
  const refusalKeptSource = JSON.stringify(beforeRefusal) === JSON.stringify(afterRefusal);
  await page.locator('input[aria-label="Import Audio for Yard B"]').setInputFiles({
    name: "tone.flac",
    mimeType: "audio/flac",
    buffer: Buffer.from(flac),
  });
  await page.waitForFunction(
    () => {
      const deck = window.mulch.probe().decks.b;
      return deck.source !== null && "blobId" in deck.source && deck.duration > 0;
    },
    undefined,
    { timeout: 5_000 },
  );
  const nonWav = await page.evaluate(async (bytes) => {
    const probe = window.mulch.probe();
    const id = probe.decks.b.source.blobId;
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("mulch", 1);
      request.addEventListener(
        "success",
        () => {
          resolve(request.result);
        },
        { once: true },
      );
      request.addEventListener(
        "error",
        () => {
          reject(request.error);
        },
        { once: true },
      );
    });
    const stored = await new Promise((resolve, reject) => {
      const request = database.transaction("blobs").objectStore("blobs").get(id);
      request.addEventListener(
        "success",
        () => {
          resolve(request.result);
        },
        { once: true },
      );
      request.addEventListener(
        "error",
        () => {
          reject(request.error);
        },
        { once: true },
      );
    });
    const storedBytes = [...new Uint8Array(await stored.arrayBuffer())];
    return {
      duration: probe.decks.b.duration,
      unchanged:
        storedBytes.length === bytes.length && storedBytes.every((byte, i) => byte === bytes[i]),
      accept: document
        .querySelector('input[aria-label="Import Audio for Yard B"]')
        .getAttribute("accept"),
    };
  }, flac);

  if (nonWav.accept !== AUDIO_FILE_ACCEPT) {
    fail(`the picker offers something other than the accepted formats — ${nonWav.accept}`);
  }
  if (!(nonWav.duration > 0)) {
    fail("a flac import decoded to nothing", nonWav);
  }
  if (!nonWav.unchanged) {
    fail("a flac import was converted rather than stored as it arrived", nonWav);
  }
  if (!refusalKeptSource || !/notes\.txt/u.test(refusal ?? "")) {
    fail(`an unaccepted file was not refused visibly and without touching the deck — ${refusal}`);
  }
  report(
    `a flac imported through the same picker decoded to ${nonWav.duration.toFixed(2)}s ` +
      "and was stored byte for byte; a .txt was refused before the blob store",
  );
};
