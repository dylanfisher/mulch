/**
 * @role Audio leaving the app: the performance as it stands turned into the commands that rebuild
 *   it, handed to the one render harness, and encoded as a .wav File the browser can save.
 * @instead The render itself → src/app/render.ts, which owns the offline context, the pump and the
 *   fingerprint; nothing here builds a graph or a second renderer. The order those commands go in
 *   → src/app/restore.ts, which startup restoration and a clip already share. Handing the file to
 *   the browser and saying so → src/ui/FileMenu.tsx and src/ui/ExportAudioDialog.tsx.
 */
import { exportAudioName } from "@/lib/copy";
import type { Fingerprint } from "@/lib/fingerprint";
import { clamp } from "@/lib/range";
import { type Session, sourceBlobId } from "@/state/session";
import { deckIn, type SessionState } from "@/state/store";
import type { Command } from "./commands";
import type { Instrument } from "./facade";
import { renderOffline } from "./render";
import { restorationCommands } from "./restore";

/** The one statement of what an exported file is called and what it is. */
export const EXPORT_AUDIO_FILE = {
  extension: ".wav",
  mediaType: "audio/wav",
  name: "mulch-export.wav",
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
  /** As typed; the extension is added if the name does not already carry it. */
  name: string;
  /** How long to render, in seconds of the timeline the commands below are stamped against. */
  secs: number;
  fadeInSecs: number;
  fadeOutSecs: number;
};

export type AudioExport = {
  file: File;
  /** What the exported samples measure as — the assertion surface an export is proved through. */
  fingerprint: Fingerprint;
  /** Exactly what the harness was handed, so a proof can render the same spec a second time. */
  envelopes: Command[];
};

/** A typed name, as a filename. An empty one is the default rather than a file called `.wav`. */
export function exportFileName(name: string): string {
  const typed = name.trim();
  // A name that is only the extension is as empty as no name at all — it would save a dotfile.
  const named = typed.toLowerCase() === EXPORT_AUDIO_FILE.extension ? "" : typed;
  const base = named.length === 0 ? EXPORT_AUDIO_FILE.name : named;
  return base.toLowerCase().endsWith(EXPORT_AUDIO_FILE.extension)
    ? base
    : `${base}${EXPORT_AUDIO_FILE.extension}`;
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
 * What the dialog offers as a name: the active yard's own name and the blob id it is playing
 * (0057), rather than one fixed string every export in a session would share. Derived from the
 * session as the dialog opens and stored nowhere — a name is not session state (P40). A yard
 * playing a generator or nothing has no blob id, and is offered its name alone.
 */
export function defaultExportName(state: SessionState): string {
  const active = state.deckList.find((entry) => entry.id === state.activeDeck);
  if (active === undefined) return EXPORT_AUDIO_FILE.name;
  return exportAudioName(active.name, sourceBlobId(deckIn(state.decks, active.id).source));
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
  return {
    file: new File([result.wav], exportFileName(spec.name), {
      type: EXPORT_AUDIO_FILE.mediaType,
    }),
    fingerprint: result.fingerprint,
    envelopes,
  };
}
