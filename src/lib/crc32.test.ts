import { describe, expect, it } from "vitest";

import { crc32 } from "./crc32";

describe("crc32", () => {
  it("answers the published check vector, so a container's checksum is the standard one", () => {
    // `"123456789"` is CRC-32/ISO-HDLC's own check vector and 0xcbf43926 its stated answer; a
    // table folded wrong passes every self-consistent round trip and fails this.
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcb_f4_39_26);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});
