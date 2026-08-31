/**
 * @role The Export Audio dialog: the six things an export is — a name, a length, where behind the
 *   ear it begins, a fade at each end, and whether the session leaves in the folder beside the
 *   audio — collected once and handed to the render.
 * @instead What an export actually does → src/app/exportAudio.ts, which turns the session into
 *   commands and renders them through the one harness. Who owns and opens this → src/ui/App.tsx,
 *   because two surfaces reach it (src/ui/FileMenu.tsx and src/ui/CommandPalette.tsx) and two
 *   dialogs would be two boxes in one corner; the anchor that saves what comes back →
 *   src/ui/download.ts.
 */
// The dialog composes the export door out of pieces it does not own — the spec, the harness's
// name for the gesture, four primitives and the anchor that saves what comes back. The rule has
// no per-site form, so this is the only shape the waiver can take (0007).
// oxlint-disable import/max-dependencies
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
  exportTake,
  lastRenderRate,
  renderSecsOf,
  sessionSettleSecs,
} from "@/app/exportAudio";
import type { Instrument } from "@/app/facade";
import {
  EXPORT_AUDIO,
  EXPORT_WITH_SESSION,
  exportBusySaid,
  exportTakesSaid,
  failedMessage,
  type RenderProgress,
} from "@/lib/copy";
import { AsyncButton } from "@/ui/AsyncButton";
import { Checkbox } from "@/ui/components/checkbox";
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
import { downloadFile, downloadFolder } from "@/ui/download";
import { INSTANT_POPUP, type ReportError } from "@/ui/shell";
import { sessionSnapshot } from "@/state/session";

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

