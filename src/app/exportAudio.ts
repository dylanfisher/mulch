/**
 * @role Audio leaving the app: the performance as it stands turned into the commands that rebuild
 *   it, handed to the one render harness, and encoded as a .wav File the browser can save.
 * @instead The render itself → src/app/render.ts, which owns the offline context, the pump and the
 *   fingerprint; nothing here builds a graph or a second renderer. The order those commands go in
 *   → src/app/restore.ts, which startup restoration and a clip already share. Handing the file to
 *   the browser and saying so → src/ui/FileMenu.tsx and src/ui/ExportAudioDialog.tsx.
 */
import type { Fingerprint } from "@/lib/fingerprint";
import { clamp } from "@/lib/range";
import { playbackRate } from "@/lib/timeline";
import type { Session } from "@/state/session";
import { deckIn, type DeckId, type SessionState } from "@/state/store";
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

/**
 * The longest one it will attempt. An OfflineAudioContext allocates its whole output up front —
 * stereo float at 48kHz is 23MB a minute — so a typo of an extra zero is not a slow export, it is
 * a tab the browser kills where no `catch` can report it. An hour is well past the ten minutes
 * P40 names and well inside what a page can hold.
 */
export const EXPORT_MAX_SECS = 60 * 60;

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

/**
 * How long the dialog offers to render: the longest thing the session has to play — a yard's loop
 * if it holds one, otherwise its whole source — rounded up to a whole second. In real seconds and
 * not buffer seconds: a yard at half speed takes twice as long to play the same source, so the
 * length is its buffer length over the rate it is being read at (0031). A session with nothing
 * loaded still offers a length, because a person may be exporting silence on purpose.
 */
export function defaultExportSecs(state: SessionState): number {
  let longest = 0;
  for (const { id } of state.deckList) {
    const deck = deckIn(state.decks, id);
    const buffered = deck.loop === null ? deck.duration : deck.loop.out;
    const rate = playbackRate(deck.params["deck.speed"], deck.params["deck.pitch"]);
    const length = buffered / rate;
    if (length > longest) longest = length;
  }
  return clamp(Math.ceil(longest), EXPORT_MIN_SECS, EXPORT_MAX_SECS);
}

/**
 * The commands a render replays to become this performance: the session's own restoration order,
 * then a `deck.play` for each yard that is playing right now.
 *
 * Playing is the one thing an export needs that a durable snapshot does not carry, so it arrives
 * separately and is filtered to the yards the snapshot holds — a yard removed between the two
 * reads is a yard with nothing to play (0029). Everything else is exactly what a reload rebuilds,
 * which is what makes ten minutes exported the ten minutes that would have been played.
 */
export function exportEnvelopes(session: Session, playing: ReadonlySet<DeckId>): Command[] {
  return [
    ...restorationCommands(session),
    ...session.deckList
      .filter(({ id }) => playing.has(id))
      .map(({ id }): Command => ({ t: "deck.play", deck: id })),
  ];
}

/** Which yards are sounding right now — read off the live store, never off the snapshot. */
function playingDecks(state: SessionState): ReadonlySet<DeckId> {
  return new Set(
    state.deckList.map(({ id }) => id).filter((deck) => deckIn(state.decks, deck).playing),
  );
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
  const envelopes = exportEnvelopes(session, playingDecks(instrument.state.getState()));
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
