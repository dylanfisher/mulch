/**
 * @role The header's File menu: the user-facing portable-session file boundary — download the
 *   current archive, or open one into a serialisable handle and send the ordinary import command.
 * @instead What an import then does to the session → src/app/execute.ts. The container format
 *   itself → src/lib/sessionArchive.ts.
 */
import { type ChangeEvent, useCallback, useRef, useState } from "react";

import type { Instrument } from "@/app/facade";
import { SESSION_ARCHIVE_FILE } from "@/lib/sessionArchive";
import { MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/ui/components/menubar";
import { ACTION_ICONS } from "@/ui/icons";

export async function downloadSession(instrument: Instrument): Promise<void> {
  const file = await instrument.exportSession();
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // The navigation consumes the URL after click dispatch. Keep it alive through this task,
    // then release it rather than retaining every archive for the lifetime of the page.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
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
}: {
  instrument: Instrument;
  /** Where a failed export or import is said out loud — the header draws it (principle 5). */
  onError: (message: string | null) => void;
}) {
  const [exporting, setExporting] = useState(false);
  const picker = useRef<HTMLInputElement | null>(null);

  const onExport = useCallback(() => {
    onError(null);
    setExporting(true);
    void downloadSession(instrument)
      .catch((reason: unknown) => {
        onError(`Session export failed: ${String(reason)}`);
      })
      .finally(() => {
        setExporting(false);
      });
  }, [instrument, onError]);

  const onOpen = useCallback(() => {
    picker.current?.click();
  }, []);

  const onImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.item(0);
      event.currentTarget.value = "";
      if (file === null || file === undefined) return;
      onError(null);
      void importSessionFile(instrument, file).catch((reason: unknown) => {
        onError(`Session import failed: ${String(reason)}`);
      });
    },
    [instrument, onError],
  );

  return (
    <>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        {/* Instantly, with no enter or exit animation: this is a menu ./scripts/drive opens, and
            a popup the driver waits out costs the gate hundreds of milliseconds (0056). */}
        <MenubarContent className="duration-0">
          <MenubarItem onClick={onOpen}>
            <ACTION_ICONS.openSession />
            Open Session…
          </MenubarItem>
          <MenubarItem disabled={exporting} onClick={onExport}>
            <ACTION_ICONS.exportSession />
            {exporting ? "Exporting…" : "Export Session"}
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
