/**
 * @role Audio leaving the app: the performance as it stands turned into the commands that rebuild
 *   it, handed to the one render harness, and encoded as a .wav File the browser can save.
 * @instead The render itself → src/app/render.ts, which owns the offline context, the pump and the
 *   fingerprint; nothing here builds a graph or a second renderer. The order those commands go in
 *   → src/app/restore.ts, which startup restoration and a clip already share. Handing the file to
 *   the browser and saying so → src/ui/FileMenu.tsx and src/ui/ExportAudioDialog.tsx.
 */
// The export door composes its two files out of four things it does not own — the words, the
// container, the ids that carry a file's name, and the session's own shapes — beside the render
// and the commands. The rule has no per-site form, so this is the only shape the waiver can take
// (docs/decisions/0007-reviewed-oversized-functions.md).
// oxlint-disable import/max-dependencies
import {
  EXPORT_NAME_BASE,
  EXPORT_NAME_SEPARATOR,
  exportNameField,
  exportSourceName,
} from "@/lib/exportName";
import type { Fingerprint } from "@/lib/fingerprint";
import { clamp } from "@/lib/range";
import { SESSION_ARCHIVE_FILE, sessionArchiveFile } from "@/lib/sessionArchive";
import { genOf, importedFileName, type SourceRef } from "@/lib/source";
import { type Session, sourceBlobId } from "@/state/session";
import { deckIn, type SessionState } from "@/state/store";
import type { Command } from "./commands";
import type { Instrument } from "./facade";
import { renderOffline } from "./render";
import { restorationCommands } from "./restore";

/**
 * The one statement of what an exported file is and what an export with nothing to say about
 * where it came from is called. The base is the folder's name too — both files and the directory
 * holding them are one name with three endings (P91).
 */
export const EXPORT_AUDIO_FILE = {
  extension: ".wav",
  mediaType: "audio/wav",
  // The app's own name is a word the interface writes, so it is declared with the rest of them
  // and referred to here rather than spelled twice (principle 1). Every offered name carries it
  // as its second field, not only the name of a session holding no yards (P114).
  base: EXPORT_NAME_BASE,
} as const;

/** The shortest export the dialog offers. A render of no seconds is not a file (principle 5). */
export const EXPORT_MIN_SECS = 1;

/** What a minute is, for the two fields a length is typed into and for the hour below it. */
export const EXPORT_SECS_PER_MINUTE = 60;

/**
 * The longest one it will attempt. An OfflineAudioContext allocates its whole output up front —
 * stereo float at 48kHz is 23MB a minute — so a typo of an extra zero is not a slow export, it is
 * a tab the browser kills where no `catch` can report it. An hour is well past the ten minutes
 * P40 names and well inside what a page can hold.
 */
export const EXPORT_MAX_SECS = 60 * EXPORT_SECS_PER_MINUTE;

/** What the dialog collects, and the whole of it. An export spec is not session state (P40). */
export type ExportSpec = {
  /** As typed; the folder and both filenames are made from it. */
  name: string;
  /** How long to render, in seconds of the timeline the commands below are stamped against. */
  secs: number;
  fadeInSecs: number;
  fadeOutSecs: number;
  /** Whether the session archive leaves in the folder beside the audio — the one checkbox (P91). */
  session: boolean;
};

export type AudioExport = {
  file: File;
  /**
   * The performance that made those samples, as the portable archive, or null when the box was
   * cleared. It leaves in the same folder under the same name, so a take and the session it came
   * out of are one thing to keep rather than two downloads to pair up (P91).
   */
  session: File | null;
  /** The directory both files land in: the name, with no extension on it. */
  folder: string;
  /** What the exported samples measure as — the assertion surface an export is proved through. */
  fingerprint: Fingerprint;
  /** Exactly what the harness was handed, so a proof can render the same spec a second time. */
  envelopes: Command[];
};

/**
 * What a cut can land on and what no name may end on: the separator between two fields, and the
 * hyphen inside one. `fitted` cuts from the end, so a name cut mid-field ends wherever the bytes
 * ran out — and a folder called `2026-08-24_mulch-export-1911_Old-` says the take was made of
 * something it does not name (P114).
 */
const TRAILING_SEPARATOR = new RegExp(`[-${EXPORT_NAME_SEPARATOR}]+$`, "gu");

/**
 * The names Windows will not give a file whatever it is spelled with — its device names, which it
 * refuses with or without an extension and in any case. A folder called one of them unpacks
 * nowhere on that desktop, so it is treated as a name that says nothing rather than as a name.
 */
const RESERVED = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
]);

/**
 * The longest a folder's own name may be, in the bytes a filesystem counts rather than in the
 * characters a person does: a path component is capped at 255 bytes on ext4 and APFS, and one CJK
 * character is three of them. Well under, so the two extensions fit inside the same bound.
 */
