import { describe, expect, it } from "vitest";

import { createSessionArchive, parseSessionArchive } from "./sessionArchive";

const fixture = () => {
  return {
    manifest: {
      version: 2,
      decks: {
        a: { source: { blobId: "audio/a" } },
        b: { source: { blobId: "audio-b" } },
      },
    },
    blobs: new Map([
      ["audio/a", Uint8Array.of(0, 1, 2, 255)],
      ["audio-b", Uint8Array.of(9, 8, 7)],
    ]),
  };
};

const entryNames = (archive: Uint8Array): Array<{ offset: number; length: number }> => {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const count = view.getUint32(8, true);
  const names: Array<{ offset: number; length: number }> = [];
  let offset = 12;
  for (let index = 0; index < count; index++) {
    const length = view.getUint16(offset, true);
    const payload = view.getUint32(offset + 2, true);
    names.push({ offset: offset + 10, length });
    offset += 10 + length + payload;
  }
  return names;
};

// One flat contract matrix covers every container refusal beside its happy path; helpers above
// own the byte-offset mechanics. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("portable session archive", () => {
  it("round-trips the manifest, blob ids, and exact bytes deterministically", () => {
    const { manifest, blobs } = fixture();
    const first = createSessionArchive(manifest, blobs);
    // ES2022 has no toReversed; this fresh array is not observable by the fixture.
    // oxlint-disable-next-line unicorn/no-array-reverse
    const second = createSessionArchive(manifest, new Map([...blobs].reverse()));
    const parsed = parseSessionArchive(first);

    expect(second).toEqual(first);
    expect(parsed.manifest).toEqual(manifest);
    expect([...parsed.blobs.keys()]).toEqual(["audio-b", "audio/a"]);
    expect(parsed.blobs.get("audio/a")).toEqual(blobs.get("audio/a"));
    expect(parsed.blobs.get("audio-b")).toEqual(blobs.get("audio-b"));
  });

  it("keeps every JavaScript blob id distinct, including unpaired surrogates", () => {
    const manifest = {
      version: 2,
      decks: {
        a: { source: { blobId: "\uD800" } },
        b: { source: { blobId: "\uD801" } },
      },
    };
    const blobs = new Map([
      ["\uD800", Uint8Array.of(1)],
      ["\uD801", Uint8Array.of(2)],
    ]);

    expect(parseSessionArchive(createSessionArchive(manifest, blobs)).blobs).toEqual(blobs);
  });

  it("refuses missing and extra blobs at creation", () => {
    const { manifest, blobs } = fixture();
    expect(() =>
      createSessionArchive(manifest, new Map([["audio/a", blobs.get("audio/a")!]])),
    ).toThrow(/expected referenced/u);
    const extra = new Map([...blobs, ["orphan", Uint8Array.of(1)] as const]);
    expect(() => createSessionArchive(manifest, extra)).toThrow(/expected referenced/u);
  });

  it("never creates a container that exceeds its own structural bounds", () => {
    expect(() => createSessionArchive(undefined, new Map())).toThrow(/not JSON data/u);
    const tooLong = "x".repeat(0x4000);
    expect(() =>
      createSessionArchive(
        { decks: { a: { source: { blobId: tooLong } } } },
        new Map([[tooLong, Uint8Array.of(1)]]),
      ),
    ).toThrow(/blob id is too long/u);

    const decks = Object.fromEntries(
      Array.from({ length: 10_000 }, (_, index) => [
        `deck-${index}`,
        { source: { blobId: `blob-${index}` } },
      ]),
    );
    const blobs = new Map(
      Array.from({ length: 10_000 }, (_, index) => [`blob-${index}`, Uint8Array.of(index)]),
    );
    expect(() => createSessionArchive({ decks }, blobs)).toThrow(/too many archive entries/u);
  });

  it("refuses corrupt, truncated, trailing, and unsupported containers", () => {
    const { manifest, blobs } = fixture();
    const archive = createSessionArchive(manifest, blobs);
    const corrupt = archive.slice();
    corrupt[corrupt.length - 1] = (corrupt.at(-1) ?? 0) ^ 1;
    expect(() => parseSessionArchive(corrupt)).toThrow(/corrupt/u);
    expect(() => parseSessionArchive(archive.slice(0, -1))).toThrow(/truncated/u);
    expect(() => parseSessionArchive(Uint8Array.from([...archive, 0]))).toThrow(
      /extra archive bytes/u,
    );
    const unsupported = archive.slice();
    new DataView(unsupported.buffer).setUint16(6, 99, true);
    expect(() => parseSessionArchive(unsupported)).toThrow(/unsupported archive version/u);

    const impossibleCount = archive.slice();
    new DataView(impossibleCount.buffer).setUint32(8, 10_001, true);
    expect(() => parseSessionArchive(impossibleCount)).toThrow(/invalid archive entry count/u);
  });

  it("refuses duplicate, missing, and unsupported entries", () => {
    const { manifest, blobs } = fixture();
    const archive = createSessionArchive(manifest, blobs);
    const duplicate = archive.slice();
    const [, firstBlob, secondBlob] = entryNames(duplicate);
    if (firstBlob === undefined || secondBlob === undefined)
      throw new Error("fixture has no blobs");
    duplicate.copyWithin(secondBlob.offset, firstBlob.offset, firstBlob.offset + firstBlob.length);
    expect(() => parseSessionArchive(duplicate)).toThrow(/duplicate archive entry/u);

    const missing = archive.slice();
    const missingName = entryNames(missing)[1];
    if (missingName === undefined) throw new Error("fixture has no first blob");
    missing[missingName.offset] = 0x78;
    expect(() => parseSessionArchive(missing)).toThrow(/missing archive entry/u);

    const extraName = new TextEncoder().encode("extra");
    const extra = new Uint8Array(archive.length + 10 + extraName.length);
    extra.set(archive);
    const view = new DataView(extra.buffer);
    view.setUint32(8, 4, true);
    view.setUint16(archive.length, extraName.length, true);
    view.setUint32(archive.length + 2, 0, true);
    view.setUint32(archive.length + 6, 0, true);
    extra.set(extraName, archive.length + 10);
    expect(() => parseSessionArchive(extra)).toThrow(/extra or unsupported archive entry/u);
  });
});
