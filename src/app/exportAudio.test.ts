import { describe, expect, it } from "vitest";

import { INITIAL_YARD_NAME } from "@/lib/copy";
import { sessionSnapshot } from "@/state/session";
import { activateDeck, addDeck, createSessionStore, patchDeck } from "@/state/store";
import { manualClock } from "./clock";
import { silentEngine } from "./engineDouble";
import {
  defaultExportName,
  defaultExportSecs,
  EXPORT_AUDIO_FILE,
  exportAudio,
  EXPORT_MAX_SECS,
  EXPORT_MIN_SECS,
  exportEnvelopes,
  exportFileName,
  exportLengthFields,
  EXPORT_SECS_PER_MINUTE,
  exportSecsOf,
} from "./exportAudio";
import { createInstrument } from "./facade";

const loaded = (secs: number) => {
  const instrument = createInstrument(manualClock(), () =>
    // The silent engine keeps no loop of its own, so a session that is asked to hold one needs it
    // handed back — a loop is part of what an export's commands rebuild.
    silentEngine({ setLoop: (_deck, inSecs, outSecs) => ({ in: inSecs, out: outSecs }) }),
  );
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", hz: 220, secs } });
  return instrument;
};

describe("exportFileName", () => {
  it("adds the extension a typed name is missing", () => {
    expect(exportFileName("Take One")).toBe("Take One.wav");
  });

  it("keeps an extension that is already there, in whatever case it was typed", () => {
    expect(exportFileName("take.wav")).toBe("take.wav");
    expect(exportFileName("take.WAV")).toBe("take.WAV");
  });

  it("falls back to the default rather than naming a file after nothing", () => {
    expect(exportFileName("   ")).toBe(EXPORT_AUDIO_FILE.name);
    expect(exportFileName("")).toBe(EXPORT_AUDIO_FILE.name);
    // A name that is only the extension would save a dotfile, which is a file nobody finds.
    expect(exportFileName(".wav")).toBe(EXPORT_AUDIO_FILE.name);
    expect(exportFileName(" .WAV ")).toBe(EXPORT_AUDIO_FILE.name);
  });
});

describe("exportAudio", () => {
  /** Refused at the door, not after minutes of rendering: an hour is the most a tab can hold. */
  it("refuses a length no render should be started for", async () => {
    const instrument = loaded(2);
    const spec = { name: "take", fadeInSecs: 0, fadeOutSecs: 0 };
    await expect(exportAudio(instrument, { ...spec, secs: 0 })).rejects.toThrow(/an export is/u);
    await expect(exportAudio(instrument, { ...spec, secs: Number.NaN })).rejects.toThrow(
      /an export is/u,
    );
    await expect(exportAudio(instrument, { ...spec, secs: EXPORT_MAX_SECS + 1 })).rejects.toThrow(
      /an export is/u,
    );
  });
});

describe("defaultExportSecs", () => {
  it("offers ten minutes, in the seconds everything underneath the dialog counts in", () => {
    expect(defaultExportSecs()).toBe(10 * EXPORT_SECS_PER_MINUTE);
  });

  /** A default the export itself would refuse is a dialog that opens broken. */
  it("offers a length inside the range an export is taken from", () => {
    expect(defaultExportSecs()).toBeGreaterThanOrEqual(EXPORT_MIN_SECS);
    expect(defaultExportSecs()).toBeLessThanOrEqual(EXPORT_MAX_SECS);
  });
});

