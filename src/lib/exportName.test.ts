/** @role What a take is called: the four fields, the one rule about a field, and the date. */
import { describe, expect, it } from "vitest";

import {
  EXPORT_NAME_BASE,
  EXPORT_NAME_SEPARATOR,
  exportDateStamp,
  exportNameField,
  exportSourceName,
} from "@/lib/exportName";

/** One take, made at a minute that is not the minute this test runs in. */
const MADE = new Date(2026, 7, 22, 17, 19, 44);
/** The two fields every offered name opens with, however little the session has to say. */
const STAMP = `2026-08-22_${EXPORT_NAME_BASE}-1719`;

describe("exportDateStamp", () => {
  it("says the local day and the local minute, in characters a filesystem writes back", () => {
    expect(exportDateStamp(MADE)).toEqual({ day: "2026-08-22", minute: "1719" });
    // Padded on both halves, or January the ninth at 09:05 sorts between October and November.
    expect(exportDateStamp(new Date(2026, 0, 9, 9, 5))).toEqual({
      day: "2026-01-09",
      minute: "0905",
    });
  });

  // P95: two takes of one yard an hour apart used to be one name twice.
  it("separates two takes of one yard taken a minute apart", () => {
    expect(exportSourceName("Quiet Fern", null, new Date(2026, 7, 22, 17, 19))).not.toBe(
      exportSourceName("Quiet Fern", null, new Date(2026, 7, 22, 17, 20)),
    );
  });
});

// P114: one `it` per thing a field of a name can arrive holding — the length tracks how many
// marks a person can put in a yard's name or a file's, not how much this decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("exportNameField", () => {
  it("makes one word of a field, a hyphen wherever it held a space", () => {
    expect(exportNameField("Old Thicket")).toBe("Old-Thicket");
    expect(exportNameField("sine")).toBe("sine");
    // Already a word, and a word already hyphenated: idempotent, because the offered name is read
    // back through this the moment the dialog hands it to `exportNames`.
    expect(exportNameField("click-train")).toBe("click-train");
  });

  it("drops an apostrophe rather than breaking a word on it", () => {
    // The whole reason a mark is dropped rather than replaced: `Don-t-Stop--til` is not a name.
    expect(exportNameField("Don't Stop 'til You Get Enough")).toBe("Dont-Stop-til-You-Get-Enough");
    expect(exportNameField("Sam’s Take")).toBe("Sams-Take");
  });

  it("drops every shape an apostrophe arrives in, not only the two a keyboard types", () => {
    // A grave stands in for one on a keyboard without them, and the two modifier letters are
    // `\p{L}` — which would carry them into the filename verbatim rather than drop them.
    for (const mark of ["'", "‘", "’", "`", "´", "ʼ", "ʻ"]) {
      expect(exportNameField(`Don${mark}t Stop`)).toBe("Dont-Stop");
    }
  });

  it("composes a letter before deciding it is one", () => {
    // A file picker on macOS hands back a decomposed name, where the accent is a combining mark
    // and a mark is not in the permitted set — so an unnormalised field loses the letter it sits
    // on to a hyphen.
    expect(exportNameField("Café Sessions".normalize("NFD"))).toBe("Café-Sessions");
    expect(exportNameField("Ångström take".normalize("NFD"))).toBe("Ångström-take");
    // The two spellings of one name are one field, which is the whole point of composing.
    expect(exportNameField("Café".normalize("NFD"))).toBe(exportNameField("Café".normalize("NFC")));
  });

  it("lets nothing but letters, digits and the hyphen through", () => {
    expect(exportNameField('A/C: "live?" <b> | 90%')).toBe("A-C-live-b-90");
    expect(exportNameField("Birds, Rain & Wind (take 2)")).toBe("Birds-Rain-Wind-take-2");
    // The separator itself is not a mark a field may hold, or a typed name would read as more
    // fields than it has.
    expect(exportNameField(`a${EXPORT_NAME_SEPARATOR}b`)).toBe("a-b");
  });

  it("leaves no hyphen at either end and never two in a row", () => {
    expect(exportNameField("...hidden...")).toBe("hidden");
    expect(exportNameField(" & ")).toBe("");
    expect(exportNameField("a -- b")).toBe("a-b");
  });

  it("keeps a letter no keyboard here types, because a filesystem writes it back", () => {
    expect(exportNameField("夏 の 音")).toBe("夏-の-音");
  });
});

describe("exportSourceName", () => {
  it("is four fields joined by the separator, each of them one word", () => {
    expect(exportSourceName("Old Thicket", "Don't Stop 'til You Get Enough.mp3", MADE)).toBe(
      `${STAMP}_Old-Thicket_Dont-Stop-til-You-Get-Enough`,
    );
    expect(exportSourceName("Quiet Fern", "birds.wav", MADE)).toBe(`${STAMP}_Quiet-Fern_birds`);
  });

  it("leaves a field that says nothing out rather than joining it empty", () => {
    expect(exportSourceName("Quiet Fern", null, MADE)).toBe(`${STAMP}_Quiet-Fern`);
    // A session holding no yard at all: the app's own name is still a field, and the two fields
    // it has are never two separators in a row.
    expect(exportSourceName("", null, MADE)).toBe(STAMP);
    expect(exportSourceName("", "birds.wav", MADE)).toBe(`${STAMP}_birds`);
  });

  it("takes off the source's own extension, in whatever case it arrived", () => {
    expect(exportSourceName("Quiet Fern", "birds.WAV", MADE)).toBe(`${STAMP}_Quiet-Fern_birds`);
    expect(exportSourceName("Quiet Fern", "birds.flac", MADE)).toBe(`${STAMP}_Quiet-Fern_birds`);
    // Only the one it ends with: a name is not a list of extensions to strip. The dot left in the
    // middle is a mark a field may not hold, so what survives it is a hyphen.
    expect(exportSourceName("Quiet Fern", "birds.wav.mp3", MADE)).toBe(
      `${STAMP}_Quiet-Fern_birds-wav`,
    );
  });

  it("keeps a name that is not an audio file's, and refuses to be named after nothing", () => {
    expect(exportSourceName("Quiet Fern", "birds", MADE)).toBe(`${STAMP}_Quiet-Fern_birds`);
    // A file called `.wav` has no name under its extension, and neither would the export.
    expect(exportSourceName("Quiet Fern", ".wav", MADE)).toBe(`${STAMP}_Quiet-Fern`);
  });
});
