/** @role The loop become the source: a crop, the envelope that says it is the right one, and its undo. */
import { encodeWav } from "../../src/lib/wav.ts";
import { fail, report } from "./harness.js";

/** Long enough to hold eight distinguishable steps, so a loop of it is a shape and not a level. */
const CROP_SOURCE_SECS = 0.4;
/** How many buckets a crop and the region it was cut from are each reduced to before comparing. */
const CROP_ENVELOPE_BUCKETS = 24;
/** How much the cut-from region must itself vary, or matching its envelope proves nothing. */
const CROP_ENVELOPE_RELIEF = 0.15;
/** How far a bucket may move: two envelopes of one region, drawn at different column widths. */
const CROP_ENVELOPE_TOLERANCE = 0.1;
/**
 * A crop rounds each edge to the nearest frame, so the only slack a real decode needs is one
 * frame — under 23µs at any rate a device runs at, against the millisecond allowed here.
 */
const CROP_ROUNDING_SECS = 0.001;

export const cropLoop = async ({ page }) => {
  // The source P20's crop is taken from: the same tone, but climbing in eight steps. A steady
  // envelope would let a crop of the wrong region match the right one, so the one file the
  // comparison is made against has to vary along its length.
  const climbing = Float32Array.from(
    { length: 48_000 * CROP_SOURCE_SECS },
    (_, index) =>
      Math.sin((index * Math.PI * 2 * 440) / 48_000) *
      (0.1 + 0.1 * Math.floor((index / (48_000 * CROP_SOURCE_SECS)) * 8)),
  );
  const climbingWav = [...encodeWav([climbing], 48_000)];
  // P20: the loop, become the source. Deck a takes a source whose envelope climbs, is looped
  // across its middle by command and cropped by its own button, and the claim is that the
  // loop's own audio: the browser decodes them, and the envelope that comes back matches the
  // envelope of exactly that region of what the deck was holding — measured through peaks(),
  // which is the only read that can tell a crop of the right region from a crop of the wrong
  // one (0047). It rides after the reload for the reason P8 does (plan §3). Undo is one press.
  await page.locator('input[aria-label="Import audio for yard a"]').setInputFiles({
    name: "climbing.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from(climbingWav),
  });
  await page.waitForFunction(
    (secs) => Math.abs(window.mulch.probe().decks.a.duration - secs) < 0.01,
    CROP_SOURCE_SECS,
    { timeout: 5_000 },
  );
  await page.evaluate((secs) => {
    window.mulch.send({ t: "deck.loop", deck: "a", in: secs / 4, out: (secs * 3) / 4 });
  }, CROP_SOURCE_SECS);
  // The loop as the graph applied it, not as it was asked for: that is what the crop cuts to.
  // `envelope` reduces peaks() to a fixed number of buckets of the loudest sample in each, so
  // the whole of a cropped source and the loop's slice of the source it came from are directly
  // comparable however many columns each of them was drawn at.
  const beforeCrop = await page.evaluate((buckets) => {
    // Declared on the page once and read by both sides of the crop, so the two envelopes are
    // reduced identically: the whole point is that they are comparable.
    window.envelopeOf = (deck, fromSecs, toSecs) => {
      const peaks = window.mulch.peaks(deck);
      const columns = peaks.min.length;
      const duration = window.mulch.probe().decks[deck].duration;
      const at = (secs) => Math.round((secs / duration) * columns);
      const [from, to] = [at(fromSecs), at(toSecs)];
      return Array.from({ length: buckets }, (_, bucket) => {
        const edge = (nth) => Math.floor(from + ((to - from) * nth) / buckets);
        let loudest = 0;
        for (
          let column = edge(bucket);
          column < Math.max(edge(bucket) + 1, edge(bucket + 1));
          column++
        ) {
          loudest = Math.max(loudest, Math.abs(peaks.min[column]), Math.abs(peaks.max[column]));
        }
        return loudest;
      });
    };
    const probe = window.mulch.probe();
    const loop = probe.decks.a.loop;
    return {
      seq: window.mulch.ring().at(-1)?.seq ?? -1,
      blobId: probe.decks.a.source.blobId,
      duration: probe.decks.a.duration,
      loop,
      // The loop's own region of what the deck is holding right now — the answer the cropped
      // source has to reproduce from its own, whole, freshly decoded buffer.
      envelope: window.envelopeOf("a", loop.in, loop.out),
    };
  }, CROP_ENVELOPE_BUCKETS);
  await page
    .locator('section[aria-label^="yard a"]')
    .getByRole("button", { name: "crop", exact: true })
    .click();
  await page.waitForFunction(
    (after) => window.mulch.ring().some((event) => event.seq > after && event.t === "deck.cropped"),
    beforeCrop.seq,
    { timeout: 5_000 },
  );
  const crop = await page.evaluate(async (before) => {
    const probe = window.mulch.probe();
    const id = probe.decks.a.source.blobId;
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
    const header = new TextDecoder().decode((await stored.arrayBuffer()).slice(0, 4));
    const cropped = {
      // A new blob, not the one it was cut from — a crop never rewrites bytes a checkpoint holds.
      fresh: id !== before.blobId,
      // Written in the format everything decodes, whatever the source arrived as (0043).
      header,
      duration: probe.decks.a.duration,
      // The loop was a range in the old source; the new one is that range, so none is left.
      loop: probe.decks.a.loop,
      wasDuration: before.duration,
      loopWas: before.loop,
      // The whole of the new source, reduced the same way the loop's region of the old one was.
      envelope: window.envelopeOf("a", 0, probe.decks.a.duration),
      wasEnvelope: before.envelope,
    };
    window.mulch.send({ t: "history.undo" });
    return cropped;
  }, beforeCrop);
  await page.waitForFunction(
    (blobId) => window.mulch.probe().decks.a.source.blobId === blobId,
    beforeCrop.blobId,
    { timeout: 5_000 },
  );
  crop.undone = await page.evaluate(() => window.mulch.probe().decks.a.duration);

  // P20: the loop became the source. Every number here is the browser's answer after decoding bytes
  // this app wrote — the length, and the envelope that says it is the loop's audio and not some
  // other region of the same file (0047).
  const cropWanted = crop.loopWas.out - crop.loopWas.in;
  if (!crop.fresh) fail("a crop reused the blob it was cut from", crop);
  if (crop.header !== "RIFF") fail("a crop did not store a wav", crop);
  if (crop.loop !== null) {
    fail("a crop left a loop pointing into the source it replaced", crop);
  }
  if (Math.abs(crop.duration - cropWanted) > CROP_ROUNDING_SECS) {
    fail(`a crop decoded to ${crop.duration}s, not the loop's ${cropWanted}s`, crop);
  }
  const cropDrift = crop.envelope.map((loudest, bucket) =>
    Math.abs(loudest - crop.wasEnvelope[bucket]),
  );
  if (Math.max(...crop.envelope) <= 0) {
    fail("a crop decoded to silence", crop);
  }
  // Without this the comparison below would pass for a crop of any region of a steady source.
  const cropRelief = Math.max(...crop.wasEnvelope) - Math.min(...crop.wasEnvelope);
  if (cropRelief < CROP_ENVELOPE_RELIEF) {
    fail(
      `the region the crop was cut from is too flat to tell one crop from another: ${cropRelief}`,
    );
  }
  if (Math.max(...cropDrift) > CROP_ENVELOPE_TOLERANCE) {
    fail(
      `a crop does not sound like the region it was cut from — worst bucket off by ` +
        Math.max(...cropDrift).toFixed(3),
      crop,
    );
  }
  if (Math.abs(crop.undone - crop.wasDuration) > Number.EPSILON) {
    fail("one press of undo did not bring back the source the crop was cut from", crop);
  }
  report(
    `a ${cropWanted.toFixed(2)}s loop became the deck's whole source: minted wav decoded to ` +
      `${crop.duration.toFixed(3)}s carrying that region's own envelope within ` +
      `${Math.max(...cropDrift).toFixed(3)}, and one undo brought back ` +
      `${crop.wasDuration.toFixed(2)}s`,
  );
};
