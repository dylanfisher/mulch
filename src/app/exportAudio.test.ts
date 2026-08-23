import { describe, expect, it } from "vitest";

import { INITIAL_YARD_NAME } from "@/lib/copy";
import { SESSION_ARCHIVE_FILE } from "@/lib/sessionArchive";
import { importedBlobId } from "@/lib/source";
import { sessionSnapshot } from "@/state/session";
import { activateDeck, addDeck, createSessionStore, patchDeck, removeDeck } from "@/state/store";
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
  exportNames,
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

// One `it` per case a name can arrive in — the length tracks how many ways a person can type
// something a filesystem will not take. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("exportNames", () => {
  it("names the folder and both files in it from the one typed name", () => {
    expect(exportNames("Take One")).toEqual({
      folder: "Take One",
      audio: "Take One.wav",
      session: `Take One${SESSION_ARCHIVE_FILE.extension}`,
    });
  });

  it("takes off an extension that was typed, so a folder is not called Take One.wav", () => {
    expect(exportNames("take.wav").folder).toBe("take");
    expect(exportNames("take.WAV").audio).toBe("take.wav");
    expect(exportNames(`take${SESSION_ARCHIVE_FILE.extension}`).folder).toBe("take");
  });

  it("cleans a name the filesystem will not take rather than refusing it", () => {
    // Every separator, every character Windows reserves, and the control range — a description
    // typed into a field is not a path, and what comes out has to be one name on every desktop.
    expect(exportNames('A/C: "live?" <b>\u0007 | 90%').folder).toBe("A C live b 90");
    expect(exportNames("...hidden...").folder).toBe("hidden");
    expect(exportNames("birds\u0000.wav").folder).toBe("birds");
  });

  it("falls back to the default rather than naming a folder after nothing", () => {
    for (const typed of ["   ", "", ".wav", " .WAV ", "///", "..."]) {
      expect(exportNames(typed).folder).toBe(EXPORT_AUDIO_FILE.base);
      expect(exportNames(typed).audio).toBe(`${EXPORT_AUDIO_FILE.base}.wav`);
    }
  });

  it("keeps a name short enough for a filesystem to hold, cut between characters", () => {
    const long = exportNames("a".repeat(500));
    expect(long.folder.length).toBeLessThanOrEqual(96);
    expect(long.audio).toBe(`${long.folder}.wav`);
    // A path component is 255 bytes, not 255 characters, and one of these is four of them — a
    // cut by index would also leave half a surrogate pair, which every encoder replaces.
    const astral = exportNames("𠀀".repeat(200)).folder;
    expect(new TextEncoder().encode(astral).length).toBeLessThanOrEqual(96);
    expect(astral.endsWith("𠀀")).toBe(true);
  });

  it("does not leave the trailing dot the cut can land on", () => {
    // The dots are stripped after the name is cut to length, not before: a name trimmed to its
    // last character may end on a dot that was in the middle of what was typed.
    expect(exportNames(`${"a".repeat(95)}.b.c.d`).folder).toBe("a".repeat(95));
  });

  it("refuses a name Windows keeps for a device, whatever its case", () => {
    for (const typed of ["con", "NUL", "com1", "aux "]) {
      expect(exportNames(typed).folder).toBe(EXPORT_AUDIO_FILE.base);
    }
    // Reserved as a whole name only — a name that merely contains one is a name.
    expect(exportNames("second con").folder).toBe("second con");
  });

  it("takes one extension off, not two", () => {
    // `take.wav.mulch` is a name with a dot in it; peeling both would rename the take.
    expect(exportNames("take.wav.mulch").folder).toBe("take.wav");
    expect(exportNames("take.mulch.wav").folder).toBe("take.mulch");
  });
});

