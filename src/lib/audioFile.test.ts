import { describe, expect, it } from "vitest";

import {
  AUDIO_FILE_ACCEPT,
  AUDIO_FILE_EXTENSIONS,
  isAcceptedAudioFile,
  unacceptedAudioFile,
} from "@/lib/audioFile";

/** One declaration, so the picker's filter and the guard before an ingest cannot disagree. */
describe("the accepted audio formats", () => {
  it("names every format P18 promised, and says so in the picker's own attribute", () => {
    expect([...AUDIO_FILE_EXTENSIONS]).toEqual(
      expect.arrayContaining([".wav", ".aiff", ".mp3", ".m4a", ".flac", ".ogg"]),
    );
    // What this catches is an `accept` written out by hand: the attribute is the list, not a
    // wildcard and not a second copy of it, so what the picker offers is what an ingest takes.
    expect(AUDIO_FILE_ACCEPT.split(",")).toEqual([...AUDIO_FILE_EXTENSIONS]);
    expect(AUDIO_FILE_ACCEPT).not.toContain("*");
  });

  it("accepts every declared extension whatever case it is written in", () => {
    for (const extension of AUDIO_FILE_EXTENSIONS) {
      expect(isAcceptedAudioFile(`sample${extension}`)).toBe(true);
      expect(isAcceptedAudioFile(`SAMPLE${extension.toUpperCase()}`)).toBe(true);
    }
  });

  it("refuses anything else, including a name that only mentions a format", () => {
    expect(isAcceptedAudioFile("notes.txt")).toBe(false);
    expect(isAcceptedAudioFile("sample.wav.zip")).toBe(false);
    expect(isAcceptedAudioFile("wav")).toBe(false);
    expect(isAcceptedAudioFile("")).toBe(false);
  });

  it("says what was refused and what it would have taken", () => {
    const detail = unacceptedAudioFile("notes.txt");
    expect(detail).toContain("notes.txt");
    expect(detail).toContain(AUDIO_FILE_ACCEPT);
  });
});
