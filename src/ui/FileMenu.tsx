/**
 * @role The header's File menu: everything that leaves or enters the app as a file — download the
 *   current session archive, open one into a serialisable handle and send the ordinary import
 *   command, write the event ring out as JSONL, and ask the shell for the dialog audio leaves
 *   through — the shell owns that one, because the palette opens it too (P41).
 * @instead What an import then does to the session → src/app/execute.ts. The container format
 *   itself → src/lib/sessionArchive.ts. What the log's lines look like → src/ui/eventFeed.ts.
 *   The anchor every one of them leaves through → src/ui/download.ts.
 *   What an audio export renders → src/app/exportAudio.ts, collected by
 *   src/ui/ExportAudioDialog.tsx.
 */
import { type ChangeEvent, useCallback, useRef, useState } from "react";

// One import per thing that leaves or enters the app as a file — the archive, the event log, the
// audio dialog — plus the menu primitives and the toast that report each one. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { sessionExportName } from "@/app/exportAudio";
import type { Instrument } from "@/app/facade";
import { EXPORT_AUDIO, EXPORT_BUSY, EXPORT_SESSION, failedMessage } from "@/lib/copy";
import { SESSION_ARCHIVE_FILE } from "@/lib/sessionArchive";
import { MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/ui/components/menubar";
import { toast } from "@/ui/components/toast";
import { downloadFile } from "@/ui/download";
import { eventLogFile } from "@/ui/eventFeed";
import { ACTION_ICONS } from "@/ui/icons";
import { INSTANT_POPUP, type ReportError } from "@/ui/shell";

/**
 * The archive, named the way a take is: derived from the session as the gesture happens and
 * stored nowhere, exactly as the Export Audio dialog derives the name it opens with (P40, P114).
 */
export async function downloadSession(instrument: Instrument): Promise<void> {
  downloadFile(
    await instrument.exportSession(sessionExportName(instrument.state.getState(), new Date())),
  );
}

async function writeSession(instrument: Instrument, onError: ReportError): Promise<void> {
  onError(null);
  try {
    await downloadSession(instrument);
  } catch (reason) {
    onError(failedMessage("Session export", reason));
  }
}

/** The archive being written, or null. One at a time, whichever surface asked — see below. */
let writing: Promise<void> | null = null;

/**
 * The whole of what the Export Session gesture is: clear the last failure, write the archive, and
 * say so in the header if it did not go. Exported because the palette offers the same gesture and
 * a second copy of that sentence is a second wording of it (P41, principle 5).
 *
 * One at a time. The menu disables its own entry while this runs, but the palette closes the
 * moment an entry is chosen, so nothing there could hold the same guard — and two ⌘K exports
 * before the first resolves would build two archives and save two files. The gesture's in-flight
 * state belongs beside its construction, for the reason the construction is shared at all.
 */
export function exportSession(instrument: Instrument, onError: ReportError): Promise<void> {
  writing ??= writeSession(instrument, onError).finally(() => {
    writing = null;
  });
  return writing;
}

/**
 * The ring, out as a file, and a toast saying it went. The ring is the whole log the app keeps
 * (0060), so this is synchronous: there is nothing to await and nothing to fail asynchronously.
 */
export function downloadEventLog(instrument: Instrument): void {
  const events = instrument.ring();
  downloadFile(eventLogFile(events));
  toast.add({
    title: "Event Log Exported",
    description: `${events.length} ${events.length === 1 ? "event" : "events"}`,
  });
}

export async function importSessionFile(instrument: Instrument, file: File): Promise<void> {
  const archive = await instrument.ingestSession(file);
  instrument.send({ t: "session.import", archive });
}

/**
 * The menu is one `MenubarMenu` plus the one thing that cannot live inside it: the file input,
 * which has to stay mounted for the picker to be reachable at all, because a menu's content is
 * portalled and unmounted the moment it closes. A failure goes to `onError` instead of being
 * drawn here — it is reported when the menu that caused it has already shut, so it belongs in
 * the header row rather than inside the menubar's own box.
 */
// Two file gestures, their two handlers and the picker that sits beside the menu rather than in
// it — the length tracks how many entries File offers, not how much this component decides.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function FileMenu({
  instrument,
  onError,
  onExportAudio,
}: {
  instrument: Instrument;
  /** Where a failed export or import is said out loud — the header draws it (principle 5). */
  onError: ReportError;
  /** Opens the shell's one Export Audio dialog — the palette opens that same one (P41). */
  onExportAudio: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const picker = useRef<HTMLInputElement | null>(null);

  const onExport = useCallback(() => {
    setExporting(true);
    void exportSession(instrument, onError).finally(() => {
      setExporting(false);
    });
  }, [instrument, onError]);

  const onOpen = useCallback(() => {
    picker.current?.click();
  }, []);

  const onExportLog = useCallback(() => {
    onError(null);
    downloadEventLog(instrument);
  }, [instrument, onError]);

  const onImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.item(0);
      event.currentTarget.value = "";
      if (file === null || file === undefined) return;
      onError(null);
      void importSessionFile(instrument, file).catch((reason: unknown) => {
        onError(failedMessage("Session import", reason));
      });
    },
    [instrument, onError],
  );

  return (
    <>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent className={INSTANT_POPUP}>
          <MenubarItem onClick={onOpen}>
            <ACTION_ICONS.openSession />
            Open Session…
          </MenubarItem>
          <MenubarItem disabled={exporting} onClick={onExport}>
            <ACTION_ICONS.exportSession />
            {exporting ? EXPORT_BUSY : EXPORT_SESSION}
          </MenubarItem>
          <MenubarItem onClick={onExportAudio}>
            <ACTION_ICONS.exportAudio />
            {`${EXPORT_AUDIO}…`}
          </MenubarItem>
          <MenubarItem onClick={onExportLog}>
            <ACTION_ICONS.exportLog />
            Export Event Log
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      {/* Out of the tab order: the menu entry above is how a keyboard reaches it, and a
          focusable input among a menubar's items would be a stop nothing announces. */}
      <input
        ref={picker}
        tabIndex={-1}
        className="sr-only"
        type="file"
        accept={`${SESSION_ARCHIVE_FILE.extension},${SESSION_ARCHIVE_FILE.mediaType}`}
        aria-label="Import Session Archive"
        onChange={onImport}
      />
    </>
  );
}