describe("exportAudio", () => {
  /** Refused at the door, not after minutes of rendering: an hour is the most a tab can hold. */
  it("refuses a length no render should be started for", async () => {
    const instrument = loaded(2);
    const spec = { name: "take", fadeInSecs: 0, fadeOutSecs: 0, session: true };
    // A spec that does not say whether the session leaves with the audio is refused rather than
    // quietly taking the export the checkbox is cleared for. Deleted rather than typed away: the
    // callers this guards against are the browser scenarios, which are not typechecked.
    const unsaid = { ...spec, secs: 1 };
    Reflect.deleteProperty(unsaid, "session");
    await expect(exportAudio(instrument, unsaid)).rejects.toThrow(/whether it writes the session/u);
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

/** A yard's source as an import of that file, under the id an ingest would have minted for it. */
const imported = (file: string) => ({ blobId: importedBlobId(file, crypto.randomUUID()) });

/** One take, made at a minute that is not the minute this test runs in. */
const MADE = new Date(2026, 7, 22, 17, 19, 44);
const STAMP = "2026-08-22 1719";

// One `it` per thing the offered name is made of: the yard, what it was made of, and when. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("defaultExportName", () => {
  it("names the yard and the date alone for bytes the app itself minted", () => {
    const store = createSessionStore();
    // The bytes a crop minted are named by the command that minted them (0047), which is not a
    // file anyone recognises — and neither is an empty yard.
    patchDeck(store, "a", { source: { blobId: "take-1" } });
    expect(defaultExportName(store.getState(), MADE)).toBe(`${STAMP} ${INITIAL_YARD_NAME}`);
    patchDeck(store, "a", { source: null });
    expect(defaultExportName(store.getState(), MADE)).toBe(`${STAMP} ${INITIAL_YARD_NAME}`);
  });

  // P95: a yard on a generator used to be offered its name alone, so it said nothing about what
  // it was made of and nothing about when.
  it("carries the generator's own kind in the field an imported file's name is in", () => {
    const store = createSessionStore();
    patchDeck(store, "a", { source: { gen: "sine", hz: 220, secs: 1 } });
    expect(defaultExportName(store.getState(), MADE)).toBe(`${STAMP} ${INITIAL_YARD_NAME} sine`);
    patchDeck(store, "a", { source: { gen: "click-train", secs: 2 } });
    expect(defaultExportName(store.getState(), MADE)).toBe(
      `${STAMP} ${INITIAL_YARD_NAME} click-train`,
    );
  });

  it("carries the imported file's own name, so an export says what it came from", () => {
    const store = createSessionStore();
    patchDeck(store, "a", { source: imported("birds.wav") });
    const name = defaultExportName(store.getState(), MADE);
    expect(name).toBe(`${STAMP} ${INITIAL_YARD_NAME} birds`);
    expect(exportNames(name)).toEqual({
      folder: `${STAMP} ${INITIAL_YARD_NAME} birds`,
      audio: `${STAMP} ${INITIAL_YARD_NAME} birds.wav`,
      session: `${STAMP} ${INITIAL_YARD_NAME} birds${SESSION_ARCHIVE_FILE.extension}`,
    });
  });

  // P95: two takes of one yard an hour apart were one name twice, so the second overwrote the
  // first in whatever folder the browser put them in.
  it("gives two takes of one yard taken at different minutes two folders", () => {
    const store = createSessionStore();
    patchDeck(store, "a", { source: imported("birds.wav") });
    const first = exportNames(defaultExportName(store.getState(), MADE)).folder;
    const later = exportNames(
      defaultExportName(store.getState(), new Date(2026, 7, 22, 18, 19, 44)),
    ).folder;
    expect(first).not.toBe(later);
  });

  it("follows the active yard's file rather than another yard's", () => {
    const store = createSessionStore();
    patchDeck(store, "a", { source: imported("birds.wav") });
    addDeck(store, "b", "🌵", "Wild Bramble");
    patchDeck(store, "b", { source: imported("thunder.flac") });
    addDeck(store, "c", "🌾", "Idle Sedge");
    patchDeck(store, "c", { source: imported("rain.mp3") });
    activateDeck(store, "b");
    expect(defaultExportName(store.getState(), MADE)).toBe(`${STAMP} Wild Bramble thunder`);
    activateDeck(store, "c");
    expect(defaultExportName(store.getState(), MADE)).toBe(`${STAMP} Idle Sedge rain`);
  });

  // The date is the part that must survive `fitted`, which cuts from the end: a stamp at the
  // tail is the first thing a long source name pushes off, and two takes an hour apart are one
  // folder again.
  it("keeps the date through a cut a long source name would push it past", () => {
    const store = createSessionStore();
    // 31 CJK characters is 93 of the 96 bytes a folder name may hold, before the yard's own.
    patchDeck(store, "a", { source: imported(`${"夏".repeat(31)}.wav`) });
    const folder = (when: Date) => exportNames(defaultExportName(store.getState(), when)).folder;

    expect(folder(MADE)).toContain(STAMP);
    expect(folder(MADE)).not.toBe(folder(new Date(2026, 7, 22, 18, 19)));
  });

  it("says when, with the default standing in for a session that holds no yard at all", () => {
    const store = createSessionStore();
    removeDeck(store, "a");
    expect(defaultExportName(store.getState(), MADE)).toBe(`${STAMP} ${EXPORT_AUDIO_FILE.base}`);
  });

  it("cleans a file the filesystem would not take back into a name it will", () => {
    const store = createSessionStore();
    patchDeck(store, "a", { source: imported("AC/DC: live?.wav") });
    expect(exportNames(defaultExportName(store.getState(), MADE)).folder).toBe(
      `${STAMP} ${INITIAL_YARD_NAME} AC DC live`,
    );
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
