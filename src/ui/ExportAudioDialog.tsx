/**
 * @role The Export Audio dialog: the four things an export is — a name, a length and a fade at
 *   each end — collected once and handed to the render.
 * @instead What an export actually does → src/app/exportAudio.ts, which turns the session into
 *   commands and renders them through the one harness. The entry that opens this →
 *   src/ui/FileMenu.tsx; the anchor that saves what comes back → src/ui/download.ts.
 */
import { type ChangeEvent, useCallback, useState } from "react";

import {
  defaultExportSecs,
  EXPORT_AUDIO_FILE,
  exportAudio,
  EXPORT_MAX_SECS,
  type ExportSpec,
} from "@/app/exportAudio";
import type { Instrument } from "@/app/facade";
import { AsyncButton } from "@/ui/AsyncButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { Field, FieldLabel } from "@/ui/components/field";
import { Input } from "@/ui/components/input";
import { toast } from "@/ui/components/toast";
import { downloadFile } from "@/ui/download";

/** One number the dialog collects, in seconds. Uncontrolled, so a half-typed value is not a 0. */
function SecondsField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.valueAsNumber;
      // An empty field reads as NaN while it is being retyped, and `min` on a number input is
      // advice a typed value ignores. Neither is a length, so neither is committed — the spec
      // keeps the last number that was one, and the button reads that.
      if (Number.isFinite(next) && next >= 0 && next <= EXPORT_MAX_SECS) onCommit(next);
    },
    [onCommit],
  );
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        className="type-readout"
        min={0}
        max={EXPORT_MAX_SECS}
        step="any"
        defaultValue={value}
        onChange={onChange}
      />
    </Field>
  );
}

/**
 * The dialog's own body, and the whole of what an export spec is. Mounted with the dialog rather than with the header, so the length it
 * pre-fills is the one the session has at the moment it opens — an export spec is not session
 * state and survives nothing, least of all a yard loaded after it was last looked at (P40).
 */
// The four fields, their four commits and the one action they add up to. The length tracks how
// much an export spec holds, not how much this decides — 0007.
// oxlint-disable-next-line max-lines-per-function
export function ExportAudioForm({
  instrument,
  onClose,
  onError,
}: {
  instrument: Instrument;
  onClose: () => void;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState<string>(EXPORT_AUDIO_FILE.name);
  const [secs, setSecs] = useState(defaultExportSecs(instrument.state.getState()));
  const [fadeInSecs, setFadeInSecs] = useState(0);
  const [fadeOutSecs, setFadeOutSecs] = useState(0);

  const onName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
  }, []);

  const onExport = useCallback(async () => {
    onError(null);
    const spec: ExportSpec = { name, secs, fadeInSecs, fadeOutSecs };
    try {
      const { file } = await exportAudio(instrument, spec);
      downloadFile(file);
      toast.add({ title: "Audio Exported", description: `${file.name} — ${secs}s` });
    } catch (reason) {
      onError(`Audio export failed: ${String(reason)}`);
    } finally {
      // Closed either way: a failure is said in the header row, which this box is sitting on top
      // of, so leaving it open would hide the one thing that went wrong (principle 5).
      onClose();
    }
  }, [fadeInSecs, fadeOutSecs, instrument, name, onClose, onError, secs]);

  return (
    <>
      <Field>
        <FieldLabel htmlFor="export-audio-name">Name</FieldLabel>
        <Input id="export-audio-name" value={name} onChange={onName} />
      </Field>
      <SecondsField
        id="export-audio-secs"
        label="Length (Seconds)"
        value={secs}
        onCommit={setSecs}
      />
      <div className="grid grid-cols-2 gap-4">
        <SecondsField
          id="export-audio-fade-in"
          label="Fade In (Seconds)"
          value={fadeInSecs}
          onCommit={setFadeInSecs}
        />
        <SecondsField
          id="export-audio-fade-out"
          label="Fade Out (Seconds)"
          value={fadeOutSecs}
          onCommit={setFadeOutSecs}
        />
      </div>
      <DialogFooter showCloseButton>
        <AsyncButton busyLabel="Exporting…" disabled={!(secs > 0)} onAction={onExport}>
          Export Audio
        </AsyncButton>
      </DialogFooter>
    </>
  );
}

export function ExportAudioDialog({
  instrument,
  open,
  onOpenChange,
  onError,
}: {
  instrument: Instrument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string | null) => void;
}) {
  const onClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Instantly, backdrop included, for the reason the File menu opens instantly: a popup with
          an animation costs the driver hundreds of milliseconds before it may click (0056). */}
      <DialogContent className="duration-0" overlayClassName="duration-0">
        <DialogHeader>
          <DialogTitle>Export Audio</DialogTitle>
          <DialogDescription>
            Renders the performance offline through the same signal path it plays through.
          </DialogDescription>
        </DialogHeader>
        <ExportAudioForm instrument={instrument} onClose={onClose} onError={onError} />
      </DialogContent>
    </Dialog>
  );
}