/** One length in seconds: a fade at either end, or how far behind the ear a take begins. */
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
// The six fields, their commits and the one action they add up to. The length tracks how much
// an export spec holds, not how much this decides — 0007.
// oxlint-disable-next-line max-lines-per-function
export function ExportAudioForm({
  instrument,
  onClose,
  onError,
}: {
  instrument: Instrument;
  onClose: () => void;
  onError: ReportError;
}) {
  // The wall clock, read where the dialog is built: the date in the offered name is when the take
  // was asked for, and the state hook keeps whatever the first render offered (P95).
  const [name, setName] = useState<string>(
    defaultExportName(instrument.state.getState(), new Date()),
  );
  const [secs, setSecs] = useState(defaultExportSecs());
  /**
   * How far behind the ear the take begins, and how long the performance has been running — the
   * second of which is what the first is subtracted from. The elapsed seconds are read as the
   * dialog is built, the way the date in the offered name is (P95): the export reads them again
   * when the button is pressed, so the line below says which seconds a take asked for now would
   * hold rather than which seconds a take asked for at some later minute will.
   */
  const [backSecs, setBackSecs] = useState(0);
  const [elapsedSecs] = useState(instrument.stats().at);
  /**
   * How long this session has to settle, read once with the clock above it and for the same
   * reason: what the estimate underneath is a claim about is the render the door will run, and
   * the door bounds a take begun at the ear by exactly this (0239). Read here rather than left
   * out, because a take the box priced unbounded is a box saying an hour of a four-second render.
   */
  const [settleSecs] = useState(sessionSettleSecs(sessionSnapshot(instrument.state.getState())));
  /**
   * How fast this session last rendered, and how fast this render is going. The first is read as
   * the dialog is built, beside the elapsed seconds and for the same reason (P95): it changes only
   * when an export finishes, and an export finishing closes this box. The second is the render
   * this button is describing, which is the half of the answer that is always honest.
   */
  const [lastRate] = useState(lastRenderRate());
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [fadeInSecs, setFadeInSecs] = useState(0);
  const [fadeOutSecs, setFadeOutSecs] = useState(0);
  /**
   * Checked, because a take nobody can reopen the performance of is a take that has left the
   * instrument for good. Clearing it is asking for the audio alone, and that is one bare .wav
   * rather than a folder of one thing (P91).
   */
  const [withSession, setWithSession] = useState(true);
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
    const spec: ExportSpec = {
      name,
      secs,
      backSecs,
      fadeInSecs,
      fadeOutSecs,
      session: withSession,
    };
    try {
      const { file, session, folder, take } = await exportAudio(instrument, spec, setProgress);
      // A folder when there are two files to keep together, and the bare .wav when there is one:
      // an archive around a single take would be a step between a person and their audio (P91).
      let saved = file.name;
      if (session === null) downloadFile(file);
      else saved = await downloadFolder(folder, [file, session]);
      // Said back in the units it was asked for, and from where it was actually taken rather than
      // from where the box guessed as it opened — the clock the export reads is the one that has
      // been running while this dialog stood there. The number underneath is seconds, and a toast
      // reading "600s" is the thing this dialog stopped asking anyone to type.
      const said = exportLengthFields(secs);
      const from = exportLengthFields(Math.round(take.beginsSecs));
      toast.add({
        title: "Audio Exported",
        description:
          `${saved} — ${said.minutes}m ${said.seconds}s from ` +
          `${from.minutes}m ${from.seconds}s in`,
      });
    } catch (reason) {
      onError(failedMessage("Audio export", reason));
    } finally {
      // Closed either way: a failure is said in the header row, which this box is sitting on top
      // of, so leaving it open would hide the one thing that went wrong (principle 5).
      onClose();
    }
    // oxlint-disable-next-line react/memo-dependencies
  }, [backSecs, fadeInSecs, fadeOutSecs, instrument, name, onClose, onError, secs, withSession]);

  /**
   * Which seconds of the performance the take is about to hold, said before it is rendered rather
   * than discovered in the file: a lookback longer than the performance, or one the hour cannot
   * reach back over, is a take of a different part and not an error (principle 5).
   */
  const take = exportTake(elapsedSecs, { backSecs, secs }, settleSecs);
  const begins = exportLengthFields(Math.round(take.beginsSecs));
  const said =
    `Begins ${begins.minutes}m ${begins.seconds}s into the performance` +
    (take.clamped ? ` — as near the ear as ${EXPORT_MAX_MINUTES} minutes of render reaches` : "");

  // oxlint-disable react/refs -- the length pair is read here on purpose: these are uncontrolled
  // number inputs, and the ref is what keeps a half-typed minute from committing as a zero.
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
      {/* oxlint-enable react/refs */}
      {/* The whole render and not the length that was typed: an export renders the warm-up in
          front of the take and drops it (0216), through the same one expression the door renders
          by, so the figure cannot drift from the render it is about. */}
      <p id="export-audio-takes" className="type-readout text-muted-foreground">
        {exportTakesSaid(renderSecsOf(take), lastRate)}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <SecondsField
          id="export-audio-back"
          label="Start (Seconds Ago)"
          value={backSecs}
          onCommit={setBackSecs}
        />
        <p className="self-end type-readout text-muted-foreground">{said}</p>
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
      <Field orientation="horizontal">
        <Checkbox
          id="export-audio-session"
          checked={withSession}
          onCheckedChange={setWithSession}
        />
        <FieldLabel htmlFor="export-audio-session">{EXPORT_WITH_SESSION}</FieldLabel>
      </Field>
      <DialogFooter showCloseButton>
        <AsyncButton busyLabel={exportBusySaid(progress)} onAction={onExport}>
          {EXPORT_AUDIO}
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
  onError: ReportError;
}) {
  const onClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Instantly, backdrop included, for the reason the File menu opens instantly: a popup with
          an animation costs the driver hundreds of milliseconds before it may click (0056). */}
      <DialogContent className={INSTANT_POPUP} overlayClassName={INSTANT_POPUP}>
        <DialogHeader>
          <DialogTitle>{EXPORT_AUDIO}</DialogTitle>
          <DialogDescription>
            Renders the performance offline through the same signal path it plays through.
          </DialogDescription>
        </DialogHeader>
        <ExportAudioForm instrument={instrument} onClose={onClose} onError={onError} />
      </DialogContent>
    </Dialog>
  );
}
