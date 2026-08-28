/**
 * @role Contract tests for the one decode cache: one decode per blob id however many callers
 *   ask, decodes serialized rather than fired at once, and a bounded number of results held.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createDecodeCache } from "./decodeCache";

/** A decoder that records what it was asked to decode, and what the bytes said. */
const counting = () => {
  const decoded: string[] = [];
  return {
    decoded,
    decode: (bytes: ArrayBuffer) => {
      const text = new TextDecoder().decode(bytes);
      decoded.push(text);
      return Promise.resolve(`decoded:${text}`);
    },
  };
};

const bytesOf = (text: string) => () => Promise.resolve(new TextEncoder().encode(text).buffer);

/** What a decoded value here weighs: its own length, so a total is readable in the assertions. */
const sized = (value: string) => value.length;

// One flat list of the cache's contract cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("createDecodeCache", () => {
  it("decodes one blob once however many times it is asked for", async () => {
    const { decode, decoded } = counting();
    const cache = createDecodeCache(decode, sized);

    expect(await cache.get("one", bytesOf("one"))).toBe("decoded:one");
    expect(await cache.get("one", bytesOf("one"))).toBe("decoded:one");
    expect(await cache.get("two", bytesOf("two"))).toBe("decoded:two");
    expect(decoded).toEqual(["one", "two"]);
  });

  it("shares one decode between callers that arrive together", async () => {
    const { decode, decoded } = counting();
    const cache = createDecodeCache(decode, sized);

    const both = await Promise.all([
      cache.get("one", bytesOf("one")),
      cache.get("one", bytesOf("one")),
    ]);

    expect(both).toEqual(["decoded:one", "decoded:one"]);
    expect(decoded).toEqual(["one"]);
  });

  it("never reads the bytes of a blob it is already holding", async () => {
    const { decode } = counting();
    const cache = createDecodeCache(decode, sized);
    await cache.get("one", bytesOf("one"));

    await cache.get("one", () => Promise.reject(new Error("bytes were read on a hit")));

    expect(await cache.get("one", bytesOf("one"))).toBe("decoded:one");
  });

  it("runs decodes one at a time rather than all at once", async () => {
    let live = 0;
    let most = 0;
    const cache = createDecodeCache(async (bytes: ArrayBuffer) => {
      live++;
      most = Math.max(most, live);
      await Promise.resolve();
      live--;
      return new TextDecoder().decode(bytes);
    }, sized);

    await Promise.all(["a", "b", "c"].map((id) => cache.get(id, bytesOf(id))));

    expect(most).toBe(1);
  });

  it("holds no more than its limit, evicting what was asked for longest ago", async () => {
    const { decode, decoded } = counting();
    const cache = createDecodeCache(decode, sized, 2);

    await cache.get("one", bytesOf("one"));
    await cache.get("two", bytesOf("two"));
    // Touching "one" makes "two" the oldest, so the third entry is what evicts "two".
    await cache.get("one", bytesOf("one"));
    await cache.get("three", bytesOf("three"));

    expect(await cache.get("one", bytesOf("one"))).toBe("decoded:one");
    expect(decoded).toEqual(["one", "two", "three"]);

    expect(await cache.get("two", bytesOf("two"))).toBe("decoded:two");
    expect(decoded).toEqual(["one", "two", "three", "two"]);
  });

  it("holds nothing for a decode that failed, and keeps serving the ones that did not", async () => {
    const { decode, decoded } = counting();
    const cache = createDecodeCache(decode, sized);
    await cache.get("one", bytesOf("one"));

    await expect(cache.get("bad", () => Promise.reject(new Error("no bytes")))).rejects.toThrow(
      "no bytes",
    );

    expect(await cache.get("bad", bytesOf("bad"))).toBe("decoded:bad");
    expect(decoded).toEqual(["one", "bad"]);
  });

  it("totals what it holds, and loses the weight of what it evicted", async () => {
    const { decode } = counting();
    const cache = createDecodeCache(decode, sized, 2);
    expect(cache.bytesHeld()).toBe(0);

    await cache.get("one", bytesOf("one"));
    expect(cache.bytesHeld()).toBe("decoded:one".length);

    // A hit re-sets the entry for recency; the total must not count it a second time.
    await cache.get("one", bytesOf("one"));
    expect(cache.bytesHeld()).toBe("decoded:one".length);

    // Ids of three different weights, so the total says which entry actually left rather than
    // agreeing by coincidence: "one" was already the oldest and the hit above did not move it.
    await cache.get("longer", bytesOf("longer"));
    expect(cache.bytesHeld()).toBe("decoded:one".length + "decoded:longer".length);

    await cache.get("three", bytesOf("three"));
    expect(cache.bytesHeld()).toBe("decoded:longer".length + "decoded:three".length);
  });

  it("weighs nothing for a decode that failed", async () => {
    const { decode } = counting();
    const cache = createDecodeCache(decode, sized);

    await expect(cache.get("bad", () => Promise.reject(new Error("no bytes")))).rejects.toThrow(
      "no bytes",
    );

    expect(cache.bytesHeld()).toBe(0);
  });

  it("names the blob, its size and the codec when the decoder refuses a file", async () => {
    // What the .m4a import actually did: Chromium has no ALAC decoder on any path, so the whole
    // file is refused with a bare EncodingError naming nothing, and the buffer is detached on the
    // way out. The real fixture rather than a hand-built tree, because the claim is about a file
    // a person actually has (P63).
    const alac = readFileSync(join(import.meta.dirname, "../../fixtures/alac.m4a"));
    const bytes = () =>
      Promise.resolve(alac.buffer.slice(alac.byteOffset, alac.byteOffset + alac.byteLength));
    const refused = createDecodeCache<string>((sent) => {
      // The detach a real `decodeAudioData` performs, so a length read on the way out of the
      // failure is zero and a codec read finds nothing: both have to come off other bytes.
      structuredClone(sent, { transfer: [sent] });
      return Promise.reject(new DOMException("Unable to decode audio data", "EncodingError"));
    }, sized);

    const failure: unknown = await refused
      .get("01 lucky star.m4a", bytes)
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({
      message:
        `could not decode 01 lucky star.m4a (${alac.byteLength} bytes): ` +
        "EncodingError: Unable to decode audio data — the file is Apple Lossless (ALAC), " +
        "which this browser has no decoder for — convert it to wav or flac",
      cause: { name: "EncodingError" },
    });
  });

  it("says nothing about the codec when the bytes are not a file it can read", async () => {
    // The reason is an addition, never a replacement: a wav that failed still fails with the
    // decoder's own words and nothing invented after them.
    const refused = createDecodeCache<string>(
      () => Promise.reject(new DOMException("Unable to decode audio data", "EncodingError")),
      sized,
    );

    // The whole message, not a part of it: a clause invented here would sit past the end of any
    // substring this could match.
    await expect(refused.get("hiss.wav", bytesOf("RIFF"))).rejects.toMatchObject({
      message: "could not decode hiss.wav (4 bytes): EncodingError: Unable to decode audio data",
    });
  });

  it("refuses a decode that answered with nothing at all", async () => {
    // The quieter half of the same failure: no throw, no buffer, and `reduce` reading a property
    // off undefined one frame later. Refused here, where the id and the size are still known.
    const empty = createDecodeCache<string>(
      // oxlint-disable-next-line no-unsafe-type-assertion -- a browser that answers with nothing
      () => Promise.resolve(undefined as unknown as string),
      sized,
    );

    await expect(empty.get("silent", bytesOf("abc"))).rejects.toThrow(
      "decoding silent produced nothing (3 bytes)",
    );
  });

  it("refuses a limit that would hold nothing", () => {
    expect(() => createDecodeCache((): Promise<string> => Promise.resolve(""), sized, 0)).toThrow(
      RangeError,
    );
  });
});