const NAME_MAX = 96;

const encoder = new TextEncoder();

/**
 * As much of a name as fits, cut between characters rather than through one. Slicing by index
 * would halve a surrogate pair and leave a lone half that every encoder replaces with U+FFFD —
 * which is a folder whose name and whose zip entry disagree by a character.
 */
function fitted(name: string): string {
  let kept = "";
  for (const character of name) {
    if (encoder.encode(kept + character).length > NAME_MAX) break;
    kept += character;
  }
  return kept;
}

/**
 * The one naming function: a typed name, as the folder an export is and the two files inside it.
 * Its two answers are read by the one thing that writes them, so there is one answer to what a
 * take is named and no second way to spell either half of it (principle 1).
 *
 * A name a filesystem will not take is cleaned rather than refused: the typed name is a
 * description, not a path, and a person who typed one is owed the file rather than a dialog
 * arguing about a colon. What cleans away to nothing — or to a name no desktop will make a
 * directory of — falls back to the default, because a folder called `.wav` is one nobody finds.
 *
 * A typed name is read as the fields the offered one is made of: split on the separator, each
 * field put through the one rule about what a word may hold, and the empty ones left out rather
 * than joined — so `a__b` is two fields and never two underscores in a row (P114).
 */
export function exportNames(name: string): { folder: string; audio: string; session: string } {
  const typed = name.trim();
  // An extension that was typed comes off before the fields are cut, because a dot is not one of
  // the marks a field keeps: `take.wav` cleaned first would be the folder `take-wav`. A name that
  // is only an extension says nothing about where a take came from, and both endings are added
  // back below whatever was typed. One of them, whichever it ends with — `take.wav.mulch` is a
  // name with a dot in it, not two extensions to peel.
  const extension = [EXPORT_AUDIO_FILE.extension, SESSION_ARCHIVE_FILE.extension].find((ending) =>
    typed.toLowerCase().endsWith(ending),
  );
  const named = extension === undefined ? typed : typed.slice(0, -extension.length);
  const cleaned = named
    .split(EXPORT_NAME_SEPARATOR)
    .map((field) => exportNameField(field))
    .filter((field) => field.length > 0)
    .join(EXPORT_NAME_SEPARATOR);
  // After the cut, not before it: the cut is what puts a separator at the end of a name that did
  // not have one, by taking the field behind it away.
  const stem = fitted(cleaned).replaceAll(TRAILING_SEPARATOR, "");
  const folder =
    stem.length === 0 || RESERVED.has(stem.toLowerCase()) ? EXPORT_AUDIO_FILE.base : stem;
  return {
    folder,
    audio: `${folder}${EXPORT_AUDIO_FILE.extension}`,
    session: `${folder}${SESSION_ARCHIVE_FILE.extension}`,
  };
}

/** The length the dialog opens on, in minutes: a take, not the length of the loop under it. */
export const EXPORT_DEFAULT_MINUTES = 10;

/**
 * How long the dialog offers to render. Ten minutes, and not a reading of the session: what is
 * being exported is a performance over a loop a few seconds long, so the source's own length was
 * only ever the length of one pass through it. Clamped like every other length this file accepts,
 * so the offered default cannot fall outside the range the export itself will take.
 */
export function defaultExportSecs(): number {
  return clamp(EXPORT_DEFAULT_MINUTES * EXPORT_SECS_PER_MINUTE, EXPORT_MIN_SECS, EXPORT_MAX_SECS);
}

/**
 * The two fields a length is typed into, as the one number underneath them. Whatever is in the
 * pair, the commit is a length this build will render: an empty field is nothing rather than a
 * refusal, because the other one still names a length — clearing the minutes of `10:30` asks for
 * thirty seconds — and the total is clamped, so `70` minutes commits the hour that is the most a
 * tab can hold rather than a render nothing will start.
 */
export function exportSecsOf(minutes: number, seconds: number): number {
  const whole = Number.isFinite(minutes) ? minutes : 0;
  const rest = Number.isFinite(seconds) ? seconds : 0;
  return clamp(whole * EXPORT_SECS_PER_MINUTE + rest, EXPORT_MIN_SECS, EXPORT_MAX_SECS);
}

/**
 * One length as the two fields show it. The seconds field carries the remainder whole or not: a
 * length of 90.5 is one minute and 30.5 seconds, because rounding it here would make the dialog
 * disagree with the number it is about to commit.
 */
export function exportLengthFields(secs: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(secs / EXPORT_SECS_PER_MINUTE);
  return { minutes, seconds: secs - minutes * EXPORT_SECS_PER_MINUTE };
}

