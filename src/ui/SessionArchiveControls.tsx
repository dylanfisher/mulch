/**
 * @role The user-facing portable-session file boundary: download the current archive or ingest
 *   one into a serialisable handle and send the ordinary import command.
 */
import { type ChangeEvent, useCallback, useState } from "react";

import type { Instrument } from "@/app/facade";
import { SESSION_ARCHIVE_FILE } from "@/lib/sessionArchive";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";

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

export function SessionArchiveControls({ instrument }: { instrument: Instrument }) {
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const onExport = useCallback(() => {
    setError(null);
    setExporting(true);
    void downloadSession(instrument)
      .catch((reason: unknown) => {
        setError(`Session export failed: ${String(reason)}`);
      })
      .finally(() => {
        setExporting(false);
      });
  }, [instrument]);

  const onImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.item(0);
      event.currentTarget.value = "";
      if (file === null || file === undefined) return;
      setError(null);
      void importSessionFile(instrument, file).catch((reason: unknown) => {
        setError(`Session import failed: ${String(reason)}`);
      });
    },
    [instrument],
  );

  return (
    <div className="flex items-center gap-2">
      <Button size="xs" variant="outline" disabled={exporting} onClick={onExport}>
        {exporting ? "exporting…" : "export session"}
      </Button>
      <Input
        className="w-40"
        type="file"
        accept={`${SESSION_ARCHIVE_FILE.extension},${SESSION_ARCHIVE_FILE.mediaType}`}
        aria-label="Import session archive"
        onChange={onImport}
      />
      {error !== null && (
        <span className="type-body text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
