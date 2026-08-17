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
} from "./exportAudio";
import { createInstrument } from "./facade";

const loaded = (secs: number) => {
  const instrument = createInstrument(manualClock(), () =>
    // The one method these cases are about: the silent engine keeps no loop, and a session with
    // no loop in it cannot say what a loop does to the length the dialog offers.
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
  it("offers a length even when the session has nothing loaded", () => {
    const instrument = createInstrument(manualClock(), () => silentEngine());
    expect(defaultExportSecs(instrument.state.getState())).toBe(EXPORT_MIN_SECS);
  });

  it("reaches the end of the longest source, rounded up to a whole second", () => {
    expect(defaultExportSecs(loaded(3.2).state.getState())).toBe(4);
  });

  it("reaches the end of a loop rather than of the source it sits in", () => {
    const instrument = loaded(30);
    instrument.send({ t: "deck.loop", deck: "a", in: 1, out: 2.5 });
    expect(defaultExportSecs(instrument.state.getState())).toBe(3);
  });

  /** Real seconds, not buffer seconds: half speed is twice as long to sit through (0031). */
  it("offers the time a yard takes to play, not the length of its buffer", () => {
    const instrument = loaded(4);
    instrument.send({ t: "param.set", deck: "a", param: "deck.speed", value: 0.5 });
    expect(defaultExportSecs(instrument.state.getState())).toBe(8);
    instrument.send({ t: "param.set", deck: "a", param: "deck.speed", value: 2 });
    expect(defaultExportSecs(instrument.state.getState())).toBe(2);
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