/**
 * What the dialog offers as a name: the active yard's own name (0057) and the file its audio was
 * imported as, rather than one fixed string every export in a session would share. Derived from
 * the session as the dialog opens and stored nowhere — a name is not session state (P40).
 *
 * The active yard's, and only its: a session may hold a dozen yards on a dozen files, and an
 * export named after all of them is named after none of them. Bytes a crop or a flatten minted
 * are the one source that says nothing about where it came from, so such a yard is offered its
 * own name and the date alone.
 *
 * The clock is the caller's rather than this function's: a name derived twice a minute apart is
 * two names, and a test that cannot say which minute it is in cannot assert either.
 */
export function defaultExportName(state: SessionState, when: Date): string {
  const active = state.deckList.find((entry) => entry.id === state.activeDeck);
  // A session can hold no yards at all (0029), and two takes of that are still two takes. The
  // app's own name is a field of every name now (P114), so what such a take is missing is the
  // yard field and the source field — and a field that says nothing is left out, not joined.
  if (active === undefined) return exportSourceName("", null, when);
  return exportSourceName(active.name, sourceMadeOf(deckIn(state.decks, active.id).source), when);
}

/**
 * What a yard is playing, as the one word an export is named after it by: the generator's own
 * kind, or the name of the file the bytes were imported as, and null for bytes the app minted
 * and for a yard holding nothing at all.
 */
function sourceMadeOf(source: SourceRef | null): string | null {
  const gen = genOf(source);
  if (gen !== null) return gen.gen;
  const blobId = sourceBlobId(source);
  return blobId === null ? null : importedFileName(blobId);
}

/**
 * The commands a render replays to become this performance: the session's own restoration order,
 * then a `deck.play` for every yard that has a source to play.
 *
 * Playing is the spec's own intent and not a reading of the live transport (0077). An export is
 * what the session sounds like, and a performer who stopped everything to reach the File menu has
 * not asked for a file of silence — the render plays the whole session for the whole length,
 * exactly as the offline pass already arms the whole session's lanes (0071). A yard with no
 * source has nothing to start, and `deck.play` on one is refused, which the export reads back as
 * an error and throws on.
 */
export function exportEnvelopes(session: Session): Command[] {
  return [
    ...restorationCommands(session),
    ...session.deckList
      .filter(({ id }) => deckIn(session.decks, id).source !== null)
      .map(({ id }): Command => ({ t: "deck.play", deck: id })),
  ];
}

/**
 * One export: the current performance rendered offline through `buildDeckChain`, faded at the ends
 * if the spec asked for it, and encoded as a file. The bytes the session's sources name come from
 * the instrument's own snapshot, because the render builds a host with no storage of its own.
 */
export async function exportAudio(instrument: Instrument, spec: ExportSpec): Promise<AudioExport> {
  // Whether the session leaves beside the audio is a decision, not a field with a sensible
  // absence: a spec that does not say would silently get the export the checkbox is cleared for
  // (principle 5). Checked here because the callers that are not typechecked — the browser
  // scenarios — are the ones that could omit it.
  if (typeof spec.session !== "boolean") {
    throw new TypeError(`an export says whether it writes the session: ${String(spec.session)}`);
  }
  if (!Number.isFinite(spec.secs) || spec.secs <= 0 || spec.secs > EXPORT_MAX_SECS) {
    throw new RangeError(`an export is between 0 and ${EXPORT_MAX_SECS} seconds: ${spec.secs}`);
  }
  const { session, blobs } = await instrument.snapshot();
  const envelopes = exportEnvelopes(session);
  const result = await renderOffline({
    secs: spec.secs,
    envelopes,
    // Only when there are any: a render given storage runs the facade's autosave path, and a
    // session of generated sources has nothing for that host to hold (src/app/render.ts).
    ...(blobs.size === 0 ? {} : { blobs }),
    fadeInSecs: spec.fadeInSecs,
    fadeOutSecs: spec.fadeOutSecs,
    wav: true,
  });
  // A command the render refused is an error event on a stream nobody is watching, and the file
  // would leave anyway — a yard silently missing from a take that toasts success. The export is
  // the one caller that has to read the render's own log back (principle 5).
  const failed = result.events.find((event) => event.t === "error");
  if (failed !== undefined)
    throw new Error(`the export's render refused a command: ${failed.detail}`);
  // The harness only encodes when asked, and it was asked one line above; a missing file here is
  // the harness having changed under this caller, not a case to fall back from (principle 5).
  if (result.wav === undefined) throw new Error("the export rendered no wav");
  const names = exportNames(spec.name);
  return {
    file: new File([result.wav], names.audio, { type: EXPORT_AUDIO_FILE.mediaType }),
    // The same snapshot the render was given, so the archive beside a take is the performance
    // that take was rendered from rather than whatever the session became while it rendered.
    session: spec.session ? sessionArchiveFile({ session, blobs }, names.session) : null,
    folder: names.folder,
    fingerprint: result.fingerprint,
    envelopes,
  };
}
