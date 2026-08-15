/**
 * @role Contract tests for the one decode cache: one decode per blob id however many callers
 *   ask, decodes serialized rather than fired at once, and a bounded number of results held.
 */
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

// One flat list of the cache's contract cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("createDecodeCache", () => {
  it("decodes one blob once however many times it is asked for", async () => {
    const { decode, decoded } = counting();
    const cache = createDecodeCache(decode);

    expect(await cache.get("one", bytesOf("one"))).toBe("decoded:one");
    expect(await cache.get("one", bytesOf("one"))).toBe("decoded:one");
    expect(await cache.get("two", bytesOf("two"))).toBe("decoded:two");
    expect(decoded).toEqual(["one", "two"]);
  });

  it("shares one decode between callers that arrive together", async () => {
    const { decode, decoded } = counting();
    const cache = createDecodeCache(decode);

    const both = await Promise.all([
      cache.get("one", bytesOf("one")),
      cache.get("one", bytesOf("one")),
    ]);

    expect(both).toEqual(["decoded:one", "decoded:one"]);
    expect(decoded).toEqual(["one"]);
  });

  it("never reads the bytes of a blob it is already holding", async () => {
    const { decode } = counting();
    const cache = createDecodeCache(decode);
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
    });

    await Promise.all(["a", "b", "c"].map((id) => cache.get(id, bytesOf(id))));

    expect(most).toBe(1);
  });

  it("holds no more than its limit, evicting what was asked for longest ago", async () => {
    const { decode, decoded } = counting();
    const cache = createDecodeCache(decode, 2);

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
    const cache = createDecodeCache(decode);
    await cache.get("one", bytesOf("one"));

    await expect(cache.get("bad", () => Promise.reject(new Error("no bytes")))).rejects.toThrow(
      "no bytes",
    );

    expect(await cache.get("bad", bytesOf("bad"))).toBe("decoded:bad");
    expect(decoded).toEqual(["one", "bad"]);
  });

  it("refuses a limit that would hold nothing", () => {
    expect(() => createDecodeCache((): Promise<string> => Promise.resolve(""), 0)).toThrow(
      RangeError,
    );
  });
});