describe("the two fields a length is typed into", () => {
  it("commits one number, whichever field the length was typed into", () => {
    expect(exportSecsOf(10, 0)).toBe(600);
    expect(exportSecsOf(0, 600)).toBe(600);
    expect(exportSecsOf(9, 60)).toBe(600);
  });

  /** Not a whole number of minutes, and not rounded into one: the commit is what was typed. */
  it("keeps a length the minutes do not divide", () => {
    expect(exportSecsOf(1, 30.5)).toBe(90.5);
    expect(exportLengthFields(90.5)).toEqual({ minutes: 1, seconds: 30.5 });
    expect(exportSecsOf(1, 30.5)).toBe(exportSecsOf(0, 90.5));
  });

  /** An empty field is a NaN, and the other one still names a length. */
  it("reads an empty field as nothing rather than as no length at all", () => {
    expect(exportSecsOf(Number.NaN, 30)).toBe(30);
    expect(exportSecsOf(2, Number.NaN)).toBe(120);
  });

  it("clamps what the pair adds up to, at both ends", () => {
    expect(exportSecsOf(70, 0)).toBe(EXPORT_MAX_SECS);
    expect(exportSecsOf(0, EXPORT_MAX_SECS + 1)).toBe(EXPORT_MAX_SECS);
    expect(exportSecsOf(Number.NaN, Number.NaN)).toBe(EXPORT_MIN_SECS);
    expect(exportSecsOf(-5, 0)).toBe(EXPORT_MIN_SECS);
  });

  it("shows the default as ten minutes and no seconds", () => {
    expect(exportLengthFields(defaultExportSecs())).toEqual({ minutes: 10, seconds: 0 });
  });
});

describe("defaultExportName", () => {
  it("names the active yard and the bytes it is playing", () => {
    const store = createSessionStore();
    // A generator is not stored bytes, so there is no blob id to say — the yard alone names it.
    patchDeck(store, "a", { source: { gen: "sine", hz: 220, secs: 1 } });
    expect(defaultExportName(store.getState())).toBe(INITIAL_YARD_NAME);
    patchDeck(store, "a", { source: { blobId: "take-1" } });
    expect(defaultExportName(store.getState())).toBe(`${INITIAL_YARD_NAME} take-1`);
  });

  it("follows the active yard rather than the first one", () => {
    const store = createSessionStore();
    addDeck(store, "b", "🌵", "Wild Bramble");
    patchDeck(store, "b", { source: { blobId: "take-2" } });
    activateDeck(store, "b");
    expect(defaultExportName(store.getState())).toBe("Wild Bramble take-2");
  });
});

describe("exportEnvelopes", () => {
  it("rebuilds the session the way a reload does", () => {
    const instrument = loaded(2);
    const session = sessionSnapshot(instrument.state.getState());
    const envelopes = exportEnvelopes(session);
    // The restoration order is src/app/restore.ts's, unchanged: the source before its parameters.
    expect(envelopes.some((cmd) => cmd.t === "deck.load" && cmd.deck === "a")).toBe(true);
    expect(envelopes.some((cmd) => cmd.t === "deck.add" && cmd.deck === "a")).toBe(true);
  });

  it("starts every loaded yard, after everything is rebuilt", () => {
    const instrument = loaded(2);
    const session = sessionSnapshot(instrument.state.getState());
    const envelopes = exportEnvelopes(session);
    const plays = envelopes.filter((cmd) => cmd.t === "deck.play");
    expect(plays).toEqual([{ t: "deck.play", deck: "a" }]);
    // Last, because a yard cannot start before the source and rack it plays through exist.
    expect(envelopes.at(-1)).toEqual({ t: "deck.play", deck: "a" });
  });

  it("starts a yard the performer stopped, because an export is not a reading of the transport", () => {
    const instrument = loaded(2);
    // Exactly what the File menu finds when someone stopped everything before reaching for it:
    // nothing is playing, and the take is still the whole session (0077).
    instrument.send({ t: "deck.stop", deck: "a" });
    expect(instrument.state.getState().decks.a?.playing).toBe(false);
    const session = sessionSnapshot(instrument.state.getState());
    expect(exportEnvelopes(session).filter((cmd) => cmd.t === "deck.play")).toEqual([
      { t: "deck.play", deck: "a" },
    ]);
  });

  it("does not start a yard with nothing loaded, which would be a refused command", () => {
    const instrument = loaded(2);
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌵", name: "Wild Bramble" });
    const session = sessionSnapshot(instrument.state.getState());
    expect(exportEnvelopes(session).filter((cmd) => cmd.t === "deck.play")).toEqual([
      { t: "deck.play", deck: "a" },
    ]);
  });
});
