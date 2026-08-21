/**
 * @role The Export Audio dialog: the four things an export is — a name, a length and a fade at
 *   each end — collected once and handed to the render.
 * @instead What an export actually does → src/app/exportAudio.ts, which turns the session into
 *   commands and renders them through the one harness. Who owns and opens this → src/ui/App.tsx,
 *   because two surfaces reach it (src/ui/FileMenu.tsx and src/ui/CommandPalette.tsx) and two
 *   dialogs would be two boxes in one corner; the anchor that saves what comes back →
 *   src/ui/download.ts.
 */
import { type ChangeEvent, useCallback, useRef, useState } from "react";

import {
  defaultExportName,
  defaultExportSecs,
  exportAudio,
  exportLengthFields,
  EXPORT_MAX_SECS,
  EXPORT_SECS_PER_MINUTE,
  exportSecsOf,
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

/** The longest a length's minutes field can name, which is the same hour in the other unit. */
const EXPORT_MAX_MINUTES = EXPORT_MAX_SECS / EXPORT_SECS_PER_MINUTE;

/**
 * One labelled number input. Uncontrolled, so a half-typed value is not a 0 — which is also why
 * what it hands up is whatever was typed, `NaN` for an empty field included: what a number means
 * is the caller's business, and the two callers here mean different things by it.
 */
function NumberField({
  id,
  label,
  max,
  value,
  onInput,
}: {
  id: string;
  label: string;
  max: number;
  value: number;
  onInput: (value: number) => void;
}) {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onInput(event.currentTarget.valueAsNumber);
    },
    [onInput],
  );
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        className="type-readout"
        min={0}
        max={max}
        step="any"
        defaultValue={value}
        onChange={onChange}
      />
    </Field>
  );
}

/** One fade, in seconds. */
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
  const onInput = useCallback(
    (next: number) => {
      // An empty field reads as NaN while it is being retyped, and `min` on a number input is
      // advice a typed value ignores. Neither is a fade, so neither is committed — the spec
      // keeps the last number that was one, and the button reads that.
      if (Number.isFinite(next) && next >= 0 && next <= EXPORT_MAX_SECS) onCommit(next);
    },
    [onCommit],
  );
  return (
    <NumberField id={id} label={label} max={EXPORT_MAX_SECS} value={value} onInput={onInput} />
  );
}

/**
 * The dialog's own body, and the whole of what an export spec is. Mounted with the dialog rather
 * than with the header, so the name it pre-fills is the yard that is active at the moment it opens
 * — an export spec is not session state and survives nothing, least of all a yard loaded after it
 * was last looked at (P40).
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
  const [name, setName] = useState<string>(defaultExportName(instrument.state.getState()));
  const [secs, setSecs] = useState(defaultExportSecs());
  const [fadeInSecs, setFadeInSecs] = useState(0);
  const [fadeOutSecs, setFadeOutSecs] = useState(0);
  /**
   * The length, as the two units a take is actually said in — so ten minutes is typed as ten and
   * not as 600. One number underneath it, committed on every keystroke in either field, because
   * the pair is what a length is typed into and not two values the spec holds. Remembered here
   * rather than read back off the elements: uncontrolled inputs are what keep a half-typed minute
   * from committing as a zero, and each field needs the other one to say what the length is.
   */
  const length = useRef(exportLengthFields(secs));

  const onName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
  }, []);

  const onMinutes = useCallback((minutes: number) => {
    length.current = { ...length.current, minutes };
    setSecs(exportSecsOf(minutes, length.current.seconds));
  }, []);

  const onSeconds = useCallback((seconds: number) => {
    length.current = { ...length.current, seconds };
    setSecs(exportSecsOf(length.current.minutes, seconds));
  }, []);

  const onExport = useCallback(async () => {
    onError(null);
    const spec: ExportSpec = { name, secs, fadeInSecs, fadeOutSecs };
    try {
      const { file } = await exportAudio(instrument, spec);
      downloadFile(file);
      // Said back in the units it was asked for. The number underneath is seconds, and a toast
      // reading "600s" is the thing this dialog stopped asking anyone to type.
      const said = exportLengthFields(secs);
      toast.add({
        title: "Audio Exported",
        description: `${file.name} — ${said.minutes}m ${said.seconds}s`,
      });
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
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          id="export-audio-minutes"
          label="Length (Minutes)"
          max={EXPORT_MAX_MINUTES}
          value={length.current.minutes}
          onInput={onMinutes}
        />
        <NumberField
          id="export-audio-secs"
          label="Length (Seconds)"
          max={EXPORT_MAX_SECS}
          value={length.current.seconds}
          onInput={onSeconds}
        />
      </div>
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
        <AsyncButton busyLabel="Exporting…" onAction={onExport}>
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
